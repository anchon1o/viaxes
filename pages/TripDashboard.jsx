import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import MapView    from '../components/MapView.jsx'
import Timeline   from '../components/Timeline.jsx'
import Diary      from '../components/Diary.jsx'
import Lists      from '../components/Lists.jsx'

const TABS = [
  { id: 'mapa',     label: 'Mapa' },
  { id: 'planning', label: 'Planning' },
  { id: 'diario',   label: 'Diario' },
  { id: 'listas',   label: 'Listas' },
]

export default function TripDashboard() {
  const { tripId } = useParams()
  const [trip, setTrip]           = useState(null)
  const [tab, setTab]             = useState('mapa')
  const [showInvite, setShowInvite] = useState(false)
  const [inviteUser, setInviteUser] = useState('')
  const [inviteMsg, setInviteMsg]   = useState('')

  useEffect(() => {
    supabase.from('trips').select('*').eq('id', tripId).single().then(({ data }) => setTrip(data))
  }, [tripId])

  const handleInvite = async (e) => {
    e.preventDefault()
    setInviteMsg('')
    const { data: userId, error } = await supabase.rpc('get_user_id_by_username', { _username: inviteUser })
    if (error || !userId) { setInviteMsg('Non se atopou ese usuario.'); return }
    const { error: ie } = await supabase.from('trip_members').insert({ trip_id: tripId, user_id: userId, role: 'editor' })
    setInviteMsg(ie ? 'Xa é membro ou houbo un erro.' : 'Convidado!')
    if (!ie) setInviteUser('')
  }

  if (!trip) return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="text-sm text-mid">Cargando...</span>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col">

      {/* Header */}
      <header className="border-b border-line px-6 pt-6 pb-0 max-w-5xl mx-auto w-full">
        <div className="flex items-start justify-between mb-4">
          <div>
            <Link to="/" className="text-xs font-mono text-mid hover:text-ink transition-colors">← viaxes</Link>
            <h1 className="text-2xl font-semibold text-ink mt-1">{trip.name}</h1>
            {trip.start_date && (
              <p className="text-xs font-mono text-mid mt-0.5">{trip.start_date} → {trip.end_date}</p>
            )}
          </div>
          <button
            onClick={() => setShowInvite(v => !v)}
            className="text-xs text-mid hover:text-ink transition-colors mt-1"
          >
            Convidar
          </button>
        </div>

        {showInvite && (
          <form onSubmit={handleInvite} className="flex gap-2 items-center mb-4 max-w-sm">
            <input
              className="input text-sm"
              placeholder="usuario a convidar"
              value={inviteUser}
              onChange={e => setInviteUser(e.target.value)}
            />
            <button type="submit" className="btn-primary text-sm">Convidar</button>
            {inviteMsg && <span className="text-xs text-mid">{inviteMsg}</span>}
          </form>
        )}

        {/* Tabs */}
        <nav className="flex gap-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-ink text-ink'
                  : 'border-transparent text-mid hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 pt-6 pb-12">
        {tab === 'mapa'     && <MapView  tripId={tripId} />}
        {tab === 'planning' && <Timeline tripId={tripId} trip={trip} />}
        {tab === 'diario'   && <Diary    tripId={tripId} />}
        {tab === 'listas'   && <Lists    tripId={tripId} />}
      </main>

    </div>
  )
}
