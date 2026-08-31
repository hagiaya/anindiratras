import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { playNotificationSound } from '../../lib/audioNotification'
import { X, ExternalLink, DollarSign, Package, UserCheck, RefreshCw, Download, BellRing, Check, Search, MessageSquare, PhoneCall } from 'lucide-react'

export default function Dashboard() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [driverSearch, setDriverSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const prevOrderCountRef = useRef(0)

  useEffect(() => {
    fetchData()

    // Realtime listener for new incoming orders (postgres_changes + broadcast)
    const subscription = supabase
      .channel('admin_orders_channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        if (soundEnabled) playNotificationSound()
        fetchOrders()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        fetchOrders()
      })
      .on('broadcast', { event: 'new_order' }, () => {
        if (soundEnabled) playNotificationSound()
        fetchOrders()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [soundEnabled])

  const fetchData = async () => {
    setIsRefreshing(true)
    await Promise.all([fetchOrders(), fetchDrivers()])
    setIsRefreshing(false)
  }

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase.from('orders').select('*, users(phone, full_name)').order('created_at', { ascending: false })
      
      let finalOrders = data || []

      if (error || !data) {
        console.warn('Primary fetchOrders joined query notice:', error?.message)
        const { data: plainData } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
        if (plainData && plainData.length > 0) {
          // Hydrate user info manually if join failed
          const userIds = Array.from(new Set(plainData.map(o => o.user_id).filter(Boolean)))
          if (userIds.length > 0) {
            const { data: usersData } = await supabase.from('users').select('id, phone, full_name').in('id', userIds)
            const userMap = new Map((usersData || []).map(u => [u.id, u]))
            finalOrders = plainData.map(o => ({
              ...o,
              users: userMap.get(o.user_id) || null
            }))
          } else {
            finalOrders = plainData
          }
        }
      }

      if (finalOrders) {
        const currentCount = finalOrders.length
        if (prevOrderCountRef.current > 0 && currentCount > prevOrderCountRef.current && soundEnabled) {
          playNotificationSound()
        }
        prevOrderCountRef.current = currentCount
        setOrders(finalOrders)
      }
    } catch (e) {
      console.error('Error fetching orders in Admin Dashboard:', e)
    }
  }

  const fetchDrivers = async () => {
    const { data } = await supabase.from('users').select('*, driver_profiles(*)').eq('role', 'DRIVER')
    if (data) setDrivers(data)
  }

  const acceptOrder = async (orderId: string) => {
    try {
      const { error } = await supabase.from('orders').update({
        status: 'ASSIGNED'
      }).eq('id', orderId)

      if (error) throw error

      setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'ASSIGNED' } : o))
      if (soundEnabled) playNotificationSound()
      alert('Pesanan telah diterima oleh admin!')
    } catch (err: any) {
      console.error(err)
      alert('Gagal menerima pesanan: ' + err.message)
    }
  }

  const assignDriver = async (orderId: string, driverId: string) => {
    try {
      const { error } = await supabase.from('orders').update({ 
        driver_id: driverId,
        status: 'ASSIGNED'
      }).eq('id', orderId)
      
      if (error) throw error
      
      setOrders(orders.map(o => o.id === orderId ? { ...o, driver_id: driverId, status: 'ASSIGNED' } : o))

      // Broadcast notification to driver
      try {
        await supabase.channel(`driver_channel_${driverId}`).send({
          type: 'broadcast',
          event: 'order_assigned',
          payload: { orderId }
        })
      } catch (_e) {}

      if (soundEnabled) playNotificationSound()
      alert('Sopir berhasil ditugaskan untuk pesanan ini!')
    } catch (err: any) {
      console.error(err)
      alert('Gagal menugaskan sopir: ' + err.message)
    }
  }

  const exportToCSV = () => {
    if (orders.length === 0) return alert('Tidak ada data untuk diekspor')
    
    const headers = ['ID Pesanan', 'Layanan', 'Status', 'Total Harga', 'Pembayaran', 'Tgl Dibuat']
    const csvContent = [
      headers.join(','),
      ...orders.map(o => [
        o.id,
        o.order_type,
        o.status,
        o.total_price,
        o.payment_status,
        new Date(o.created_at).toISOString()
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `laporan_pesanan_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredDrivers = drivers.filter(d => {
    const query = driverSearch.toLowerCase()
    const nameMatch = (d.full_name || '').toLowerCase().includes(query)
    const phoneMatch = (d.phone || '').toLowerCase().includes(query)
    const carMatch = (d.driver_profiles?.car_type || '').toLowerCase().includes(query)
    return nameMatch || phoneMatch || carMatch
  })

  // Calculate Statistics
  const totalRevenue = orders.filter(o => o.status === 'COMPLETED').reduce((sum, order) => sum + (Number(order.total_price) || 0), 0)
  const totalOrders = orders.length
  const pendingOrdersCount = orders.filter(o => o.status === 'PENDING').length
  const activeDriversCount = drivers.filter(d => d.status === 'ACTIVE').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dasbor Utama Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola pesanan masuk, penerimaan orderan, dan penugasan sopir</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0">
          <button 
            onClick={() => {
              setSoundEnabled(!soundEnabled)
              if (!soundEnabled) playNotificationSound()
            }}
            className={`flex items-center justify-center space-x-2 border px-4 py-2 rounded-lg shadow-sm transition active:scale-95 ${soundEnabled ? 'bg-green-50 border-green-200 text-green-700 font-bold' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
          >
            <BellRing size={16} className={soundEnabled ? 'animate-bounce' : ''} />
            <span>{soundEnabled ? 'Suara Notifikasi Aktif' : 'Suara Mati'}</span>
          </button>
          <button 
            onClick={exportToCSV}
            className="flex items-center justify-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50 transition active:scale-95"
          >
            <Download size={16} />
            <span>Ekspor CSV</span>
          </button>
          <button 
            onClick={fetchData}
            className="flex items-center justify-center space-x-2 bg-gray-900 border border-gray-900 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-black transition active:scale-95"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-yellow-100 flex items-center justify-center text-yellow-700 shrink-0">
            <Package size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Order Masuk (Pending)</p>
            <p className="text-2xl font-black text-yellow-600 mt-0.5">{pendingOrdersCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center text-green-600 shrink-0">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Pendapatan Selesai</p>
            <p className="text-xl font-black text-gray-900 mt-0.5">Rp {totalRevenue.toLocaleString('id-ID')}</p>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Package size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Total Pesanan</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{totalOrders}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
            <UserCheck size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Sopir Siap Kerja</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{activeDriversCount}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-8 mb-4">
        <h2 className="text-xl font-bold text-gray-800">Daftar Pesanan Masuk & Penugasan Sopir</h2>
        
        {/* Search Driver Input */}
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            value={driverSearch}
            onChange={e => setDriverSearch(e.target.value)}
            placeholder="Cari nama / no. telp sopir..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:border-primary outline-none bg-white shadow-sm"
          />
        </div>
      </div>
      
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">ID Pesanan</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Pelanggan</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Layanan</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Status & Terima Order</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Cari & Tugaskan Sopir</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Aksi Komunikasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {orders.map((order) => (
                <tr key={order.id} className={`hover:bg-gray-50/50 transition ${order.status === 'PENDING' ? 'bg-yellow-50/30' : ''}`}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-gray-900">
                    {order.id.slice(0, 8)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-700">
                    <div>
                      <p className="font-bold text-gray-900">{order.users?.full_name || 'Pelanggan'}</p>
                      <p className="text-xs text-gray-500">{order.users?.phone || 'No. Telp -'}</p>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-blue-600">
                    {order.order_type}
                    <p className="text-xs text-gray-500 font-normal">Rp {Number(order.total_price || 0).toLocaleString('id-ID')}</p>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex rounded-md px-2.5 py-1 text-[10px] font-black tracking-wider uppercase ${
                        order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 
                        order.status === 'ON_THE_WAY' ? 'bg-orange-100 text-orange-700' :
                        order.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-800 animate-pulse'
                      }`}>
                        {order.status}
                      </span>
                      {order.status === 'PENDING' && (
                        <button 
                          onClick={() => acceptOrder(order.id)}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1 rounded-lg transition active:scale-95 flex items-center space-x-1 shadow-sm"
                        >
                          <Check size={14} />
                          <span>Terima Order</span>
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    <select
                      className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-bold text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none w-52 bg-white shadow-sm"
                      onChange={(e) => {
                        if (e.target.value) assignDriver(order.id, e.target.value)
                      }}
                      value={order.driver_id || ''}
                    >
                      <option value="" disabled>Pilih Sopir ({filteredDrivers.length} Tersedia)...</option>
                      {filteredDrivers.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.full_name || d.phone} ({d.status === 'ACTIVE' ? 'Aktif' : 'Offline'})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium space-x-1">
                    <button 
                      onClick={() => navigate(`/chat/${order.id}`)}
                      className="text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white p-2 rounded-lg transition active:scale-95 inline-flex items-center space-x-1 font-bold text-xs"
                      title="Chat Aplikasi"
                    >
                      <MessageSquare size={16} />
                      <span>Chat</span>
                    </button>
                    <button 
                      onClick={() => navigate(`/call/${order.id}`, { state: { isCaller: true } })}
                      className="text-green-600 bg-green-50 hover:bg-green-600 hover:text-white p-2 rounded-lg transition active:scale-95 inline-flex items-center space-x-1 font-bold text-xs"
                      title="Telepon Aplikasi"
                    >
                      <PhoneCall size={16} />
                      <span>Telpon</span>
                    </button>
                    <button 
                      onClick={() => setSelectedOrder(order)}
                      className="text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition active:scale-95 font-bold text-xs"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm font-medium text-gray-400">
                    Belum ada pesanan yang masuk ke sistem.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Detail Pesanan & Komunikasi</h2>
                <p className="text-xs font-medium text-gray-500 mt-1">ID: {selectedOrder.id}</p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)} 
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Layanan</p>
                  <p className="font-bold text-blue-600 text-lg">{selectedOrder.order_type}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Harga Total</p>
                  <p className="font-bold text-green-600 text-lg">Rp {Number(selectedOrder.total_price || 0).toLocaleString('id-ID')}</p>
                </div>
              </div>

              {selectedOrder.package_details && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Detail Spesifik</p>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-sm font-medium text-gray-800 space-y-2">
                    {(() => {
                      try {
                        const details = JSON.parse(selectedOrder.package_details)
                        if (selectedOrder.order_type === 'CARPOOL') {
                          return (
                            <>
                              <div className="flex justify-between"><span className="text-gray-500">Tgl Berangkat:</span> <span>{details.departureDate}</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">Jam Berangkat:</span> <span>{details.departureTime}</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">Kursi Dipilih:</span> <span>{details.selectedSeats?.join(', ')}</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">Tipe Mobil:</span> <span>{details.carType?.replace('_', ' ')}</span></div>
                              {details.extraPriceName && <div className="flex justify-between"><span className="text-gray-500">Tambahan:</span> <span>{details.extraPriceName}</span></div>}
                            </>
                          )
                        } else if (selectedOrder.order_type === 'TITIP_BARANG') {
                          return (
                            <>
                              <div className="flex justify-between"><span className="text-gray-500">Kategori:</span> <span>{details.category}</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">Berat:</span> <span>{details.weight} Kg</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">Penerima:</span> <span>{details.receiverName} ({details.receiverPhone})</span></div>
                              {details.notes && <div className="flex justify-between"><span className="text-gray-500">Catatan:</span> <span>{details.notes}</span></div>}
                            </>
                          )
                        } else {
                          return <pre className="text-xs">{JSON.stringify(details, null, 2)}</pre>
                        }
                      } catch {
                        return <p>{selectedOrder.package_details}</p>
                      }
                    })()}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Informasi Pelanggan</p>
                <div className="flex items-center justify-between bg-white border border-gray-200 p-3 rounded-xl shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                      P
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{selectedOrder.users?.full_name || 'Pelanggan'}</p>
                      <p className="text-xs text-gray-500">{selectedOrder.users?.phone || 'Terdaftar'}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => navigate(`/chat/${selectedOrder.id}`)} className="bg-blue-50 text-blue-600 p-2 rounded-lg border border-blue-200 hover:bg-blue-100 transition">
                      <MessageSquare size={18} />
                    </button>
                    <button onClick={() => navigate(`/call/${selectedOrder.id}`, { state: { isCaller: true } })} className="bg-green-50 text-green-600 p-2 rounded-lg border border-green-200 hover:bg-green-100 transition">
                      <PhoneCall size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {selectedOrder.driver_id && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Informasi Sopir</p>
                  <div className="flex items-center space-x-3 bg-white border border-gray-200 p-3 rounded-xl shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
                      S
                    </div>
                    {(() => {
                      const driver = drivers.find(d => d.id === selectedOrder.driver_id)
                      if (!driver) return <p className="font-bold text-gray-900">Loading...</p>
                      return (
                        <div>
                          <p className="font-bold text-gray-900">{driver.full_name || 'Nama Sopir'}</p>
                          <p className="text-xs text-gray-500">
                            {driver.phone || '-'} • {driver.driver_profiles?.[0]?.car_plate_number || driver.driver_profiles?.car_plate_number || 'Plat Belum Diatur'}
                          </p>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}

              {/* Locations */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Rute Perjalanan</p>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 space-y-5">
                  <div className="relative">
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wide mb-1 flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <span>Titik Jemput</span>
                    </p>
                    <p className="text-sm font-semibold text-gray-900 pl-3 border-l-2 border-blue-200">{selectedOrder.pickup_address || '-'}</p>
                    {selectedOrder.pickup_lat && selectedOrder.pickup_lng && (
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${selectedOrder.pickup_lat},${selectedOrder.pickup_lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center space-x-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-100/50 px-3 py-2 rounded-lg transition"
                      >
                        <ExternalLink size={14} />
                        <span>Buka Peta Jemput</span>
                      </a>
                    )}
                  </div>
                  
                  <div className="relative">
                    <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wide mb-1 flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      <span>Titik Antar</span>
                    </p>
                    <p className="text-sm font-semibold text-gray-900 pl-3 border-l-2 border-orange-200">{selectedOrder.dropoff_address || '-'}</p>
                    {selectedOrder.dropoff_lat && selectedOrder.dropoff_lng && (
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${selectedOrder.dropoff_lat},${selectedOrder.dropoff_lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center space-x-1 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-100/50 px-3 py-2 rounded-lg transition"
                      >
                        <ExternalLink size={14} />
                        <span>Buka Peta Antar</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t bg-white p-6 sm:rounded-b-3xl">
              <button 
                onClick={() => setSelectedOrder(null)}
                className="w-full rounded-xl bg-gray-900 py-3.5 text-sm font-bold text-white shadow-lg transition active:scale-[0.98] hover:bg-black"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
