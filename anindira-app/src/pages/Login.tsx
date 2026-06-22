import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CarFront, Package, Plane, ChevronLeft, HelpCircle } from 'lucide-react'

export default function Login() {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN')
  const [role, setRole] = useState<'USER' | 'DRIVER'>('USER')
  
  // Registration Data
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  
  // Driver specific
  const [licenseNumber, setLicenseNumber] = useState('')
  const [carPlate, setCarPlate] = useState('')
  const [carType, setCarType] = useState('')
  const [carColor, setCarColor] = useState('')
  const [seatLayout, setSeatLayout] = useState('4_SEATS')
  
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'LANDING' | 'PHONE' | 'REGISTER_FORM' | 'METHOD' | 'OTP' | 'SUCCESS'>('LANDING')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  
  const otpInputRef = useRef<HTMLInputElement>(null)

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone) return setError('Nomor HP tidak boleh kosong')
    setError('')
    setStep('METHOD')
  }

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone || !fullName) return setError('Harap isi semua kolom wajib')
    setError('')
    setStep('METHOD')
  }

  const handleSendOTP = async () => {
    setLoading(true)
    setError('')
    try {
      if (phone === '0000') {
        // DEMO BYPASS
        setStep('OTP')
        return
      }

      const { data, error: fnError } = await supabase.functions.invoke('send-otp', {
        body: { phone }
      })
      if (fnError || data?.error) throw new Error(fnError?.message || data?.error || 'Gagal mengirim OTP')
      setStep('OTP')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (otp.length < 6) return
    setLoading(true)
    setError('')
    try {
      if (phone === '0000' && otp === '123456') {
        // DEMO BYPASS
        localStorage.setItem('demo_mode', role)
        navigate('/')
        return
      }

      const payload = {
        phone,
        code: otp,
        isRegistering: mode === 'REGISTER',
        registrationData: mode === 'REGISTER' ? {
          role,
          full_name: fullName,
          email,
          ...(role === 'DRIVER' ? {
            license_number: licenseNumber,
            car_plate_number: carPlate,
            car_type: carType,
            car_color: carColor,
            seat_layout: seatLayout
          } : {})
        } : null
      }

      const { data, error: fnError } = await supabase.functions.invoke('verify-otp', {
        body: payload
      })

      if (fnError || data?.error) throw new Error(fnError?.message || data?.error || 'Gagal memverifikasi OTP')
      
      if (data?.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.access_token
        })
      }
      
      if (mode === 'REGISTER') {
        setStep('SUCCESS')
        setTimeout(() => {
          navigate('/')
        }, 3000)
      } else {
        navigate('/')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Auto-submit OTP when 6 digits are entered
  useEffect(() => {
    if (otp.length === 6) {
      handleVerifyOTP()
    }
  }, [otp])

  // --- LANDING SCREEN ---
  if (step === 'LANDING') {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <header className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
              <CarFront size={18} />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">anindira</span>
          </div>
          <button className="rounded-full border border-gray-200 px-3 py-1 text-sm font-medium text-gray-600 shadow-sm">
            ID
          </button>
        </header>

        <div className="mt-8 flex flex-1 flex-col items-center justify-center px-6">
          <div className="relative mb-8 w-full max-w-[320px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-100 to-blue-50 pb-12 pt-16 shadow-inner">
            <div className="absolute -left-4 top-10 text-blue-300">✦</div>
            <div className="absolute right-8 top-6 text-blue-300">✦</div>
            <div className="relative z-10 flex flex-col items-center space-y-6">
              <div className="flex items-end justify-center space-x-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg">
                  <Package size={32} className="text-orange-500" />
                </div>
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-primary text-white shadow-xl shadow-blue-200">
                  <CarFront size={48} />
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg">
                  <Plane size={32} className="text-teal-500" />
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Selamat datang di AnindiraTrans!</h1>
            <p className="mt-3 px-4 text-[15px] leading-relaxed text-gray-500">
              Aplikasi andalan Anda untuk perjalanan antar kota yang nyaman, aman, dan tanpa ribet.
            </p>
          </div>
          <div className="mt-8 flex space-x-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
            <div className="h-1.5 w-1.5 rounded-full bg-gray-200"></div>
            <div className="h-1.5 w-1.5 rounded-full bg-gray-200"></div>
            <div className="h-1.5 w-1.5 rounded-full bg-gray-200"></div>
          </div>
        </div>

        <div className="mb-8 mt-auto px-6 pt-8">
          <div className="flex flex-col space-y-3">
            <button
              onClick={() => { setMode('LOGIN'); setStep('PHONE'); }}
              className="w-full rounded-full bg-primary py-3.5 font-semibold text-white shadow-lg shadow-blue-200 transition active:scale-[0.98]"
            >
              Masuk
            </button>
            <button
              onClick={() => { setMode('REGISTER'); setStep('REGISTER_FORM'); }}
              className="w-full rounded-full border-2 border-primary py-3.5 font-semibold text-primary transition active:scale-[0.98]"
            >
              Saya pengguna baru, daftar akun
            </button>
            <button
              onClick={() => { 
                localStorage.setItem('demo_mode', 'DRIVER');
                navigate('/driver');
              }}
              className="w-full rounded-full bg-green-100 border-2 border-green-500 py-3.5 font-semibold text-green-700 transition active:scale-[0.98] mt-2"
            >
              🚀 Masuk sebagai Sopir (Demo)
            </button>
            <button
              onClick={() => { 
                localStorage.setItem('demo_mode', 'ADMIN');
                navigate('/admin');
              }}
              className="w-full rounded-full bg-purple-100 border-2 border-purple-500 py-3.5 font-semibold text-purple-700 transition active:scale-[0.98] mt-2"
            >
              👑 Masuk sebagai Admin Pusat (Demo)
            </button>
          </div>
          <p className="mt-6 text-center text-xs text-gray-400">
            Dengan masuk atau mendaftar, Anda menyetujui <span className="text-primary">Syarat dan Ketentuan</span> serta <span className="text-primary">Kebijakan Privasi</span> kami.
          </p>
        </div>
      </div>
    )
  }

  // --- COMMON HEADER ---
  const renderHeader = (onBack: () => void) => (
    <header className="flex items-center justify-between px-4 py-4">
      <button onClick={onBack} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full">
        <ChevronLeft size={24} />
      </button>
      <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
        <HelpCircle size={20} />
      </button>
    </header>
  )

  // --- PHONE INPUT SCREEN (LOGIN) ---
  if (step === 'PHONE') {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        {renderHeader(() => setStep('LANDING'))}
        <div className="flex flex-1 flex-col px-6">
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Masukkan nomor HP Anda</h1>
          <p className="mt-2 text-sm text-gray-500">
            Gunakan nomor WhatsApp yang aktif untuk masuk.
          </p>

          {error && <div className="mt-4 text-sm text-red-500">{error}</div>}

          <form onSubmit={handlePhoneSubmit} className="mt-8 flex flex-1 flex-col">
            <div className="flex items-center space-x-3 border-b-2 border-gray-900 pb-2">
              <span className="text-lg font-semibold text-gray-900">+62</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-lg font-semibold text-gray-900 placeholder-gray-400 focus:outline-none"
                placeholder="81234567890"
                autoFocus
              />
            </div>
            
            <div className="mt-auto pb-8 pt-4">
              <button
                type="submit"
                disabled={!phone}
                className="w-full rounded-full bg-primary py-4 font-bold text-white shadow-lg shadow-blue-200 transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
              >
                Lanjutkan
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // --- REGISTER FORM SCREEN ---
  if (step === 'REGISTER_FORM') {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        {renderHeader(() => setStep('LANDING'))}
        <div className="flex flex-1 flex-col px-6 pb-8">
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Daftar Akun Baru</h1>
          
          {error && <div className="mt-4 text-sm text-red-500">{error}</div>}

          <form onSubmit={handleRegisterSubmit} className="mt-8 space-y-6">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Daftar Sebagai</label>
              <select 
                value={role} 
                onChange={e => setRole(e.target.value as 'USER'|'DRIVER')}
                className="mt-2 w-full border-b-2 border-gray-200 pb-2 text-lg font-semibold text-gray-900 focus:border-primary focus:outline-none"
              >
                <option value="USER">Penumpang (User)</option>
                <option value="DRIVER">Sopir (Driver)</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama Lengkap *</label>
              <input type="text" value={fullName} onChange={e=>setFullName(e.target.value)} className="mt-2 w-full border-b-2 border-gray-200 pb-2 text-lg font-semibold text-gray-900 focus:border-primary focus:outline-none" required />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nomor WhatsApp *</label>
              <div className="flex items-center space-x-3 border-b-2 border-gray-200 pb-2 mt-2 focus-within:border-primary">
                <span className="text-lg font-semibold text-gray-900">+62</span>
                <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} className="w-full text-lg font-semibold text-gray-900 placeholder-gray-400 focus:outline-none" placeholder="81234567890" required />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email (Opsional)</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full border-b-2 border-gray-200 pb-2 text-lg font-semibold text-gray-900 focus:border-primary focus:outline-none" />
            </div>

            {role === 'DRIVER' && (
              <div className="pt-6 space-y-6">
                <h3 className="font-bold text-gray-900">Data Kendaraan & Sopir</h3>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nomor SIM *</label>
                  <input type="text" value={licenseNumber} onChange={e=>setLicenseNumber(e.target.value)} className="mt-2 w-full border-b-2 border-gray-200 pb-2 text-lg font-semibold text-gray-900 focus:border-primary focus:outline-none" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Plat Nomor *</label>
                  <input type="text" value={carPlate} onChange={e=>setCarPlate(e.target.value)} placeholder="DM 1234 AB" className="mt-2 w-full border-b-2 border-gray-200 pb-2 text-lg font-semibold text-gray-900 focus:border-primary focus:outline-none uppercase" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Jenis Mobil *</label>
                  <input type="text" value={carType} onChange={e=>setCarType(e.target.value)} placeholder="Toyota Agya" className="mt-2 w-full border-b-2 border-gray-200 pb-2 text-lg font-semibold text-gray-900 focus:border-primary focus:outline-none" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Warna Mobil *</label>
                  <input type="text" value={carColor} onChange={e=>setCarColor(e.target.value)} placeholder="Hitam" className="mt-2 w-full border-b-2 border-gray-200 pb-2 text-lg font-semibold text-gray-900 focus:border-primary focus:outline-none" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Kapasitas Tempat Duduk *</label>
                  <select value={seatLayout} onChange={e=>setSeatLayout(e.target.value)} className="mt-2 w-full border-b-2 border-gray-200 pb-2 text-lg font-semibold text-gray-900 focus:border-primary focus:outline-none">
                    <option value="4_SEATS">Mobil Kecil (4 Seat)</option>
                    <option value="5_SEATS">Mobil Sedang (5 Seat)</option>
                    <option value="6_SEATS">Mobil Sedang (6 Seat)</option>
                    <option value="7_SEATS">Mobil Besar (7 Seat)</option>
                  </select>
                </div>
              </div>
            )}

            <div className="pt-8">
              <button
                type="submit"
                disabled={!phone || !fullName}
                className="w-full rounded-full bg-primary py-4 font-bold text-white shadow-lg shadow-blue-200 transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
              >
                Lanjutkan
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // --- METHOD SELECTION SCREEN ---
  if (step === 'METHOD') {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        {renderHeader(() => setStep(mode === 'LOGIN' ? 'PHONE' : 'REGISTER_FORM'))}
        <div className="flex flex-1 flex-col px-6">
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Where to send the OTP?</h1>

          {error && <div className="mt-4 text-sm text-red-500">{error}</div>}

          <div className="mt-8 space-y-4">
            <button
              onClick={() => handleSendOTP()}
              disabled={loading}
              className="flex w-full items-center justify-between rounded-2xl border border-gray-200 p-5 hover:bg-gray-50 transition"
            >
              <span className="font-semibold text-gray-900">WhatsApp</span>
              <div className="h-6 w-6 rounded-full border-2 border-primary p-1">
                <div className="h-full w-full rounded-full bg-primary"></div>
              </div>
            </button>
            <button
              onClick={() => setError('Fitur SMS belum tersedia')}
              disabled={loading}
              className="flex w-full items-center justify-between rounded-2xl border border-gray-200 p-5 hover:bg-gray-50 transition opacity-60"
            >
              <span className="font-semibold text-gray-900">SMS</span>
              <div className="h-6 w-6 rounded-full border-2 border-gray-300"></div>
            </button>
          </div>

          <div className="mt-auto pb-8">
            <button
              onClick={() => handleSendOTP()}
              disabled={loading}
              className="w-full rounded-full bg-primary py-4 font-bold text-white shadow-lg shadow-blue-200 transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? 'Mengirim...' : 'Send OTP'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- OTP INPUT SCREEN ---
  if (step === 'OTP') {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        {renderHeader(() => setStep('METHOD'))}
        <div className="flex flex-1 flex-col px-6">
          <h1 className="mt-4 text-2xl font-bold text-gray-900">OTP sent on WhatsApp</h1>
          <p className="mt-2 text-sm text-gray-500">
            Enter the 6-digit OTP we've just sent to +62{phone}
          </p>

          {error && <div className="mt-4 text-sm text-red-500">{error}</div>}

          <div className="mt-12 relative flex justify-between px-2">
            {/* Real hidden input */}
            <input
              ref={otpInputRef}
              type="tel"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              className="absolute inset-0 z-10 w-full opacity-0 text-transparent bg-transparent"
              autoFocus
            />
            {/* Visual dots */}
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const digit = otp[index]
              const isFocused = otp.length === index
              return (
                <div
                  key={index}
                  className={`flex h-10 w-8 items-center justify-center border-b-2 text-3xl font-bold transition-all ${
                    digit ? 'border-gray-900 text-gray-900' : 
                    isFocused ? 'border-primary text-gray-300' : 'border-gray-200 text-gray-300'
                  }`}
                >
                  {digit ? digit : '•'}
                </div>
              )
            })}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <button className="text-sm font-semibold text-primary underline decoration-primary/30 underline-offset-4">
              Or, send via SMS
            </button>
            <div className="flex items-center space-x-1 text-sm font-semibold text-gray-900">
              <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>00:59</span>
            </div>
          </div>

          <div className="mt-auto pb-8">
            <button
              onClick={() => handleVerifyOTP()}
              disabled={loading || otp.length < 6}
              className={`w-full rounded-full py-4 font-bold transition active:scale-[0.98] ${
                otp.length === 6 && !loading 
                  ? 'bg-primary text-white shadow-lg shadow-blue-200' 
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              {loading ? 'Memverifikasi...' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- SUCCESS SCREEN ---
  if (step === 'SUCCESS') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-primary px-6 text-center">
        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-white text-primary shadow-2xl">
          <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Pendaftaran Berhasil!</h1>
        <p className="text-white/80 text-lg mb-12">
          {role === 'DRIVER' 
            ? 'Akun Sopir Anda berhasil dibuat dan sedang menunggu persetujuan Admin.' 
            : 'Selamat datang di AnindiraTrans. Siap untuk perjalanan Anda?'}
        </p>
        <div className="flex space-x-2">
          <div className="h-2 w-2 animate-bounce rounded-full bg-white"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-white" style={{ animationDelay: '0.2s' }}></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-white" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    )
  }

  return null
}
