import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function PublicTrip() {
  const { slug } = useParams()
  const [trip, setTrip]       = useState(null)
  const [places, setPlaces]   = useState([])
  const [entries, setEntries] = useState([])
  const [items, setItems]     = useState([])
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: trips } = await supabase.rpc('get_trip_by_slug', { _slug: slug })
      if (!trips?.length) { setNotFound(true); return }
      const t = trips[0]
      setTrip(t)
      const [p, e, it] = await Promise.all([
        supabase.from('places').select('*').eq('trip_id', t.id).order('order_index'),
        supabase.from('diary_entries').select('*').eq('trip_id', t.id).order('created_at', { ascending: false }),
        supabase.from('itinerary_items').select('*').eq('trip_id', t.id).order('day').order('time'),
      ])
      setPlaces(p.data || [])
      setEntries(e.data || [])
      setItems(it.data || [])
    }
    load()
  }, [slug])

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
      <div className="text-center">
        <p className="text-5xl mb-3">🧭</p>
        <p className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Viaxe non atopada</p>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>O link pode ser incorrecto ou xa non está dispoñible.</p>
      </div>
    </div>
  )

  if (!trip) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
           style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
    </div>
  )

  const photos = entries.filter(e => e.type === 'foto' || e.type === 'video')
  const today = new Date().toISOString().slice(0, 10)
  const todayItems = items.filter(i => i.day === today)

  return (
    <div className="min-h-screen pb-16" style={{ background: 'var(--color-bg)' }}>

      {/* Header */}
      <div className="glass px-5 pt-12 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="pill text-xs">Só lectura</span>
        </div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>{trip.name}</h1>
        {trip.start_date && (
          <p className="text-sm mt-0.5 font-mono" style={{ color: 'var(--color-muted)' }}>
            {trip.start_date} → {trip.end_date}
          </p>
        )}
      </div>

      <div className="px-5 mt-5 space-y-4">

        {/* Hoxe */}
        {todayItems.length > 0 && (
          <div className="widget p-4">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-muted)' }}>Hoxe</p>
            <div className="space-y-2">
              {todayItems.map(it => (
                <div key={it.id} className="flex items-start gap-3">
                  {it.time && <span className="text-xs font-mono font-bold shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }}>{it.time.slice(0,5)}</span>}
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{it.title}</p>
                    {it.description && <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{it.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fotos recentes */}
        {photos.length > 0 && (
          <div className="widget overflow-hidden">
            <p className="text-xs font-semibold uppercase tracking-wider px-4 pt-4 mb-3" style={{ color: 'var(--color-muted)' }}>
              Últimas fotos
            </p>
            <div className="grid grid-cols-3 gap-px" style={{ background: 'var(--color-border)' }}>
              {photos.slice(0, 9).map(e => (
                <div key={e.id} className="aspect-square" style={{ background: 'var(--color-surface)' }}>
                  {e.type === 'foto' ? (
                    <img src={e.content} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <video src={e.content} className="w-full h-full object-cover" muted />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notas de texto */}
        {entries.filter(e => e.type === 'texto').slice(0, 3).map(e => (
          <div key={e.id} className="widget p-4">
            <p className="text-xs font-mono mb-2" style={{ color: 'var(--color-muted)' }}>
              {new Date(e.created_at).toLocaleDateString('gl', { day: 'numeric', month: 'long' })}
            </p>
            <p className="text-base leading-relaxed" style={{ color: 'var(--color-text)' }}>{e.content}</p>
          </div>
        ))}

        {/* Lugares */}
        {places.length > 0 && (
          <div className="widget p-4">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-muted)' }}>
              📍 Lugares
            </p>
            <div className="space-y-2">
              {places.map(p => (
                <div key={p.id} className="flex items-center gap-2">
                  <span>📍</span>
                  <span className="text-sm" style={{ color: 'var(--color-text)' }}>{p.name}</span>
                  {p.day && <span className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>{p.day}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center py-4">
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Feito con ❤️ en Viaxes 🧭</p>
        </div>
      </div>
    </div>
  )
}
