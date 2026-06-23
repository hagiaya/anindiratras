import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  CarFront, 
  Package, 
  Plane, 
  Car, 
  Search, 
  Bell, 
  MessageSquare,
  User as UserIcon,
  Wallet,
  PlusCircle,
  HeadphonesIcon,
  ShieldCheck
} from 'lucide-react'

export default function Home() {
  const [session, setSession] = useState<any>(null)
  const [balance, setBalance] = useState<number>(0)
  const [dbUser, setDbUser] = useState<any>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [promos, setPromos] = useState<any[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    const demoMode = localStorage.getItem('demo_mode')
    if (demoMode) {
      setSession({ user: { phone: '0000', user_metadata: { role: demoMode } } })
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
        if (session) {
          supabase.from('users').select('balance, full_name, phone').eq('id', session.user.id).single()
            .then(({ data }) => {
              if (data) {
                setBalance(data.balance || 0)
                setDbUser(data)
              }
            })
        }
      })
    }

    // Fetch active promos
    supabase.from('promos')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data) setPromos(data)
      })
  }, [])

  const handleLogout = async () => {
    localStorage.removeItem('demo_mode')
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (!session) return null

  const role = session.user.user_metadata?.role || 'USER'

  // Auto-redirect DRIVER to their dashboard
  if (role === 'DRIVER') {
    navigate('/driver', { replace: true })
    return null
  }

  const services = [
    { name: 'Carpool', icon: <CarFront size={28} />, color: 'bg-green-500', path: '/carpool' },
    { name: 'Titip Barang', icon: <Package size={28} />, color: 'bg-orange-500', path: '/package' },
    { name: 'Antar Bandara', icon: <Plane size={28} />, color: 'bg-blue-500', path: '/airport' },
    { name: 'Sewa Mobil', icon: <Car size={28} />, color: 'bg-purple-500', path: '/rental' },
  ]

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 11) return 'Selamat Pagi'
    if (hour < 15) return 'Selamat Siang'
    if (hour < 18) return 'Selamat Sore'
    return 'Selamat Malam'
  }

  const displayUserName = dbUser?.full_name || session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.phone || 'Pengguna'
  const userPhone = dbUser?.phone || session.user.phone || ''
  
  const totalSavings = 0

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 pb-20">
      
      {/* HEADER SECTION */}
      <div className="sticky top-0 z-50 bg-primary px-4 py-3 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="flex flex-1 items-center rounded-full bg-white/20 px-4 py-2 text-white placeholder-white focus-within:bg-white focus-within:text-gray-900 transition-colors">
            <Search size={20} className="mr-2 opacity-80" />
            <input 
              type="text" 
              placeholder="Cari layanan, tujuan..." 
              className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-white/80 focus:placeholder:text-gray-400"
            />
          </div>
          <button className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white">
            <Bell size={20} />
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-primary"></span>
          </button>
          <button onClick={() => setShowProfile(true)} className="flex h-10 w-10 overflow-hidden rounded-full bg-white/20 items-center justify-center text-white border-2 border-white/50">
            {dbUser?.full_name ? (
              <span className="text-lg font-bold uppercase">{dbUser.full_name.charAt(0)}</span>
            ) : (
              <UserIcon size={20} />
            )}
          </button>
        </div>
      </div>

      {/* PROFILE MODAL */}
      {showProfile && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/50" onClick={() => setShowProfile(false)}>
          <div className="animate-slide-up w-full rounded-t-3xl bg-white px-6 pb-12 pt-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-6 flex justify-center">
              <div className="h-1.5 w-12 rounded-full bg-gray-300"></div>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 text-blue-600 shadow-inner">
                {dbUser?.full_name ? (
                  <span className="text-4xl font-bold uppercase">{dbUser.full_name.charAt(0)}</span>
                ) : (
                  <UserIcon size={48} />
                )}
              </div>
              <p className="text-xl font-bold text-gray-900">{displayUserName}</p>
              <p className="mt-1 text-gray-500">+{userPhone}</p>
            </div>
            
            <div className="mt-10 space-y-3">
              <button onClick={handleLogout} className="w-full rounded-full bg-red-50 py-3.5 font-bold text-red-600 transition active:scale-[0.98]">
                Keluar Akun
              </button>
              <button onClick={() => setShowProfile(false)} className="w-full rounded-full border-2 border-gray-200 py-3.5 font-bold text-gray-600 transition active:scale-[0.98]">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 pt-4">

        {/* E-WALLET / BALANCE CARD */}
        <div className="mb-6 overflow-hidden rounded-3xl bg-blue-600 shadow-lg shadow-blue-200">
          <div className="bg-blue-700/50 px-5 py-4">
            <div className="mb-4">
                <p className="text-blue-100 mb-1 font-medium">{getGreeting()},</p>
                <h2 className="text-2xl font-bold text-white leading-tight">{displayUserName}</h2>
              </div>
            
            <div className="flex items-end justify-between">
              <div>
                <p className="text-blue-100 text-xs mb-1 flex items-center space-x-1">
                  <Wallet size={12} />
                  <span>Saldo AnindiraPay</span>
                </p>
                <span className="text-2xl font-bold text-white">Rp {balance.toLocaleString('id-ID')}</span>
              </div>
              <div className="text-right">
                <p className="text-blue-100 text-xs mb-1">Total Hemat</p>
                <span className="text-sm font-bold text-green-300">Rp {totalSavings.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center bg-white py-4 px-2">
            <button onClick={() => navigate('/topup')} className="flex items-center justify-center space-x-2 w-full max-w-[200px] rounded-xl bg-blue-50 py-2.5 text-blue-600 transition active:scale-[0.98]">
              <PlusCircle size={20} />
              <span className="text-sm font-bold">Top Up Saldo</span>
            </button>
          </div>
        </div>

        {/* SERVICE GRID */}
        <div className="mb-8">
          <div className="grid grid-cols-4 gap-y-6">
            {services.map((service) => (
              <Link
                key={service.name}
                to={service.path}
                className="flex flex-col items-center space-y-2 transition active:scale-[0.95]"
              >
                <div className={`flex h-16 w-16 items-center justify-center rounded-[1.25rem] text-white shadow-sm ${service.color}`}>
                  {service.icon}
                </div>
                <span className="w-20 text-center text-[11px] font-bold leading-tight text-gray-800">
                  {service.name}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* PROMO CAROUSEL */}
        {promos.length > 0 && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Promo Menarik</h2>
              <button className="text-sm font-bold text-primary">Lihat Semua</button>
            </div>
            
            <div className="-mx-4 flex space-x-4 overflow-x-auto px-4 pb-4 scrollbar-hide">
              {promos.map((promo, idx) => (
                <div key={promo.id} className={`relative h-36 min-w-[280px] shrink-0 overflow-hidden rounded-3xl shadow-sm ${idx % 2 === 0 ? 'bg-gradient-to-r from-orange-400 to-red-500' : 'bg-gradient-to-r from-teal-400 to-emerald-500'}`}>
                  <div className="absolute inset-0 p-5 flex flex-col justify-center">
                    <span className="rounded-full bg-white/20 w-fit px-3 py-1 text-[11px] font-bold text-white mb-2 tracking-wider border border-white/30">
                      KODE: {promo.code}
                    </span>
                    <h3 className="text-lg font-bold text-white w-3/4 leading-tight">
                      {promo.discount_type === 'PERCENTAGE' ? `Diskon ${promo.discount_value}%` : `Potongan Rp ${promo.discount_value.toLocaleString('id-ID')}`}
                    </h3>
                    {promo.description && <p className="text-white/80 text-xs mt-1 line-clamp-1">{promo.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* INFO & HELP CENTER */}
        <div className="mt-8 mb-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Pusat Layanan</h2>
          <div className="space-y-4">
            
            {/* Help Center Card */}
            <div 
              onClick={() => navigate('/chat-list')}
              className="flex cursor-pointer items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-gray-100 transition active:scale-[0.98]"
            >
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                  <HeadphonesIcon size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">Bantuan CS 24/7</h3>
                  <p className="text-xs text-gray-500">Punya kendala? Hubungi kami</p>
                </div>
              </div>
              <button className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm">Chat</button>
            </div>

            {/* Safety Guarantee Card */}
            <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 p-4 border border-emerald-100">
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-emerald-500 shadow-sm">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-emerald-900">Perjalanan Aman</h3>
                  <p className="text-xs text-emerald-700">Driver & Armada terverifikasi</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* BOTTOM NAVIGATION (Dummy for visual) */}
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-gray-200 bg-white pb-safe pt-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button className="flex flex-col items-center space-y-1 p-2 text-primary">
            <CarFront size={24} className="fill-primary/20" />
            <span className="text-[10px] font-bold">Home</span>
          </button>
          <button onClick={() => navigate('/orders')} className="flex flex-col items-center space-y-1 p-2 text-gray-400 hover:text-gray-600">
            <Package size={24} />
            <span className="text-[10px] font-bold">Pesanan</span>
          </button>
          <button onClick={() => navigate('/chat-list')} className="flex flex-col items-center space-y-1 p-2 text-gray-400 hover:text-gray-600">
            <MessageSquare size={24} />
            <span className="text-[10px] font-bold">Pesan</span>
          </button>
        </div>

      </div>
      
      {/* SafeArea padding for bottom nav */}
      <div className="h-16"></div>
    </div>
  )
}
