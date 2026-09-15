import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, PhoneOff, Mic, MicOff, Volume2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Call() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Determine if this user initiated the call
  const isCaller = location.state?.isCaller || false
  const [partnerPhone, setPartnerPhone] = useState<string>(location.state?.partnerPhone || '')
  const [partnerName, setPartnerName] = useState<string>(location.state?.partnerName || 'Lawan Bicara')
  
  const [status, setStatus] = useState<string>('Menghubungkan...')
  const [isMuted, setIsMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const channelRef = useRef<any>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isConnectedRef = useRef(false)
  isConnectedRef.current = isConnected

  // Fetch partner info from order/user if not passed in state
  useEffect(() => {
    if (!partnerPhone && roomId && roomId !== 'cs') {
      supabase.from('orders')
        .select('user_id, driver_id')
        .eq('id', roomId)
        .maybeSingle()
        .then(async ({ data: orderData }) => {
          if (orderData) {
            const { data: { session } } = await supabase.auth.getSession()
            const targetUserId = session?.user.id === orderData.user_id ? orderData.driver_id : orderData.user_id
            if (targetUserId) {
              const { data: targetUser } = await supabase.from('users').select('full_name, phone').eq('id', targetUserId).maybeSingle()
              if (targetUser) {
                if (targetUser.phone) setPartnerPhone(targetUser.phone)
                if (targetUser.full_name) setPartnerName(targetUser.full_name)
              }
            }
          }
        })
    }
  }, [roomId, partnerPhone])

  useEffect(() => {
    // ICE Servers (Google's public STUN servers)
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    }

    let retryOfferInterval: any = null

    const initCall = async () => {
      try {
        setStatus('Meminta izin mikrofon...')
        // 1. Get local audio
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        localStreamRef.current = stream

        setStatus('Menyiapkan koneksi aman...')
        // 2. Initialize RTCPeerConnection
        const pc = new RTCPeerConnection(configuration)
        peerConnectionRef.current = pc

        // Add local tracks to peer connection
        stream.getTracks().forEach(track => pc.addTrack(track, stream))

        // Handle incoming remote tracks
        pc.ontrack = (event) => {
          if (remoteAudioRef.current && event.streams[0]) {
            remoteAudioRef.current.srcObject = event.streams[0]
            remoteAudioRef.current.play().catch(e => console.warn('Audio play notice:', e))
            setIsConnected(true)
            setStatus('Terhubung')
            if (retryOfferInterval) clearInterval(retryOfferInterval)
          }
        }

        // Setup signaling channel
        const channelName = `webrtc_${roomId}`
        const channel = supabase.channel(channelName)
        channelRef.current = channel

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            channel.send({
              type: 'broadcast',
              event: 'webrtc_signal',
              payload: { type: 'candidate', candidate: event.candidate }
            }).catch(() => {})
          }
        }

        const sendOffer = async () => {
          if (isConnectedRef.current) return
          try {
            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)
            await channel.send({
              type: 'broadcast',
              event: 'webrtc_signal',
              payload: { type: 'offer', offer }
            })
          } catch (e) {
            console.warn('Send offer error:', e)
          }
        }

        // Handle WebRTC signaling
        channel.on('broadcast', { event: 'webrtc_signal' }, async (payload: any) => {
          const data = payload.payload

          if (data.type === 'receiver_ready' && isCaller) {
            setStatus('Penerima siap, menyambungkan...')
            await sendOffer()
          }

          else if (data.type === 'offer' && !isCaller) {
            setStatus('Menyambungkan suara...')
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(data.offer))
              const answer = await pc.createAnswer()
              await pc.setLocalDescription(answer)
              await channel.send({
                type: 'broadcast',
                event: 'webrtc_signal',
                payload: { type: 'answer', answer }
              })
            } catch (e) {
              console.warn('Error handling offer:', e)
            }
          } 
          
          else if (data.type === 'answer' && isCaller) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(data.answer))
              setStatus('Terhubung')
              setIsConnected(true)
              if (retryOfferInterval) clearInterval(retryOfferInterval)
            } catch (e) {
              console.warn('Error setting remote description answer:', e)
            }
          } 
          
          else if (data.type === 'candidate') {
            try {
              if (pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate))
              }
            } catch (e) {
              console.error('Error adding received ice candidate', e)
            }
          }
          
          else if (data.type === 'end_call') {
            handleEndCall(false)
          }
        })

        // Subscribe to channel
        channel.subscribe(async (statusResponse) => {
          if (statusResponse === 'SUBSCRIBED') {
            if (isCaller) {
              setStatus('Memanggil...')
              await sendOffer()
              // Retry offer periodically until connected
              retryOfferInterval = setInterval(() => {
                if (!isConnectedRef.current) {
                  sendOffer()
                } else {
                  clearInterval(retryOfferInterval)
                }
              }, 2500)
            } else {
              setStatus('Menghubungkan...')
              // Announce receiver is ready so caller sends offer
              channel.send({
                type: 'broadcast',
                event: 'webrtc_signal',
                payload: { type: 'receiver_ready' }
              }).catch(() => {})
            }
          }
        })

      } catch (error) {
        console.error('Error starting call:', error)
        setStatus('Gagal mengakses mikrofon atau audio.')
      }
    }

    let isMounted = true
    const timeoutId = setTimeout(() => {
      if (isMounted) initCall()
    }, 50)

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
      if (retryOfferInterval) clearInterval(retryOfferInterval)
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop())
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [roomId, isCaller])


  // Timer effect
  useEffect(() => {
    if (isConnected) {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isConnected])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
    }
  }

  const handleEndCall = (isLocalInitiated: boolean) => {
    // Send end call signal if we are the ones ending it
    if (isLocalInitiated && channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'webrtc_signal',
        payload: { type: 'end_call' }
      }).catch(() => {})
    }

    // Stop all media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }

    // Only navigate away if local initiated, otherwise just show ended status
    if (isLocalInitiated) {
      navigate(-1)
    } else {
      setStatus('Panggilan Berakhir')
      setIsConnected(false)
      setTimeout(() => navigate(-1), 2000)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-gray-900 overflow-hidden">
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Header */}
      <header className="flex h-16 items-center justify-between px-6 pt-4">
        <button 
          onClick={() => handleEndCall(true)} 
          className="rounded-full bg-white/10 p-2 text-white backdrop-blur-md transition hover:bg-white/20"
        >
          <ArrowLeft size={24} />
        </button>
        <span className="text-sm font-semibold text-white tracking-widest uppercase flex items-center">
          <Volume2 size={16} className="mr-2" />
          Secure P2P Call
        </span>
        <div className="w-10"></div>
      </header>

      {/* Call Info / Animation Area */}
      <div className="flex-1 flex flex-col items-center justify-center pb-12 px-4 text-center">
        
        {/* Ripple Animation Container */}
        <div className="relative mb-6 flex h-36 w-36 items-center justify-center">
          {isConnected && (
            <>
              <div className="absolute h-full w-full animate-ping rounded-full bg-blue-500/20" style={{ animationDuration: '2s' }}></div>
              <div className="absolute h-[120%] w-[120%] animate-ping rounded-full bg-blue-500/10" style={{ animationDuration: '3s' }}></div>
            </>
          )}
          
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-teal-400 shadow-2xl shadow-blue-500/30 overflow-hidden border-4 border-gray-800">
            <span className="text-3xl text-white font-bold">
              {partnerName ? partnerName.charAt(0).toUpperCase() : (isCaller ? 'P' : 'S')}
            </span>
          </div>
        </div>

        <h2 className="text-xl font-bold text-white mb-1">
          {partnerName}
        </h2>
        <p className="text-xs text-gray-400 mb-2">
          {isCaller ? 'Panggilan Keluar' : 'Panggilan Masuk'}
        </p>
        
        <p className={`text-base font-medium ${isConnected ? 'text-green-400 font-bold' : 'text-gray-300 animate-pulse'}`}>
          {isConnected ? formatTime(callDuration) : status}
        </p>

        {/* Fallback to WhatsApp / Direct Phone */}
        {partnerPhone && (
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-2">
            <a 
              href={`https://wa.me/${partnerPhone.replace(/\D/g, '').replace(/^0/, '62')}?text=Halo,%20saya%20menghubungi%20Anda%20terkait%20pesanan%20AnindiraTrans.`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-lg transition active:scale-95"
            >
              <span>Hubungi via WhatsApp</span>
            </a>
            <a 
              href={`tel:${partnerPhone}`}
              className="flex items-center space-x-2 bg-blue-600/90 hover:bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-lg transition active:scale-95"
            >
              <span>Telepon Langsung (GSM)</span>
            </a>
          </div>
        )}

      </div>

      {/* Controls Area */}
      <div className="h-32 bg-black/40 backdrop-blur-xl rounded-t-[3rem] border-t border-white/10 flex items-center justify-center space-x-8 px-8">
        <button 
          onClick={toggleMute}
          className={`flex h-16 w-16 items-center justify-center rounded-full transition active:scale-95 ${
            isMuted 
            ? 'bg-red-500/20 text-red-500 border border-red-500/50' 
            : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
        </button>
        
        <button 
          onClick={() => handleEndCall(true)}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30 transition active:scale-95 hover:bg-red-400"
        >
          <PhoneOff size={32} />
        </button>
      </div>
    </div>
  )
}
