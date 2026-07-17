import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'

const WX = { 0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',51:'🌦️',53:'🌦️',55:'🌧️',61:'🌧️',63:'🌧️',65:'🌧️',71:'🌨️',73:'🌨️',75:'❄️',80:'🌦️',81:'🌧️',82:'⛈️',95:'⛈️',96:'⛈️',99:'⛈️' }

async function fetchWeather(lat, lng) {
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weathercode&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&forecast_days=4`)
    return r.json()
  } catch { return null }
}

async function geocode(q) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=4`, { headers: { 'User-Agent': 'Viaxes' } })
    return r.json()
  } catch { return [] }
}

export default function WeatherWidget({ tripId }) {
  const [destinations, setDestinations] = useState([]) // [{name, lat, lng, wx}]
  const [idx,      setIdx]      = useState(0)
  const [editing,  setEditing]  = useState(false)
  const [search,   setSearch]   = useState('')
  const [results,  setResults]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const startX = useRef(null)

  useEffect(() => {
    supabase.from('trip_config').select('*').eq('trip_id', tripId).single()
      .then(async ({ data }) => {
        if (data?.dest_lat) {
          const wx = await fetchWeather(data.dest_lat, data.dest_lng)
          setDestinations([{ name: data.dest_name || 'Destino', lat: data.dest_lat, lng: data.dest_lng, wx }])
        }
      })
  }, [tripId])

  const searchCity = async q => {
    if (!q.trim()) return
    setLoading(true)
    setResults(await geocode(q))
    setLoading(false)
  }

  const pickCity = async r => {
    const lat = parseFloat(r.lat), lng = parseFloat(r.lon)
    const name = r.display_name.split(',').slice(0, 2).join(',').trim()
    const wx = await fetchWeather(lat, lng)
    const newDest = { name, lat, lng, wx }
    const updated = destinations.find(d => d.name === name) ? destinations : [...destinations, newDest]
    setDestinations(updated)
    setIdx(updated.length - 1)
    // Gardar o primeiro como config
    if (updated.length === 1) {
      await supabase.from('trip_config').upsert({ trip_id: tripId, dest_name: name, dest_lat: lat, dest_lng: lng, updated_at: new Date().toISOString() })
    }
    setSearch(''); setResults([]); setEditing(false)
  }

  const removeDest = i => {
    const updated = destinations.filter((_, di) => di !== i)
    setDestinations(updated)
    setIdx(Math.min(idx, updated.length - 1))
  }

  // Swipe
  const handleTouchStart = e => { startX.current = e.touches[0].clientX }
  const handleTouchEnd = e => {
    if (startX.current === null) return
    const dx = e.changedTouches[0].clientX - startX.current
    if (Math.abs(dx) > 40) {
      if (dx < 0) setIdx(i => (i + 1) % destinations.length)
      else        setIdx(i => (i - 1 + destinations.length) % destinations.length)
    }
    startX.current = null
  }

  if (!destinations.length && !editing) return (
    <div className="widget p-4 flex flex-col items-center justify-center text-center cursor-pointer"
         style={{ minHeight: 110 }} onClick={() => setEditing(true)}>
      <span style={{ fontSize: 32 }}>🌤️</span>
      <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Configurar tempo</p>
    </div>
  )

  if (editing) return (
    <div className="widget p-3" style={{ minHeight: 110 }}>
      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Engadir destino</p>
      <div className="flex gap-1 mb-2">
        <input className="vi text-sm flex-1" placeholder="Cidade..." value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') searchCity(search) }}
          autoFocus />
        <button onClick={() => searchCity(search)} className="vb vb-p vb-sm">🔍</button>
      </div>
      {loading && <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Buscando...</p>}
      {results.map((r, i) => (
        <button key={i} onClick={() => pickCity(r)}
          className="w-full text-left px-2 py-1.5 rounded-lg text-xs mb-0.5 truncate"
          style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
          {r.display_name.split(',').slice(0, 2).join(',')}
        </button>
      ))}
      <button onClick={() => setEditing(false)} className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Cancelar</button>
    </div>
  )

  const dest = destinations[idx]
  const cur  = dest?.wx?.current
  const daily = dest?.wx?.daily

  return (
    <div className="widget p-4 cursor-pointer" style={{ minHeight: 110 }}
         onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* Cabeceira */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-muted)', maxWidth: '75%' }}>
          {dest?.name}
        </p>
        <div className="flex items-center gap-1">
          {destinations.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); setIdx(i => (i - 1 + destinations.length) % destinations.length) }}
                style={{ fontSize: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: '0 2px' }}>‹</button>
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{idx + 1}/{destinations.length}</span>
              <button onClick={e => { e.stopPropagation(); setIdx(i => (i + 1) % destinations.length) }}
                style={{ fontSize: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: '0 2px' }}>›</button>
            </>
          )}
          <button onClick={e => { e.stopPropagation(); setEditing(true) }}
            style={{ fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}>+</button>
          {destinations.length > 1 && (
            <button onClick={e => { e.stopPropagation(); removeDest(idx) }}
              style={{ fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', color: '#FF3B30' }}>✕</button>
          )}
        </div>
      </div>

      {cur ? (
        <>
          <div className="flex items-center gap-2 mb-2">
            <span style={{ fontSize: 30 }}>{WX[cur.weathercode] || '🌡️'}</span>
            <span className="font-bold" style={{ fontSize: 26, color: 'var(--color-text)' }}>{Math.round(cur.temperature_2m)}°</span>
          </div>
          {daily && (
            <div className="flex gap-1">
              {daily.time.slice(0, 4).map((d, i) => (
                <div key={d} className="flex-1 text-center">
                  <p style={{ fontSize: 10, color: 'var(--color-muted)' }}>
                    {new Date(d).toLocaleDateString('gl', { weekday: 'narrow' })}
                  </p>
                  <p style={{ fontSize: 14 }}>{WX[daily.weathercode[i]] || '🌡️'}</p>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text)' }}>{Math.round(daily.temperature_2m_max[i])}°</p>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>Cargando...</p>
      )}
    </div>
  )
}
