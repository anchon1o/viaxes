import { useEffect, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import MapView        from '../components/MapView.jsx'
import Timeline       from '../components/Timeline.jsx'
import Diary          from '../components/Diary.jsx'
import Lists          from '../components/Lists.jsx'
import ChallengesTab  from '../components/ChallengesTab.jsx'
import SoundtrackTab  from '../components/SoundtrackTab.jsx'
import TripSummary    from '../components/TripSummary.jsx'
import TripConfig     from '../components/TripConfig.jsx'
import SettingsPanel  from '../components/SettingsPanel.jsx'

const TABS = [
  { id:'mapa',     icon:'🗺️', label:'Mapa' },
  { id:'timeline', icon:'📅', label:'Timeline' },
  { id:'diario',   icon:'📖', label:'Diario' },
  { id:'listas',   icon:'✅', label:'Listaxes' },
  { id:'retos',    icon:'⚔️', label:'Retos' },
  { id:'son',      icon:'🎵', label:'Son' },
  { id:'resumo',   icon:'🏁', label:'Resumo' },
  { id:'config',   icon:'⚙️', label:'Config' },
]

export default function TripDashboard() {
  const { id: tripId } = useParams()
  const [sp] = useSearchParams()
  const [trip, setTrip]             = useState(null)
  const [tab,  setTab]              = useState(sp.get('tab') || 'mapa')
  const [showInvite, setShowInvite] = useState(false)
  const [showCfg,    setShowCfg]    = useState(false)
  const [invUser, setInvUser]       = useState('')
  const [invMsg,  setInvMsg]        = useState('')

  useEffect(() => {
    supabase.from('trips').select('*').eq('id', tripId).single().then(({ data }) => setTrip(data))
  }, [tripId])

  const invite = async (e) => {
    e.preventDefault(); setInvMsg('')
    const { data: uid, error } = await supabase.rpc('get_user_id_by_username', { _username: invUser })
    if (error || !uid) { setInvMsg('Non se atopou ese usuario.'); return }
    const { error: ie } = await supabase.from('trip_members').insert({ trip_id: tripId, user_id: uid, role: 'editor' })
    setInvMsg(ie ? 'Xa é membro.' : '✓ Convidado!')
    if (!ie) setInvUser('')
  }

  if (!trip) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--color-bg)' }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
           style={{ borderColor:'var(--color-accent)', borderTopColor:'transparent' }} />
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col" style={{ background:'var(--color-bg)' }}>
      {/* Header sticky glass */}
      <div className="glass sticky top-0 z-30 px-5 pt-10 pb-0">
        <div className="flex items-start justify-between mb-2">
          <div>
            <Link to="/" className="text-xs font-semibold" style={{ color:'var(--color-accent)' }}>← Viaxes</Link>
            <h1 className="text-2xl font-bold mt-0.5" style={{ color:'var(--color-text)' }}>{trip.name}</h1>
            {trip.start_date && (
              <p className="text-xs mt-0.5" style={{ color:'var(--color-muted)' }}>
                {trip.start_date} → {trip.end_date}
              </p>
            )}
          </div>
          <div className="flex gap-2 mt-1">
            <button onClick={() => setShowInvite(v => !v)}
              className="w-9 h-9 widget widget-tap flex items-center justify-center">👥</button>
            <button onClick={() => setShowCfg(true)}
              className="w-9 h-9 widget widget-tap flex items-center justify-center">🎨</button>
          </div>
        </div>

        {showInvite && (
          <form onSubmit={invite} className="flex gap-2 mb-3">
            <input className="vi text-sm flex-1" placeholder="usuario a convidar"
              value={invUser} onChange={e => setInvUser(e.target.value)} autoFocus />
            <button type="submit" className="vb vb-p vb-sm">Convidar</button>
            {invMsg && <span className="text-xs self-center" style={{ color:'var(--color-muted)' }}>{invMsg}</span>}
          </form>
        )}

        {/* Tabs scrollables */}
        <div className="flex overflow-x-auto" style={{ scrollbarWidth:'none' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
              style={{
                borderColor: tab === t.id ? 'var(--color-accent)' : 'transparent',
                color: tab === t.id ? 'var(--color-accent)' : 'var(--color-muted)',
              }}>
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Contido */}
      <main className="flex-1 px-4 pt-4 pb-10">
        <div className="fade-up" key={tab}>
          {tab === 'mapa'     && <MapView      tripId={tripId} />}
          {tab === 'timeline' && <Timeline     tripId={tripId} trip={trip} />}
          {tab === 'diario'   && <Diary        tripId={tripId} />}
          {tab === 'listas'   && <Lists        tripId={tripId} />}
          {tab === 'retos'    && <ChallengesTab tripId={tripId} />}
          {tab === 'son'      && <SoundtrackTab tripId={tripId} />}
          {tab === 'resumo'   && <TripSummary  tripId={tripId} trip={trip} />}
          {tab === 'config'   && <TripConfig   tripId={tripId} trip={trip} />}
        </div>
      </main>

      {showCfg && <SettingsPanel onClose={() => setShowCfg(false)} />}
    </div>
  )
}
