import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Trash2, Map, Tag, RefreshCw, Landmark } from 'lucide-react'

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'ROUTES' | 'PRICES' | 'BANKS'>('ROUTES')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')

  // Routes State
  const [routes, setRoutes] = useState<any[]>([])
  const [newRouteName, setNewRouteName] = useState('')
  const [newRouteType, setNewRouteType] = useState('DALAM_KOTA')

  // Prices State
  const [prices, setPrices] = useState<any[]>([])
  const [newProductType, setNewProductType] = useState('CARPOOL')
  const [newPriceRouteId, setNewPriceRouteId] = useState('')
  const [newSeatType, setNewSeatType] = useState('')
  const [newBasePrice, setNewBasePrice] = useState('')
  const [newDescription, setNewDescription] = useState('')

  // Banks State
  const [banks, setBanks] = useState<any[]>([])
  const [newBankName, setNewBankName] = useState('')
  const [newAccountNumber, setNewAccountNumber] = useState('')
  const [newAccountHolder, setNewAccountHolder] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsRefreshing(true)
    setError('')
    try {
      // Fetch routes
      const { data: routesData, error: routesError } = await supabase
        .from('routes')
        .select('*')
        .order('created_at', { ascending: false })
        
      if (routesError) throw new Error('Rute Error: ' + routesError.message)
      setRoutes(routesData || [])

      // Fetch prices
      const { data: pricesData, error: pricesError } = await supabase
        .from('product_prices')
        .select('*')
        .order('created_at', { ascending: false })
        
      if (pricesError) throw new Error('Harga Error: ' + pricesError.message)
      setPrices(pricesData || [])

      // Fetch banks
      const { data: banksData, error: banksError } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('created_at', { ascending: false })
        
      if (banksError) throw new Error('Bank Error: ' + banksError.message)
      setBanks(banksData || [])

    } catch (err: any) {
      console.error(err)
      setError('Gagal memuat data: ' + err.message)
    } finally {
      setIsRefreshing(false)
    }
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

  // --- PRICES LOGIC ---
  const handleAddPrice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBasePrice) return
    setIsRefreshing(true)
    const { error } = await supabase.from('product_prices').insert({
      product_type: newProductType,
      route_id: newProductType === 'CARPOOL' && newPriceRouteId ? newPriceRouteId : null,
      seat_type: newProductType === 'CARPOOL' ? newSeatType : null,
      base_price: Number(newBasePrice),
      description: newDescription
    })
    setIsRefreshing(false)
    if (!error) {
      setNewBasePrice('')
      setNewDescription('')
      setNewSeatType('')
      fetchData()
    } else {
      setError(error.message)
    }
  }

  const handleDeletePrice = async (id: string) => {
    if (!confirm('Hapus harga ini?')) return
    setIsRefreshing(true)
    const { error } = await supabase.from('product_prices').delete().eq('id', id)
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Pengaturan Layanan</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola Rute Perjalanan dan Daftar Harga Layanan</p>
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

      <div className="flex space-x-2 border-b border-gray-200">
        <button
          className={`flex items-center space-x-2 px-4 py-3 font-bold border-b-2 transition-colors ${activeTab === 'ROUTES' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('ROUTES')}
        >
          <Map size={18} />
          <span>Manajemen Rute</span>
        </button>
        <button
          className={`flex items-center space-x-2 px-4 py-3 font-bold border-b-2 transition-colors ${activeTab === 'PRICES' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('PRICES')}
        >
          <Tag size={18} />
          <span>Manajemen Harga & Jasa</span>
        </button>
        <button
          className={`flex items-center space-x-2 px-4 py-3 font-bold border-b-2 transition-colors ${activeTab === 'BANKS' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('BANKS')}
        >
          <Landmark size={18} />
          <span>Rekening Pembayaran</span>
        </button>
      </div>

      {activeTab === 'ROUTES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Plus size={20} className="mr-2 text-primary"/> Tambah Rute Baru</h2>
            <form onSubmit={handleAddRoute} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Nama Rute</label>
                <input required type="text" value={newRouteName} onChange={e=>setNewRouteName(e.target.value)} placeholder="Misal: Gorontalo - Suwawa" className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Tipe Perjalanan</label>
                <select value={newRouteType} onChange={e=>setNewRouteType(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none">
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

      {activeTab === 'PRICES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Plus size={20} className="mr-2 text-primary"/> Tambah Harga Jasa</h2>
            <form onSubmit={handleAddPrice} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Tipe Layanan</label>
                <select value={newProductType} onChange={e=>setNewProductType(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none">
                  <option value="CARPOOL">Carpool</option>
                  <option value="TITIP_BARANG">Titip Barang (Package)</option>
                  <option value="ANTAR_BANDARA">Antar Bandara</option>
                  <option value="SEWA_MOBIL">Sewa Mobil (Rental)</option>
                </select>
              </div>
              
              {newProductType === 'CARPOOL' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Pilih Rute Induk</label>
                    <select required value={newPriceRouteId} onChange={e=>setNewPriceRouteId(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none">
                      <option value="" disabled>Pilih Rute...</option>
                      {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                </>
              )}

              {newProductType === 'TITIP_BARANG' && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Kategori Ukuran</label>
                  <select required value={newDescription} onChange={e=>setNewDescription(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none">
                    <option value="" disabled>Pilih Ukuran...</option>
                    <option value="KECIL">Paket Kecil</option>
                    <option value="SEDANG">Paket Sedang</option>
                    <option value="BESAR">Paket Besar</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Harga Dasar (Rp)</label>
                <input required type="number" value={newBasePrice} onChange={e=>setNewBasePrice(e.target.value)} placeholder="Contoh: 25000" className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none" />
              </div>

              {newProductType !== 'TITIP_BARANG' && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Deskripsi (Opsional)</label>
                  <input type="text" value={newDescription} onChange={e=>setNewDescription(e.target.value)} placeholder="Contoh: Termasuk Tol" className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none" />
                </div>
              )}

              <button disabled={isRefreshing} type="submit" className="w-full bg-gray-900 text-white font-bold rounded-xl py-3 hover:bg-black transition active:scale-95 disabled:opacity-50">
                Simpan Harga
              </button>
            </form>
          </div>
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">Layanan</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">Detail / Rute</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">Harga</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase text-gray-500">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {prices.map(p => (
                    <tr key={p.id}>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700">
                          {p.product_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-800 text-sm">
                        {p.route_id ? routes.find(r => r.id === p.route_id)?.name : p.description || '-'}
                      </td>
                      <td className="px-6 py-4 font-black text-green-600 text-sm">
                        Rp {Number(p.base_price).toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDeletePrice(p.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg transition"><Trash2 size={18}/></button>
                      </td>
                    </tr>
                  ))}
                  {prices.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-8 text-gray-400 font-medium">Belum ada harga disetel</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'BANKS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Plus size={20} className="mr-2 text-primary"/> Tambah Rekening Bank</h2>
            <form onSubmit={handleAddBank} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Nama Bank</label>
                <input required type="text" value={newBankName} onChange={e=>setNewBankName(e.target.value)} placeholder="Contoh: BCA / Mandiri / BRI" className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Nomor Rekening</label>
                <input required type="text" value={newAccountNumber} onChange={e=>setNewAccountNumber(e.target.value)} placeholder="Misal: 1234567890" className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Atas Nama</label>
                <input required type="text" value={newAccountHolder} onChange={e=>setNewAccountHolder(e.target.value)} placeholder="Misal: PT Anindira Trans" className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none" />
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
    </div>
  )
}
