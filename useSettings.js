import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const WX_CODES = {
  0:'☀️', 1:'🌤️', 2:'⛅', 3:'☁️',
  45:'🌫️', 48:'🌫️',
  51:'🌦️', 53:'🌦️', 55:'🌧️',
  61:'🌧️', 63:'🌧️', 65:'🌧️',
  71:'🌨️', 73:'🌨️', 75:'❄️',
  80:'🌦️', 81:'🌧️', 82:'⛈️',
  95:'⛈️', 96:'⛈️', 99:'⛈️',
}

export default function WeatherWidget({ tripId }) {
  const [wx, setWx]     = useState(null)
  const [cfg, setCfg]   = useState(null)
  const [editing, setEditing] = useState(false)
  const [search, setSearch]   = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('trip_config').select('*').eq('trip_id', tripId).single()
      .then(({ data }) => { if (data) { setCfg(data); if (data.dest_lat) fetchWx(data.dest_lat, data.dest_lng) } })
  }, [tripId])

  const fetchWx = async (lat, lng) => {
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weathercode,windspeed_10m&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&forecast_days=4`)
      const d = await r.json()
      setWx(d)
    } catch {}
  }

  const searchCity = async (q) => {
    if (!q.trim()) return
    setLoading(true)
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=4`)
    const d = await r.json()
    setResults(d)
    setLoading(false)
  }

  const pickCity = async (r) => {
    const lat = parseFloat(r.lat), lng = parseFloat(r.lon)
    const name = r.display_name.split(',').slice(0, 2).join(',').trim()
    await supabase.from('trip_config').upsert({ trip_id: tripId, dest_lat: lat, dest_lng: lng, dest_name: name, updated_at: new Date().toISOString() })
    setCfg(c => ({ ...c, dest_lat: lat, dest_lng: lng, dest_name: name }))
    fetchWx(lat, lng)
    setEditing(false); setSearch(''); setResults([])
  }

  if (!cfg?.dest_lat && !editing) return (
    <div className="widget p-4 flex flex-col items-center justify-center text-center cursor-pointer"
         style={{ minHeight: 110 }} onClick={() => setEditing(true)}>
      <p className="text-2xl mb-1">🌤️</p>
      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Configurar destino</p>
    </div>
  )

  if (editing) return (
    <div className="widget p-3 col-span-1" style={{ minHeight: 110 }}>
      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Destino</p>
      <div className="flex gap-1 mb-2">
        <input className="v-input text-xs flex-1" placeholder="Cidade..." value={search}
          onChange={e => setSearch(e.target.value)} autoFocus />
        <button onClick={() => searchCity(search)} className="v-btn v-btn-primary v-btn-sm">🔍</button>
      </div>
      {loading && <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Buscando...</p>}
      {results.map((r, i) => (
        <button key={i} onClick={() => pickCity(r)}
          className="w-full text-left text-xs px-2 py-1.5 rounded-lg mb-0.5 truncate"
          style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
          {r.display_name.split(',').slice(0, 2).join(',')}
        </button>
      ))}
      <button onClick={() => setEditing(false)} className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Cancelar</button>
    </div>
  )

  const cur = wx?.current
  const daily = wx?.daily

  return (
    <div className="widget p-4 cursor-pointer" onClick={() => setEditing(true)} style={{ minHeight: 110 }}>
      <div className="flex items-start justify-between mb-1">
        <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-muted)', maxWidth: '80%' }}>
          {cfg?.dest_name || 'Destino'}
        </p>
        <span className="text-xs" style={{ color: 'var(--color-muted)' }}>✏️</span>
      </div>
      {cur ? (
        <>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl">{WX_CODES[cur.weathercode] || '🌡️'}</span>
            <span className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{Math.round(cur.temperature_2m)}°</span>
          </div>
          {daily && (
            <div className="flex gap-1.5">
              {daily.time.slice(0, 4).map((d, i) => (
                <div key={d} className="flex-1 text-center">
                  <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                    {new Date(d).toLocaleDateString('gl', { weekday: 'narrow' })}
                  </p>
                  <p className="text-sm">{WX_CODES[daily.weathercode[i]] || '🌡️'}</p>
                  <p className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{Math.round(daily.temperature_2m_max[i])}°</p>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Cargando...</p>
      )}
    </div>
  )
}
