import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, CreditCard, Clock, CalendarDays } from 'lucide-react'
import { supabase } from '../lib/supabase'
import MapPickerModal from '../components/MapPickerModal'

type DurationType = 'DALAM_KOTA_12' | 'DALAM_KOTA_24' | 'LUAR_KOTA_24'
type CarUnit = 'AVANZA' | 'INNOVA' | 'HIACE'

const DURATIONS = [
  { id: 'DALAM_KOTA_12', title: 'Dalam Kota (12 Jam)', hours: 12 },
  { id: 'DALAM_KOTA_24', title: 'Dalam Kota (24 Jam)', hours: 24 },
  { id: 'LUAR_KOTA_24', title: 'Luar Kota (24 Jam)', hours: 24 },
] as const

const CARS = [
  { id: 'AVANZA', name: 'Avanza / Xenia', seats: 6, img: '🚗' },
  { id: 'INNOVA', name: 'Innova Reborn', seats: 7, img: '🚙' },
  { id: 'HIACE', name: 'Toyota Hiace', seats: 14, img: '🚐' },
] as const

// Base prices for 12 hours Dalam Kota
const BASE_PRICES: Record<CarUnit, number> = {
  AVANZA: 350000,
  INNOVA: 600000,
  HIACE: 1200000,
}

export default function Rental() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  
  const [durationType, setDurationType] = useState<DurationType>('DALAM_KOTA_12')
  const [selectedCar, setSelectedCar] = useState<CarUnit | null>(null)
  
  const [pickup, setPickup] = useState('')
  const [pickupLat, setPickupLat] = useState<number | null>(null)
  const [pickupLng, setPickupLng] = useState<number | null>(null)
  const [isMapOpen, setIsMapOpen] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const getPrice = (car: CarUnit, duration: DurationType) => {
    let price = BASE_PRICES[car]
    if (duration === 'DALAM_KOTA_24') {
      price = price * 1.5 // e.g. 350k -> 525k
    } else if (duration === 'LUAR_KOTA_24') {
      price = price * 1.8 // e.g. 350k -> 630k
    }
    return price
  }

  const handleCheckout = async () => {
    if (!selectedCar) return
    
    setLoading(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not logged in')

      const totalPrice = getPrice(selectedCar, durationType)
      const durationHours = DURATIONS.find(d => d.id === durationType)?.hours || 12

      // Insert Order
      const { data: order, error: orderError } = await supabase.from('orders').insert({
        user_id: user.id,
        order_type: 'SEWA_MOBIL',
        pickup_address: pickup,
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        rental_duration_hours: durationHours,
        package_details: JSON.stringify({ carUnit: selectedCar, durationType }),
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
            phone: user.phone || ''
          }
        }
      })

      if (midtransError || midtransData?.error) throw new Error('Payment error')

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
        <h1 className="text-lg font-bold text-gray-800">Sewa Mobil</h1>
      </div>

      <div className="p-4">
        {error && <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm font-semibold text-red-600">{error}</div>}

        {/* Step Indicator */}
        <div className="mb-8 flex items-center justify-center space-x-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`h-2 w-12 rounded-full transition-colors duration-300 ${step >= i ? 'bg-purple-500' : 'bg-gray-200'}`} />
          ))}
        </div>

        {/* STEP 1: DURASI & AREA */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div>
              <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Pilih Area & Durasi</h2>
              <div className="space-y-3">
                {DURATIONS.map(d => (
                  <div
                    key={d.id}
                    onClick={() => setDurationType(d.id)}
                    className={`cursor-pointer rounded-xl border-2 p-4 flex items-center space-x-4 transition active:scale-[0.98] ${durationType === d.id ? 'border-purple-500 bg-purple-50' : 'border-gray-100 bg-white shadow-sm'}`}
                  >
                    <div className={`p-3 rounded-full ${durationType === d.id ? 'bg-purple-500 text-white' : 'bg-purple-100 text-purple-500'}`}>
                      {d.id.includes('12') ? <Clock size={24} /> : <CalendarDays size={24} />}
                    </div>
                    <div>
                      <h3 className={`font-bold ${durationType === d.id ? 'text-purple-700' : 'text-gray-800'}`}>{d.title}</h3>
                      <p className="text-sm text-gray-500">{d.hours} Jam Pemakaian</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="mt-6 w-full rounded-full bg-purple-500 py-4 font-bold text-white shadow-lg shadow-purple-200 transition active:scale-[0.98]"
            >
              Lanjut Pilih Mobil
            </button>
          </div>
        )}

        {/* STEP 2: PILIH MOBIL */}
        {step === 2 && (
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
                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                      <span className="text-sm text-gray-500 font-medium">Tarif Sewa</span>
                      <span className="text-lg font-bold text-purple-600">Rp {getPrice(car.id, durationType).toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              disabled={!selectedCar}
              onClick={() => setStep(3)}
              className="mt-6 w-full rounded-full bg-purple-500 py-4 font-bold text-white shadow-lg shadow-purple-200 transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
            >
              Lanjut Tentukan Lokasi Jemput
            </button>
          </div>
        )}

        {/* STEP 3: LOKASI JEMPUT */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100">
              <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Lokasi Penjemputan</h2>
              <div className="flex items-start space-x-3">
                <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600">
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
                      Pilih di Peta
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
                    <p className="text-sm font-semibold text-gray-800">{DURATIONS.find(d => d.id === durationType)?.title}</p>
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
                <div className="flex justify-between items-center text-lg font-bold text-gray-900 mt-2">
                  <span>Total Harga Sewa</span>
                  <span className="text-purple-600">Rp {getPrice(selectedCar, durationType).toLocaleString('id-ID')}</span>
                </div>
                <p className="text-[10px] text-gray-400 text-right">*Belum termasuk BBM, tol, dan parkir</p>
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
