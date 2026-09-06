// @ts-nocheck
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Calendar, Clock, CreditCard, Wallet, Banknote } from 'lucide-react'
import { supabase } from '../lib/supabase'
import MapPickerModal from '../components/MapPickerModal'
import { getRealDrivingDistance, geocodeAddress as geocodeAddressUtil } from '../lib/distance'

export default function Carpool() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  
  // Route selection
  const [routeType, setRouteType] = useState<'DALAM_KOTA' | 'LUAR_KOTA'>('DALAM_KOTA')
  const [routes, setRoutes] = useState<any[]>([])
  const [selectedRoute, setSelectedRoute] = useState<any>(null)
  
  // Seat selection
  const [carType, setCarType] = useState<string>('6_SEATS')
  const [selectedSeats, setSelectedSeats] = useState<number[]>([])
  const [occupiedSeats, setOccupiedSeats] = useState<number[]>([])
  
  // Location & Time
  const [pickup, setPickup] = useState('')
  const [dropoff, setDropoff] = useState('')
  const [pickupLat, setPickupLat] = useState<number | null>(null)
  const [pickupLng, setPickupLng] = useState<number | null>(null)
  const [dropoffLat, setDropoffLat] = useState<number | null>(null)
  const [dropoffLng, setDropoffLng] = useState<number | null>(null)
  const [departureDate, setDepartureDate] = useState('')
  const [departureTime, setDepartureTime] = useState('')
  
  const [isMapOpen, setIsMapOpen] = useState(false)
  const [mapTarget, setMapTarget] = useState<'PICKUP' | 'DROPOFF'>('PICKUP')

  // Available Departure Times & Extra Prices from Admin
  const [filteredDepartureTimes, setFilteredDepartureTimes] = useState<any[]>([])
  const [filteredSchedules, setFilteredSchedules] = useState<any[]>([])
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null)
  const [availableExtraPrices, setAvailableExtraPrices] = useState<any[]>([])
  const [selectedExtraPrice, setSelectedExtraPrice] = useState<any>(null)

  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'ANINDIRAPAY'>('CASH')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isGeocoding, setIsGeocoding] = useState(false)

  // Promo State
  const [promoCode, setPromoCode] = useState('')
  const [promoData, setPromoData] = useState<any>(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError, setPromoError] = useState('')
  const [promoSuccess, setPromoSuccess] = useState('')

  const [distanceKm, setDistanceKm] = useState<number>(0)

  useEffect(() => {
    const fetchOccupiedSeats = async () => {
      if (!selectedRoute || !departureDate || !departureTime || step !== 3) return
      
      const { data } = await supabase
        .from('orders')
        .select('package_details')
        .eq('order_type', 'CARPOOL')
        .eq('route_id', selectedRoute.id)
        .neq('status', 'CANCELLED')
        
      if (data) {
        let occupied: number[] = []
        data.forEach(order => {
          try {
            const details = JSON.parse(order.package_details)
            if (details.departureDate === departureDate && details.departureTime === departureTime) {
               if (details.selectedSeats && Array.isArray(details.selectedSeats)) {
                 occupied = [...occupied, ...details.selectedSeats]
               }
            }
          } catch(e) {}
        })
        setOccupiedSeats(occupied)
      }
    }
    fetchOccupiedSeats()
  }, [selectedRoute, departureDate, departureTime, step])


  // Calculate real road driving distance when coordinates change
  useEffect(() => {
    const calcDistance = async () => {
      if (pickupLat && pickupLng && dropoffLat && dropoffLng) {
        setIsGeocoding(true)
        const dist = await getRealDrivingDistance(pickupLat, pickupLng, dropoffLat, dropoffLng)
        setDistanceKm(dist)
        setIsGeocoding(false)
      } else {
        setDistanceKm(0)
      }
    }
    calcDistance()
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng])

  const handleGeocodeBlur = async (addressText: string, type: 'PICKUP' | 'DROPOFF') => {
    if (!addressText.trim()) return
    setIsGeocoding(true)
    const coords = await geocodeAddressUtil(addressText)
    if (coords) {
      if (type === 'PICKUP') {
        setPickupLat(coords.lat)
        setPickupLng(coords.lng)
      } else {
        setDropoffLat(coords.lat)
        setDropoffLng(coords.lng)
      }
    }
    setIsGeocoding(false)
  }

  useEffect(() => {
    const fetchRoutes = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('product_prices')
        .select('base_price, seat_type, routes(id, name, route_type)')
        .eq('product_type', 'CARPOOL')
      
      if (data) {
        const formattedRoutes = data
          .filter(item => item.routes)
          .map((item: any) => ({
            id: item.routes.id,
            name: item.routes.name,
            route_type: item.routes.route_type,
            base_price: Number(item.base_price),
            seat_type: item.seat_type
          }))
          
        const uniqueRoutes = new Map()
        formattedRoutes.forEach(r => {
          if (!uniqueRoutes.has(r.id)) {
            uniqueRoutes.set(r.id, {
              id: r.id,
              name: r.name,
              route_type: r.route_type || 'DALAM_KOTA',
              prices: {}
            })
          }
          uniqueRoutes.get(r.id).prices[r.seat_type] = r.base_price
        })

        setRoutes(Array.from(uniqueRoutes.values()))
      }
      setLoading(false)
    }

    const fetchExtraPrices = async () => {
      const { data } = await supabase.from('extra_prices').select('*')
      if (data) setAvailableExtraPrices(data)
    }

    fetchRoutes()
    fetchExtraPrices()
  }, [])

  useEffect(() => {
    const fetchSchedules = async () => {
      if (!selectedRoute || !departureDate) return;
      const { data } = await supabase
        .from('carpool_schedules')
        .select('*')
        .eq('route_id', selectedRoute.id)
        .eq('departure_date', departureDate)
        .eq('is_active', true)
        .order('departure_time', { ascending: true })

      if (data) {
        setFilteredSchedules(data)
      } else {
        setFilteredSchedules([])
      }
    }
    fetchSchedules()
  }, [selectedRoute, departureDate])

  const calculateTotalBase = () => {
    if (!selectedSchedule) return 0
    let total = 0
    selectedSeats.forEach(seatNum => {
      const price = selectedSchedule.seat_prices[String(seatNum)] || 0
      total += price
    })
    return total
  }

  const extraFee = selectedExtraPrice ? Number(selectedExtraPrice.price) : 0
  const totalBasePrice = calculateTotalBase() + extraFee

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
      
      if (totalBasePrice < data.min_order_amount) {
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

  const handleNextStep2 = async () => {
    setError('')
    setIsGeocoding(true)

    let pLat = pickupLat
    let pLng = pickupLng
    let dLat = dropoffLat
    let dLng = dropoffLng

    if (!pLat || !pLng) {
      const coords = await geocodeAddressUtil(pickup)
      if (coords) {
        pLat = coords.lat
        pLng = coords.lng
        setPickupLat(coords.lat)
        setPickupLng(coords.lng)
      }
    }

    if (!dLat || !dLng) {
      const coords = await geocodeAddressUtil(dropoff)
      if (coords) {
        dLat = coords.lat
        dLng = coords.lng
        setDropoffLat(coords.lat)
        setDropoffLng(coords.lng)
      }
    }

    if (pLat && pLng && dLat && dLng) {
      const dist = await getRealDrivingDistance(pLat, pLng, dLat, dLng)
      setDistanceKm(dist)
    }

    setIsGeocoding(false)
    setStep(3)
  }

  const handleCheckout = async () => {
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

      const totalPrice = getFinalPrice(totalBasePrice)
      const orderPayloadData = {
        user_id: userId,
        order_type: 'CARPOOL',
        route_id: selectedRoute.id,
        pickup_address: pickup,
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        dropoff_address: dropoff,
        dropoff_lat: dropoffLat,
        dropoff_lng: dropoffLng,
        package_details: JSON.stringify({
          carType,
          selectedSeats,
          departureDate,
          departureTime,
          extraPriceId: selectedExtraPrice?.id || null,
          extraPriceName: selectedExtraPrice?.description || null,
          distanceKm
        }),
        total_price: totalPrice,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'ANINDIRAPAY' ? 'PAID' : 'UNPAID',
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
          payload: { order_type: 'CARPOOL' }
        })
      } catch (_e) {}

      navigate('/orders')

    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  const toggleSeat = (seatNum: number) => {
    if (selectedSeats.includes(seatNum)) {
      setSelectedSeats(selectedSeats.filter(s => s !== seatNum))
    } else {
      setSelectedSeats([...selectedSeats, seatNum])
    }
  }

  const renderSeatMap = () => {
    // Row 2 (Middle) seat numbers and grid cols
    const currentCarType = selectedSchedule?.car_type || '6_SEATS'
    let row2Seats: number[] = [2, 3, 4]
    let row2Cols = 'grid-cols-3'
    
    if (currentCarType === '3_SEATS' || currentCarType === '5_SEATS') {
      row2Seats = [2, 3]
      row2Cols = 'grid-cols-2'
    }

    // Row 3 (Back) seat numbers and grid cols
    let row3Seats: number[] = []
    let row3Cols = 'grid-cols-2'

    if (currentCarType === '5_SEATS') {
      row3Seats = [4, 5]
      row3Cols = 'grid-cols-2'
    } else if (currentCarType === '6_SEATS') {
      row3Seats = [5, 6]
      row3Cols = 'grid-cols-2'
    } else if (currentCarType === '7_SEATS') {
      row3Seats = [5, 6, 7]
      row3Cols = 'grid-cols-3'
    }

    return (
      <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between border-b pb-4">
          <div className="flex items-center space-x-2 text-xs font-bold text-gray-500">
            <span className="h-4 w-4 rounded border-2 border-gray-300 bg-white inline-block"></span>
            <span>Tersedia</span>
          </div>
          <div className="flex items-center space-x-2 text-xs font-bold text-primary">
            <span className="h-4 w-4 rounded bg-primary inline-block"></span>
            <span>Dipilih</span>
          </div>
        </div>

        <div className="mx-auto max-w-[260px] space-y-4">
          {/* Baris 1: Depan */}
          <div className="border-b-2 border-dashed border-gray-200 pb-3">
            <div className="flex justify-between items-center text-[11px] font-bold text-gray-500 mb-1.5 px-1">
              <span>Baris Depan</span>
              {selectedSchedule?.seat_prices?.['1'] && (
                <span className="text-primary font-bold">Rp {Number(selectedSchedule.seat_prices['1']).toLocaleString('id-ID')}</span>
              )}
            </div>
            <div className="flex justify-between">
              <button
                disabled={occupiedSeats.includes(1)}
                onClick={() => toggleSeat(1)}
                className={`flex h-12 w-12 items-center justify-center rounded-xl font-bold transition ${occupiedSeats.includes(1) ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50' : selectedSeats.includes(1) ? 'bg-primary text-white shadow-lg' : 'border-2 border-gray-200 text-gray-700 hover:border-primary'}`}
              >
                1
              </button>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 font-bold text-gray-400">
                Sopir
              </div>
            </div>
          </div>

          {/* Baris 2: Tengah */}
          <div className="border-b-2 border-dashed border-gray-200 pb-3">
            <div className="flex justify-between items-center text-[11px] font-bold text-gray-500 mb-1.5 px-1">
              <span>Baris Tengah</span>
              {selectedSchedule?.seat_prices?.['2'] && (
                <span className="text-primary font-bold">Rp {Number(selectedSchedule.seat_prices['2']).toLocaleString('id-ID')}</span>
              )}
            </div>
            <div className={`grid ${row2Cols} gap-3`}>
              {row2Seats.map(seatNum => (
                <button
                  key={seatNum}
                  disabled={occupiedSeats.includes(seatNum)}
                  onClick={() => toggleSeat(seatNum)}
                  className={`flex h-12 items-center justify-center rounded-xl font-bold transition ${occupiedSeats.includes(seatNum) ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50' : selectedSeats.includes(seatNum) ? 'bg-primary text-white shadow-lg' : 'border-2 border-gray-200 text-gray-700 hover:border-primary'}`}
                >
                  {seatNum}
                </button>
              ))}
            </div>
          </div>

          {/* Baris 3: Belakang (jika ada) */}
          {row3Seats.length > 0 && (
            <div>
              <div className="flex justify-between items-center text-[11px] font-bold text-gray-500 mb-1.5 px-1">
                <span>Baris Belakang</span>
                {(selectedSchedule?.seat_prices?.[String(row3Seats[0])] || selectedSchedule?.seat_prices?.['5']) && (
                  <span className="text-primary font-bold">
                    Rp {Number(selectedSchedule.seat_prices[String(row3Seats[0])] || selectedSchedule.seat_prices['5']).toLocaleString('id-ID')}
                  </span>
                )}
              </div>
              <div className={`grid ${row3Cols} gap-3`}>
                {row3Seats.map(seatNum => (
                  <button
                    key={seatNum}
                    disabled={occupiedSeats.includes(seatNum)}
                    onClick={() => toggleSeat(seatNum)}
                    className={`flex h-12 items-center justify-center rounded-xl font-bold transition ${occupiedSeats.includes(seatNum) ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50' : selectedSeats.includes(seatNum) ? 'bg-primary text-white shadow-lg' : 'border-2 border-gray-200 text-gray-700 hover:border-primary'}`}
                  >
                    {seatNum}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const filteredRoutes = routes.filter(r => r.route_type === routeType)

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-50 flex items-center bg-white px-4 py-4 shadow-sm">
        <button onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)} className="mr-4 text-gray-600 transition active:scale-90">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Travel Carpool</h1>
      </div>

      <div className="p-4">
        {error && <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm font-semibold text-red-600">{error}</div>}

        <div className="mb-8 flex items-center justify-center space-x-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`h-2 w-12 rounded-full transition-colors duration-300 ${step >= i ? 'bg-primary' : 'bg-gray-200'}`} />
          ))}
        </div>

        {/* STEP 1: PILIH RUTE */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div>
              <label className="mb-3 block text-sm font-bold text-gray-700">Kategori Rute</label>
              <div className="flex rounded-lg bg-gray-200 p-1">
                <button
                  className={`flex-1 rounded-md py-2 text-sm font-bold transition ${routeType === 'DALAM_KOTA' ? 'bg-white text-primary shadow' : 'text-gray-600'}`}
                  onClick={() => { setRouteType('DALAM_KOTA'); setSelectedRoute(null); }}
                >
                  Dalam Daerah
                </button>
                <button
                  className={`flex-1 rounded-md py-2 text-sm font-bold transition ${routeType === 'LUAR_KOTA' ? 'bg-white text-primary shadow' : 'text-gray-600'}`}
                  onClick={() => { setRouteType('LUAR_KOTA'); setSelectedRoute(null); }}
                >
                  Luar Daerah
                </button>
              </div>
            </div>

            <div>
              <label className="mb-3 block text-sm font-bold text-gray-700">Pilih Rute Perjalanan</label>
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-6 text-gray-500 font-medium">Memuat Rute...</div>
                ) : filteredRoutes.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">Tidak ada rute tersedia untuk kategori ini</div>
                ) : (
                  filteredRoutes.map(route => (
                    <div
                      key={route.id}
                      onClick={() => setSelectedRoute(route)}
                      className={`cursor-pointer rounded-2xl border-2 p-4 transition ${selectedRoute?.id === route.id ? 'border-primary bg-blue-50/50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-800">{route.name}</span>
                        <span className="text-sm font-bold text-primary">
                          {(() => {
                            const pVals = Object.values(route.prices || {}).map(Number).filter(v => v > 0)
                            const minP = pVals.length > 0 ? Math.min(...pVals) : (route.prices['1'] || 0)
                            return `Mulai Rp ${minP.toLocaleString('id-ID')}`
                          })()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button
              disabled={!selectedRoute}
              onClick={() => setStep(2)}
              className="mt-6 w-full rounded-xl bg-primary py-4 font-bold text-white shadow-lg disabled:opacity-50"
            >
              Lanjut Pilih Lokasi & Waktu
            </button>
          </div>
        )}

        {/* STEP 3: KURSI & HARGA */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">


            {renderSeatMap()}

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-center justify-between font-bold text-gray-800">
                <span>Harga Sementara ({selectedSeats.length} Kursi)</span>
                <div className="text-right">
                  <span className="text-primary">Rp {calculateTotalBase().toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            <button
              disabled={selectedSeats.length === 0}
              onClick={() => setStep(4)}
              className="mt-6 w-full rounded-xl bg-primary py-4 font-bold text-white shadow-lg disabled:opacity-50"
            >
              Lanjut ke Pembayaran
            </button>
          </div>
        )}

        {/* STEP 2: LOKASI JEMPUT & WAKTU */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
              <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Lokasi Penjemputan & Pengantaran</h2>
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
                        onBlur={() => handleGeocodeBlur(pickup, 'PICKUP')}
                        placeholder="Contoh: Jl. Merdeka No. 1"
                        className="w-full focus:outline-none focus:border-primary font-medium text-gray-800"
                      />
                      <button onClick={() => { setMapTarget('PICKUP'); setIsMapOpen(true); }} className="text-xs font-bold text-primary whitespace-nowrap bg-blue-50 px-2 py-1 rounded-md">
                        Peta
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
                        onBlur={() => handleGeocodeBlur(dropoff, 'DROPOFF')}
                        placeholder="Contoh: Bandara / Stasiun"
                        className="w-full focus:outline-none focus:border-primary font-medium text-gray-800"
                      />
                      <button onClick={() => { setMapTarget('DROPOFF'); setIsMapOpen(true); }} className="text-xs font-bold text-primary whitespace-nowrap bg-blue-50 px-2 py-1 rounded-md">
                        Peta
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs font-bold text-blue-600 bg-blue-50 p-2 rounded-lg text-right">
                {isGeocoding ? 'Menghitung rute jalan real...' : `Jarak Rute Jalan Real: ${distanceKm > 0 ? `${distanceKm.toFixed(1)} km` : '-'}`}
              </div>
            </div>

            <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
              <div className="flex items-start space-x-3 mb-4">
                <div className="mt-1 rounded-full bg-blue-100 p-1 text-blue-600">
                  <Calendar size={16} />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500 block mb-2">Pilih Tanggal Berangkat</label>
                  <input
                    type="date"
                    value={departureDate}
                    onChange={e => setDepartureDate(e.target.value)}
                    className="w-full font-bold text-gray-800 border-b border-gray-200 pb-2 focus:outline-none focus:border-primary bg-transparent"
                  />
                </div>
              </div>

              <div className="flex items-start space-x-3 mb-4">
                <div className="mt-1 rounded-full bg-green-100 p-1 text-green-600">
                  <Clock size={16} />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500 block mb-2">
                    Pilih Jadwal Keberangkatan
                  </label>
                  {!departureDate ? (
                    <div className="text-xs text-orange-600 font-bold bg-orange-50 p-2 rounded-lg">Pilih tanggal terlebih dahulu</div>
                  ) : filteredSchedules.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {filteredSchedules.map(sched => (
                        <button 
                          key={sched.id}
                          onClick={() => setSelectedSchedule(sched)}
                          className={`text-left p-3 rounded-lg border-2 transition ${selectedSchedule?.id === sched.id ? 'border-primary bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-gray-800">{sched.departure_time} WIB</span>
                            {(() => {
                              const sPrices = Object.values(sched.seat_prices || {}).map(Number).filter(v => v > 0)
                              const minP = sPrices.length > 0 ? Math.min(...sPrices) : (sched.seat_prices?.['1'] || 0)
                              return (
                                <span className="text-xs font-bold text-primary">Mulai Rp {minP.toLocaleString('id-ID')}</span>
                              )
                            })()}
                          </div>
                          <div className="text-xs text-gray-500 font-medium">
                            Mobil {sched.car_type.split('_')[0]} Kursi
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200 text-center">
                      Tidak ada jadwal armada tersedia pada tanggal ini.
                    </div>
                  )}
                </div>
              </div>

              {availableExtraPrices.length > 0 && (
                <div className="flex items-start space-x-3 border-t border-gray-100 pt-4">
                  <div className="mt-1 rounded-full bg-orange-100 p-1 text-orange-600">
                    <MapPin size={16} />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-500 block mb-2">Biaya Tambahan Jarak Radius / Jarak Jauh (Opsional)</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none font-bold"
                      onChange={(e) => {
                        const val = e.target.value
                        if (!val) setSelectedExtraPrice(null)
                        else setSelectedExtraPrice(availableExtraPrices.find(ep => ep.id === val))
                      }}
                      value={selectedExtraPrice?.id || ''}
                    >
                      <option value="">-- Tidak Ada --</option>
                      {availableExtraPrices.map(ep => (
                        <option key={ep.id} value={ep.id}>{ep.description}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <button
              disabled={!pickup || !dropoff || !departureDate || !selectedSchedule || isGeocoding}
              onClick={handleNextStep2}
              className="mt-6 w-full rounded-xl bg-primary py-4 font-bold text-white shadow-lg disabled:opacity-50"
            >
              Lanjut Pilih Kursi
            </button>
          </div>
        )}

        {/* STEP 4: CHECKOUT */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100">
              <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Ringkasan Pemesanan</h2>
              
              <div className="space-y-4 rounded-xl bg-gray-50 p-4 mb-4 border border-gray-100">
                <div>
                  <h3 className="font-bold text-gray-800">{selectedRoute?.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{departureDate} • Jam {selectedSchedule?.departure_time} WIB</p>
                </div>
                <div className="border-t border-gray-200 my-2"></div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Jemput</p>
                    <p className="font-medium text-gray-800 mt-1">{pickup}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Antar</p>
                    <p className="font-medium text-gray-800 mt-1">{dropoff}</p>
                  </div>
                </div>
                <div className="border-t border-gray-200 my-2"></div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-700">Kursi Terpilih ({selectedSeats.length})</span>
                  <span className="font-bold text-primary">No: {selectedSeats.join(', ')}</span>
                </div>
                {distanceKm > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-700">Jarak Rute Jalan Real</span>
                    <span className="font-bold text-blue-600">{distanceKm.toFixed(1)} km</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col space-y-2">
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Harga Tiket Kursi ({selectedSeats.length}x)</span>
                  <span>Rp {calculateTotalBase().toLocaleString('id-ID')}</span>
                </div>
                {selectedExtraPrice && (
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{selectedExtraPrice.description}</span>
                    <span>Rp {Number(selectedExtraPrice.price).toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-lg font-bold text-gray-900 mt-2 border-t pt-2">
                  <span>Total Tagihan</span>
                  <div className="text-right">
                    {promoData && <span className="text-sm text-gray-400 line-through mr-2">Rp {totalBasePrice.toLocaleString('id-ID')}</span>}
                    <span className="text-primary">Rp {getFinalPrice(totalBasePrice).toLocaleString('id-ID')}</span>
                  </div>
                </div>
                {promoData && (
                  <div className="flex justify-between items-center text-sm font-bold text-green-600 mt-1">
                    <span>Diskon Promo ({promoData.code})</span>
                    <span>- Rp {(totalBasePrice - getFinalPrice(totalBasePrice)).toLocaleString('id-ID')}</span>
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
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:border-primary outline-none uppercase font-bold"
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
                <label className={`flex cursor-pointer items-center justify-between rounded-xl border-2 p-4 transition ${paymentMethod === 'CASH' ? 'border-primary bg-blue-50' : 'border-gray-100'}`}>
                  <div className="flex items-center space-x-3">
                    <Banknote className={paymentMethod === 'CASH' ? 'text-primary' : 'text-gray-400'} />
                    <span className="font-bold text-gray-800">Tunai (Cash)</span>
                  </div>
                  <input type="radio" name="payment" checked={paymentMethod === 'CASH'} onChange={() => setPaymentMethod('CASH')} className="hidden" />
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'CASH' ? 'border-primary' : 'border-gray-300'}`}>
                    {paymentMethod === 'CASH' && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                  </div>
                </label>

                <label className={`flex cursor-pointer items-center justify-between rounded-xl border-2 p-4 transition ${paymentMethod === 'TRANSFER' ? 'border-primary bg-blue-50' : 'border-gray-100'}`}>
                  <div className="flex items-center space-x-3">
                    <Wallet className={paymentMethod === 'TRANSFER' ? 'text-primary' : 'text-gray-400'} />
                    <div>
                      <p className="font-bold text-gray-800">Saldo AnindiraPay</p>
                    </div>
                  </div>
                  <input type="radio" name="payment" checked={paymentMethod === 'TRANSFER'} onChange={() => setPaymentMethod('TRANSFER')} className="hidden" />
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'TRANSFER' ? 'border-primary' : 'border-gray-300'}`}>
                    {paymentMethod === 'TRANSFER' && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                  </div>
                </label>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center space-x-2 rounded-full bg-primary py-4 font-bold text-white shadow-lg shadow-blue-200 transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
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
        title={mapTarget === 'PICKUP' ? 'Pilih Lokasi Penjemputan' : 'Pilih Lokasi Pengantaran'}
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
