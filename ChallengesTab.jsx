import { useEffect, useRef, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '../lib/supabase'

// ── Categorías ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'aloxamento', label: 'Aloxamento', icon: '🛏️', color: '#007AFF' },
  { id: 'actividade',  label: 'Actividade',  icon: '🎯', color: '#34C759' },
  { id: 'restaurante', label: 'Restaurante', icon: '🍽️', color: '#FF9500' },
  { id: 'parada',      label: 'Parada',      icon: '📍', color: '#FF2D55' },
  { id: 'vista',       label: 'Vista',       icon: '🏔️', color: '#AF52DE' },
  { id: 'outro',       label: 'Outro',       icon: '✨', color: '#8e8e93' },
]
const catInfo = id => CATEGORIES.find(c => c.id === id) || CATEGORIES[5]

// ── Icona personalizada ──────────────────────────────────────────────────────
const makeIcon = (cat, size = 32) => {
  const info = catInfo(cat)
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${info.color};
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:2.5px solid white;
      box-shadow:0 3px 10px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
    "><span style="transform:rotate(45deg);font-size:${size * 0.45}px;line-height:1">${info.icon}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size - 4],
  })
}

// ── Busca Nominatim ──────────────────────────────────────────────────────────
async function nominatimSearch(q) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=gl,es`,
      { headers: { 'User-Agent': 'Viaxes App' } }
    )
    return await r.json()
  } catch { return [] }
}

// ── Ruta OSRM (real, por estrada ou a pé) ───────────────────────────────────
async function getOSRMRoute(points, mode = 'driving') {
  if (points.length < 2) return null
  const coords = points.map(p => `${p.lng},${p.lat}`).join(';')
  const profile = mode === 'walking' ? 'foot' : 'driving'
  try {
    const r = await fetch(
      `https://router.project-osrm.org/route/v1/${profile}/${coords}?overview=full&geometries=geojson`
    )
    const d = await r.json()
    if (d.routes?.[0]) {
      return d.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])
    }
  } catch {}
  return points.map(p => [p.lat, p.lng])
}

// ── Subcompoñente: captura clics no mapa ────────────────────────────────────
function ClickCapture({ active, onAdd }) {
  useMapEvents({ click: e => { if (active) onAdd(e.latlng) } })
  return null
}

// ── Subcompoñente: voa a coordenadas ────────────────────────────────────────
function FlyTo({ coords, zoom = 15 }) {
  const map = useMap()
  useEffect(() => {
    if (coords) map.flyTo(coords, zoom, { duration: 1.0 })
  }, [coords])
  return null
}

// ── Marcador de posición actual ──────────────────────────────────────────────
const myLocationIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:16px;height:16px;
    background:#007AFF;
    border-radius:50%;
    border:3px solid white;
    box-shadow:0 0 0 4px rgba(0,122,255,0.25), 0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

