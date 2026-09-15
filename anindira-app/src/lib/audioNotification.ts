import { supabase } from './supabase'

let cachedSoundUrl: string | null = null
let cachedAudio: HTMLAudioElement | null = null
let isFetchingUrl = false

// Pre-fetch notification sound URL once
async function getSoundUrl(): Promise<string | null> {
  if (cachedSoundUrl) return cachedSoundUrl
  if (isFetchingUrl) return null
  isFetchingUrl = true
  try {
    const { data } = await supabase.from('app_settings').select('notification_sound_url').maybeSingle()
    if (data?.notification_sound_url) {
      cachedSoundUrl = data.notification_sound_url
      cachedAudio = new Audio(data.notification_sound_url)
      cachedAudio.load()
    }
  } catch (e) {
    console.warn('Failed to pre-fetch sound url:', e)
  } finally {
    isFetchingUrl = false
  }
  return cachedSoundUrl
}

// Initial prefetch
getSoundUrl()

// Synthesizer chime generator
function playSynthesizedChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()

    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, startTime)

      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(0.35, startTime + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + duration)
    }

    const now = ctx.currentTime
    playTone(659.25, now, 0.25) // E5
    playTone(880.00, now + 0.12, 0.45) // A5
  } catch (e) {
    console.warn('Synthesized chime error:', e)
  }
}

// Play notification sound instantly
export async function playNotificationSound() {
  try {
    if (cachedAudio) {
      cachedAudio.currentTime = 0
      const playPromise = cachedAudio.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // If browser policy blocks custom audio file, fallback to Web Audio API synthesizer
          playSynthesizedChime()
        })
      }
      return
    }

    // If audio is not cached yet, play synth immediately so user hears it instantly
    playSynthesizedChime()

    // And try to load for next time
    getSoundUrl()
  } catch (err) {
    console.warn('Audio notification error:', err)
    playSynthesizedChime()
  }
}

