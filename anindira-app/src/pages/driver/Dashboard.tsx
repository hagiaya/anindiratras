import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Navigation, CheckCircle2, AlertCircle, Power, ExternalLink, History, User as UserIcon, CarFront, MessageSquare, PhoneCall, Map as MapIcon, Clock, Wallet } from 'lucide-react'

export default function DriverDashboard() {
  const navigate = useNavigate()
  const [session, setSession] = useState<any>(null)
  const [driverStatus, setDriverStatus] = useState<'ACTIVE' | 'INACTIVE'>('INACTIVE')
  const [driverBalance, setDriverBalance] = useState(0)
  const [orders, setOrders] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'MAPS' | 'RIWAYAT' | 'PROFIL'>('DASHBOARD')

  const [departureTimes, setDepartureTimes] = useState<{[key: string]: string}>({})

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
          users: { phone: '08123456789' },
          user_id: 'demo-user-1'
        }
      ])
      setHistory([])
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
    const { data: userData } = await supabase.from('users').select('status, balance').eq('id', currentSession.user.id).single()
    if (userData) {
      setDriverStatus(userData.status as 'ACTIVE' | 'INACTIVE')
      setDriverBalance(userData.balance || 0)
    }

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

    if (newStatus === 'COMPLETED') {
      const isConfirmed = window.confirm('Apakah Anda yakin pesanan sudah selesai? Komisi 10% akan dipotong dari saldo AnindiraPay Anda.');
      if (!isConfirmed) return;

      try {
        const { data, error } = await supabase.functions.invoke('complete-order', {
          body: { orderId }
        })
        if (error) throw new Error(error.message)
        if (data?.error) throw new Error(data.error)
        
        const completedOrder = orders.find(o => o.id === orderId)
        if (completedOrder) {
          setHistory([{...completedOrder, status: 'COMPLETED'}, ...history])
        }
        setOrders(orders.filter(o => o.id !== orderId))
        
        checkSessionAndFetchData()
        alert('Pesanan berhasil diselesaikan.')
      } catch (err: any) {
        alert(err.message || 'Gagal menyelesaikan pesanan. Pastikan saldo AnindiraPay Anda mencukupi untuk potongan komisi 10%.')
      }
    } else {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
      if (!error) {
        setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
      } else {
        alert('Gagal mengubah status pesanan')
      }
    }
  }

  const handleSetDepartureTime = async (order: any) => {
    const time = departureTimes[order.id]
    if (!time) {
      alert('Tentukan jam terlebih dahulu')
      return
    }

    const messageText = `Sopir telah mengatur jam estimasi penjemputan Anda pada pukul: *${time}*. Harap bersiap-siap!`
    
    if (localStorage.getItem('demo_mode')) {
      alert(`Pesan terkirim ke penumpang: ${messageText}`)
      return
    }

    try {
      await supabase.from('chats').insert({
        order_id: order.id,
        sender_id: session.user.id,
        receiver_id: order.user_id,
        message: messageText
      })
      alert('Pemberitahuan jam keberangkatan berhasil dikirim ke chat penumpang!')
    } catch (e) {
      alert('Gagal mengirim pemberitahuan')
    }
  }

  const handleGo = async (order: any) => {
    const isConfirmed = window.confirm('Beritahu penumpang bahwa Anda akan berangkat sekarang?');
    if (!isConfirmed) return;

    if (!localStorage.getItem('demo_mode')) {
      const messageText = `🚗 *GO!* Sopir sedang dalam perjalanan menuju lokasi penjemputan Anda sekarang. Mohon stand by.`
      await supabase.from('chats').insert({
        order_id: order.id,
        sender_id: session.user.id,
        receiver_id: order.user_id,
        message: messageText
      })
    }
    
    updateOrderStatus(order.id, 'ON_THE_WAY')
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold">Memuat...</div>

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">
      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-gray-900 px-4 py-4 shadow-lg text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button onClick={() => navigate('/')} className="p-2 -ml-2 rounded-full hover:bg-gray-800 transition">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-black tracking-wide uppercase">Driver Panel</h1>
          </div>
          <button 
            onClick={toggleStatus}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border-2 ${
              driverStatus === 'ACTIVE' 
              ? 'bg-green-500 text-white border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]' 
              : 'bg-transparent text-gray-400 border-gray-600'
            }`}
          >
            <Power size={14} />
            <span>{driverStatus === 'ACTIVE' ? 'SIAP KERJA' : 'OFFLINE'}</span>
          </button>
        </div>
      </div>

      {/* VIEW: TUGAS */}
      <div className={`p-4 ${activeTab === 'DASHBOARD' ? 'block' : 'hidden'}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-black text-gray-800 uppercase tracking-tighter">Order Masuk</h2>
          <span className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full text-xs">{orders.length} Tugas</span>
        </div>
        
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl border-2 border-dashed border-gray-200 mt-4">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 mb-4">
              <AlertCircle size={32} />
            </div>
            <p className="text-gray-500 font-bold text-center">Belum ada orderan masuk saat ini.</p>
            {driverStatus === 'INACTIVE' && (
              <p className="text-sm text-red-500 mt-2 font-black text-center animate-pulse">Geser tombol OFFLINE menjadi SIAP KERJA!</p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map(order => (
              <div key={order.id} className={`rounded-3xl p-5 shadow-lg border-2 relative overflow-hidden transition-all ${order.status === 'ON_THE_WAY' ? 'bg-orange-50 border-orange-200' : 'bg-white border-blue-100'}`}>
                {/* Header Card */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="bg-gray-900 text-white text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                      {order.order_type}
                    </span>
                  </div>
                  <span className={`text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${order.status === 'ON_THE_WAY' ? 'bg-orange-500 text-white animate-pulse' : 'bg-blue-100 text-blue-700'}`}>
                    {order.status === 'ON_THE_WAY' ? 'DLM PERJALANAN' : 'ORDER BARU'}
                  </span>
                </div>

                {/* Info Penumpang Ekstra Besar */}
                <div className="mb-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Kontak Penumpang</p>
                  <p className="font-black text-gray-900 text-2xl tracking-tight">{order.users?.phone || 'Unknown'}</p>
                  
                  <div className="flex space-x-3 mt-4">
                    <button 
                      onClick={() => navigate(`/chat/${order.id}`)}
                      className="flex-1 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold flex items-center justify-center space-x-2 transition active:scale-95"
                    >
                      <MessageSquare size={20} />
                      <span>Chat</span>
                    </button>
                    <button 
                      onClick={() => handleCall(order)}
                      className="flex-1 h-14 rounded-xl bg-green-100 hover:bg-green-200 text-green-700 font-bold flex items-center justify-center space-x-2 transition active:scale-95"
                    >
                      <PhoneCall size={20} />
                      <span>Telepon</span>
                    </button>
                  </div>
                </div>

                {/* Rute Singkat */}
                <div className="flex items-center space-x-3 mb-6 bg-white p-4 rounded-2xl border border-gray-100">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div className="w-1 h-6 bg-gray-200 my-1"></div>
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <p className="text-sm font-bold text-gray-800 line-clamp-1">{order.pickup_address}</p>
                    <p className="text-sm font-bold text-gray-800 line-clamp-1">{order.dropoff_address}</p>
                  </div>
                </div>

                {/* Atur Jam Pemberangkatan (khusus saat ASSIGNED) */}
                {order.status === 'ASSIGNED' && (
                  <div className="mb-6 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <label className="text-[11px] font-black text-blue-800 uppercase tracking-widest flex items-center space-x-2 mb-2">
                      <Clock size={14} /> <span>Estimasi Jemput</span>
                    </label>
                    <div className="flex space-x-2">
                      <input 
                        type="time" 
                        value={departureTimes[order.id] || ''}
                        onChange={(e) => setDepartureTimes({...departureTimes, [order.id]: e.target.value})}
                        className="flex-1 bg-white border border-blue-200 rounded-xl px-3 font-bold text-gray-900 outline-none focus:border-blue-500"
                      />
                      <button 
                        onClick={() => handleSetDepartureTime(order)}
                        className="bg-blue-600 text-white font-bold px-4 py-3 rounded-xl active:scale-95 transition text-sm whitespace-nowrap"
                      >
                        Kirim Info
                      </button>
                    </div>
                    <p className="text-[10px] text-blue-600 font-medium mt-2 leading-tight">Beritahu penumpang jam berapa Anda akan menjemput mereka.</p>
                  </div>
                )}

                {/* Aksi Utama */}
                <div className="mt-4">
                  {order.status === 'ASSIGNED' ? (
                    <button 
                      onClick={() => handleGo(order)}
                      className="w-full bg-green-500 hover:bg-green-600 text-white font-black text-xl py-5 rounded-2xl flex items-center justify-center space-x-3 transition active:scale-[0.98] shadow-lg shadow-green-200/50"
                    >
                      <span>GO (BERANGKAT)</span>
                      <Navigation size={24} />
                    </button>
                  ) : (
                    <button 
                      onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                      className="w-full bg-gray-900 hover:bg-black text-white font-black text-lg py-5 rounded-2xl flex items-center justify-center space-x-3 transition active:scale-[0.98] shadow-lg shadow-gray-500/30"
                    >
                      <CheckCircle2 size={24} />
                      <span>SELESAIKAN ORDER</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* VIEW: MAPS (Navigasi) */}
      <div className={`p-4 ${activeTab === 'MAPS' ? 'block' : 'hidden'}`}>
        <h2 className="text-lg font-black text-gray-800 uppercase tracking-tighter mb-4">Peta Navigasi</h2>
        {orders.length === 0 ? (
          <div className="text-center py-10 text-gray-400 font-bold">Tidak ada rute aktif.</div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} className="bg-white rounded-3xl p-5 shadow-sm border-2 border-gray-100">
                <div className="mb-3">
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Penumpang: {order.users?.phone}</span>
                </div>
                
                {/* Tombol Jemput */}
                <div className="mb-4">
                  <p className="text-[11px] font-black text-blue-500 uppercase tracking-widest mb-2 flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                    <span>Arahkan ke Titik Jemput</span>
                  </p>
                  <p className="text-sm font-bold text-gray-800 mb-3">{order.pickup_address || '-'}</p>
                  {order.pickup_lat && order.pickup_lng && (
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${order.pickup_lat},${order.pickup_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-2 w-full bg-blue-50 text-blue-700 border-2 border-blue-200 text-sm font-black py-4 rounded-2xl transition active:scale-[0.98]"
                    >
                      <ExternalLink size={18} /> <span>Buka Google Maps</span>
                    </a>
                  )}
                </div>

                <div className="h-px bg-gray-200 w-full my-4 border-dashed border-b"></div>

                {/* Tombol Antar */}
                <div>
                  <p className="text-[11px] font-black text-orange-500 uppercase tracking-widest mb-2 flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-orange-500 inline-block"></span>
                    <span>Arahkan ke Titik Antar</span>
                  </p>
                  <p className="text-sm font-bold text-gray-800 mb-3">{order.dropoff_address || '-'}</p>
                  {order.dropoff_lat && order.dropoff_lng && (
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${order.dropoff_lat},${order.dropoff_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-2 w-full bg-orange-50 text-orange-700 border-2 border-orange-200 text-sm font-black py-4 rounded-2xl transition active:scale-[0.98]"
                    >
                      <ExternalLink size={18} /> <span>Buka Google Maps</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* VIEW: RIWAYAT */}
      <div className={`p-4 ${activeTab === 'RIWAYAT' ? 'block' : 'hidden'}`}>
        <h2 className="text-lg font-black text-gray-800 uppercase tracking-tighter mb-4">Riwayat Selesai</h2>
        {history.length === 0 ? (
          <div className="text-center py-10 text-gray-400 font-bold">Belum ada riwayat pesanan.</div>
        ) : (
          <div className="space-y-4">
            {history.map(h => (
              <div key={h.id} className="bg-white p-5 rounded-3xl shadow-sm border-2 border-gray-100 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{h.order_type}</p>
                  <p className="text-sm font-black text-gray-800">{h.pickup_address?.split(',')[0]} &rarr; {h.dropoff_address?.split(',')[0]}</p>
                  <p className="text-[11px] font-medium text-gray-400 mt-1">{new Date(h.created_at).toLocaleDateString('id-ID')}</p>
                </div>
                <div className="text-right">
                  <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-1 rounded-md">SELESAI</span>
                  <p className="text-sm font-black text-gray-900 mt-2">Rp {h.total_price?.toLocaleString('id-ID') || 0}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* VIEW: PROFIL */}
      <div className={`p-4 ${activeTab === 'PROFIL' ? 'block' : 'hidden'}`}>
        <h2 className="text-lg font-black text-gray-800 uppercase tracking-tighter mb-4">Profil & Dompet</h2>
        <div className="bg-white p-6 rounded-3xl shadow-sm border-2 border-gray-100 flex flex-col items-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4 border-4 border-white shadow-md">
            <UserIcon size={48} />
          </div>
          <h3 className="font-black text-2xl text-gray-900 mb-1">{session?.user?.user_metadata?.full_name || 'Akun Sopir'}</h3>
          <p className="text-gray-500 font-bold">{session?.user?.phone || '0812xxxxxx'}</p>
          
          <div className="w-full mt-8 bg-gray-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl shadow-gray-900/30">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1">Saldo AnindiraPay</p>
            <p className="text-3xl font-black mb-4">Rp {driverBalance.toLocaleString('id-ID')}</p>
            <button 
              onClick={() => navigate('/topup')}
              className="w-full bg-primary hover:bg-blue-600 text-white font-black py-4 rounded-2xl flex items-center justify-center space-x-2 transition active:scale-95"
            >
              <Wallet size={18} />
              <span>TOP UP SALDO</span>
            </button>
            <p className="text-[10px] text-gray-400 text-center mt-3 leading-relaxed">
              Pastikan saldo cukup untuk membayar potongan komisi 10% setiap menyelesaikan order.
            </p>
          </div>

          <div className="w-full mt-6 mb-2 grid grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-3xl p-4 flex flex-col items-center justify-center border-2 border-green-100 h-28">
              <span className="text-[10px] font-black text-green-600 uppercase mb-2 text-center tracking-widest">Pendapatan</span>
              <span className="text-xl font-black text-green-700 text-center">Rp {totalEarnings.toLocaleString('id-ID')}</span>
            </div>
            <div className="bg-blue-50 rounded-3xl p-4 flex flex-col items-center justify-center border-2 border-blue-100 h-28">
              <span className="text-[10px] font-black text-blue-600 uppercase mb-2 tracking-widest">Total Trip</span>
              <span className="text-3xl font-black text-blue-700">{totalTrips}</span>
            </div>
          </div>
          
          <div className="w-full mt-8 space-y-3">
            <button 
              onClick={async () => {
                localStorage.removeItem('demo_mode')
                await supabase.auth.signOut()
                navigate('/login')
              }}
              className="w-full py-4 bg-red-50 text-red-600 border-2 border-red-100 font-black rounded-2xl transition active:scale-95 uppercase tracking-wider"
            >
              Keluar Akun
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM NAVIGATION (Redesigned for Driver) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t-2 border-gray-100 bg-white pb-safe pt-2 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => setActiveTab('DASHBOARD')}
          className={`flex flex-col items-center space-y-1 p-2 w-full ${activeTab === 'DASHBOARD' ? 'text-gray-900' : 'text-gray-400'}`}
        >
          <div className={`p-2 rounded-xl transition-all ${activeTab === 'DASHBOARD' ? 'bg-gray-100 scale-110' : ''}`}>
            <CarFront size={24} strokeWidth={activeTab === 'DASHBOARD' ? 2.5 : 2} />
          </div>
          <span className={`text-[10px] uppercase tracking-wider ${activeTab === 'DASHBOARD' ? 'font-black' : 'font-bold'}`}>Tugas</span>
        </button>
        <button 
          onClick={() => setActiveTab('MAPS')}
          className={`flex flex-col items-center space-y-1 p-2 w-full ${activeTab === 'MAPS' ? 'text-gray-900' : 'text-gray-400'}`}
        >
          <div className={`p-2 rounded-xl transition-all ${activeTab === 'MAPS' ? 'bg-gray-100 scale-110' : ''}`}>
            <MapIcon size={24} strokeWidth={activeTab === 'MAPS' ? 2.5 : 2} />
          </div>
          <span className={`text-[10px] uppercase tracking-wider ${activeTab === 'MAPS' ? 'font-black' : 'font-bold'}`}>Peta</span>
        </button>
        <button 
          onClick={() => setActiveTab('RIWAYAT')}
          className={`flex flex-col items-center space-y-1 p-2 w-full ${activeTab === 'RIWAYAT' ? 'text-gray-900' : 'text-gray-400'}`}
        >
          <div className={`p-2 rounded-xl transition-all ${activeTab === 'RIWAYAT' ? 'bg-gray-100 scale-110' : ''}`}>
            <History size={24} strokeWidth={activeTab === 'RIWAYAT' ? 2.5 : 2} />
          </div>
          <span className={`text-[10px] uppercase tracking-wider ${activeTab === 'RIWAYAT' ? 'font-black' : 'font-bold'}`}>Riwayat</span>
        </button>
        <button 
          onClick={() => setActiveTab('PROFIL')}
          className={`flex flex-col items-center space-y-1 p-2 w-full ${activeTab === 'PROFIL' ? 'text-gray-900' : 'text-gray-400'}`}
        >
          <div className={`p-2 rounded-xl transition-all ${activeTab === 'PROFIL' ? 'bg-gray-100 scale-110' : ''}`}>
            <UserIcon size={24} strokeWidth={activeTab === 'PROFIL' ? 2.5 : 2} />
          </div>
          <span className={`text-[10px] uppercase tracking-wider ${activeTab === 'PROFIL' ? 'font-black' : 'font-bold'}`}>Profil</span>
        </button>
      </div>
      
      <div className="h-24"></div>
    </div>
  )
}
