import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, CreditCard, Clock, Wallet, Banknote } from 'lucide-react'
import { supabase } from '../lib/supabase'
import MapPickerModal from '../components/MapPickerModal'

type AreaType = 'DALAM_KOTA' | 'LUAR_KOTA'

const DEFAULT_CARS = [
  { id: 'AVANZA', name: 'Avanza / Xenia', seats: 6, img: '🚗', inCityPrice: 350000, outCityPrice: 500000 },
  { id: 'INNOVA', name: 'Innova Reborn', seats: 7, img: '🚙', inCityPrice: 600000, outCityPrice: 850000 },
  { id: 'HIACE', name: 'Toyota Hiace', seats: 14, img: '🚐', inCityPrice: 1200000, outCityPrice: 1600000 },
]

export default function Rental() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  
  const [dynamicCars, setDynamicCars] = useState<any[]>(DEFAULT_CARS)
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null)
  
  const [areaType, setAreaType] = useState<AreaType>('DALAM_KOTA')
  const [rentalDays, setRentalDays] = useState<number>(1)
  
  // Tanggal dan Jam
  const [pickupDate, setPickupDate] = useState('')
  const [pickupTime, setPickupTime] = useState('')
  
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

  // Fetch dynamic cars configured by Admin in database
  useEffect(() => {
    const fetchCars = async () => {
      const { data } = await supabase.from('product_prices').select('*').eq('product_type', 'SEWA_MOBIL')
      if (data && data.length > 0) {
        const fetchedCars = data.map(item => {
          let name = item.description || 'Mobil'
          let seats = Number(item.seat_type) || 6
          let inCityPrice = Number(item.base_price)
          let outCityPrice = Number(item.base_price) * 1.5

          try {
            if (item.description && item.description.startsWith('{')) {
              const parsed = JSON.parse(item.description)
              name = parsed.name || name
              seats = parsed.seats || seats
              inCityPrice = parsed.inCityPrice || inCityPrice
              outCityPrice = parsed.outCityPrice || outCityPrice
            }
          } catch (e) {}

          return {
            id: item.id,
            name,
            seats,
            img: seats > 8 ? '🚐' : seats > 6 ? '🚙' : '🚗',
            inCityPrice,
            outCityPrice
          }
        })
        setDynamicCars(fetchedCars)
      }
    }
    fetchCars()
  }, [])

  const selectedCarObj = dynamicCars.find(c => c.id === selectedCarId)

  const getPricePerDay = () => {
    if (!selectedCarObj) return 0
    return areaType === 'DALAM_KOTA' ? selectedCarObj.inCityPrice : selectedCarObj.outCityPrice
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
    if (!selectedCarObj) return
    
    setLoading(true)
    setError('')
    try {
      const demoMode = localStorage.getItem('demo_mode')
      let userId: string | null = null

      if (!demoMode) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Anda belum login')
        userId = user.id
      } else {
        userId = 'demo-user-id'
      }

      const totalBase = getTotalBasePrice()
      const finalPrice = getFinalPrice(totalBase)
      const orderPayloadData = {
        user_id: userId,
        order_type: 'SEWA_MOBIL',
        pickup_address: pickup,
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        rental_duration_hours: rentalDays * 24,
        package_details: JSON.stringify({
          carUnit: selectedCarObj.name,
          areaType,
          rentalDays,
          pricePerDay: getPricePerDay(),
          pickupDate,
          pickupTime
        }),
        total_price: finalPrice,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'TRANSFER' ? 'PAID' : 'PENDING',
        status: 'PENDING',
        promo_id: promoData?.id || null
      }

      let orderCreated = false
      try {
        const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('checkout', {
          body: {
            paymentMethod,
            orderPayload: orderPayloadData
          }
        })
        if (!checkoutError && checkoutData && !checkoutData.error) {
          orderCreated = true
        }
      } catch (e) {
        console.warn('Edge function checkout fallback to direct DB insert', e)
      }

      if (!orderCreated) {
        const { error: directError } = await supabase
          .from('orders')
          .insert(orderPayloadData)

        if (directError) throw new Error(`Gagal membuat pesanan: ${directError.message}`)
      }

      // Notify admin dashboard via broadcast
      try {
        await supabase.channel('admin_orders_channel').send({
          type: 'broadcast',
          event: 'new_order',
          payload: { order_type: 'SEWA_MOBIL' }
        })
      } catch (_e) {}

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

        {/* STEP 1: PILIH MOBIL DARI ADMIN */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div>
              <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Pilih Unit Mobil (Input Admin)</h2>
              <div className="space-y-4">
                {dynamicCars.map(car => (
                  <div
                    key={car.id}
                    onClick={() => setSelectedCarId(car.id)}
                    className={`cursor-pointer rounded-2xl border-2 p-5 transition active:scale-[0.98] relative overflow-hidden ${selectedCarId === car.id ? 'border-purple-500 bg-white shadow-md' : 'border-gray-100 bg-white shadow-sm'}`}
                  >
                    {selectedCarId === car.id && (
                      <div className="absolute top-0 right-0 bg-purple-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                        DIPILIH
                      </div>
                    )}
                    <div className="flex items-center space-x-4">
                      <div className="text-4xl">{car.img}</div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800 text-lg">{car.name}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-full font-bold">❄️ Full AC</span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">Maks {car.seats} Penumpang</span>
                          <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-bold">Dalam Kota: Rp {car.inCityPrice.toLocaleString('id-ID')}</span>
                          <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">Luar Kota: Rp {car.outCityPrice.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              disabled={!selectedCarId}
              onClick={() => setStep(2)}
              className="mt-6 w-full rounded-full bg-purple-500 py-4 font-bold text-white shadow-lg shadow-purple-200 transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
            >
              Lanjut Pilih Area & Durasi
            </button>
          </div>
        )}

        {/* STEP 2: DURASI & AREA */}
        {step === 2 && selectedCarObj && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100">
              <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Pilih Layanan Area</h2>
              <div className="flex rounded-lg bg-gray-200 p-1 mb-4">
                <button
                  className={`flex-1 rounded-md py-2.5 text-sm font-bold transition ${areaType === 'DALAM_KOTA' ? 'bg-white text-purple-600 shadow' : 'text-gray-600'}`}
                  onClick={() => setAreaType('DALAM_KOTA')}
                >
                  Dalam Kota (Rp {selectedCarObj.inCityPrice.toLocaleString('id-ID')}/Hari)
                </button>
                <button
                  className={`flex-1 rounded-md py-2.5 text-sm font-bold transition ${areaType === 'LUAR_KOTA' ? 'bg-white text-purple-600 shadow' : 'text-gray-600'}`}
                  onClick={() => setAreaType('LUAR_KOTA')}
                >
                  Luar Kota (Rp {selectedCarObj.outCityPrice.toLocaleString('id-ID')}/Hari)
                </button>
              </div>

              <h2 className="mt-6 mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Durasi Sewa Harian</h2>
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

              <div className="mt-4 rounded-xl bg-purple-50 p-4 flex items-start space-x-3 border border-purple-100">
                <Clock size={20} className="text-purple-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-purple-800 uppercase tracking-wide">Catatan Sewa Mobil</p>
                  <p className="text-xs font-bold text-purple-900 flex items-center">
                    <span className="mr-1">❄️</span> Sewa Mobil Full AC + Sopir Berpengalaman
                  </p>
                  <p className="text-xs font-semibold text-purple-700">
                    ⏱️ 1 Hari dihitung dari jam 07:00 pagi sampai jam 22:00 malam.
                  </p>
                </div>
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

            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100 mt-4">
              <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Waktu Penjemputan</h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <Clock size={16} />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-500">Tanggal Pemakaian</label>
                    <div className="flex items-center space-x-2 border-b-2 border-gray-100 pb-2 mt-1 focus-within:border-purple-500 transition-colors">
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
                    <label className="text-xs font-semibold text-gray-500">Jam Pemakaian</label>
                    <div className="flex items-center space-x-2 border-b-2 border-gray-100 pb-2 mt-1 focus-within:border-purple-500 transition-colors">
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
              disabled={!pickup || !pickupDate || !pickupTime}
              onClick={() => setStep(4)}
              className="mt-6 w-full rounded-full bg-purple-500 py-4 font-bold text-white shadow-lg shadow-purple-200 transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
            >
              Lanjut ke Ringkasan
            </button>
          </div>
        )}

        {/* STEP 4: CHECKOUT */}
        {step === 4 && selectedCarObj && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100">
              <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Ringkasan Sewa Mobil</h2>
              
              <div className="space-y-4 rounded-xl bg-gray-50 p-4 mb-4 border border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Unit Mobil</p>
                    <h3 className="font-bold text-gray-800 text-lg">{selectedCarObj.name}</h3>
                  </div>
                  <div className="text-3xl">{selectedCarObj.img}</div>
                </div>
                <div className="border-t border-gray-200 my-2"></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Area & Durasi</p>
                    <p className="text-sm font-semibold text-gray-800">{areaType === 'DALAM_KOTA' ? 'Dalam Kota' : 'Luar Kota'}</p>
                    <p className="text-xs text-gray-500">{rentalDays} Hari (Rp {getPricePerDay().toLocaleString('id-ID')}/Hari)</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Waktu & Fasilitas</p>
                    <p className="text-sm font-semibold text-gray-800">{pickupDate} • {pickupTime} WIB</p>
                    <p className="text-xs font-bold text-purple-700 flex items-center mt-0.5">
                      <span>❄️ Sewa Full AC + Sopir</span>
                    </p>
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
