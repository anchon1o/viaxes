import { useEffect, useRef, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '../lib/supabase'

const CATS = [
  { id: 'aloxamento', label: 'Aloxamento', icon: '🛏️', color: '#007AFF' },
  { id: 'actividade',  label: 'Actividade',  icon: '🎯', color: '#34C759' },
  { id: 'restaurante', label: 'Restaurante', icon: '🍽️', color: '#FF9500' },
  { id: 'parada',      label: 'Parada',      icon: '📍', color: '#FF2D55' },
  { id: 'vista',       label: 'Vista',       icon: '🏔️', color: '#AF52DE' },
  { id: 'outro',       label: 'Outro',       icon: '✨', color: '#8e8e93' },
]
const cat = id => CATS.find(c => c.id === id) || CATS[5]

const makeIcon = (catId, active = false) => {
  const c = cat(catId); const s = active ? 40 : 34
  return L.divIcon({
    className: '',
    html: `<div style="width:${s}px;height:${s}px;background:${c.color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 3px 12px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);font-size:${Math.round(s*0.42)}px;line-height:1">${c.icon}</span></div>`,
    iconSize: [s, s], iconAnchor: [s / 2, s], popupAnchor: [0, -(s + 6)],
  })
}

const myLocIcon = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;background:#007AFF;border-radius:50%;border:3px solid white;box-shadow:0 0 0 5px rgba(0,122,255,0.2),0 2px 8px rgba(0,0,0,0.3)"></div>`,
  iconSize: [18, 18], iconAnchor: [9, 9],
})

