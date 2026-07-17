import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '../lib/supabase'

// ─── Tiles bonitos (CartoDB Positron - claro e precioso) ──────────────────────
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
const TILE_ATT = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com">CARTO</a>'

const CATEGORIES = [
  { id: 'aloxamento', label: 'Aloxamento', icon: '🛏️', color: '#007AFF' },
  { id: 'actividade',  label: 'Actividade',  icon: '🎯', color: '#34C759' },
  { id: 'restaurante', label: 'Restaurante', icon: '🍽️', color: '#FF9500' },
  { id: 'parada',      label: 'Parada',      icon: '📍', color: '#FF2D55' },
  { id: 'vista',       label: 'Vista',       icon: '🏔️', color: '#AF52DE' },
  { id: 'outro',       label: 'Outro',       icon: '✨', color: '#8e8e93' },
]

const catInfo = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[5]

const makeIcon = (cat, active = false) => {
  const info = catInfo(cat)
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${active ? 38 : 32}px;
      height:${active ? 38 : 32}px;
      background:${info.color};
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:2.5px solid white;
      box-shadow:0 3px 10px rgba(0,0,0,0.25);
      display:flex;align-items:center;justify-content:center;
      transition:all 0.2s;
    "><span style="transform:rotate(45deg);font-size:${active ? 16 : 14}px">${info.icon}</span></div>`,
    iconSize: [active ? 38 : 32, active ? 38 : 32],
    iconAnchor: [active ? 19 : 16, active ? 38 : 32],
    popupAnchor: [0, -36],
  })
}

// OSRM routing (gratuíto, sen límites razoables)
async function getRoute(coords, mode = 'car') {
  const profile = mode === 'car' ? 'driving' : 'foot'
  const path = coords.map(c => `${c.lng},${c.lat}`).join(';')
  const url = `https://router.project-osrm.org/route/v1/${profile}/${path}?overview=full&geometries=geojson`
  try {
    const r = await fetch(url)
    const d = await r.json()
    if (d.routes?.[0]) return d.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])
  } catch {}
  return null
}

