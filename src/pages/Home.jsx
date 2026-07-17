import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../App.jsx'
import SettingsPanel   from '../components/SettingsPanel.jsx'
import WeatherWidget   from '../components/widgets/WeatherWidget.jsx'
import LocationWidget  from '../components/widgets/LocationWidget.jsx'
import ChecklistWidget from '../components/widgets/ChecklistWidget.jsx'
import BudgetWidget    from '../components/widgets/BudgetWidget.jsx'
import PhotoWidget     from '../components/widgets/PhotoWidget.jsx'
import MusicWidget     from '../components/widgets/MusicWidget.jsx'

const fmtRange = (a, b) => {
  if (!a) return null
  const da = new Date(a + 'T00:00:00'), db = b ? new Date(b + 'T00:00:00') : null
  const opts = { day: 'numeric', month: 'short' }
  const nights = db ? Math.round((db - da) / 86400000) : null
  return { range: `${da.toLocaleDateString('gl', opts)} – ${db ? db.toLocaleDateString('gl', opts) : '?'}`, nights }
}
const isActive = t => {
  if (!t.start_date || !t.end_date) return false
  const now = new Date()
  return new Date(t.start_date) <= now && now <= new Date(t.end_date + 'T23:59:59')
}

export default function Home() {
  const session = useSession()
  const [trips,    setTrips]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showCfg,  setShowCfg]  = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [name, setName]   = useState('')
  const [start, setStart] = useState('')
  const [end,   setEnd]   = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('trips').select('*').order('start_date', { ascending: false })
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

  const deleteTrip = async (id) => {
    await supabase.from('trips').delete().eq('id', id)
    setTrips(p => p.filter(t => t.id !== id))
    setConfirmDel(null)
  }

  const featured = trips.find(isActive) || trips[0] || null
  const username  = session?.user?.email?.split('@')[0] || ''
  const h = new Date().getHours()
  const greeting = h < 13 ? 'Bos días' : h < 20 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="min-h-screen pb-safe safe-bottom" style={{ background: 'var(--color-bg)' }}>

      {/* Header compacto con safe-area */}
      <div className="safe-x" style={{ paddingTop: 'max(52px, calc(env(safe-area-inset-top) + 12px))' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{greeting}, {username} 👋</p>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Viaxes</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => supabase.auth.signOut()} className="vb-icon widget widget-tap text-lg">↪️</button>
            <button onClick={() => setShowCfg(true)}        className="vb-icon widget widget-tap text-lg">⚙️</button>
          </div>
        </div>
      </div>

      {/* Widgets */}
      {featured && (
        <div className="safe-x mb-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
              {isActive(featured) ? '🟢 En viaxe' : `📍 ${featured.name}`}
            </p>
            <Link to={`/viaxe/${featured.id}`} className="text-xs font-semibold" style={{ color: 'var(--color-accent)' }}>
              Abrir →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <WeatherWidget  tripId={featured.id} />
            <LocationWidget tripId={featured.id} />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <ChecklistWidget tripId={featured.id} />
            <BudgetWidget    tripId={featured.id} />
          </div>
          <div className="mb-2"><PhotoWidget tripId={featured.id} /></div>
          <div className="mb-4"><MusicWidget tripId={featured.id} /></div>
        </div>
      )}

      {/* Lista viaxes */}
      <div className="safe-x">
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-muted)' }}>
          Todas as viaxes
        </p>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                 style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <div className="space-y-2">
            {trips.map((trip, i) => {
              const info = fmtRange(trip.start_date, trip.end_date)
              const active = isActive(trip)
              return (
                <div key={trip.id} className="widget fade-up"
                     style={{ animationDelay: `${i * 0.04}s`, borderLeft: active ? '3px solid var(--color-accent)' : undefined }}>
                  <Link to={`/viaxe/${trip.id}`} className="flex items-center justify-between px-4 py-3 block widget-tap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate" style={{ color: 'var(--color-text)' }}>{trip.name}</p>
                        {active && <span className="pill shrink-0">Agora</span>}
                      </div>
                      {info && <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                        {info.range}{info.nights ? ` · ${info.nights}n` : ''}
                      </p>}
                    </div>
                    <span className="ml-3 text-xl shrink-0" style={{ color: 'var(--color-accent)' }}>›</span>
                  </Link>
                  <div className="px-4 pb-2">
                    <button onClick={() => setConfirmDel(trip)} className="text-xs" style={{ color: '#FF3B30' }}>
                      🗑 Eliminar
                    </button>
                  </div>
                </div>
              )
            })}

            {trips.length === 0 && !showForm && (
              <div className="widget p-8 text-center">
                <p className="text-4xl mb-3">🧭</p>
                <p className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Sen viaxes aínda</p>
                <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>Crea a primeira e comezade a planificar</p>
                <button onClick={() => setShowForm(true)} className="vb vb-p vb-sm">+ Nova viaxe</button>
              </div>
            )}

            {showForm ? (
              <form onSubmit={create} className="widget p-4 space-y-3 scale-in">
                <p className="font-semibold" style={{ color: 'var(--color-text)' }}>Nova viaxe</p>
                <input className="vi" placeholder="Nome da viaxe" value={name}
                  onChange={e => setName(e.target.value)} autoFocus required />
                <div className="flex gap-2">
                  <input type="date" className="vi" value={start} onChange={e => setStart(e.target.value)} />
                  <input type="date" className="vi" value={end}   onChange={e => setEnd(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="vb vb-p flex-1">
                    {saving ? 'Creando...' : 'Crear'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="vb vb-s">Cancelar</button>
                </div>
              </form>
            ) : (
              <button onClick={() => setShowForm(true)} className="w-full py-3 text-sm font-medium"
                style={{ border: '1.5px dashed var(--color-border)', borderRadius: 'var(--radius)', color: 'var(--color-muted)' }}>
                + Nova viaxe
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal confirmar borrar */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5"
             style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
             onClick={() => setConfirmDel(null)}>
          <div className="widget p-6 w-full max-w-sm scale-in text-center" onClick={e => e.stopPropagation()}>
            <p className="text-3xl mb-3">🗑️</p>
            <p className="font-bold text-lg mb-1" style={{ color: 'var(--color-text)' }}>Eliminar viaxe?</p>
            <p className="text-sm mb-5" style={{ color: 'var(--color-muted)' }}>
              "{confirmDel.name}" eliminarase con todos os datos: mapa, diario, listas, retos...
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)} className="vb vb-s flex-1">Cancelar</button>
              <button onClick={() => deleteTrip(confirmDel.id)}
                className="vb flex-1" style={{ background: '#FF3B30', color: '#fff' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {showCfg && <SettingsPanel onClose={() => setShowCfg(false)} />}
    </div>
  )
}
