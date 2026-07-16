import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../App.jsx'

const CORES = ['#16324F', '#3E7C59', '#C89B3C', '#E1572C', '#007bc4']

export default function Trips() {
  const session = useSession()
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [color, setColor] = useState(CORES[0])
  const [saving, setSaving] = useState(false)

  const loadTrips = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .order('start_date', { ascending: true })
    if (!error) setTrips(data)
    setLoading(false)
  }

  useEffect(() => {
    loadTrips()
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { data, error } = await supabase
      .from('trips')
      .insert({
        name,
        start_date: startDate || null,
        end_date: endDate || null,
        cover_color: color,
        created_by: session.user.id,
      })
      .select()
      .single()

    if (!error && data) {
      await supabase.from('trip_members').insert({
        trip_id: data.id,
        user_id: session.user.id,
        role: 'creator',
      })
      setName('')
      setStartDate('')
      setEndDate('')
      setShowForm(false)
      loadTrips()
    }
    setSaving(false)
  }

  const handleLogout = () => supabase.auth.signOut()

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-5 py-4 max-w-3xl mx-auto">
        <h1 className="font-display text-2xl text-ink font-semibold">🧭 Viaxes</h1>
        <button onClick={handleLogout} className="text-sm text-charcoal/50 hover:text-coral">
          Saír
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-5 pb-24">
        {loading ? (
          <p className="text-charcoal/50 mt-8">Cargando viaxes...</p>
        ) : trips.length === 0 && !showForm ? (
          <div className="text-center mt-16">
            <p className="text-5xl mb-4">🗺️</p>
            <p className="font-display text-xl text-ink mb-1">Aínda non hai viaxes</p>
            <p className="text-charcoal/50 mb-6">Crea a primeira e comezade a planificar</p>
          </div>
        ) : (
          <div className="grid gap-4 mt-6 sm:grid-cols-2">
            {trips.map((trip) => (
              <Link
                key={trip.id}
                to={`/viaxe/${trip.id}`}
                className="stamp-card rounded-2xl shadow-stamp p-5 block hover:-translate-y-0.5 transition-transform"
                style={{ borderTop: `4px solid ${trip.cover_color}` }}
              >
                <p className="font-display text-xl text-ink font-semibold">{trip.name}</p>
                {trip.start_date && (
                  <p className="text-sm text-charcoal/50 mt-1 font-mono">
                    {trip.start_date} → {trip.end_date || '?'}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}

        {showForm ? (
          <form onSubmit={handleCreate} className="stamp-card rounded-2xl shadow-stamp p-6 mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Nome da viaxe</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-ink/15 px-3 py-2"
                placeholder="Ex: Fin de semana en Lisboa"
                required
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-ink mb-1">Inicio</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-ink/15 px-3 py-2 font-mono text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-ink mb-1">Fin</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-ink/15 px-3 py-2 font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Cor</label>
              <div className="flex gap-2">
                {CORES.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-8 h-8 rounded-full border-2"
                    style={{ backgroundColor: c, borderColor: color === c ? '#2B2926' : 'transparent' }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-brand text-white font-medium py-2.5 rounded-lg hover:bg-ink transition-colors disabled:opacity-60"
              >
                {saving ? 'Creando...' : 'Crear viaxe'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-lg text-charcoal/60 hover:bg-paperdark"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="mt-6 w-full border-2 border-dashed border-ink/20 rounded-2xl py-4 text-ink/60 font-medium hover:border-brand hover:text-brand transition-colors"
          >
            + Nova viaxe
          </button>
        )}
      </main>
    </div>
  )
}
