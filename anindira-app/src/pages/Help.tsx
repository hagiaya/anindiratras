import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Headphones, BookOpen, UserPlus, ChevronRight, MessageCircle, MapPin, MessageSquare, PhoneCall } from 'lucide-react'

export default function Help() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'BANTUAN' | 'DAFTAR' | 'TUTORIAL'>('BANTUAN')
  const [outlet, setOutlet] = useState<any>(null)
  const [csPhone, setCsPhone] = useState('085394042658')

  useEffect(() => {
    supabase.from('outlets')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setOutlet(data)
          if (data.phone) setCsPhone(data.phone)
        }
      })
  }, [])

  const getCleanPhone = () => {
    let clean = csPhone.replace(/\D/g, '')
    if (clean.startsWith('0')) clean = '62' + clean.slice(1)
    return clean
  }

  const openWhatsApp = () => {
    window.open(`https://wa.me/${getCleanPhone()}?text=Halo%20Admin%20AnindiraTrans,%20saya%20butuh%20bantuan.`, '_blank')
  }

  const openPhone = () => {
    window.location.href = `tel:${csPhone}`
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-50 flex items-center bg-white px-4 py-4 shadow-sm border-b">
        <button onClick={() => navigate('/')} className="mr-4 text-gray-600 transition active:scale-90">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Pusat Informasi & Bantuan</h1>
      </div>

      <div className="p-4 space-y-6 max-w-lg mx-auto">
        <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto scrollbar-hide pb-2">
          <button
            className={`flex items-center space-x-2 px-4 py-2 font-bold rounded-full transition-colors whitespace-nowrap text-xs sm:text-sm ${activeTab === 'BANTUAN' ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}`}
            onClick={() => setActiveTab('BANTUAN')}
          >
            <Headphones size={16} />
            <span>CS & Bantuan</span>
          </button>
          <button
            className={`flex items-center space-x-2 px-4 py-2 font-bold rounded-full transition-colors whitespace-nowrap text-xs sm:text-sm ${activeTab === 'DAFTAR' ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}`}
            onClick={() => setActiveTab('DAFTAR')}
          >
            <UserPlus size={16} />
            <span>Cara Daftar Mitra</span>
          </button>
          <button
            className={`flex items-center space-x-2 px-4 py-2 font-bold rounded-full transition-colors whitespace-nowrap text-xs sm:text-sm ${activeTab === 'TUTORIAL' ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}`}
            onClick={() => setActiveTab('TUTORIAL')}
          >
            <BookOpen size={16} />
            <span>Tutorial</span>
          </button>
        </div>

        {activeTab === 'BANTUAN' && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-4">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Headphones size={32} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Customer Service Resmi</h2>
              <p className="text-xs text-gray-500 mb-6">Layanan bantuan 24 jam untuk segala kebutuhan dan pertanyaan perjalanan Anda.</p>
              
              <div className="space-y-3">
                <button 
                  onClick={openWhatsApp} 
                  className="w-full flex items-center justify-between bg-emerald-50 text-emerald-800 border border-emerald-200 p-4 rounded-2xl font-bold transition active:scale-95 shadow-sm hover:bg-emerald-100"
                >
                  <div className="flex items-center space-x-3">
                    <MessageCircle size={22} className="text-emerald-600" />
                    <div className="text-left">
                      <p className="text-sm font-bold">Chat via WhatsApp Resmi</p>
                      <p className="text-[11px] font-normal text-emerald-600">{csPhone}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-emerald-400" />
                </button>

                <button 
                  onClick={() => navigate('/chat/cs')} 
                  className="w-full flex items-center justify-between bg-blue-50 text-blue-800 border border-blue-200 p-4 rounded-2xl font-bold transition active:scale-95 shadow-sm hover:bg-blue-100"
                >
                  <div className="flex items-center space-x-3">
                    <MessageSquare size={22} className="text-blue-600" />
                    <div className="text-left">
                      <p className="text-sm font-bold">Live Chat di Aplikasi</p>
                      <p className="text-[11px] font-normal text-blue-500">Pesan instan langsung ke CS</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-blue-400" />
                </button>

                <button 
                  onClick={openPhone} 
                  className="w-full flex items-center justify-between bg-gray-50 text-gray-800 border border-gray-200 p-4 rounded-2xl font-bold transition active:scale-95 shadow-sm hover:bg-gray-100"
                >
                  <div className="flex items-center space-x-3">
                    <PhoneCall size={22} className="text-gray-600" />
                    <div className="text-left">
                      <p className="text-sm font-bold">Telepon Langsung (GSM)</p>
                      <p className="text-[11px] font-normal text-gray-500">{csPhone}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-400" />
                </button>
              </div>
            </div>

            {/* KANTOR CABANG / OUTLET INFO */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center">
                <MapPin size={18} className="mr-2 text-primary" /> Kantor & Cabang Operasional
              </h3>
              <div className="rounded-2xl bg-blue-50/70 border border-blue-100 p-4 space-y-1.5">
                <p className="font-black text-gray-900 text-sm">{outlet?.name || 'Anindira Trans Marisa'}</p>
                <p className="text-xs text-gray-600 leading-relaxed">{outlet?.address || 'Desa Palopo Jln Trans Komp. Polres Marisa'}</p>
                <div className="pt-2 flex items-center justify-between text-[11px] text-blue-700 font-bold border-t border-blue-200/50">
                  <span>Kontak: {csPhone}</span>
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">Buka 24 Jam</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4">FAQ (Pertanyaan Umum)</h3>
              <div className="space-y-4 text-xs">
                <div className="border-b border-gray-100 pb-3">
                  <p className="font-bold text-sm text-gray-700">Bagaimana cara menghubungi sopir?</p>
                  <p className="text-gray-500 mt-1">Setelah pesanan Anda diterima dan sopir ditugaskan, Anda dapat menekan tombol <strong>Chat</strong> atau <strong>Telpon</strong> langsung di menu Riwayat Pesanan.</p>
                </div>
                <div className="border-b border-gray-100 pb-3">
                  <p className="font-bold text-sm text-gray-700">Metode pembayaran apa saja yang didukung?</p>
                  <p className="text-gray-500 mt-1">Kami mendukung <strong>QRIS</strong> (GoPay, OVO, Dana, ShopeePay, BCA, dll), <strong>Transfer Bank BNI</strong>, dan <strong>Saldo AnindiraPay</strong> serta Tunai (Cash ke sopir).</p>
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-700">Bagaimana jika ada kendala perjalanan?</p>
                  <p className="text-gray-500 mt-1">Hubungi Customer Service kami 24 jam melalui WhatsApp di {csPhone} atau gunakan fitur Live Chat di aplikasi.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'DAFTAR' && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <UserPlus className="mr-2 text-primary" /> Cara Daftar Mitra / Sopir
              </h2>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                Bergabunglah menjadi mitra pengemudi AnindiraTrans dan dapatkan penghasilan tambahan yang fleksibel!
              </p>
              
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-primary text-white font-bold shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    1
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                    <h3 className="font-bold text-gray-800 text-sm mb-1">Siapkan Dokumen</h3>
                    <p className="text-xs text-gray-500">Siapkan KTP, SIM A aktif, STNK kendaraan, dan foto SKCK terbaru.</p>
                  </div>
                </div>
                
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-primary text-white font-bold shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    2
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                    <h3 className="font-bold text-gray-800 text-sm mb-1">Hubungi Admin</h3>
                    <p className="text-xs text-gray-500">Buka menu CS & Bantuan, lalu chat admin kami melalui WhatsApp dengan format "Daftar Mitra".</p>
                  </div>
                </div>

                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-primary text-white font-bold shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    3
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                    <h3 className="font-bold text-gray-800 text-sm mb-1">Proses Verifikasi</h3>
                    <p className="text-xs text-gray-500">Tim kami akan memverifikasi dokumen kendaraan dan diri Anda. (Maksimal 2x24 jam).</p>
                  </div>
                </div>
                
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-green-500 text-white font-bold shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    4
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-green-100 bg-green-50 shadow-sm">
                    <h3 className="font-bold text-green-800 text-sm mb-1">Akun Diaktifkan!</h3>
                    <p className="text-xs text-green-600">Setelah disetujui, akun Anda di aplikasi akan berubah menjadi Sopir dan siap menerima pesanan.</p>
                  </div>
                </div>
              </div>
              
              <button onClick={() => setActiveTab('BANTUAN')} className="mt-6 w-full rounded-xl bg-primary py-3 font-bold text-white transition active:scale-95 shadow-md">
                Hubungi Admin Sekarang
              </button>
            </div>
          </div>
        )}

        {activeTab === 'TUTORIAL' && (
          <div className="animate-in fade-in slide-in-from-right-4 space-y-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <BookOpen className="mr-2 text-primary" /> Panduan Aplikasi
              </h2>
              
              <div className="space-y-4">
                <details className="group [&_summary::-webkit-details-marker]:hidden border border-gray-200 rounded-xl bg-gray-50">
                  <summary className="flex cursor-pointer items-center justify-between gap-1.5 rounded-lg p-4 font-bold text-gray-900">
                    <span>Cara Memesan Carpool</span>
                    <ChevronRight className="shrink-0 transition duration-300 group-open:rotate-90" />
                  </summary>
                  <div className="px-4 pb-4 text-sm text-gray-600 space-y-2 leading-relaxed">
                    <p>1. Di beranda, klik menu <b>Carpool / Reguler</b>.</p>
                    <p>2. Pilih rute perjalanan yang Anda tuju (Dalam Daerah / Luar Daerah).</p>
                    <p>3. Pilih posisi bangku yang Anda inginkan (Depan, Tengah, Belakang).</p>
                    <p>4. Tentukan lokasi jemput dan antar menggunakan pencarian peta, lalu pilih jadwal keberangkatan.</p>
                    <p>5. Lanjutkan ke pembayaran dan pilih Kas (tunai ke sopir) atau Saldo aplikasi. Klik <b>Buat Pesanan</b>.</p>
                  </div>
                </details>

                <details className="group [&_summary::-webkit-details-marker]:hidden border border-gray-200 rounded-xl bg-gray-50">
                  <summary className="flex cursor-pointer items-center justify-between gap-1.5 rounded-lg p-4 font-bold text-gray-900">
                    <span>Cara Top Up Saldo</span>
                    <ChevronRight className="shrink-0 transition duration-300 group-open:rotate-90" />
                  </summary>
                  <div className="px-4 pb-4 text-sm text-gray-600 space-y-2 leading-relaxed">
                    <p>1. Di beranda, klik pada saldo dompet Anda atau buka menu profil, klik <b>Isi Saldo</b>.</p>
                    <p>2. Masukkan nominal top up dan pilih metode pembayaran (Bank / QRIS).</p>
                    <p>3. Unggah bukti transfer.</p>
                    <p>4. Tunggu maksimal 15 menit hingga admin memverifikasi pembayaran Anda, lalu saldo akan otomatis masuk.</p>
                  </div>
                </details>
                
                <details className="group [&_summary::-webkit-details-marker]:hidden border border-gray-200 rounded-xl bg-gray-50">
                  <summary className="flex cursor-pointer items-center justify-between gap-1.5 rounded-lg p-4 font-bold text-gray-900">
                    <span>Cara Chat & Menghubungi Sopir</span>
                    <ChevronRight className="shrink-0 transition duration-300 group-open:rotate-90" />
                  </summary>
                  <div className="px-4 pb-4 text-sm text-gray-600 space-y-2 leading-relaxed">
                    <p>1. Jika pesanan Anda sudah ditugaskan ke sopir, buka menu <b>Pesanan</b>.</p>
                    <p>2. Klik detail pesanan, Anda akan melihat info sopir dan tombol <b>Telepon</b> serta <b>Chat</b>.</p>
                    <p>3. Anda bisa menggunakan panggilan VOIP dalam aplikasi atau sekadar mengirim pesan ke sopir secara gratis (membutuhkan internet).</p>
                  </div>
                </details>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
