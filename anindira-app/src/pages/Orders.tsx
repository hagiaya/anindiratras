import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Package, CarFront, Plane, Car } from 'lucide-react'

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState<number>(0)
  const navigate = useNavigate()

  useEffect(() => {
    fetchOrdersAndBalance()
  }, [])

  const fetchOrdersAndBalance = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])

      const { data: userData } = await supabase
        .from('users')
        .select('balance')
        .eq('id', session.user.id)
        .single()
      
      if (userData) setBalance(userData.balance || 0)

    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'CARPOOL': return <CarFront size={20} className="text-green-500" />
      case 'TITIP_BARANG': return <Package size={20} className="text-orange-500" />
      case 'ANTAR_BANDARA': return <Plane size={20} className="text-blue-500" />
      case 'SEWA_MOBIL': return <Car size={20} className="text-purple-500" />
      default: return <Package size={20} className="text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'ASSIGNED': return 'bg-blue-100 text-blue-800'
      case 'ON_THE_WAY': return 'bg-purple-100 text-purple-800'
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handlePayment = async (order: any) => {
    if (balance < order.total_price) {
      alert('Saldo AnindiraPay Anda tidak mencukupi. Silakan Top Up terlebih dahulu.')
      navigate('/topup')
      return
    }

    if (!confirm(`Konfirmasi pembayaran sebesar Rp ${order.total_price.toLocaleString('id-ID')} menggunakan saldo AnindiraPay?`)) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // 1. Deduct balance
      const newBalance = balance - order.total_price
      const { error: balanceError } = await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', session.user.id)

      if (balanceError) throw balanceError

      // 2. Update order payment status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ payment_status: 'PAID' })
        .eq('id', order.id)

      if (orderError) throw orderError

      // 3. Record transaction
      await supabase.from('transactions').insert({
        user_id: session.user.id,
        type: 'PAYMENT',
        amount: order.total_price,
        order_id: order.id,
        status: 'VERIFIED' // Instantly verified because it uses internal balance
      })

      alert('Pembayaran berhasil!')
      fetchOrdersAndBalance()
    } catch (err) {
      console.error(err)
      alert('Terjadi kesalahan saat memproses pembayaran.')
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center bg-white px-4 py-4 shadow-sm">
        <button onClick={() => navigate(-1)} className="mr-4 text-gray-600">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Riwayat Pesanan</h1>
      </div>

      <div className="flex-1 p-4">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex h-60 flex-col items-center justify-center text-gray-500">
            <Package size={48} className="mb-4 opacity-50" />
            <p className="font-medium">Belum ada pesanan</p>
            <p className="text-sm">Pesanan Anda akan muncul di sini</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3 border-b border-gray-50 pb-3">
                  <div className="flex items-center space-x-2">
                    {getServiceIcon(order.order_type)}
                    <span className="font-bold text-gray-800">
                      {order.order_type.replace('_', ' ')}
                    </span>
                  </div>
                  <span className={`px-2 py-1 rounded-md text-xs font-bold ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Tanggal</span>
                    <span className="text-sm font-medium text-gray-800">
                      {new Date(order.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Total Pembayaran</span>
                    <span className="text-sm font-bold text-primary">
                      Rp {order.total_price?.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {order.payment_status === 'UNPAID' && order.status !== 'CANCELLED' && (
                  <button 
                    onClick={() => handlePayment(order)}
                    className="w-full rounded-xl bg-primary py-2 text-sm font-bold text-white transition active:scale-[0.98]"
                  >
                    Bayar via AnindiraPay
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
