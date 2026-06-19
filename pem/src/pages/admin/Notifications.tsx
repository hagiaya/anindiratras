import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Trash2, Image, Link as LinkIcon, RefreshCw } from 'lucide-react'

export default function Notifications() {
  const [banners, setBanners] = useState<any[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [targetUrl, setTargetUrl] = useState('')

  useEffect(() => {
    fetchBanners()
  }, [])

  const fetchBanners = async () => {
    setIsRefreshing(true)
    setError('')
    try {
      const { data, error } = await supabase.from('banners').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setBanners(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!imageUrl) return
    setIsRefreshing(true)
    const { error } = await supabase.from('banners').insert({
      title,
      image_url: imageUrl,
      target_url: targetUrl,
      is_active: true
    })
    setIsRefreshing(false)
    if (!error) {
      setTitle('')
      setImageUrl('')
      setTargetUrl('')
      fetchBanners()
    } else {
      setError(error.message)
    }
  }

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('Hapus banner promo ini?')) return
    setIsRefreshing(true)
    const { error } = await supabase.from('banners').delete().eq('id', id)
    setIsRefreshing(false)
    if (!error) fetchBanners()
    else setError(error.message)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manajemen Notifikasi & Promo</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola banner promo yang tampil di beranda aplikasi pengguna</p>
        </div>
        <button 
          onClick={fetchBanners}
          className="flex items-center justify-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50 transition active:scale-95 w-fit"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          <span>Segarkan</span>
        </button>
      </div>

      {error && <div className="p-4 bg-red-100 text-red-700 font-bold rounded-xl text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Plus size={20} className="mr-2 text-primary"/> Tambah Banner Baru</h2>
          <form onSubmit={handleAddBanner} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Judul Promo</label>
              <input type="text" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Promo Kemerdekaan" className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Link Gambar (URL)</label>
              <div className="relative">
                <Image size={18} className="absolute left-3 top-3 text-gray-400" />
                <input required type="url" value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="https://..." className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 pl-10 text-sm focus:border-primary outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Link Tujuan (Opsional)</label>
              <div className="relative">
                <LinkIcon size={18} className="absolute left-3 top-3 text-gray-400" />
                <input type="text" value={targetUrl} onChange={e=>setTargetUrl(e.target.value)} placeholder="/orders" className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 pl-10 text-sm focus:border-primary outline-none" />
              </div>
            </div>
            <button disabled={isRefreshing} type="submit" className="w-full bg-gray-900 text-white font-bold rounded-xl py-3 hover:bg-black transition active:scale-95 disabled:opacity-50">
              Simpan Banner
            </button>
          </form>
        </div>
        
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {banners.map(b => (
              <div key={b.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                <img src={b.image_url} alt={b.title} className="w-full h-32 object-cover bg-gray-100" />
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-gray-800 line-clamp-1">{b.title || 'Tanpa Judul'}</h3>
                    {b.target_url && <p className="text-xs text-blue-500 truncate mt-1">Tujuan: {b.target_url}</p>}
                  </div>
                  <button onClick={() => handleDeleteBanner(b.id)} className="mt-4 flex items-center justify-center space-x-2 text-red-500 bg-red-50 py-2 rounded-lg font-bold text-sm hover:bg-red-100 transition">
                    <Trash2 size={16}/> <span>Hapus Banner</span>
                  </button>
                </div>
              </div>
            ))}
            {banners.length === 0 && (
              <div className="col-span-2 text-center py-12 bg-white rounded-2xl border border-gray-100 border-dashed">
                <Image size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">Belum ada banner promo aktif</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
