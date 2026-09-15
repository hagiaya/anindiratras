import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Phone, PhoneOff } from 'lucide-react'

interface IncomingCallData {
  callerName: string
  roomId: string
  partnerPhone?: string
}

export default function IncomingCallAlert() {
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let channels: any[] = []

    const setupListener = async (user: any) => {
      // Cleanup previous channels
      channels.forEach(ch => supabase.removeChannel(ch))
      channels = []
      
      const handlePayload = (payload: any) => {
        console.log('Incoming call received:', payload.payload)
        setIncomingCall(payload.payload)
        playRingtone()
      }
      
      const pChannel = supabase.channel(`user_${user.id}`)
      pChannel.on('broadcast', { event: 'incoming_call' }, handlePayload).subscribe()
      channels.push(pChannel)
      
      if (user.user_metadata?.role === 'ADMIN') {
        const adminChannel = supabase.channel(`user_admin`)
        adminChannel.on('broadcast', { event: 'incoming_call' }, handlePayload).subscribe()
        channels.push(adminChannel)
      }
    }

    if (localStorage.getItem('demo_mode')) {
      const demoChannel = supabase.channel('demo_calls')
      demoChannel.on('broadcast', { event: 'incoming_call' }, (payload: any) => {
        setIncomingCall(payload.payload)
        playRingtone()
      }).subscribe()
      channels.push(demoChannel)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setupListener(session.user)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setupListener(session.user)
      } else {
        channels.forEach(ch => supabase.removeChannel(ch))
        channels = []
      }
    })

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch))
      authListener.subscription.unsubscribe()
    }
  }, [])

  // Auto-dismiss after 30 seconds and repeat ringtone
  useEffect(() => {
    if (incomingCall) {
      const ringInterval = setInterval(() => {
        playRingtone()
      }, 3000)

      const timer = setTimeout(() => {
        setIncomingCall(null)
      }, 30000)

      return () => {
        clearInterval(ringInterval)
        clearTimeout(timer)
      }
    }
  }, [incomingCall])

  const playRingtone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const audioCtx = new AudioCtx()
      
      // Dual tone ring (North American / standard phone ring style)
      const playTonePair = (f1: number, f2: number, start: number, dur: number) => {
        const osc1 = audioCtx.createOscillator()
        const osc2 = audioCtx.createOscillator()
        const gain = audioCtx.createGain()

        osc1.frequency.setValueAtTime(f1, audioCtx.currentTime + start)
        osc2.frequency.setValueAtTime(f2, audioCtx.currentTime + start)
        
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime + start)
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + start + dur)

        osc1.connect(gain)
        osc2.connect(gain)
        gain.connect(audioCtx.destination)

        osc1.start(audioCtx.currentTime + start)
        osc2.start(audioCtx.currentTime + start)
        osc1.stop(audioCtx.currentTime + start + dur)
        osc2.stop(audioCtx.currentTime + start + dur)
      }

      playTonePair(440, 480, 0, 0.7)
      playTonePair(440, 480, 0.9, 0.7)
    } catch (e) {
      console.warn('Audio playback failed', e)
    }
  }

  const handleAccept = () => {
    if (incomingCall) {
      navigate(`/call/${incomingCall.roomId}`, { 
        state: { 
          isCaller: false, 
          partnerPhone: incomingCall.partnerPhone, 
          partnerName: incomingCall.callerName 
        } 
      })
      setIncomingCall(null)
    }
  }

  const handleDecline = () => {
    setIncomingCall(null)
  }


  if (!incomingCall) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center px-4 pt-12 pointer-events-none">
      {/* Overlay backdrop just for the top area */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto transition-opacity" />
      
      {/* Call Card */}
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-[2rem] bg-gray-900 text-white shadow-2xl pointer-events-auto animate-in slide-in-from-top-10 fade-in duration-300">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 via-blue-500 to-green-400 animate-[gradient_2s_linear_infinite] bg-[length:200%_auto]" />
        
        <div className="p-6 flex flex-col items-center">
          <div className="mb-4 relative">
            <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping"></div>
            <div className="relative h-20 w-20 flex items-center justify-center rounded-full bg-blue-600 shadow-lg shadow-blue-500/50">
              <Phone size={36} className="text-white animate-pulse" />
            </div>
          </div>
          
          <h2 className="text-xl font-bold text-white text-center">{incomingCall.callerName}</h2>
          <p className="text-gray-400 text-sm mt-1">Panggilan masuk...</p>
          
          <div className="mt-8 flex w-full justify-center space-x-12">
            <button 
              onClick={handleDecline}
              className="flex flex-col items-center space-y-2 group"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/40 transition active:scale-95 group-hover:bg-red-400">
                <PhoneOff size={28} />
              </div>
              <span className="text-xs font-bold text-gray-400">Tolak</span>
            </button>
            
            <button 
              onClick={handleAccept}
              className="flex flex-col items-center space-y-2 group"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-white shadow-lg shadow-green-500/40 transition active:scale-95 group-hover:bg-green-400 animate-bounce">
                <Phone size={28} className="fill-white" />
              </div>
              <span className="text-xs font-bold text-green-400">Angkat</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