async function nominatim(q) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=gl,es`, { headers: { 'User-Agent': 'Viaxes' } })
    return r.json()
  } catch { return [] }
}

async function osrmRoute(pts, mode = 'driving') {
  if (pts.length < 2) return null
  const coords = pts.map(p => `${p.lng},${p.lat}`).join(';')
  const profile = mode === 'walking' ? 'foot' : 'driving'
  try {
    const r = await fetch(`https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson`)
    const d = await r.json()
    if (d.routes?.[0]) return d.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])
  } catch {}
  return pts.map(p => [p.lat, p.lng])
}

function ClickCapture({ active, onAdd }) {
  useMapEvents({ click: e => { if (active) onAdd(e.latlng) } })
  return null
}

function FlyTo({ coords }) {
  const map = useMap()
  useEffect(() => { if (coords) map.flyTo(coords, 14, { duration: 1 }) }, [coords])
  return null
}

// Hook para detectar orientación
function useOrientation() {
  const [landscape, setLandscape] = useState(window.innerWidth > window.innerHeight)
  useEffect(() => {
    const h = () => setLandscape(window.innerWidth > window.innerHeight)
    window.addEventListener('resize', h)
    window.addEventListener('orientationchange', h)
    return () => { window.removeEventListener('resize', h); window.removeEventListener('orientationchange', h) }
  }, [])
  return landscape
}

export default function MapView({ tripId }) {
  const [places,    setPlaces]    = useState([])
  const [addMode,   setAddMode]   = useState(false)
  const [newLL,     setNewLL]     = useState(null)
  const [editPlace, setEditPlace] = useState(null)
  const [form, setForm] = useState({ name: '', category: 'parada', day: '', notes: '' })
  const [mode,  setMode]  = useState('driving')
  const [route, setRoute] = useState([])
  const [flyTo, setFlyTo] = useState(null)
  const [myPos, setMyPos] = useState(null)
  const [search,    setSearch]    = useState('')
  const [results,   setResults]   = useState([])
  const [searching, setSearching] = useState(false)
  const [maptilerKey, setMaptilerKey] = useState(localStorage.getItem('maptiler_key') || '')
  const [keyInput, setKeyInput] = useState('')
  const timer = useRef(null)
  const isLandscape = useOrientation()
  // iPad: ventá ancha considérase tablet
  const isTablet = window.innerWidth >= 768

  const saveKey = () => { localStorage.setItem('maptiler_key', keyInput); setMaptilerKey(keyInput) }

  const load = useCallback(async () => {
    const { data } = await supabase.from('places').select('*').eq('trip_id', tripId).order('order_index')
    if (data) setPlaces(data)
  }, [tripId])

  useEffect(() => {
    load()
    const ch = supabase.channel(`places8-${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'places', filter: `trip_id=eq.${tripId}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  useEffect(() => {
    const ordered = [...places].filter(p => p.day).sort((a, b) => a.day > b.day ? 1 : -1)
    if (ordered.length >= 2) osrmRoute(ordered, mode).then(r => { if (r) setRoute(r) })
    else setRoute([])
  }, [places, mode])

  useEffect(() => {
    clearTimeout(timer.current)
    if (!search.trim()) { setResults([]); return }
    timer.current = setTimeout(async () => {
      setSearching(true)
      setResults(await nominatim(search))
      setSearching(false)
    }, 400)
    return () => clearTimeout(timer.current)
  }, [search])

  const pickResult = r => {
    const lat = parseFloat(r.lat), lng = parseFloat(r.lon)
    setFlyTo([lat, lng]); setNewLL({ lat, lng })
    setForm(f => ({ ...f, name: r.display_name.split(',')[0].trim() }))
    setSearch(''); setResults([]); setAddMode(true)
  }

  const locate = () => {
    navigator.geolocation.getCurrentPosition(
      p => { const c = [p.coords.latitude, p.coords.longitude]; setMyPos(c); setFlyTo(c) },
      () => alert('Non se puido obter a localización')
    )
  }

  const openGoogleMaps = (p) => {
    window.open(`https://maps.google.com/?q=${p.lat},${p.lng}`, '_blank')
  }

  const save = async e => {
    e.preventDefault()
    const payload = { name: form.name, category: form.category, day: form.day || null, notes: form.notes || null }
    if (editPlace?._new) {
      await supabase.from('places').insert({ trip_id: tripId, ...payload, lat: newLL.lat, lng: newLL.lng, order_index: places.length })
    } else {
      await supabase.from('places').update(payload).eq('id', editPlace.id)
    }
    setEditPlace(null); setNewLL(null); setAddMode(false)
    setForm({ name: '', category: 'parada', day: '', notes: '' })
  }

  const del = async id => {
    if (!confirm('Eliminar este lugar?')) return
    setPlaces(p => p.filter(x => x.id !== id))
    await supabase.from('places').delete().eq('id', id)
  }

  const openEdit = p => {
    setEditPlace(p)
    setForm({ name: p.name, category: p.category, day: p.day || '', notes: p.notes || '' })
  }

  const center = places.length ? [places[0].lat, places[0].lng] : [42.8782, -8.5448]

  const tileUrl = maptilerKey
    ? `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${maptilerKey}`
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
  const tileAtt = maptilerKey
    ? '&copy; <a href="https://www.maptiler.com">MapTiler</a> &copy; OpenStreetMap'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'

  // Altura do mapa: vertical en móbil portrait, máis grande en landscape/tablet
  const mapHeight = isTablet && isLandscape
    ? 'calc(100vh - 160px)'
    : isLandscape ? '60vh' : 'min(55vw + 40px, 420px)'

  return (
    <div className={`flex gap-3 ${isTablet && isLandscape ? 'flex-row' : 'flex-col'}`}>

      {/* Panel esquerdo (ferramentas + lista) */}
      <div className={isTablet && isLandscape ? 'w-72 shrink-0 flex flex-col gap-2' : 'flex flex-col gap-2'}>

        {!maptilerKey && (
          <div className="widget p-3">
            <p className="text-xs mb-2" style={{ color: 'var(--color-muted)' }}>
              💡 <a href="https://maptiler.com" target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>MapTiler gratuíto</a> para mellor calidade:
            </p>
            <div className="flex gap-2">
              <input className="vi text-sm flex-1" placeholder="API key..." value={keyInput} onChange={e => setKeyInput(e.target.value)} />
              <button onClick={saveKey} className="vb vb-p vb-sm">OK</button>
            </div>
          </div>
        )}

        {/* Busca */}
        <div className="widget p-3 flex flex-wrap gap-2 items-center">
          <div className="relative w-full">
            <input className="vi text-sm w-full" placeholder="🔍 Buscar lugar..."
              value={search} onChange={e => setSearch(e.target.value)} />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                   style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
            )}
            {results.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 widget z-50" style={{ maxHeight: 200, overflowY: 'auto' }}>
                {results.map((r, i) => (
                  <button key={i} onClick={() => pickResult(r)}
                    className="w-full text-left px-3 py-2.5 border-b last:border-0"
                    style={{ color: 'var(--color-text)', borderColor: 'var(--color-border)', fontSize: 14 }}>
                    <span className="font-medium">{r.display_name.split(',')[0]}</span>
                    <span className="block text-xs opacity-50 truncate">{r.display_name.split(',').slice(1, 3).join(',')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-1 w-full">
            {[{ id: 'driving', icon: '🚗', label: 'Coche' }, { id: 'walking', icon: '🚶', label: 'A pé' }].map(m => (
              <button key={m.id} onClick={() => setMode(m.id)} className="vb vb-sm flex-1"
                style={{ background: mode === m.id ? 'var(--color-accent)' : 'var(--color-bg)', color: mode === m.id ? '#fff' : 'var(--color-muted)' }}>
                {m.icon} {m.label}
              </button>
            ))}
            <button onClick={locate} className="vb vb-sm" style={{ background: 'var(--color-bg)', color: 'var(--color-accent)' }}>
              📍
            </button>
            <button onClick={() => { setAddMode(v => !v); setNewLL(null) }} className="vb vb-sm flex-1"
              style={{ background: addMode ? '#FF3B30' : 'var(--color-accent)', color: '#fff' }}>
              {addMode ? '✕' : '+ Lugar'}
            </button>
          </div>
        </div>

        {addMode && !newLL && (
          <p className="text-xs text-center py-1" style={{ color: 'var(--color-muted)' }}>
            Toca no mapa para engadir un lugar
          </p>
        )}

        {/* Lista de lugares — en landscape vai aquí */}
        {isTablet && isLandscape && places.length > 0 && (
          <div className="widget overflow-hidden flex-1" style={{ overflowY: 'auto' }}>
            {places.map(p => (
              <PlaceRow key={p.id} p={p} onEdit={() => openEdit(p)} onDelete={() => del(p.id)} onGmaps={() => openGoogleMaps(p)} />
            ))}
          </div>
        )}
      </div>

      {/* Mapa */}
      <div className="widget overflow-hidden flex-1" style={{ height: mapHeight }}>
        <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution={tileAtt} url={tileUrl} />
          <ClickCapture active={addMode} onAdd={ll => { setNewLL({ lat: ll.lat, lng: ll.lng }); setForm(f => ({ ...f, name: '' })) }} />
          {flyTo && <FlyTo coords={flyTo} />}
          {route.length > 1 && (
            <Polyline positions={route} pathOptions={{ color: 'var(--color-accent,#007AFF)', weight: 4, opacity: 0.8 }} />
          )}
          {myPos && (
            <Marker position={myPos} icon={myLocIcon}>
              <Popup><div style={{ padding: '8px 12px', fontSize: 14 }}>📍 A túa posición</div></Popup>
            </Marker>
          )}
          {places.map(p => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={makeIcon(p.category)}>
              <Popup>
                <div style={{ padding: '14px 16px', minWidth: 200, fontFamily: 'var(--font-body,Inter,sans-serif)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 22 }}>{cat(p.category).icon}</span>
                    <strong style={{ fontSize: 16, color: 'var(--color-text,#1c1c1e)', flex: 1 }}>{p.name}</strong>
                  </div>
                  <p style={{ fontSize: 12, color: cat(p.category).color, fontWeight: 600, margin: '0 0 4px' }}>{cat(p.category).label}</p>
                  {p.day && <p style={{ fontSize: 13, color: 'var(--color-muted,#8e8e93)', margin: '0 0 4px' }}>📅 {p.day}</p>}
                  {p.notes && <p style={{ fontSize: 14, margin: '4px 0 8px' }}>{p.notes}</p>}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                    <button onClick={() => openEdit(p)} style={{ fontSize: 13, color: 'var(--color-accent,#007AFF)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '4px 0' }}>✏️ Editar</button>
                    <button onClick={() => openGoogleMaps(p)} style={{ fontSize: 13, color: '#34C759', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '4px 0' }}>🗺 Google Maps</button>
                    <button onClick={() => del(p.id)} style={{ fontSize: 13, color: '#FF3B30', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '4px 0' }}>🗑 Eliminar</button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
          {newLL && (
            <Marker position={[newLL.lat, newLL.lng]} icon={makeIcon('parada', true)}>
              <Popup autoOpen>
                <div style={{ padding: '14px 16px', minWidth: 220, fontFamily: 'var(--font-body,Inter,sans-serif)' }}>
                  <PlaceForm form={form} setForm={setForm} onSubmit={save} onCancel={() => { setNewLL(null); setAddMode(false) }} />
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Lista en portrait */}
      {!(isTablet && isLandscape) && places.length > 0 && (
        <div className="widget overflow-hidden">
          {places.map(p => (
            <PlaceRow key={p.id} p={p} onEdit={() => openEdit(p)} onDelete={() => del(p.id)} onGmaps={() => openGoogleMaps(p)} />
          ))}
        </div>
      )}

      {/* Modal editar */}
      {editPlace && !editPlace._new && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4"
             style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
             onClick={() => setEditPlace(null)}>
          <div className="widget w-full max-w-sm p-5 scale-in" onClick={e => e.stopPropagation()}>
            <p className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Editar lugar</p>
            <PlaceForm form={form} setForm={setForm} onSubmit={save} onCancel={() => setEditPlace(null)} />
          </div>
        </div>
      )}
    </div>
  )
}

function PlaceRow({ p, onEdit, onDelete, onGmaps }) {
  const c = cat(p.category)
  return (
    <div className="flex items-center gap-3 px-4 py-3 group border-b last:border-0"
         style={{ borderColor: 'var(--color-border)' }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>{c.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate" style={{ fontSize: 15, color: 'var(--color-text)' }}>{p.name}</p>
        {p.day && <p className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>{p.day}</p>}
      </div>
      <div className="flex gap-2 shrink-0">
        <button onClick={onGmaps} className="vb-icon" style={{ width: 36, height: 36, fontSize: 18, background: 'var(--color-bg)' }}>🗺</button>
        <button onClick={onEdit}  className="vb-icon" style={{ width: 36, height: 36, fontSize: 18, background: 'var(--color-bg)' }}>✏️</button>
        <button onClick={onDelete} className="vb-icon" style={{ width: 36, height: 36, fontSize: 18, background: 'var(--color-bg)' }}>🗑</button>
      </div>
    </div>
  )
}

function PlaceForm({ form, setForm, onSubmit, onCancel }) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input autoFocus className="vi" placeholder="Nome do lugar"
        value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
      <div className="grid grid-cols-3 gap-1.5">
        {[{ id: 'aloxamento', icon: '🛏️' }, { id: 'actividade', icon: '🎯' }, { id: 'restaurante', icon: '🍽️' },
          { id: 'parada', icon: '📍' }, { id: 'vista', icon: '🏔️' }, { id: 'outro', icon: '✨' }].map(c => (
          <button key={c.id} type="button" onClick={() => setForm({ ...form, category: c.id })}
            className="py-2.5 text-2xl transition-all"
            style={{ borderRadius: 'calc(var(--radius)*0.5)', background: form.category === c.id ? 'var(--color-accent)' : 'var(--color-bg)', transform: form.category === c.id ? 'scale(1.12)' : 'scale(1)' }}>
            {c.icon}
          </button>
        ))}
      </div>
      <input type="date" className="vi" value={form.day} onChange={e => setForm({ ...form, day: e.target.value })} />
      <textarea className="vi" placeholder="Notas" rows={2} value={form.notes}
        onChange={e => setForm({ ...form, notes: e.target.value })} style={{ resize: 'none' }} />
      <div className="flex gap-2">
        <button type="submit" className="vb vb-p flex-1">Gardar</button>
        <button type="button" onClick={onCancel} className="vb vb-s">Cancelar</button>
      </div>
    </form>
  )
}
