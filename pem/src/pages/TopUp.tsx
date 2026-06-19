import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Upload, CheckCircle } from 'lucide-react'

// Image compression helper to save storage & bandwidth
const compressImage = (file: File, maxWidth = 800, quality = 0.7): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Gagal memproses gambar'))
        
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Gagal kompresi gambar'))
          const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
            type: 'image/jpeg',
            lastModified: Date.now(),
          })
          resolve(newFile)
        }, 'image/jpeg', quality)
      }
      img.onerror = (err) => reject(err)
    }
    reader.onerror = (err) => reject(err)
  })
}

export default function TopUp() {
  const navigate = useNavigate()
  const [amount, setAmount] = useState('')
  const [uniqueCode] = useState(() => Math.floor(100 + Math.random() * 900))
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !file) {
      setError('Mohon masukkan nominal dan unggah bukti transfer')
      return
    }

    if (parseInt(amount) < 50000) {
      setError('Minimal top up adalah Rp 50.000')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Anda harus login')

      // Compress file before upload to save egress/storage
      const compressedFile = await compressImage(file, 800, 0.7)
      
      const fileExt = 'jpg' // we converted it to jpg
      const fileName = `${session.user.id}-${Math.random()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, compressedFile)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName)

      // Insert transaction
      const totalAmount = parseInt(amount) + uniqueCode
      const { error: insertError } = await supabase.from('transactions').insert({
        user_id: session.user.id,
        type: 'TOP_UP',
        amount: totalAmount,
        receipt_url: publicUrl,
        status: 'PENDING'
      })

      if (insertError) throw insertError

      setSuccess(true)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Terjadi kesalahan. Pastikan Anda sudah membuat bucket "receipts" di Supabase.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
        <CheckCircle size={64} className="text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Top Up Diproses</h2>
        <p className="text-center text-gray-600 mb-8">
          Bukti transfer Anda telah dikirim dan sedang menunggu verifikasi oleh admin. Saldo akan bertambah secara otomatis setelah disetujui.
        </p>
        <button
          onClick={() => navigate('/')}
          className="w-full rounded-2xl bg-primary py-4 font-bold text-white transition active:scale-[0.98]"
        >
          Kembali ke Beranda
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className="sticky top-0 z-50 flex items-center bg-white px-4 py-4 shadow-sm">
        <button onClick={() => navigate(-1)} className="mr-4 text-gray-600">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Top Up Saldo</h1>
      </div>

      <div className="flex-1 p-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm mb-6 border border-gray-100">
          <h2 className="text-sm font-bold text-gray-800 mb-2">Instruksi Transfer</h2>
          <p className="text-xs text-gray-500 mb-4">Silakan transfer sesuai nominal yang Anda inginkan ke rekening di bawah ini:</p>
          
          <div className="rounded-xl bg-blue-50 p-4 mb-2">
            <p className="text-xs font-medium text-blue-600">Bank BCA</p>
            <p className="text-xl font-bold text-gray-900">123 456 789</p>
            <p className="text-sm text-gray-600">a.n. Anindira Trans</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700">Nominal Top Up</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Contoh: 50000"
              min="50000"
              className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 font-medium outline-none transition focus:border-primary focus:bg-white"
            />
            {amount && parseInt(amount) >= 50000 && (
              <div className="mt-2 rounded-xl bg-orange-50 border border-orange-200 p-3">
                <p className="text-xs text-orange-600 mb-1">Mohon transfer tepat hingga 3 digit terakhir (kode unik):</p>
                <p className="text-xl font-bold text-orange-700">Rp {(parseInt(amount) + uniqueCode).toLocaleString('id-ID')}</p>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700">Bukti Transfer</label>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 cursor-pointer hover:bg-gray-100 transition">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload size={24} className="text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 font-medium">
                  {file ? file.name : 'Pilih Foto / Screenshot'}
                </p>
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            </label>
          </div>

          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-primary py-4 font-bold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-50 mt-4"
          >
            {loading ? 'Mengunggah...' : 'Kirim Bukti Transfer'}
          </button>
        </form>
      </div>
    </div>
  )
}
