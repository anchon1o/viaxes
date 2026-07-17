import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../App.jsx'

export default function Trips() {
  const session   = useSession()
  const [trips, setTrips]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName]         = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate]     = useState('')
  const [saving, setSaving]       = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('trips').select('*').order('start_date', { ascending: true })
    if (data) setTrips(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { data, error } = await supabase
      .from('trips')
      .insert({ name, start_date: startDate || null, end_date: endDate || null, created_by: session.user.id })
      .select().single()
    if (!error && data) {
      await supabase.from('trip_members').insert({ trip_id: data.id, user_id: session.user.id, role: 'creator' })
      setName(''); setStartDate(''); setEndDate(''); setShowForm(false)
      load()
    }
    setSaving(false)
  }

  const nights = (a, b) => {
    if (!a || !b) return null
    const diff = new Date(b) - new Date(a)
    return Math.round(diff / 86400000)
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-6 pt-8 pb-6 max-w-2xl mx-auto">
        <p className="text-xs font-mono text-mid uppercase tracking-widest">Viaxes</p>
        <button onClick={() => supabase.auth.signOut()} className="text-xs text-mid hover:text-ink transition-colors">
          Saír
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-6 pb-24">

        {loading ? (
          <p className="text-sm text-mid mt-4">Cargando...</p>
        ) : (
          <div className="space-y-2">
            {trips.map((trip) => (
              <Link
                key={trip.id}
                to={`/viaxe/${trip.id}`}
                className="flex items-center justify-between p-4 rounded-xl border border-line hover:border-ink transition-colors group"
              >
                <div>
                  <p className="font-medium text-ink">{trip.name}</p>
                  {trip.start_date && (
                    <p className="text-xs font-mono text-mid mt-0.5">
                      {trip.start_date} → {trip.end_date}
                      {nights(trip.start_date, trip.end_date) !== null && (
                        <span className="ml-2 text-accent">{nights(trip.start_date, trip.end_date)} noites</span>
                      )}
                    </p>
                  )}
                </div>
                <span className="text-mid group-hover:text-ink transition-colors text-lg">→</span>
              </Link>
            ))}
          </div>
        )}

        {showForm ? (
          <form onSubmit={handleCreate} className="mt-6 p-5 rounded-xl border border-line space-y-3">
            <p className="text-sm font-medium text-ink">Nova viaxe</p>
            <input
              className="input"
              placeholder="Nome da viaxe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
            <div className="flex gap-2">
              <input type="date" className="input font-mono text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <input type="date" className="input font-mono text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Creando...' : 'Crear'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 w-full p-4 rounded-xl border border-dashed border-line text-sm text-mid hover:text-ink hover:border-ink transition-colors text-left"
          >
            + Nova viaxe
          </button>
        )}

      </main>
    </div>
  )
}
