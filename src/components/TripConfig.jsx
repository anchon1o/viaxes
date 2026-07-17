import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const CURRENCIES = ['EUR','USD','GBP','JPY','MXN','BRL','CHF','NOK','SEK','DKK','PLN','CZK','HUF','RON','BGN','HRK']

export default function TripConfig({ tripId, trip }) {
  const [cfg, setCfg]         = useState(null)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [slug, setSlug]       = useState('')
  const [slugSaved, setSlugSaved] = useState(false)
  const [form, setForm]       = useState({
    dest_name: '', currency: 'EUR', currency_to: 'EUR', budget: '', timezone: 'Europe/Madrid'
  })

  useEffect(() => {
    supabase.from('trip_config').select('*').eq('trip_id', tripId).single()
      .then(({ data }) => {
        if (data) {
          setCfg(data)
          setSlug(data.public_slug || '')
          setForm({
            dest_name:   data.dest_name   || '',
            currency:    data.currency    || 'EUR',
            currency_to: data.currency_to || 'EUR',
            budget:      data.budget      ? String(data.budget) : '',
            timezone:    data.timezone    || 'Europe/Madrid',
          })
        }
      })
  }, [tripId])

  const save = async (e) => {
    e.preventDefault(); setSaving(true)
    await supabase.from('trip_config').upsert({
      trip_id: tripId,
      dest_name:   form.dest_name   || null,
      currency:    form.currency,
      currency_to: form.currency_to,
      budget:      form.budget ? Number(form.budget) : 0,
      timezone:    form.timezone,
      updated_at:  new Date().toISOString(),
    })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const saveSlug = async () => {
    const clean = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
    setSlug(clean)
    await supabase.from('trip_config').upsert({ trip_id: tripId, public_slug: clean || null, updated_at: new Date().toISOString() })
    setSlugSaved(true); setTimeout(() => setSlugSaved(false), 2000)
  }

  const publicUrl = slug ? `${window.location.origin}/p/${slug}` : null

  return (
    <div className="max-w-lg mx-auto space-y-4">

      {/* Configuración xeral */}
      <div className="widget p-5">
        <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--color-text)' }}>⚙️ Configuración da viaxe</h2>
        <form onSubmit={save} className="space-y-3">

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--color-muted)' }}>
              Destino
            </label>
            <input className="v-input" placeholder="Ex: Lisboa, Portugal" value={form.dest_name}
              onChange={e => setForm({...form, dest_name: e.target.value})} />
            <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Úsase tamén no widget do tempo</p>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--color-muted)' }}>
                Moeda orixe
              </label>
              <select className="v-input text-sm" value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--color-muted)' }}>
                Moeda destino
              </label>
              <select className="v-input text-sm" value={form.currency_to} onChange={e => setForm({...form, currency_to: e.target.value})}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--color-muted)' }}>
              Presuposto total ({form.currency})
            </label>
            <input type="number" className="v-input" placeholder="0.00" value={form.budget}
              onChange={e => setForm({...form, budget: e.target.value})} />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--color-muted)' }}>
              Fuso horario
            </label>
            <select className="v-input text-sm" value={form.timezone} onChange={e => setForm({...form, timezone: e.target.value})}>
              {['Europe/Madrid','Europe/London','Europe/Paris','Europe/Lisbon','Europe/Berlin','America/New_York','America/Chicago','America/Los_Angeles','America/Sao_Paulo','Asia/Tokyo','Asia/Bangkok','Australia/Sydney'].map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>

          <button type="submit" disabled={saving} className="v-btn v-btn-primary w-full">
            {saving ? 'Gardando...' : saved ? '✓ Gardado!' : 'Gardar configuración'}
          </button>
        </form>
      </div>

      {/* Link público */}
      <div className="widget p-5">
        <h2 className="font-bold mb-1" style={{ color: 'var(--color-text)' }}>🔗 Viaxe pública</h2>
        <p className="text-xs mb-3" style={{ color: 'var(--color-muted)' }}>
          Crea un link para que familia e amigos poidan ver a viaxe sen necesidade de conta.
          Só lectura — non poden editar nada.
        </p>
        <div className="flex gap-2">
          <div className="flex items-center flex-1 v-input text-sm" style={{ gap: 4 }}>
            <span style={{ color: 'var(--color-muted)', whiteSpace: 'nowrap', fontSize: 11 }}>/p/</span>
            <input
              value={slug} onChange={e => setSlug(e.target.value)}
              placeholder="o-meu-viaxe"
              style={{ border: 'none', outline: 'none', background: 'transparent', color: 'var(--color-text)', flex: 1, fontFamily: 'inherit' }}
            />
          </div>
          <button onClick={saveSlug} className="v-btn v-btn-primary v-btn-sm">
            {slugSaved ? '✓' : 'Gardar'}
          </button>
        </div>
        {publicUrl && (
          <div className="mt-2 p-2 rounded-lg flex items-center justify-between gap-2"
               style={{ background: 'var(--color-bg)' }}>
            <p className="text-xs font-mono truncate" style={{ color: 'var(--color-accent)' }}>{publicUrl}</p>
            <button onClick={() => navigator.clipboard.writeText(publicUrl)}
              className="text-xs shrink-0 v-btn v-btn-secondary v-btn-sm">Copiar</button>
          </div>
        )}
      </div>

      {/* Conversor de moeda */}
      <CurrencyConverter cfg={cfg} />

    </div>
  )
}

function CurrencyConverter({ cfg }) {
  const [rate, setRate]   = useState(null)
  const [amount, setAmount] = useState('100')
  const [loading, setLoading] = useState(false)
  const from = cfg?.currency || 'EUR'
  const to   = cfg?.currency_to || 'EUR'

  useEffect(() => {
    if (from === to) { setRate(1); return }
    setLoading(true)
    fetch(`https://open.er-api.com/v6/latest/${from}`)
      .then(r => r.json())
      .then(d => { setRate(d.rates?.[to] || null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [from, to])

  if (from === to) return null

  const converted = rate && amount ? (parseFloat(amount) * rate).toFixed(2) : null

  return (
    <div className="widget p-5">
      <h2 className="font-bold mb-3" style={{ color: 'var(--color-text)' }}>💱 Conversor de moeda</h2>
      <div className="flex items-center gap-2 mb-2">
        <input type="number" className="v-input text-sm flex-1" value={amount}
          onChange={e => setAmount(e.target.value)} placeholder="Cantidade" />
        <span className="font-bold" style={{ color: 'var(--color-muted)' }}>{from}</span>
        <span style={{ color: 'var(--color-muted)' }}>→</span>
        <span className="font-bold" style={{ color: 'var(--color-text)' }}>
          {loading ? '...' : converted ? `${converted} ${to}` : '—'}
        </span>
      </div>
      {rate && <p className="text-xs" style={{ color: 'var(--color-muted)' }}>1 {from} = {rate.toFixed(4)} {to}</p>}

      {/* Conversores rápidos */}
      <div className="grid grid-cols-3 gap-1.5 mt-3">
        {[5,10,20,50,100,200].map(v => (
          <button key={v} onClick={() => setAmount(String(v))}
            className="v-btn v-btn-secondary v-btn-sm text-xs">
            {v} {from}
          </button>
        ))}
      </div>
    </div>
  )
}
