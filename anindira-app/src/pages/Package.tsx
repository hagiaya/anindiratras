import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Package as PackageIcon, User, Phone, CreditCard, Wallet, Banknote } from 'lucide-react'
import { supabase } from '../lib/supabase'
import MapPickerModal from '../components/MapPickerModal'
import { getRealDrivingDistance, geocodeAddress as geocodeAddressUtil } from '../lib/distance'

export default function Package() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  
  // Jenis Pengiriman
  const [packageType, setPackageType] = useState<'DALAM_KOTA' | 'LUAR_KOTA'>('DALAM_KOTA')
  
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
  const [weightKg, setWeightKg] = useState<number | ''>('')
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

  const [packagePrices, setPackagePrices] = useState<any[]>([])
  const [distanceKm, setDistanceKm] = useState<number>(0)

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
    
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setSenderName(user.user_metadata?.full_name || '')
        setSenderPhone(user.phone || '')
      }
    }
    fetchUser()
  }, [])

  // Dynamic pricing configured by admin
  const basePriceData = packagePrices.find(p => p.description === `BASE_PRICE_${packageType}`)
  const perKgPriceData = packagePrices.find(p => p.description === `PRICE_PER_KG_${packageType}`)
  
  const defaultBasePrice = packageType === 'DALAM_KOTA' ? 15000 : 35000
  const defaultPricePerKg = packageType === 'DALAM_KOTA' ? 3000 : 7000

  const basePrice = basePriceData ? Number(basePriceData.base_price) : defaultBasePrice
  const pricePerKg = perKgPriceData ? Number(perKgPriceData.base_price) : defaultPricePerKg

  // Radius extra price: removed as per request
  const radiusExtraFee = 0
  
  const totalPackagePrice = basePrice + ((Number(weightKg) || 0) * pricePerKg)

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
      
      if (totalPackagePrice < data.min_order_amount) {
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

  const handleNextStep1 = async () => {
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
    setStep(2)
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

      const totalPrice = getFinalPrice(totalPackagePrice)
      const orderPayloadData = {
        user_id: userId,
        order_type: 'TITIP_BARANG',
        pickup_address: pickup,
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        dropoff_address: dropoff,
        dropoff_lat: dropoffLat,
        dropoff_lng: dropoffLng,
        package_details: JSON.stringify({
          packageType,
          senderName,
          senderPhone,
          receiverName,
          receiverPhone,
          itemName,
          weightKg: Number(weightKg) || 0,
          distanceKm,
          radiusExtraFee
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
          payload: { order_type: 'TITIP_BARANG' }
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
        <h1 className="text-lg font-bold text-gray-800">Titip Barang</h1>
      </div>

      <div className="p-4">
        {error && <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm font-semibold text-red-600">{error}</div>}

        <div className="mb-8 flex items-center justify-center space-x-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`h-2 w-12 rounded-full transition-colors duration-300 ${step >= i ? 'bg-orange-500' : 'bg-gray-200'}`} />
          ))}
        </div>

        {/* STEP 1: LOKASI PENGIRIMAN */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div>
              <label className="mb-3 block text-sm font-bold text-gray-700">Tujuan Pengiriman</label>
              <div className="flex rounded-lg bg-gray-200 p-1">
                <button
                  className={`flex-1 rounded-md py-2.5 text-sm font-bold transition flex items-center justify-center space-x-2 ${packageType === 'DALAM_KOTA' ? 'bg-white text-orange-600 shadow' : 'text-gray-600'}`}
                  onClick={() => setPackageType('DALAM_KOTA')}
                >
                  <MapPin size={18} />
                  <span>Dalam Daerah</span>
                </button>
                <button
                  className={`flex-1 rounded-md py-2.5 text-sm font-bold transition flex items-center justify-center space-x-2 ${packageType === 'LUAR_KOTA' ? 'bg-white text-orange-600 shadow' : 'text-gray-600'}`}
                  onClick={() => setPackageType('LUAR_KOTA')}
                >
                  <PackageIcon size={18} />
                  <span>Luar Daerah</span>
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
                    <label className="text-xs font-semibold text-gray-500">Lokasi Jemput Barang (Pengirim)</label>
                    <div className="flex items-center space-x-2 border-b-2 border-gray-100 pb-2 mt-1 focus-within:border-orange-500 transition-colors">
                      <input
                        type="text"
                        value={pickup}
                        onChange={e => setPickup(e.target.value)}
                        onBlur={() => handleGeocodeBlur(pickup, 'PICKUP')}
                        placeholder="Contoh: Jl. Sudirman No 12"
                        className="w-full font-medium text-gray-800 focus:outline-none"
                      />
                      <button onClick={() => { setMapTarget('PICKUP'); setIsMapOpen(true); }} className="text-xs font-bold text-orange-500 whitespace-nowrap bg-orange-50 px-2 py-1 rounded-md">
                        Peta
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                    <MapPin size={14} />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-500">Tujuan / Alamat Penerima</label>
                    <div className="flex items-center space-x-2 border-b-2 border-gray-100 pb-2 mt-1 focus-within:border-orange-500 transition-colors">
                      <input
                        type="text"
                        value={dropoff}
                        onChange={e => setDropoff(e.target.value)}
                        onBlur={() => handleGeocodeBlur(dropoff, 'DROPOFF')}
                        placeholder="Contoh: Jl. Merdeka No 45"
                        className="w-full font-medium text-gray-800 focus:outline-none"
                      />
                      <button onClick={() => { setMapTarget('DROPOFF'); setIsMapOpen(true); }} className="text-xs font-bold text-orange-500 whitespace-nowrap bg-orange-50 px-2 py-1 rounded-md">
                        Peta
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs font-bold text-orange-600 bg-orange-50 p-2 rounded-lg text-right">
                {isGeocoding ? 'Menghitung rute jalan real...' : `Jarak Rute Jalan Real: ${distanceKm > 0 ? `${distanceKm.toFixed(1)} km` : '-'}`}
              </div>
            </div>

            <button
              disabled={!pickup || !dropoff || isGeocoding}
              onClick={handleNextStep1}
              className="mt-6 w-full rounded-full bg-orange-500 py-4 font-bold text-white shadow-lg shadow-orange-200 transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
            >
              Lanjut Isi Data Penerima
            </button>
          </div>
        )}

        {/* STEP 2: DATA PENERIMA & PENGIRIM */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100">
              <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Data Penerima</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 border-b-2 border-gray-100 pb-2 focus-within:border-orange-500 transition-colors">
                  <User size={18} className="text-gray-400" />
                  <input type="text" value={receiverName} onChange={e => setReceiverName(e.target.value)} placeholder="Nama Penerima" className="w-full font-medium text-gray-800 focus:outline-none" />
                </div>
                <div className="flex items-center space-x-3 border-b-2 border-gray-100 pb-2 focus-within:border-orange-500 transition-colors">
                  <Phone size={18} className="text-gray-400" />
                  <input type="tel" value={receiverPhone} onChange={e => setReceiverPhone(e.target.value)} placeholder="No. Telp Penerima" className="w-full font-medium text-gray-800 focus:outline-none" />
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100">
              <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Data Pengirim</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 border-b-2 border-gray-100 pb-2 focus-within:border-orange-500 transition-colors">
                  <User size={18} className="text-gray-400" />
                  <input type="text" value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="Nama Pengirim" className="w-full font-medium text-gray-800 focus:outline-none" />
                </div>
                <div className="flex items-center space-x-3 border-b-2 border-gray-100 pb-2 focus-within:border-orange-500 transition-colors">
                  <Phone size={18} className="text-gray-400" />
                  <input type="tel" value={senderPhone} onChange={e => setSenderPhone(e.target.value)} placeholder="No. Telp Pengirim" className="w-full font-medium text-gray-800 focus:outline-none" />
                </div>
              </div>
            </div>

            <button
              disabled={!receiverName || !receiverPhone || !senderName || !senderPhone}
              onClick={() => setStep(3)}
              className="mt-6 w-full rounded-full bg-orange-500 py-4 font-bold text-white shadow-lg shadow-orange-200 transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
            >
              Lanjut Pilih Berat Barang
            </button>
          </div>
        )}

        {/* STEP 3: BERAT BARANG & HARGA (INPUT ADMIN + BERAT + RADIUS) */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
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
                  <label className="text-xs font-semibold text-gray-500 block mb-2">Berat Barang (kg)</label>
                  <div className="flex items-center space-x-3 border border-gray-200 rounded-xl p-3 focus-within:border-orange-500 transition-colors">
                    <input
                      type="number"
                      min="1"
                      value={weightKg}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '' || val === '0') setWeightKg('');
                        else setWeightKg(Number(val));
                      }}
                      className="w-full font-bold text-gray-800 focus:outline-none text-center"
                      placeholder="Masukkan berat barang"
                    />
                    <span className="text-gray-500 font-bold">Kg</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">Tarif Admin: Dasar Rp {basePrice.toLocaleString('id-ID')} + (Rp {pricePerKg.toLocaleString('id-ID')} / Kg)</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 space-y-2">
              <div className="flex justify-between text-xs text-gray-600 font-medium">
                <span>Harga Dasar ({packageType === 'DALAM_KOTA' ? 'Dalam Daerah' : 'Luar Daerah'})</span>
                <span>Rp {basePrice.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600 font-medium">
                <span>Berat Paket ({Number(weightKg) || 0} kg x Rp {pricePerKg.toLocaleString('id-ID')})</span>
                <span>Rp {((Number(weightKg) || 0) * pricePerKg).toLocaleString('id-ID')}</span>
              </div>
              {radiusExtraFee > 0 && (
                <div className="flex justify-between text-xs text-orange-700 font-bold border-t border-orange-200 pt-1">
                  <span>Biaya Radius Extra ({distanceKm.toFixed(1)} km rute real)</span>
                  <span>+ Rp {radiusExtraFee.toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="border-t border-dashed border-gray-300 my-2"></div>
              <div className="flex justify-between items-center text-lg font-bold text-gray-900">
                <span>Total Estimasi</span>
                <span className="text-orange-500">Rp {totalPackagePrice.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <button
              disabled={!itemName || !weightKg}
              onClick={() => setStep(4)}
              className="mt-6 w-full rounded-full bg-orange-500 py-4 font-bold text-white shadow-lg shadow-orange-200 transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
            >
              Lanjut ke Pembayaran
            </button>
          </div>
        )}

        {/* STEP 4: CHECKOUT */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-gray-100">
              <h2 className="mb-4 text-sm font-bold text-gray-800 uppercase tracking-wide">Ringkasan Pesanan</h2>
              
              <div className="space-y-4 rounded-xl bg-gray-50 p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <PackageIcon size={20} className="text-orange-500 shrink-0" />
                  <div>
                    <h3 className="font-bold text-gray-800">{itemName}</h3>
                    <p className="text-xs text-gray-500">Jenis: {packageType === 'DALAM_KOTA' ? 'Dalam Daerah' : 'Luar Daerah'} • Berat: {weightKg} kg</p>
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
                <div className="flex justify-between items-center text-lg font-bold text-gray-900">
                  <span>Total Tagihan</span>
                  <div className="text-right">
                    {promoData && <span className="text-sm text-gray-400 line-through mr-2">Rp {totalPackagePrice.toLocaleString('id-ID')}</span>}
                    <span className="text-orange-500">Rp {getFinalPrice(totalPackagePrice).toLocaleString('id-ID')}</span>
                  </div>
                </div>
                {promoData && (
                  <div className="flex justify-between items-center text-sm font-bold text-green-600 mt-1">
                    <span>Diskon Promo ({promoData.code})</span>
                    <span>- Rp {(totalPackagePrice - getFinalPrice(totalPackagePrice)).toLocaleString('id-ID')}</span>
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
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:border-orange-500 outline-none uppercase font-bold"
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
                <label className={`flex cursor-pointer items-center justify-between rounded-xl border-2 p-4 transition ${paymentMethod === 'CASH' ? 'border-orange-500 bg-orange-50' : 'border-gray-100'}`}>
                  <div className="flex items-center space-x-3">
                    <Banknote className={paymentMethod === 'CASH' ? 'text-orange-500' : 'text-gray-400'} />
                    <span className="font-bold text-gray-800">Tunai (Cash)</span>
                  </div>
                  <input type="radio" name="payment" checked={paymentMethod === 'CASH'} onChange={() => setPaymentMethod('CASH')} className="hidden" />
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'CASH' ? 'border-orange-500' : 'border-gray-300'}`}>
                    {paymentMethod === 'CASH' && <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />}
                  </div>
                </label>

                <label className={`flex cursor-pointer items-center justify-between rounded-xl border-2 p-4 transition ${paymentMethod === 'TRANSFER' ? 'border-orange-500 bg-orange-50' : 'border-gray-100'}`}>
                  <div className="flex items-center space-x-3">
                    <Wallet className={paymentMethod === 'TRANSFER' ? 'text-orange-500' : 'text-gray-400'} />
                    <div>
                      <p className="font-bold text-gray-800">Saldo AnindiraPay</p>
                    </div>
                  </div>
                  <input type="radio" name="payment" checked={paymentMethod === 'TRANSFER'} onChange={() => setPaymentMethod('TRANSFER')} className="hidden" />
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'TRANSFER' ? 'border-orange-500' : 'border-gray-300'}`}>
                    {paymentMethod === 'TRANSFER' && <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />}
                  </div>
                </label>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center space-x-2 rounded-full bg-orange-500 py-4 font-bold text-white shadow-lg shadow-orange-200 transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
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
