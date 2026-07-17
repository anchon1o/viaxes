import { useState } from 'react'
import { supabase, usernameToEmail } from '../lib/supabase'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

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
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-[340px]">

        {/* Logotipo */}
        <div className="mb-10">
          <p className="text-xs font-mono text-mid uppercase tracking-widest mb-2">Viaxes</p>
          <h1 className="text-3xl font-semibold text-ink leading-tight">
            Benvidos<br />de volta.
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="input"
            type="text"
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Contrasinal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <p className="text-xs text-danger">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

      </div>
    </div>
  )
}
