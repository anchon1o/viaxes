import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '../lib/supabase'

// Icona personalizada tipo "pin de selo de viaxe"
const makeIcon = (color) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:30px;height:30px;border-radius:50% 50% 50% 0;
      background:${color};transform:rotate(-45deg);
      border:2px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;">
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
  })

const CATEGORY_COLOR = {
  aloxamento: '#C89B3C',
  actividade: '#3E7C59',
  parada: '#007bc4',
  restaurante: '#E1572C',
  outro: '#16324F',
}

const CATEGORY_LABEL = {
  aloxamento: '🛏️ Aloxamento',
  actividade: '🎯 Actividade',
  parada: '📍 Parada',
  restaurante: '🍽️ Restaurante',
  outro: '✨ Outro',
}

function ClickToAdd({ onAdd, addMode }) {
  useMapEvents({
    click(e) {
      if (addMode) onAdd(e.latlng)
    },
  })
  return null
}

export default function MapView({ tripId }) {
  const [places, setPlaces] = useState([])
  const [addMode, setAddMode] = useState(false)
  const [newPlace, setNewPlace] = useState(null) // { lat, lng }
  const [form, setForm] = useState({ name: '', category: 'parada', day: '', notes: '' })
  const mapRef = useRef(null)

  const load = async () => {
    const { data } = await supabase
      .from('places')
      .select('*')
      .eq('trip_id', tripId)
      .order('order_index', { ascending: true })
    if (data) setPlaces(data)
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`places-${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'places', filter: `trip_id=eq.${tripId}` }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [tripId])

  const handleMapClick = (latlng) => {
    setNewPlace(latlng)
    setForm({ name: '', category: 'parada', day: '', notes: '' })
  }

  const saveNewPlace = async (e) => {
    e.preventDefault()
    await supabase.from('places').insert({
      trip_id: tripId,
      name: form.name,
      category: form.category,
      lat: newPlace.lat,
      lng: newPlace.lng,
      day: form.day || null,
      notes: form.notes || null,
      order_index: places.length,
    })
    setNewPlace(null)
    setAddMode(false)
  }

  const deletePlace = async (id) => {
    await supabase.from('places').delete().eq('id', id)
  }

  const center = places.length
    ? [places[0].lat, places[0].lng]
    : [42.8782, -8.5448] // A Coruña por defecto

  const routeCoords = places
    .filter((p) => p.day)
    .sort((a, b) => (a.day > b.day ? 1 : -1))
    .map((p) => [p.lat, p.lng])

  return (
    <div className="relative">
      <div className="rounded-2xl overflow-hidden border border-ink/10 shadow-stamp" style={{ height: '60vh' }}>
        <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }} ref={mapRef}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToAdd onAdd={handleMapClick} addMode={addMode} />

          {routeCoords.length > 1 && (
            <Polyline positions={routeCoords} pathOptions={{ color: '#3E7C59', weight: 3, className: 'route-dash' }} />
          )}

          {places.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={makeIcon(CATEGORY_COLOR[p.category] || '#16324F')}>
              <Popup>
                <div className="min-w-[180px]">
                  <p className="font-semibold text-ink">{p.name}</p>
                  <p className="text-xs text-charcoal/60">{CATEGORY_LABEL[p.category]}</p>
                  {p.day && <p className="text-xs font-mono mt-1">{p.day} {p.time || ''}</p>}
                  {p.notes && <p className="text-sm mt-1">{p.notes}</p>}
                  <button
                    onClick={() => deletePlace(p.id)}
                    className="text-xs text-coral mt-2 hover:underline"
                  >
                    Eliminar
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {newPlace && (
            <Marker position={[newPlace.lat, newPlace.lng]} icon={makeIcon('#E1572C')}>
              <Popup autoOpen>
                <form onSubmit={saveNewPlace} className="space-y-2 min-w-[200px]">
                  <input
                    autoFocus
                    placeholder="Nome do lugar"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border rounded px-2 py-1 text-sm"
                    required
                  />
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full border rounded px-2 py-1 text-sm"
                  >
                    {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={form.day}
                    onChange={(e) => setForm({ ...form, day: e.target.value })}
                    className="w-full border rounded px-2 py-1 text-sm font-mono"
                  />
                  <textarea
                    placeholder="Notas"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full border rounded px-2 py-1 text-sm"
                    rows={2}
                  />
                  <button type="submit" className="w-full bg-brand text-white rounded py-1 text-sm">
                    Gardar
                  </button>
                </form>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <button
        onClick={() => setAddMode((v) => !v)}
        className={`absolute bottom-4 right-4 z-[1000] px-4 py-2 rounded-full shadow-stamp font-medium text-sm transition-colors ${
          addMode ? 'bg-coral text-white' : 'bg-white text-ink'
        }`}
      >
        {addMode ? '✕ Cancelar' : '+ Engadir lugar'}
      </button>
    </div>
  )
}
