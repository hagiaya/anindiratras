import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Package as PackageIcon, User, Phone, CreditCard } from 'lucide-react'
import { supabase } from '../lib/supabase'
import MapPickerModal from '../components/MapPickerModal'

export default function Package() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  
  // Lokasi
  const [pickup, setPickup] = useState('')
  const [dropoff, setDropoff] = useState('')
  const [pickupLat, setPickupLat] = useState<number | null>(null)
  const [pickupLng, setPickupLng] = useState<number | null>(null)
  const [dropoffLat, setDropoffLat] = useState<number | null>(null)
  const [dropoffLng, setDropoffLng] = useState<number | null>(null)

  const [isMapOpen, setIsMapOpen] = useState(false)
  const [mapTarget, setMapTarget] = useState<'PICKUP' | 'DROPOFF'>('PICKUP')
  
  // Detail Pengirim & Penerima
  const [senderName, setSenderName] = useState('')
  const [senderPhone, setSenderPhone] = useState('')
  const [receiverName, setReceiverName] = useState('')
  const [receiverPhone, setReceiverPhone] = useState('')
  
  // Detail Barang
  const [itemName, setItemName] = useState('')
  const [weight, setWeight] = useState<'KECIL' | 'SEDANG' | 'BESAR'>('KECIL')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [packagePrices, setPackagePrices] = useState<any[]>([])

  useEffect(() => {
    const fetchPrices = async () => {
      const { data } = await supabase
        .from('product_prices')
        .select('*')
        .eq('product_type', 'TITIP_BARANG')
      
      if (data) {
        setPackagePrices(data)
      }
    }
    fetchPrices()
  }, [])

  // Cari harga berdasarkan ukuran (description), default jika belum diatur admin
  const selectedPriceData = packagePrices.find(p => p.description === weight)
  const basePrice = selectedPriceData ? Number(selectedPriceData.base_price) : (weight === 'KECIL' ? 15000 : weight === 'SEDANG' ? 25000 : 50000)

  const handleCheckout = async () => {
    setLoading(true)
    setError('')
    try {
      const demoMode = localStorage.getItem('demo_mode')
      let userId = 'demo-user-id'
      
      if (!demoMode) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Anda belum login')
        userId = user.id
      }

      const totalPrice = basePrice + 1000 // with insurance

      // Insert Order
      const { data: order, error: orderError } = await supabase.from('orders').insert({
        user_id: userId,
        order_type: 'TITIP_BARANG',
        pickup_address: pickup,
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        dropoff_address: dropoff,
        dropoff_lat: dropoffLat,
        dropoff_lng: dropoffLng,
        package_details: JSON.stringify({ senderName, senderPhone, receiverName, receiverPhone, itemName, weight }),
        total_price: totalPrice,
      }).select().single()

      if (orderError) throw orderError

      // Get Midtrans Token
      const { data: midtransData, error: midtransError } = await supabase.functions.invoke('midtrans-token', {
        body: {
          orderId: order.id,
          amount: totalPrice,
          customerDetails: {
            first_name: "User",
            phone: '000'
          }
        }
      })

      if (midtransError) throw new Error(midtransError.message || 'Payment error');
      if (midtransData?.error) throw new Error(midtransData.error);

      // Redirect to Midtrans Snap
      window.location.href = midtransData.redirect_url
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* HEADER */}
      <div className="sticky top-0 z-50 flex items-center bg-white px-4 py-4 shadow-sm">
        <button onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)} className="mr-4 text-gray-600 transition active:scale-90">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Titip Barang</h1>
      </div>

      <div className="p-4">
        {error && <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm font-semibold text-red-600">{error}</div>}

        {/* Step Indicator */}
        <div className="mb-8 flex items-center justify-center space-x-2">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-2 w-16 rounded-full transition-colors duration-300 ${step >= i ? 'bg-orange-500' : 'bg-gray-200'}`} />
          ))}
        </div>

        {/* STEP 1: LOKASI PENGIRIMAN */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100">
              <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Rute Pengiriman</h2>
              <div className="relative space-y-5">
                <div className="absolute left-[11px] top-6 h-[52px] w-0.5 bg-gray-200"></div>
                <div className="flex items-start space-x-3">
                  <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <MapPin size={14} />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-500">Lokasi Pengambilan (Pengirim)</label>
                    <div className="flex items-center space-x-2 border-b-2 border-gray-100 pb-2 mt-1 focus-within:border-orange-500 transition-colors">
                      <input
                        type="text"
                        value={pickup}
                        onChange={e => setPickup(e.target.value)}
                        placeholder="Contoh: Jl. Sudirman No 12"
                        className="w-full font-medium text-gray-800 focus:outline-none"
                      />
                      <button onClick={() => { setMapTarget('PICKUP'); setIsMapOpen(true); }} className="text-xs font-bold text-orange-500 whitespace-nowrap bg-orange-50 px-2 py-1 rounded-md">
                        Pilih di Peta
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                    <MapPin size={14} />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-500">Lokasi Tujuan (Penerima)</label>
                    <div className="flex items-center space-x-2 border-b-2 border-gray-100 pb-2 mt-1 focus-within:border-orange-500 transition-colors">
                      <input
                        type="text"
                        value={dropoff}
                        onChange={e => setDropoff(e.target.value)}
                        placeholder="Contoh: Jl. Merdeka No 45"
                        className="w-full font-medium text-gray-800 focus:outline-none"
                      />
                      <button onClick={() => { setMapTarget('DROPOFF'); setIsMapOpen(true); }} className="text-xs font-bold text-orange-500 whitespace-nowrap bg-orange-50 px-2 py-1 rounded-md">
                        Pilih di Peta
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              disabled={!pickup || !dropoff}
              onClick={() => setStep(2)}
              className="mt-6 w-full rounded-full bg-orange-500 py-4 font-bold text-white shadow-lg shadow-orange-200 transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
            >
              Lanjut Isi Detail Barang
            </button>
          </div>
        )}

        {/* STEP 2: DETAIL BARANG & KONTAK */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            {/* Ukuran Barang */}
            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100">
              <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Detail Paket</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Nama/Isi Paket</label>
                  <div className="flex items-center space-x-3 border-b-2 border-gray-100 pb-2 mt-1 focus-within:border-orange-500 transition-colors">
                    <PackageIcon size={18} className="text-gray-400" />
                    <input
                      type="text"
                      value={itemName}
                      onChange={e => setItemName(e.target.value)}
                      placeholder="Contoh: Dokumen, Makanan, Pakaian"
                      className="w-full font-medium text-gray-800 focus:outline-none"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-2">Pilih Ukuran/Berat</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setWeight('KECIL')}
                      className={`flex flex-col items-center justify-center rounded-xl p-3 border-2 transition active:scale-95 ${weight === 'KECIL' ? 'border-orange-500 bg-orange-50' : 'border-gray-100 bg-white'}`}
                    >
                      <PackageIcon size={24} className={weight === 'KECIL' ? 'text-orange-500' : 'text-gray-400'} />
                      <span className={`mt-2 text-xs font-bold ${weight === 'KECIL' ? 'text-orange-600' : 'text-gray-500'}`}>Kecil</span>
                      <span className="text-[10px] text-gray-400">{'< 5kg'}</span>
                    </button>
                    <button
                      onClick={() => setWeight('SEDANG')}
                      className={`flex flex-col items-center justify-center rounded-xl p-3 border-2 transition active:scale-95 ${weight === 'SEDANG' ? 'border-orange-500 bg-orange-50' : 'border-gray-100 bg-white'}`}
                    >
                      <PackageIcon size={28} className={weight === 'SEDANG' ? 'text-orange-500' : 'text-gray-400'} />
                      <span className={`mt-2 text-xs font-bold ${weight === 'SEDANG' ? 'text-orange-600' : 'text-gray-500'}`}>Sedang</span>
                      <span className="text-[10px] text-gray-400">{'5-20kg'}</span>
                    </button>
                    <button
                      onClick={() => setWeight('BESAR')}
                      className={`flex flex-col items-center justify-center rounded-xl p-3 border-2 transition active:scale-95 ${weight === 'BESAR' ? 'border-orange-500 bg-orange-50' : 'border-gray-100 bg-white'}`}
                    >
                      <PackageIcon size={32} className={weight === 'BESAR' ? 'text-orange-500' : 'text-gray-400'} />
                      <span className={`mt-2 text-xs font-bold ${weight === 'BESAR' ? 'text-orange-600' : 'text-gray-500'}`}>Besar</span>
                      <span className="text-[10px] text-gray-400">{'> 20kg'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Pengirim */}
            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100">
              <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Data Pengirim</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 border-b-2 border-gray-100 pb-2 focus-within:border-orange-500 transition-colors">
                  <User size={18} className="text-gray-400" />
                  <input type="text" value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="Nama Pengirim" className="w-full font-medium text-gray-800 focus:outline-none" />
                </div>
                <div className="flex items-center space-x-3 border-b-2 border-gray-100 pb-2 focus-within:border-orange-500 transition-colors">
                  <Phone size={18} className="text-gray-400" />
                  <input type="tel" value={senderPhone} onChange={e => setSenderPhone(e.target.value)} placeholder="No. HP Pengirim" className="w-full font-medium text-gray-800 focus:outline-none" />
                </div>
              </div>
            </div>

            {/* Penerima */}
            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100">
              <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Data Penerima</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 border-b-2 border-gray-100 pb-2 focus-within:border-orange-500 transition-colors">
                  <User size={18} className="text-gray-400" />
                  <input type="text" value={receiverName} onChange={e => setReceiverName(e.target.value)} placeholder="Nama Penerima" className="w-full font-medium text-gray-800 focus:outline-none" />
                </div>
                <div className="flex items-center space-x-3 border-b-2 border-gray-100 pb-2 focus-within:border-orange-500 transition-colors">
                  <Phone size={18} className="text-gray-400" />
                  <input type="tel" value={receiverPhone} onChange={e => setReceiverPhone(e.target.value)} placeholder="No. HP Penerima" className="w-full font-medium text-gray-800 focus:outline-none" />
                </div>
              </div>
            </div>

            <button
              disabled={!itemName || !senderName || !senderPhone || !receiverName || !receiverPhone}
              onClick={() => setStep(3)}
              className="mt-6 w-full rounded-full bg-orange-500 py-4 font-bold text-white shadow-lg shadow-orange-200 transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
            >
              Lanjut ke Pembayaran
            </button>
          </div>
        )}

        {/* STEP 3: CHECKOUT */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100">
              <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Ringkasan Pesanan</h2>
              
              <div className="space-y-4 rounded-xl bg-gray-50 p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <PackageIcon size={20} className="text-orange-500 shrink-0" />
                  <div>
                    <h3 className="font-bold text-gray-800">{itemName}</h3>
                    <p className="text-xs text-gray-500">Ukuran: {weight}</p>
                  </div>
                </div>
                <div className="border-t border-gray-200 my-2"></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Pengirim</p>
                    <p className="text-sm font-semibold text-gray-800">{senderName}</p>
                    <p className="text-xs text-gray-500 truncate">{pickup}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Penerima</p>
                    <p className="text-sm font-semibold text-gray-800">{receiverName}</p>
                    <p className="text-xs text-gray-500 truncate">{dropoff}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Ongkos Kirim</span>
                  <span>Rp {basePrice.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Biaya Asuransi Dasar</span>
                  <span>Rp 1.000</span>
                </div>
                <div className="border-t border-dashed border-gray-200 my-2"></div>
                <div className="flex justify-between items-center text-lg font-bold text-gray-900">
                  <span>Total Tagihan</span>
                  <span className="text-orange-500">Rp {(basePrice + 1000).toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center space-x-2 rounded-full bg-orange-500 py-4 font-bold text-white shadow-lg shadow-orange-200 transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
            >
              <CreditCard size={20} />
              <span>{loading ? 'Memproses...' : 'Pesan & Bayar'}</span>
            </button>
          </div>
        )}
      </div>

      <MapPickerModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        title={mapTarget === 'PICKUP' ? 'Pilih Lokasi Pengirim' : 'Pilih Lokasi Penerima'}
        onSelect={(lat, lng, addr) => {
          if (mapTarget === 'PICKUP') {
            setPickupLat(lat)
            setPickupLng(lng)
            setPickup(addr)
          } else {
            setDropoffLat(lat)
            setDropoffLng(lng)
            setDropoff(addr)
          }
        }}
      />
    </div>
  )
}
