import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useSession } from '../../App.jsx'

const CATS = [
  { id: 'aloxamento', icon: '🛏️', label: 'Aloxamento' },
  { id: 'comida',     icon: '🍽️', label: 'Comida' },
  { id: 'transporte', icon: '🚗', label: 'Transporte' },
  { id: 'ocio',       icon: '🎯', label: 'Ocio' },
  { id: 'compras',    icon: '🛍️', label: 'Compras' },
  { id: 'outro',      icon: '✨', label: 'Outro' },
]

export default function BudgetWidget({ tripId }) {
  const session = useSession()
  const [entries, setEntries]   = useState([])
  const [cfg, setCfg]           = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [showAdd, setShowAdd]   = useState(false)
  const [showBudget, setShowBudget] = useState(false)
  const [form, setForm] = useState({ amount: '', category: 'comida', note: '' })
  const [budgetInput, setBudgetInput] = useState('')

  const load = async () => {
    const { data: e } = await supabase.from('trip_budget').select('*').eq('trip_id', tripId).order('created_at')
    if (e) setEntries(e)
    const { data: c } = await supabase.from('trip_config').select('budget,currency').eq('trip_id', tripId).single()
    if (c) { setCfg(c); setBudgetInput(String(c.budget || '')) }
  }

  useEffect(() => { load() }, [tripId])

  const total = entries.reduce((s, e) => s + Number(e.amount), 0)
  const budget = cfg?.budget || 0
  const pct = budget > 0 ? Math.min(100, Math.round(total / budget * 100)) : null
  const currency = cfg?.currency || 'EUR'

  const addEntry = async (e) => {
    e.preventDefault()
    await supabase.from('trip_budget').insert({ trip_id: tripId, ...form, amount: Number(form.amount), paid_by: session.user.id })
    setForm({ amount: '', category: 'comida', note: '' }); setShowAdd(false); load()
  }

  const saveBudget = async (e) => {
    e.preventDefault()
    await supabase.from('trip_config').upsert({ trip_id: tripId, budget: Number(budgetInput), updated_at: new Date().toISOString() })
    setCfg(c => ({ ...c, budget: Number(budgetInput) })); setShowBudget(false)
  }

  const deleteEntry = async (id) => {
    setEntries(prev => prev.filter(e => e.id !== id))
    await supabase.from('trip_budget').delete().eq('id', id)
  }

  const byCat = CATS.map(c => ({ ...c, total: entries.filter(e => e.category === c.id).reduce((s, e) => s + Number(e.amount), 0) }))
    .filter(c => c.total > 0)

  if (!expanded) return (
    <div className="widget p-4 cursor-pointer" style={{ minHeight: 110 }} onClick={() => setExpanded(true)}>
      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-muted)' }}>💰 Presuposto</p>
      <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{total.toFixed(0)}{currency === 'EUR' ? '€' : ' ' + currency}</p>
      {budget > 0 && (
        <>
          <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
            <div className="h-full rounded-full transition-all"
                 style={{ width: `${pct}%`, background: pct > 90 ? '#FF3B30' : 'var(--color-accent)' }} />
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>{pct}% de {budget}{currency === 'EUR' ? '€' : ' ' + currency}</p>
        </>
      )}
      {budget === 0 && <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Toca para xestionar</p>}
    </div>
  )

  return (
    <div className="widget col-span-2 p-4 scale-in">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold" style={{ color: 'var(--color-text)' }}>💰 Presuposto</p>
        <button onClick={() => setExpanded(false)} className="text-xs" style={{ color: 'var(--color-muted)' }}>✕</button>
      </div>

      {/* Totais */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 rounded-xl p-3" style={{ background: 'var(--color-bg)' }}>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Gastado</p>
          <p className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>{total.toFixed(2)}{currency === 'EUR' ? '€' : currency}</p>
        </div>
        {budget > 0 && (
          <div className="flex-1 rounded-xl p-3" style={{ background: 'var(--color-bg)' }}>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Restante</p>
            <p className="text-xl font-bold" style={{ color: budget - total >= 0 ? '#34C759' : '#FF3B30' }}>
              {(budget - total).toFixed(2)}{currency === 'EUR' ? '€' : currency}
            </p>
          </div>
        )}
      </div>

      {budget > 0 && (
        <div className="mb-3 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
          <div className="h-full rounded-full transition-all"
               style={{ width: `${pct}%`, background: pct > 90 ? '#FF3B30' : 'var(--color-accent)' }} />
        </div>
      )}

      {/* Por categoría */}
      {byCat.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {byCat.map(c => (
            <div key={c.id} className="flex items-center gap-2">
              <span className="text-sm">{c.icon}</span>
              <span className="text-xs flex-1" style={{ color: 'var(--color-text)' }}>{c.label}</span>
              <span className="text-xs font-semibold font-mono" style={{ color: 'var(--color-text)' }}>{c.total.toFixed(2)}{currency === 'EUR' ? '€' : currency}</span>
            </div>
          ))}
        </div>
      )}

      {/* Lista de entradas */}
      {entries.length > 0 && (
        <div className="max-h-32 overflow-y-auto space-y-1 mb-3">
          {entries.map(e => {
            const cat = CATS.find(c => c.id === e.category)
            return (
              <div key={e.id} className="flex items-center gap-2 group">
                <span className="text-xs">{cat?.icon}</span>
                <span className="text-xs flex-1 truncate" style={{ color: 'var(--color-muted)' }}>{e.note || cat?.label}</span>
                <span className="text-xs font-mono font-semibold" style={{ color: 'var(--color-text)' }}>{Number(e.amount).toFixed(2)}{currency === 'EUR' ? '€' : currency}</span>
                <button onClick={() => deleteEntry(e.id)} className="text-xs opacity-0 group-hover:opacity-100" style={{ color: '#FF3B30' }}>✕</button>
              </div>
            )
          })}
        </div>
      )}

      {/* Formularios */}
      {showAdd && (
        <form onSubmit={addEntry} className="space-y-2 mb-2 p-3 rounded-xl" style={{ background: 'var(--color-bg)' }}>
          <div className="flex gap-2">
            <input type="number" step="0.01" className="v-input text-sm" style={{ flex: '0 0 90px' }} placeholder="0.00" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required autoFocus />
            <select className="v-input text-sm flex-1" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
              {CATS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
            </select>
          </div>
          <input className="v-input text-sm" placeholder="Nota (opcional)" value={form.note} onChange={e => setForm({...form, note: e.target.value})} />
          <div className="flex gap-2">
            <button type="submit" className="v-btn v-btn-primary v-btn-sm flex-1">Gardar</button>
            <button type="button" onClick={() => setShowAdd(false)} className="v-btn v-btn-secondary v-btn-sm">✕</button>
          </div>
        </form>
      )}

      {showBudget && (
        <form onSubmit={saveBudget} className="flex gap-2 mb-2">
          <input type="number" className="v-input text-sm flex-1" placeholder="Presuposto total" value={budgetInput} onChange={e => setBudgetInput(e.target.value)} autoFocus />
          <button type="submit" className="v-btn v-btn-primary v-btn-sm">OK</button>
        </form>
      )}

      <div className="flex gap-2">
        <button onClick={() => { setShowAdd(v => !v); setShowBudget(false) }} className="v-btn v-btn-primary v-btn-sm flex-1">+ Gasto</button>
        <button onClick={() => { setShowBudget(v => !v); setShowAdd(false) }} className="v-btn v-btn-secondary v-btn-sm">🎯 Límite</button>
      </div>
    </div>
  )
}
