import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Link } from 'react-router-dom'

export default function ChecklistWidget({ tripId }) {
  const [lists, setLists] = useState([])
  const [items, setItems] = useState([])
  const [selIdx, setSelIdx] = useState(0)

  useEffect(() => {
    const load = async () => {
      const { data: ls } = await supabase.from('lists').select('*').eq('trip_id', tripId).order('created_at')
      if (ls) setLists(ls)
      if (ls?.length) {
        const { data: its } = await supabase.from('list_items').select('*').in('list_id', ls.map(l => l.id))
        if (its) setItems(its)
      }
    }
    load()
  }, [tripId])

  if (!lists.length) return (
    <Link to={`/viaxe/${tripId}?tab=listas`} className="widget p-4 flex flex-col items-center justify-center text-center" style={{ minHeight: 110 }}>
      <p className="text-2xl mb-1">✅</p>
      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Crear listaxe</p>
    </Link>
  )

  const list = lists[selIdx] || lists[0]
  const listItems = items.filter(i => i.list_id === list?.id)
  const checked = listItems.filter(i => i.checked).length
  const pct = listItems.length ? Math.round(checked / listItems.length * 100) : 0

  // SVG círculo de progreso
  const R = 22, C = 2 * Math.PI * R
  const dash = (pct / 100) * C

  return (
    <div className="widget p-4" style={{ minHeight: 110 }}>
      {lists.length > 1 && (
        <div className="flex gap-1 mb-2">
          {lists.map((l, i) => (
            <button key={l.id} onClick={() => setSelIdx(i)}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: selIdx === i ? 'var(--color-accent)' : 'var(--color-bg)', color: selIdx === i ? '#fff' : 'var(--color-muted)' }}>
              {l.icon}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3">
        <svg width="52" height="52" viewBox="0 0 52 52">
          <circle cx="26" cy="26" r={R} fill="none" stroke="var(--color-border)" strokeWidth="3" />
          <circle cx="26" cy="26" r={R} fill="none" stroke="var(--color-accent)" strokeWidth="3"
            strokeDasharray={`${dash} ${C}`} strokeLinecap="round" transform="rotate(-90 26 26)" />
          <text x="26" y="31" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-text)">{pct}%</text>
        </svg>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{list?.icon} {list?.name}</p>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{checked}/{listItems.length} feitos</p>
          {pct === 100 && <p className="text-xs" style={{ color: '#34C759' }}>✓ Lista completa!</p>}
        </div>
      </div>
    </div>
  )
}
