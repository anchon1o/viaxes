import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function dayRange(start, end) {
  if (!start || !end) return []
  const days = [], d = new Date(start + 'T00:00:00'), last = new Date(end + 'T00:00:00')
  while (d <= last) { days.push(new Date(d)); d.setDate(d.getDate() + 1) }
  return days
}
const ISO    = d => d.toISOString().slice(0, 10)
const TODAY  = new Date().toISOString().slice(0, 10)
const fmtTime = t => t ? t.slice(0, 5) : null

const HOUR_H = 48 // px por hora no modo timeline visual

const colorFor = str => {
  const COLORS = ['#007AFF','#34C759','#FF9500','#FF2D55','#AF52DE','#5AC8FA','#FF6B35','#32D74B']
  let h = 0; for (const c of str) h = (h << 5) - h + c.charCodeAt(0)
  return COLORS[Math.abs(h) % COLORS.length]
}

const timeToMin = t => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m }
const timeToY   = t => { const min = timeToMin(t); return min !== null ? (min / 60) * HOUR_H : null }

export default function Timeline({ tripId, trip }) {
  const [items,    setItems]    = useState([])
  const [viewMode, setViewMode] = useState('cards')
  const [formDay,  setFormDay]  = useState(null)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ time: '09:00', title: '', description: '', duration: 60 })

  const load = async () => {
    const { data } = await supabase.from('itinerary_items').select('*').eq('trip_id', tripId).order('time')
    if (data) setItems(data)
  }

  useEffect(() => {
    load()
    const ch = supabase.channel(`itin8-${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'itinerary_items', filter: `trip_id=eq.${tripId}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [tripId])

  const days = dayRange(trip?.start_date, trip?.end_date)

  const openAdd = (day) => {
    setFormDay(day)
    setEditItem(null)
    setForm({ time: '09:00', title: '', description: '', duration: 60 })
  }

  const openEdit = (item) => {
    setEditItem(item)
    setFormDay(null)
    setForm({
      time:        item.time?.slice(0, 5) || '09:00',
      title:       item.title,
      description: item.description || '',
      duration:    item.duration || 60,
    })
  }

  const saveItem = async e => {
    e.preventDefault()
    const payload = {
      time:        form.time || null,
      title:       form.title,
      description: form.description || null,
      duration:    Number(form.duration) || null,
    }
    if (editItem) {
      await supabase.from('itinerary_items').update(payload).eq('id', editItem.id)
    } else {
      await supabase.from('itinerary_items').insert({
        trip_id: tripId, day: formDay, ...payload,
        order_index: items.filter(i => i.day === formDay).length,
      })
    }
    setFormDay(null); setEditItem(null)
  }

  const remove = async id => {
    if (!confirm('Eliminar esta actividade?')) return
    setItems(p => p.filter(i => i.id !== id))
    await supabase.from('itinerary_items').delete().eq('id', id)
  }

  if (!days.length) return (
    <div className="widget p-8 text-center">
      <p className="text-3xl mb-2">📅</p>
      <p style={{ color: 'var(--color-muted)' }}>Engade datas á viaxe para ver o planning.</p>
    </div>
  )

  return (
    <div>
      {/* Selector de vista */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold" style={{ color: 'var(--color-muted)' }}>
          {days.length} {days.length === 1 ? 'día' : 'días'}
        </p>
        <div className="flex gap-1 p-1 widget">
          {[{ id: 'cards', icon: '🗂️' }, { id: 'timeline', icon: '⏱️' }].map(v => (
            <button key={v.id} onClick={() => setViewMode(v.id)}
              className="px-3 py-1.5 text-sm transition-all"
              style={{ borderRadius: 'calc(var(--radius)*0.5)', background: viewMode === v.id ? 'var(--color-accent)' : 'transparent', color: viewMode === v.id ? '#fff' : 'var(--color-muted)' }}>
              {v.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Vista CARDS */}
      {viewMode === 'cards' && (
        <div className="space-y-3">
          {days.map(date => {
            const dayISO   = ISO(date)
            const dayItems = items.filter(i => i.day === dayISO).sort((a, b) => (a.time || '') > (b.time || '') ? 1 : -1)
            const isToday  = dayISO === TODAY
            const label    = date.toLocaleDateString('gl', { weekday: 'long', day: 'numeric', month: 'long' })
            return (
              <div key={dayISO} className="widget overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between"
                     style={{ background: isToday ? 'var(--color-accent)' : 'var(--color-bg)' }}>
                  <p className="font-semibold capitalize text-sm" style={{ color: isToday ? '#fff' : 'var(--color-text)' }}>{label}</p>
                  <button onClick={() => openAdd(dayISO)} className="vb vb-sm"
                    style={{ background: isToday ? 'rgba(255,255,255,0.2)' : 'var(--color-accent)', color: '#fff', padding: '5px 12px' }}>
                    + Engadir
                  </button>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {dayItems.map(item => (
                    <div key={item.id} className="px-4 py-3 flex items-start gap-3 group">
                      {item.time && (
                        <span className="text-xs font-mono font-semibold shrink-0 mt-0.5 w-10"
                              style={{ color: 'var(--color-accent)' }}>{fmtTime(item.time)}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium" style={{ fontSize: 15, color: 'var(--color-text)' }}>{item.title}</p>
                        {item.description && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{item.description}</p>
                        )}
                        {item.duration && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>⏱ {item.duration} min</p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(item)} style={{ fontSize: 18 }}>✏️</button>
                        <button onClick={() => remove(item.id)} style={{ fontSize: 18 }}>🗑</button>
                      </div>
                    </div>
                  ))}
                  {dayItems.length === 0 && (
                    <p className="px-4 py-3 text-sm" style={{ color: 'var(--color-muted)' }}>Sen actividades</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Vista TIMELINE horizontal */}
      {viewMode === 'timeline' && (
        <div className="overflow-x-auto no-scrollbar -mx-4 px-4 pb-4">
          <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
            {days.map(date => {
              const dayISO   = ISO(date)
              const dayItems = items.filter(i => i.day === dayISO).sort((a, b) => (a.time || '') > (b.time || '') ? 1 : -1)
              const isToday  = dayISO === TODAY
              const label    = date.toLocaleDateString('gl', { weekday: 'short', day: 'numeric', month: 'short' })
              return (
                <div key={dayISO} className="widget shrink-0 overflow-hidden" style={{ width: 200 }}>
                  <div className="px-3 py-2.5 flex items-center justify-between border-b"
                       style={{ background: isToday ? 'var(--color-accent)' : 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <p className="text-xs font-semibold capitalize" style={{ color: isToday ? '#fff' : 'var(--color-text)' }}>{label}</p>
                    <button onClick={() => openAdd(dayISO)}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: isToday ? 'rgba(255,255,255,0.2)' : 'var(--color-bg)', color: isToday ? '#fff' : 'var(--color-accent)' }}>+</button>
                  </div>
                  <div className="relative" style={{ height: HOUR_H * 24, overflowY: 'auto' }}>
                    {[0,3,6,9,12,15,18,21].map(h => (
                      <div key={h} className="absolute left-0 right-0 flex items-center"
                           style={{ top: h * HOUR_H, opacity: 0.3, pointerEvents: 'none' }}>
                        <span style={{ fontSize: 9, color: 'var(--color-muted)', minWidth: 24, paddingLeft: 4 }}>{h}h</span>
                        <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
                      </div>
                    ))}
                    {dayItems.map(item => {
                      const y = timeToY(item.time)
                      const col = colorFor(item.title)
                      const durH = (item.duration || 60) / 60 * HOUR_H
                      return (
                        <div key={item.id}
                             className="absolute left-7 right-2 rounded-lg cursor-pointer"
                             style={{ top: (y ?? 10) + 1, minHeight: 28, height: durH > 28 ? durH : undefined,
                               background: col + '22', borderLeft: `3px solid ${col}`, padding: '3px 6px' }}
                             onClick={() => openEdit(item)}>
                          {item.time && <p style={{ fontSize: 9, color: col, fontWeight: 700 }}>{fmtTime(item.time)}</p>}
                          <p style={{ fontSize: 11, color: 'var(--color-text)', fontWeight: 600, lineHeight: 1.2 }}>{item.title}</p>
                        </div>
                      )
                    })}
                    {dayItems.length === 0 && (
                      <p className="absolute inset-0 flex items-center justify-center text-xs" style={{ color: 'var(--color-muted)' }}>
                        Baleiro
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal engadir / editar */}
      {(formDay || editItem) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4"
             style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
             onClick={() => { setFormDay(null); setEditItem(null) }}>
          <div className="widget w-full max-w-sm p-5 scale-in" onClick={e => e.stopPropagation()}>
            <p className="font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
              {editItem ? 'Editar actividade' : `Engadir: ${new Date((formDay || '') + 'T00:00:00').toLocaleDateString('gl', { weekday: 'long', day: 'numeric', month: 'short' })}`}
            </p>
            <form onSubmit={saveItem} className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-muted)' }}>Hora</label>
                  <input type="time" className="vi" value={form.time}
                    onChange={e => setForm({ ...form, time: e.target.value })} />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-muted)' }}>Duración (min)</label>
                  <input type="number" className="vi" min="5" max="480" step="5" value={form.duration}
                    onChange={e => setForm({ ...form, duration: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-muted)' }}>Actividade</label>
                <input autoFocus className="vi" placeholder="Que vai pasar?" value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'var(--color-muted)' }}>Detalles</label>
                <input className="vi" placeholder="Opcional" value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="vb vb-p flex-1">Gardar</button>
                <button type="button" onClick={() => { setFormDay(null); setEditItem(null) }} className="vb vb-s">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
