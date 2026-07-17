import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../App.jsx'
import SettingsPanel from '../components/SettingsPanel.jsx'

const fmtRange = (a, b) => {
  if (!a) return null
  const da = new Date(a + 'T00:00:00')
  const db = b ? new Date(b + 'T00:00:00') : null
  const opts = { day: 'numeric', month: 'short' }
  const ya = da.toLocaleDateString('gl', opts)
  const yb = db ? db.toLocaleDateString('gl', opts) : '?'
  const nights = db ? Math.round((db - da) / 86400000) : null
  return { range: `${ya} – ${yb}`, nights }
}

export default function Trips() {
  const session = useSession()
  const [trips,    setTrips]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showCfg,  setShowCfg]  = useState(false)
  const [name, setName]         = useState('')
  const [start, setStart]       = useState('')
  const [end, setEnd]           = useState('')
  const [saving, setSaving]     = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('trips').select('*').order('start_date')
    if (data) setTrips(data)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const create = async (e) => {
    e.preventDefault(); setSaving(true)
    const { data, error } = await supabase.from('trips')
      .insert({ name, start_date: start || null, end_date: end || null, created_by: session.user.id })
      .select().single()
    if (!error && data) {
      await supabase.from('trip_members').insert({ trip_id: data.id, user_id: session.user.id, role: 'creator' })
      setName(''); setStart(''); setEnd(''); setShowForm(false); load()
    }
    setSaving(false)
  }

  const username = session?.user?.email?.split('@')[0] || ''

  return (
    <div className="min-h-screen pb-10" style={{ background: 'var(--color-bg)' }}>

      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-end justify-between">
        <div>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Ola, {username} 👋</p>
          <h1 className="text-3xl font-bold mt-0.5" style={{ color: 'var(--color-text)' }}>As túas viaxes</h1>
        </div>
        <button onClick={() => setShowCfg(true)}
          className="w-10 h-10 widget widget-press flex items-center justify-center text-lg">
          ⚙️
        </button>
      </div>

      {/* Lista de viaxes */}
      <div className="px-5 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
          </div>
        ) : trips.length === 0 && !showForm ? (
          <div className="widget p-8 text-center fade-up">
            <div className="text-4xl mb-3">🗺️</div>
            <p className="font-semibold" style={{ color: 'var(--color-text)' }}>Aínda non hai viaxes</p>
            <p className="text-sm mt-1 mb-4" style={{ color: 'var(--color-muted)' }}>Crea a primeira e comezade a planificar xuntos</p>
            <button onClick={() => setShowForm(true)} className="v-btn v-btn-primary v-btn-sm">+ Nova viaxe</button>
          </div>
        ) : (
          trips.map((trip, i) => {
            const info = fmtRange(trip.start_date, trip.end_date)
            return (
              <Link key={trip.id} to={`/viaxe/${trip.id}`}
                className="widget widget-press block p-5 fade-up"
                style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>{trip.name}</p>
                    {info && (
                      <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>
                        {info.range}
                        {info.nights && <span className="ml-2 pill" style={{ fontSize: 11, padding: '2px 8px' }}>{info.nights}n</span>}
                      </p>
                    )}
                  </div>
                  <span style={{ color: 'var(--color-accent)', fontSize: 20 }}>›</span>
                </div>
              </Link>
            )
          })
        )}

        {/* Formulario nova viaxe */}
        {showForm ? (
          <form onSubmit={create} className="widget p-5 space-y-3 scale-in">
            <p className="font-semibold" style={{ color: 'var(--color-text)' }}>Nova viaxe</p>
            <input className="v-input" placeholder="Nome da viaxe" value={name}
              onChange={e => setName(e.target.value)} autoFocus required />
            <div className="flex gap-2">
              <input type="date" className="v-input text-sm" value={start} onChange={e => setStart(e.target.value)} />
              <input type="date" className="v-input text-sm" value={end}   onChange={e => setEnd(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="v-btn v-btn-primary flex-1">{saving ? 'Creando...' : 'Crear'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="v-btn v-btn-secondary">Cancelar</button>
            </div>
          </form>
        ) : trips.length > 0 && (
          <button onClick={() => setShowForm(true)}
            className="w-full py-4 rounded-2xl text-sm font-medium transition-colors"
            style={{ border: '1.5px dashed var(--color-border)', color: 'var(--color-muted)' }}>
            + Nova viaxe
          </button>
        )}
      </div>

      {showCfg && <SettingsPanel onClose={() => setShowCfg(false)} />}
    </div>
  )
}
