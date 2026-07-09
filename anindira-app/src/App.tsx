import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import Home from './pages/Home'
import Carpool from './pages/Carpool'
import Package from './pages/Package'
import Airport from './pages/Airport'
import Rental from './pages/Rental'
import Chat from './pages/Chat'
import ChatList from './pages/ChatList'
import Call from './pages/Call'
import Orders from './pages/Orders'
import TopUp from './pages/TopUp'
import DriverDashboard from './pages/driver/Dashboard'
import AdminDashboard from './pages/admin/Dashboard'
import AdminUsers from './pages/admin/Users'
import AdminTransactions from './pages/admin/Transactions'
import AdminSettings from './pages/admin/Settings'
import AdminOutlets from './pages/admin/Outlets'
import AdminNotifications from './pages/admin/Notifications'
import AdminPromos from './pages/admin/Promos'
import AdminLogin from './pages/admin/Login'
import DeleteDataRequest from './pages/DeleteDataRequest'
import PrivacyPolicy from './pages/PrivacyPolicy'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { initializePushNotifications } from './lib/pushNotifications'
import { LayoutDashboard, Users as UsersIcon, Settings, Bell, LogOut, Menu, X, CreditCard, Tag, Store } from 'lucide-react'
import IncomingCallAlert from './components/IncomingCallAlert'

// Declare Capacitor on Window
declare global {
  interface Window {
    Capacitor: any;
  }
}

// Layout for Admin
function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const location = useLocation()

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform flex-col bg-gray-900 text-white transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex h-16 items-center justify-between border-b border-gray-800 px-4 md:justify-center">
          <h1 className="text-xl font-bold tracking-wider">ANINDIRA ADMIN</h1>
          <button 
            className="md:hidden text-gray-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={24} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto h-[calc(100vh-8rem)]">
          <Link to="/admin" className={`flex items-center space-x-3 rounded-lg px-4 py-3 ${location.pathname === '/admin' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
            <LayoutDashboard size={20} />
            <span>Dashboard & Pesanan</span>
          </Link>
          <Link to="/admin/users" className={`flex items-center space-x-3 rounded-lg px-4 py-3 ${location.pathname === '/admin/users' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
            <UsersIcon size={20} />
            <span>Pengguna & Driver</span>
          </Link>
          <Link to="/admin/notifications" className={`flex items-center space-x-3 rounded-lg px-4 py-3 ${location.pathname === '/admin/notifications' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
            <Bell size={20} />
            <span>Notifikasi</span>
          </Link>
          <Link to="/admin/transactions" className={`flex items-center space-x-3 rounded-lg px-4 py-3 ${location.pathname === '/admin/transactions' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
            <CreditCard size={20} />
            <span>Manajemen Transaksi</span>
          </Link>
          <Link to="/admin/promos" className={`flex items-center space-x-3 rounded-lg px-4 py-3 ${location.pathname === '/admin/promos' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
            <Tag size={20} />
            <span>Manajemen Promo</span>
          </Link>
          <Link to="/admin/outlets" className={`flex items-center space-x-3 rounded-lg px-4 py-3 ${location.pathname === '/admin/outlets' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
            <Store size={20} />
            <span>Outlet & Cabang</span>
          </Link>
          <Link to="/admin/settings" className={`flex items-center space-x-3 rounded-lg px-4 py-3 ${location.pathname === '/admin/settings' ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
            <Settings size={20} />
            <span>Pengaturan Produk</span>
          </Link>
        </nav>
        <div className="border-t border-gray-800 p-4 absolute bottom-0 w-full">
          <button onClick={handleLogout} className="flex w-full items-center space-x-3 rounded-lg px-4 py-3 text-red-400 hover:bg-gray-800 hover:text-red-300">
            <LogOut size={20} />
            <span>Keluar</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-4 md:px-8">
          <div className="flex items-center space-x-3">
            <button 
              className="md:hidden text-gray-600 hover:text-gray-900"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-semibold text-gray-800 hidden md:block">Dashboard</h2>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-600 hidden sm:block">Admin Pusat</span>
            <div className="h-8 w-8 rounded-full bg-blue-500 shadow-inner flex items-center justify-center text-white font-bold text-xs">
              A
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

function PrivateRoute({ children, requiredRole }: { children: React.ReactNode, requiredRole?: string }) {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const location = useLocation()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div className="flex h-screen items-center justify-center">Memuat...</div>

  if (!session) {
    if (requiredRole === 'ADMIN') {
      return <Navigate to="/admin/login" state={{ from: location }} replace />
    }
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const role = session.user.user_metadata?.role || 'USER'

  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function App() {
  useEffect(() => {
    // Listen for auth state changes to initialize push notifications with valid session
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        initializePushNotifications();
      }
    });

    // Also try initializing on mount if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        initializePushNotifications();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <BrowserRouter>
      <IncomingCallAlert />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/permintaanhapusdata" element={<DeleteDataRequest />} />
        <Route path="/kebijakanprivasi" element={<PrivacyPolicy />} />
        
        {/* User / Driver Routes */}
        <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/carpool" element={<PrivateRoute><Carpool /></PrivateRoute>} />
        <Route path="/package" element={<PrivateRoute><Package /></PrivateRoute>} />
        <Route path="/airport" element={<PrivateRoute><Airport /></PrivateRoute>} />
        <Route path="/rental" element={<PrivateRoute><Rental /></PrivateRoute>} />
        <Route path="/orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
        <Route path="/topup" element={<PrivateRoute><TopUp /></PrivateRoute>} />
        <Route path="/driver" element={<PrivateRoute requiredRole="DRIVER"><DriverDashboard /></PrivateRoute>} />

        {/* Communication Routes */}
        <Route path="/chat-list" element={<PrivateRoute><ChatList /></PrivateRoute>} />
        <Route path="/chat/:roomId" element={<PrivateRoute><Chat /></PrivateRoute>} />
        <Route path="/call/:roomId" element={<PrivateRoute><Call /></PrivateRoute>} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<PrivateRoute requiredRole="ADMIN"><AdminLayout><AdminDashboard /></AdminLayout></PrivateRoute>} />
        <Route path="/admin/users" element={<PrivateRoute requiredRole="ADMIN"><AdminLayout><AdminUsers /></AdminLayout></PrivateRoute>} />
        <Route path="/admin/transactions" element={<PrivateRoute requiredRole="ADMIN"><AdminLayout><AdminTransactions /></AdminLayout></PrivateRoute>} />
        <Route path="/admin/promos" element={<PrivateRoute requiredRole="ADMIN"><AdminLayout><AdminPromos /></AdminLayout></PrivateRoute>} />
        <Route path="/admin/outlets" element={<PrivateRoute requiredRole="ADMIN"><AdminLayout><AdminOutlets /></AdminLayout></PrivateRoute>} />
        <Route path="/admin/settings" element={<PrivateRoute requiredRole="ADMIN"><AdminLayout><AdminSettings /></AdminLayout></PrivateRoute>} />
        <Route path="/admin/notifications" element={<PrivateRoute requiredRole="ADMIN"><AdminLayout><AdminNotifications /></AdminLayout></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
