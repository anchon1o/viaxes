import { useState } from 'react'
import { supabase, usernameToEmail } from '../lib/supabase'

export default function Login() {
  const [user, setUser]   = useState('')
  const [pass, setPass]   = useState('')
  const [err,  setErr]    = useState('')
  const [busy, setBusy]   = useState(false)

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(user), password: pass })
    setBusy(false)
    if (error) setErr('Usuario ou contrasinal incorrectos.')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 fade-up"
         style={{ background:'var(--color-bg)' }}>
      <div className="w-full max-w-xs">
        <div className="mb-8 text-center">
          <div className="w-20 h-20 flex items-center justify-center text-4xl mx-auto mb-4 widget"
               style={{ borderRadius:'28px', background:'var(--color-accent)' }}>🧭</div>
          <h1 className="text-3xl font-bold" style={{ color:'var(--color-text)' }}>Viaxes</h1>
          <p className="text-sm mt-1" style={{ color:'var(--color-muted)' }}>O voso caderno de viaxe compartido</p>
        </div>
        <form onSubmit={submit} className="widget p-6 space-y-3 scale-in">
          <input className="vi" type="text" placeholder="Usuario" value={user}
            onChange={e => setUser(e.target.value)} autoCapitalize="none" autoCorrect="off" required />
          <input className="vi" type="password" placeholder="Contrasinal" value={pass}
            onChange={e => setPass(e.target.value)} required />
          {err && <p className="text-xs text-center" style={{ color:'#FF3B30' }}>{err}</p>}
          <button type="submit" disabled={busy} className="vb vb-p w-full">
            {busy ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
