import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function dayRange(start, end) {
  if (!start || !end) return []
  const days = []
  let d = new Date(start + 'T00:00:00')
  const last = new Date(end + 'T00:00:00')
  while (d <= last) {
    days.push(d.toISOString().slice(0, 10))
    d = new Date(d.getTime() + 86400000)
  }
  return days
}

const fmtDay = (iso) => {
  const d = new Date(iso + 'T00:00:00')
  const wd = ['dom', 'lun', 'mar', 'mér', 'xov', 'ven', 'sáb'][d.getDay()]
  return { wd, dd: d.getDate(), mm: d.toLocaleDateString('gl', { month: 'short' }) }
}

const today = new Date().toISOString().slice(0, 10)

export default function Timeline({ tripId, trip }) {
  const [items, setItems]     = useState([])
  const [formDay, setFormDay] = useState(null)
  const [form, setForm]       = useState({ time: '', title: '', description: '' })
  const [editItem, setEditItem] = useState(null)

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

  const addItem = async (e, day) => {
    e.preventDefault()
    await supabase.from('itinerary_items').insert({
      trip_id: tripId, day, time: form.time || null,
      title: form.title, description: form.description || null,
      order_index: items.filter(i => i.day === day).length,
    })
    setForm({ time: '', title: '', description: '' }); setFormDay(null)
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    await supabase.from('itinerary_items').update({
      time: form.time || null, title: form.title, description: form.description || null,
    }).eq('id', editItem.id)
    setEditItem(null)
  }

  const remove = async (id) => {
    if (!confirm('Eliminar esta actividade?')) return
    await supabase.from('itinerary_items').delete().eq('id', id)
  }

  if (!days.length) return (
    <div className="py-16 text-center">
      <p className="text-sm text-mid">Engade datas á viaxe para ver o planning por días.</p>
    </div>
  )

  return (
    <div>
      <div className="overflow-x-auto -mx-6 px-6 pb-4">
        <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
          {days.map((day, idx) => {
            const { wd, dd, mm } = fmtDay(day)
            const dayItems = items.filter(i => i.day === day)
            const isToday = day === today

            return (
              <div
                key={day}
                className={`w-64 shrink-0 rounded-xl border flex flex-col ${isToday ? 'day-cursor border-accent/30' : 'border-line'}`}
                style={{ paddingLeft: isToday ? '18px' : undefined }}
              >
                {/* Cabecera del día */}
                <div className={`px-4 pt-4 pb-3 border-b ${isToday ? 'border-accent/20' : 'border-line'}`}>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xs font-mono text-mid uppercase">{wd}</span>
                      <span className="text-2xl font-semibold text-ink ml-2">{dd}</span>
                      <span className="text-xs font-mono text-mid ml-1">{mm}</span>
                    </div>
                    <span className="text-xs font-mono text-mid">día {idx + 1}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="flex-1 p-3 space-y-1.5">
                  {dayItems.map(item => (
                    <div key={item.id} className="group p-2.5 rounded-lg hover:bg-soft relative">
                      {item.time && (
                        <span className="text-xs font-mono text-accent block">{item.time.slice(0, 5)}</span>
                      )}
                      <p className="text-sm font-medium text-ink">{item.title}</p>
                      {item.description && (
                        <p className="text-xs text-mid mt-0.5">{item.description}</p>
                      )}
                      <div className="flex gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditItem(item); setForm({ time: item.time?.slice(0,5) || '', title: item.title, description: item.description || '' }) }}
                          className="text-xs text-accent"
                        >Editar</button>
                        <button onClick={() => remove(item.id)} className="text-xs text-danger">Eliminar</button>
                      </div>
                    </div>
                  ))}

                  {formDay === day ? (
                    <form onSubmit={(e) => addItem(e, day)} className="space-y-1.5 pt-1">
                      <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className="input text-xs font-mono" />
                      <input autoFocus placeholder="Actividade" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input text-sm" required />
                      <input placeholder="Detalles" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input text-sm" />
                      <div className="flex gap-1.5">
                        <button type="submit" className="btn-primary text-xs flex-1 py-1.5">Gardar</button>
                        <button type="button" onClick={() => setFormDay(null)} className="btn-ghost text-xs py-1.5">✕</button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setFormDay(day)}
                      className="w-full text-left text-xs text-mid hover:text-ink py-1 px-2 rounded transition-colors"
                    >
                      + Engadir
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal editar item */}
      {editItem && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center px-4" onClick={() => setEditItem(null)}>
          <div className="bg-white rounded-xl border border-line p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <p className="font-medium text-ink mb-3">Editar actividade</p>
            <form onSubmit={saveEdit} className="space-y-2">
              <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className="input text-sm font-mono" />
              <input autoFocus value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input text-sm" required />
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input text-sm" placeholder="Detalles" />
              <div className="flex gap-2">
                <button type="submit" className="btn-primary text-sm flex-1">Gardar</button>
                <button type="button" onClick={() => setEditItem(null)} className="btn-ghost text-sm">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
