import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, CreditCard, Clock, Wallet, Banknote } from 'lucide-react'
import { supabase } from '../lib/supabase'
import MapPickerModal from '../components/MapPickerModal'

type AreaType = 'DALAM_KOTA' | 'LUAR_KOTA'
type CarUnit = 'AVANZA' | 'INNOVA' | 'HIACE'

const CARS = [
  { id: 'AVANZA', name: 'Avanza / Xenia', seats: 6, img: '🚗', basePrice: 350000 },
  { id: 'INNOVA', name: 'Innova Reborn', seats: 7, img: '🚙', basePrice: 600000 },
  { id: 'HIACE', name: 'Toyota Hiace', seats: 14, img: '🚐', basePrice: 1200000 },
] as const

export default function Rental() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  
  const [selectedCar, setSelectedCar] = useState<CarUnit | null>(null)
  
  const [areaType, setAreaType] = useState<AreaType>('DALAM_KOTA')
  const [rentalDays, setRentalDays] = useState<number>(1)
  
  const [pickup, setPickup] = useState('')
  const [pickupLat, setPickupLat] = useState<number | null>(null)
  const [pickupLng, setPickupLng] = useState<number | null>(null)
  const [isMapOpen, setIsMapOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER'>('CASH')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Promo State
  const [promoCode, setPromoCode] = useState('')
  const [promoData, setPromoData] = useState<any>(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError, setPromoError] = useState('')
  const [promoSuccess, setPromoSuccess] = useState('')

  const getPricePerDay = () => {
    if (!selectedCar) return 0
    const carData = CARS.find(c => c.id === selectedCar)
    let price = carData ? carData.basePrice : 0
    if (areaType === 'LUAR_KOTA') {
      price = price * 1.5 // 50% tambahan untuk luar kota, bisa disesuaikan
    }
    return price
  }

  const getTotalBasePrice = () => {
    return getPricePerDay() * rentalDays
  }

  const getFinalPrice = (basePrice: number) => {
    if (!promoData) return basePrice
    if (basePrice < promoData.min_order_amount) return basePrice

    let discount = 0
    if (promoData.discount_type === 'FIXED') {
      discount = promoData.discount_value
    } else if (promoData.discount_type === 'PERCENTAGE') {
      discount = basePrice * (promoData.discount_value / 100)
      if (promoData.max_discount_amount && discount > promoData.max_discount_amount) {
        discount = promoData.max_discount_amount
      }
    }
    return Math.max(0, basePrice - discount)
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
      
      const totalBase = getTotalBasePrice()
      if (totalBase < data.min_order_amount) {
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
    if (!selectedCar) return
    
    setLoading(true)
    setError('')
    try {
      const demoMode = localStorage.getItem('demo_mode')
      
      if (!demoMode) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Anda belum login')
      }

      const totalBase = getTotalBasePrice()
      const finalPrice = getFinalPrice(totalBase)

      // Call Checkout Edge Function
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('checkout', {
        body: {
          paymentMethod,
          orderPayload: {
            order_type: 'SEWA_MOBIL',
            pickup_address: pickup,
            pickup_lat: pickupLat,
            pickup_lng: pickupLng,
            rental_duration_hours: rentalDays * 24, // Keep in hours for backend compat if needed
            package_details: JSON.stringify({ carUnit: selectedCar, areaType, rentalDays }),
            total_price: finalPrice,
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
        <h1 className="text-lg font-bold text-gray-800">Sewa Mobil</h1>
      </div>

      <div className="p-4">
        {error && <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm font-semibold text-red-600">{error}</div>}

        <div className="mb-8 flex items-center justify-center space-x-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`h-2 w-12 rounded-full transition-colors duration-300 ${step >= i ? 'bg-purple-500' : 'bg-gray-200'}`} />
          ))}
        </div>

        {/* STEP 1: PILIH MOBIL */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div>
              <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Pilih Unit Mobil</h2>
              <div className="space-y-4">
                {CARS.map(car => (
                  <div
                    key={car.id}
                    onClick={() => setSelectedCar(car.id)}
                    className={`cursor-pointer rounded-2xl border-2 p-5 transition active:scale-[0.98] relative overflow-hidden ${selectedCar === car.id ? 'border-purple-500 bg-white shadow-md' : 'border-gray-100 bg-white shadow-sm'}`}
                  >
                    {selectedCar === car.id && (
                      <div className="absolute top-0 right-0 bg-purple-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                        DIPILIH
                      </div>
                    )}
                    <div className="flex items-center space-x-4">
                      <div className="text-4xl">{car.img}</div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800 text-lg">{car.name}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">Maks {car.seats} Penumpang</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              disabled={!selectedCar}
              onClick={() => setStep(2)}
              className="mt-6 w-full rounded-full bg-purple-500 py-4 font-bold text-white shadow-lg shadow-purple-200 transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
            >
              Lanjut Pilih Area & Durasi
            </button>
          </div>
        )}

        {/* STEP 2: DURASI & AREA */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100">
              <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Pilih Layanan Area</h2>
              <div className="flex rounded-lg bg-gray-200 p-1 mb-4">
                <button
                  className={`flex-1 rounded-md py-2.5 text-sm font-bold transition ${areaType === 'DALAM_KOTA' ? 'bg-white text-purple-600 shadow' : 'text-gray-600'}`}
                  onClick={() => setAreaType('DALAM_KOTA')}
                >
                  Dalam Kota
                </button>
                <button
                  className={`flex-1 rounded-md py-2.5 text-sm font-bold transition ${areaType === 'LUAR_KOTA' ? 'bg-white text-purple-600 shadow' : 'text-gray-600'}`}
                  onClick={() => setAreaType('LUAR_KOTA')}
                >
                  Luar Kota
                </button>
              </div>

              <h2 className="mt-6 mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Sewa Harian</h2>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[1, 2, 3, 4, 5, 6, 7].map(days => (
                  <button
                    key={days}
                    onClick={() => setRentalDays(days)}
                    className={`rounded-xl py-3 border-2 transition active:scale-95 font-bold ${rentalDays === days ? 'border-purple-500 bg-purple-50 text-purple-600' : 'border-gray-100 bg-white text-gray-600'}`}
                  >
                    {days} Hari
                  </button>
                ))}
                <button
                  onClick={() => setRentalDays(rentalDays > 7 ? rentalDays + 1 : 8)}
                  className={`rounded-xl py-3 border-2 transition active:scale-95 font-bold ${rentalDays > 7 ? 'border-purple-500 bg-purple-50 text-purple-600' : 'border-gray-100 bg-white text-gray-600'}`}
                >
                  8+
                </button>
              </div>

              <div className="mt-4 rounded-xl bg-purple-50 p-3 flex items-start space-x-2 border border-purple-100">
                <Clock size={16} className="text-purple-500 mt-0.5 shrink-0" />
                <p className="text-xs font-semibold text-purple-800">Catatan: 1 Hari dihitung dari jam 07:00 pagi sampai jam 22:00 malam.</p>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                <span className="text-sm font-bold text-gray-600">Total Biaya ({rentalDays} Hari)</span>
                <span className="text-lg font-bold text-purple-600">Rp {getTotalBasePrice().toLocaleString('id-ID')}</span>
              </div>
            </div>

            <button
              onClick={() => setStep(3)}
              className="mt-6 w-full rounded-full bg-purple-500 py-4 font-bold text-white shadow-lg shadow-purple-200 transition active:scale-[0.98]"
            >
              Lanjut Pilih Lokasi Jemput
            </button>
          </div>
        )}

        {/* STEP 3: LOKASI JEMPUT */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100">
              <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Lokasi Penjemputan</h2>
              <div className="flex items-start space-x-3">
                <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                  <MapPin size={14} />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500">Alamat Penjemputan</label>
                  <div className="flex items-center space-x-2 border-b-2 border-gray-100 pb-2 mt-1 focus-within:border-purple-500 transition-colors">
                    <input
                      type="text"
                      value={pickup}
                      onChange={e => setPickup(e.target.value)}
                      placeholder="Contoh: Hotel, Bandara, Rumah..."
                      className="w-full font-medium text-gray-800 focus:outline-none"
                    />
                    <button onClick={() => setIsMapOpen(true)} className="text-xs font-bold text-purple-600 whitespace-nowrap bg-purple-50 px-2 py-1 rounded-md">
                      Peta
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              disabled={!pickup}
              onClick={() => setStep(4)}
              className="mt-6 w-full rounded-full bg-purple-500 py-4 font-bold text-white shadow-lg shadow-purple-200 transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
            >
              Lanjut ke Ringkasan
            </button>
          </div>
        )}

        {/* STEP 4: CHECKOUT */}
        {step === 4 && selectedCar && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100">
              <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Ringkasan Sewa Mobil</h2>
              
              <div className="space-y-4 rounded-xl bg-gray-50 p-4 mb-4 border border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Unit Mobil</p>
                    <h3 className="font-bold text-gray-800 text-lg">{CARS.find(c => c.id === selectedCar)?.name}</h3>
                  </div>
                  <div className="text-3xl">{CARS.find(c => c.id === selectedCar)?.img}</div>
                </div>
                <div className="border-t border-gray-200 my-2"></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Area & Durasi</p>
                    <p className="text-sm font-semibold text-gray-800">{areaType === 'DALAM_KOTA' ? 'Dalam Kota' : 'Luar Kota'}</p>
                    <p className="text-xs text-gray-500">{rentalDays} Hari</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Fasilitas</p>
                    <p className="text-sm font-semibold text-gray-800">Mobil + Sopir</p>
                  </div>
                </div>
                <div className="border-t border-gray-200 my-2"></div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Lokasi Jemput</p>
                  <div className="flex items-start space-x-2">
                    <MapPin size={16} className="text-purple-500 mt-0.5 shrink-0" />
                    <p className="text-sm font-medium text-gray-700 leading-snug">{pickup}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                {promoData && (
                  <div className="flex justify-between items-center text-sm font-bold text-green-600 mt-2">
                    <span>Diskon Promo ({promoData.code})</span>
                    <span>- Rp {(getTotalBasePrice() - getFinalPrice(getTotalBasePrice())).toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-lg font-bold text-gray-900 mt-2 border-t border-gray-100 pt-2">
                  <span>Total Harga Sewa</span>
                  <div className="text-right">
                    {promoData && <span className="text-sm text-gray-400 line-through mr-2">Rp {getTotalBasePrice().toLocaleString('id-ID')}</span>}
                    <span className="text-purple-600">Rp {getFinalPrice(getTotalBasePrice()).toLocaleString('id-ID')}</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 text-right">*Belum termasuk BBM, tol, dan parkir</p>
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
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:border-purple-500 outline-none uppercase font-bold"
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
                <label className={`flex cursor-pointer items-center justify-between rounded-xl border-2 p-4 transition ${paymentMethod === 'CASH' ? 'border-purple-500 bg-purple-50' : 'border-gray-100'}`}>
                  <div className="flex items-center space-x-3">
                    <Banknote className={paymentMethod === 'CASH' ? 'text-purple-500' : 'text-gray-400'} />
                    <span className="font-bold text-gray-800">Tunai (Cash)</span>
                  </div>
                  <input type="radio" name="payment" checked={paymentMethod === 'CASH'} onChange={() => setPaymentMethod('CASH')} className="hidden" />
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'CASH' ? 'border-purple-500' : 'border-gray-300'}`}>
                    {paymentMethod === 'CASH' && <div className="h-2.5 w-2.5 rounded-full bg-purple-500" />}
                  </div>
                </label>

                <label className={`flex cursor-pointer items-center justify-between rounded-xl border-2 p-4 transition ${paymentMethod === 'TRANSFER' ? 'border-purple-500 bg-purple-50' : 'border-gray-100'}`}>
                  <div className="flex items-center space-x-3">
                    <Wallet className={paymentMethod === 'TRANSFER' ? 'text-purple-500' : 'text-gray-400'} />
                    <div>
                      <p className="font-bold text-gray-800">Saldo AnindiraPay</p>
                    </div>
                  </div>
                  <input type="radio" name="payment" checked={paymentMethod === 'TRANSFER'} onChange={() => setPaymentMethod('TRANSFER')} className="hidden" />
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'TRANSFER' ? 'border-purple-500' : 'border-gray-300'}`}>
                    {paymentMethod === 'TRANSFER' && <div className="h-2.5 w-2.5 rounded-full bg-purple-500" />}
                  </div>
                </label>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center space-x-2 rounded-full bg-purple-500 py-4 font-bold text-white shadow-lg shadow-purple-200 transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
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
        title="Pilih Lokasi Jemput"
        onSelect={(lat, lng, addr) => {
          setPickupLat(lat)
          setPickupLng(lng)
          setPickup(addr)
        }}
      />
    </div>
  )
}
