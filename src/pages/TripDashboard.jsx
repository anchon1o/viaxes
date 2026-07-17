import { useEffect, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import MapView       from '../components/MapView.jsx'
import Timeline      from '../components/Timeline.jsx'
import Diary         from '../components/Diary.jsx'
import Lists         from '../components/Lists.jsx'
import ChallengesTab from '../components/ChallengesTab.jsx'
import SoundtrackTab from '../components/SoundtrackTab.jsx'
import TripSummary   from '../components/TripSummary.jsx'
import TripConfig    from '../components/TripConfig.jsx'
import SettingsPanel from '../components/SettingsPanel.jsx'

const TABS = [
  { id: 'mapa',     icon: '🗺️', label: 'Mapa' },
  { id: 'timeline', icon: '📅', label: 'Timeline' },
  { id: 'diario',   icon: '📖', label: 'Diario' },
  { id: 'listas',   icon: '✅', label: 'Listaxes' },
  { id: 'retos',    icon: '⚔️', label: 'Retos' },
  { id: 'son',      icon: '🎵', label: 'Son' },
  { id: 'resumo',   icon: '🏁', label: 'Resumo' },
  { id: 'config',   icon: '⚙️', label: 'Config' },
]

export default function TripDashboard() {
  const { id: tripId } = useParams()
  const [sp] = useSearchParams()
  const [trip, setTrip]           = useState(null)
  const [tab,  setTab]            = useState(sp.get('tab') || 'mapa')
  const [showInvite, setShowInvite] = useState(false)
  const [showCfg, setShowCfg]     = useState(false)
  const [invUser, setInvUser]     = useState('')
  const [invMsg,  setInvMsg]      = useState('')

  useEffect(() => {
    supabase.from('trips').select('*').eq('id', tripId).single().then(({ data }) => setTrip(data))
  }, [tripId])

  const invite = async (e) => {
    e.preventDefault(); setInvMsg('')
    const { data: uid, error } = await supabase.rpc('get_user_id_by_username', { _username: invUser })
    if (error || !uid) { setInvMsg('Non se atopou.'); return }
    const { error: ie } = await supabase.from('trip_members').insert({ trip_id: tripId, user_id: uid, role: 'editor' })
    setInvMsg(ie ? 'Xa é membro.' : '✓ Convidado!')
    if (!ie) setInvUser('')
  }

  if (!trip) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
           style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>

      {/* Header compacto sticky */}
      <div className="glass sticky top-0 z-30"
           style={{ paddingTop: 'max(44px, env(safe-area-inset-top))', paddingLeft: 'max(16px, env(safe-area-inset-left))', paddingRight: 'max(16px, env(safe-area-inset-right))' }}>

        {/* Liña superior: voltar + título + botóns */}
        <div className="flex items-center gap-3 mb-1 pb-1">
          <Link to="/" className="text-xl shrink-0" style={{ color: 'var(--color-accent)' }}>←</Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold leading-tight truncate" style={{ color: 'var(--color-text)' }}>{trip.name}</h1>
            {trip.start_date && (
              <p className="text-xs leading-none" style={{ color: 'var(--color-muted)' }}>
                {trip.start_date} → {trip.end_date}
              </p>
            )}
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button onClick={() => setShowInvite(v => !v)} className="vb-icon widget widget-tap" style={{ fontSize: 18 }}>👥</button>
            <button onClick={() => setShowCfg(true)}       className="vb-icon widget widget-tap" style={{ fontSize: 18 }}>🎨</button>
          </div>
        </div>

        {showInvite && (
          <div className="pb-2">
            <form onSubmit={invite} className="flex gap-2">
              <input className="vi text-sm flex-1" placeholder="usuario a convidar"
                value={invUser} onChange={e => setInvUser(e.target.value)} autoFocus />
              <button type="submit" className="vb vb-p vb-sm">Convidar</button>
            </form>
            {invMsg && <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>{invMsg}</p>}
          </div>
        )}

        {/* Tabs como iconos en móbil, con label en tablet/desktop */}
        <div className="flex no-scrollbar overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex flex-col items-center gap-0.5 px-2 py-2 border-b-2 transition-colors shrink-0"
              style={{
                borderColor: tab === t.id ? 'var(--color-accent)' : 'transparent',
                color: tab === t.id ? 'var(--color-accent)' : 'var(--color-muted)',
                minWidth: 48,
              }}>
              <span style={{ fontSize: 20 }}>{t.icon}</span>
              <span className="text-xs hidden sm:block font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Contido */}
      <main className="flex-1 px-4 pt-3 pb-6 safe-x"
            style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
        <div className="fade-up" key={tab}>
          {tab === 'mapa'     && <MapView       tripId={tripId} />}
          {tab === 'timeline' && <Timeline      tripId={tripId} trip={trip} />}
          {tab === 'diario'   && <Diary         tripId={tripId} />}
          {tab === 'listas'   && <Lists         tripId={tripId} />}
          {tab === 'retos'    && <ChallengesTab tripId={tripId} />}
          {tab === 'son'      && <SoundtrackTab tripId={tripId} />}
          {tab === 'resumo'   && <TripSummary   tripId={tripId} trip={trip} />}
          {tab === 'config'   && <TripConfig    tripId={tripId} trip={trip} />}
        </div>
      </main>

      {showCfg && <SettingsPanel onClose={() => setShowCfg(false)} />}
    </div>
  )
}
