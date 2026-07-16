import { useState } from 'react'
import { supabase, usernameToEmail } from '../lib/supabase'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    })
    setLoading(false)
    if (error) setError('Usuario ou contrasinal incorrectos.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-ink text-paper text-2xl mb-4">
            🧭
          </div>
          <h1 className="font-display text-4xl text-ink font-semibold">Viaxes</h1>
          <p className="text-charcoal/60 mt-1">O voso caderno de bitácora compartido</p>
        </div>

        <form onSubmit={handleSubmit} className="stamp-card rounded-2xl shadow-stamp p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-ink/15 px-3 py-2 bg-white focus:border-brand outline-none"
              autoCapitalize="none"
              autoCorrect="off"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Contrasinal</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-ink/15 px-3 py-2 bg-white focus:border-brand outline-none"
              required
            />
          </div>
          {error && <p className="text-coral text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand text-white font-medium py-2.5 rounded-lg hover:bg-ink transition-colors disabled:opacity-60"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
