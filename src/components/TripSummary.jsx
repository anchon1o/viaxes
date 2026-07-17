import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function TripSummary({ tripId, trip }) {
  const [stats, setStats]   = useState(null)
  const [photos, setPhotos] = useState([])
  const [places, setPlaces] = useState([])
  const [items,  setItems]  = useState([])
  const [songs,  setSongs]  = useState([])
  const bookRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      const [e, p, it, s] = await Promise.all([
        supabase.from('diary_entries').select('*').eq('trip_id', tripId),
        supabase.from('places').select('*').eq('trip_id', tripId),
        supabase.from('itinerary_items').select('*').eq('trip_id', tripId),
        supabase.from('trip_songs').select('*').eq('trip_id', tripId),
      ])
      const entries = e.data || []
      setPhotos(entries.filter(x => x.type === 'foto' || x.type === 'video').slice(0, 12))
      setPlaces(p.data || [])
      setItems(it.data || [])
      setSongs(s.data || [])
      setStats({
        totalEntries: entries.length,
        photos:       entries.filter(x => x.type === 'foto').length,
        videos:       entries.filter(x => x.type === 'video').length,
        audios:       entries.filter(x => x.type === 'audio').length,
        drawings:     entries.filter(x => x.type === 'debuxo').length,
        texts:        entries.filter(x => x.type === 'texto').length,
        places:       (p.data || []).length,
        activities:   (it.data || []).length,
        songs:        (s.data || []).length,
      })
    }
    load()
  }, [tripId])

  const nights = trip.start_date && trip.end_date
    ? Math.round((new Date(trip.end_date) - new Date(trip.start_date)) / 86400000)
    : null

  const exportAsImage = async () => {
    // Usar html2canvas via CDN cargado dinámicamente
    if (!window.html2canvas) {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
      document.head.appendChild(script)
      await new Promise(r => script.onload = r)
    }
    const canvas = await window.html2canvas(bookRef.current, { useCORS: true, scale: 2, backgroundColor: null })
    const link = document.createElement('a')
    link.download = `${trip.name.replace(/\s+/g, '-')}-resumo.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  if (!stats) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
           style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto">

      {/* Botón exportar */}
      <div className="flex justify-end mb-4">
        <button onClick={exportAsImage} className="v-btn v-btn-primary v-btn-sm">
          📥 Exportar como imaxe
        </button>
      </div>

      {/* Fotobook exportable */}
      <div ref={bookRef} className="widget overflow-hidden"
           style={{ background: 'var(--color-surface)' }}>

        {/* Portada */}
        <div className="px-6 py-8 text-center"
             style={{ background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-surface) 100%)' }}>
          <p className="text-4xl mb-3">🧭</p>
          <h1 className="text-3xl font-bold text-white">{trip.name}</h1>
          {trip.start_date && (
            <p className="text-white/80 mt-1 font-mono text-sm">
              {trip.start_date} → {trip.end_date}
              {nights !== null && ` · ${nights} noites`}
            </p>
          )}
        </div>

        {/* Stats en grid */}
        <div className="grid grid-cols-3 gap-px" style={{ background: 'var(--color-border)' }}>
          {[
            { icon: '📍', label: 'Lugares',      val: stats.places },
            { icon: '📅', label: 'Actividades',  val: stats.activities },
            { icon: '📝', label: 'Notas',         val: stats.texts },
            { icon: '📷', label: 'Fotos',         val: stats.photos },
            { icon: '🎬', label: 'Vídeos',        val: stats.videos },
            { icon: '🎵', label: 'Cancions',      val: stats.songs },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center py-4"
                 style={{ background: 'var(--color-surface)' }}>
              <span className="text-2xl mb-1">{s.icon}</span>
              <span className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>{s.val}</span>
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Galería de fotos */}
        {photos.length > 0 && (
          <div className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-muted)' }}>
              Momentos
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {photos.map((e, i) => (
                <div key={e.id} className="rounded-xl overflow-hidden aspect-square"
                     style={{ gridColumn: i === 0 ? 'span 2' : undefined, gridRow: i === 0 ? 'span 2' : undefined }}>
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

        {/* Lugares visitados */}
        {places.length > 0 && (
          <div className="px-5 pb-4">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-muted)' }}>
              Lugares visitados
            </p>
            <div className="flex flex-wrap gap-1.5">
              {places.map(p => (
                <span key={p.id} className="text-xs px-2 py-1 rounded-full"
                      style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
                  📍 {p.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Banda sonora */}
        {songs.length > 0 && (
          <div className="px-5 pb-5">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-muted)' }}>
              Banda sonora
            </p>
            <div className="space-y-1">
              {songs.slice(0, 5).map(s => (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="text-xs">🎵</span>
                  <span className="text-xs" style={{ color: 'var(--color-text)' }}>{s.title}</span>
                  {s.artist && <span className="text-xs" style={{ color: 'var(--color-muted)' }}>— {s.artist}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 text-center border-t" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Creado con Viaxes 🧭</p>
        </div>
      </div>
    </div>
  )
}
