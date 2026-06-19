import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { RefreshCw, UserCheck, Shield, Car, Smartphone } from 'lucide-react'

export default function Users() {
  const [users, setUsers] = useState<any[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setIsRefreshing(true)
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false })
    if (data) setUsers(data)
    setIsRefreshing(false)
  }

  const toggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const { error } = await supabase.from('users').update({ status: newStatus }).eq('id', userId)
    if (!error) {
      setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u))
    }
  }

  const setRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId)
    if (!error) {
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
    }
  }

  const getRoleIcon = (role: string) => {
    switch(role) {
      case 'ADMIN': return <Shield size={16} className="text-purple-600 mr-2" />
      case 'DRIVER': return <Car size={16} className="text-orange-600 mr-2" />
      default: return <Smartphone size={16} className="text-blue-600 mr-2" />
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Pengguna & Sopir</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola akun, ubah peran (role), dan blokir akses</p>
        </div>
        <button 
          onClick={fetchUsers}
          className="flex items-center justify-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50 transition active:scale-95 w-fit"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          <span>Segarkan</span>
        </button>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Terdaftar</span>
          <span className="text-xl font-black text-gray-900">{users.length}</span>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm flex flex-col justify-center">
          <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">Penumpang</span>
          <span className="text-xl font-black text-blue-700">{users.filter(u => u.role === 'USER').length}</span>
        </div>
        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 shadow-sm flex flex-col justify-center">
          <span className="text-xs font-bold text-orange-500 uppercase tracking-wider">Sopir</span>
          <span className="text-xl font-black text-orange-700">{users.filter(u => u.role === 'DRIVER').length}</span>
        </div>
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 shadow-sm flex flex-col justify-center">
          <span className="text-xs font-bold text-purple-500 uppercase tracking-wider">Admin Pusat</span>
          <span className="text-xl font-black text-purple-700">{users.filter(u => u.role === 'ADMIN').length}</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Akun / Kontak</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Hak Akses (Role)</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Status Sistem</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Tindakan Khusus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                        <UserCheck size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{user.full_name || 'Tanpa Nama'}</p>
                        <p className="text-xs font-medium text-gray-500">{user.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-bold ${
                      user.role === 'ADMIN' ? 'border-purple-200 bg-purple-50 text-purple-700' :
                      user.role === 'DRIVER' ? 'border-orange-200 bg-orange-50 text-orange-700' :
                      'border-blue-200 bg-blue-50 text-blue-700'
                    }`}>
                      {getRoleIcon(user.role)}
                      <select
                        className="bg-transparent outline-none cursor-pointer"
                        value={user.role}
                        onChange={(e) => setRole(user.id, e.target.value)}
                      >
                        <option value="USER">Penumpang</option>
                        <option value="DRIVER">Sopir Lapangan</option>
                        <option value="ADMIN">Admin Sistem</option>
                      </select>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex rounded-md px-3 py-1 text-[10px] font-bold tracking-wider uppercase ${user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {user.status === 'ACTIVE' ? 'Aktif' : 'Diblokir'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                    <button
                      onClick={() => toggleStatus(user.id, user.status)}
                      className={`px-4 py-2 rounded-lg font-bold text-xs transition active:scale-95 ${
                        user.status === 'ACTIVE' 
                        ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' 
                        : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
                      }`}
                    >
                      {user.status === 'ACTIVE' ? 'Blokir Akses' : 'Buka Blokir'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
