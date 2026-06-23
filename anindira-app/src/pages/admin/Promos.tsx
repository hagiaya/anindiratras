import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Trash2, RefreshCw, Tag, Percent } from 'lucide-react'

export default function Promos() {
  const [promos, setPromos] = useState<any[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')

  // Form State
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [discountType, setDiscountType] = useState('PERCENTAGE')
  const [discountValue, setDiscountValue] = useState('')
  const [maxDiscount, setMaxDiscount] = useState('')
  const [minOrder, setMinOrder] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    fetchPromos()
  }, [])

  const fetchPromos = async () => {
    setIsRefreshing(true)
    setError('')
    try {
      const { data, error } = await supabase
        .from('promos')
        .select('*')
        .order('created_at', { ascending: false })
        
      if (error) throw error
      setPromos(data || [])
    } catch (err: any) {
      console.error(err)
      setError('Gagal memuat promo: ' + err.message)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleAddPromo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code || !discountValue) return
    setIsRefreshing(true)
    
    const payload: any = {
      code: code.toUpperCase().trim(),
      description,
      discount_type: discountType,
      discount_value: Number(discountValue),
      min_order_amount: Number(minOrder) || 0,
      is_active: true
    }
    
    if (discountType === 'PERCENTAGE' && maxDiscount) {
      payload.max_discount_amount = Number(maxDiscount)
    }
    
    if (endDate) {
      payload.end_date = new Date(endDate).toISOString()
    }

    const { error } = await supabase.from('promos').insert(payload)
    setIsRefreshing(false)
    
    if (!error) {
      setCode('')
      setDescription('')
      setDiscountValue('')
      setMaxDiscount('')
      setMinOrder('')
      setEndDate('')
      fetchPromos()
    } else {
      setError(error.message)
    }
  }

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('promos').update({ is_active: !currentStatus }).eq('id', id)
    if (!error) {
      setPromos(promos.map(p => p.id === id ? { ...p, is_active: !currentStatus } : p))
    }
  }

  const handleDeletePromo = async (id: string) => {
    if (!confirm('Hapus promo ini secara permanen?')) return
    setIsRefreshing(true)
    const { error } = await supabase.from('promos').delete().eq('id', id)
    setIsRefreshing(false)
    if (!error) fetchPromos()
    else setError(error.message)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manajemen Promo</h1>
          <p className="text-sm text-gray-500 mt-1">Buat dan kelola kode promo diskon untuk pelanggan</p>
        </div>
        <button 
          onClick={fetchPromos}
          className="flex items-center justify-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50 transition active:scale-95 w-fit"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          <span>Segarkan</span>
        </button>
      </div>

      {error && <div className="p-4 bg-red-100 text-red-700 font-bold rounded-xl text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Plus size={20} className="mr-2 text-primary"/> Tambah Kode Promo</h2>
          <form onSubmit={handleAddPromo} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Kode Promo</label>
              <input required type="text" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="Misal: DISKON50" className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none uppercase" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Deskripsi (Opsional)</label>
              <input type="text" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Contoh: Diskon Pelanggan Baru" className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Tipe Diskon</label>
              <select value={discountType} onChange={e=>setDiscountType(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none">
                <option value="PERCENTAGE">Persentase (%)</option>
                <option value="FIXED">Potongan Harga Tetap (Rp)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Besaran Diskon</label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  {discountType === 'PERCENTAGE' ? <Percent size={14} className="text-gray-400" /> : <span className="text-gray-400 text-sm font-bold">Rp</span>}
                </div>
                <input required type="number" value={discountValue} onChange={e=>setDiscountValue(e.target.value)} placeholder={discountType === 'PERCENTAGE' ? "Contoh: 20" : "Contoh: 15000"} className="w-full border border-gray-300 rounded-lg p-2.5 pl-9 text-sm focus:border-primary outline-none" />
              </div>
            </div>
            {discountType === 'PERCENTAGE' && (
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Maksimal Potongan (Rp)</label>
                <input type="number" value={maxDiscount} onChange={e=>setMaxDiscount(e.target.value)} placeholder="Kosongkan jika tanpa batas" className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none" />
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Minimal Belanja (Rp)</label>
              <input type="number" value={minOrder} onChange={e=>setMinOrder(e.target.value)} placeholder="Default: 0" className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Tanggal Berakhir (Opsional)</label>
              <input type="datetime-local" value={endDate} onChange={e=>setEndDate(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none" />
            </div>
            
            <button disabled={isRefreshing} type="submit" className="w-full bg-gray-900 text-white font-bold rounded-xl py-3 hover:bg-black transition active:scale-95 disabled:opacity-50 mt-2">
              Simpan Promo
            </button>
          </form>
        </div>
        
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-fit">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">Kode & Detail</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">Nilai Diskon</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase text-gray-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {promos.map(p => (
                  <tr key={p.id} className={!p.is_active ? 'opacity-50' : ''}>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Tag size={16} className="text-blue-500" />
                        <span className="font-bold text-gray-900">{p.code}</span>
                      </div>
                      {p.description && <p className="text-xs text-gray-500 mt-1">{p.description}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-green-600">
                        {p.discount_type === 'PERCENTAGE' ? `${p.discount_value}%` : `Rp ${Number(p.discount_value).toLocaleString('id-ID')}`}
                      </div>
                      {p.discount_type === 'PERCENTAGE' && p.max_discount_amount && (
                        <div className="text-[10px] text-gray-500 font-medium">Maks Rp {Number(p.max_discount_amount).toLocaleString('id-ID')}</div>
                      )}
                      {p.min_order_amount > 0 && (
                        <div className="text-[10px] text-gray-500 font-medium">Min order: Rp {Number(p.min_order_amount).toLocaleString('id-ID')}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => toggleStatus(p.id, p.is_active)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${p.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        {p.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDeletePromo(p.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg transition"><Trash2 size={18}/></button>
                    </td>
                  </tr>
                ))}
                {promos.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-400 font-medium">Belum ada promo yang dibuat</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
