import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Trash2, Map, RefreshCw, Landmark, QrCode, Upload, Settings as SettingsIcon, Clock, TrendingUp, AlertTriangle, Car, Package as PackageIcon, Plane, Edit2, CarFront } from 'lucide-react'

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'GLOBAL' | 'DEPARTURES' | 'CARPOOL' | 'RENTAL' | 'PACKAGE' | 'AIRPORT' | 'ROUTES' | 'BANKS' | 'QRIS'>('GLOBAL')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Global Settings State
  const [appSettings, setAppSettings] = useState<any>(null)
  const [profitPercentage, setProfitPercentage] = useState<number>(0)
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false)
  
  // Jam Keberangkatan State (7 times Dalam Kota, 4 times Luar Kota)
  const [departureTimes, setDepartureTimes] = useState<any[]>([])
  const [newDepartureTime, setNewDepartureTime] = useState('')
  const [newDepartureRouteType, setNewDepartureRouteType] = useState<'DALAM_KOTA' | 'LUAR_KOTA'>('DALAM_KOTA')
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null)
  const [editDeptTime, setEditDeptTime] = useState('')
  const [editDeptRouteType, setEditDeptRouteType] = useState<'DALAM_KOTA' | 'LUAR_KOTA'>('DALAM_KOTA')

  // Carpool Pricing State
  const [selectedCarpoolRouteId, setSelectedCarpoolRouteId] = useState('')
  const [carpoolFrontPrice, setCarpoolFrontPrice] = useState<number | string>(60000)
  const [carpoolMidPrice, setCarpoolMidPrice] = useState<number | string>(50000)
  const [carpoolBackPrice, setCarpoolBackPrice] = useState<number | string>(50000)

  // Extra Prices (Jarak Jauh)
  const [extraPrices, setExtraPrices] = useState<any[]>([])
  const [newExtraAmount, setNewExtraAmount] = useState('')
  const [newExtraDesc, setNewExtraDesc] = useState('')

  // Pengaturan Sewa Mobil State
  const [rentalCars, setRentalCars] = useState<any[]>([])
  const [newCarName, setNewCarName] = useState('')
  const [newCarSeats, setNewCarSeats] = useState<number>(6)
  const [newCarInCityPrice, setNewCarInCityPrice] = useState('')
  const [newCarOutCityPrice, setNewCarOutCityPrice] = useState('')

  // Pengaturan Kiriman Barang State
  const [pkgBaseDalam, setPkgBaseDalam] = useState<number>(15000)
  const [pkgKgDalam, setPkgKgDalam] = useState<number>(3000)
  const [pkgBaseLuar, setPkgBaseLuar] = useState<number>(35000)
  const [pkgKgLuar, setPkgKgLuar] = useState<number>(7000)

  // Pengaturan Layanan Bandara State
  const [airportBaseKecil, setAirportBaseKecil] = useState<number>(50000)
  const [airportKmKecil, setAirportKmKecil] = useState<number>(5000)
  const [airportBaseBesar, setAirportBaseBesar] = useState<number>(75000)
  const [airportKmBesar, setAirportKmBesar] = useState<number>(7000)

  // Routes State
  const [routes, setRoutes] = useState<any[]>([])
  const [newRouteName, setNewRouteName] = useState('')
  const [newRouteType, setNewRouteType] = useState('DALAM_KOTA')

  // Product Prices Raw State
  const [prices, setPrices] = useState<any[]>([])

  // Banks State
  const [banks, setBanks] = useState<any[]>([])
  const [newBankName, setNewBankName] = useState('')
  const [newAccountNumber, setNewAccountNumber] = useState('')
  const [newAccountHolder, setNewAccountHolder] = useState('')

  // QRIS State
  const [qrisImage, setQrisImage] = useState<any>(null)
  const [uploadingQris, setUploadingQris] = useState(false)
  const [qrisFile, setQrisFile] = useState<File | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsRefreshing(true)
    setError('')
    setSuccessMsg('')
    try {
      // Fetch App Settings
      const { data: settingsData } = await supabase
        .from('app_settings')
        .select('*')
        .limit(1)
        .maybeSingle()
      
      if (settingsData) {
        setAppSettings(settingsData)
        setProfitPercentage(settingsData.profit_percentage || 0)
        setMaintenanceMode(settingsData.maintenance_mode || false)
      }

      // Fetch Departure Times
      const { data: deptData } = await supabase
        .from('departure_times')
        .select('*')
        .order('time_string', { ascending: true })
      if (deptData) setDepartureTimes(deptData)

      // Fetch Extra Prices
      const { data: extraData } = await supabase.from('extra_prices').select('*').order('amount', { ascending: true })
      if (extraData) setExtraPrices(extraData)

      // Fetch routes
      const { data: routesData } = await supabase.from('routes').select('*').order('created_at', { ascending: false })
      setRoutes(routesData || [])

      // Fetch product_prices
      const { data: pricesData } = await supabase.from('product_prices').select('*').order('created_at', { ascending: false })
      if (pricesData) {
        setPrices(pricesData)

        // Parse Rental Cars
        const cars = pricesData.filter(p => p.product_type === 'SEWA_MOBIL').map(p => {
          let carInfo = { name: p.description || 'Mobil', seats: Number(p.seat_type) || 6, inCityPrice: Number(p.base_price), outCityPrice: Number(p.base_price) * 1.5 }
          try {
            if (p.description && p.description.startsWith('{')) {
              carInfo = JSON.parse(p.description)
            }
          } catch (e) {}
          return { id: p.id, ...carInfo }
        })
        setRentalCars(cars)

        // Parse Package Prices
        const pBaseDalam = pricesData.find(p => p.description === 'BASE_PRICE_DALAM_KOTA')
        const pKgDalam = pricesData.find(p => p.description === 'PRICE_PER_KG_DALAM_KOTA')
        const pBaseLuar = pricesData.find(p => p.description === 'BASE_PRICE_LUAR_KOTA')
        const pKgLuar = pricesData.find(p => p.description === 'PRICE_PER_KG_LUAR_KOTA')

        if (pBaseDalam) setPkgBaseDalam(Number(pBaseDalam.base_price))
        if (pKgDalam) setPkgKgDalam(Number(pKgDalam.base_price))
        if (pBaseLuar) setPkgBaseLuar(Number(pBaseLuar.base_price))
        if (pKgLuar) setPkgKgLuar(Number(pKgLuar.base_price))

        // Parse Airport Prices
        const aBaseKecil = pricesData.find(p => p.description === 'BASE_PRICE_AIRPORT_KECIL')
        const aKmKecil = pricesData.find(p => p.description === 'PRICE_PER_KM_AIRPORT_KECIL')
        const aBaseBesar = pricesData.find(p => p.description === 'BASE_PRICE_AIRPORT_BESAR')
        const aKmBesar = pricesData.find(p => p.description === 'PRICE_PER_KM_AIRPORT_BESAR')

        if (aBaseKecil) setAirportBaseKecil(Number(aBaseKecil.base_price))
        if (aKmKecil) setAirportKmKecil(Number(aKmKecil.base_price))
        if (aBaseBesar) setAirportBaseBesar(Number(aBaseBesar.base_price))
        if (aKmBesar) setAirportKmBesar(Number(aKmBesar.base_price))
      }

      // Fetch banks
      const { data: banksData } = await supabase.from('bank_accounts').select('*').order('created_at', { ascending: false })
      setBanks(banksData || [])

      // Fetch QRIS
      const { data: qrisData } = await supabase
        .from('qris_settings')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
        
      setQrisImage(qrisData || null)

    } catch (err: any) {
      console.error(err)
      setError('Gagal memuat data: ' + err.message)
    } finally {
      setIsRefreshing(false)
    }
  }

  // --- GLOBAL SETTINGS ---
  const handleSaveGlobalSettings = async () => {
    setIsRefreshing(true)
    setError('')
    setSuccessMsg('')
    try {
      if (appSettings) {
        const { error } = await supabase.from('app_settings').update({
          profit_percentage: profitPercentage,
          maintenance_mode: maintenanceMode
        }).eq('id', appSettings.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('app_settings').insert({
          profit_percentage: profitPercentage,
          maintenance_mode: maintenanceMode
        })
        if (error) throw error
      }
      setSuccessMsg('Pengaturan Umum berhasil disimpan!')
      fetchData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsRefreshing(false)
    }
  }

  // --- JAM KEBERANGKATAN ---
  const handleAddDepartureTime = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDepartureTime) return
    setIsRefreshing(true)
    setError('')
    setSuccessMsg('')
    const { error } = await supabase.from('departure_times').insert({
      time_string: newDepartureTime,
      route_type: newDepartureRouteType
    })
    setIsRefreshing(false)
    if (!error) {
      setNewDepartureTime('')
      setSuccessMsg('Jam keberangkatan berhasil ditambahkan!')
      fetchData()
    } else {
      setError('Gagal menambah jam: ' + error.message)
    }
  }

  const handleStartEditDepartureTime = (dt: any) => {
    setEditingDeptId(dt.id)
    setEditDeptTime(dt.time_string)
    setEditDeptRouteType(dt.route_type || 'DALAM_KOTA')
  }

  const handleUpdateDepartureTime = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDeptId || !editDeptTime) return
    setIsRefreshing(true)
    setError('')
    setSuccessMsg('')
    const { error } = await supabase.from('departure_times').update({
      time_string: editDeptTime,
      route_type: editDeptRouteType
    }).eq('id', editingDeptId)

    setIsRefreshing(false)
    if (!error) {
      setEditingDeptId(null)
      setSuccessMsg('Jam keberangkatan berhasil diperbarui!')
      fetchData()
    } else {
      setError('Gagal memperbarui jam: ' + error.message)
    }
  }

  const handleDeleteDepartureTime = async (id: string) => {
    if (!confirm('Hapus jam keberangkatan ini?')) return
    setIsRefreshing(true)
    setError('')
    setSuccessMsg('')
    const { error } = await supabase.from('departure_times').delete().eq('id', id)
    setIsRefreshing(false)
    if (!error) {
      setSuccessMsg('Jam keberangkatan berhasil dihapus!')
      fetchData()
    } else {
      setError('Gagal menghapus jam: ' + error.message)
    }
  }

  // --- CARPOOL PRICING LOGIC ---
  const handleSaveCarpoolPrices = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCarpoolRouteId) return setError('Pilih rute terlebih dahulu')
    setIsRefreshing(true)
    setError('')
    setSuccessMsg('')

    try {
      const seatConfigs = [
        { seat_type: 'FRONT', price: Number(carpoolFrontPrice) },
        { seat_type: 'MID', price: Number(carpoolMidPrice) },
        { seat_type: 'BACK', price: Number(carpoolBackPrice) }
      ]

      for (const config of seatConfigs) {
        const existing = prices.find(p => p.product_type === 'CARPOOL' && p.route_id === selectedCarpoolRouteId && p.seat_type === config.seat_type)
        if (existing) {
          await supabase.from('product_prices').update({ base_price: config.price }).eq('id', existing.id)
        } else {
          await supabase.from('product_prices').insert({
            product_type: 'CARPOOL',
            route_id: selectedCarpoolRouteId,
            seat_type: config.seat_type,
            base_price: config.price
          })
        }
      }

      setSuccessMsg('Tarif travel reguler (carpooling) berhasil disimpan!')
      fetchData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleDeleteCarpoolPrices = async (routeId: string) => {
    if (!confirm('Hapus pengaturan harga travel reguler untuk rute ini?')) return
    setIsRefreshing(true)
    setError('')
    setSuccessMsg('')
    const { error } = await supabase.from('product_prices').delete().eq('product_type', 'CARPOOL').eq('route_id', routeId)
    setIsRefreshing(false)
    if (!error) {
      setSuccessMsg('Harga travel reguler berhasil dihapus!')
      fetchData()
    } else {
      setError(error.message)
    }
  }

  // --- SEWA MOBIL LOGIC ---
  const handleAddRentalCar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCarName || !newCarInCityPrice || !newCarOutCityPrice) return
    setIsRefreshing(true)
    setError('')

    const carPayload = {
      name: newCarName,
      seats: Number(newCarSeats),
      inCityPrice: Number(newCarInCityPrice),
      outCityPrice: Number(newCarOutCityPrice)
    }

    const { error } = await supabase.from('product_prices').insert({
      product_type: 'SEWA_MOBIL',
      base_price: Number(newCarInCityPrice),
      seat_type: String(newCarSeats),
      description: JSON.stringify(carPayload)
    })

    setIsRefreshing(false)
    if (!error) {
      setNewCarName('')
      setNewCarInCityPrice('')
      setNewCarOutCityPrice('')
      setSuccessMsg('Unit sewa mobil berhasil ditambahkan!')
      fetchData()
    } else {
      setError(error.message)
    }
  }

  const handleDeleteRentalCar = async (id: string) => {
    if (!confirm('Hapus jenis mobil sewa ini?')) return
    setIsRefreshing(true)
    await supabase.from('product_prices').delete().eq('id', id)
    setIsRefreshing(false)
    fetchData()
  }

  // --- KIRIMAN BARANG LOGIC ---
  const handleSavePackageSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsRefreshing(true)
    setError('')
    try {
      const items = [
        { description: 'BASE_PRICE_DALAM_KOTA', base_price: Number(pkgBaseDalam) },
        { description: 'PRICE_PER_KG_DALAM_KOTA', base_price: Number(pkgKgDalam) },
        { description: 'BASE_PRICE_LUAR_KOTA', base_price: Number(pkgBaseLuar) },
        { description: 'PRICE_PER_KG_LUAR_KOTA', base_price: Number(pkgKgLuar) },
      ]

      for (const item of items) {
        const existing = prices.find(p => p.product_type === 'TITIP_BARANG' && p.description === item.description)
        if (existing) {
          await supabase.from('product_prices').update({ base_price: item.base_price }).eq('id', existing.id)
        } else {
          await supabase.from('product_prices').insert({ product_type: 'TITIP_BARANG', base_price: item.base_price, description: item.description })
        }
      }

      setSuccessMsg('Pengaturan Tarif Kiriman Barang berhasil disimpan!')
      fetchData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsRefreshing(false)
    }
  }

  // --- LAYANAN BANDARA LOGIC ---
  const handleSaveAirportSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsRefreshing(true)
    setError('')
    try {
      const items = [
        { description: 'BASE_PRICE_AIRPORT_KECIL', base_price: Number(airportBaseKecil) },
        { description: 'PRICE_PER_KM_AIRPORT_KECIL', base_price: Number(airportKmKecil) },
        { description: 'BASE_PRICE_AIRPORT_BESAR', base_price: Number(airportBaseBesar) },
        { description: 'PRICE_PER_KM_AIRPORT_BESAR', base_price: Number(airportKmBesar) },
      ]

      for (const item of items) {
        const existing = prices.find(p => (p.product_type === 'AIRPORT' || p.product_type === 'ANTAR_BANDARA') && p.description === item.description)
        if (existing) {
          await supabase.from('product_prices').update({ base_price: item.base_price }).eq('id', existing.id)
        } else {
          await supabase.from('product_prices').insert({ product_type: 'AIRPORT', base_price: item.base_price, description: item.description })
        }
      }

      setSuccessMsg('Pengaturan Tarif Layanan Bandara berhasil disimpan!')
      fetchData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsRefreshing(false)
    }
  }

  // --- EXTRA PRICE LOGIC ---
  const handleAddExtraPrice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newExtraAmount) return
    setIsRefreshing(true)
    const { error } = await supabase.from('extra_prices').insert({
      amount: Number(newExtraAmount),
      description: newExtraDesc || `+ Rp ${Number(newExtraAmount).toLocaleString('id-ID')}`
    })
    setIsRefreshing(false)
    if (!error) { setNewExtraAmount(''); setNewExtraDesc(''); fetchData() }
    else setError(error.message)
  }

  const handleDeleteExtraPrice = async (id: string) => {
    setIsRefreshing(true)
    await supabase.from('extra_prices').delete().eq('id', id)
    setIsRefreshing(false)
    fetchData()
  }

  // --- ROUTES LOGIC ---
  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRouteName) return
    setIsRefreshing(true)
    const { error } = await supabase.from('routes').insert({
      name: newRouteName,
      route_type: newRouteType,
      is_active: true
    })
    setIsRefreshing(false)
    if (!error) {
      setNewRouteName('')
      fetchData()
    } else {
      setError(error.message)
    }
  }

  const handleDeleteRoute = async (id: string) => {
    if (!confirm('Hapus rute ini?')) return
    setIsRefreshing(true)
    const { error } = await supabase.from('routes').delete().eq('id', id)
    setIsRefreshing(false)
    if (!error) fetchData()
    else setError(error.message)
  }

  // --- BANKS LOGIC ---
  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBankName || !newAccountNumber || !newAccountHolder) return
    setIsRefreshing(true)
    const { error } = await supabase.from('bank_accounts').insert({
      bank_name: newBankName,
      account_number: newAccountNumber,
      account_holder: newAccountHolder,
      is_active: true
    })
    setIsRefreshing(false)
    if (!error) {
      setNewBankName('')
      setNewAccountNumber('')
      setNewAccountHolder('')
      fetchData()
    } else {
      setError(error.message)
    }
  }

  const handleDeleteBank = async (id: string) => {
    if (!confirm('Hapus rekening bank ini?')) return
    setIsRefreshing(true)
    const { error } = await supabase.from('bank_accounts').delete().eq('id', id)
    setIsRefreshing(false)
    if (!error) fetchData()
    else setError(error.message)
  }

  // --- QRIS LOGIC ---
  const handleUploadQris = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!qrisFile) return
    
    setUploadingQris(true)
    setError('')
    
    try {
      const fileExt = qrisFile.name.split('.').pop()
      const fileName = `qris_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from('qris').upload(fileName, qrisFile)
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('qris').getPublicUrl(fileName)

      await supabase.from('qris_settings').update({ is_active: false }).eq('is_active', true)

      const { error: dbError } = await supabase.from('qris_settings').insert({
        image_url: urlData.publicUrl,
        is_active: true
      })

      if (dbError) throw dbError

      setQrisFile(null)
      fetchData()
      alert('QRIS berhasil diunggah!')
    } catch (err: any) {
      setError('Gagal unggah QRIS: ' + err.message)
    } finally {
      setUploadingQris(false)
    }
  }

  const handleDeleteQris = async (id: string) => {
    if (!confirm('Hapus QRIS ini?')) return
    setIsRefreshing(true)
    const { error } = await supabase.from('qris_settings').update({ is_active: false }).eq('id', id)
    setIsRefreshing(false)
    if (!error) fetchData()
    else setError(error.message)
  }

  const dalamKotaDepartureTimes = departureTimes.filter(d => !d.route_type || d.route_type === 'DALAM_KOTA')
  const luarKotaDepartureTimes = departureTimes.filter(d => d.route_type === 'LUAR_KOTA')

  // Group Carpool Prices by Route
  const carpoolPricesByRoute = routes.map(r => {
    const routePrices = prices.filter(p => p.product_type === 'CARPOOL' && p.route_id === r.id)
    const front = routePrices.find(p => p.seat_type === 'FRONT')?.base_price || 0
    const mid = routePrices.find(p => p.seat_type === 'MID')?.base_price || 0
    const back = routePrices.find(p => p.seat_type === 'BACK')?.base_price || 0
    return {
      route: r,
      frontPrice: Number(front),
      midPrice: Number(mid),
      backPrice: Number(back),
      hasPrices: routePrices.length > 0
    }
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Pengaturan Sistem Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola Jam Pemberangkatan, Harga Travel Reguler, Sewa Mobil, Kiriman Barang, Bandara, Rute, & Pembayaran</p>
        </div>
        <button 
          onClick={fetchData}
          className="flex items-center justify-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50 transition active:scale-95 w-fit"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          <span>Segarkan</span>
        </button>
      </div>

      {error && <div className="p-4 bg-red-100 text-red-700 font-bold rounded-xl text-sm">{error}</div>}
      {successMsg && <div className="p-4 bg-green-100 text-green-700 font-bold rounded-xl text-sm">{successMsg}</div>}

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto scrollbar-hide">
        <button
          className={`flex items-center space-x-2 px-4 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'GLOBAL' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('GLOBAL')}
        >
          <SettingsIcon size={18} />
          <span>Pengaturan Global</span>
        </button>
        <button
          className={`flex items-center space-x-2 px-4 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'DEPARTURES' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('DEPARTURES')}
        >
          <Clock size={18} />
          <span>Jam Keberangkatan</span>
        </button>
        <button
          className={`flex items-center space-x-2 px-4 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'CARPOOL' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('CARPOOL')}
        >
          <CarFront size={18} />
          <span>Harga Travel Reguler</span>
        </button>
        <button
          className={`flex items-center space-x-2 px-4 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'RENTAL' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('RENTAL')}
        >
          <Car size={18} />
          <span>Sewa Mobil</span>
        </button>
        <button
          className={`flex items-center space-x-2 px-4 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'PACKAGE' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('PACKAGE')}
        >
          <PackageIcon size={18} />
          <span>Kiriman Barang</span>
        </button>
        <button
          className={`flex items-center space-x-2 px-4 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'AIRPORT' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('AIRPORT')}
        >
          <Plane size={18} />
          <span>Layanan Bandara</span>
        </button>
        <button
          className={`flex items-center space-x-2 px-4 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'ROUTES' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('ROUTES')}
        >
          <Map size={18} />
          <span>Manajemen Rute</span>
        </button>
        <button
          className={`flex items-center space-x-2 px-4 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'BANKS' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('BANKS')}
        >
          <Landmark size={18} />
          <span>Rekening Bank</span>
        </button>
        <button
          className={`flex items-center space-x-2 px-4 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'QRIS' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('QRIS')}
        >
          <QrCode size={18} />
        </button>
      </div>

      {/* TAB 1: GLOBAL */}
      {activeTab === 'GLOBAL' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit space-y-6">
            <h2 className="text-lg font-bold text-gray-800 flex items-center"><TrendingUp size={20} className="mr-2 text-primary"/> Pengaturan Aplikasi</h2>
            
            <div>
              <label className="text-sm font-bold text-gray-700">Persentase Profit / Potongan Admin (%)</label>
              <div className="mt-2 relative">
                <input 
                  type="number" 
                  value={profitPercentage} 
                  onChange={e => setProfitPercentage(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-xl p-3 pr-10 focus:border-primary outline-none font-bold text-gray-800" 
                  min="0" max="100"
                />
                <span className="absolute right-4 top-3.5 text-gray-500 font-bold">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Potongan ini memotong saldo driver setelah pesanan selesai.</p>
            </div>

            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-xl border border-orange-100">
              <div>
                <h3 className="font-bold text-orange-800 flex items-center"><AlertTriangle size={16} className="mr-1"/> Mode Perbaikan (Maintenance)</h3>
                <p className="text-xs text-orange-600 mt-1">Jika aktif, penumpang tidak dapat melakukan pesanan.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={maintenanceMode} onChange={() => setMaintenanceMode(!maintenanceMode)} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>

            <button 
              onClick={handleSaveGlobalSettings}
              disabled={isRefreshing}
              className="w-full bg-primary text-white font-bold rounded-xl py-3 hover:bg-blue-600 transition active:scale-95"
            >
              Simpan Pengaturan
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Map size={20} className="mr-2 text-primary"/> Biaya Tambahan Radius / Jarak Jauh</h2>
            <form onSubmit={handleAddExtraPrice} className="flex space-x-2 mb-4">
              <input required type="number" value={newExtraAmount} onChange={e=>setNewExtraAmount(e.target.value)} placeholder="Nominal (Rp)" className="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none" />
              <button type="submit" className="bg-gray-900 text-white px-4 rounded-lg font-bold hover:bg-black transition"><Plus size={18}/></button>
            </form>
            <div className="flex flex-wrap gap-2">
              {extraPrices.map(ep => (
                <div key={ep.id} className="flex items-center bg-gray-100 rounded-lg pl-3 pr-1 py-1 border border-gray-200">
                  <span className="text-sm font-bold text-gray-700 mr-2">Rp {Number(ep.amount).toLocaleString('id-ID')}</span>
                  <button onClick={() => handleDeleteExtraPrice(ep.id)} className="bg-white p-1.5 rounded-md text-red-500 hover:bg-red-50"><Trash2 size={14}/></button>
                </div>
              ))}
              {extraPrices.length === 0 && <span className="text-sm text-gray-400">Belum ada harga tambahan jarak jauh.</span>}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: JAM KEBERANGKATAN (DALAM KOTA 7 KALI - LUAR KOTA 4 KALI) */}
      {activeTab === 'DEPARTURES' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center"><Clock size={20} className="mr-2 text-primary"/> Tambah Jam Pemberangkatan</h2>
            <p className="text-xs text-gray-500 mb-4">Rute Dalam Daerah idealnya memiliki 7 kali pemberangkatan, sedangkan Rute Luar Daerah 4 kali pemberangkatan.</p>
            
            <form onSubmit={handleAddDepartureTime} className="flex flex-col sm:flex-row gap-3">
              <input required type="time" value={newDepartureTime} onChange={e=>setNewDepartureTime(e.target.value)} className="border border-gray-300 rounded-xl p-3 text-sm focus:border-primary outline-none font-bold" />
              <select value={newDepartureRouteType} onChange={e => setNewDepartureRouteType(e.target.value as any)} className="border border-gray-300 rounded-xl p-3 text-sm focus:border-primary outline-none font-bold bg-white">
                <option value="DALAM_KOTA">Rute Dalam Daerah (7x)</option>
                <option value="LUAR_KOTA">Rute Luar Daerah (4x)</option>
              </select>
              <button type="submit" className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition flex items-center justify-center space-x-2">
                <Plus size={18}/>
                <span>Tambah Jam</span>
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dalam Kota */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800 text-md flex items-center">
                  <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                  Rute Dalam Daerah
                </h3>
                <span className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full text-xs">{dalamKotaDepartureTimes.length} dari 7 Jam</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {dalamKotaDepartureTimes.map(dt => (
                  <div key={dt.id} className="flex items-center bg-blue-50 border border-blue-200 rounded-xl pl-3 pr-1 py-2">
                    <span className="text-sm font-black text-blue-900 mr-2">{dt.time_string.replace(':', '.')} WIB</span>
                    <button 
                      onClick={() => handleStartEditDepartureTime(dt)} 
                      className="bg-white p-1 rounded-lg text-blue-600 hover:bg-blue-100 shadow-sm mr-1"
                      title="Edit Jam"
                    >
                      <Edit2 size={14}/>
                    </button>
                    <button 
                      onClick={() => handleDeleteDepartureTime(dt.id)} 
                      className="bg-white p-1 rounded-lg text-red-500 hover:bg-red-50 shadow-sm"
                      title="Hapus Jam"
                    >
                      <Trash2 size={14}/>
                    </button>
                  </div>
                ))}
                {dalamKotaDepartureTimes.length === 0 && <p className="text-sm text-gray-400">Belum ada jam keberangkatan.</p>}
              </div>
            </div>

            {/* Luar Kota */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800 text-md flex items-center">
                  <span className="w-3 h-3 rounded-full bg-orange-500 mr-2"></span>
                  Rute Luar Daerah
                </h3>
                <span className="bg-orange-100 text-orange-700 font-bold px-3 py-1 rounded-full text-xs">{luarKotaDepartureTimes.length} dari 4 Jam</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {luarKotaDepartureTimes.map(dt => (
                  <div key={dt.id} className="flex items-center bg-orange-50 border border-orange-200 rounded-xl pl-3 pr-1 py-2">
                    <span className="text-sm font-black text-orange-900 mr-2">{dt.time_string.replace(':', '.')} WIB</span>
                    <button 
                      onClick={() => handleStartEditDepartureTime(dt)} 
                      className="bg-white p-1 rounded-lg text-orange-600 hover:bg-orange-100 shadow-sm mr-1"
                      title="Edit Jam"
                    >
                      <Edit2 size={14}/>
                    </button>
                    <button 
                      onClick={() => handleDeleteDepartureTime(dt.id)} 
                      className="bg-white p-1 rounded-lg text-red-500 hover:bg-red-50 shadow-sm"
                      title="Hapus Jam"
                    >
                      <Trash2 size={14}/>
                    </button>
                  </div>
                ))}
                {luarKotaDepartureTimes.length === 0 && <p className="text-sm text-gray-400">Belum ada jam keberangkatan.</p>}
              </div>
            </div>
          </div>

          {/* Modal Edit Jam Keberangkatan */}
          {editingDeptId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md space-y-4">
                <h3 className="text-lg font-bold text-gray-800">Edit Jam Keberangkatan</h3>
                <form onSubmit={handleUpdateDepartureTime} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Jam Pemberangkatan</label>
                    <input 
                      type="time" 
                      value={editDeptTime} 
                      onChange={e => setEditDeptTime(e.target.value)} 
                      className="w-full border border-gray-300 rounded-xl p-3 text-sm font-bold focus:border-primary outline-none mt-1" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Kategori Rute</label>
                    <select 
                      value={editDeptRouteType} 
                      onChange={e => setEditDeptRouteType(e.target.value as any)} 
                      className="w-full border border-gray-300 rounded-xl p-3 text-sm font-bold focus:border-primary outline-none mt-1 bg-white"
                    >
                      <option value="DALAM_KOTA">Rute Dalam Daerah (7x)</option>
                      <option value="LUAR_KOTA">Rute Luar Daerah (4x)</option>
                    </select>
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setEditingDeptId(null)} 
                      className="flex-1 bg-gray-100 text-gray-700 font-bold py-2.5 rounded-xl hover:bg-gray-200 transition"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 bg-primary text-white font-bold py-2.5 rounded-xl hover:bg-blue-600 transition"
                    >
                      Simpan Perubahan
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: HARGA TRAVEL REGULER (CARPOOLING) */}
      {activeTab === 'CARPOOL' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <CarFront size={20} className="mr-2 text-primary"/> Atur Harga Travel Reguler
            </h2>
            <form onSubmit={handleSaveCarpoolPrices} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Pilih Rute Perjalanan</label>
                <select 
                  required
                  value={selectedCarpoolRouteId} 
                  onChange={e => {
                    const rId = e.target.value
                    setSelectedCarpoolRouteId(rId)
                    const pObj = carpoolPricesByRoute.find(p => p.route.id === rId)
                    if (pObj && pObj.hasPrices) {
                      setCarpoolFrontPrice(pObj.frontPrice)
                      setCarpoolMidPrice(pObj.midPrice)
                      setCarpoolBackPrice(pObj.backPrice)
                    }
                  }}
                  className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none font-bold bg-white"
                >
                  <option value="" disabled>-- Pilih Rute --</option>
                  {routes.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.route_type === 'DALAM_KOTA' ? 'Dalam Daerah' : 'Luar Daerah'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Harga Kursi Depan (FRONT)</label>
                <input 
                  required 
                  type="number" 
                  value={carpoolFrontPrice} 
                  onChange={e => setCarpoolFrontPrice(e.target.value)} 
                  placeholder="Contoh: 60000" 
                  className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none font-bold" 
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Harga Kursi Tengah (MID)</label>
                <input 
                  required 
                  type="number" 
                  value={carpoolMidPrice} 
                  onChange={e => setCarpoolMidPrice(e.target.value)} 
                  placeholder="Contoh: 50000" 
                  className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none font-bold" 
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Harga Kursi Belakang (BACK)</label>
                <input 
                  required 
                  type="number" 
                  value={carpoolBackPrice} 
                  onChange={e => setCarpoolBackPrice(e.target.value)} 
                  placeholder="Contoh: 50000" 
                  className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none font-bold" 
                />
              </div>

              <button 
                disabled={isRefreshing || !selectedCarpoolRouteId} 
                type="submit" 
                className="w-full bg-gray-900 text-white font-bold rounded-xl py-3 hover:bg-black transition active:scale-95 disabled:opacity-50"
              >
                Simpan Tarif Reguler
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Daftar Tarif Travel Reguler per Rute</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">Nama Rute</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">Tipe Rute</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">Depan</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">Tengah</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">Belakang</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase text-gray-500">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {carpoolPricesByRoute.map(item => (
                    <tr key={item.route.id}>
                      <td className="px-6 py-4 font-bold text-gray-900">{item.route.name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${item.route.route_type === 'DALAM_KOTA' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {item.route.route_type?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-sm text-green-600">
                        {item.frontPrice > 0 ? `Rp ${item.frontPrice.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="px-6 py-4 font-bold text-sm text-blue-600">
                        {item.midPrice > 0 ? `Rp ${item.midPrice.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="px-6 py-4 font-bold text-sm text-purple-600">
                        {item.backPrice > 0 ? `Rp ${item.backPrice.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-right space-x-1">
                        <button 
                          onClick={() => {
                            setSelectedCarpoolRouteId(item.route.id)
                            setCarpoolFrontPrice(item.frontPrice)
                            setCarpoolMidPrice(item.midPrice)
                            setCarpoolBackPrice(item.backPrice)
                          }} 
                          className="text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition"
                          title="Set / Edit Tarif"
                        >
                          <Edit2 size={16}/>
                        </button>
                        {item.hasPrices && (
                          <button 
                            onClick={() => handleDeleteCarpoolPrices(item.route.id)} 
                            className="text-red-500 p-2 hover:bg-red-50 rounded-lg transition"
                            title="Hapus Tarif"
                          >
                            <Trash2 size={16}/>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {carpoolPricesByRoute.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-400 font-medium">Belum ada rute travel reguler. Tambahkan rute di tab Manajemen Rute terlebih dahulu.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SEWA MOBIL (DALAM KOTA - LUAR KOTA) */}
      {activeTab === 'RENTAL' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Car size={20} className="mr-2 text-primary"/> Tambah Jenis Mobil Sewa</h2>
            <form onSubmit={handleAddRentalCar} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Nama / Model Mobil</label>
                <input required type="text" value={newCarName} onChange={e=>setNewCarName(e.target.value)} placeholder="Misal: Avanza / Xenia" className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none font-bold" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Jumlah Kursi Penumpang</label>
                <input required type="number" min="1" value={newCarSeats} onChange={e=>setNewCarSeats(Number(e.target.value))} placeholder="Misal: 6" className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none font-bold" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Tarif Dalam Kota (Rp/Hari)</label>
                <input required type="number" value={newCarInCityPrice} onChange={e=>setNewCarInCityPrice(e.target.value)} placeholder="Contoh: 350000" className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none font-bold" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Tarif Luar Kota (Rp/Hari)</label>
                <input required type="number" value={newCarOutCityPrice} onChange={e=>setNewCarOutCityPrice(e.target.value)} placeholder="Contoh: 500000" className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none font-bold" />
              </div>
              <button disabled={isRefreshing} type="submit" className="w-full bg-gray-900 text-white font-bold rounded-xl py-3 hover:bg-black transition active:scale-95 disabled:opacity-50">
                Simpan Unit Mobil
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Daftar Mobil Sewa Aktif</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">Nama Mobil</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">Kapasitas</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">Dalam Kota</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">Luar Kota</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase text-gray-500">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {rentalCars.map(car => (
                    <tr key={car.id}>
                      <td className="px-6 py-4 font-bold text-gray-900">{car.name}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-700">{car.seats} Kursi</td>
                      <td className="px-6 py-4 font-black text-purple-600 text-sm">Rp {Number(car.inCityPrice).toLocaleString('id-ID')}</td>
                      <td className="px-6 py-4 font-black text-indigo-600 text-sm">Rp {Number(car.outCityPrice).toLocaleString('id-ID')}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDeleteRentalCar(car.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg transition"><Trash2 size={18}/></button>
                      </td>
                    </tr>
                  ))}
                  {rentalCars.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-400 font-medium">Belum ada unit sewa mobil disetel</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: KIRIMAN BARANG (HARGA DASAR + HARGA BERAT KG) */}
      {activeTab === 'PACKAGE' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 max-w-2xl">
          <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center"><PackageIcon size={20} className="mr-2 text-primary"/> Pengaturan Kiriman Barang</h2>
          <p className="text-xs text-gray-500 mb-6">Penhitungan biaya pengiriman barang = Tarif Dasar + (Berat KG x Tarif Per KG).</p>

          <form onSubmit={handleSavePackageSettings} className="space-y-6">
            <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-100 space-y-4">
              <h3 className="font-bold text-orange-900 text-sm">Tarif Dalam Daerah</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase">Harga Dasar (Rp)</label>
                  <input required type="number" value={pkgBaseDalam} onChange={e=>setPkgBaseDalam(Number(e.target.value))} className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm font-bold focus:border-orange-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase">Harga Per KG (Rp)</label>
                  <input required type="number" value={pkgKgDalam} onChange={e=>setPkgKgDalam(Number(e.target.value))} className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm font-bold focus:border-orange-500 outline-none" />
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-4">
              <h3 className="font-bold text-blue-900 text-sm">Tarif Luar Daerah</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase">Harga Dasar (Rp)</label>
                  <input required type="number" value={pkgBaseLuar} onChange={e=>setPkgBaseLuar(Number(e.target.value))} className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm font-bold focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase">Harga Per KG (Rp)</label>
                  <input required type="number" value={pkgKgLuar} onChange={e=>setPkgKgLuar(Number(e.target.value))} className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm font-bold focus:border-blue-500 outline-none" />
                </div>
              </div>
            </div>

            <button disabled={isRefreshing} type="submit" className="w-full bg-gray-900 text-white font-bold rounded-xl py-3 hover:bg-black transition active:scale-95 disabled:opacity-50">
              Simpan Pengaturan Kiriman Barang
            </button>
          </form>
        </div>
      )}

      {/* TAB 5: LAYANAN BANDARA (HARGA JARAK RADIUS) */}
      {activeTab === 'AIRPORT' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 max-w-2xl">
          <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center"><Plane size={20} className="mr-2 text-primary"/> Pengaturan Layanan Bandara</h2>
          <p className="text-xs text-gray-500 mb-6">Penhitungan biaya bandara = Tarif Dasar + (Jarak Radius KM x Tarif per KM).</p>

          <form onSubmit={handleSaveAirportSettings} className="space-y-6">
            <div className="p-4 bg-cyan-50/50 rounded-xl border border-cyan-100 space-y-4">
              <h3 className="font-bold text-cyan-900 text-sm">Mobil Kecil (Maks. 4 Orang)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase">Harga Dasar Bandara (Rp)</label>
                  <input required type="number" value={airportBaseKecil} onChange={e=>setAirportBaseKecil(Number(e.target.value))} className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm font-bold focus:border-cyan-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase">Harga per KM Jarak Radius (Rp)</label>
                  <input required type="number" value={airportKmKecil} onChange={e=>setAirportKmKecil(Number(e.target.value))} className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm font-bold focus:border-cyan-500 outline-none" />
                </div>
              </div>
            </div>

            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-4">
              <h3 className="font-bold text-indigo-900 text-sm">Mobil Besar (Maks. 6-7 Orang)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase">Harga Dasar Bandara (Rp)</label>
                  <input required type="number" value={airportBaseBesar} onChange={e=>setAirportBaseBesar(Number(e.target.value))} className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm font-bold focus:border-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase">Harga per KM Jarak Radius (Rp)</label>
                  <input required type="number" value={airportKmBesar} onChange={e=>setAirportKmBesar(Number(e.target.value))} className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm font-bold focus:border-indigo-500 outline-none" />
                </div>
              </div>
            </div>

            <button disabled={isRefreshing} type="submit" className="w-full bg-gray-900 text-white font-bold rounded-xl py-3 hover:bg-black transition active:scale-95 disabled:opacity-50">
              Simpan Pengaturan Layanan Bandara
            </button>
          </form>
        </div>
      )}

      {/* TAB 6: ROUTES */}
      {activeTab === 'ROUTES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Plus size={20} className="mr-2 text-primary"/> Tambah Rute Baru</h2>
            <form onSubmit={handleAddRoute} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Nama Rute</label>
                <input required type="text" value={newRouteName} onChange={e=>setNewRouteName(e.target.value)} placeholder="Misal: Gorontalo - Suwawa" className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none font-bold" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Tipe Perjalanan</label>
                <select value={newRouteType} onChange={e=>setNewRouteType(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none font-bold bg-white">
                  <option value="DALAM_KOTA">Dalam Daerah</option>
                  <option value="LUAR_KOTA">Luar Daerah</option>
                </select>
              </div>
              <button disabled={isRefreshing} type="submit" className="w-full bg-gray-900 text-white font-bold rounded-xl py-3 hover:bg-black transition active:scale-95 disabled:opacity-50">
                Simpan Rute
              </button>
            </form>
          </div>
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">Nama Rute</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">Tipe</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase text-gray-500">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {routes.map(r => (
                    <tr key={r.id}>
                      <td className="px-6 py-4 font-bold text-gray-900">{r.name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${r.route_type === 'DALAM_KOTA' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {r.route_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDeleteRoute(r.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg transition"><Trash2 size={18}/></button>
                      </td>
                    </tr>
                  ))}
                  {routes.length === 0 && (
                    <tr><td colSpan={3} className="text-center py-8 text-gray-400 font-medium">Belum ada rute</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: BANKS */}
      {activeTab === 'BANKS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Plus size={20} className="mr-2 text-primary"/> Tambah Rekening Bank</h2>
            <form onSubmit={handleAddBank} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Nama Bank</label>
                <input required type="text" value={newBankName} onChange={e=>setNewBankName(e.target.value)} placeholder="Contoh: BCA / Mandiri / BRI" className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none font-bold" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Nomor Rekening</label>
                <input required type="text" value={newAccountNumber} onChange={e=>setNewAccountNumber(e.target.value)} placeholder="Misal: 1234567890" className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none font-bold" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Atas Nama</label>
                <input required type="text" value={newAccountHolder} onChange={e=>setNewAccountHolder(e.target.value)} placeholder="Misal: PT Anindira Trans" className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none font-bold" />
              </div>
              <button disabled={isRefreshing} type="submit" className="w-full bg-gray-900 text-white font-bold rounded-xl py-3 hover:bg-black transition active:scale-95 disabled:opacity-50">
                Simpan Rekening
              </button>
            </form>
          </div>
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">Bank</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">Nomor Rekening</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">Atas Nama</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase text-gray-500">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {banks.map(b => (
                    <tr key={b.id}>
                      <td className="px-6 py-4 font-bold text-gray-900">{b.bank_name}</td>
                      <td className="px-6 py-4 font-mono text-sm text-gray-700">{b.account_number}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{b.account_holder}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDeleteBank(b.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg transition"><Trash2 size={18}/></button>
                      </td>
                    </tr>
                  ))}
                  {banks.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-8 text-gray-400 font-medium">Belum ada rekening bank</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: QRIS */}
      {activeTab === 'QRIS' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><QrCode size={20} className="mr-2 text-primary"/> Unggah Barcode QRIS</h2>
            <form onSubmit={handleUploadQris} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Pilih Gambar Barcode (JPG/PNG)</label>
                <div className="mt-2 flex items-center justify-center w-full">
                  <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-3 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500 font-medium">
                        {qrisFile ? <span className="text-primary font-bold">{qrisFile.name}</span> : <span>Klik untuk mengunggah gambar</span>}
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG atau GIF</p>
                    </div>
                    <input id="dropzone-file" type="file" className="hidden" accept="image/*" onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setQrisFile(e.target.files[0])
                      }
                    }} />
                  </label>
                </div>
              </div>
              
              <button disabled={uploadingQris || !qrisFile} type="submit" className="w-full bg-gray-900 text-white font-bold rounded-xl py-3 hover:bg-black transition active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2">
                {uploadingQris && <RefreshCw size={18} className="animate-spin" />}
                <span>{uploadingQris ? 'Mengunggah...' : 'Simpan QRIS'}</span>
              </button>
            </form>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">QRIS Aktif Saat Ini</h2>
            {qrisImage ? (
              <div className="flex flex-col items-center justify-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                <img src={qrisImage.image_url} alt="QRIS" className="w-full max-w-[250px] object-contain rounded-lg shadow-sm bg-white" />
                <div className="mt-4 flex w-full justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">Status: <span className="text-green-600 font-bold">Aktif</span></span>
                  <button onClick={() => handleDeleteQris(qrisImage.id)} className="text-red-500 font-bold hover:text-red-700 hover:underline">Hapus / Nonaktifkan</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 bg-gray-50 rounded-xl border border-gray-200 text-gray-400">
                <QrCode size={48} className="mb-2 opacity-50" />
                <p className="font-medium">Belum ada QRIS yang aktif</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
