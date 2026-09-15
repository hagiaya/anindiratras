import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { playNotificationSound } from '../lib/audioNotification'
import { MessageSquare, X } from 'lucide-react'

interface MessageNotification {
  id: string
  orderId: string | null
  senderName: string
  message: string
}

export default function IncomingMessageAlert() {
  const [notification, setNotification] = useState<MessageNotification | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    let channel: any = null

    const setupChatListener = async (userId: string) => {
      if (channel) supabase.removeChannel(channel)

      channel = supabase
        .channel(`global_messages_${userId}`)
        .on(
          'postgres_changes',
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'chats', 
            filter: `receiver_id=eq.${userId}` 
          },
          async (payload: any) => {
            const newMsg = payload.new
            if (!newMsg) return

            // If user is already on this chat page, Chat.tsx handles audio & UI
            const currentPath = window.location.pathname
            const targetPath = newMsg.order_id ? `/chat/${newMsg.order_id}` : '/chat/cs'
            if (currentPath === targetPath) return

            // Play notification sound chime
            playNotificationSound()

            // Fetch sender name
            let senderName = 'Pesan Baru'
            try {
              const { data: senderUser } = await supabase
                .from('users')
                .select('full_name, role')
                .eq('id', newMsg.sender_id)
                .maybeSingle()
              
              if (senderUser?.full_name) {
                senderName = senderUser.full_name
              } else if (senderUser?.role === 'DRIVER') {
                senderName = 'Sopir'
              } else if (senderUser?.role === 'ADMIN') {
                senderName = 'Admin Anindira'
              }
            } catch (_e) {}

            setNotification({
              id: newMsg.id,
              orderId: newMsg.order_id,
              senderName,
              message: newMsg.message
            })
          }
        )
        .subscribe()
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        setupChatListener(session.user.id)
      }
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) {
        setupChatListener(session.user.id)
      } else if (channel) {
        supabase.removeChannel(channel)
      }
    })

    return () => {
      if (channel) supabase.removeChannel(channel)
      authListener.subscription.unsubscribe()
    }
  }, [])

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null)
      }, 6000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  // Dismiss when route changes
  useEffect(() => {
    setNotification(null)
  }, [location.pathname])

  if (!notification) return null

  const handleOpenChat = () => {
    const target = notification.orderId ? `/chat/${notification.orderId}` : '/chat/cs'
    setNotification(null)
    navigate(target)
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-[9990] flex justify-center pointer-events-none animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="w-full max-w-md bg-white border border-gray-200 shadow-xl rounded-2xl p-3.5 flex items-center justify-between space-x-3 pointer-events-auto">
        <div 
          onClick={handleOpenChat}
          className="flex items-center space-x-3 flex-1 cursor-pointer overflow-hidden"
        >
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <MessageSquare size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-gray-900 truncate">{notification.senderName}</p>
            <p className="text-xs text-gray-500 truncate">{notification.message}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <button 
            onClick={handleOpenChat}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition active:scale-95"
          >
            Buka
          </button>
          <button 
            onClick={() => setNotification(null)}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
