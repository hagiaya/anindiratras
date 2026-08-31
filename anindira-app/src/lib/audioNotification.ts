import { supabase } from './supabase'

// Web Audio API Sound Synthesizer for Reliable Audio Notifications
export async function playNotificationSound() {
  try {
    const { data } = await supabase.from('app_settings').select('notification_sound_url').maybeSingle()
    if (data?.notification_sound_url) {
      const audio = new Audio(data.notification_sound_url)
      audio.play().catch(e => console.warn('Audio play failed:', e))
      return
    }

    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return

    const ctx = new AudioContext()
    
    // Play a pleasant two-tone chime (ding-dong effect)
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, startTime)

      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + duration)
    }

    const now = ctx.currentTime
    playTone(587.33, now, 0.3) // D5
    playTone(880, now + 0.15, 0.5) // A5

  } catch (err) {
    console.warn('Audio notification error:', err)
  }
}
