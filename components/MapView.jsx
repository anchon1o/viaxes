import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '../lib/supabase'

const CATEGORIES = [
  { id: 'aloxamento', label: 'Aloxamento', color: '#0a0a0a' },
  { id: 'actividade',  label: 'Actividade',  color: '#2563eb' },
  { id: 'parada',      label: 'Parada',      color: '#737373' },
  { id: 'restaurante', label: 'Restaurante', color: '#ef4444' },
  { id: 'outro',       label: 'Outro',       color: '#a3a3a3' },
]

const makeIcon = (color) => L.divIcon({
  className: '',
  html: `<div style="
    width:12px;height:12px;
    background:${color};
    border-radius:50%;
    border:2px solid white;
    box-shadow:0 1px 4px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  popupAnchor: [0, -10],
})

function ClickCapture({ addMode, onAdd }) {
  useMapEvents({ click: (e) => { if (addMode) onAdd(e.latlng) } })
  return null
}

export default function MapView({ tripId }) {
  const [places, setPlaces]   = useState([])
  const [addMode, setAddMode] = useState(false)
  const [newPlace, setNewPlace] = useState(null)
  const [editPlace, setEditPlace] = useState(null) // para editar
  const [form, setForm] = useState({ name: '', category: 'parada', day: '', notes: '' })

  const load = async () => {
    const { data } = await supabase.from('places').select('*').eq('trip_id', tripId).order('order_index')
    if (data) setPlaces(data)
  }

  useEffect(() => {
    load()
    const ch = supabase.channel(`places-${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'places', filter: `trip_id=eq.${tripId}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [tripId])

  const openNew = (latlng) => {
    setNewPlace(latlng)
    setForm({ name: '', category: 'parada', day: '', notes: '' })
  }

  const saveNew = async (e) => {
    e.preventDefault()
    await supabase.from('places').insert({
      trip_id: tripId, name: form.name, category: form.category,
      lat: newPlace.lat, lng: newPlace.lng,
      day: form.day || null, notes: form.notes || null,
      order_index: places.length,
    })
    setNewPlace(null); setAddMode(false)
  }

  const openEdit = (place) => {
    setEditPlace(place)
    setForm({ name: place.name, category: place.category, day: place.day || '', notes: place.notes || '' })
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    await supabase.from('places').update({
      name: form.name, category: form.category,
      day: form.day || null, notes: form.notes || null,
    }).eq('id', editPlace.id)
    setEditPlace(null)
  }

  const deletePlace = async (id) => {
    if (!confirm('Eliminar este lugar?')) return
    await supabase.from('places').delete().eq('id', id)
  }

  const center = places.length ? [places[0].lat, places[0].lng] : [42.8782, -8.5448]
  const routeCoords = [...places].sort((a, b) => (a.day > b.day ? 1 : -1)).filter(p => p.day).map(p => [p.lat, p.lng])

  const catColor = (id) => CATEGORIES.find(c => c.id === id)?.color || '#737373'

  return (
    <div>
      {/* Controles */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => { setAddMode(v => !v); setNewPlace(null) }}
          className={addMode ? 'btn-primary text-sm' : 'btn-ghost text-sm'}
        >
          {addMode ? '✕ Cancelar' : '+ Engadir lugar'}
        </button>
        {addMode && <span className="text-xs text-mid">Toca no mapa para engadir un lugar</span>}
      </div>

      {/* Mapa */}
      <div className="rounded-xl overflow-hidden border border-line" style={{ height: '55vh' }}>
        <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickCapture addMode={addMode} onAdd={openNew} />

          {routeCoords.length > 1 && (
            <Polyline positions={routeCoords} pathOptions={{ color: '#2563eb', weight: 2, opacity: 0.5, dashArray: '6 6' }} />
          )}

          {places.map(p => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={makeIcon(catColor(p.category))}>
              <Popup>
                <div style={{ minWidth: 180, fontFamily: 'DM Sans, sans-serif' }}>
                  <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{p.name}</p>
                  <p style={{ fontSize: 12, color: '#737373' }}>{CATEGORIES.find(c => c.id === p.category)?.label}</p>
                  {p.day && <p style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', marginTop: 4 }}>{p.day}</p>}
                  {p.notes && <p style={{ fontSize: 12, marginTop: 4 }}>{p.notes}</p>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={() => openEdit(p)} style={{ fontSize: 12, color: '#2563eb', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>Editar</button>
                    <button onClick={() => deletePlace(p.id)} style={{ fontSize: 12, color: '#ef4444', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>Eliminar</button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {newPlace && (
            <Marker position={[newPlace.lat, newPlace.lng]} icon={makeIcon('#2563eb')}>
              <Popup autoOpen>
                <PlaceForm form={form} setForm={setForm} onSubmit={saveNew} onCancel={() => setNewPlace(null)} isNew />
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Lista lateral de lugares */}
      {places.length > 0 && (
        <div className="mt-4 space-y-1">
          {places.map(p => (
            <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-soft group">
              <div className="flex items-center gap-2">
                <span style={{ width: 8, height: 8, background: catColor(p.category), borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
                <span className="text-sm text-ink">{p.name}</span>
                {p.day && <span className="text-xs font-mono text-mid">{p.day}</span>}
              </div>
              <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(p)} className="text-xs text-accent">Editar</button>
                <button onClick={() => deletePlace(p.id)} className="text-xs text-danger">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal editar */}
      {editPlace && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center px-4" onClick={() => setEditPlace(null)}>
          <div className="bg-white rounded-xl border border-line p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <p className="font-medium text-ink mb-3">Editar lugar</p>
            <PlaceForm form={form} setForm={setForm} onSubmit={saveEdit} onCancel={() => setEditPlace(null)} />
          </div>
        </div>
      )}
    </div>
  )
}

function PlaceForm({ form, setForm, onSubmit, onCancel, isNew }) {
  return (
    <form onSubmit={onSubmit} style={{ minWidth: isNew ? 200 : 'auto' }} className="space-y-2">
      <input
        autoFocus
        placeholder="Nome do lugar"
        value={form.name}
        onChange={e => setForm({ ...form, name: e.target.value })}
        className="input text-sm"
        required
      />
      <select
        value={form.category}
        onChange={e => setForm({ ...form, category: e.target.value })}
        className="input text-sm"
      >
        {[
          { id: 'aloxamento', label: 'Aloxamento' },
          { id: 'actividade', label: 'Actividade' },
          { id: 'parada', label: 'Parada' },
          { id: 'restaurante', label: 'Restaurante' },
          { id: 'outro', label: 'Outro' },
        ].map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      <input
        type="date"
        value={form.day}
        onChange={e => setForm({ ...form, day: e.target.value })}
        className="input text-sm font-mono"
      />
      <textarea
        placeholder="Notas"
        value={form.notes}
        onChange={e => setForm({ ...form, notes: e.target.value })}
        className="input text-sm"
        rows={2}
        style={{ resize: 'none' }}
      />
      <div className="flex gap-2">
        <button type="submit" className="btn-primary text-sm flex-1">Gardar</button>
        <button type="button" onClick={onCancel} className="btn-ghost text-sm">Cancelar</button>
      </div>
    </form>
  )
}
