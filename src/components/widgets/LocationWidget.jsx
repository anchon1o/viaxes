import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export default function LocationWidget({ tripId }) {
  const [pos,     setPos]     = useState(null)
  const [next,    setNext]    = useState(null)
  const [dist,    setDist]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [err,     setErr]     = useState(null)
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    supabase.from('places').select('*').eq('trip_id', tripId).eq('day', today).order('order_index').limit(1)
      .then(({ data }) => { if (data?.[0]) setNext(data[0]) })
  }, [tripId])

  const locate = () => {
    setLoading(true); setErr(null)
    navigator.geolocation.getCurrentPosition(
      p => {
        setPos(p.coords)
        setLoading(false)
        if (next) setDist(haversine(p.coords.latitude, p.coords.longitude, next.lat, next.lng))
      },
      () => { setErr('Non se puido obter'); setLoading(false) },
      { timeout: 10000 }
    )
  }

  const openInMap = () => {
    if (!pos) return
    window.open(`https://maps.google.com/?q=${pos.latitude},${pos.longitude}`, '_blank')
  }

  // Mini-mapa estático con OpenStreetMap tiles
  const staticMapUrl = pos
    ? `https://staticmap.openstreetmap.de/staticmap.php?center=${pos.latitude},${pos.longitude}&zoom=14&size=300x120&markers=${pos.latitude},${pos.longitude},red`
    : null

  return (
    <div className="widget overflow-hidden" style={{ minHeight: 110 }}>
      {pos ? (
        <>
          {/* Mini mapa estático clicable */}
          <div className="relative cursor-pointer" onClick={openInMap} style={{ height: 80 }}>
            <img
              src={`https://tile.openstreetmap.org/14/${Math.floor((pos.longitude + 180) / 360 * Math.pow(2, 14))}/${Math.floor((1 - Math.log(Math.tan(pos.latitude * Math.PI / 180) + 1 / Math.cos(pos.latitude * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, 14))}.png`}
              alt="Mapa" className="w-full h-full object-cover"
              style={{ filter: 'saturate(0.8) brightness(0.95)' }}
              onError={e => { e.target.style.display = 'none' }}
            />
            {/* Punto azul centrado */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div style={{ width: 14, height: 14, background: '#007AFF', borderRadius: '50%', border: '3px solid white', boxShadow: '0 0 0 4px rgba(0,122,255,0.25)' }} />
            </div>
            {/* Badge "Abrir en mapa" */}
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-white" style={{ background: 'rgba(0,0,0,0.5)', fontSize: 10 }}>
              🗺 Abrir
            </div>
          </div>

          {/* Info */}
          <div className="px-3 py-2">
            {next && dist !== null && (
              <div>
                <p className="text-xs font-semibold" style={{ color: 'var(--color-accent)' }}>Seguinte: {next.name}</p>
                <p className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                  {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}
                </p>
              </div>
            )}
            <button onClick={locate} className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>↻ Actualizar</button>
          </div>
        </>
      ) : (
        <div className="p-4 flex flex-col items-center justify-center text-center" style={{ minHeight: 110 }}>
          <span style={{ fontSize: 28 }} className="mb-1">📍</span>
          {loading ? (
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Buscando...</p>
          ) : err ? (
            <p className="text-xs" style={{ color: '#FF3B30' }}>{err}</p>
          ) : (
            <button onClick={locate} className="vb vb-p vb-sm">Localizar</button>
          )}
        </div>
      )}
    </div>
  )
}
