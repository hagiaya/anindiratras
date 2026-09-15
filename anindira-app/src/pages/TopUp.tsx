import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Upload, CheckCircle, QrCode, Landmark, Copy, Check, ExternalLink } from 'lucide-react'

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
  const [method, setMethod] = useState<'QRIS' | 'TRANSFER'>('QRIS')
  const [amount, setAmount] = useState('')
  const [uniqueCode] = useState(() => Math.floor(100 + Math.random() * 900))
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // Dynamic Bank and QRIS state
  const [banks, setBanks] = useState<any[]>([])
  const [qrisImage, setQrisImage] = useState<any>(null)
  const [copiedBankId, setCopiedBankId] = useState<string | null>(null)
  const [copiedAmount, setCopiedAmount] = useState(false)

  useEffect(() => {
    fetchPaymentSettings()
  }, [])

  const fetchPaymentSettings = async () => {
    try {
      // Fetch Active Banks
      const { data: bankData } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
      
      if (bankData && bankData.length > 0) {
        setBanks(bankData)
      } else {
        // Fallback default
        setBanks([
          { id: 'default-bni', bank_name: 'BNI', account_number: '1979901867', account_holder: 'ANINDIRA TRANS' }
        ])
      }

      // Fetch Active QRIS
      const { data: qData } = await supabase
        .from('qris_settings')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (qData) {
        setQrisImage(qData)
      }
    } catch (err) {
      console.warn('Gagal memuat pengaturan pembayaran:', err)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0]
      setFile(selected)
      setPreviewUrl(URL.createObjectURL(selected))
    }
  }

  const copyToClipboard = (text: string, type: 'amount' | 'bank', id?: string) => {
    navigator.clipboard.writeText(text)
    if (type === 'amount') {
      setCopiedAmount(true)
      setTimeout(() => setCopiedAmount(false), 2000)
    } else if (id) {
      setCopiedBankId(id)
      setTimeout(() => setCopiedBankId(null), 2000)
    }
  }

  const totalAmount = parseInt(amount || '0') > 0 ? parseInt(amount) + uniqueCode : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !file) {
      setError('Mohon masukkan nominal dan unggah bukti transfer/pembayaran')
      return
    }

    if (parseInt(amount) < 20000) {
      setError('Minimal top up adalah Rp 20.000')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Anda harus login terlebih dahulu')

      // Compress file before upload to save egress/storage
      const compressedFile = await compressImage(file, 800, 0.7)
      
      const fileExt = 'jpg'
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`
      
      // Try uploading to payment_receipts bucket or fallback to receipts
      let uploadSuccess = false
      let finalPublicUrl = ''

      const { data: upData1, error: err1 } = await supabase.storage
        .from('payment_receipts')
        .upload(fileName, compressedFile)
      
      if (!err1 && upData1) {
        uploadSuccess = true
        const { data: pUrl } = supabase.storage.from('payment_receipts').getPublicUrl(fileName)
        finalPublicUrl = pUrl.publicUrl
      } else {
        const { data: upData2, error: err2 } = await supabase.storage
          .from('receipts')
          .upload(fileName, compressedFile)
        
        if (!err2 && upData2) {
          uploadSuccess = true
          const { data: pUrl2 } = supabase.storage.from('receipts').getPublicUrl(fileName)
          finalPublicUrl = pUrl2.publicUrl
        } else {
          throw new Error('Gagal mengunggah foto bukti pembayaran. Pastikan koneksi internet stabil.')
        }
      }

      if (!uploadSuccess) throw new Error('Gagal mengunggah gambar.')

      // Insert transaction
      const { error: insertError } = await supabase.from('transactions').insert({
        user_id: session.user.id,
        type: 'TOP_UP',
        amount: totalAmount,
        receipt_url: finalPublicUrl,
        status: 'PENDING',
        notes: `Top Up via ${method === 'QRIS' ? 'QRIS Barcode' : 'Transfer Bank'}`
      })

      if (insertError) throw insertError

      setSuccess(true)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Terjadi kesalahan saat memproses top up.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
        <div className="w-20 h-20 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-5">
          <CheckCircle size={48} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Top Up Diproses</h2>
        <p className="text-center text-sm text-gray-600 mb-8 max-w-sm">
          Bukti transfer sebesar <strong className="text-gray-900">Rp {totalAmount.toLocaleString('id-ID')}</strong> telah dikirim. Saldo AnindiraPay Anda akan otomatis bertambah setelah disetujui admin.
        </p>
        <button
          onClick={() => navigate('/')}
          className="w-full max-w-sm rounded-2xl bg-primary py-4 font-bold text-white shadow-lg transition active:scale-[0.98]"
        >
          Kembali ke Beranda
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 pb-12">
      <div className="sticky top-0 z-50 flex items-center bg-white px-4 py-4 shadow-sm border-b">
        <button onClick={() => navigate(-1)} className="mr-4 text-gray-600 transition active:scale-90">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Top Up Saldo AnindiraPay</h1>
      </div>

      <div className="flex-1 p-4 max-w-lg mx-auto w-full space-y-4">
        
        {/* METODE PEMBAYARAN TABS */}
        <div className="rounded-2xl bg-white p-2 border border-gray-200 shadow-sm flex space-x-2">
          <button
            type="button"
            onClick={() => setMethod('QRIS')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl font-bold text-xs sm:text-sm transition ${
              method === 'QRIS' 
                ? 'bg-primary text-white shadow-md' 
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <QrCode size={18} />
            <span>QRIS (Semua E-Wallet & Bank)</span>
          </button>
          <button
            type="button"
            onClick={() => setMethod('TRANSFER')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl font-bold text-xs sm:text-sm transition ${
              method === 'TRANSFER' 
                ? 'bg-primary text-white shadow-md' 
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Landmark size={18} />
            <span>Transfer Bank Manual</span>
          </button>
        </div>

        {/* METODE QRIS CONTENT */}
        {method === 'QRIS' && (
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 text-center animate-in fade-in">
            <h2 className="text-sm font-bold text-gray-800 mb-1">Scan Barcode QRIS Resmi</h2>
            <p className="text-xs text-gray-500 mb-4">
              Mendukung BCA Mobile, BRImo, Livin Mandiri, BNI Mobile, GoPay, OVO, DANA, ShopeePay, dan semua e-wallet.
            </p>

            {qrisImage?.image_url ? (
              <div className="flex flex-col items-center">
                <div className="p-3 bg-white border-2 border-gray-200 rounded-2xl shadow-inner mb-3 max-w-[260px]">
                  <img 
                    src={qrisImage.image_url} 
                    alt="Barcode QRIS Anindira Trans" 
                    className="w-full object-contain rounded-lg"
                  />
                </div>
                <a 
                  href={qrisImage.image_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 text-xs text-primary font-bold hover:underline"
                >
                  <ExternalLink size={14} />
                  <span>Buka / Unduh Barcode Penuh</span>
                </a>
              </div>
            ) : (
              <div className="p-6 bg-gray-50 rounded-xl text-gray-400 text-xs font-medium">
                QRIS sedang disiapkan oleh admin. Silakan gunakan opsi Transfer Bank di tab sebelah.
              </div>
            )}
          </div>
        )}

        {/* METODE TRANSFER BANK CONTENT */}
        {method === 'TRANSFER' && (
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 animate-in fade-in space-y-3">
            <h2 className="text-sm font-bold text-gray-800 mb-1">Daftar Rekening Resmi Perusahaan</h2>
            <p className="text-xs text-gray-500 mb-3">
              Silakan transfer ke salah satu rekening resmi di bawah ini:
            </p>

            <div className="space-y-3">
              {banks.map((b) => (
                <div key={b.id} className="rounded-xl bg-blue-50/70 border border-blue-100 p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">{b.bank_name}</span>
                    <p className="text-lg font-black text-gray-900 tracking-wider my-0.5">{b.account_number}</p>
                    <p className="text-xs text-gray-600">a.n. {b.account_holder}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(b.account_number, 'bank', b.id)}
                    className="flex items-center space-x-1.5 bg-white border border-blue-200 px-3 py-2 rounded-xl text-xs font-bold text-blue-600 shadow-sm transition active:scale-95"
                  >
                    {copiedBankId === b.id ? (
                      <>
                        <Check size={14} className="text-green-600" />
                        <span className="text-green-600">Disalin</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FORM INPUT NOMINAL & UPLOAD */}
        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700">Nominal Top Up (Rp)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Contoh: 50000"
              min="20000"
              className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-base font-bold outline-none transition focus:border-primary focus:bg-white"
            />

            {/* Quick Presets */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {['25000', '50000', '100000', '200000'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className={`py-2 rounded-lg text-xs font-bold border transition ${
                    amount === preset 
                      ? 'bg-blue-50 border-primary text-primary' 
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {parseInt(preset).toLocaleString('id-ID')}
                </button>
              ))}
            </div>

            {totalAmount > 0 && (
              <div className="mt-3 rounded-xl bg-orange-50 border border-orange-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-orange-700 font-medium">Total yang harus ditransfer (termasuk kode unik):</p>
                    <p className="text-2xl font-black text-orange-800 mt-1">Rp {totalAmount.toLocaleString('id-ID')}</p>
                    <p className="text-[11px] text-orange-600 mt-0.5">*Kode unik 3 digit untuk verifikasi otomatis</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(totalAmount.toString(), 'amount')}
                    className="flex items-center space-x-1 bg-white border border-orange-200 px-3 py-2 rounded-xl text-xs font-bold text-orange-700 shadow-sm transition active:scale-95"
                  >
                    {copiedAmount ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    <span>{copiedAmount ? 'Disalin' : 'Salin'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1 pt-2">
            <label className="text-xs font-bold text-gray-700">Bukti Pembayaran / Transfer</label>
            <label className="flex flex-col items-center justify-center w-full min-h-[120px] border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 cursor-pointer hover:bg-gray-100 transition p-4 relative overflow-hidden">
              {previewUrl ? (
                <div className="flex flex-col items-center">
                  <img src={previewUrl} alt="Preview Bukti" className="h-28 object-contain rounded-lg mb-2 shadow-sm" />
                  <p className="text-xs text-primary font-bold">Ganti Foto Bukti</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <Upload size={24} className="text-gray-400 mb-2" />
                  <p className="text-xs text-gray-500 font-semibold">Pilih Foto Bukti Transfer / Screenshot</p>
                  <p className="text-[10px] text-gray-400 mt-1">Format JPG, PNG (Dikompres otomatis)</p>
                </div>
              )}
              <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            </label>
          </div>

          {error && <p className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-lg border border-red-200">{error}</p>}

          <button
            type="submit"
            disabled={loading || !amount || !file}
            className="w-full rounded-2xl bg-primary py-4 font-bold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-50 mt-4"
          >
            {loading ? 'Mengunggah & Memproses...' : 'Kirim Bukti Pembayaran'}
          </button>
        </form>

      </div>
    </div>
  )
}
