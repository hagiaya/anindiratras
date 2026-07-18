import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, CreditCard, Wallet, Banknote, PlaneTakeoff, PlaneLanding, Calendar, Clock, Car } from 'lucide-react'
import { supabase } from '../lib/supabase'
import MapPickerModal from '../components/MapPickerModal'

export default function Airport() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  
  const [direction, setDirection] = useState<'TO_AIRPORT' | 'FROM_AIRPORT'>('TO_AIRPORT')
  const [pickup, setPickup] = useState('')
  const [dropoff, setDropoff] = useState('Bandara (YIA / Adisutjipto)')
  const [pickupLat, setPickupLat] = useState<number | null>(null)
  const [pickupLng, setPickupLng] = useState<number | null>(null)
  const [dropoffLat, setDropoffLat] = useState<number | null>(null)
  const [dropoffLng, setDropoffLng] = useState<number | null>(null)

  const [isMapOpen, setIsMapOpen] = useState(false)
  const [mapTarget, setMapTarget] = useState<'PICKUP' | 'DROPOFF'>('PICKUP')

  const [carSize, setCarSize] = useState<'KECIL' | 'BESAR'>('KECIL')
  
  // Date & Time
  const [pickupDate, setPickupDate] = useState('')
  const [pickupTime, setPickupTime] = useState('')

  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER'>('CASH')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Promo State
  const [promoCode, setPromoCode] = useState('')
  const [promoData, setPromoData] = useState<any>(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError, setPromoError] = useState('')
  const [promoSuccess, setPromoSuccess] = useState('')

  useEffect(() => {
    if (direction === 'TO_AIRPORT') {
      setDropoff('Bandara (YIA / Adisutjipto)')
      setPickup('')
    } else {
      setPickup('Bandara (YIA / Adisutjipto)')
      setDropoff('')
    }
  }, [direction])

  const basePrice = carSize === 'KECIL' ? 150000 : 250000

  const getFinalPrice = (totalBase: number) => {
    if (!promoData) return totalBase
    if (totalBase < promoData.min_order_amount) return totalBase

    let discount = 0
    if (promoData.discount_type === 'FIXED') {
      discount = promoData.discount_value
    } else if (promoData.discount_type === 'PERCENTAGE') {
      discount = totalBase * (promoData.discount_value / 100)
      if (promoData.max_discount_amount && discount > promoData.max_discount_amount) {
        discount = promoData.max_discount_amount
      }
    }
    return Math.max(0, totalBase - discount)
  }

  const handleApplyPromo = async () => {
    if (!promoCode) return
    setPromoLoading(true)
    setPromoError('')
    setPromoSuccess('')
    setPromoData(null)

    try {
      const { data, error } = await supabase
        .from('promos')
        .select('*')
        .eq('code', promoCode.toUpperCase())
        .eq('is_active', true)
        .single()

      if (error || !data) throw new Error('Kode promo tidak valid atau sudah tidak aktif')
      
      if (basePrice < data.min_order_amount) {
        throw new Error(`Minimal transaksi Rp ${data.min_order_amount.toLocaleString('id-ID')} untuk promo ini`)
      }

      setPromoData(data)
      setPromoSuccess('Promo berhasil digunakan!')
    } catch (err: any) {
      setPromoError(err.message)
    } finally {
      setPromoLoading(false)
    }
  }

  const handleCheckout = async () => {
    setLoading(true)
    setError('')
    try {
      const demoMode = localStorage.getItem('demo_mode')
      
      if (!demoMode) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Anda belum login')
      }

      const totalPrice = getFinalPrice(basePrice)

      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('checkout', {
        body: {
          paymentMethod,
          orderPayload: {
            order_type: 'AIRPORT',
            pickup_address: pickup,
            pickup_lat: pickupLat,
            pickup_lng: pickupLng,
            dropoff_address: dropoff,
            dropoff_lat: dropoffLat,
            dropoff_lng: dropoffLng,
            package_details: JSON.stringify({ direction, carSize, pickupDate, pickupTime }),
            total_price: totalPrice,
            promo_id: promoData?.id || null
          }
        }
      })

      if (checkoutError) throw new Error(checkoutError.message || 'Gagal membuat pesanan')
      if (checkoutData?.error) throw new Error(checkoutData.error)

      navigate('/orders')

    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-50 flex items-center bg-white px-4 py-4 shadow-sm">
        <button onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)} className="mr-4 text-gray-600 transition active:scale-90">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Antar Jemput Bandara</h1>
      </div>

      <div className="p-4">
        {error && <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm font-semibold text-red-600">{error}</div>}

        <div className="mb-8 flex items-center justify-center space-x-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`h-2 w-12 rounded-full transition-colors duration-300 ${step >= i ? 'bg-cyan-500' : 'bg-gray-200'}`} />
          ))}
        </div>

        {/* STEP 1: LOKASI JEMPUT & ANTAR */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div>
              <label className="mb-3 block text-sm font-bold text-gray-700">Tujuan Perjalanan</label>
              <div className="flex rounded-lg bg-gray-200 p-1">
                <button
                  className={`flex-1 rounded-md py-2.5 text-sm font-bold transition flex items-center justify-center space-x-2 ${direction === 'TO_AIRPORT' ? 'bg-white text-cyan-600 shadow' : 'text-gray-600'}`}
                  onClick={() => setDirection('TO_AIRPORT')}
                >
                  <PlaneTakeoff size={18} />
                  <span>Ke Bandara</span>
                </button>
                <button
                  className={`flex-1 rounded-md py-2.5 text-sm font-bold transition flex items-center justify-center space-x-2 ${direction === 'FROM_AIRPORT' ? 'bg-white text-cyan-600 shadow' : 'text-gray-600'}`}
                  onClick={() => setDirection('FROM_AIRPORT')}
                >
                  <PlaneLanding size={18} />
                  <span>Dari Bandara</span>
                </button>
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100">
              <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Lokasi Jemput & Antar</h2>
              <div className="relative space-y-5">
                <div className="absolute left-[11px] top-6 h-[52px] w-0.5 bg-gray-200"></div>
                <div className="flex items-start space-x-3">
                  <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <MapPin size={14} />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-500">Lokasi Penjemputan</label>
                    <div className="flex items-center space-x-2 border-b-2 border-gray-100 pb-2 mt-1 focus-within:border-cyan-500 transition-colors">
                      <input
                        type="text"
                        value={pickup}
                        onChange={e => setPickup(e.target.value)}
                        placeholder="Cari lokasi penjemputan..."
                        className="w-full font-medium text-gray-800 focus:outline-none"
                        disabled={direction === 'FROM_AIRPORT'}
                      />
                      {direction !== 'FROM_AIRPORT' && (
                        <button onClick={() => { setMapTarget('PICKUP'); setIsMapOpen(true); }} className="text-xs font-bold text-cyan-600 whitespace-nowrap bg-cyan-50 px-2 py-1 rounded-md">
                          Peta
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-100 text-cyan-600">
                    <MapPin size={14} />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-500">Lokasi Pengantaran</label>
                    <div className="flex items-center space-x-2 border-b-2 border-gray-100 pb-2 mt-1 focus-within:border-cyan-500 transition-colors">
                      <input
                        type="text"
                        value={dropoff}
                        onChange={e => setDropoff(e.target.value)}
                        placeholder="Cari lokasi pengantaran..."
                        className="w-full font-medium text-gray-800 focus:outline-none"
                        disabled={direction === 'TO_AIRPORT'}
                      />
                      {direction !== 'TO_AIRPORT' && (
                        <button onClick={() => { setMapTarget('DROPOFF'); setIsMapOpen(true); }} className="text-xs font-bold text-cyan-600 whitespace-nowrap bg-cyan-50 px-2 py-1 rounded-md">
                          Peta
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              disabled={!pickup || !dropoff}
              onClick={() => setStep(2)}
              className="mt-6 w-full rounded-full bg-cyan-500 py-4 font-bold text-white shadow-lg shadow-cyan-200 transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
            >
              Lanjut Pilih Mobil
            </button>
          </div>
        )}

        {/* STEP 2: PILIH MOBIL */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100">
              <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Pilih Kapasitas Mobil</h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setCarSize('KECIL')}
                  className={`flex flex-col items-center justify-center rounded-2xl p-4 border-2 transition active:scale-95 ${carSize === 'KECIL' ? 'border-cyan-500 bg-cyan-50' : 'border-gray-100 bg-white shadow-sm'}`}
                >
                  <Car size={40} className={carSize === 'KECIL' ? 'text-cyan-500' : 'text-gray-400'} />
                  <span className={`mt-3 font-bold ${carSize === 'KECIL' ? 'text-cyan-600' : 'text-gray-600'}`}>Mobil Kecil</span>
                  <span className="text-xs text-gray-500 mt-1">Maks. 4 Orang</span>
                  <span className="text-sm font-bold text-cyan-500 mt-2">Rp 150.000</span>
                </button>
                <button
                  onClick={() => setCarSize('BESAR')}
                  className={`flex flex-col items-center justify-center rounded-2xl p-4 border-2 transition active:scale-95 ${carSize === 'BESAR' ? 'border-cyan-500 bg-cyan-50' : 'border-gray-100 bg-white shadow-sm'}`}
                >
                  <Car size={48} className={carSize === 'BESAR' ? 'text-cyan-500' : 'text-gray-400'} />
                  <span className={`mt-3 font-bold ${carSize === 'BESAR' ? 'text-cyan-600' : 'text-gray-600'}`}>Mobil Besar</span>
                  <span className="text-xs text-gray-500 mt-1">Maks. 6-7 Orang</span>
                  <span className="text-sm font-bold text-cyan-500 mt-2">Rp 250.000</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => setStep(3)}
              className="mt-6 w-full rounded-full bg-cyan-500 py-4 font-bold text-white shadow-lg shadow-cyan-200 transition active:scale-[0.98]"
            >
              Lanjut Pilih Waktu Jemput
            </button>
          </div>
        )}

        {/* STEP 3: PILIH HARI, TANGGAL, JAM */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100">
              <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Jadwal Keberangkatan</h2>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <Calendar size={16} />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-500">Tanggal Keberangkatan</label>
                    <div className="flex items-center space-x-2 border-b-2 border-gray-100 pb-2 mt-1 focus-within:border-cyan-500 transition-colors">
                      <input
                        type="date"
                        value={pickupDate}
                        onChange={e => setPickupDate(e.target.value)}
                        className="w-full font-bold text-gray-800 focus:outline-none bg-transparent"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                    <Clock size={16} />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-500">Jam Penjemputan</label>
                    <div className="flex items-center space-x-2 border-b-2 border-gray-100 pb-2 mt-1 focus-within:border-cyan-500 transition-colors">
                      <input
                        type="time"
                        value={pickupTime}
                        onChange={e => setPickupTime(e.target.value)}
                        className="w-full font-bold text-gray-800 focus:outline-none bg-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              disabled={!pickupDate || !pickupTime}
              onClick={() => setStep(4)}
              className="mt-6 w-full rounded-full bg-cyan-500 py-4 font-bold text-white shadow-lg shadow-cyan-200 transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
            >
              Lanjut ke Ringkasan
            </button>
          </div>
        )}

        {/* STEP 4: CHECKOUT */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100">
              <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Ringkasan Pemesanan</h2>
              
              <div className="space-y-4 rounded-xl bg-gray-50 p-4 mb-4 border border-gray-100">
                <div className="flex items-start space-x-3">
                  {direction === 'TO_AIRPORT' ? <PlaneTakeoff size={20} className="text-cyan-500 shrink-0" /> : <PlaneLanding size={20} className="text-cyan-500 shrink-0" />}
                  <div>
                    <h3 className="font-bold text-gray-800">{direction === 'TO_AIRPORT' ? 'Ke Bandara' : 'Dari Bandara'}</h3>
                    <p className="text-xs text-gray-500 mt-1">{pickupDate} • {pickupTime} WIB</p>
                  </div>
                </div>
                <div className="border-t border-gray-200 my-2"></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Jemput</p>
                    <p className="text-xs font-medium text-gray-800 mt-1">{pickup}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Antar</p>
                    <p className="text-xs font-medium text-gray-800 mt-1">{dropoff}</p>
                  </div>
                </div>
                <div className="border-t border-gray-200 my-2"></div>
                <div className="flex items-center space-x-3">
                  <Car size={16} className="text-gray-400 shrink-0" />
                  <p className="text-sm font-bold text-gray-800">Mobil {carSize === 'KECIL' ? 'Kecil' : 'Besar'}</p>
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                <div className="flex justify-between items-center text-lg font-bold text-gray-900 mt-2">
                  <span>Total Harga</span>
                  <div className="text-right">
                    {promoData && <span className="text-sm text-gray-400 line-through mr-2">Rp {basePrice.toLocaleString('id-ID')}</span>}
                    <span className="text-cyan-600">Rp {getFinalPrice(basePrice).toLocaleString('id-ID')}</span>
                  </div>
                </div>
                {promoData && (
                  <div className="flex justify-between items-center text-sm font-bold text-green-600 mt-1">
                    <span>Diskon Promo ({promoData.code})</span>
                    <span>- Rp {(basePrice - getFinalPrice(basePrice)).toLocaleString('id-ID')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* PROMO SECTION */}
            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100 mt-4">
              <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Makin Hemat dengan Promo</h2>
              <div className="flex space-x-2">
                <input 
                  type="text" 
                  value={promoCode} 
                  onChange={e => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Masukkan Kode Promo" 
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:border-cyan-500 outline-none uppercase font-bold"
                  disabled={!!promoData}
                />
                {!promoData ? (
                  <button 
                    onClick={handleApplyPromo}
                    disabled={!promoCode || promoLoading}
                    className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold transition active:scale-95 disabled:opacity-50"
                  >
                    {promoLoading ? 'Cek...' : 'Gunakan'}
                  </button>
                ) : (
                  <button 
                    onClick={() => { setPromoData(null); setPromoCode(''); setPromoSuccess(''); }}
                    className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm font-bold transition active:scale-95"
                  >
                    Batal
                  </button>
                )}
              </div>
              {promoError && <p className="text-xs text-red-500 mt-2 font-medium">{promoError}</p>}
              {promoSuccess && <p className="text-xs text-green-600 mt-2 font-medium">{promoSuccess}</p>}
            </div>

            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100 mt-4">
              <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Pilih Metode Pembayaran</h2>
              <div className="space-y-3">
                <label className={`flex cursor-pointer items-center justify-between rounded-xl border-2 p-4 transition ${paymentMethod === 'CASH' ? 'border-cyan-500 bg-cyan-50' : 'border-gray-100'}`}>
                  <div className="flex items-center space-x-3">
                    <Banknote className={paymentMethod === 'CASH' ? 'text-cyan-500' : 'text-gray-400'} />
                    <span className="font-bold text-gray-800">Tunai (Cash)</span>
                  </div>
                  <input type="radio" name="payment" checked={paymentMethod === 'CASH'} onChange={() => setPaymentMethod('CASH')} className="hidden" />
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'CASH' ? 'border-cyan-500' : 'border-gray-300'}`}>
                    {paymentMethod === 'CASH' && <div className="h-2.5 w-2.5 rounded-full bg-cyan-500" />}
                  </div>
                </label>

                <label className={`flex cursor-pointer items-center justify-between rounded-xl border-2 p-4 transition ${paymentMethod === 'TRANSFER' ? 'border-cyan-500 bg-cyan-50' : 'border-gray-100'}`}>
                  <div className="flex items-center space-x-3">
                    <Wallet className={paymentMethod === 'TRANSFER' ? 'text-cyan-500' : 'text-gray-400'} />
                    <div>
                      <p className="font-bold text-gray-800">Saldo AnindiraPay</p>
                    </div>
                  </div>
                  <input type="radio" name="payment" checked={paymentMethod === 'TRANSFER'} onChange={() => setPaymentMethod('TRANSFER')} className="hidden" />
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'TRANSFER' ? 'border-cyan-500' : 'border-gray-300'}`}>
                    {paymentMethod === 'TRANSFER' && <div className="h-2.5 w-2.5 rounded-full bg-cyan-500" />}
                  </div>
                </label>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center space-x-2 rounded-full bg-cyan-500 py-4 font-bold text-white shadow-lg shadow-cyan-200 transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
            >
              <CreditCard size={20} />
              <span>{loading ? 'Memproses...' : 'Buat Pesanan'}</span>
            </button>
          </div>
        )}
      </div>

      <MapPickerModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        title={mapTarget === 'PICKUP' ? 'Pilih Lokasi Jemput' : 'Pilih Lokasi Antar'}
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
