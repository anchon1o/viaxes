import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export default function LocationWidget({ tripId }) {
  const [pos, setPos]     = useState(null)
  const [next, setNext]   = useState(null)
  const [dist, setDist]   = useState(null)
  const [err, setErr]     = useState(null)
  const [loading, setLoading] = useState(false)

  const today = new Date().toISOString().slice(0, 10)

  const loadNext = async () => {
    const { data } = await supabase.from('places').select('*').eq('trip_id', tripId).eq('day', today).order('order_index').limit(1)
    if (data?.[0]) setNext(data[0])
  }

  useEffect(() => { loadNext() }, [tripId])

  const locate = () => {
    setLoading(true); setErr(null)
    navigator.geolocation.getCurrentPosition(
      p => {
        setPos(p.coords)
        setLoading(false)
        if (next) setDist(haversine(p.coords.latitude, p.coords.longitude, next.lat, next.lng))
      },
      () => { setErr('Non se puido obter a localización'); setLoading(false) }
    )
  }

  return (
    <div className="widget p-4" style={{ minHeight: 110 }}>
      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-muted)' }}>📍 Estamos aquí</p>
      {!pos && !loading && (
        <button onClick={locate} className="v-btn v-btn-primary v-btn-sm w-full">Localizar</button>
      )}
      {loading && <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Buscando...</p>}
      {err && <p className="text-xs" style={{ color: '#FF3B30' }}>{err}</p>}
      {pos && (
        <div className="space-y-1.5">
          <p className="text-xs font-mono" style={{ color: 'var(--color-text)' }}>
            {pos.latitude.toFixed(4)}, {pos.longitude.toFixed(4)}
          </p>
          {next && dist !== null && (
            <div className="rounded-xl p-2" style={{ background: 'var(--color-bg)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--color-accent)' }}>Seguinte parada:</p>
              <p className="text-xs" style={{ color: 'var(--color-text)' }}>{next.name}</p>
              <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--color-text)' }}>
                {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}
              </p>
            </div>
          )}
          <button onClick={locate} className="text-xs" style={{ color: 'var(--color-accent)' }}>Actualizar</button>
        </div>
      )}
    </div>
  )
}
