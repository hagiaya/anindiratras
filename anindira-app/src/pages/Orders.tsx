import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Package, CarFront, Plane, Car, Upload, X } from 'lucide-react'
import imageCompression from 'browser-image-compression'

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState<number>(0)
  const [banks, setBanks] = useState<any[]>([])
  
  // Payment Modal State
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [paymentMethod, setPaymentMethod] = useState<'ANINDIRAPAY' | 'TRANSFER'>('ANINDIRAPAY')
  const [selectedBankId, setSelectedBankId] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  // Review Modal State
  const [userReviews, setUserReviews] = useState<string[]>([])
  const [reviewOrder, setReviewOrder] = useState<any>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  
  const navigate = useNavigate()

  useEffect(() => {
    fetchOrdersAndBalance()
  }, [])

  const fetchOrdersAndBalance = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])

      const { data: userData } = await supabase
        .from('users')
        .select('balance')
        .eq('id', session.user.id)
        .single()
      
      if (userData) setBalance(userData.balance || 0)

      // Fetch user's submitted reviews
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('order_id')
        .eq('user_id', session.user.id)
      
      if (reviewsData) {
        setUserReviews(reviewsData.map(r => r.order_id))
      }

      // Fetch Banks
      const { data: banksData } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
      
      if (banksData) setBanks(banksData)

    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'CARPOOL': return <CarFront size={20} className="text-green-500" />
      case 'TITIP_BARANG': return <Package size={20} className="text-orange-500" />
      case 'ANTAR_BANDARA': return <Plane size={20} className="text-blue-500" />
      case 'SEWA_MOBIL': return <Car size={20} className="text-purple-500" />
      default: return <Package size={20} className="text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'ASSIGNED': return 'bg-blue-100 text-blue-800'
      case 'ON_THE_WAY': return 'bg-purple-100 text-purple-800'
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handlePayment = (order: any) => {
    setSelectedOrder(order)
    setPaymentMethod('ANINDIRAPAY')
    setReceiptFile(null)
    setSelectedBankId('')
  }

  const processAnindiraPay = async () => {
    if (balance < selectedOrder.total_price) {
      alert('Saldo AnindiraPay Anda tidak mencukupi. Silakan Top Up terlebih dahulu.')
      navigate('/topup')
      return
    }

    if (!confirm(`Konfirmasi pembayaran sebesar Rp ${selectedOrder.total_price.toLocaleString('id-ID')} menggunakan saldo AnindiraPay?`)) return
    
    setIsUploading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const newBalance = balance - selectedOrder.total_price
      const { error: balanceError } = await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', session.user.id)

      if (balanceError) throw balanceError

      const { error: orderError } = await supabase
        .from('orders')
        .update({ payment_status: 'PAID' })
        .eq('id', selectedOrder.id)

      if (orderError) throw orderError

      await supabase.from('transactions').insert({
        user_id: session.user.id,
        type: 'PAYMENT',
        amount: selectedOrder.total_price,
        order_id: selectedOrder.id,
        status: 'VERIFIED'
      })

      alert('Pembayaran berhasil!')
      setSelectedOrder(null)
      fetchOrdersAndBalance()
    } catch (err) {
      console.error(err)
      alert('Terjadi kesalahan saat memproses pembayaran.')
    } finally {
      setIsUploading(false)
    }
  }

  const processTransfer = async () => {
    if (!selectedBankId) return alert('Silakan pilih bank tujuan')
    if (!receiptFile) return alert('Silakan upload bukti transfer')

    setIsUploading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Compress image
      const options = {
        maxSizeMB: 0.5, // 500KB
        maxWidthOrHeight: 1024,
        useWebWorker: true
      }
      const compressedFile = await imageCompression(receiptFile, options)
      
      const fileExt = receiptFile.name.split('.').pop()
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`
      const filePath = `receipts/${fileName}`

      // Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('payment_receipts')
        .upload(filePath, compressedFile)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('payment_receipts')
        .getPublicUrl(filePath)

      // Create transaction
      await supabase.from('transactions').insert({
        user_id: session.user.id,
        type: 'PAYMENT',
        amount: selectedOrder.total_price,
        order_id: selectedOrder.id,
        status: 'PENDING',
        receipt_url: publicUrl,
        notes: `Transfer ke Bank ID: ${selectedBankId}`
      })

      alert('Bukti transfer berhasil diunggah! Menunggu verifikasi admin.')
      setSelectedOrder(null)
      fetchOrdersAndBalance()
    } catch (err) {
      console.error(err)
      alert('Gagal mengunggah bukti pembayaran')
    } finally {
      setIsUploading(false)
    }
  }

  const submitReview = async () => {
    if (!reviewOrder || !reviewOrder.driver_id) return
    setIsSubmittingReview(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase.from('reviews').insert({
        order_id: reviewOrder.id,
        user_id: session.user.id,
        driver_id: reviewOrder.driver_id,
        rating,
        comment
      })

      if (error) throw error

      alert('Terima kasih atas ulasan Anda!')
      setReviewOrder(null)
      setUserReviews([...userReviews, reviewOrder.id])
    } catch (err) {
      console.error(err)
      alert('Gagal mengirim ulasan')
    } finally {
      setIsSubmittingReview(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center bg-white px-4 py-4 shadow-sm">
        <button onClick={() => navigate(-1)} className="mr-4 text-gray-600">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Riwayat Pesanan</h1>
      </div>

      <div className="flex-1 p-4">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex h-60 flex-col items-center justify-center text-gray-500">
            <Package size={48} className="mb-4 opacity-50" />
            <p className="font-medium">Belum ada pesanan</p>
            <p className="text-sm">Pesanan Anda akan muncul di sini</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3 border-b border-gray-50 pb-3">
                  <div className="flex items-center space-x-2">
                    {getServiceIcon(order.order_type)}
                    <span className="font-bold text-gray-800">
                      {order.order_type.replace('_', ' ')}
                    </span>
                  </div>
                  <span className={`px-2 py-1 rounded-md text-xs font-bold ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Tanggal</span>
                    <span className="text-sm font-medium text-gray-800">
                      {new Date(order.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Total Pembayaran</span>
                    <span className="text-sm font-bold text-primary">
                      Rp {order.total_price?.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {order.payment_status === 'UNPAID' && order.status !== 'CANCELLED' && (
                  <button 
                    onClick={() => handlePayment(order)}
                    className="w-full rounded-xl bg-primary py-2 text-sm font-bold text-white transition active:scale-[0.98]"
                  >
                    Bayar Sekarang
                  </button>
                )}
                
                {order.status === 'COMPLETED' && order.driver_id && !userReviews.includes(order.id) && (
                  <button 
                    onClick={() => {
                      setReviewOrder(order);
                      setRating(5);
                      setComment('');
                    }}
                    className="w-full mt-2 rounded-xl border-2 border-orange-500 bg-orange-50 py-2 text-sm font-bold text-orange-600 transition active:scale-[0.98]"
                  >
                    Beri Ulasan Sopir
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setSelectedOrder(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-xl font-bold text-gray-900 mb-6">Pilih Metode Pembayaran</h2>
            
            <div className="space-y-3 mb-6">
              <label className={`block border rounded-xl p-4 cursor-pointer transition ${paymentMethod === 'ANINDIRAPAY' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                <div className="flex items-center space-x-3">
                  <input 
                    type="radio" 
                    name="payment" 
                    value="ANINDIRAPAY"
                    checked={paymentMethod === 'ANINDIRAPAY'}
                    onChange={() => setPaymentMethod('ANINDIRAPAY')}
                    className="text-primary focus:ring-primary h-4 w-4"
                  />
                  <div>
                    <p className="font-bold text-gray-900">AnindiraPay</p>
                    <p className="text-sm text-gray-500">Saldo: Rp {balance.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              </label>

              <label className={`block border rounded-xl p-4 cursor-pointer transition ${paymentMethod === 'TRANSFER' ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                <div className="flex items-center space-x-3">
                  <input 
                    type="radio" 
                    name="payment" 
                    value="TRANSFER"
                    checked={paymentMethod === 'TRANSFER'}
                    onChange={() => setPaymentMethod('TRANSFER')}
                    className="text-primary focus:ring-primary h-4 w-4"
                  />
                  <div>
                    <p className="font-bold text-gray-900">Transfer Bank</p>
                    <p className="text-sm text-gray-500">Upload bukti transfer</p>
                  </div>
                </div>
              </label>
            </div>

            {paymentMethod === 'TRANSFER' && (
              <div className="space-y-4 mb-6 border-t border-gray-100 pt-4">
                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-2">Pilih Bank Tujuan</label>
                  <select 
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-primary outline-none"
                  >
                    <option value="" disabled>Pilih Rekening Bank...</option>
                    {banks.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.bank_name} - {b.account_number} ({b.account_holder})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedBankId && (
                  <div>
                    <label className="text-sm font-bold text-gray-700 block mb-2">Upload Bukti Transfer</label>
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition relative overflow-hidden">
                      {receiptFile ? (
                        <div className="text-center p-4">
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">{receiptFile.name}</p>
                          <p className="text-xs text-primary mt-1">Ganti file</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-2 text-gray-400" />
                          <p className="text-sm text-gray-500 font-semibold">Klik untuk upload bukti</p>
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setReceiptFile(e.target.files[0])
                          }
                        }}
                      />
                    </label>
                    <p className="text-xs text-gray-400 mt-2 text-center">Gambar akan dikompres otomatis (Maks. 500KB)</p>
                  </div>
                )}
              </div>
            )}

            <button
              disabled={isUploading || (paymentMethod === 'TRANSFER' && (!selectedBankId || !receiptFile))}
              onClick={() => paymentMethod === 'ANINDIRAPAY' ? processAnindiraPay() : processTransfer()}
              className="w-full rounded-xl bg-primary py-3.5 font-bold text-white shadow-lg shadow-blue-200 transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
            >
              {isUploading ? 'Memproses...' : 'Konfirmasi Pembayaran'}
            </button>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl relative animate-in zoom-in-95">
            <button 
              onClick={() => setReviewOrder(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-xl font-bold text-gray-900 mb-2">Beri Ulasan</h2>
            <p className="text-sm text-gray-500 mb-6">Bagaimana pengalaman Anda dengan layanan ini?</p>
            
            <div className="flex justify-center space-x-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-4xl transition-transform active:scale-90 ${star <= rating ? 'text-yellow-400' : 'text-gray-200'}`}
                >
                  ★
                </button>
              ))}
            </div>

            <div className="mb-6">
              <label className="text-sm font-bold text-gray-700 block mb-2">Komentar Tambahan (Opsional)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Pelayanan sopir sangat baik..."
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-primary outline-none min-h-[100px] resize-none"
              ></textarea>
            </div>

            <button
              disabled={isSubmittingReview}
              onClick={submitReview}
              className="w-full rounded-xl bg-primary py-3.5 font-bold text-white shadow-lg shadow-blue-200 transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
            >
              {isSubmittingReview ? 'Mengirim...' : 'Kirim Ulasan'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
