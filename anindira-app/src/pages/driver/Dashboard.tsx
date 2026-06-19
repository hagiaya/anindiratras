import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Navigation, CheckCircle2, AlertCircle, Power, ExternalLink, History, User as UserIcon, CarFront, MessageSquare, PhoneCall } from 'lucide-react'

export default function DriverDashboard() {
  const navigate = useNavigate()
  const [session, setSession] = useState<any>(null)
  const [driverStatus, setDriverStatus] = useState<'ACTIVE' | 'INACTIVE'>('INACTIVE')
  const [orders, setOrders] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'RIWAYAT' | 'PROFIL'>('DASHBOARD')

  const totalEarnings = history.reduce((sum, order) => sum + (Number(order.total_price) || 0), 0)
  const totalTrips = history.length

  const handleCall = async (order: any) => {
    if (localStorage.getItem('demo_mode')) {
      await supabase.channel('demo_calls').send({
        type: 'broadcast',
        event: 'incoming_call',
        payload: { callerName: 'Sopir Budi (Demo)', roomId: order.id }
      })
      navigate(`/call/${order.id}`, { state: { isCaller: true } })
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const myName = session.user.user_metadata?.full_name || 'Sopir'
      await supabase.channel(`user_${order.user_id}`).send({
        type: 'broadcast',
        event: 'incoming_call',
        payload: { callerName: myName, roomId: order.id }
      })
    }
    navigate(`/call/${order.id}`, { state: { isCaller: true } })
  }

  useEffect(() => {
    checkSessionAndFetchData()
  }, [])

  const checkSessionAndFetchData = async () => {
    setLoading(true)
    const demoMode = localStorage.getItem('demo_mode')
    
    if (demoMode) {
      setSession({ user: { id: 'demo-driver-id', user_metadata: { role: demoMode } } })
      // Demo mode dummy data
      setDriverStatus('ACTIVE')
      setOrders([
        {
          id: 'demo-order-123',
          order_type: 'CARPOOL',
          status: 'ASSIGNED',
          pickup_address: 'Jl. Ahmad Yani No 10',
          pickup_lat: -6.200000,
          pickup_lng: 106.816666,
          dropoff_address: 'Bandara Soekarno Hatta',
          dropoff_lat: -6.125556,
          dropoff_lng: 106.655833,
          users: { phone: '08123456789' }
        }
      ])
      setHistory([
        {
          id: 'demo-order-old-1',
          order_type: 'ANTAR_BANDARA',
          status: 'COMPLETED',
          pickup_address: 'Hotel Indonesia',
          dropoff_address: 'Bandara Halim',
          total_price: 150000,
          created_at: new Date().toISOString(),
          users: { phone: '08999999999' }
        }
      ])
      setLoading(false)
      return
    }

    const { data: { session: currentSession } } = await supabase.auth.getSession()
    if (!currentSession) {
      navigate('/login')
      return
    }
    setSession(currentSession)

    // Fetch driver profile status
    const { data: userData } = await supabase.from('users').select('status').eq('id', currentSession.user.id).single()
    if (userData) {
      setDriverStatus(userData.status as 'ACTIVE' | 'INACTIVE')
    }

    // Fetch assigned orders
    fetchOrders(currentSession.user.id)
  }

  const fetchOrders = async (driverId: string) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, users(phone)')
      .eq('driver_id', driverId)
      .in('status', ['ASSIGNED', 'ON_THE_WAY'])
      .order('created_at', { ascending: true })

    if (data && !error) {
      setOrders(data)
    }

    // Fetch history
    const { data: historyData } = await supabase
      .from('orders')
      .select('*, users(phone)')
      .eq('driver_id', driverId)
      .eq('status', 'COMPLETED')
      .order('created_at', { ascending: false })
      .limit(10)
      
    if (historyData) setHistory(historyData)

    setLoading(false)
  }

  const toggleStatus = async () => {
    const newStatus = driverStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    setDriverStatus(newStatus)
    
    if (!localStorage.getItem('demo_mode') && session?.user?.id) {
      await supabase.from('users').update({ status: newStatus }).eq('id', session.user.id)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (localStorage.getItem('demo_mode')) {
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o).filter(o => o.status !== 'COMPLETED'))
      alert(`Demo: Status pesanan diubah menjadi ${newStatus}`)
      return
    }

    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    if (!error) {
      if (newStatus === 'COMPLETED') {
        const completedOrder = orders.find(o => o.id === orderId)
        if (completedOrder) {
          setHistory([{...completedOrder, status: 'COMPLETED'}, ...history])
        }
        setOrders(orders.filter(o => o.id !== orderId))
      } else {
        setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
      }
    } else {
      alert('Gagal mengubah status pesanan')
    }
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold">Memuat...</div>

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-gray-900 px-4 py-4 shadow-lg text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <button onClick={() => navigate('/')} className="p-2 -ml-2 rounded-full hover:bg-gray-800 transition">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold tracking-wide">Panel Driver</h1>
          </div>
          <button 
            onClick={toggleStatus}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              driverStatus === 'ACTIVE' 
              ? 'bg-green-500/20 text-green-400 border border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]' 
              : 'bg-red-500/20 text-red-400 border border-red-500/50'
            }`}
          >
            <Power size={14} />
            <span>{driverStatus === 'ACTIVE' ? 'SIAP MENERIMA ORDER' : 'TIDAK AKTIF'}</span>
          </button>
        </div>
      </div>

      <div className={`p-4 ${activeTab === 'DASHBOARD' ? 'block' : 'hidden'}`}>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Tugas Saat Ini</h2>
        
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl border-2 border-dashed border-gray-200 mt-10">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 mb-4">
              <AlertCircle size={32} />
            </div>
            <p className="text-gray-500 font-medium text-center">Belum ada tugas yang ditugaskan kepada Anda saat ini.</p>
            {driverStatus === 'INACTIVE' && (
              <p className="text-xs text-red-500 mt-2 font-bold text-center">Aktifkan status Anda untuk mulai menerima order.</p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map(order => (
              <div key={order.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 relative overflow-hidden">
                {/* Header Card */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-md uppercase">
                      {order.order_type}
                    </span>
                    <p className="text-xs text-gray-400 mt-2 font-medium">ID: {order.id.split('-')[0]}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-md ${order.status === 'ON_THE_WAY' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'}`}>
                    {order.status === 'ON_THE_WAY' ? 'DALAM PERJALANAN' : 'DITUGASKAN'}
                  </span>
                </div>

                {/* Pelanggan */}
                <div className="mb-4 pb-4 border-b border-dashed border-gray-200 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Kontak Pelanggan</p>
                    <p className="font-bold text-gray-800 text-lg">{order.users?.phone || 'Unknown'}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => navigate(`/chat/${order.id}`)}
                      className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center transition active:scale-95"
                    >
                      <MessageSquare size={18} />
                    </button>
                    <button 
                      onClick={() => handleCall(order)}
                      className="h-10 w-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center transition active:scale-95"
                    >
                      <PhoneCall size={18} />
                    </button>
                  </div>
                </div>

                {/* Rute & Navigasi */}
                <div className="space-y-4 mb-6">
                  {/* Jemput */}
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                      <span>Titik Jemput</span>
                    </p>
                    <p className="text-sm font-semibold text-gray-800 mb-2">{order.pickup_address || '-'}</p>
                    {order.pickup_lat && order.pickup_lng && (
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${order.pickup_lat},${order.pickup_lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-2 w-full bg-blue-500 text-white text-xs font-bold py-2 rounded-lg transition active:scale-[0.98]"
                      >
                        <ExternalLink size={14} /> <span>Buka Rute Jemput</span>
                      </a>
                    )}
                  </div>

                  {/* Antar */}
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-orange-500 inline-block"></span>
                      <span>Titik Antar</span>
                    </p>
                    <p className="text-sm font-semibold text-gray-800 mb-2">{order.dropoff_address || '-'}</p>
                    {order.dropoff_lat && order.dropoff_lng && (
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${order.dropoff_lat},${order.dropoff_lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center space-x-2 w-full bg-orange-500 text-white text-xs font-bold py-2 rounded-lg transition active:scale-[0.98]"
                      >
                        <ExternalLink size={14} /> <span>Buka Rute Antar</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Aksi */}
                <div className="flex space-x-3">
                  {order.status === 'ASSIGNED' ? (
                    <button 
                      onClick={() => updateOrderStatus(order.id, 'ON_THE_WAY')}
                      className="flex-1 bg-gray-900 text-white font-bold py-4 rounded-xl flex items-center justify-center space-x-2 transition active:scale-[0.98]"
                    >
                      <Navigation size={18} />
                      <span>Mulai Perjalanan</span>
                    </button>
                  ) : (
                    <button 
                      onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                      className="flex-1 bg-green-500 text-white font-bold py-4 rounded-xl flex items-center justify-center space-x-2 transition active:scale-[0.98] shadow-lg shadow-green-200"
                    >
                      <CheckCircle2 size={18} />
                      <span>Selesaikan Pesanan</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* VIEW: RIWAYAT */}
      <div className={`p-4 ${activeTab === 'RIWAYAT' ? 'block' : 'hidden'}`}>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Riwayat Selesai</h2>
        {history.length === 0 ? (
          <div className="text-center py-10 text-gray-400 font-medium">Belum ada riwayat pesanan.</div>
        ) : (
          <div className="space-y-4">
            {history.map(h => (
              <div key={h.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-blue-600 mb-1">{h.order_type}</p>
                  <p className="text-sm font-semibold text-gray-800">{h.pickup_address?.split(',')[0]} &rarr; {h.dropoff_address?.split(',')[0]}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{new Date(h.created_at).toLocaleDateString('id-ID')}</p>
                </div>
                <div className="text-right">
                  <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-md">SELESAI</span>
                  <p className="text-sm font-bold text-gray-900 mt-2">Rp {h.total_price?.toLocaleString('id-ID') || 0}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* VIEW: PROFIL */}
      <div className={`p-4 ${activeTab === 'PROFIL' ? 'block' : 'hidden'}`}>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Profil Sopir</h2>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
            <UserIcon size={40} />
          </div>
          <h3 className="font-bold text-xl text-gray-900 mb-1">{session?.user?.user_metadata?.full_name || 'Akun Sopir'}</h3>
          <p className="text-gray-500 font-medium">{session?.user?.phone || '0812xxxxxx'}</p>
          
          {/* Statistik Pendapatan */}
          <div className="w-full mt-6 mb-2 grid grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-2xl p-4 flex flex-col items-center border border-green-100">
              <span className="text-xs font-bold text-green-600 uppercase mb-1">Total Pendapatan</span>
              <span className="text-lg font-black text-green-700">Rp {totalEarnings.toLocaleString('id-ID')}</span>
            </div>
            <div className="bg-blue-50 rounded-2xl p-4 flex flex-col items-center border border-blue-100">
              <span className="text-xs font-bold text-blue-600 uppercase mb-1">Total Perjalanan</span>
              <span className="text-lg font-black text-blue-700">{totalTrips} Trip</span>
            </div>
          </div>
          
          <div className="w-full mt-6 space-y-3">
            <button 
              onClick={async () => {
                localStorage.removeItem('demo_mode')
                await supabase.auth.signOut()
                navigate('/login')
              }}
              className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl transition active:scale-95"
            >
              Keluar Akun
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM NAVIGATION */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-gray-200 bg-white pb-safe pt-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => setActiveTab('DASHBOARD')}
          className={`flex flex-col items-center space-y-1 p-2 ${activeTab === 'DASHBOARD' ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <CarFront size={24} className={activeTab === 'DASHBOARD' ? 'fill-green-600/20' : ''} />
          <span className="text-[10px] font-bold">Beranda</span>
        </button>
        <button 
          onClick={() => setActiveTab('RIWAYAT')}
          className={`flex flex-col items-center space-y-1 p-2 ${activeTab === 'RIWAYAT' ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <History size={24} />
          <span className="text-[10px] font-bold">Riwayat</span>
        </button>
        <button 
          onClick={() => navigate('/chat-list')}
          className="flex flex-col items-center space-y-1 p-2 text-gray-400 hover:text-gray-600"
        >
          <MessageSquare size={24} />
          <span className="text-[10px] font-bold">Pesan</span>
        </button>
        <button 
          onClick={() => setActiveTab('PROFIL')}
          className={`flex flex-col items-center space-y-1 p-2 ${activeTab === 'PROFIL' ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <UserIcon size={24} className={activeTab === 'PROFIL' ? 'fill-green-600/20' : ''} />
          <span className="text-[10px] font-bold">Profil</span>
        </button>
      </div>
      
      {/* SafeArea padding for bottom nav */}
      <div className="h-20"></div>
    </div>
  )
}