// ── Componente principal ─────────────────────────────────────────────────────
export default function MapView({ tripId }) {
  const [places,    setPlaces]    = useState([])
  const [addMode,   setAddMode]   = useState(false)
  const [newLatLng, setNewLatLng] = useState(null)
  const [editPlace, setEditPlace] = useState(null)
  const [form, setForm] = useState({ name:'', category:'parada', day:'', notes:'' })
  const [routeMode,   setRouteMode]   = useState('driving')
  const [routeCoords, setRouteCoords] = useState([])
  const [flyTo,  setFlyTo]  = useState(null)
  const [myPos,  setMyPos]  = useState(null)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [apiKey, setApiKey] = useState(
    import.meta.env.VITE_MAPTILER_KEY || localStorage.getItem('maptiler_key') || ''
  )
  const [keyInput, setKeyInput] = useState('')
  const searchTimer = useRef(null)

  // ── Gardar API key ──────────────────────────────────────────────────────────
  const saveKey = () => {
    localStorage.setItem('maptiler_key', keyInput)
    setApiKey(keyInput)
  }

  // ── Cargar lugares ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    const { data } = await supabase.from('places').select('*')
      .eq('trip_id', tripId).order('order_index')
    if (data) setPlaces(data)
  }, [tripId])

  useEffect(() => {
    load()
    const ch = supabase.channel(`places-v6-${tripId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'places',
        filter: `trip_id=eq.${tripId}`
      }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  // ── Recalcular ruta cando cambian os lugares ou o modo ─────────────────────
  useEffect(() => {
    const ordered = [...places]
      .filter(p => p.day)
      .sort((a, b) => a.day > b.day ? 1 : -1)
    if (ordered.length >= 2) {
      getOSRMRoute(ordered, routeMode).then(r => { if (r) setRouteCoords(r) })
    } else {
      setRouteCoords([])
    }
  }, [places, routeMode])

  // ── Busca con debounce ─────────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(searchTimer.current)
    if (!search.trim()) { setSearchResults([]); return }
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      const res = await nominatimSearch(search)
      setSearchResults(res)
      setSearching(false)
    }, 400)
    return () => clearTimeout(searchTimer.current)
  }, [search])

  const pickResult = (r) => {
    const lat = parseFloat(r.lat), lng = parseFloat(r.lon)
    setFlyTo([lat, lng])
    setNewLatLng({ lat, lng })
    setForm(f => ({ ...f, name: r.display_name.split(',')[0].trim() }))
    setSearch(''); setSearchResults([])
    setAddMode(true)
  }

  const showMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      p => {
        const coords = [p.coords.latitude, p.coords.longitude]
        setMyPos(coords)
        setFlyTo(coords)
      },
      () => alert('Non se puido obter a localización')
    )
  }

  const savePlace = async (e) => {
    e.preventDefault()
    const payload = {
      name: form.name, category: form.category,
      day: form.day || null, notes: form.notes || null,
    }
    if (editPlace?._new) {
      await supabase.from('places').insert({
        trip_id: tripId, ...payload,
        lat: newLatLng.lat, lng: newLatLng.lng,
        order_index: places.length,
      })
    } else {
      await supabase.from('places').update(payload).eq('id', editPlace.id)
    }
    setEditPlace(null); setNewLatLng(null); setAddMode(false)
    setForm({ name:'', category:'parada', day:'', notes:'' })
  }

  const deletePlace = async (id) => {
    if (!confirm('Eliminar este lugar?')) return
    setPlaces(prev => prev.filter(p => p.id !== id))
    await supabase.from('places').delete().eq('id', id)
  }

  const openEdit = (p) => {
    setEditPlace(p)
    setForm({ name: p.name, category: p.category, day: p.day || '', notes: p.notes || '' })
  }

  const center = places.length
    ? [places[0].lat, places[0].lng]
    : [42.8782, -8.5448]

  // Tiles URL segundo se hai API key de MapTiler ou non
  const tileUrl = apiKey
    ? `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${apiKey}`
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
  const tileAtt = apiKey
    ? '&copy; <a href="https://www.maptiler.com">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com">CARTO</a>'

  return (
    <div className="flex flex-col gap-3">

      {/* Banner opcional para configurar MapTiler */}
      {!apiKey && (
        <div className="widget p-3 flex flex-wrap gap-2 items-center">
          <p className="text-xs flex-1" style={{ color: 'var(--color-muted)' }}>
            Mapa básico activo. Para mellor calidade, engade a túa API key de
            <a href="https://maptiler.com" target="_blank" rel="noreferrer"
               className="font-semibold ml-1" style={{ color: 'var(--color-accent)' }}>MapTiler</a>
            &nbsp;(gratuíto, sen tarxeta):
          </p>
          <input className="v-input text-xs" style={{ width: 180 }} placeholder="API key de MapTiler"
            value={keyInput} onChange={e => setKeyInput(e.target.value)} />
          <button onClick={saveKey} className="v-btn v-btn-primary v-btn-sm">Gardar</button>
        </div>
      )}

      {/* Barra de ferramentas */}
      <div className="widget p-3 flex flex-wrap gap-2 items-center">
        {/* Busca */}
        <div className="relative flex-1" style={{ minWidth: 160 }}>
          <input className="v-input text-sm w-full" placeholder="🔍 Buscar lugar..."
            value={search} onChange={e => setSearch(e.target.value)} />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                 style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
          )}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 widget z-50 overflow-hidden"
                 style={{ maxHeight: 220, overflowY: 'auto' }}>
              {searchResults.map((r, i) => (
                <button key={i} onClick={() => pickResult(r)}
                  className="w-full text-left px-3 py-2.5 text-sm border-b last:border-0"
                  style={{ color: 'var(--color-text)', borderColor: 'var(--color-border)' }}>
                  <span className="font-medium">{r.display_name.split(',')[0]}</span>
                  <span className="block text-xs opacity-50 truncate">
                    {r.display_name.split(',').slice(1, 3).join(',')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Modo ruta */}
        <div className="flex gap-1">
          {[{ id:'driving', icon:'🚗' }, { id:'walking', icon:'🚶' }].map(m => (
            <button key={m.id} onClick={() => setRouteMode(m.id)}
              className="v-btn v-btn-sm"
              style={{
                background: routeMode === m.id ? 'var(--color-accent)' : 'var(--color-bg)',
                color: routeMode === m.id ? '#fff' : 'var(--color-muted)'
              }}>
              {m.icon}
            </button>
          ))}
        </div>

        {/* Ubicación */}
        <button onClick={showMyLocation}
          className="v-btn v-btn-sm"
          style={{ background: 'var(--color-bg)', color: 'var(--color-accent)' }}>
          📍 Eu
        </button>

        {/* Engadir lugar */}
        <button onClick={() => { setAddMode(v => !v); setNewLatLng(null) }}
          className="v-btn v-btn-sm"
          style={{ background: addMode ? '#FF3B30' : 'var(--color-accent)', color: '#fff' }}>
          {addMode ? '✕ Cancelar' : '+ Lugar'}
        </button>
      </div>

      {addMode && !newLatLng && (
        <p className="text-xs text-center fade-up" style={{ color: 'var(--color-muted)' }}>
          Toca no mapa ou busca un lugar arriba para marcalo
        </p>
      )}

      {/* Mapa */}
      <div className="widget overflow-hidden" style={{ height: '52vh' }}>
        <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution={tileAtt} url={tileUrl} />
          <ClickCapture active={addMode} onAdd={ll => {
            setNewLatLng({ lat: ll.lat, lng: ll.lng })
            setForm(f => ({ ...f, name: '' }))
          }} />
          {flyTo && <FlyTo coords={flyTo} />}

          {/* Ruta real */}
          {routeCoords.length > 1 && (
            <Polyline positions={routeCoords}
              pathOptions={{ color: 'var(--color-accent,#007AFF)', weight: 4, opacity: 0.75 }} />
          )}

          {/* Posición actual */}
          {myPos && (
            <Marker position={myPos} icon={myLocationIcon}>
              <Popup>
                <div style={{ padding: '8px 12px', fontFamily: 'inherit', fontSize: 13 }}>
                  <strong>A túa posición</strong>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Lugares gardados */}
          {places.map(p => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={makeIcon(p.category)}>
              <Popup>
                <div style={{ padding: '12px 14px', minWidth: 190, fontFamily: 'var(--font-body,Inter,sans-serif)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:18 }}>{catInfo(p.category).icon}</span>
                    <strong style={{ fontSize:15, color:'var(--color-text,#1c1c1e)' }}>{p.name}</strong>
                  </div>
                  <p style={{ fontSize:11, color:catInfo(p.category).color, fontWeight:600, margin:'0 0 4px' }}>
                    {catInfo(p.category).label}
                  </p>
                  {p.day && <p style={{ fontSize:12, color:'var(--color-muted,#8e8e93)', margin:'0 0 4px' }}>📅 {p.day}</p>}
                  {p.notes && <p style={{ fontSize:13, margin:'4px 0' }}>{p.notes}</p>}
                  <div style={{ display:'flex', gap:12, marginTop:10 }}>
                    <button onClick={() => openEdit(p)}
                      style={{ fontSize:13, color:'var(--color-accent,#007AFF)', background:'none', border:'none', cursor:'pointer', fontWeight:600, padding:0 }}>
                      Editar
                    </button>
                    <button onClick={() => deletePlace(p.id)}
                      style={{ fontSize:13, color:'#FF3B30', background:'none', border:'none', cursor:'pointer', fontWeight:600, padding:0 }}>
                      Eliminar
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Novo marcador */}
          {newLatLng && (
            <Marker position={[newLatLng.lat, newLatLng.lng]} icon={makeIcon('parada', 38)}>
              <Popup autoOpen>
                <div style={{ padding:'12px 14px', minWidth:210, fontFamily:'var(--font-body,Inter,sans-serif)' }}>
                  <PlaceForm form={form} setForm={setForm} onSubmit={savePlace}
                    onCancel={() => { setNewLatLng(null); setAddMode(false) }} />
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Lista de lugares */}
      {places.length > 0 && (
        <div className="widget overflow-hidden">
          {places.map(p => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3 group border-b last:border-0"
                 style={{ borderColor: 'var(--color-border)' }}>
              <span className="text-lg shrink-0">{catInfo(p.category).icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{p.name}</p>
                {p.day && <p className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>{p.day}</p>}
              </div>
              <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={() => openEdit(p)}
                  className="text-xs font-semibold" style={{ color: 'var(--color-accent)' }}>Editar</button>
                <button onClick={() => deletePlace(p.id)}
                  className="text-xs" style={{ color: '#FF3B30' }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal editar */}
      {editPlace && !editPlace._new && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4"
             style={{ background:'rgba(0,0,0,0.4)', backdropFilter:'blur(4px)' }}
             onClick={() => setEditPlace(null)}>
          <div className="widget w-full max-w-sm p-5 scale-in" onClick={e => e.stopPropagation()}>
            <p className="font-semibold mb-3" style={{ color:'var(--color-text)' }}>Editar lugar</p>
            <PlaceForm form={form} setForm={setForm} onSubmit={savePlace}
              onCancel={() => setEditPlace(null)} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Formulario reutilizable ──────────────────────────────────────────────────
function PlaceForm({ form, setForm, onSubmit, onCancel }) {
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <input autoFocus className="v-input text-sm" placeholder="Nome do lugar"
        value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
      <div className="grid grid-cols-3 gap-1">
        {[
          {id:'aloxamento',icon:'🛏️'},{id:'actividade',icon:'🎯'},
          {id:'restaurante',icon:'🍽️'},{id:'parada',icon:'📍'},
          {id:'vista',icon:'🏔️'},{id:'outro',icon:'✨'},
        ].map(c => (
          <button key={c.id} type="button" onClick={() => setForm({...form, category:c.id})}
            className="py-2 rounded-xl text-xl transition-all"
            style={{
              background: form.category === c.id
                ? catInfo(c.id).color
                : 'var(--color-bg)',
              transform: form.category === c.id ? 'scale(1.1)' : 'scale(1)',
            }}>
            {c.icon}
          </button>
        ))}
      </div>
      <input type="date" className="v-input text-sm font-mono"
        value={form.day} onChange={e => setForm({...form, day:e.target.value})} />
      <textarea className="v-input text-sm" placeholder="Notas" rows={2}
        value={form.notes} onChange={e => setForm({...form, notes:e.target.value})}
        style={{ resize:'none' }} />
      <div className="flex gap-2">
        <button type="submit" className="v-btn v-btn-primary flex-1">Gardar</button>
        <button type="button" onClick={onCancel} className="v-btn v-btn-secondary">Cancelar</button>
      </div>
    </form>
  )
}
