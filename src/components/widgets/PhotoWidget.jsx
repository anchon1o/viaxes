import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Link } from 'react-router-dom'

export default function PhotoWidget({ tripId }) {
  const [photos, setPhotos] = useState([])
  const [idx, setIdx]       = useState(0)

  useEffect(() => {
    supabase.from('diary_entries').select('*')
      .eq('trip_id', tripId).in('type', ['foto', 'video'])
      .order('created_at', { ascending: false }).limit(6)
      .then(({ data }) => { if (data) setPhotos(data) })
  }, [tripId])

  if (!photos.length) return (
    <Link to={`/viaxe/${tripId}`} className="widget flex items-center gap-3 p-4">
      <span className="text-2xl">📷</span>
      <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Aínda non hai fotos no diario</p>
    </Link>
  )

  const photo = photos[idx]

  return (
    <div className="widget overflow-hidden relative" style={{ height: 180 }}>
      {photo.type === 'foto' ? (
        <img src={photo.content} alt="" className="w-full h-full object-cover" />
      ) : (
        <video src={photo.content} className="w-full h-full object-cover" muted autoPlay loop playsInline />
      )}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />
      <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
        <p className="text-white text-xs">
          {new Date(photo.created_at).toLocaleDateString('gl', { day: 'numeric', month: 'short' })}
        </p>
        {photos.length > 1 && (
          <div className="flex gap-1.5 items-center">
            <button onClick={() => setIdx(i => (i - 1 + photos.length) % photos.length)}
              className="text-white text-lg leading-none">‹</button>
            <span className="text-white text-xs">{idx + 1}/{photos.length}</span>
            <button onClick={() => setIdx(i => (i + 1) % photos.length)}
              className="text-white text-lg leading-none">›</button>
          </div>
        )}
      </div>
    </div>
  )
}
