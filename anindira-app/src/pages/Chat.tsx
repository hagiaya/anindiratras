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
  const [orderInfo, setOrderInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    checkSessionAndFetch()
  }, [roomId])

  useEffect(() => {
    if (!session || !roomId) return;

    let filterString = `order_id=eq.${roomId}`
    if (roomId === 'cs') {
      filterString = `receiver_id=eq.${session.user.id}`
    }

    const channelName = `chat_${roomId}_${session.user.id}_${Date.now()}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chats', filter: filterString },
        (payload) => {
          if (roomId === 'cs' && payload.new.order_id !== null) return;
          setMessages((prev) => {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, session])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const checkSessionAndFetch = async () => {
    try {
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

      // Add timeout to prevent hanging on getSession
      const getSessionPromise = supabase.auth.getSession()
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ timeout: true }), 5000))
      const sessionResult: any = await Promise.race([getSessionPromise, timeoutPromise])

      if (sessionResult.timeout) {
         console.warn("Session fetch timeout")
      }

      let currentSession = sessionResult?.data?.session
      
      // Fallback for demo admin bypass
      if (!currentSession && localStorage.getItem('demo_admin') === 'true') {
         currentSession = { user: { id: 'admin-dev', user_metadata: { role: 'ADMIN' } } }
      }

      if (!currentSession) {
        navigate('/login')
        return
      }
      setSession(currentSession)

      if (roomId === 'cs') {
        setReceiverId('admin')
        
        const { data: chatData } = await supabase
          .from('chats')
          .select('*')
          .is('order_id', null)
          .or(`sender_id.eq.${currentSession.user.id},receiver_id.eq.${currentSession.user.id}`)
          .order('created_at', { ascending: true })

        if (chatData) setMessages(chatData)
      } else if (roomId) {
        // Fetch order details to determine receiver
        const { data: orderData } = await supabase.from('orders').select('user_id, driver_id').eq('id', roomId).single()
        console.log("Chat orderData:", orderData);
        if (orderData) {
          setOrderInfo(orderData)
          if (currentSession.user.id === orderData.user_id) {
            setReceiverId(orderData.driver_id)
          } else if (currentSession.user.id === orderData.driver_id) {
            setReceiverId(orderData.user_id)
          } else if (currentSession.user.user_metadata?.role === 'ADMIN') {
            // Default receiver for Admin is Driver if assigned, else User
            setReceiverId(orderData.driver_id || orderData.user_id)
          }
        }

        // Fetch existing messages
        const { data: chatData } = await supabase
          .from('chats')
          .select('*')
          .eq('order_id', roomId)
          .order('created_at', { ascending: true })

        if (chatData) setMessages(chatData)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
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

    if (!roomId) {
      alert("Error: Room ID tidak valid.");
      return;
    }

    if (!receiverId) {
      alert("Error: Tidak dapat menemukan penerima chat (Driver belum ditugaskan).");
      return;
    }

    const { error } = await supabase.from('chats').insert({
      order_id: roomId === 'cs' ? null : roomId,
      sender_id: session.user.id,
      receiver_id: receiverId,
      message: msgText
    })

    if (error) {
      console.error("Gagal mengirim pesan:", error);
      alert(`Gagal mengirim pesan: ${error.message}`);
    } else {
      // Optimistically add to UI to ensure it appears instantly
      const newMsg = {
        id: Date.now().toString(), // temporary ID until fetch/realtime replaces it or deduplicates it
        order_id: roomId === 'cs' ? null : roomId,
        sender_id: session.user.id,
        receiver_id: receiverId,
        message: msgText,
        created_at: new Date().toISOString()
      }
      setMessages((prev) => [...prev, newMsg])
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
      const callRoomId = roomId === 'cs' ? `cs_${session.user.id}` : roomId
      
      await supabase.channel(`user_${receiverId}`).send({
        type: 'broadcast',
        event: 'incoming_call',
        payload: { callerName: myName, roomId: callRoomId }
      })
      navigate(`/call/${callRoomId}`, { state: { isCaller: true } })
    }
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
        {roomId !== 'cs' && (
          <button 
            onClick={handleCall}
            className="rounded-full bg-blue-50 p-2 text-blue-600 hover:bg-blue-100 transition"
          >
            <Phone size={20} />
          </button>
        )}
      </header>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.sender_id === session?.user?.id
          
          let senderLabel = 'Admin'
          let senderColor = 'text-purple-600'
          if (isMe) {
            senderLabel = 'Saya'
            senderColor = 'text-blue-200'
          } else if (orderInfo) {
            if (msg.sender_id === orderInfo.driver_id) {
              senderLabel = 'Sopir'
              senderColor = 'text-orange-500'
            } else if (msg.sender_id === orderInfo.user_id) {
              senderLabel = 'Penumpang'
              senderColor = 'text-green-500'
            }
          } else if (roomId === 'cs' && !isMe) {
            senderLabel = 'Customer Service'
            senderColor = 'text-blue-500'
          }

          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              {!isMe && (
                <span className={`text-[10px] font-bold mb-1 ml-1 ${senderColor}`}>
                  {senderLabel}
                </span>
              )}
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
                  {isMe && <span className="ml-1 opacity-75">({senderLabel})</span>}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA */}
      <div className="bg-white px-4 py-3 border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] pb-safe shrink-0">
        {session?.user?.user_metadata?.role === 'ADMIN' && orderInfo && (
          <div className="mb-2 flex items-center space-x-2">
            <span className="text-xs font-bold text-gray-500">Kirim Notif Ke:</span>
            <select 
              value={receiverId || ''} 
              onChange={(e) => setReceiverId(e.target.value)}
              className="text-xs border rounded px-2 py-1 bg-gray-50 focus:outline-none"
            >
              {orderInfo.driver_id && <option value={orderInfo.driver_id}>Sopir</option>}
              {orderInfo.user_id && <option value={orderInfo.user_id}>Penumpang</option>}
            </select>
          </div>
        )}
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
