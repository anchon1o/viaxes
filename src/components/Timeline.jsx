import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function dayRange(start, end) {
  if (!start || !end) return []
  const days = []
  let d = new Date(start)
  const last = new Date(end)
  while (d <= last) {
    days.push(d.toISOString().slice(0, 10))
    d = new Date(d.getTime() + 86400000)
  }
  return days
}

const formatDay = (iso) => {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('gl-ES', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function Timeline({ tripId, trip }) {
  const [items, setItems] = useState([])
  const [formDay, setFormDay] = useState(null)
  const [form, setForm] = useState({ time: '', title: '', description: '' })

  const load = async () => {
    const { data } = await supabase
      .from('itinerary_items')
      .select('*')
      .eq('trip_id', tripId)
      .order('time', { ascending: true })
    if (data) setItems(data)
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`itinerary-${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'itinerary_items', filter: `trip_id=eq.${tripId}` }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [tripId])

  const days = dayRange(trip?.start_date, trip?.end_date)

  const addItem = async (e, day) => {
    e.preventDefault()
    await supabase.from('itinerary_items').insert({
      trip_id: tripId,
      day,
      time: form.time || null,
      title: form.title,
      description: form.description || null,
      order_index: items.filter((i) => i.day === day).length,
    })
    setForm({ time: '', title: '', description: '' })
    setFormDay(null)
  }

  const removeItem = async (id) => {
    await supabase.from('itinerary_items').delete().eq('id', id)
  }

  if (days.length === 0) {
    return (
      <p className="text-charcoal/50 text-center py-10">
        Engade datas de inicio e fin á viaxe para ver o planning por días.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto pb-4 -mx-5 px-5">
      <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
        {days.map((day, idx) => {
          const dayItems = items.filter((i) => i.day === day)
          return (
            <div key={day} className="w-72 shrink-0 stamp-card rounded-2xl shadow-stamp p-4">
              <div className="flex items-baseline justify-between mb-3">
                <p className="font-display text-lg text-ink font-semibold capitalize">{formatDay(day)}</p>
                <span className="text-xs font-mono text-brass bg-brass/10 px-2 py-0.5 rounded-full">
                  día {idx + 1}
                </span>
              </div>

              <div className="space-y-2">
                {dayItems.map((item) => (
                  <div key={item.id} className="bg-paperdark/60 rounded-lg p-3 group relative">
                    {item.time && (
                      <span className="text-xs font-mono text-brand">{item.time.slice(0, 5)}</span>
                    )}
                    <p className="font-medium text-ink text-sm">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-charcoal/60 mt-0.5">{item.description}</p>
                    )}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="absolute top-1 right-1 text-charcoal/30 hover:text-coral opacity-0 group-hover:opacity-100 text-xs px-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {formDay === day ? (
                <form onSubmit={(e) => addItem(e, day)} className="mt-3 space-y-2">
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full border rounded px-2 py-1 text-sm font-mono"
                  />
                  <input
                    autoFocus
                    placeholder="Que vai pasar?"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full border rounded px-2 py-1 text-sm"
                    required
                  />
                  <textarea
                    placeholder="Detalles (opcional)"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full border rounded px-2 py-1 text-sm"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-brand text-white rounded py-1 text-sm">
                      Engadir
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormDay(null)}
                      className="px-2 text-charcoal/50 text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setFormDay(day)}
                  className="mt-3 w-full text-sm text-ink/50 border border-dashed border-ink/20 rounded-lg py-1.5 hover:border-brand hover:text-brand transition-colors"
                >
                  + engadir
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
