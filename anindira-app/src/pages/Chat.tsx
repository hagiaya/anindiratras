import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Send, Phone, PhoneCall, MessageSquare, X } from 'lucide-react'
import { playNotificationSound } from '../lib/audioNotification'

export default function Chat() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  
  const [session, setSession] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [receiverId, setReceiverId] = useState<string | null>(null)
  const [receiverName, setReceiverName] = useState<string>('Pesan')
  const [receiverPhone, setReceiverPhone] = useState<string>('')
  const [orderInfo, setOrderInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showCallModal, setShowCallModal] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const roomChannelRef = useRef<any>(null)

  useEffect(() => {
    checkSessionAndFetch()
  }, [roomId])

  // Setup Realtime: Dual Broadcast (instant <50ms) + Postgres Changes
  useEffect(() => {
    if (!session || !roomId) return

    let filterString = `order_id=eq.${roomId}`
    if (roomId === 'cs') {
      filterString = `receiver_id=eq.${session.user.id}`
    }

    const channelRoomName = `room_chat_${roomId}`
    const roomChannel = supabase.channel(channelRoomName)
    roomChannelRef.current = roomChannel

    roomChannel
      .on('broadcast', { event: 'chat_msg' }, ({ payload }) => {
        if (payload && payload.sender_id !== session.user.id) {
          playNotificationSound()
          setMessages((prev) => {
            if (prev.some(m => m.id === payload.id || (m.sender_id === payload.sender_id && m.message === payload.message && Math.abs(new Date(m.created_at).getTime() - new Date(payload.created_at).getTime()) < 4000))) {
              return prev
            }
            return [...prev, payload]
          })
        }
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chats', filter: filterString },
        (payload) => {
          if (roomId === 'cs' && payload.new.order_id !== null) return
          if (payload.new.sender_id !== session.user.id) {
            playNotificationSound()
          }
          setMessages((prev) => {
            if (prev.some(m => m.id === payload.new.id || (m.sender_id === payload.new.sender_id && m.message === payload.new.message && Math.abs(new Date(m.created_at).getTime() - new Date(payload.new.created_at).getTime()) < 4000))) {
              // Replace temporary id with confirmed id
              return prev.map(m => (m.message === payload.new.message && m.sender_id === payload.new.sender_id) ? payload.new : m)
            }
            return [...prev, payload.new]
          })
        }
      )
      .subscribe()

    // Safety polling every 4 seconds to ensure no messages are ever lost
    const pollInterval = setInterval(async () => {
      try {
        if (roomId === 'cs') {
          const { data } = await supabase
            .from('chats')
            .select('*')
            .is('order_id', null)
            .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
            .order('created_at', { ascending: true })
          if (data && data.length > 0) {
            setMessages(data)
          }
        } else {
          const { data } = await supabase
            .from('chats')
            .select('*')
            .eq('order_id', roomId)
            .order('created_at', { ascending: true })
          if (data && data.length > 0) {
            setMessages(data)
          }
        }
      } catch (_e) {}
    }, 4000)

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(roomChannel)
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
        setReceiverName('Sopir (Demo)')
        setReceiverPhone('081234567890')
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

      if (roomId === 'cs') {
        setReceiverId('admin')
        setReceiverName('Customer Service Anindira')
        
        // Fetch outlet phone for CS
        const { data: outletData } = await supabase.from('outlets').select('phone, name').eq('is_active', true).limit(1).maybeSingle()
        if (outletData?.phone) setReceiverPhone(outletData.phone)
        
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
        if (orderData) {
          setOrderInfo(orderData)
          let targetId = null
          if (currentSession.user.id === orderData.user_id) {
            targetId = orderData.driver_id
          } else if (currentSession.user.id === orderData.driver_id) {
            targetId = orderData.user_id
          } else if (currentSession.user.user_metadata?.role === 'ADMIN') {
            targetId = orderData.driver_id || orderData.user_id
          }
          setReceiverId(targetId)

          if (targetId) {
            const { data: userData } = await supabase.from('users').select('full_name, phone, role').eq('id', targetId).maybeSingle()
            if (userData) {
              setReceiverName(userData.full_name || (userData.role === 'DRIVER' ? 'Sopir' : 'Penumpang'))
              if (userData.phone) setReceiverPhone(userData.phone)
            }
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

    const msgText = newMessage.trim()
    setNewMessage('')

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    const newMsgObj = {
      id: tempId,
      order_id: roomId === 'cs' ? null : roomId,
      sender_id: session.user.id,
      receiver_id: receiverId,
      message: msgText,
      created_at: new Date().toISOString()
    }

    // 1. Optimistically display in sender UI immediately (<1ms)
    setMessages((prev) => [...prev, newMsgObj])

    // 2. Broadcast immediately over WebSocket (<50ms delivery to receiver)
    if (roomChannelRef.current) {
      roomChannelRef.current.send({
        type: 'broadcast',
        event: 'chat_msg',
        payload: newMsgObj
      }).catch((e: any) => console.warn('Broadcast send notice:', e))
    }

    if (localStorage.getItem('demo_mode')) return

    if (!roomId) {
      alert("Error: Room ID tidak valid.")
      return
    }

    if (!receiverId) {
      alert("Error: Sopir belum ditugaskan untuk pesanan ini.")
      return
    }

    // 3. Persist to Supabase Database
    const { error } = await supabase.from('chats').insert({
      order_id: roomId === 'cs' ? null : roomId,
      sender_id: session.user.id,
      receiver_id: receiverId,
      message: msgText
    })

    if (error) {
      console.error("Gagal menyimpan pesan ke database:", error)
    }
  }

  const handleStartInAppCall = async () => {
    setShowCallModal(false)
    if (localStorage.getItem('demo_mode')) {
      await supabase.channel('demo_calls').send({
        type: 'broadcast',
        event: 'incoming_call',
        payload: { callerName: 'Pengguna (Demo)', roomId: roomId }
      })
      navigate(`/call/${roomId}`, { 
        state: { 
          isCaller: true, 
          partnerPhone: receiverPhone, 
          partnerName: receiverName 
        } 
      })
      return
    }

    if (receiverId && session) {
      const myName = session.user.user_metadata?.full_name || 'Pengguna'
      const callRoomId = roomId === 'cs' ? `cs_${session.user.id}` : roomId
      
      const targetChannel = supabase.channel(`user_${receiverId}`)
      targetChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          targetChannel.send({
            type: 'broadcast',
            event: 'incoming_call',
            payload: { 
              callerName: myName, 
              roomId: callRoomId,
              partnerPhone: session.user.phone || ''
            }
          }).catch(() => {})
        }
      })

      navigate(`/call/${callRoomId}`, { 
        state: { 
          isCaller: true, 
          partnerPhone: receiverPhone, 
          partnerName: receiverName 
        } 
      })
    }
  }

  const handleStartDirectPhoneCall = () => {
    setShowCallModal(false)
    if (receiverPhone) {
      window.location.href = `tel:${receiverPhone}`
    } else {
      alert('Nomor telepon belum tersedia.')
    }
  }

  const handleStartWhatsAppCall = () => {
    setShowCallModal(false)
    if (receiverPhone) {
      let clean = receiverPhone.replace(/\D/g, '')
      if (clean.startsWith('0')) clean = '62' + clean.slice(1)
      window.open(`https://wa.me/${clean}?text=Halo,%20saya%20menghubungi%20terkait%20pesanan%20AnindiraTrans.`, '_blank')
    } else {
      alert('Nomor telepon/WhatsApp belum tersedia.')
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
            onClick={() => setShowCallModal(true)}
            className="rounded-full bg-blue-50 p-2.5 text-blue-600 hover:bg-blue-100 transition active:scale-95"
            title="Hubungi via Telepon / Panggilan"
          >
            <Phone size={20} />
          </button>
        )}
      </header>

      {/* CALL CHOICE MODAL */}
      {showCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowCallModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <PhoneCall size={30} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Pilih Metode Panggilan</h3>
              <p className="text-xs text-gray-500 mt-1">Hubungi {receiverName}</p>
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleStartInAppCall}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-sm border border-blue-200 transition active:scale-95"
              >
                <div className="flex items-center space-x-3">
                  <Phone size={18} className="text-blue-600" />
                  <div className="text-left">
                    <p className="font-bold">Panggilan Suara In-App</p>
                    <p className="text-[11px] font-normal text-blue-500">VoIP Langsung via Aplikasi</p>
                  </div>
                </div>
                <span className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded-full font-bold">Panggil</span>
              </button>

              {receiverPhone && (
                <>
                  <button 
                    onClick={handleStartWhatsAppCall}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-sm border border-emerald-200 transition active:scale-95"
                  >
                    <div className="flex items-center space-x-3">
                      <MessageSquare size={18} className="text-emerald-600" />
                      <div className="text-left">
                        <p className="font-bold">WhatsApp Call / Chat</p>
                        <p className="text-[11px] font-normal text-emerald-600">{receiverPhone}</p>
                      </div>
                    </div>
                    <span className="text-xs bg-emerald-600 text-white px-2.5 py-1 rounded-full font-bold">Buka WA</span>
                  </button>

                  <button 
                    onClick={handleStartDirectPhoneCall}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-sm border border-gray-200 transition active:scale-95"
                  >
                    <div className="flex items-center space-x-3">
                      <PhoneCall size={18} className="text-gray-600" />
                      <div className="text-left">
                        <p className="font-bold">Telepon Seluler Biasa (GSM)</p>
                        <p className="text-[11px] font-normal text-gray-500">Panggilan Pulsa / Dial</p>
                      </div>
                    </div>
                    <span className="text-xs bg-gray-700 text-white px-2.5 py-1 rounded-full font-bold">Dial</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
            <div 
              key={msg.id} 
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div 
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 shadow-sm ${
                  isMe 
                    ? 'bg-blue-600 text-white rounded-br-xs' 
                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-xs'
                }`}
              >
                {!isMe && (
                  <p className={`text-[11px] font-semibold mb-1 ${senderColor}`}>
                    {senderLabel}
                  </p>
                )}
                <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
