// @ts-nocheck
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Trash2, Map, RefreshCw, Landmark, QrCode, Upload, Settings as SettingsIcon, Clock, TrendingUp, AlertTriangle, Car, Package as PackageIcon, Plane, Edit2, CarFront, Armchair, Users, Check } from 'lucide-react'

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'GLOBAL' | 'SEAT_PRICES' | 'CARPOOL' | 'RENTAL' | 'PACKAGE' | 'AIRPORT' | 'ROUTES' | 'BANKS' | 'QRIS'>('GLOBAL')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Global Settings State
  const [appSettings, setAppSettings] = useState<any>(null)
  const [profitPercentage, setProfitPercentage] = useState<number>(0)
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false)
  const [notificationSoundUrl, setNotificationSoundUrl] = useState<string>('')
  const [soundFile, setSoundFile] = useState<File | null>(null)
  const [, setIsUploadingSound] = useState(false)

  // Seat Facilities Setting
  const [seatFacilities, setSeatFacilities] = useState<{ [key: string]: string }>({
    '1': '', '2': '', '3': '', '4': '', '5': '', '6': '', '7': ''
  })
  const [seatFacilitySettingId, setSeatFacilitySettingId] = useState<string | null>(null)

  // Seat Pricing State (Rute, Jumlah Kursi, Posisi Depan, Tengah, Belakang)
  const [selectedSeatPriceRouteId, setSelectedSeatPriceRouteId] = useState('')
  const [selectedCarCapacity, setSelectedCarCapacity] = useState<'3_SEATS' | '4_SEATS' | '5_SEATS' | '6_SEATS' | '7_SEATS'>('6_SEATS')
  const [priceFront, setPriceFront] = useState<string>('')
  const [priceMid, setPriceMid] = useState<string>('')
  const [priceBack, setPriceBack] = useState<string>('')

  // Carpool Schedules State
  const [carpoolSchedules, setCarpoolSchedules] = useState<any[]>([])
  const [newSchedRouteId, setNewSchedRouteId] = useState('')
  const [newSchedDate, setNewSchedDate] = useState('')
  const [newSchedTime, setNewSchedTime] = useState('')
  const [newSchedCarType, setNewSchedCarType] = useState('6_SEATS')
  const [newSchedPrice, setNewSchedPrice] = useState('')
  const [schedPriceFront, setSchedPriceFront] = useState('')
  const [schedPriceMid, setSchedPriceMid] = useState('')
  const [schedPriceBack, setSchedPriceBack] = useState('')

  // Jam Keberangkatan State (7 times Dalam Kota, 4 times Luar Kota)
  const [departureTimes, setDepartureTimes] = useState<any[]>([])
  const [newDepartureTime, setNewDepartureTime] = useState('')
  const [newDepartureRouteType, setNewDepartureRouteType] = useState<'DALAM_KOTA' | 'LUAR_KOTA'>('DALAM_KOTA')
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null)
  const [editDeptTime, setEditDeptTime] = useState('')
  const [editDeptRouteType, setEditDeptRouteType] = useState<'DALAM_KOTA' | 'LUAR_KOTA'>('DALAM_KOTA')

  // Carpool Pricing State
  const [selectedCarpoolRouteId, setSelectedCarpoolRouteId] = useState('')
  const [carpoolPrices, setCarpoolPrices] = useState<Record<string, number | string>>({
    '1': 60000, '2': 50000, '3': 50000, '4': 50000, '5': 50000, '6': 50000, '7': 50000
  })

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
        setNotificationSoundUrl(settingsData.notification_sound_url || '')
      }

      // Fetch Carpool Schedules
      const { data: schedData } = await supabase.from('carpool_schedules').select('*, routes(*)').order('departure_date', { ascending: true }).order('departure_time', { ascending: true })
      if (schedData) setCarpoolSchedules(schedData)

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
        
        // Parse Seat Facilities
        const pSeatFacilities = pricesData.find(p => p.product_type === 'SETTING' && p.description === 'SEAT_FACILITIES')
        if (pSeatFacilities && pSeatFacilities.seat_type) {
          try {
            setSeatFacilities(JSON.parse(pSeatFacilities.seat_type))
            setSeatFacilitySettingId(pSeatFacilities.id)
          } catch(e) {}
        }
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
      let finalSoundUrl = notificationSoundUrl

      if (soundFile) {
        setIsUploadingSound(true)
        const fileExt = soundFile.name.split('.').pop()
        const fileName = `notif_${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('sounds').upload(fileName, soundFile)
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('sounds').getPublicUrl(fileName)
        finalSoundUrl = urlData.publicUrl
        setNotificationSoundUrl(finalSoundUrl)
        setSoundFile(null)
        setIsUploadingSound(false)
      }

      if (appSettings) {
        const { error } = await supabase.from('app_settings').update({
          profit_percentage: profitPercentage,
          maintenance_mode: maintenanceMode,
          notification_sound_url: finalSoundUrl
        }).eq('id', appSettings.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('app_settings').insert({
          profit_percentage: profitPercentage,
          maintenance_mode: maintenanceMode,
          notification_sound_url: finalSoundUrl
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

  // --- SEAT FACILITIES SETTINGS ---
  const handleSaveSeatFacilities = async () => {
    setIsRefreshing(true)
    setError('')
    setSuccessMsg('')
    try {
      if (seatFacilitySettingId) {
        const { error } = await supabase.from('product_prices').update({
          seat_type: JSON.stringify(seatFacilities)
        }).eq('id', seatFacilitySettingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('product_prices').insert({
          product_type: 'SETTING',
          description: 'SEAT_FACILITIES',
          seat_type: JSON.stringify(seatFacilities),
          base_price: 0
        })
        if (error) throw error
      }
      setSuccessMsg('Fasilitas kursi berhasil disimpan!')
      fetchData()
    } catch (err: any) {
      setError('Gagal menyimpan fasilitas kursi: ' + err.message)
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


  // --- SEAT PRICING LOGIC (RUTE, JUMLAH KURSI, DEPAN, TENGAH, BELAKANG) ---
  const loadSeatPricesForRouteAndCapacity = (routeId: string, capacity: string) => {
    if (!routeId) {
      setPriceFront('')
      setPriceMid('')
      setPriceBack('')
      return
    }

    const routePrices = prices.filter(p => p.product_type === 'CARPOOL' && p.route_id === routeId)
    const capPrices = routePrices.filter(p => p.description === capacity)
    const pFront = capPrices.find(p => p.seat_type === 'DEPAN' || p.seat_type === 'FRONT')
    const pMid = capPrices.find(p => p.seat_type === 'TENGAH' || p.seat_type === 'MID')
    const pBack = capPrices.find(p => p.seat_type === 'BELAKANG' || p.seat_type === 'BACK')

    if (pFront || pMid || pBack) {
      setPriceFront(pFront ? String(Number(pFront.base_price)) : '')
      setPriceMid(pMid ? String(Number(pMid.base_price)) : '')
      setPriceBack(pBack ? String(Number(pBack.base_price)) : '')
      return
    }

    // Generic fallback if not configured per capacity yet
    const genFront = routePrices.find(p => p.seat_type === 'DEPAN' || p.seat_type === 'FRONT')
    const genMid = routePrices.find(p => p.seat_type === 'TENGAH' || p.seat_type === 'MID')
    const genBack = routePrices.find(p => p.seat_type === 'BELAKANG' || p.seat_type === 'BACK')
    if (genFront || genMid || genBack) {
      setPriceFront(genFront ? String(Number(genFront.base_price)) : '')
      setPriceMid(genMid ? String(Number(genMid.base_price)) : '')
      setPriceBack(genBack ? String(Number(genBack.base_price)) : '')
      return
    }

    // Numeric seat fallback
    const p1 = routePrices.find(p => p.seat_type === '1')
    const p2 = routePrices.find(p => p.seat_type === '2')
    const pBackNum = routePrices.find(p => p.seat_type === '5' || p.seat_type === '6' || p.seat_type === '7')
    setPriceFront(p1 ? String(Number(p1.base_price)) : '')
    setPriceMid(p2 ? String(Number(p2.base_price)) : '')
    setPriceBack(pBackNum ? String(Number(pBackNum.base_price)) : '')
  }

  const handleSelectSeatPriceRoute = (routeId: string) => {
    setSelectedSeatPriceRouteId(routeId)
    loadSeatPricesForRouteAndCapacity(routeId, selectedCarCapacity)
  }

  const handleSelectCarCapacity = (capacity: '3_SEATS' | '4_SEATS' | '5_SEATS' | '6_SEATS' | '7_SEATS') => {
    setSelectedCarCapacity(capacity)
    loadSeatPricesForRouteAndCapacity(selectedSeatPriceRouteId, capacity)
  }

  const handleSaveSeatPrices = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSeatPriceRouteId) {
      setError('Silakan pilih rute perjalanan terlebih dahulu')
      return
    }
    if (!priceFront || !priceMid) {
      setError('Harga kursi Depan dan Tengah wajib diisi')
      return
    }
    const hasBackRow = selectedCarCapacity !== '3_SEATS' && selectedCarCapacity !== '4_SEATS'
    if (hasBackRow && !priceBack) {
      setError('Harga kursi Belakang wajib diisi untuk mobil berkapasitas 5, 6, atau 7 kursi')
      return
    }

    setIsRefreshing(true)
    setError('')
    setSuccessMsg('')

    try {
      const numFront = Number(priceFront)
      const numMid = Number(priceMid)
      const numBack = hasBackRow ? Number(priceBack) : 0

      // Rows for position types (DEPAN, TENGAH, BELAKANG) tagged with capacity description
      const rowPositions = [
        { seat_type: 'DEPAN', base_price: numFront },
        { seat_type: 'TENGAH', base_price: numMid },
        ...(hasBackRow ? [{ seat_type: 'BELAKANG', base_price: numBack }] : [])
      ]

      // Also map to individual seat numbers for seamless compatibility
      const seatCount = parseInt(selectedCarCapacity.split('_')[0]) || 6
      const seatNumberMap: { seat_type: string; base_price: number }[] = []
      for (let s = 1; s <= seatCount; s++) {
        if (s === 1) {
          seatNumberMap.push({ seat_type: String(s), base_price: numFront })
        } else if (selectedCarCapacity === '3_SEATS' || selectedCarCapacity === '4_SEATS') {
          seatNumberMap.push({ seat_type: String(s), base_price: numMid })
        } else if (selectedCarCapacity === '5_SEATS') {
          seatNumberMap.push({ seat_type: String(s), base_price: s <= 3 ? numMid : numBack })
        } else if (selectedCarCapacity === '6_SEATS' || selectedCarCapacity === '7_SEATS') {
          seatNumberMap.push({ seat_type: String(s), base_price: s <= 4 ? numMid : numBack })
        }
      }

      // Delete existing records for this route & capacity
      await supabase
        .from('product_prices')
        .delete()
        .eq('product_type', 'CARPOOL')
        .eq('route_id', selectedSeatPriceRouteId)
        .eq('description', selectedCarCapacity)

      const payload = [
        ...rowPositions.map(r => ({
          product_type: 'CARPOOL',
          route_id: selectedSeatPriceRouteId,
          seat_type: r.seat_type,
          base_price: r.base_price,
          description: selectedCarCapacity
        })),
        ...seatNumberMap.map(s => ({
          product_type: 'CARPOOL',
          route_id: selectedSeatPriceRouteId,
          seat_type: s.seat_type,
          base_price: s.base_price,
          description: selectedCarCapacity
        }))
      ]

      const { error: insertError } = await supabase.from('product_prices').insert(payload)
      if (insertError) throw insertError

      // Also ensure generic DEPAN, TENGAH, BELAKANG exist if none
      const genericExisting = prices.filter(p => p.product_type === 'CARPOOL' && p.route_id === selectedSeatPriceRouteId && (!p.description || p.description === ''))
      if (genericExisting.length === 0) {
        await supabase.from('product_prices').insert([
          { product_type: 'CARPOOL', route_id: selectedSeatPriceRouteId, seat_type: 'DEPAN', base_price: numFront, description: '' },
          { product_type: 'CARPOOL', route_id: selectedSeatPriceRouteId, seat_type: 'TENGAH', base_price: numMid, description: '' },
          ...(hasBackRow ? [{ product_type: 'CARPOOL', route_id: selectedSeatPriceRouteId, seat_type: 'BELAKANG', base_price: numBack, description: '' }] : [])
        ])
      }

      const routeObj = routes.find(r => r.id === selectedSeatPriceRouteId)
      setSuccessMsg(`Harga kursi untuk rute ${routeObj?.name || ''} (${selectedCarCapacity.replace('_', ' ')}) berhasil disimpan!`)
      fetchData()
    } catch (err: any) {
      setError('Gagal menyimpan harga kursi: ' + err.message)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleDeleteSeatPrices = async (routeId: string, capacity?: string) => {
    if (!confirm('Hapus pengaturan harga kursi ini?')) return
    setIsRefreshing(true)
    setError('')
    setSuccessMsg('')
    try {
      let query = supabase.from('product_prices').delete().eq('product_type', 'CARPOOL').eq('route_id', routeId)
      if (capacity) {
        query = query.eq('description', capacity)
      }
      const { error } = await query
      if (error) throw error
      setSuccessMsg('Pengaturan harga kursi berhasil dihapus!')
      fetchData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsRefreshing(false)
    }
  }

  // --- CARPOOL SCHEDULES LOGIC ---
  // Auto-fill schedule front/mid/back prices when schedule route or car type changes
  useEffect(() => {
    if (!newSchedRouteId) return
    const routePrices = prices.filter(p => p.product_type === 'CARPOOL' && p.route_id === newSchedRouteId)
    const capPrices = routePrices.filter(p => p.description === newSchedCarType)
    const pFront = capPrices.find(p => p.seat_type === 'DEPAN' || p.seat_type === 'FRONT') || routePrices.find(p => p.seat_type === 'DEPAN' || p.seat_type === 'FRONT') || routePrices.find(p => p.seat_type === '1')
    const pMid = capPrices.find(p => p.seat_type === 'TENGAH' || p.seat_type === 'MID') || routePrices.find(p => p.seat_type === 'TENGAH' || p.seat_type === 'MID') || routePrices.find(p => p.seat_type === '2')
    const pBack = capPrices.find(p => p.seat_type === 'BELAKANG' || p.seat_type === 'BACK') || routePrices.find(p => p.seat_type === 'BELAKANG' || p.seat_type === 'BACK') || routePrices.find(p => p.seat_type === '5' || p.seat_type === '6')

    if (pFront) setSchedPriceFront(String(Number(pFront.base_price)))
    if (pMid) setSchedPriceMid(String(Number(pMid.base_price)))
    if (pBack) setSchedPriceBack(String(Number(pBack.base_price)))
    if (pFront && !newSchedPrice) setNewSchedPrice(String(Number(pFront.base_price)))
  }, [newSchedRouteId, newSchedCarType, prices])

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSchedRouteId || !newSchedDate || !newSchedTime || !newSchedCarType) return
    setIsRefreshing(true)
    setError('')
    
    // Build seat_prices JSON using front, mid, and back prices
    const numSeats = parseInt(newSchedCarType.split('_')[0]) || 6
    const hasBack = newSchedCarType !== '3_SEATS' && newSchedCarType !== '4_SEATS'
    const frontVal = Number(schedPriceFront) || Number(newSchedPrice) || 0
    const midVal = Number(schedPriceMid) || Number(newSchedPrice) || 0
    const backVal = hasBack ? (Number(schedPriceBack) || Number(newSchedPrice) || 0) : 0

    let seatPrices: any = {}
    for (let i = 1; i <= numSeats; i++) {
      if (i === 1) {
        seatPrices[String(i)] = frontVal
      } else if (newSchedCarType === '3_SEATS' || newSchedCarType === '4_SEATS') {
        seatPrices[String(i)] = midVal
      } else if (newSchedCarType === '5_SEATS') {
        seatPrices[String(i)] = i <= 3 ? midVal : backVal
      } else if (newSchedCarType === '6_SEATS' || newSchedCarType === '7_SEATS') {
        seatPrices[String(i)] = i <= 4 ? midVal : backVal
      }
    }

    const { error } = await supabase.from('carpool_schedules').insert({
      route_id: newSchedRouteId,
      departure_date: newSchedDate,
      departure_time: newSchedTime,
      car_type: newSchedCarType,
      seat_prices: seatPrices,
      is_active: true
    })

    setIsRefreshing(false)
    if (!error) {
      setNewSchedDate('')
      setNewSchedTime('')
      setSuccessMsg('Jadwal Armada berhasil ditambahkan!')
      fetchData()
    } else {
      setError('Gagal menambah jadwal: ' + error.message)
    }
  }

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Hapus jadwal ini?')) return
    setIsRefreshing(true)
    const { error } = await supabase.from('carpool_schedules').delete().eq('id', id)
    setIsRefreshing(false)
    if (!error) {
      fetchData()
    } else {
      setError('Gagal menghapus jadwal: ' + error.message)
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

  // Group saved seat prices by route and capacity for overview table
  const savedSeatPricesList: any[] = []
  routes.forEach(r => {
    const routePrices = prices.filter(p => p.product_type === 'CARPOOL' && p.route_id === r.id)
    const capacities = ['3_SEATS', '4_SEATS', '5_SEATS', '6_SEATS', '7_SEATS']
    capacities.forEach(cap => {
      const capPrices = routePrices.filter(p => p.description === cap)
      const pFront = capPrices.find(p => p.seat_type === 'DEPAN' || p.seat_type === 'FRONT')
      const pMid = capPrices.find(p => p.seat_type === 'TENGAH' || p.seat_type === 'MID')
      const pBack = capPrices.find(p => p.seat_type === 'BELAKANG' || p.seat_type === 'BACK')
      
      if (pFront || pMid || pBack) {
        savedSeatPricesList.push({
          route: r,
          capacity: cap,
          priceFront: pFront ? Number(pFront.base_price) : 0,
          priceMid: pMid ? Number(pMid.base_price) : 0,
          priceBack: pBack ? Number(pBack.base_price) : 0
        })
      }
    })

    // Also check for legacy generic prices if not configured per capacity
    const hasExplicit = savedSeatPricesList.some(s => s.route.id === r.id)
    if (!hasExplicit && routePrices.length > 0) {
      const genFront = routePrices.find(p => p.seat_type === 'DEPAN' || p.seat_type === 'FRONT') || routePrices.find(p => p.seat_type === '1')
      const genMid = routePrices.find(p => p.seat_type === 'TENGAH' || p.seat_type === 'MID') || routePrices.find(p => p.seat_type === '2')
      const genBack = routePrices.find(p => p.seat_type === 'BELAKANG' || p.seat_type === 'BACK') || routePrices.find(p => p.seat_type === '5' || p.seat_type === '6')

      if (genFront || genMid || genBack) {
        savedSeatPricesList.push({
          route: r,
          capacity: '6_SEATS',
          isGeneric: true,
          priceFront: genFront ? Number(genFront.base_price) : 0,
          priceMid: genMid ? Number(genMid.base_price) : 0,
          priceBack: genBack ? Number(genBack.base_price) : 0
        })
      }
    }
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Pengaturan Sistem Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola Jam Pemberangkatan, Harga Kursi Travel, Jadwal Armada, Sewa Mobil, Kiriman Barang, Bandara, Rute, & Pembayaran</p>
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
          className={`flex items-center space-x-2 px-4 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'SEAT_FACILITIES' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('SEAT_FACILITIES')}
        >
          <Armchair size={18} />
          <span>Fasilitas Kursi</span>
        </button>
        <button
          className={`flex items-center space-x-2 px-4 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'SEAT_PRICES' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('SEAT_PRICES')}
        >
          <Armchair size={18} />
          <span>Harga Kursi</span>
        </button>
        <button
          className={`flex items-center space-x-2 px-4 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'CARPOOL' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('CARPOOL')}
        >
          <CarFront size={18} />
          <span>Jadwal Armada Travel</span>
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
          <span>QRIS</span>
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

            <div>
              <label className="text-sm font-bold text-gray-700">Notifikasi Suara Pesanan Baru (Admin)</label>
              <div className="mt-2 space-y-2">
                <input 
                  type="file" 
                  accept="audio/mp3,audio/wav"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setSoundFile(e.target.files[0])
                    }
                  }}
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm font-bold text-gray-800"
                />
                {notificationSoundUrl && !soundFile && (
                  <div className="text-xs text-green-600 font-bold flex items-center">
                    ✓ Suara custom sudah diatur
                    <button type="button" onClick={() => setNotificationSoundUrl('')} className="ml-2 text-red-500 hover:underline">Hapus</button>
                  </div>
                )}
                {soundFile && (
                  <div className="text-xs text-blue-600 font-bold">File dipilih: {soundFile.name}</div>
                )}
              </div>
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

      {/* TAB 2: FASILITAS KURSI */}
      {activeTab === 'SEAT_FACILITIES' && (
        <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <Armchair className="mr-2 text-primary" /> Pengaturan Fasilitas Tambahan Kursi
            </h2>
            <p className="text-sm text-gray-500 mb-6">Tambahkan label fasilitas untuk masing-masing nomor kursi (misal: "Full AC", "Lebih Luas", "Samping Sopir"). Label ini akan muncul di bawah pilihan kursi di halaman pemesanan Carpool saat kursi tersebut dipilih penumpang.</p>
            
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                <div key={num} className="flex items-center space-x-4">
                  <div className="w-20 font-bold text-gray-700">Kursi {num}</div>
                  <input
                    type="text"
                    placeholder={`Fasilitas Kursi ${num} (Opsional)`}
                    value={seatFacilities[String(num)] || ''}
                    onChange={(e) => setSeatFacilities({...seatFacilities, [String(num)]: e.target.value})}
                    className="flex-1 border border-gray-300 rounded-lg p-2 text-sm focus:border-primary outline-none"
                  />
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-end">
              <button 
                onClick={handleSaveSeatFacilities}
                disabled={isRefreshing}
                className="bg-primary hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition active:scale-95 disabled:opacity-50"
              >
                {isRefreshing ? 'Menyimpan...' : 'Simpan Fasilitas Kursi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: HARGA KURSI */}
      {activeTab === 'SEAT_PRICES' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* FORM PENGATURAN HARGA KURSI */}
          <div className="xl:col-span-5 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-800 flex items-center">
                <Armchair size={22} className="mr-2 text-primary"/> Pengaturan Harga Kursi
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Atur tarif travel reguler berdasarkan rute, kapasitas jumlah kursi, dan posisi tempat duduk.
              </p>
            </div>

            <form onSubmit={handleSaveSeatPrices} className="space-y-5">
              {/* 1. PILIH RUTE */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 flex items-center">
                  <Map size={14} className="mr-1.5 text-primary"/> 1. Pilih Rute
                </label>
                <select 
                  required 
                  value={selectedSeatPriceRouteId} 
                  onChange={e => handleSelectSeatPriceRoute(e.target.value)} 
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:border-primary focus:ring-2 focus:ring-blue-100 outline-none font-bold bg-white text-gray-800 transition shadow-sm"
                >
                  <option value="" disabled>-- Pilih Rute --</option>
                  {routes.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.route_type === 'DALAM_KOTA' ? 'Dalam Daerah' : 'Luar Daerah'})
                    </option>
                  ))}
                </select>
                {selectedSeatPriceRouteId && (
                  <div className="mt-1.5 text-xs text-blue-600 font-semibold flex items-center">
                    <Check size={12} className="mr-1"/> Rute: {routes.find(r => r.id === selectedSeatPriceRouteId)?.name}
                  </div>
                )}
              </div>

              {/* 2. PILIH JUMLAH KURSI */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 flex items-center">
                  <Users size={14} className="mr-1.5 text-primary"/> 2. Pilih Jumlah Kursi
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: '3_SEATS', label: 'Kursi 3', desc: '1 Depan, 2 Tengah' },
                    { id: '4_SEATS', label: 'Kursi 4', desc: '1 Depan, 3 Tengah' },
                    { id: '5_SEATS', label: 'Kursi 5', desc: '1 Depan, 2 Tengah, 2 Blkg' },
                    { id: '6_SEATS', label: 'Kursi 6', desc: '1 Depan, 3 Tengah, 2 Blkg' },
                    { id: '7_SEATS', label: 'Kursi 7', desc: '1 Depan, 3 Tengah, 3 Blkg' },
                  ].map(cap => (
                    <button
                      type="button"
                      key={cap.id}
                      onClick={() => handleSelectCarCapacity(cap.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${selectedCarCapacity === cap.id ? 'border-primary bg-blue-50/80 shadow-sm ring-2 ring-primary/20' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-xs font-black ${selectedCarCapacity === cap.id ? 'text-primary' : 'text-gray-800'}`}>
                          {cap.label}
                        </span>
                        {selectedCarCapacity === cap.id && <Check size={14} className="text-primary"/>}
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1 leading-tight">{cap.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. HARGA KURSI */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center">
                  <Armchair size={14} className="mr-1.5 text-primary"/> 3. Harga Kursi
                </label>

                {/* Depan */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-gray-700">Depan</label>
                    <span className="text-[10px] text-gray-500">Kursi 1 (Samping Supir)</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-bold text-gray-500">Rp</span>
                    <input 
                      required
                      type="number"
                      value={priceFront}
                      onChange={e => setPriceFront(e.target.value)}
                      placeholder="Contoh: 80000"
                      className="w-full border border-gray-300 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold focus:border-primary outline-none bg-white text-gray-800"
                    />
                  </div>
                </div>

                {/* Tengah */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-gray-700">Tengah</label>
                    <span className="text-[10px] text-gray-500">
                      {selectedCarCapacity === '3_SEATS' || selectedCarCapacity === '5_SEATS' ? 'Kursi 2, 3' : 'Kursi 2, 3, 4'}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-bold text-gray-500">Rp</span>
                    <input 
                      required
                      type="number"
                      value={priceMid}
                      onChange={e => setPriceMid(e.target.value)}
                      placeholder="Contoh: 70000"
                      className="w-full border border-gray-300 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold focus:border-primary outline-none bg-white text-gray-800"
                    />
                  </div>
                </div>

                {/* Belakang */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className={`text-xs font-bold ${selectedCarCapacity === '3_SEATS' || selectedCarCapacity === '4_SEATS' ? 'text-gray-400' : 'text-gray-700'}`}>
                      Belakang
                    </label>
                    <span className="text-[10px] text-gray-400">
                      {selectedCarCapacity === '5_SEATS' ? 'Kursi 4, 5' : selectedCarCapacity === '6_SEATS' ? 'Kursi 5, 6' : selectedCarCapacity === '7_SEATS' ? 'Kursi 5, 6, 7' : '(Tidak ada)'}
                    </span>
                  </div>
                  {selectedCarCapacity === '3_SEATS' || selectedCarCapacity === '4_SEATS' ? (
                    <div className="w-full border border-dashed border-gray-300 rounded-xl py-2.5 px-3 text-xs text-gray-400 bg-gray-100 font-medium italic">
                      Mobil {selectedCarCapacity.replace('_', ' ')} tidak memiliki baris belakang
                    </div>
                  ) : (
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs font-bold text-gray-500">Rp</span>
                      <input 
                        required
                        type="number"
                        value={priceBack}
                        onChange={e => setPriceBack(e.target.value)}
                        placeholder="Contoh: 60000"
                        className="w-full border border-gray-300 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold focus:border-primary outline-none bg-white text-gray-800"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* VISUAL CAR CABIN PREVIEW */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center">
                    <CarFront size={14} className="mr-1 text-primary"/> Preview Tata Letak & Tarif Kursi
                  </span>
                  <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                    {selectedCarCapacity.replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-2.5 max-w-[280px] mx-auto bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm text-center">
                  {/* Baris 1: Depan */}
                  <div className="flex justify-between items-center border-b border-dashed pb-2">
                    <div className="flex-1 bg-blue-50 border border-blue-200 p-2 rounded-lg text-left">
                      <div className="text-[10px] font-bold text-primary">K1 (Depan)</div>
                      <div className="text-xs font-black text-gray-800">
                        {priceFront ? `Rp ${Number(priceFront).toLocaleString('id-ID')}` : '-'}
                      </div>
                    </div>
                    <div className="w-12 ml-2 bg-gray-100 border border-gray-200 p-2 rounded-lg text-[10px] font-bold text-gray-400 text-center">
                      Sopir
                    </div>
                  </div>

                  {/* Baris 2: Tengah */}
                  <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg text-center">
                    <div className="text-[10px] font-bold text-amber-800">
                      Baris Tengah ({selectedCarCapacity === '3_SEATS' || selectedCarCapacity === '5_SEATS' ? '2 Kursi' : '3 Kursi'})
                    </div>
                    <div className="text-xs font-black text-gray-800 mt-0.5">
                      {priceMid ? `Rp ${Number(priceMid).toLocaleString('id-ID')}` : '-'} / kursi
                    </div>
                  </div>

                  {/* Baris 3: Belakang */}
                  {selectedCarCapacity !== '3_SEATS' && selectedCarCapacity !== '4_SEATS' ? (
                    <div className="bg-purple-50 border border-purple-200 p-2 rounded-lg text-center">
                      <div className="text-[10px] font-bold text-purple-800">
                        Baris Belakang ({selectedCarCapacity === '7_SEATS' ? '3 Kursi' : '2 Kursi'})
                      </div>
                      <div className="text-xs font-black text-gray-800 mt-0.5">
                        {priceBack ? `Rp ${Number(priceBack).toLocaleString('id-ID')}` : '-'} / kursi
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-gray-400 italic py-1">
                      (Tidak ada baris belakang)
                    </div>
                  )}
                </div>
              </div>

              <button 
                disabled={isRefreshing || !selectedSeatPriceRouteId} 
                type="submit" 
                className="w-full bg-gray-900 text-white font-bold rounded-xl py-3.5 hover:bg-black transition active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg shadow-gray-900/10"
              >
                <Check size={18} />
                <span>Simpan Pengaturan Harga Kursi</span>
              </button>
            </form>
          </div>

          {/* DAFTAR TARIF KURSI TERSIMPAN */}
          <div className="xl:col-span-7 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-fit">
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Daftar Pengaturan Harga Kursi per Rute</h2>
                <p className="text-xs text-gray-500 mt-0.5">Tarif yang aktif digunakan saat penumpang memesan travel reguler</p>
              </div>
              <span className="text-xs font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded-full w-fit">
                {savedSeatPricesList.length} Pengaturan Aktif
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase text-gray-500">Rute & Tipe</th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase text-gray-500">Kapasitas</th>
                    <th className="px-5 py-3.5 text-left text-xs font-bold uppercase text-gray-500">Tarif Posisi Kursi</th>
                    <th className="px-5 py-3.5 text-right text-xs font-bold uppercase text-gray-500">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {savedSeatPricesList.map((item, idx) => (
                    <tr key={`${item.route.id}_${item.capacity}_${idx}`} className="hover:bg-gray-50/60 transition">
                      <td className="px-5 py-4">
                        <div className="font-bold text-gray-900 text-sm">{item.route.name}</div>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${item.route.route_type === 'DALAM_KOTA' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {item.route.route_type === 'DALAM_KOTA' ? 'Dalam Daerah' : 'Luar Daerah'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-gray-100 text-gray-800">
                          {item.capacity.split('_')[0]} Kursi
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Depan</span>
                            <span className="font-bold text-gray-800">Rp {item.priceFront.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">Tengah</span>
                            <span className="font-bold text-gray-800">Rp {item.priceMid.toLocaleString('id-ID')}</span>
                          </div>
                          {item.capacity !== '3_SEATS' && item.capacity !== '4_SEATS' && item.priceBack > 0 && (
                            <div className="flex items-center space-x-1.5">
                              <span className="text-[10px] font-extrabold uppercase bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">Belakang</span>
                              <span className="font-bold text-gray-800">Rp {item.priceBack.toLocaleString('id-ID')}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSeatPriceRouteId(item.route.id)
                              setSelectedCarCapacity(item.capacity)
                              setPriceFront(String(item.priceFront))
                              setPriceMid(String(item.priceMid))
                              setPriceBack(item.priceBack ? String(item.priceBack) : '')
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit Tarif"
                          >
                            <Edit2 size={16}/>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSeatPrices(item.route.id, item.capacity)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Hapus Tarif"
                          >
                            <Trash2 size={16}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {savedSeatPricesList.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-gray-400 font-medium">
                        Belum ada pengaturan harga kursi. Silakan atur menggunakan formulir di sebelah kiri.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CARPOOL SCHEDULES */}
      {activeTab === 'CARPOOL' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <CarFront size={20} className="mr-2 text-primary"/> Tambah Jadwal Armada
            </h2>
            <form onSubmit={handleAddSchedule} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Pilih Rute Perjalanan</label>
                <select required value={newSchedRouteId} onChange={e => setNewSchedRouteId(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none font-bold bg-white">
                  <option value="" disabled>-- Pilih Rute --</option>
                  {routes.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.route_type === 'DALAM_KOTA' ? 'Dalam Daerah' : 'Luar Daerah'})</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Tanggal Berangkat</label>
                  <input required type="date" value={newSchedDate} onChange={e => setNewSchedDate(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none font-bold" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Jam (Contoh: 09:00)</label>
                  <input required type="time" value={newSchedTime} onChange={e => setNewSchedTime(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none font-bold" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Jenis Mobil (Layout Kursi)</label>
                <select required value={newSchedCarType} onChange={e => setNewSchedCarType(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none font-bold bg-white">
                  <option value="3_SEATS">Mobil 3 Kursi (1 Depan, 2 Tengah)</option>
                  <option value="4_SEATS">Mobil 4 Kursi (1 Depan, 3 Tengah)</option>
                  <option value="5_SEATS">Mobil 5 Kursi (1 Depan, 2 Tengah, 2 Belakang)</option>
                  <option value="6_SEATS">Mobil 6 Kursi (1 Depan, 3 Tengah, 2 Belakang)</option>
                  <option value="7_SEATS">Mobil 7 Kursi (1 Depan, 3 Tengah, 3 Belakang)</option>
                </select>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <label className="text-xs font-bold text-gray-700 uppercase flex items-center justify-between">
                  <span>Tarif Kursi Armada</span>
                  <span className="text-[10px] text-primary font-normal">Otomatis dari Harga Kursi</span>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Kursi Depan (Rp)</label>
                    <input 
                      required 
                      type="number" 
                      value={schedPriceFront} 
                      onChange={e => setSchedPriceFront(e.target.value)} 
                      placeholder="Contoh: 80000" 
                      className="mt-0.5 w-full border border-gray-300 rounded-lg p-2 text-xs focus:border-primary outline-none font-bold bg-white" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Kursi Tengah (Rp)</label>
                    <input 
                      required 
                      type="number" 
                      value={schedPriceMid} 
                      onChange={e => setSchedPriceMid(e.target.value)} 
                      placeholder="Contoh: 70000" 
                      className="mt-0.5 w-full border border-gray-300 rounded-lg p-2 text-xs focus:border-primary outline-none font-bold bg-white" 
                    />
                  </div>
                </div>

                {newSchedCarType !== '3_SEATS' && newSchedCarType !== '4_SEATS' && (
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Kursi Belakang (Rp)</label>
                    <input 
                      required 
                      type="number" 
                      value={schedPriceBack} 
                      onChange={e => setSchedPriceBack(e.target.value)} 
                      placeholder="Contoh: 60000" 
                      className="mt-0.5 w-full border border-gray-300 rounded-lg p-2 text-xs focus:border-primary outline-none font-bold bg-white" 
                    />
                  </div>
                )}
              </div>

              <button disabled={isRefreshing} type="submit" className="w-full bg-gray-900 text-white font-bold rounded-xl py-3 hover:bg-black transition active:scale-95 disabled:opacity-50">
                Buat Jadwal Armada
              </button>
            </form>
          </div>

          <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Daftar Jadwal Armada Aktif</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">Jadwal & Rute</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">Mobil & Tarif Kursi</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase text-gray-500">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {carpoolSchedules.map(sched => (
                    <tr key={sched.id}>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{sched.routes?.name || '-'}</div>
                        <div className="text-sm text-gray-500 mt-1">{sched.departure_date} • {sched.departure_time} WIB</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-blue-600">{sched.car_type.split('_')[0]} Kursi</div>
                        <div className="text-xs font-semibold text-gray-700 mt-1 space-x-1.5">
                          <span>Depan: Rp {Number(sched.seat_prices?.['1'] || 0).toLocaleString('id-ID')}</span>
                          <span>• Tengah: Rp {Number(sched.seat_prices?.['2'] || 0).toLocaleString('id-ID')}</span>
                          {sched.seat_prices?.['5'] && <span>• Belakang: Rp {Number(sched.seat_prices?.['5'] || 0).toLocaleString('id-ID')}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDeleteSchedule(sched.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg transition" title="Hapus Jadwal"><Trash2 size={18}/></button>
                      </td>
                    </tr>
                  ))}
                  {carpoolSchedules.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center py-8 text-gray-400 font-medium">Belum ada jadwal armada. Silakan buat di sebelah kiri.</td>
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
