import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import MapView    from '../components/MapView.jsx'
import Timeline   from '../components/Timeline.jsx'
import Diary      from '../components/Diary.jsx'
import Lists      from '../components/Lists.jsx'
import SettingsPanel from '../components/SettingsPanel.jsx'

const TABS = [
  { id: 'mapa',      icon: '🗺️',  label: 'Mapa' },
  { id: 'timeline',  icon: '📅',  label: 'Timeline' },
  { id: 'diario',    icon: '📖',  label: 'Diario' },
  { id: 'listas',    icon: '✅',  label: 'Listaxes' },
]

export default function TripDashboard() {
  const { id: tripId } = useParams()
  const [trip, setTrip]           = useState(null)
  const [tab, setTab]             = useState('mapa')
  const [showInvite, setShowInvite] = useState(false)
  const [showCfg, setShowCfg]     = useState(false)
  const [inviteUser, setInviteUser] = useState('')
  const [inviteMsg,  setInviteMsg]  = useState('')

  useEffect(() => {
    supabase.from('trips').select('*').eq('id', tripId).single().then(({ data }) => setTrip(data))
  }, [tripId])

  const handleInvite = async (e) => {
    e.preventDefault(); setInviteMsg('')
    const { data: uid, error } = await supabase.rpc('get_user_id_by_username', { _username: inviteUser })
    if (error || !uid) { setInviteMsg('Non se atopou ese usuario.'); return }
    const { error: ie } = await supabase.from('trip_members').insert({ trip_id: tripId, user_id: uid, role: 'editor' })
    setInviteMsg(ie ? 'Xa é membro.' : '✓ Convidado!')
    if (!ie) setInviteUser('')
  }

  if (!trip) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>

      {/* Header */}
      <div className="glass sticky top-0 z-30 px-5 pt-10 pb-0">
        <div className="flex items-start justify-between mb-2">
          <div>
            <Link to="/" className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>← Viaxes</Link>
            <h1 className="text-2xl font-bold mt-0.5" style={{ color: 'var(--color-text)' }}>{trip.name}</h1>
            {trip.start_date && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                {trip.start_date} → {trip.end_date}
              </p>
            )}
          </div>
          <div className="flex gap-2 mt-1">
            <button onClick={() => setShowInvite(v => !v)}
              className="w-9 h-9 widget widget-press flex items-center justify-center text-base">👥</button>
            <button onClick={() => setShowCfg(true)}
              className="w-9 h-9 widget widget-press flex items-center justify-center text-base">⚙️</button>
          </div>
        </div>

        {showInvite && (
          <form onSubmit={handleInvite} className="flex gap-2 items-center mb-3">
            <input className="v-input text-sm flex-1" placeholder="usuario a convidar"
              value={inviteUser} onChange={e => setInviteUser(e.target.value)} autoFocus />
            <button type="submit" className="v-btn v-btn-primary v-btn-sm">Convidar</button>
            {inviteMsg && <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{inviteMsg}</span>}
          </form>
        )}

        {/* Tabs top (iPad) / scrollable */}
        <div className="flex overflow-x-auto gap-0 -mx-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
              style={{
                borderColor: tab === t.id ? 'var(--color-accent)' : 'transparent',
                color: tab === t.id ? 'var(--color-accent)' : 'var(--color-muted)',
              }}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-4 pt-4 pb-6 overflow-hidden">
        <div className="fade-up" key={tab}>
          {tab === 'mapa'     && <MapView  tripId={tripId} />}
          {tab === 'timeline' && <Timeline tripId={tripId} trip={trip} />}
          {tab === 'diario'   && <Diary    tripId={tripId} />}
          {tab === 'listas'   && <Lists    tripId={tripId} />}
        </div>
      </main>

      {showCfg && <SettingsPanel onClose={() => setShowCfg(false)} />}
    </div>
  )
}
