import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Phone, PhoneOff } from 'lucide-react'

interface IncomingCallData {
  callerName: string
  roomId: string
}

export default function IncomingCallAlert() {
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let channel: any = null

    const setupListener = async () => {
      // Demo mode bypass
      if (localStorage.getItem('demo_mode')) {
        // We simulate listening for demo by attaching to a global window event or just relying on standard supabase if we have a demo user id.
        // Actually for demo, let's just listen to a public channel 'demo_calls'
        channel = supabase.channel('demo_calls')
        channel.on('broadcast', { event: 'incoming_call' }, (payload: any) => {
          setIncomingCall(payload.payload)
          playRingtone()
        }).subscribe()
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      channel = supabase.channel(`user_${session.user.id}`)
      channel.on('broadcast', { event: 'incoming_call' }, (payload: any) => {
        console.log('Incoming call received:', payload.payload)
        setIncomingCall(payload.payload)
        playRingtone()
      }).subscribe()
    }

    setupListener()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  // Auto-dismiss after 30 seconds
  useEffect(() => {
    if (incomingCall) {
      const timer = setTimeout(() => {
        setIncomingCall(null)
      }, 30000)
      return () => clearTimeout(timer)
    }
  }, [incomingCall])

  const playRingtone = () => {
    // Attempt to play a simple beep (Autoplay policies might block this unless user interacted)
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime)
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime)
      
      // Beep pattern
      oscillator.start()
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 1)
      oscillator.stop(audioCtx.currentTime + 1)
    } catch (e) {
      console.warn('Audio playback failed', e)
    }
  }

  const handleAccept = () => {
    if (incomingCall) {
      navigate(`/call/${incomingCall.roomId}`, { state: { isCaller: false } })
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
