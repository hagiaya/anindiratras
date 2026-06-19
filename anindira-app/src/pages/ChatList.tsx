import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageSquare, HeadphonesIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function ChatList() {
  const navigate = useNavigate()
  const [session, setSession] = useState<any>(null)
  
  useEffect(() => {
    const demoMode = localStorage.getItem('demo_mode')
    if (demoMode) {
      setSession({ user: { id: 'demo-user-id', user_metadata: { role: demoMode } } })
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) navigate('/login')
        setSession(session)
      })
    }
  }, [navigate])

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="flex items-center space-x-3 bg-white px-4 py-4 shadow-sm">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 text-gray-600 hover:bg-gray-100 transition">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Pesan</h1>
      </header>

      <div className="flex-1 p-4">
        {/* Customer Service Default Chat */}
        <button 
          onClick={() => navigate('/chat/cs')}
          className="w-full flex items-center space-x-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 transition active:scale-[0.98] mb-4"
        >
          <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <HeadphonesIcon size={24} />
          </div>
          <div className="flex-1 text-left">
            <h3 className="font-bold text-gray-900 text-base">Customer Service</h3>
            <p className="text-sm text-gray-500 line-clamp-1">Ada yang bisa kami bantu hari ini?</p>
          </div>
          <div className="h-3 w-3 rounded-full bg-green-500 shrink-0"></div>
        </button>

        {/* Demo Driver/User active chat */}
        {session?.user?.user_metadata?.role === 'USER' && (
          <button 
            onClick={() => navigate('/chat/demo-order-1')}
            className="w-full flex items-center space-x-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 transition active:scale-[0.98] mb-4"
          >
            <div className="h-12 w-12 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
              <MessageSquare size={24} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-bold text-gray-900 text-base">Sopir: Budi Santoso</h3>
              <p className="text-sm text-gray-500 line-clamp-1">Pesanan Carpool - Menuju Lokasi</p>
            </div>
            <div className="text-xs font-bold text-gray-400">12:30</div>
          </button>
        )}

        {session?.user?.user_metadata?.role === 'DRIVER' && (
          <button 
            onClick={() => navigate('/chat/demo-order-2')}
            className="w-full flex items-center space-x-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 transition active:scale-[0.98] mb-4"
          >
            <div className="h-12 w-12 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
              <MessageSquare size={24} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-bold text-gray-900 text-base">Penumpang: Siti Aminah</h3>
              <p className="text-sm text-gray-500 line-clamp-1">Pesanan Carpool Aktif</p>
            </div>
            <div className="text-xs font-bold text-gray-400">Baru saja</div>
          </button>
        )}

        {/* Placeholder for empty state if there were no chats */}
        <div className="mt-8 text-center text-gray-400">
          <MessageSquare size={48} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">Belum ada pesan lain.</p>
        </div>
      </div>
    </div>
  )
}
