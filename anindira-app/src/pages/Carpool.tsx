import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, CreditCard } from 'lucide-react'
import { supabase } from '../lib/supabase'
import MapPickerModal from '../components/MapPickerModal'

export default function Carpool() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [routeType, setRouteType] = useState<'DALAM_KOTA' | 'LUAR_KOTA'>('DALAM_KOTA')
  const [routes, setRoutes] = useState<any[]>([])
  const [selectedRoute, setSelectedRoute] = useState<any>(null)
  
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

  useEffect(() => {
    const fetchRoutes = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('product_prices')
        .select('base_price, routes(id, name, route_type)')
        .eq('product_type', 'CARPOOL')
      
      if (data) {
        const formattedRoutes = data
          .filter(item => item.routes) // Pastikan rutenya tidak null
          .map((item: any) => ({
            id: item.routes.id,
            name: item.routes.name,
            route_type: item.routes.route_type,
            base_price: Number(item.base_price)
          }))
        setRoutes(formattedRoutes)
      } else if (error) {
        console.error('Error fetching routes:', error)
      }
      setLoading(false)
    }

    fetchRoutes()
  }, [])

  const filteredRoutes = routes.filter(r => r.route_type === routeType)

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

      const totalPrice = selectedRoute.base_price * selectedSeats.length

      // Insert Order
      const { data: order, error: orderError } = await supabase.from('orders').insert({
        user_id: user.id,
        order_type: 'CARPOOL',
        route_id: selectedRoute.id,
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
    // Mobil 4 Seat: 1 Driver, 3 Passenger
    // Mobil 5 Seat: 1 Driver, 4 Passenger
    // Mobil 7 Seat: 1 Driver, 6 Passenger

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
        <h1 className="text-lg font-bold text-gray-800">Pesan Carpool</h1>
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
              <label className="mb-3 block text-sm font-bold text-gray-700">Jenis Rute</label>
              <div className="flex rounded-lg bg-gray-200 p-1">
                <button
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition ${routeType === 'DALAM_KOTA' ? 'bg-white text-primary shadow' : 'text-gray-600'}`}
                  onClick={() => { setRouteType('DALAM_KOTA'); setSelectedRoute(null) }}
                >
                  Dalam Daerah
                </button>
                <button
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition ${routeType === 'LUAR_KOTA' ? 'bg-white text-primary shadow' : 'text-gray-600'}`}
                  onClick={() => { setRouteType('LUAR_KOTA'); setSelectedRoute(null) }}
                >
                  Luar Daerah
                </button>
              </div>
            </div>

            <div>
              <label className="mb-3 block text-sm font-bold text-gray-700">Pilih Rute</label>
              <div className="space-y-3">
                {filteredRoutes.map(route => (
                  <div
                    key={route.id}
                    onClick={() => setSelectedRoute(route)}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition ${selectedRoute?.id === route.id ? 'border-primary bg-blue-50' : 'border-transparent bg-white shadow-sm'}`}
                  >
                    <h3 className="font-semibold text-gray-800">{route.name}</h3>
                    <p className="text-sm text-gray-500">Mulai dari Rp {route.base_price.toLocaleString('id-ID')}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              disabled={!selectedRoute}
              onClick={() => setStep(2)}
              className="mt-6 w-full rounded-xl bg-primary py-4 font-bold text-white shadow-lg disabled:opacity-50"
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
                        placeholder="Cari lokasi jemput..."
                        className="w-full focus:outline-none focus:border-primary"
                      />
                      <button onClick={() => { setMapTarget('PICKUP'); setIsMapOpen(true); }} className="text-xs font-bold text-primary whitespace-nowrap bg-blue-50 px-2 py-1 rounded-md">
                        Pilih di Peta
                      </button>
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
                        placeholder="Cari lokasi antar..."
                        className="w-full focus:outline-none focus:border-primary"
                      />
                      <button onClick={() => { setMapTarget('DROPOFF'); setIsMapOpen(true); }} className="text-xs font-bold text-primary whitespace-nowrap bg-blue-50 px-2 py-1 rounded-md">
                        Pilih di Peta
                      </button>
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
                <span>Rp {(selectedRoute.base_price * selectedSeats.length).toLocaleString('id-ID')}</span>
              </div>
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
