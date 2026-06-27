import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, CheckCircle2 } from 'lucide-react'

export default function DeleteDataRequest() {
  const navigate = useNavigate()
  const [submitted, setSubmitted] = useState(false)
  const [contact, setContact] = useState('')
  const [reason, setReason] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real application, you would send this to your backend
    // e.g. await supabase.from('deletion_requests').insert({ contact, reason })
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm px-4 py-4 flex items-center sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="mr-4 text-gray-600 hover:text-gray-900">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-semibold text-gray-800">Permintaan Hapus Data</h1>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto p-6 flex flex-col justify-center">
        {!submitted ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                <Trash2 size={32} />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Hapus Akun & Data</h2>
            <p className="text-gray-600 text-center mb-6 text-sm">
              Kirimkan permintaan untuk menghapus akun Anda beserta seluruh data pribadi yang terkait dengan aplikasi Anindira Trans.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nomor HP / Email
                </label>
                <input
                  type="text"
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  placeholder="Masukkan nomor HP atau email Anda"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alasan (Opsional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all min-h-[100px]"
                  placeholder="Beri tahu kami alasan Anda menghapus akun..."
                />
              </div>

              <div className="bg-orange-50 text-orange-800 p-4 rounded-xl text-sm mb-4 border border-orange-100">
                <strong>Perhatian:</strong> Proses penghapusan data membutuhkan waktu hingga 14 hari kerja. Anda tidak dapat membatalkan permintaan ini setelah diproses.
              </div>

              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl transition-colors flex justify-center items-center"
              >
                Kirim Permintaan
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                <CheckCircle2 size={40} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Permintaan Terkirim</h2>
            <p className="text-gray-600 mb-8">
              Permintaan penghapusan data Anda telah kami terima dan sedang diproses. Kami akan menghubungi Anda jika memerlukan informasi lebih lanjut.
            </p>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors"
            >
              Kembali ke Beranda
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
