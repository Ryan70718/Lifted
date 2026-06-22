import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { AmbientBackground } from '../components/ui/AmbientBackground'

export function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await signIn(email, password)
    if (err) setError(err.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#080b12] flex items-center justify-center px-4">
      <AmbientBackground />
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-indigo-400 font-bold text-xl">LE</span>
          </div>
          <h1 className="text-2xl font-semibold text-white">Lifted Extracts</h1>
          <p className="text-white/40 text-sm mt-1">Sales CRM — Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder-white/25 text-sm focus:outline-none focus:border-indigo-500/60 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder-white/25 text-sm focus:outline-none focus:border-indigo-500/60 transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all duration-150 shadow-[0_0_30px_rgba(99,102,241,0.3)] disabled:opacity-50 mt-2"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