// Nominatim busca de lugares
async function searchPlaces(q) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=gl,es`
  try {
    const r = await fetch(url, { headers: { 'Accept-Language': 'gl,es' } })
    return await r.json()
  } catch { return [] }
}

function FlyTo({ coords }) {
  const map = useMap()
  useEffect(() => { if (coords) map.flyTo(coords, 15, { duration: 1.2 }) }, [coords])
  return null
}

function ClickCapture({ active, onAdd }) {
  useMapEvents({ click: e => { if (active) onAdd(e.latlng) } })
  return null
}

export default function MapView({ tripId }) {
  const [places, setPlaces]       = useState([])
  const [addMode, setAddMode]     = useState(false)
  const [newLatLng, setNewLatLng] = useState(null)
  const [editPlace, setEditPlace] = useState(null)
  const [form, setForm]           = useState({ name: '', category: 'parada', day: '', notes: '' })
  const [routeMode, setRouteMode] = useState('car') // car | foot
  const [routeCoords, setRouteCoords] = useState([])
  const [flyTo, setFlyTo]         = useState(null)
  const [search, setSearch]       = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const searchRef = useRef(null)

  const load = async () => {
    const { data } = await supabase.from('places').select('*').eq('trip_id', tripId).order('order_index')
    if (data) { setPlaces(data); recalcRoute(data, routeMode) }
  }

  const recalcRoute = async (pts, mode) => {
    const ordered = [...pts].filter(p => p.day).sort((a, b) => a.day > b.day ? 1 : -1)
    if (ordered.length < 2) { setRouteCoords([]); return }
    const route = await getRoute(ordered, mode)
    if (route) setRouteCoords(route)
    else setRouteCoords(ordered.map(p => [p.lat, p.lng]))
  }

  useEffect(() => {
    load()
    const ch = supabase.channel(`places-${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'places', filter: `trip_id=eq.${tripId}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [tripId])

  useEffect(() => { recalcRoute(places, routeMode) }, [routeMode])

  // Busca con debounce
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      const results = await searchPlaces(search)
      setSearchResults(results)
      setSearching(false)
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  const savePlace = async (e) => {
    e.preventDefault()
    if (editPlace) {
      await supabase.from('places').update({ name: form.name, category: form.category, day: form.day || null, notes: form.notes || null }).eq('id', editPlace.id)
      setEditPlace(null)
    } else {
      await supabase.from('places').insert({ trip_id: tripId, name: form.name, category: form.category, lat: newLatLng.lat, lng: newLatLng.lng, day: form.day || null, notes: form.notes || null, order_index: places.length })
      setNewLatLng(null); setAddMode(false)
    }
    setForm({ name: '', category: 'parada', day: '', notes: '' })
  }

  const deletePlace = async (id) => {
    if (!confirm('Eliminar este lugar?')) return
    await supabase.from('places').delete().eq('id', id)
  }

  const pickSearchResult = (r) => {
    const lat = parseFloat(r.lat), lng = parseFloat(r.lon)
    setFlyTo([lat, lng])
    setNewLatLng({ lat, lng })
    setForm(f => ({ ...f, name: r.display_name.split(',')[0] }))
    setSearch(''); setSearchResults([])
    setAddMode(true)
  }

  const center = places.length ? [places[0].lat, places[0].lng] : [42.8782, -8.5448]

  return (
    <div className="flex flex-col gap-3">

      {/* Barra de ferramentas */}
      <div className="widget p-3 flex flex-wrap gap-2 items-center">
        {/* Busca */}
        <div className="relative flex-1 min-w-[180px]" ref={searchRef}>
          <input
            className="v-input text-sm pr-8"
            placeholder="🔍 Buscar lugar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
          )}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 widget z-50 overflow-hidden">
              {searchResults.map((r, i) => (
                <button key={i} onClick={() => pickSearchResult(r)}
                  className="w-full text-left px-3 py-2.5 text-sm hover:opacity-80 transition-opacity border-b last:border-0"
                  style={{ color: 'var(--color-text)', borderColor: 'var(--color-border)' }}>
                  <span className="font-medium">{r.display_name.split(',')[0]}</span>
                  <span className="text-xs block opacity-50">{r.display_name.split(',').slice(1,3).join(',')}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Modo ruta */}
        <div className="flex gap-1">
          {[{ id: 'car', icon: '🚗' }, { id: 'foot', icon: '🚶' }].map(m => (
            <button key={m.id} onClick={() => setRouteMode(m.id)}
              className="v-btn v-btn-sm"
              style={{ background: routeMode === m.id ? 'var(--color-accent)' : 'var(--color-bg)', color: routeMode === m.id ? '#fff' : 'var(--color-muted)' }}>
              {m.icon}
            </button>
          ))}
        </div>

        {/* Engadir lugar */}
        <button onClick={() => { setAddMode(v => !v); setNewLatLng(null) }}
          className="v-btn v-btn-sm"
          style={{ background: addMode ? '#FF3B30' : 'var(--color-accent)', color: '#fff' }}>
          {addMode ? '✕ Cancelar' : '+ Lugar'}
        </button>
      </div>

      {addMode && (
        <p className="text-xs text-center" style={{ color: 'var(--color-muted)' }}>
          Toca no mapa para marcar un lugar
        </p>
      )}

      {/* Mapa */}
      <div className="widget overflow-hidden" style={{ height: '52vh' }}>
        <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution={TILE_ATT} url={TILE_URL} />
          <ClickCapture active={addMode} onAdd={ll => { setNewLatLng(ll); setForm(f => ({ ...f, name: '' })) }} />
          {flyTo && <FlyTo coords={flyTo} />}

          {/* Ruta real */}
          {routeCoords.length > 1 && (
            <Polyline positions={routeCoords} pathOptions={{ color: 'var(--color-accent)', weight: 3, opacity: 0.7 }} />
          )}

          {/* Marcadores */}
          {places.map(p => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={makeIcon(p.category)}>
              <Popup>
                <div style={{ padding: 14, minWidth: 200, fontFamily: 'var(--font-body)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span>{catInfo(p.category).icon}</span>
                    <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text)' }}>{p.name}</span>
                  </div>
                  <span style={{ fontSize: 11, color: catInfo(p.category).color, fontWeight: 600 }}>
                    {catInfo(p.category).label}
                  </span>
                  {p.day && <p style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4 }}>📅 {p.day}</p>}
                  {p.notes && <p style={{ fontSize: 13, color: 'var(--color-text)', marginTop: 6 }}>{p.notes}</p>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button onClick={() => { setEditPlace(p); setForm({ name: p.name, category: p.category, day: p.day || '', notes: p.notes || '' }) }}
                      style={{ fontSize: 12, color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontWeight: 600 }}>
                      Editar
                    </button>
                    <button onClick={() => deletePlace(p.id)}
                      style={{ fontSize: 12, color: '#FF3B30', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontWeight: 600 }}>
                      Eliminar
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Marcador novo */}
          {newLatLng && (
            <Marker position={[newLatLng.lat, newLatLng.lng]} icon={makeIcon('parada', true)}>
              <Popup autoOpen>
                <div style={{ padding: 14, minWidth: 220, fontFamily: 'var(--font-body)' }}>
                  <PlaceForm form={form} setForm={setForm} onSubmit={savePlace} onCancel={() => { setNewLatLng(null); setAddMode(false) }} />
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Lista de lugares */}
      {places.length > 0 && (
        <div className="widget divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {places.map(p => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3 group">
              <div className="flex items-center gap-3">
                <span>{catInfo(p.category).icon}</span>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{p.name}</p>
                  {p.day && <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{p.day}</p>}
                </div>
              </div>
              <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditPlace(p); setForm({ name: p.name, category: p.category, day: p.day || '', notes: p.notes || '' }) }}
                  className="text-xs font-semibold" style={{ color: 'var(--color-accent)' }}>Editar</button>
                <button onClick={() => deletePlace(p.id)}
                  className="text-xs font-semibold" style={{ color: '#FF3B30' }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal editar */}
      {editPlace && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4"
             style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
             onClick={() => setEditPlace(null)}>
          <div className="widget w-full max-w-sm p-5 scale-in" onClick={e => e.stopPropagation()}>
            <p className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Editar lugar</p>
            <PlaceForm form={form} setForm={setForm} onSubmit={savePlace} onCancel={() => setEditPlace(null)} />
          </div>
        </div>
      )}
    </div>
  )
}

function PlaceForm({ form, setForm, onSubmit, onCancel }) {
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <input autoFocus className="v-input text-sm" placeholder="Nome do lugar" value={form.name}
        onChange={e => setForm({ ...form, name: e.target.value })} required />
      <div className="grid grid-cols-3 gap-1">
        {[
          { id: 'aloxamento', icon: '🛏️' }, { id: 'actividade', icon: '🎯' },
          { id: 'restaurante', icon: '🍽️' }, { id: 'parada', icon: '📍' },
          { id: 'vista', icon: '🏔️' }, { id: 'outro', icon: '✨' },
        ].map(c => (
          <button key={c.id} type="button" onClick={() => setForm({ ...form, category: c.id })}
            className="py-2 rounded-xl text-lg transition-all"
            style={{ background: form.category === c.id ? 'var(--color-accent)' : 'var(--color-bg)', transform: form.category === c.id ? 'scale(1.1)' : 'scale(1)' }}>
            {c.icon}
          </button>
        ))}
      </div>
      <input type="date" className="v-input text-sm" value={form.day}
        onChange={e => setForm({ ...form, day: e.target.value })} />
      <textarea className="v-input text-sm" placeholder="Notas" rows={2} value={form.notes}
        onChange={e => setForm({ ...form, notes: e.target.value })} style={{ resize: 'none' }} />
      <div className="flex gap-2">
        <button type="submit" className="v-btn v-btn-primary flex-1">Gardar</button>
        <button type="button" onClick={onCancel} className="v-btn v-btn-secondary">Cancelar</button>
      </div>
    </form>
  )
}
