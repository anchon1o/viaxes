import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DAY_HEIGHT = 600 // px de alto do día

function dayRange(start, end) {
  if (!start || !end) return []
  const days = [], d = new Date(start + 'T00:00:00'), last = new Date(end + 'T00:00:00')
  while (d <= last) { days.push(new Date(d)); d.setDate(d.getDate() + 1) }
  return days
}

const ISO = (d) => d.toISOString().slice(0, 10)
const TODAY = new Date().toISOString().slice(0, 10)

const COLORS = ['#007AFF','#34C759','#FF9500','#FF2D55','#AF52DE','#5AC8FA','#FF6B35','#32D74B']
const colorFor = (str) => COLORS[Math.abs([...str].reduce((h, c) => (h << 5) - h + c.charCodeAt(0), 0)) % COLORS.length]

const fmtTime = (t) => t ? t.slice(0,5) : null
const timeToY = (t) => {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return ((h + m / 60) / 24) * DAY_HEIGHT
}

export default function Timeline({ tripId, trip }) {
  const [items, setItems] = useState([])
  const [formDay, setFormDay] = useState(null)
  const [form, setForm]       = useState({ time: '09:00', title: '', description: '', duration: 60 })
  const [editItem, setEditItem] = useState(null)
  const [viewMode, setViewMode] = useState('timeline') // timeline | cards

  const load = async () => {
    const { data } = await supabase.from('itinerary_items').select('*').eq('trip_id', tripId).order('time')
    if (data) setItems(data)
  }

  useEffect(() => {
    load()
    const ch = supabase.channel(`itin-${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'itinerary_items', filter: `trip_id=eq.${tripId}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [tripId])

  const days = dayRange(trip?.start_date, trip?.end_date)

  const save = async (e) => {
    e.preventDefault()
    if (editItem) {
      await supabase.from('itinerary_items').update({ time: form.time || null, title: form.title, description: form.description || null }).eq('id', editItem.id)
      setEditItem(null)
    } else {
      await supabase.from('itinerary_items').insert({ trip_id: tripId, day: formDay, time: form.time || null, title: form.title, description: form.description || null, order_index: items.filter(i => i.day === formDay).length })
      setFormDay(null)
    }
    setForm({ time: '09:00', title: '', description: '', duration: 60 })
  }

  const remove = async (id) => {
    if (!confirm('Eliminar esta actividade?')) return
    await supabase.from('itinerary_items').delete().eq('id', id)
  }

  if (!days.length) return (
    <div className="widget p-8 text-center">
      <p className="text-2xl mb-2">📅</p>
      <p style={{ color: 'var(--color-muted)' }}>Engade datas á viaxe para ver o timeline.</p>
    </div>
  )

  return (
    <div>
      {/* Controles */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold" style={{ color: 'var(--color-muted)' }}>
          {days.length} {days.length === 1 ? 'día' : 'días'}
        </p>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--color-surface)' }}>
          {[{ id: 'timeline', icon: '⏱️' }, { id: 'cards', icon: '🗂️' }].map(v => (
            <button key={v.id} onClick={() => setViewMode(v.id)}
              className="px-3 py-1.5 rounded-lg text-sm transition-all"
              style={{ background: viewMode === v.id ? 'var(--color-accent)' : 'transparent', color: viewMode === v.id ? '#fff' : 'var(--color-muted)' }}>
              {v.icon}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'timeline' ? (
        /* ─── MODO TIMELINE VISUAL ─── */
        <div className="overflow-x-auto -mx-4 px-4 pb-4">
          <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
            {days.map((date) => {
              const dayISO  = ISO(date)
              const dayItems = items.filter(i => i.day === dayISO).sort((a,b) => (a.time||'') > (b.time||'') ? 1 : -1)
              const isToday  = dayISO === TODAY
              const label    = date.toLocaleDateString('gl', { weekday: 'short', day: 'numeric', month: 'short' })

              return (
                <div key={dayISO} className="widget shrink-0 overflow-hidden" style={{ width: 220 }}>
                  {/* Cabeceira */}
                  <div className="px-4 py-3 flex items-center justify-between border-b"
                       style={{ borderColor: 'var(--color-border)', background: isToday ? 'var(--color-accent)' : 'var(--color-surface)' }}>
                    <p className="text-sm font-semibold capitalize"
                       style={{ color: isToday ? '#fff' : 'var(--color-text)' }}>{label}</p>
                    <button onClick={() => setFormDay(dayISO)}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: isToday ? 'rgba(255,255,255,0.25)' : 'var(--color-bg)', color: isToday ? '#fff' : 'var(--color-accent)' }}>
                      +
                    </button>
                  </div>

                  {/* Corpo con horas */}
                  <div className="relative" style={{ height: DAY_HEIGHT }}>
                    {/* Liñas de hora */}
                    {HOURS.filter(h => h % 3 === 0).map(h => (
                      <div key={h} className="absolute left-0 right-0 flex items-center gap-1"
                           style={{ top: (h / 24) * DAY_HEIGHT, opacity: 0.3 }}>
                        <span className="text-xs pl-2" style={{ color: 'var(--color-muted)', fontSize: 10, minWidth: 28 }}>{h}:00</span>
                        <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
                      </div>
                    ))}

                    {/* Actividades */}
                    {dayItems.map((item) => {
                      const y = timeToY(item.time)
                      const col = colorFor(item.title)
                      if (y === null) return (
                        <div key={item.id} className="mx-2 my-1 rounded-xl px-3 py-2 group cursor-pointer"
                             style={{ background: col + '22', borderLeft: `3px solid ${col}` }}
                             onClick={() => { setEditItem(item); setForm({ time: item.time?.slice(0,5)||'', title: item.title, description: item.description||'', duration: 60 }) }}>
                          <p className="text-xs font-semibold" style={{ color: col }}>{item.title}</p>
                        </div>
                      )
                      return (
                        <div key={item.id}
                             className="absolute left-8 right-2 rounded-xl px-2 py-1.5 group cursor-pointer"
                             style={{ top: y + 1, minHeight: 36, background: col + '22', borderLeft: `3px solid ${col}` }}
                             onClick={() => { setEditItem(item); setForm({ time: item.time?.slice(0,5)||'', title: item.title, description: item.description||'', duration: 60 }) }}>
                          {item.time && <p style={{ fontSize: 10, color: col, fontWeight: 700 }}>{fmtTime(item.time)}</p>}
                          <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--color-text)' }}>{item.title}</p>
                          <button onClick={e => { e.stopPropagation(); remove(item.id) }}
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-xs"
                            style={{ color: '#FF3B30' }}>✕</button>
                        </div>
                      )
                    })}

                    {dayItems.length === 0 && (
                      <p className="absolute inset-0 flex items-center justify-center text-xs" style={{ color: 'var(--color-muted)' }}>
                        Sen actividades
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* ─── MODO CARDS ─── */
        <div className="space-y-4">
          {days.map(date => {
            const dayISO = ISO(date)
            const dayItems = items.filter(i => i.day === dayISO).sort((a,b) => (a.time||'') > (b.time||'') ? 1 : -1)
            const isToday = dayISO === TODAY
            const label = date.toLocaleDateString('gl', { weekday: 'long', day: 'numeric', month: 'long' })

            return (
              <div key={dayISO} className="widget overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between"
                     style={{ background: isToday ? 'var(--color-accent)' : 'var(--color-bg)' }}>
                  <p className="text-sm font-semibold capitalize"
                     style={{ color: isToday ? '#fff' : 'var(--color-text)' }}>{label}</p>
                  <button onClick={() => setFormDay(dayISO)} className="v-btn v-btn-sm"
                    style={{ background: isToday ? 'rgba(255,255,255,0.25)' : 'var(--color-accent)', color: '#fff', padding: '4px 10px' }}>
                    + Engadir
                  </button>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {dayItems.map(item => (
                    <div key={item.id} className="px-4 py-3 flex items-start gap-3 group">
                      {item.time && (
                        <span className="text-xs font-mono font-semibold mt-0.5 shrink-0" style={{ color: 'var(--color-accent)' }}>
                          {fmtTime(item.time)}
                        </span>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{item.title}</p>
                        {item.description && <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{item.description}</p>}
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => { setEditItem(item); setForm({ time: item.time?.slice(0,5)||'', title: item.title, description: item.description||'', duration: 60 }) }}
                          className="text-xs font-semibold" style={{ color: 'var(--color-accent)' }}>Editar</button>
                        <button onClick={() => remove(item.id)} className="text-xs" style={{ color: '#FF3B30' }}>✕</button>
                      </div>
                    </div>
                  ))}
                  {dayItems.length === 0 && (
                    <p className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted)' }}>Sen actividades</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal engadir / editar */}
      {(formDay || editItem) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4"
             style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
             onClick={() => { setFormDay(null); setEditItem(null) }}>
          <div className="widget w-full max-w-sm p-5 scale-in" onClick={e => e.stopPropagation()}>
            <p className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
              {editItem ? 'Editar actividade' : `Engadir ao ${new Date(formDay + 'T00:00:00').toLocaleDateString('gl', { weekday: 'long', day: 'numeric', month: 'short' })}`}
            </p>
            <form onSubmit={save} className="space-y-2">
              <div className="flex gap-2">
                <input type="time" className="v-input text-sm" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} style={{ flex: '0 0 auto', width: 120 }} />
                <input autoFocus className="v-input text-sm flex-1" placeholder="Que vas facer?" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <input className="v-input text-sm" placeholder="Detalles (opcional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              <div className="flex gap-2">
                <button type="submit" className="v-btn v-btn-primary flex-1">Gardar</button>
                <button type="button" onClick={() => { setFormDay(null); setEditItem(null) }} className="v-btn v-btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
