import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function AdminLogin() {
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const userRole = session.user.user_metadata?.role
        if (userRole === 'ADMIN') {
          navigate('/admin', { replace: true })
        } else {
          navigate('/', { replace: true })
        }
      }
    })
  }, [navigate])

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword,
      })

      if (signInError) throw signInError

      const userRole = data.user?.user_metadata?.role
      if (userRole === 'ADMIN') {
        navigate('/admin', { replace: true })
      } else {
        await supabase.auth.signOut()
        throw new Error('Akun ini tidak memiliki akses admin.')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden p-8">
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-gray-900 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
          <p className="text-sm text-gray-500 mt-2">Gunakan kredensial admin Anda untuk masuk</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-xl text-sm text-red-600 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleAdminLogin} className="space-y-5">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="mt-2 w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-gray-900 focus:border-gray-900 focus:outline-none transition-colors"
              placeholder="admin@anindira.com"
              required
              autoFocus
            />
          </div>
          
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Kata Sandi</label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="mt-2 w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-gray-900 focus:border-gray-900 focus:outline-none transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={!adminEmail || !adminPassword || loading}
              className="w-full rounded-xl bg-gray-900 py-4 font-bold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-50 disabled:shadow-none hover:bg-gray-800"
            >
              {loading ? 'Memproses...' : 'Masuk Dashboard'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
