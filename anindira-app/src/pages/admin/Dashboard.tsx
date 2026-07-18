import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { X, ExternalLink, DollarSign, Package, UserCheck, RefreshCw, Download, BellRing } from 'lucide-react'

export default function Dashboard() {
  const [orders, setOrders] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const prevOrderCountRef = useRef(0)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsRefreshing(true)
    await Promise.all([fetchOrders(), fetchDrivers()])
    setIsRefreshing(false)
  }

  const fetchOrders = async () => {
    const { data } = await supabase.from('orders').select('*, users(phone)').order('created_at', { ascending: false })
    if (data) {
      const currentCount = data.length
      if (prevOrderCountRef.current > 0 && currentCount > prevOrderCountRef.current && soundEnabled) {
        playNotificationSound()
      }
      prevOrderCountRef.current = currentCount
      setOrders(data)
    }
  }

  const playNotificationSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
      audio.play().catch(e => console.log('Auto-play prevented', e))
    } catch (e) {
      console.log('Audio error', e)
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

  const fetchDrivers = async () => {
    const { data } = await supabase.from('users').select('*').eq('role', 'DRIVER').eq('status', 'ACTIVE')
    if (data) setDrivers(data)
  }

  const assignDriver = async (orderId: string, driverId: string) => {
    try {
      const { error } = await supabase.from('orders').update({ 
        driver_id: driverId,
        status: 'ASSIGNED'
      }).eq('id', orderId)
      
      if (error) throw error
      
      setOrders(orders.map(o => o.id === orderId ? { ...o, driver_id: driverId, status: 'ASSIGNED' } : o))
    } catch (err) {
      console.error(err)
      alert('Gagal menugaskan sopir')
    }
  }

  // Calculate Statistics
  const totalRevenue = orders.filter(o => o.status === 'COMPLETED').reduce((sum, order) => sum + (Number(order.total_price) || 0), 0)
  const totalOrders = orders.length
  const activeDriversCount = drivers.length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ringkasan Sistem</h1>
          <p className="text-sm text-gray-500 mt-1">Pantau performa layanan AnindiraTrans secara real-time</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0">
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center justify-center space-x-2 border px-4 py-2 rounded-lg shadow-sm transition active:scale-95 ${soundEnabled ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
          >
            <BellRing size={16} />
            <span>{soundEnabled ? 'Suara Aktif' : 'Suara Mati'}</span>
          </button>
          <button 
            onClick={exportToCSV}
            className="flex items-center justify-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50 transition active:scale-95"
          >
            <Download size={16} />
            <span>Ekspor Data</span>
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
            <DollarSign size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Pendapatan Selesai</p>
            <p className="text-2xl font-black text-gray-900 mt-1">Rp {totalRevenue.toLocaleString('id-ID')}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Package size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Total Pesanan</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{totalOrders}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
            <UserCheck size={28} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Sopir Menganggur</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{activeDriversCount}</p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">Daftar Pesanan Terakhir</h2>
      
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">ID Pesanan</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Pelanggan</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Layanan</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Pembayaran</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Penugasan Sopir</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/50 transition">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-gray-900">
                    {order.id.slice(0, 8)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-600">
                    {order.users?.phone || 'Unknown'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-blue-600">
                    {order.order_type}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-bold tracking-wider uppercase ${order.payment_status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {order.payment_status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-bold tracking-wider uppercase ${
                      order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 
                      order.status === 'ON_THE_WAY' ? 'bg-orange-100 text-orange-700' :
                      order.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {order.status === 'PENDING' ? (
                      <select
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none w-40"
                        onChange={(e) => {
                          if(e.target.value) assignDriver(order.id, e.target.value)
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>Pilih Sopir (Tersedia: {drivers.length})</option>
                        {drivers.map(d => (
                          <option key={d.id} value={d.id}>{d.full_name || d.phone}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="inline-flex items-center space-x-1 font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded-md text-xs">
                        <UserCheck size={14} className="text-green-600" />
                        <span>Sopir Ditetapkan</span>
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <button 
                      onClick={() => setSelectedOrder(order)}
                      className="text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 px-4 py-2 rounded-lg transition active:scale-95 font-bold"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm font-medium text-gray-400">
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
                <h2 className="text-xl font-bold text-gray-900">Detail Pesanan</h2>
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

              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Informasi Pelanggan</p>
                <div className="flex items-center space-x-3 bg-white border border-gray-200 p-3 rounded-xl shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    P
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{selectedOrder.users?.phone || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">Pelanggan Terdaftar</p>
                  </div>
                </div>
              </div>

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
