import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const CATEGORIES = [
  { id: 'aloxamento', label: 'Aloxamento', icon: '🛏️', color: '#007AFF' },
  { id: 'actividade',  label: 'Actividade',  icon: '🎯', color: '#34C759' },
  { id: 'restaurante', label: 'Restaurante', icon: '🍽️', color: '#FF9500' },
  { id: 'parada',      label: 'Parada',      icon: '📍', color: '#FF2D55' },
  { id: 'vista',       label: 'Vista',       icon: '🏔️', color: '#AF52DE' },
  { id: 'outro',       label: 'Outro',       icon: '✨', color: '#8e8e93' },
]
const catInfo = id => CATEGORIES.find(c => c.id === id) || CATEGORIES[5]

// Carga Google Maps SDK dinamicamente
let gmapsLoaded = false
let gmapsCallbacks = []
function loadGoogleMaps(apiKey) {
  if (gmapsLoaded) return Promise.resolve()
  return new Promise((resolve) => {
    if (window.google?.maps) { gmapsLoaded = true; resolve(); return }
    gmapsCallbacks.push(resolve)
    if (document.getElementById('gmaps-script')) return
    window.__gmapsReady = () => {
      gmapsLoaded = true
      gmapsCallbacks.forEach(cb => cb())
      gmapsCallbacks = []
    }
    const s = document.createElement('script')
    s.id = 'gmaps-script'
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=__gmapsReady`
    s.async = true; s.defer = true
    document.head.appendChild(s)
  })
}

export default function MapView({ tripId }) {
  const mapRef     = useRef(null)
  const gmap       = useRef(null)
  const markers    = useRef({})
  const infoWindow = useRef(null)
  const dirRenderer= useRef(null)

  const [places,    setPlaces]    = useState([])
  const [addMode,   setAddMode]   = useState(false)
  const [editPlace, setEditPlace] = useState(null)
  const [form,      setForm]      = useState({ name:'', category:'parada', day:'', notes:'', address:'' })
  const [routeMode, setRouteMode] = useState('DRIVING')
  const [apiKey,    setApiKey]    = useState(import.meta.env.VITE_GOOGLE_MAPS_KEY || '')
  const [keyInput,  setKeyInput]  = useState('')
  const [mapReady,  setMapReady]  = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const searchRef  = useRef(null)
  const autocomplete = useRef(null)

  // ── Gardar API key en localStorage ──
  useEffect(() => {
    const saved = localStorage.getItem('gmaps_key')
    if (saved) setApiKey(saved)
  }, [])

  const saveKey = () => {
    localStorage.setItem('gmaps_key', keyInput)
    setApiKey(keyInput)
  }

  // ── Inicializar mapa ──
  useEffect(() => {
    if (!apiKey || !mapRef.current) return
    loadGoogleMaps(apiKey).then(() => {
      if (gmap.current) return
      gmap.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 42.8782, lng: -8.5448 },
        zoom: 12,
        mapId: 'viaxes_map',
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: true,
        fullscreenControl: false,
      })

      infoWindow.current = new window.google.maps.InfoWindow()
      dirRenderer.current = new window.google.maps.DirectionsRenderer({
        suppressMarkers: false,
        polylineOptions: { strokeColor: 'var(--color-accent,#007AFF)', strokeWeight: 4, strokeOpacity: 0.8 }
      })
      dirRenderer.current.setMap(gmap.current)

      // Click para engadir lugar en modo addMode
      gmap.current.addListener('click', (e) => {
        if (!addMode) return
        openNewPlace({ lat: e.latLng.lat(), lng: e.latLng.lng() })
      })

      setMapReady(true)

      // Places Autocomplete no input de busca
      if (searchRef.current) {
        autocomplete.current = new window.google.maps.places.Autocomplete(searchRef.current, {
          fields: ['geometry','name','formatted_address'],
        })
        autocomplete.current.addListener('place_changed', () => {
          const place = autocomplete.current.getPlace()
          if (!place.geometry) return
          const loc = place.geometry.location
          gmap.current.panTo(loc)
          gmap.current.setZoom(15)
          openNewPlace({ lat: loc.lat(), lng: loc.lng(), name: place.name, address: place.formatted_address })
          setAddMode(true)
        })
      }
    })
  }, [apiKey, mapRef.current])

  // ── Actualizar addMode no listener do mapa ──
  useEffect(() => {
    if (!gmap.current) return
    const listener = gmap.current.addListener('click', (e) => {
      if (!addMode) return
      openNewPlace({ lat: e.latLng.lat(), lng: e.latLng.lng() })
    })
    return () => window.google?.maps?.event?.removeListener(listener)
  }, [addMode])

  // ── Cargar lugares de Supabase ──
  const load = useCallback(async () => {
    const { data } = await supabase.from('places').select('*').eq('trip_id', tripId).order('order_index')
    if (data) setPlaces(data)
  }, [tripId])

  useEffect(() => {
    load()
    const ch = supabase.channel(`places-${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'places', filter: `trip_id=eq.${tripId}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  // ── Sincronizar marcadores con estado ──
  useEffect(() => {
    if (!mapReady || !gmap.current) return

    // Borrar marcadores vellos que xa non existen
    Object.keys(markers.current).forEach(id => {
      if (!places.find(p => p.id === id)) {
        markers.current[id].setMap(null)
        delete markers.current[id]
      }
    })

    // Crear/actualizar marcadores
    places.forEach(p => {
      if (markers.current[p.id]) {
        // Actualizar posición e título
        markers.current[p.id].setPosition({ lat: p.lat, lng: p.lng })
        markers.current[p.id].setTitle(p.name)
        return
      }
      const cat = catInfo(p.category)
      const marker = new window.google.maps.Marker({
        position: { lat: p.lat, lng: p.lng },
        map: gmap.current,
        title: p.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: cat.color,
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
          scale: 10,
        },
        label: { text: cat.icon, fontSize: '14px', fontFamily: 'serif' },
      })

      marker.addListener('click', () => {
        const content = buildInfoWindow(p)
        infoWindow.current.setContent(content)
        infoWindow.current.open(gmap.current, marker)
      })

      markers.current[p.id] = marker
    })

    // Debuxar ruta se hai 2+ lugares con data
    drawRoute()
  }, [places, mapReady, routeMode])

  const buildInfoWindow = (p) => {
    const cat = catInfo(p.category)
    return `<div style="padding:14px;min-width:200px;font-family:var(--font-body,Inter,sans-serif)">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="font-size:18px">${cat.icon}</span>
        <strong style="font-size:15px;color:var(--color-text,#1c1c1e)">${p.name}</strong>
      </div>
      <p style="font-size:11px;color:${cat.color};font-weight:600;margin:0 0 4px">${cat.label}</p>
      ${p.day ? `<p style="font-size:12px;color:var(--color-muted,#8e8e93);margin:0 0 4px">📅 ${p.day}</p>` : ''}
      ${p.notes ? `<p style="font-size:13px;color:var(--color-text,#1c1c1e);margin:4px 0">${p.notes}</p>` : ''}
      <div style="display:flex;gap:12px;margin-top:10px">
        <button onclick="window.__editPlace('${p.id}')" style="font-size:12px;color:var(--color-accent,#007AFF);background:none;border:none;cursor:pointer;font-weight:600;padding:0">Editar</button>
        <button onclick="window.__deletePlace('${p.id}')" style="font-size:12px;color:#FF3B30;background:none;border:none;cursor:pointer;font-weight:600;padding:0">Eliminar</button>
      </div>
    </div>`
  }

  // Expor funcions globais para os botóns do InfoWindow
  useEffect(() => {
    window.__editPlace = (id) => {
      const p = places.find(x => x.id === id)
      if (!p) return
      setEditPlace(p)
      setForm({ name: p.name, category: p.category, day: p.day || '', notes: p.notes || '', address: '' })
      infoWindow.current?.close()
    }
    window.__deletePlace = async (id) => {
      if (!confirm('Eliminar este lugar?')) return
      infoWindow.current?.close()
      markers.current[id]?.setMap(null)
      delete markers.current[id]
      setPlaces(prev => prev.filter(p => p.id !== id))
      await supabase.from('places').delete().eq('id', id)
    }
    return () => { delete window.__editPlace; delete window.__deletePlace }
  }, [places])

  const drawRoute = async () => {
    if (!gmap.current || !dirRenderer.current) return
    const ordered = [...places].filter(p => p.day).sort((a, b) => a.day > b.day ? 1 : -1)
    if (ordered.length < 2) { dirRenderer.current.setDirections({ routes: [] }); return }

    const waypoints = ordered.slice(1, -1).map(p => ({
      location: new window.google.maps.LatLng(p.lat, p.lng),
      stopover: true,
    }))

    const ds = new window.google.maps.DirectionsService()
    ds.route({
      origin: new window.google.maps.LatLng(ordered[0].lat, ordered[0].lng),
      destination: new window.google.maps.LatLng(ordered[ordered.length-1].lat, ordered[ordered.length-1].lng),
      waypoints,
      travelMode: routeMode,
      optimizeWaypoints: false,
    }, (result, status) => {
      if (status === 'OK') dirRenderer.current.setDirections(result)
    })
  }

  const openNewPlace = ({ lat, lng, name = '', address = '' }) => {
    setForm({ name, category: 'parada', day: '', notes: '', address })
    setEditPlace({ _new: true, lat, lng })
  }

  const showMyLocation = () => {
    navigator.geolocation.getCurrentPosition(pos => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      gmap.current?.panTo(loc)
      gmap.current?.setZoom(15)
      new window.google.maps.Marker({
        position: loc,
        map: gmap.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: '#007AFF',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 3,
          scale: 8,
        },
        title: 'A túa ubicación',
        zIndex: 999,
      })
    }, () => alert('Non se puido obter a ubicación'))
  }

  const savePlace = async (e) => {
    e.preventDefault()
    if (editPlace?._new) {
      await supabase.from('places').insert({
        trip_id: tripId, name: form.name, category: form.category,
        lat: editPlace.lat, lng: editPlace.lng,
        day: form.day || null, notes: form.notes || null,
        order_index: places.length,
      })
    } else {
      await supabase.from('places').update({
        name: form.name, category: form.category,
        day: form.day || null, notes: form.notes || null,
      }).eq('id', editPlace.id)
    }
    setEditPlace(null)
    setForm({ name:'', category:'parada', day:'', notes:'', address:'' })
    setAddMode(false)
  }

  // ── Se non hai API key, pedir ──
  if (!apiKey) return (
    <div className="widget p-6 max-w-md mx-auto mt-8">
      <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>🗺️ Configurar Google Maps</h2>
      <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
        Necesitas unha API Key gratuita de Google Maps. 
        <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer"
           className="ml-1 font-semibold" style={{ color: 'var(--color-accent)' }}>Crear en Google Cloud →</a>
      </p>
      <p className="text-xs mb-3" style={{ color: 'var(--color-muted)' }}>
        Activa: Maps JavaScript API + Places API + Directions API
      </p>
      <div className="flex gap-2">
        <input className="v-input text-sm flex-1" placeholder="AIza..." value={keyInput}
          onChange={e => setKeyInput(e.target.value)} />
        <button onClick={saveKey} className="v-btn v-btn-primary v-btn-sm">Gardar</button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-3">

      {/* Barra de ferramentas */}
      <div className="widget p-3 flex flex-wrap gap-2 items-center">
        <input ref={searchRef} className="v-input text-sm flex-1" style={{ minWidth: 160 }}
          placeholder="🔍 Buscar lugar en Google..." value={searchVal}
          onChange={e => setSearchVal(e.target.value)} />

        <div className="flex gap-1">
          {[{ id:'DRIVING', icon:'🚗' }, { id:'WALKING', icon:'🚶' }].map(m => (
            <button key={m.id} onClick={() => setRouteMode(m.id)}
              className="v-btn v-btn-sm"
              style={{ background: routeMode === m.id ? 'var(--color-accent)' : 'var(--color-bg)', color: routeMode === m.id ? '#fff' : 'var(--color-muted)' }}>
              {m.icon}
            </button>
          ))}
        </div>

        <button onClick={showMyLocation} className="v-btn v-btn-sm" style={{ background: 'var(--color-bg)', color: 'var(--color-accent)' }}>
          📍 Eu
        </button>

        <button onClick={() => setAddMode(v => !v)}
          className="v-btn v-btn-sm"
          style={{ background: addMode ? '#FF3B30' : 'var(--color-accent)', color: '#fff' }}>
          {addMode ? '✕ Cancelar' : '+ Lugar'}
        </button>
      </div>

      {addMode && (
        <p className="text-xs text-center" style={{ color: 'var(--color-muted)' }}>
          Toca no mapa ou busca un lugar arriba para marcalo
        </p>
      )}

      {/* Mapa */}
      <div className="widget overflow-hidden" style={{ height: '55vh' }}>
        <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      </div>

      {/* Lista de lugares */}
      {places.length > 0 && (
        <div className="widget overflow-hidden">
          {places.map(p => {
            const cat = catInfo(p.category)
            return (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3 group border-b last:border-0"
                   style={{ borderColor: 'var(--color-border)' }}>
                <span className="text-lg shrink-0">{cat.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{p.name}</p>
                  {p.day && <p className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>{p.day}</p>}
                </div>
                <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => { setEditPlace(p); setForm({ name:p.name, category:p.category, day:p.day||'', notes:p.notes||'', address:'' }) }}
                    className="text-xs font-semibold" style={{ color: 'var(--color-accent)' }}>Editar</button>
                  <button onClick={() => window.__deletePlace(p.id)}
                    className="text-xs" style={{ color: '#FF3B30' }}>✕</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal engadir/editar */}
      {editPlace && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4"
             style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
             onClick={() => setEditPlace(null)}>
          <div className="widget w-full max-w-sm p-5 scale-in" onClick={e => e.stopPropagation()}>
            <p className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
              {editPlace._new ? 'Novo lugar' : 'Editar lugar'}
            </p>
            <form onSubmit={savePlace} className="space-y-2">
              <input autoFocus className="v-input text-sm" placeholder="Nome do lugar" value={form.name}
                onChange={e => setForm({...form, name: e.target.value})} required />
              {form.address && (
                <p className="text-xs px-1" style={{ color: 'var(--color-muted)' }}>{form.address}</p>
              )}
              <div className="grid grid-cols-3 gap-1">
                {CATEGORIES.map(c => (
                  <button key={c.id} type="button" onClick={() => setForm({...form, category: c.id})}
                    className="py-2 rounded-xl text-lg transition-all"
                    style={{ background: form.category === c.id ? c.color : 'var(--color-bg)', transform: form.category === c.id ? 'scale(1.1)' : 'scale(1)' }}>
                    {c.icon}
                  </button>
                ))}
              </div>
              <input type="date" className="v-input text-sm font-mono" value={form.day}
                onChange={e => setForm({...form, day: e.target.value})} />
              <textarea className="v-input text-sm" placeholder="Notas" rows={2} value={form.notes}
                onChange={e => setForm({...form, notes: e.target.value})} style={{ resize:'none' }} />
              <div className="flex gap-2">
                <button type="submit" className="v-btn v-btn-primary flex-1">Gardar</button>
                <button type="button" onClick={() => setEditPlace(null)} className="v-btn v-btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
