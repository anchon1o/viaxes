import { useState } from 'react'
import { supabase, usernameToEmail } from '../lib/supabase'

export default function Login() {
  const [user, setUser]   = useState('')
  const [pass, setPass]   = useState('')
  const [err, setErr]     = useState('')
  const [busy, setBusy]   = useState(false)

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(user), password: pass })
    setBusy(false)
    if (error) setErr('Usuario ou contrasinal incorrectos.')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 fade-up"
         style={{ background: 'var(--color-bg)' }}>

      {/* Icono da app */}
      <div className="mb-8 text-center">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-4 mx-auto shadow-widget"
             style={{ background: 'var(--color-accent)' }}>
          🧭
        </div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>Viaxes</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>O voso caderno de viaxe compartido</p>
      </div>

      {/* Form */}
      <form onSubmit={submit} className="widget w-full max-w-sm p-6 space-y-3 scale-in">
        <input className="v-input" type="text" placeholder="Usuario" value={user}
          onChange={e => setUser(e.target.value)} autoCapitalize="none" autoCorrect="off" required />
        <input className="v-input" type="password" placeholder="Contrasinal" value={pass}
          onChange={e => setPass(e.target.value)} required />
        {err && <p className="text-sm text-center" style={{ color: '#FF3B30' }}>{err}</p>}
        <button type="submit" disabled={busy} className="v-btn v-btn-primary w-full mt-2">
          {busy ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

    </div>
  )
}
