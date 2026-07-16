import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import MapView from '../components/MapView.jsx'
import Timeline from '../components/Timeline.jsx'
import Diary from '../components/Diary.jsx'
import Lists from '../components/Lists.jsx'

const TABS = [
  { id: 'mapa', label: '🗺️ Mapa' },
  { id: 'planning', label: '📅 Planning' },
  { id: 'diario', label: '📖 Diario' },
  { id: 'listas', label: '📋 Listas' },
]

export default function TripDashboard() {
  const { tripId } = useParams()
  const [trip, setTrip] = useState(null)
  const [tab, setTab] = useState('mapa')
  const [showInvite, setShowInvite] = useState(false)
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')

  useEffect(() => {
    supabase.from('trips').select('*').eq('id', tripId).single().then(({ data }) => setTrip(data))
  }, [tripId])

  const handleInvite = async (e) => {
    e.preventDefault()
    setInviteMsg('')
    const { data: userId, error } = await supabase.rpc('get_user_id_by_username', {
      _username: inviteUsername,
    })
    if (error || !userId) {
      setInviteMsg('Non se atopou ese usuario.')
      return
    }
    const { error: insertError } = await supabase
      .from('trip_members')
      .insert({ trip_id: tripId, user_id: userId, role: 'editor' })
    setInviteMsg(insertError ? 'Xa é membro ou houbo un erro.' : 'Convidado correctamente!')
    if (!insertError) setInviteUsername('')
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-charcoal/50">Cargando viaxe...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-10">
      <header className="max-w-5xl mx-auto px-5 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-sm text-charcoal/50 hover:text-brand">
            ← Viaxes
          </Link>
          <button
            onClick={() => setShowInvite((v) => !v)}
            className="text-sm text-brand hover:underline"
          >
            👥 Convidar
          </button>
        </div>
        <h1
          className="font-display text-3xl font-semibold mt-2"
          style={{ color: trip.cover_color }}
        >
          {trip.name}
        </h1>
        {trip.start_date && (
          <p className="text-sm font-mono text-charcoal/50">
            {trip.start_date} → {trip.end_date}
          </p>
        )}

        {showInvite && (
          <form onSubmit={handleInvite} className="stamp-card rounded-xl shadow-stamp p-3 mt-3 flex gap-2 items-center max-w-md">
            <input
              value={inviteUsername}
              onChange={(e) => setInviteUsername(e.target.value)}
              placeholder="usuario a convidar"
              className="flex-1 border border-ink/15 rounded-lg px-3 py-1.5 text-sm"
            />
            <button type="submit" className="bg-brand text-white px-3 py-1.5 rounded-lg text-sm">
              Convidar
            </button>
            {inviteMsg && <span className="text-xs text-charcoal/60">{inviteMsg}</span>}
          </form>
        )}
      </header>

      {/* Tabs */}
      <nav className="max-w-5xl mx-auto px-5 mt-4 flex gap-1 border-b border-ink/10">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-brand text-brand' : 'border-transparent text-charcoal/50 hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="max-w-5xl mx-auto px-5 mt-5">
        {tab === 'mapa' && <MapView tripId={tripId} />}
        {tab === 'planning' && <Timeline tripId={tripId} trip={trip} />}
        {tab === 'diario' && <Diary tripId={tripId} />}
        {tab === 'listas' && <Lists tripId={tripId} />}
      </main>
    </div>
  )
}
