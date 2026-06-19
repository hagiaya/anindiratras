import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Check, X, Image as ImageIcon } from 'lucide-react'

export default function Transactions() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          users(full_name, phone)
        `)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (err) {
      console.error('Error fetching transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (transaction: any) => {
    if (!confirm('Verifikasi pembayaran ini? Saldo user akan bertambah otomatis.')) return

    try {
      // 1. Update transaction status
      const { error: updateTxError } = await supabase
        .from('transactions')
        .update({ status: 'VERIFIED' })
        .eq('id', transaction.id)

      if (updateTxError) throw updateTxError

      // 2. Add balance to user
      // Note: we fetch current balance first to increment
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('balance')
        .eq('id', transaction.user_id)
        .single()
        
      if (userError) throw userError
      
      const newBalance = (userData.balance || 0) + transaction.amount

      const { error: updateBalanceError } = await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', transaction.user_id)

      if (updateBalanceError) throw updateBalanceError

      alert('Berhasil diverifikasi!')
      fetchTransactions() // refresh list
    } catch (err) {
      console.error(err)
      alert('Terjadi kesalahan saat memverifikasi')
    }
  }

  const handleReject = async (transactionId: string) => {
    if (!confirm('Tolak pembayaran ini?')) return

    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'REJECTED' })
        .eq('id', transactionId)

      if (error) throw error

      alert('Berhasil ditolak')
      fetchTransactions() // refresh list
    } catch (err) {
      console.error(err)
      alert('Terjadi kesalahan')
    }
  }

  if (loading) return <div>Memuat...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Verifikasi Pembayaran</h1>
      
      {transactions.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-gray-500 shadow-sm">
          Tidak ada transaksi yang menunggu verifikasi.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {transactions.map((tx) => (
            <div key={tx.id} className="rounded-xl bg-white p-5 shadow-sm border border-gray-100 flex flex-col">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-500">TIPE TRANSAKSI</p>
                  <p className="font-bold text-gray-900">{tx.type.replace('_', ' ')}</p>
                </div>
                <div className="rounded-md bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-800">
                  {tx.status}
                </div>
              </div>

              <div className="mb-4 flex-1 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Pengguna</span>
                  <span className="font-medium text-gray-900">{tx.users?.full_name || tx.users?.phone || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Nominal</span>
                  <span className="font-bold text-primary">Rp {tx.amount?.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tanggal</span>
                  <span className="text-gray-900">
                    {new Date(tx.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>

              {tx.receipt_url && (
                <a 
                  href={tx.receipt_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mb-4 flex items-center justify-center space-x-2 rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm text-gray-600 hover:bg-gray-100"
                >
                  <ImageIcon size={16} />
                  <span>Lihat Bukti Transfer</span>
                </a>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={() => handleReject(tx.id)}
                  className="flex flex-1 items-center justify-center space-x-1 rounded-lg border border-red-200 bg-red-50 p-2 text-sm font-bold text-red-600 hover:bg-red-100"
                >
                  <X size={16} />
                  <span>Tolak</span>
                </button>
                <button
                  onClick={() => handleVerify(tx)}
                  className="flex flex-1 items-center justify-center space-x-1 rounded-lg bg-green-500 p-2 text-sm font-bold text-white hover:bg-green-600"
                >
                  <Check size={16} />
                  <span>Terima</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
