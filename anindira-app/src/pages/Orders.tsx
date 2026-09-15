import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { playNotificationSound } from '../lib/audioNotification'
import { 
  ArrowLeft, 
  Package, 
  CarFront, 
  Plane, 
  Car, 
  Upload, 
  X, 
  MessageCircle, 
  Phone, 
  PhoneCall, 
  Trash2, 
  Clock, 
  Armchair, 
  Calendar, 
  MapPin, 
  QrCode, 
  Landmark, 
  Copy, 
  Check, 
  ExternalLink,
  Info
} from 'lucide-react'
import imageCompression from 'browser-image-compression'

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState<number>(0)
  const [banks, setBanks] = useState<any[]>([])
  const [qrisImage, setQrisImage] = useState<any>(null)
  const [csPhone, setCsPhone] = useState('085394042658')
  
  // Payment Modal State
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [paymentMethod, setPaymentMethod] = useState<'ANINDIRAPAY' | 'QRIS' | 'TRANSFER'>('QRIS')
  const [selectedBankId, setSelectedBankId] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [copiedBankId, setCopiedBankId] = useState<string | null>(null)
  const [copiedAmount, setCopiedAmount] = useState(false)
  
  // Order Detail Ticket Modal State
  const [detailOrder, setDetailOrder] = useState<any>(null)

  // Review Modal State
  const [userReviews, setUserReviews] = useState<string[]>([])
  const [reviewOrder, setReviewOrder] = useState<any>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  
  const navigate = useNavigate()

  useEffect(() => {
    let subscription: any = null

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        fetchOrdersAndBalance(session)
        
        const channelName = `user_orders_${session.user.id}_${Date.now()}`
        subscription = supabase
          .channel(channelName)
          .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'orders',
            filter: `user_id=eq.${session.user.id}`
          }, (payload: any) => {
            if ((payload.new.status === 'ASSIGNED' && payload.old.status !== 'ASSIGNED') ||
                (payload.new.status === 'ON_THE_WAY' && payload.old.status !== 'ON_THE_WAY')) {
              playNotificationSound()
            }
            fetchOrdersAndBalance(session)
          })
          .subscribe()
      }
    }
    init()

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription)
      }
    }
  }, [])

  const fetchOrdersAndBalance = async (sessionParam?: any) => {
    try {
      const session = sessionParam || (await supabase.auth.getSession()).data.session
      if (!session) return

      // Load hidden order IDs from user_metadata and localStorage
      const localHidden: string[] = JSON.parse(localStorage.getItem(`hidden_orders_${session.user.id}`) || '[]')
      const metaHidden: string[] = session.user.user_metadata?.hidden_order_ids || []
      const hiddenSet = new Set([...localHidden, ...metaHidden])

      const { data: rawOrders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Filter out deleted/hidden orders
      const visibleOrders = (rawOrders || []).filter(o => !hiddenSet.has(o.id))

      // Hydrate driver info
      const driverIds = Array.from(new Set(visibleOrders.map(o => o.driver_id).filter(Boolean)))
      let driverMap = new Map<string, any>()
      if (driverIds.length > 0) {
        const { data: driversData } = await supabase
          .from('users')
          .select('id, full_name, phone')
          .in('id', driverIds)
        if (driversData) {
          driverMap = new Map(driversData.map(d => [d.id, d]))
        }
      }

      setOrders(visibleOrders.map(o => ({
        ...o,
        driver: driverMap.get(o.driver_id) || null
      })))

      // Fetch user balance
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

      // Fetch Active Banks
      const { data: banksData } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
      
      if (banksData && banksData.length > 0) {
        setBanks(banksData)
      } else {
        setBanks([{ id: 'bni-default', bank_name: 'BNI', account_number: '1979901867', account_holder: 'ANINDIRA TRANS' }])
      }

      // Fetch Active QRIS
      const { data: qData } = await supabase
        .from('qris_settings')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (qData) setQrisImage(qData)

      // Fetch Outlet Phone for CS
      const { data: outletData } = await supabase
        .from('outlets')
        .select('phone')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
      if (outletData?.phone) setCsPhone(outletData.phone)

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

  // Helper to parse Carpooling package details
  const parseCarpoolDetails = (order: any) => {
    if (!order) return null
    let details: any = null
    try {
      if (order.package_details) {
        details = typeof order.package_details === 'string' 
          ? JSON.parse(order.package_details) 
          : order.package_details
      }
    } catch (_e) {}

    // Fallback if seat_selected was saved directly
    let seats = details?.selectedSeats
    if (!seats && order.seat_selected) {
      seats = order.seat_selected.split(',').map((s: string) => s.trim())
    }

    const formatSeatName = (seat: string | number) => {
      const s = String(seat)
      if (s === '1') return 'Kursi 1 (Depan)'
      if (s === '2') return 'Kursi 2 (Tengah Kiri)'
      if (s === '3') return 'Kursi 3 (Tengah Kanan)'
      if (s === '4') return 'Kursi 4 (Belakang Kiri)'
      if (s === '5') return 'Kursi 5 (Belakang Kanan)'
      return `Kursi ${s}`
    }

    let seatString = '-'
    if (Array.isArray(seats) && seats.length > 0) {
      seatString = seats.map(formatSeatName).join(', ')
    } else if (typeof seats === 'string' && seats) {
      seatString = seats
    }

    return {
      departureTime: details?.departureTime || details?.time || null,
      departureDate: details?.departureDate || details?.date || null,
      selectedSeats: seats || [],
      seatString,
      carType: details?.carType || null,
      extraPriceName: details?.extraPriceName || null
    }
  }

  // Delete completed/cancelled order from passenger history
  const handleDeleteUserOrder = async (orderId: string) => {
    if (!confirm('Hapus pesanan ini dari riwayat Anda? Pesanan tidak akan ditampilkan lagi.')) {
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        // Save to localStorage
        const key = `hidden_orders_${session.user.id}`
        const currentHidden: string[] = JSON.parse(localStorage.getItem(key) || '[]')
        if (!currentHidden.includes(orderId)) {
          currentHidden.push(orderId)
          localStorage.setItem(key, JSON.stringify(currentHidden))
        }

        // Also sync to Supabase user_metadata
        const metaHidden: string[] = session.user.user_metadata?.hidden_order_ids || []
        const combined = Array.from(new Set([...metaHidden, orderId]))
        await supabase.auth.updateUser({
          data: { hidden_order_ids: combined }
        })

        // Also attempt direct DB delete if policies allow
        try {
          await supabase.from('orders').delete().eq('id', orderId)
        } catch (_e) {}
      }

      setOrders(orders.filter(o => o.id !== orderId))
      alert('Pesanan telah berhasil dihapus dari riwayat.')
    } catch (err: any) {
      console.error(err)
      // Optimistically remove from state anyway
      setOrders(orders.filter(o => o.id !== orderId))
    }
  }

  const handlePayment = (order: any) => {
    setSelectedOrder(order)
    setPaymentMethod('QRIS')
    setReceiptFile(null)
    setReceiptPreview(null)
    if (banks.length > 0) setSelectedBankId(banks[0].id)
  }

  const copyToClipboard = (text: string, type: 'amount' | 'bank', id?: string) => {
    navigator.clipboard.writeText(text)
    if (type === 'amount') {
      setCopiedAmount(true)
      setTimeout(() => setCopiedAmount(false), 2000)
    } else if (id) {
      setCopiedBankId(id)
      setTimeout(() => setCopiedBankId(null), 2000)
    }
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
        .update({ payment_status: 'PAID', payment_method: 'ANINDIRAPAY' })
        .eq('id', selectedOrder.id)

      if (orderError) throw orderError

      await supabase.from('transactions').insert({
        user_id: session.user.id,
        type: 'PAYMENT',
        amount: selectedOrder.total_price,
        order_id: selectedOrder.id,
        status: 'VERIFIED',
        notes: 'Pembayaran via Saldo AnindiraPay'
      })

      alert('Pembayaran berhasil diverifikasi!')
      setSelectedOrder(null)
      fetchOrdersAndBalance()
    } catch (err) {
      console.error(err)
      alert('Terjadi kesalahan saat memproses pembayaran.')
    } finally {
      setIsUploading(false)
    }
  }

  const processTransferOrQris = async () => {
    if (paymentMethod === 'TRANSFER' && !selectedBankId) {
      return alert('Silakan pilih rekening bank tujuan')
    }
    if (!receiptFile) {
      return alert('Silakan unggah foto bukti transfer/pembayaran')
    }

    setIsUploading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Compress image
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1024,
        useWebWorker: true
      }
      const compressedFile = await imageCompression(receiptFile, options)
      
      const fileExt = receiptFile.name.split('.').pop() || 'jpg'
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`
      const filePath = `receipts/${fileName}`

      // Upload to Storage
      let finalPublicUrl = ''
      const { data: up1, error: err1 } = await supabase.storage
        .from('payment_receipts')
        .upload(filePath, compressedFile)

      if (!err1 && up1) {
        finalPublicUrl = supabase.storage.from('payment_receipts').getPublicUrl(filePath).data.publicUrl
      } else {
        const { data: up2, error: err2 } = await supabase.storage
          .from('receipts')
          .upload(fileName, compressedFile)
        if (!err2 && up2) {
          finalPublicUrl = supabase.storage.from('receipts').getPublicUrl(fileName).data.publicUrl
        } else {
          throw new Error('Gagal mengunggah foto bukti pembayaran.')
        }
      }

      // Create transaction
      await supabase.from('transactions').insert({
        user_id: session.user.id,
        type: 'PAYMENT',
        amount: selectedOrder.total_price,
        order_id: selectedOrder.id,
        status: 'PENDING',
        receipt_url: finalPublicUrl,
        notes: paymentMethod === 'QRIS' ? 'Pembayaran via QRIS Barcode' : `Transfer ke Bank ID: ${selectedBankId}`
      })

      // Update order payment method
      await supabase.from('orders').update({
        payment_method: paymentMethod
      }).eq('id', selectedOrder.id)

      alert('Bukti pembayaran berhasil diunggah! Menunggu verifikasi admin.')
      setSelectedOrder(null)
      fetchOrdersAndBalance()
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Gagal mengunggah bukti pembayaran')
    } finally {
      setIsUploading(false)
    }
  }

  const submitReview = async () => {
    if (!reviewOrder) return
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
      setUserReviews([...userReviews, reviewOrder.id])
      setReviewOrder(null)
    } catch (err: any) {
      console.error(err)
      alert('Gagal mengirim ulasan: ' + err.message)
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const openCsWhatsApp = () => {
    let clean = csPhone.replace(/\D/g, '')
    if (clean.startsWith('0')) clean = '62' + clean.slice(1)
    window.open(`https://wa.me/${clean}?text=Halo%20Admin%20AnindiraTrans,%20saya%20butuh%20bantuan%20terkait%20pesanan.`, '_blank')
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between bg-white px-4 py-4 shadow-sm border-b">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="mr-4 text-gray-600 transition active:scale-90">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Riwayat Pesanan</h1>
        </div>
        <button 
          onClick={() => fetchOrdersAndBalance()}
          className="text-xs font-bold text-primary px-3 py-1.5 rounded-lg hover:bg-blue-50 transition"
        >
          Segarkan
        </button>
      </div>

      <div className="flex-1 p-4 max-w-lg mx-auto w-full">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex h-60 flex-col items-center justify-center text-gray-500">
            <Package size={48} className="mb-4 opacity-40 text-gray-400" />
            <p className="font-bold text-gray-700">Belum ada riwayat pesanan</p>
            <p className="text-xs text-gray-400 mt-1">Pesanan Anda akan muncul di sini</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const carpoolInfo = order.order_type === 'CARPOOL' ? parseCarpoolDetails(order) : null

              return (
                <div key={order.id} className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 relative">
                  
                  {/* Top Bar: Service Icon & Status */}
                  <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-xl bg-gray-50">
                        {getServiceIcon(order.order_type)}
                      </div>
                      <div>
                        <span className="font-bold text-gray-900 text-sm">
                          {order.order_type.replace('_', ' ')}
                        </span>
                        <p className="text-[10px] text-gray-400">ID: {order.id.slice(0, 8)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                      {/* DELETE MENU FOR COMPLETED / CANCELLED ORDERS */}
                      {(order.status === 'COMPLETED' || order.status === 'CANCELLED') && (
                        <button
                          onClick={() => handleDeleteUserOrder(order.id)}
                          className="text-gray-400 hover:text-red-500 p-1 rounded-lg transition active:scale-90"
                          title="Hapus riwayat pesanan ini"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* CARPOOL SPECIFIC DETAILS (JAM KEBERANGKATAN & POSISI KURSI) */}
                  {order.order_type === 'CARPOOL' && carpoolInfo && (
                    <div className="mb-3 rounded-xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-100 p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1.5 text-blue-700 font-bold">
                          <Clock size={15} />
                          <span>Jam Berangkat:</span>
                        </div>
                        <span className="font-black text-blue-900 bg-white px-2 py-0.5 rounded shadow-2xs">
                          {carpoolInfo.departureTime ? `${carpoolInfo.departureTime} WITA` : 'Sesuai Jadwal'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1.5 text-blue-700 font-bold">
                          <Armchair size={15} />
                          <span>Posisi Kursi:</span>
                        </div>
                        <span className="font-bold text-blue-900 bg-white px-2 py-0.5 rounded shadow-2xs text-right max-w-[65%] truncate">
                          {carpoolInfo.seatString}
                        </span>
                      </div>

                      {carpoolInfo.departureDate && (
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-1.5 text-blue-700 font-bold">
                            <Calendar size={15} />
                            <span>Tgl Berangkat:</span>
                          </div>
                          <span className="font-medium text-gray-800">
                            {new Date(carpoolInfo.departureDate).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Order General Details */}
                  <div className="space-y-1.5 mb-3 text-xs">
                    <div className="flex justify-between text-gray-500">
                      <span>Waktu Pemesanan</span>
                      <span className="font-medium text-gray-800">
                        {new Date(order.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-gray-50">
                      <span className="text-gray-500">Total Biaya</span>
                      <span className="text-base font-black text-primary">
                        Rp {order.total_price?.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* CASH Payment Notice */}
                  {order.payment_method === 'CASH' && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                    <div className="w-full rounded-xl bg-orange-50 border border-orange-200 py-2.5 px-3 text-center text-xs font-bold text-orange-800 mb-2">
                      Bayar Tunai ke Sopir: Rp {order.total_price?.toLocaleString('id-ID')}
                    </div>
                  )}

                  {/* UNPAID Order Action */}
                  {order.payment_method !== 'CASH' && order.payment_status === 'UNPAID' && order.status !== 'CANCELLED' && (
                    <button 
                      onClick={() => handlePayment(order)}
                      className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-white shadow-md shadow-blue-200 transition active:scale-[0.98] mb-2"
                    >
                      Bayar Sekarang (QRIS / Transfer / Saldo)
                    </button>
                  )}

                  {/* COMMUNICATION & ACTION BUTTONS */}
                  <div className="flex items-center space-x-2 mt-2">
                    {/* View Details / Ticket */}
                    <button
                      onClick={() => setDetailOrder(order)}
                      className="flex-1 flex items-center justify-center space-x-1 rounded-xl bg-gray-100 hover:bg-gray-200 py-2 text-xs font-bold text-gray-700 transition active:scale-95"
                    >
                      <Info size={15} />
                      <span>Rincian</span>
                    </button>

                    {/* Driver Chat & Call when driver assigned */}
                    {order.driver_id && !['COMPLETED', 'CANCELLED'].includes(order.status) && (
                      <>
                        <button 
                          onClick={() => navigate(`/chat/${order.id}`)}
                          className="flex-1 flex items-center justify-center space-x-1 rounded-xl bg-blue-50 py-2 text-xs font-bold text-blue-600 transition active:scale-95 border border-blue-200"
                        >
                          <MessageCircle size={15} />
                          <span>Chat</span>
                        </button>
                        
                        <button 
                          onClick={() => {
                            const phone = order.driver?.phone
                            if (phone) {
                              window.location.href = `tel:${phone}`
                            } else {
                              navigate(`/call/${order.id}`, { state: { isCaller: true } })
                            }
                          }}
                          className="flex-1 flex items-center justify-center space-x-1 rounded-xl bg-emerald-50 py-2 text-xs font-bold text-emerald-700 transition active:scale-95 border border-emerald-200"
                          title="Telepon Sopir"
                        >
                          <PhoneCall size={15} />
                          <span>Telpon</span>
                        </button>
                      </>
                    )}

                    {/* CS Button */}
                    <button 
                      onClick={openCsWhatsApp}
                      className="flex-1 flex items-center justify-center space-x-1 rounded-xl bg-green-50 py-2 text-xs font-bold text-green-700 transition active:scale-95 border border-green-200"
                    >
                      <Phone size={15} />
                      <span>CS WA</span>
                    </button>
                  </div>

                  {/* Review Button */}
                  {order.status === 'COMPLETED' && order.driver_id && !userReviews.includes(order.id) && (
                    <button 
                      onClick={() => {
                        setReviewOrder(order)
                        setRating(5)
                        setComment('')
                      }}
                      className="w-full mt-2.5 rounded-xl border-2 border-orange-400 bg-orange-50 py-2 text-xs font-bold text-orange-600 transition active:scale-[0.98]"
                    >
                      ★ Beri Ulasan Sopir
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* DETAIL TIKET / PESANAN MODAL */}
      {detailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setDetailOrder(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1"
            >
              <X size={22} />
            </button>

            <div className="flex items-center space-x-3 mb-4 pb-3 border-b border-gray-100">
              <div className="p-3 rounded-2xl bg-blue-50 text-primary">
                {getServiceIcon(detailOrder.order_type)}
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-base">Rincian Perjalanan</h3>
                <p className="text-xs text-gray-500">Layanan {detailOrder.order_type.replace('_', ' ')}</p>
              </div>
            </div>

            {/* Carpool Details */}
            {detailOrder.order_type === 'CARPOOL' && (() => {
              const cp = parseCarpoolDetails(detailOrder)
              return (
                <div className="mb-4 rounded-2xl bg-blue-50/80 border border-blue-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-800 flex items-center space-x-1.5">
                      <Clock size={16} className="text-blue-600" />
                      <span>Jam Keberangkatan</span>
                    </span>
                    <span className="text-sm font-black text-blue-950 bg-white px-3 py-1 rounded-lg shadow-sm">
                      {cp?.departureTime ? `${cp.departureTime} WITA` : 'Sesuai Jadwal'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-800 flex items-center space-x-1.5">
                      <Armchair size={16} className="text-blue-600" />
                      <span>Nomor & Posisi Kursi</span>
                    </span>
                    <span className="text-xs font-bold text-blue-950 bg-white px-3 py-1 rounded-lg shadow-sm">
                      {cp?.seatString}
                    </span>
                  </div>

                  {cp?.departureDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-800 flex items-center space-x-1.5">
                        <Calendar size={16} className="text-blue-600" />
                        <span>Tanggal Berangkat</span>
                      </span>
                      <span className="text-xs font-medium text-gray-800">
                        {new Date(cp.departureDate).toLocaleDateString('id-ID', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Addresses */}
            <div className="space-y-3 mb-5">
              <div className="flex items-start space-x-3">
                <MapPin size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase">Titik Jemput</p>
                  <p className="text-xs font-semibold text-gray-800">{detailOrder.pickup_address || '-'}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase">Titik Antar</p>
                  <p className="text-xs font-semibold text-gray-800">{detailOrder.dropoff_address || '-'}</p>
                </div>
              </div>
            </div>

            {/* Driver info if assigned */}
            {detailOrder.driver && (
              <div className="rounded-2xl bg-gray-50 border border-gray-200 p-3.5 mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Sopir Bertugas</p>
                  <p className="text-sm font-bold text-gray-900">{detailOrder.driver.full_name || 'Sopir'}</p>
                  <p className="text-xs text-gray-500">{detailOrder.driver.phone || '-'}</p>
                </div>
                {detailOrder.driver.phone && (
                  <a 
                    href={`tel:${detailOrder.driver.phone}`}
                    className="p-2.5 rounded-xl bg-emerald-600 text-white font-bold transition active:scale-95 shadow-sm"
                  >
                    <PhoneCall size={18} />
                  </a>
                )}
              </div>
            )}

            {/* Price & Payment */}
            <div className="rounded-2xl bg-gray-50 p-4 border border-gray-200 space-y-2 mb-6">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Metode Pembayaran</span>
                <span className="font-bold text-gray-900">{detailOrder.payment_method || 'CASH'}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>Status Pembayaran</span>
                <span className={`font-bold ${detailOrder.payment_status === 'PAID' ? 'text-green-600' : 'text-orange-600'}`}>
                  {detailOrder.payment_status || 'UNPAID'}
                </span>
              </div>
              <div className="flex justify-between text-sm font-black text-gray-900 pt-2 border-t border-gray-200">
                <span>Total Biaya</span>
                <span className="text-primary text-base">Rp {detailOrder.total_price?.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <button
              onClick={() => setDetailOrder(null)}
              className="w-full rounded-2xl bg-gray-900 py-3 text-xs font-bold text-white transition active:scale-98"
            >
              Tutup Rincian
            </button>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL (ANINDIRAPAY, QRIS BARCODE, TRANSFER BANK) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setSelectedOrder(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-lg font-bold text-gray-900 mb-1">Pilih Metode Pembayaran</h2>
            <p className="text-xs text-gray-500 mb-5">
              Total tagihan: <strong className="text-primary font-black text-sm">Rp {selectedOrder.total_price?.toLocaleString('id-ID')}</strong>
            </p>
            
            {/* TABS METODE */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              <button
                type="button"
                onClick={() => setPaymentMethod('QRIS')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition ${
                  paymentMethod === 'QRIS' 
                    ? 'border-primary bg-primary text-white shadow-md' 
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <QrCode size={20} className="mb-1" />
                <span className="text-[11px] font-bold">QRIS</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('TRANSFER')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition ${
                  paymentMethod === 'TRANSFER' 
                    ? 'border-primary bg-primary text-white shadow-md' 
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Landmark size={20} className="mb-1" />
                <span className="text-[11px] font-bold">Transfer Bank</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('ANINDIRAPAY')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition ${
                  paymentMethod === 'ANINDIRAPAY' 
                    ? 'border-primary bg-primary text-white shadow-md' 
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <CarFront size={20} className="mb-1" />
                <span className="text-[11px] font-bold">AnindiraPay</span>
              </button>
            </div>

            {/* TAB 1: QRIS BARCODE */}
            {paymentMethod === 'QRIS' && (
              <div className="space-y-4 mb-6 border-t border-gray-100 pt-4 text-center animate-in fade-in">
                <p className="text-xs text-gray-600 font-medium">
                  Scan barcode QRIS di bawah ini dengan GoPay, OVO, Dana, BCA Mobile, atau aplikasi bank apa pun:
                </p>

                {qrisImage?.image_url ? (
                  <div className="flex flex-col items-center">
                    <div className="p-3 bg-white border-2 border-gray-200 rounded-2xl shadow-inner mb-2 max-w-[220px]">
                      <img 
                        src={qrisImage.image_url} 
                        alt="Barcode QRIS" 
                        className="w-full object-contain rounded-lg"
                      />
                    </div>
                    <a 
                      href={qrisImage.image_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-xs text-primary font-bold hover:underline"
                    >
                      <ExternalLink size={13} />
                      <span>Buka Barcode Penuh</span>
                    </a>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-xl text-xs text-gray-400">
                    Barcode QRIS sedang disiapkan admin. Silakan gunakan metode Transfer Bank.
                  </div>
                )}

                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center justify-between text-left">
                  <div>
                    <span className="text-[10px] text-orange-600 uppercase font-bold">Nominal Pembayaran</span>
                    <p className="text-base font-black text-orange-800">Rp {selectedOrder.total_price?.toLocaleString('id-ID')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(selectedOrder.total_price.toString(), 'amount')}
                    className="flex items-center space-x-1 bg-white border border-orange-200 px-2.5 py-1.5 rounded-lg text-xs font-bold text-orange-700 shadow-sm"
                  >
                    {copiedAmount ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    <span>{copiedAmount ? 'Disalin' : 'Salin'}</span>
                  </button>
                </div>

                {/* Upload Bukti */}
                <div className="text-left pt-2">
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">Unggah Bukti Pembayaran QRIS</label>
                  <label className="flex flex-col items-center justify-center w-full min-h-[110px] border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition p-3">
                    {receiptPreview ? (
                      <div className="flex flex-col items-center">
                        <img src={receiptPreview} alt="Preview Bukti" className="h-24 object-contain rounded-lg mb-1" />
                        <span className="text-[11px] text-primary font-bold">Ganti Foto</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <Upload size={22} className="text-gray-400 mb-1" />
                        <span className="text-xs text-gray-500 font-semibold">Klik untuk pilih bukti pembayaran</span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const f = e.target.files[0]
                          setReceiptFile(f)
                          setReceiptPreview(URL.createObjectURL(f))
                        }
                      }} 
                    />
                  </label>
                </div>
              </div>
            )}

            {/* TAB 2: TRANSFER BANK */}
            {paymentMethod === 'TRANSFER' && (
              <div className="space-y-4 mb-6 border-t border-gray-100 pt-4 animate-in fade-in">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-2">Pilih Rekening Tujuan</label>
                  <select 
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-3 text-xs font-bold focus:border-primary outline-none bg-white"
                  >
                    <option value="" disabled>Pilih Rekening Bank...</option>
                    {banks.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.bank_name} - {b.account_number} ({b.account_holder})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedBankId && (() => {
                  const b = banks.find(item => item.id === selectedBankId)
                  if (!b) return null
                  return (
                    <div className="rounded-xl bg-blue-50/80 border border-blue-100 p-3.5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-blue-700 uppercase">{b.bank_name}</span>
                        <p className="text-base font-black text-gray-900 my-0.5 tracking-wide">{b.account_number}</p>
                        <p className="text-[11px] text-gray-600">a.n. {b.account_holder}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(b.account_number, 'bank', b.id)}
                        className="flex items-center space-x-1 bg-white border border-blue-200 px-3 py-2 rounded-xl text-xs font-bold text-blue-600 shadow-sm"
                      >
                        {copiedBankId === b.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                        <span>{copiedBankId === b.id ? 'Disalin' : 'Salin'}</span>
                      </button>
                    </div>
                  )
                })()}

                {/* Upload Bukti */}
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">Unggah Bukti Transfer Bank</label>
                  <label className="flex flex-col items-center justify-center w-full min-h-[110px] border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition p-3">
                    {receiptPreview ? (
                      <div className="flex flex-col items-center">
                        <img src={receiptPreview} alt="Preview Bukti" className="h-24 object-contain rounded-lg mb-1" />
                        <span className="text-[11px] text-primary font-bold">Ganti Foto</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <Upload size={22} className="text-gray-400 mb-1" />
                        <span className="text-xs text-gray-500 font-semibold">Klik untuk pilih foto bukti transfer</span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const f = e.target.files[0]
                          setReceiptFile(f)
                          setReceiptPreview(URL.createObjectURL(f))
                        }
                      }} 
                    />
                  </label>
                </div>
              </div>
            )}

            {/* TAB 3: ANINDIRAPAY */}
            {paymentMethod === 'ANINDIRAPAY' && (
              <div className="space-y-4 mb-6 border-t border-gray-100 pt-4 animate-in fade-in">
                <div className="rounded-2xl bg-blue-50/80 border border-blue-100 p-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-gray-600">Saldo AnindiraPay Anda:</span>
                    <span className="text-base font-black text-primary">Rp {balance.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Biaya Pesanan:</span>
                    <span className="font-bold text-gray-900">Rp {selectedOrder.total_price?.toLocaleString('id-ID')}</span>
                  </div>
                  {balance < selectedOrder.total_price && (
                    <div className="mt-3 pt-3 border-t border-blue-200/60 text-xs text-red-600 font-medium">
                      Saldo Anda kurang Rp {(selectedOrder.total_price - balance).toLocaleString('id-ID')}. Silakan isi saldo terlebih dahulu.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* BUTTON CONFIRM */}
            <button
              disabled={isUploading || (paymentMethod !== 'ANINDIRAPAY' && !receiptFile)}
              onClick={() => paymentMethod === 'ANINDIRAPAY' ? processAnindiraPay() : processTransferOrQris()}
              className="w-full rounded-2xl bg-primary py-3.5 font-bold text-white shadow-lg shadow-blue-200 transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none text-sm"
            >
              {isUploading ? 'Memproses...' : 'Konfirmasi Pembayaran'}
            </button>
          </div>
        </div>
      )}

      {/* REVIEW MODAL */}
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
