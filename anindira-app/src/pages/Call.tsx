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
  
  const [status, setStatus] = useState<string>('Menghubungkan...')
  const [isMuted, setIsMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const channelRef = useRef<any>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // ICE Servers (Google's public STUN servers)
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }

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
            setIsConnected(true)
            setStatus('Terhubung')
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
            })
          }
        }

        // Handle WebRTC signaling
        channel.on('broadcast', { event: 'webrtc_signal' }, async (payload: any) => {
          const data = payload.payload

          if (data.type === 'offer' && !isCaller) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer))
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            channel.send({
              type: 'broadcast',
              event: 'webrtc_signal',
              payload: { type: 'answer', answer }
            })
            setStatus('Menyambungkan...')
          } 
          
          else if (data.type === 'answer' && isCaller) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer))
            setStatus('Menyambungkan...')
          } 
          
          else if (data.type === 'candidate') {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate))
            } catch (e) {
              console.error('Error adding received ice candidate', e)
            }
          }
          
          else if (data.type === 'end_call') {
            handleEndCall(false) // false means remote ended it
          }
        })

        // Subscribe to channel
        channel.subscribe(async (statusResponse) => {
          if (statusResponse === 'SUBSCRIBED') {
            if (isCaller) {
              setStatus('Memanggil...')
              // Caller sends offer
              const offer = await pc.createOffer()
              await pc.setLocalDescription(offer)
              channel.send({
                type: 'broadcast',
                event: 'webrtc_signal',
                payload: { type: 'offer', offer }
              })
            } else {
              setStatus('Menunggu koneksi...')
            }
          }
        })

      } catch (error) {
        console.error('Error starting call:', error)
        setStatus('Gagal mengakses mikrofon.')
      }
    }

    let isMounted = true
    const timeoutId = setTimeout(() => {
      if (isMounted) initCall()
    }, 50)

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
      // Cleanup media silently on unmount without triggering navigate
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
      <div className="flex-1 flex flex-col items-center justify-center pb-20">
        
        {/* Ripple Animation Container */}
        <div className="relative mb-8 flex h-40 w-40 items-center justify-center">
          {isConnected && (
            <>
              <div className="absolute h-full w-full animate-ping rounded-full bg-blue-500/20" style={{ animationDuration: '2s' }}></div>
              <div className="absolute h-[120%] w-[120%] animate-ping rounded-full bg-blue-500/10" style={{ animationDuration: '3s' }}></div>
            </>
          )}
          
          <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-teal-400 shadow-2xl shadow-blue-500/30 overflow-hidden border-4 border-gray-800">
            <span className="text-4xl text-white font-bold">
              {isCaller ? 'P' : 'S'} {/* Placeholder initial */}
            </span>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">
          {isCaller ? 'Panggilan Keluar' : 'Panggilan Masuk'}
        </h2>
        
        <p className={`text-lg font-medium ${isConnected ? 'text-green-400' : 'text-gray-400 animate-pulse'}`}>
          {isConnected ? formatTime(callDuration) : status}
        </p>

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
