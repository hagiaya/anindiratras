import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Store, Plus, Trash2, Edit2, RefreshCw } from 'lucide-react'

export default function AdminOutlets() {
  const [outlets, setOutlets] = useState<any[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')

  // Form State
  const [newName, setNewName] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [newPhone, setNewPhone] = useState('')

  useEffect(() => {
    fetchOutlets()
  }, [])

  const fetchOutlets = async () => {
    setIsRefreshing(true)
    setError('')
    try {
      const { data, error: fetchError } = await supabase
        .from('outlets')
        .select('*')
        .order('created_at', { ascending: false })
        
      if (fetchError) throw new Error('Error fetching outlets: ' + fetchError.message)
      setOutlets(data || [])
    } catch (err: any) {
      console.error(err)
      setError('Gagal memuat data outlet: ' + err.message)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleAddOutlet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName) return
    
    setIsRefreshing(true)
    const { error: insertError } = await supabase.from('outlets').insert({
      name: newName,
      address: newAddress,
      phone: newPhone,
      is_active: true
    })
    
    setIsRefreshing(false)
    
    if (!insertError) {
      setNewName('')
      setNewAddress('')
      setNewPhone('')
      fetchOutlets()
    } else {
      setError(insertError.message)
    }
  }

  const handleDeleteOutlet = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus outlet ini?')) return
    
    setIsRefreshing(true)
    const { error: deleteError } = await supabase.from('outlets').delete().eq('id', id)
    setIsRefreshing(false)
    
    if (!deleteError) {
      fetchOutlets()
    } else {
      setError(deleteError.message)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manajemen Outlet</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola daftar outlet atau cabang operasional</p>
        </div>
        <button 
          onClick={fetchOutlets}
          className="flex items-center justify-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50 transition active:scale-95 w-fit"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          <span>Segarkan</span>
        </button>
      </div>

      {error && <div className="p-4 bg-red-100 text-red-700 font-bold rounded-xl text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Tambah Outlet */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <Plus size={20} className="mr-2 text-primary"/> Tambah Outlet Baru
          </h2>
          <form onSubmit={handleAddOutlet} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Nama Outlet / Cabang</label>
              <input 
                required 
                type="text" 
                value={newName} 
                onChange={e => setNewName(e.target.value)} 
                placeholder="Misal: Cabang Gorontalo" 
                className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Alamat</label>
              <textarea 
                value={newAddress} 
                onChange={e => setNewAddress(e.target.value)} 
                placeholder="Alamat lengkap outlet" 
                className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none h-24 resize-none" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Nomor Telepon (Opsional)</label>
              <input 
                type="text" 
                value={newPhone} 
                onChange={e => setNewPhone(e.target.value)} 
                placeholder="Misal: 08123456789" 
                className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-primary outline-none" 
              />
            </div>
            
            <button 
              disabled={isRefreshing} 
              type="submit" 
              className="w-full bg-gray-900 text-white font-bold rounded-xl py-3 hover:bg-black transition active:scale-95 disabled:opacity-50"
            >
              Simpan Outlet
            </button>
          </form>
        </div>

        {/* Tabel Data Outlet */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">Nama Outlet</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">Kontak & Alamat</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase text-gray-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {outlets.map(outlet => (
                  <tr key={outlet.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                          <Store size={20} />
                        </div>
                        <span className="font-bold text-gray-900">{outlet.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-800">{outlet.phone || '-'}</div>
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">{outlet.address || 'Alamat tidak tersedia'}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDeleteOutlet(outlet.id)} 
                        className="text-red-500 p-2 hover:bg-red-50 rounded-lg transition"
                        title="Hapus Outlet"
                      >
                        <Trash2 size={18}/>
                      </button>
                    </td>
                  </tr>
                ))}
                {outlets.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-12">
                      <Store size={48} className="mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium">Belum ada data outlet / cabang</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
