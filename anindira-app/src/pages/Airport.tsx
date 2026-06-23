import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, CreditCard, Plane } from 'lucide-react'
import { supabase } from '../lib/supabase'
import MapPickerModal from '../components/MapPickerModal'

export default function Airport() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState<'KE_BANDARA' | 'DARI_BANDARA'>('KE_BANDARA')
  
  const [pickup, setPickup] = useState('')
  const [dropoff, setDropoff] = useState('')
  const [pickupLat, setPickupLat] = useState<number | null>(null)
  const [pickupLng, setPickupLng] = useState<number | null>(null)
  const [dropoffLat, setDropoffLat] = useState<number | null>(null)
  const [dropoffLng, setDropoffLng] = useState<number | null>(null)

  const [isMapOpen, setIsMapOpen] = useState(false)
  const [mapTarget, setMapTarget] = useState<'PICKUP' | 'DROPOFF'>('PICKUP')
  
  const [carType, setCarType] = useState('4_SEATS')
  const [selectedSeats, setSelectedSeats] = useState<number[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Fixed price for airport transfer
  const basePrice = 150000
  const airportLat = 0.6360
  const airportLng = 122.8500

  // Set default values based on direction
  useEffect(() => {
    if (direction === 'KE_BANDARA') {
      setDropoff('Bandara Djalaluddin, Gorontalo')
      setDropoffLat(airportLat)
      setDropoffLng(airportLng)
      setPickup('') // Reset pickup
      setPickupLat(null)
      setPickupLng(null)
    } else {
      setPickup('Bandara Djalaluddin, Gorontalo')
      setPickupLat(airportLat)
      setPickupLng(airportLng)
      setDropoff('') // Reset dropoff
      setDropoffLat(null)
      setDropoffLng(null)
    }
  }, [direction])

  const toggleSeat = (seatNum: number) => {
    if (selectedSeats.includes(seatNum)) {
      setSelectedSeats(selectedSeats.filter(s => s !== seatNum))
    } else {
      setSelectedSeats([...selectedSeats, seatNum])
    }
  }

  const handleCheckout = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not logged in')

      const totalPrice = basePrice * selectedSeats.length

      // Insert Order
      const { data: order, error: orderError } = await supabase.from('orders').insert({
        user_id: user.id,
        order_type: 'AIRPORT',
        pickup_address: pickup,
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        dropoff_address: dropoff,
        dropoff_lat: dropoffLat,
        dropoff_lng: dropoffLng,
        seat_selected: JSON.stringify(selectedSeats),
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

  const renderSeatMap = () => {
    const renderSeat = (seatNum: number | 'SOPIR' | 'EMPTY') => {
      if (seatNum === 'EMPTY') return <div className="flex h-16 w-16" />
      if (seatNum === 'SOPIR') return <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-200 text-xs font-bold text-gray-500 shadow-sm">Sopir</div>
      
      return (
        <button
          key={seatNum}
          onClick={() => toggleSeat(seatNum)}
          className={`flex h-16 w-16 items-center justify-center rounded-2xl font-bold transition active:scale-95 ${selectedSeats.includes(seatNum as number) ? 'bg-primary text-white shadow-md shadow-blue-200' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
        >
          {seatNum}
        </button>
      )
    }

    const renderRow = (seats: (number | 'SOPIR' | 'EMPTY')[]) => (
      <div className="flex justify-between mb-4 last:mb-0">
        {seats.map((s, i) => <div key={i}>{renderSeat(s)}</div>)}
      </div>
    )

    return (
      <div className="mx-auto w-72 rounded-[2rem] border-4 border-gray-200 bg-white p-6 shadow-inner relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-2 bg-gray-200 rounded-b-lg"></div>
        {carType === '4_SEATS' && (
          <>
            {renderRow([1, 'EMPTY', 'SOPIR'])}
            {renderRow([2, 'EMPTY', 3])}
          </>
        )}
        {carType === '5_SEATS' && (
          <>
            {renderRow([1, 'EMPTY', 'SOPIR'])}
            {renderRow([2, 3, 4])}
          </>
        )}
        {carType === '6_SEATS' && (
          <>
            {renderRow([1, 'EMPTY', 'SOPIR'])}
            {renderRow([2, 3, 4])}
            {renderRow([5, 'EMPTY', 6])}
          </>
        )}
        {carType === '7_SEATS' && (
          <>
            {renderRow([1, 'EMPTY', 'SOPIR'])}
            {renderRow([2, 3, 4])}
            {renderRow([5, 6, 7])}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center bg-white px-4 py-4 shadow-sm">
        <button onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)} className="mr-4 text-gray-600">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Antar Jemput Bandara</h1>
      </div>

      <div className="p-4">
        {error && <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-600">{error}</div>}

        {/* Step Indicator */}
        <div className="mb-8 flex items-center justify-center space-x-2">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-2 w-16 rounded-full ${step >= i ? 'bg-primary' : 'bg-gray-200'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div>
              <label className="mb-3 block text-sm font-bold text-gray-700">Pilih Arah Perjalanan</label>
              <div className="space-y-3">
                <div
                  onClick={() => setDirection('KE_BANDARA')}
                  className={`cursor-pointer rounded-xl border-2 p-4 flex items-center space-x-4 transition ${direction === 'KE_BANDARA' ? 'border-primary bg-blue-50' : 'border-transparent bg-white shadow-sm'}`}
                >
                  <div className={`p-3 rounded-full ${direction === 'KE_BANDARA' ? 'bg-primary text-white' : 'bg-blue-100 text-primary'}`}>
                    <Plane size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Ke Bandara</h3>
                    <p className="text-sm text-gray-500">Jemput di lokasi, antar ke bandara</p>
                  </div>
                </div>

                <div
                  onClick={() => setDirection('DARI_BANDARA')}
                  className={`cursor-pointer rounded-xl border-2 p-4 flex items-center space-x-4 transition ${direction === 'DARI_BANDARA' ? 'border-primary bg-blue-50' : 'border-transparent bg-white shadow-sm'}`}
                >
                  <div className={`p-3 rounded-full ${direction === 'DARI_BANDARA' ? 'bg-primary text-white' : 'bg-blue-100 text-primary'}`}>
                    <Plane size={24} className="rotate-180" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Dari Bandara</h3>
                    <p className="text-sm text-gray-500">Jemput di bandara, antar ke lokasi</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="mt-6 w-full rounded-xl bg-primary py-4 font-bold text-white shadow-lg"
            >
              Lanjut Pilih Lokasi
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="relative space-y-4">
                <div className="absolute left-[11px] top-6 h-12 w-0.5 bg-gray-200"></div>
                
                <div className="flex items-start space-x-3">
                  <div className="mt-1 rounded-full bg-blue-100 p-1 text-blue-600">
                    <MapPin size={16} />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-500">Lokasi Penjemputan</label>
                    <div className="flex items-center space-x-2 border-b border-gray-200 pb-2 mt-1">
                      <input
                        type="text"
                        value={pickup}
                        onChange={e => setPickup(e.target.value)}
                        disabled={direction === 'DARI_BANDARA'}
                        placeholder="Cari lokasi jemput..."
                        className="w-full focus:outline-none disabled:bg-transparent disabled:text-gray-500 font-medium"
                      />
                      {direction !== 'DARI_BANDARA' && (
                        <button onClick={() => { setMapTarget('PICKUP'); setIsMapOpen(true); }} className="text-xs font-bold text-primary whitespace-nowrap bg-blue-50 px-2 py-1 rounded-md">
                          Pilih di Peta
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="mt-1 rounded-full bg-orange-100 p-1 text-orange-600">
                    <MapPin size={16} />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-500">Lokasi Pengantaran</label>
                    <div className="flex items-center space-x-2 border-b border-gray-200 pb-2 mt-1">
                      <input
                        type="text"
                        value={dropoff}
                        onChange={e => setDropoff(e.target.value)}
                        disabled={direction === 'KE_BANDARA'}
                        placeholder="Cari lokasi antar..."
                        className="w-full focus:outline-none disabled:bg-transparent disabled:text-gray-500 font-medium"
                      />
                      {direction !== 'KE_BANDARA' && (
                        <button onClick={() => { setMapTarget('DROPOFF'); setIsMapOpen(true); }} className="text-xs font-bold text-primary whitespace-nowrap bg-blue-50 px-2 py-1 rounded-md">
                          Pilih di Peta
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              disabled={!pickup || !dropoff}
              onClick={() => setStep(3)}
              className="mt-6 w-full rounded-xl bg-primary py-4 font-bold text-white shadow-lg disabled:opacity-50"
            >
              Lanjut Pilih Kursi
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div>
              <label className="mb-3 block text-sm font-bold text-gray-700">Pilih Layout Mobil</label>
              <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
                {['4_SEATS', '5_SEATS', '6_SEATS', '7_SEATS'].map(type => (
                  <button
                    key={type}
                    onClick={() => { setCarType(type); setSelectedSeats([]) }}
                    className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-bold transition active:scale-95 ${carType === type ? 'bg-primary text-white shadow-md' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                  >
                    Mobil {type.split('_')[0]} Seat
                  </button>
                ))}
              </div>
            </div>

            {renderSeatMap()}

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-center justify-between font-bold text-gray-800">
                <span>Total Harga ({selectedSeats.length} Kursi)</span>
                <span>Rp {(basePrice * selectedSeats.length).toLocaleString('id-ID')}</span>
              </div>
              <p className="mt-1 text-xs text-blue-600 font-medium">*Tarif tetap untuk area bandara</p>
            </div>

            <button
              disabled={selectedSeats.length === 0 || loading}
              onClick={handleCheckout}
              className="mt-6 flex w-full items-center justify-center space-x-2 rounded-xl bg-primary py-4 font-bold text-white shadow-lg disabled:opacity-50"
            >
              <CreditCard size={20} />
              <span>{loading ? 'Memproses...' : 'Bayar Sekarang'}</span>
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
