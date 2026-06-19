import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Send, Phone } from 'lucide-react'

export default function Chat() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  
  const [session, setSession] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [receiverId, setReceiverId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    checkSessionAndFetch()
  }, [roomId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const checkSessionAndFetch = async () => {
    const demoMode = localStorage.getItem('demo_mode')
    
    if (demoMode) {
      setSession({ user: { id: 'demo-user-id', user_metadata: { role: demoMode } } })
      setReceiverId('demo-receiver-id')
      setMessages([
        { id: '1', sender_id: 'demo-receiver-id', message: 'Halo, saya sedang menuju lokasi.', created_at: new Date(Date.now() - 60000).toISOString() },
        { id: '2', sender_id: 'demo-user-id', message: 'Baik, terima kasih.', created_at: new Date().toISOString() }
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

    if (roomId && roomId !== 'cs') {
      // Fetch order details to determine receiver
      const { data: orderData } = await supabase.from('orders').select('user_id, driver_id').eq('id', roomId).single()
      if (orderData) {
        if (currentSession.user.id === orderData.user_id) {
          setReceiverId(orderData.driver_id)
        } else if (currentSession.user.id === orderData.driver_id) {
          setReceiverId(orderData.user_id)
        }
      }

      // Fetch existing messages
      const { data: chatData } = await supabase
        .from('chats')
        .select('*')
        .eq('order_id', roomId)
        .order('created_at', { ascending: true })

      if (chatData) setMessages(chatData)

      // Subscribe to real-time changes
      const channel = supabase
        .channel(`chat_${roomId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chats', filter: `order_id=eq.${roomId}` },
          (payload) => {
            setMessages((prev) => [...prev, payload.new])
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
    
    setLoading(false)
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !session) return

    const msgText = newMessage
    setNewMessage('')

    if (localStorage.getItem('demo_mode')) {
      setMessages([...messages, { 
        id: Math.random().toString(), 
        sender_id: session.user.id, 
        message: msgText, 
        created_at: new Date().toISOString() 
      }])
      return
    }

    if (roomId && receiverId) {
      await supabase.from('chats').insert({
        order_id: roomId === 'cs' ? null : roomId,
        sender_id: session.user.id,
        receiver_id: receiverId,
        message: msgText
      })
    }
  }

  const handleCall = async () => {
    if (localStorage.getItem('demo_mode')) {
      await supabase.channel('demo_calls').send({
        type: 'broadcast',
        event: 'incoming_call',
        payload: { callerName: 'Pengguna (Demo)', roomId: roomId }
      })
      navigate(`/call/${roomId}`, { state: { isCaller: true } })
      return
    }

    if (receiverId && session) {
      const myName = session.user.user_metadata?.full_name || 'Pengguna'
      await supabase.channel(`user_${receiverId}`).send({
        type: 'broadcast',
        event: 'incoming_call',
        payload: { callerName: myName, roomId: roomId }
      })
    }
    navigate(`/call/${roomId}`, { state: { isCaller: true } })
  }

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50">Memuat...</div>

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* HEADER */}
      <header className="flex h-16 items-center justify-between border-b bg-white px-4 shadow-sm z-10 shrink-0">
        <div className="flex items-center space-x-3">
          <button onClick={() => navigate(-1)} className="rounded-full p-2 text-gray-600 hover:bg-gray-100 transition">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{roomId === 'cs' ? 'Customer Service' : 'Pesan'}</h1>
            <p className="text-[11px] font-medium text-green-500">Online</p>
          </div>
        </div>
        <button 
          onClick={handleCall}
          className="rounded-full bg-blue-50 p-2 text-blue-600 hover:bg-blue-100 transition"
        >
          <Phone size={20} />
        </button>
      </header>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.sender_id === session?.user?.id
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  isMe 
                  ? 'bg-blue-600 text-white rounded-br-sm' 
                  : 'bg-white border border-gray-100 shadow-sm text-gray-800 rounded-bl-sm'
                }`}
              >
                <p className="text-[15px]">{msg.message}</p>
                <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                  {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA */}
      <div className="bg-white px-4 py-3 border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] pb-safe shrink-0">
        <form onSubmit={sendMessage} className="flex items-center space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Ketik pesan..."
            className="flex-1 bg-gray-100 rounded-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white transition active:scale-95 disabled:opacity-50"
          >
            <Send size={18} className="ml-1" />
          </button>
        </form>
      </div>
    </div>
  )
}
