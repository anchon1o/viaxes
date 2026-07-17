import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../App.jsx'

const LIST_TYPES = [
  { id: 'checklist',   icon: '✅', label: 'Checklist' },
  { id: 'estruturada', icon: '📋', label: 'Estruturada' },
  { id: 'tarefas',     icon: '🎯', label: 'Tarefas' },
]
const PRIORITY = [
  { id: 'alta',  label: 'Alta',  color: '#FF3B30' },
  { id: 'media', label: 'Media', color: '#FF9500' },
  { id: 'baixa', label: 'Baixa', color: '#34C759' },
]
const PRESETS = [
  { name: 'Maleta',  icon: '🧳', type: 'checklist' },
  { name: 'Compra',  icon: '🛒', type: 'checklist' },
  { name: 'Tarefas', icon: '🎯', type: 'tarefas' },
]

export default function Lists({ tripId }) {
  const session = useSession()
  const [lists,    setLists]    = useState([])
  const [items,    setItems]    = useState({})
  const [activeId, setActiveId] = useState(null)
  const [showNew,  setShowNew]  = useState(false)
  const [newName,  setNewName]  = useState('')
  const [newIcon,  setNewIcon]  = useState('📋')
  const [newType,  setNewType]  = useState('checklist')
  const [newText,  setNewText]  = useState('')
  const [newCat,   setNewCat]   = useState('')
  const [newPrio,  setNewPrio]  = useState('media')
  const [newLevel, setNewLevel] = useState(0)

  // Carga completa — sen optimismo, usa realtime para updates
  const load = useCallback(async () => {
    const { data: ls } = await supabase
      .from('lists').select('*').eq('trip_id', tripId).order('created_at')
    if (!ls) return
    setLists(ls)
    setActiveId(prev => prev && ls.find(l => l.id === prev) ? prev : ls[0]?.id || null)
    if (!ls.length) return
    const { data: its } = await supabase
      .from('list_items').select('*')
      .in('list_id', ls.map(l => l.id)).order('created_at')
    const g = {}
    ls.forEach(l => g[l.id] = [])
    its?.forEach(it => { if (g[it.list_id]) g[it.list_id].push(it) })
    setItems(g)
  }, [tripId])

  useEffect(() => {
    load()
    const ch = supabase.channel(`lists-v5-${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'list_items' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lists', filter: `trip_id=eq.${tripId}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  const createList = async (name, icon, type) => {
    const { data } = await supabase.from('lists')
      .insert({ trip_id: tripId, name, icon, type: type || 'checklist' })
      .select().single()
    if (data) setActiveId(data.id)
    setShowNew(false); setNewName('')
  }

  const deleteList = async (id) => {
    if (!confirm('Eliminar esta listaxe?')) return
    setLists(prev => prev.filter(l => l.id !== id))
    setItems(prev => { const n = {...prev}; delete n[id]; return n })
    setActiveId(prev => prev === id ? (lists.find(l => l.id !== id)?.id || null) : prev)
    await supabase.from('lists').delete().eq('id', id)
  }

  const addItem = async () => {
    if (!newText.trim() || !activeId) return
    const active = lists.find(l => l.id === activeId)
    const payload = {
      list_id: activeId,
      text: newText.trim(),
      added_by: session.user.id,
      checked: false,
      ...(active?.type === 'estruturada' && { category: newCat || null, level: newLevel }),
      ...(active?.type === 'tarefas'     && { priority: newPrio, progress: 0 }),
    }
    setNewText('')
    const { data } = await supabase.from('list_items').insert(payload).select().single()
    if (data) {
      setItems(prev => ({
        ...prev,
        [activeId]: [...(prev[activeId] || []), data]
      }))
    }
  }

  const toggle = async (item) => {
    const updated = { ...item, checked: !item.checked }
    setItems(prev => ({
      ...prev,
      [item.list_id]: prev[item.list_id].map(i => i.id === item.id ? updated : i)
    }))
    await supabase.from('list_items').update({ checked: !item.checked }).eq('id', item.id)
  }

  const deleteItem = async (id, listId) => {
    setItems(prev => ({ ...prev, [listId]: prev[listId].filter(i => i.id !== id) }))
    await supabase.from('list_items').delete().eq('id', id)
  }

  const updateProgress = async (id, progress) => {
    setItems(prev => ({
      ...prev,
      [activeId]: prev[activeId].map(i => i.id === id ? { ...i, progress } : i)
    }))
    await supabase.from('list_items').update({ progress }).eq('id', id)
  }

  const active      = lists.find(l => l.id === activeId)
  const activeItems = items[activeId] || []
  const checked     = activeItems.filter(i => i.checked).length
  const totalPct    = active?.type === 'tarefas'
    ? Math.round(activeItems.reduce((s, i) => s + (i.progress || 0), 0) / Math.max(activeItems.length, 1))
    : activeItems.length ? Math.round(checked / activeItems.length * 100) : 0

  const grouped = active?.type === 'estruturada'
    ? activeItems.reduce((acc, it) => {
        const k = it.category || ''
        ;(acc[k] = acc[k] || []).push(it)
        return acc
      }, {})
    : null

  return (
    <div className="flex flex-col sm:flex-row gap-4">

      {/* Sidebar */}
      <div className="sm:w-48 shrink-0">
        <div className="widget p-2 space-y-0.5">
          {lists.map(l => (
            <div key={l.id} onClick={() => setActiveId(l.id)}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer group"
              style={{ background: activeId === l.id ? 'var(--color-accent)' : 'transparent' }}>
              <span className="text-sm font-medium" style={{ color: activeId === l.id ? 'var(--color-accent-fg)' : 'var(--color-text)' }}>
                {l.icon} {l.name}
              </span>
              <button onClick={e => { e.stopPropagation(); deleteList(l.id) }}
                className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: activeId === l.id ? 'rgba(255,255,255,0.7)' : '#FF3B30' }}>✕</button>
            </div>
          ))}

          <div className="pt-2 space-y-0.5 border-t" style={{ borderColor: 'var(--color-border)' }}>
            {!showNew && PRESETS.filter(p => !lists.find(l => l.name === p.name)).map(p => (
              <button key={p.name} onClick={() => createList(p.name, p.icon, p.type)}
                className="w-full text-left px-3 py-2 rounded-xl text-xs"
                style={{ color: 'var(--color-muted)' }}>+ {p.icon} {p.name}</button>
            ))}
            {!showNew && (
              <button onClick={() => setShowNew(true)}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold"
                style={{ color: 'var(--color-accent)' }}>+ Nova listaxe</button>
            )}
            {showNew && (
              <div className="space-y-2 pt-1">
                <input autoFocus className="v-input text-sm" placeholder="Nome" value={newName}
                  onChange={e => setNewName(e.target.value)} />
                <div className="flex flex-wrap gap-1">
                  {['📋','✈️','🎒','💊','📷','🎵','🍕','💡','🎁','🏖️'].map(ic => (
                    <button key={ic} onClick={() => setNewIcon(ic)} className="text-lg p-1 rounded-lg"
                      style={{ background: newIcon === ic ? 'var(--color-accent)' : 'var(--color-bg)' }}>{ic}</button>
                  ))}
                </div>
                <div className="space-y-1">
                  {LIST_TYPES.map(t => (
                    <button key={t.id} onClick={() => setNewType(t.id)}
                      className="w-full text-left px-2 py-1.5 rounded-lg text-xs"
                      style={{ background: newType === t.id ? 'var(--color-accent)' : 'var(--color-bg)', color: newType === t.id ? 'var(--color-accent-fg)' : 'var(--color-muted)' }}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => newName.trim() && createList(newName.trim(), newIcon, newType)}
                    className="v-btn v-btn-primary v-btn-sm flex-1">Crear</button>
                  <button onClick={() => setShowNew(false)} className="v-btn v-btn-secondary v-btn-sm">✕</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contido */}
      <div className="flex-1 min-w-0">
        {!active ? (
          <div className="widget p-8 text-center">
            <p className="text-3xl mb-2">✅</p>
            <p style={{ color: 'var(--color-muted)' }}>Selecciona ou crea unha listaxe.</p>
          </div>
        ) : (
          <div className="widget overflow-hidden">
            {/* Header */}
            <div className="px-4 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                  {active.icon} {active.name}
                </h2>
                <span className="text-sm font-mono" style={{ color: 'var(--color-muted)' }}>
                  {active.type === 'tarefas' ? `${totalPct}%` : `${checked}/${activeItems.length}`}
                </span>
              </div>
              {activeItems.length > 0 && (
                <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                       style={{ width: `${totalPct}%`, background: totalPct > 90 ? '#34C759' : 'var(--color-accent)' }} />
                </div>
              )}
            </div>

            {/* Items */}
            <div className="divide-y" style={{ borderColor: 'var(--color-border)', minHeight: 60 }}>
              {active.type === 'checklist' && activeItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3 group">
                  <input type="checkbox" checked={!!item.checked} onChange={() => toggle(item)}
                    className="w-5 h-5 shrink-0" style={{ accentColor: 'var(--color-accent)' }} />
                  <span className="flex-1 text-sm" style={{
                    color: 'var(--color-text)',
                    textDecoration: item.checked ? 'line-through' : 'none',
                    opacity: item.checked ? 0.4 : 1,
                  }}>{item.text}</span>
                  <button onClick={() => deleteItem(item.id, item.list_id)}
                    className="opacity-0 group-hover:opacity-100 text-xs transition-opacity"
                    style={{ color: '#FF3B30' }}>✕</button>
                </div>
              ))}

              {active.type === 'estruturada' && grouped && Object.entries(grouped).map(([cat, catItems]) => (
                <div key={cat}>
                  {cat && (
                    <div className="px-4 py-1.5" style={{ background: 'var(--color-bg)' }}>
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>{cat}</span>
                    </div>
                  )}
                  {catItems.map(item => (
                    <div key={item.id} className="flex items-center gap-2 py-2.5 pr-4 group"
                         style={{ paddingLeft: ((item.level || 0) * 16) + 16 }}>
                      <span style={{ color: 'var(--color-muted)', fontSize: 12 }}>{(item.level || 0) > 0 ? '↳' : '·'}</span>
                      <span className="flex-1 text-sm" style={{ color: 'var(--color-text)' }}>{item.text}</span>
                      <button onClick={() => deleteItem(item.id, item.list_id)}
                        className="opacity-0 group-hover:opacity-100 text-xs" style={{ color: '#FF3B30' }}>✕</button>
                    </div>
                  ))}
                </div>
              ))}

              {active.type === 'tarefas' && activeItems.map(item => (
                <div key={item.id} className="px-4 py-3 group">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0"
                         style={{ background: PRIORITY.find(p => p.id === (item.priority || 'media'))?.color || '#FF9500' }} />
                    <span className="flex-1 text-sm font-medium" style={{ color: 'var(--color-text)' }}>{item.text}</span>
                    <span className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>{item.progress || 0}%</span>
                    <button onClick={() => deleteItem(item.id, item.list_id)}
                      className="opacity-0 group-hover:opacity-100 text-xs" style={{ color: '#FF3B30' }}>✕</button>
                  </div>
                  <div className="mt-2 flex items-center gap-2 ml-4">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                      <div className="h-full rounded-full transition-all"
                           style={{ width: `${item.progress || 0}%`, background: 'var(--color-accent)' }} />
                    </div>
                    <input type="range" min="0" max="100" step="5" value={item.progress || 0}
                      onChange={e => updateProgress(item.id, Number(e.target.value))}
                      className="w-20" style={{ accentColor: 'var(--color-accent)' }} />
                  </div>
                </div>
              ))}

              {activeItems.length === 0 && (
                <p className="px-4 py-6 text-sm text-center" style={{ color: 'var(--color-muted)' }}>
                  A listaxe está baleira — engade o primeiro elemento
                </p>
              )}
            </div>

            {/* Engadir */}
            <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex gap-2 flex-wrap">
                {active.type === 'estruturada' && (
                  <>
                    <input className="v-input text-sm" style={{ width: 90, flex: 'none' }} placeholder="Categoría"
                      value={newCat} onChange={e => setNewCat(e.target.value)} />
                    <select className="v-input text-sm" style={{ width: 80, flex: 'none' }}
                      value={newLevel} onChange={e => setNewLevel(Number(e.target.value))}>
                      <option value={0}>Nivel 0</option>
                      <option value={1}>Nivel 1</option>
                      <option value={2}>Nivel 2</option>
                    </select>
                  </>
                )}
                {active.type === 'tarefas' && (
                  <select className="v-input text-sm" style={{ width: 90, flex: 'none' }}
                    value={newPrio} onChange={e => setNewPrio(e.target.value)}>
                    {PRIORITY.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                )}
                <input className="v-input text-sm flex-1" placeholder="Engadir elemento..."
                  value={newText} onChange={e => setNewText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }} />
                <button onClick={addItem} className="v-btn v-btn-primary v-btn-sm">+</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
