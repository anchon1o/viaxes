import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../App.jsx'

const PRESETS = [
  { name: 'Maleta',  icon: '🧳' },
  { name: 'Compra',  icon: '🛒' },
  { name: 'Tarefas', icon: '✅' },
]

export default function Lists({ tripId }) {
  const session = useSession()
  const [lists, setLists]         = useState([])
  const [items, setItems]         = useState({})
  const [showNew, setShowNew]     = useState(false)
  const [newName, setNewName]     = useState('')
  const [newIcon, setNewIcon]     = useState('📋')
  const [newText, setNewText]     = useState({})
  const [activeList, setActiveList] = useState(null)

  const load = async () => {
    const { data: ls } = await supabase.from('lists').select('*').eq('trip_id', tripId).order('created_at')
    if (!ls) return
    setLists(ls)
    if (!activeList && ls.length > 0) setActiveList(ls[0].id)
    const { data: its } = await supabase.from('list_items').select('*').in('list_id', ls.map(l => l.id)).order('created_at')
    const grouped = {}
    ls.forEach(l => grouped[l.id] = [])
    its?.forEach(it => grouped[it.list_id]?.push(it))
    setItems(grouped)
  }

  useEffect(() => {
    load()
    const ch = supabase.channel(`lists-${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'list_items' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lists', filter: `trip_id=eq.${tripId}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [tripId])

  const createList = async (name, icon) => {
    const { data } = await supabase.from('lists').insert({ trip_id: tripId, name, icon }).select().single()
    if (data) setActiveList(data.id)
    setNewName(''); setShowNew(false)
  }

  const deleteList = async (id) => {
    if (!confirm('Eliminar esta lista e todos os seus elementos?')) return
    await supabase.from('lists').delete().eq('id', id)
    if (activeList === id) setActiveList(null)
  }

  const addItem = async (listId) => {
    const text = (newText[listId] || '').trim()
    if (!text) return
    await supabase.from('list_items').insert({ list_id: listId, text, added_by: session.user.id })
    setNewText({ ...newText, [listId]: '' })
  }

  const toggle = async (item) => {
    await supabase.from('list_items').update({ checked: !item.checked }).eq('id', item.id)
  }

  const deleteItem = async (id) => {
    await supabase.from('list_items').delete().eq('id', id)
  }

  const active = lists.find(l => l.id === activeList)
  const activeItems = activeList ? (items[activeList] || []) : []
  const checked = activeItems.filter(i => i.checked).length

  return (
    <div className="flex gap-6 max-w-3xl">

      {/* Sidebar de listas */}
      <div className="w-44 shrink-0">
        <p className="text-xs font-mono text-mid uppercase tracking-wider mb-3">Listas</p>
        <div className="space-y-0.5">
          {lists.map(l => (
            <div
              key={l.id}
              onClick={() => setActiveList(l.id)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer group ${
                activeList === l.id ? 'bg-soft text-ink' : 'text-mid hover:text-ink hover:bg-soft/50'
              }`}
            >
              <span className="text-sm">{l.icon} {l.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteList(l.id) }}
                className="text-xs text-mid hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-1">
          {!showNew && PRESETS.filter(p => !lists.find(l => l.name === p.name)).map(p => (
            <button
              key={p.name}
              onClick={() => createList(p.name, p.icon)}
              className="w-full text-left px-3 py-1.5 text-xs text-mid hover:text-ink rounded-lg hover:bg-soft transition-colors"
            >
              + {p.icon} {p.name}
            </button>
          ))}
          {!showNew && (
            <button
              onClick={() => setShowNew(true)}
              className="w-full text-left px-3 py-1.5 text-xs text-mid hover:text-ink rounded-lg hover:bg-soft transition-colors"
            >
              + Outra lista
            </button>
          )}
          {showNew && (
            <div className="space-y-1.5 pt-1">
              <input
                autoFocus
                className="input text-sm"
                placeholder="Nome"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && newName.trim() && createList(newName.trim(), newIcon)}
              />
              <div className="flex gap-1 flex-wrap">
                {['📋','✈️','🎒','💊','📷','🎵','🍕','💡'].map(ic => (
                  <button key={ic} onClick={() => setNewIcon(ic)}
                    className={`text-base p-1 rounded ${newIcon === ic ? 'bg-soft' : ''}`}
                  >{ic}</button>
                ))}
              </div>
              <div className="flex gap-1">
                <button onClick={() => newName.trim() && createList(newName.trim(), newIcon)} className="btn-primary text-xs py-1 flex-1">Crear</button>
                <button onClick={() => setShowNew(false)} className="btn-ghost text-xs py-1">✕</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contenido de la lista activa */}
      <div className="flex-1">
        {!active ? (
          <p className="text-sm text-mid pt-2">Selecciona ou crea unha lista.</p>
        ) : (
          <>
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-lg font-semibold text-ink">{active.icon} {active.name}</h2>
              <span className="text-xs font-mono text-mid">{checked}/{activeItems.length}</span>
            </div>

            {/* Items */}
            <div className="space-y-0.5 mb-4">
              {activeItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-soft group">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggle(item)}
                    className="w-4 h-4 accent-accent shrink-0"
                  />
                  <span className={`flex-1 text-sm ${item.checked ? 'line-through text-mid' : 'text-ink'}`}>
                    {item.text}
                  </span>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-xs text-mid hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                  >✕</button>
                </div>
              ))}

              {activeItems.length === 0 && (
                <p className="text-sm text-mid py-4">Lista baleira.</p>
              )}
            </div>

            {/* Añadir item */}
            <form
              onSubmit={(e) => { e.preventDefault(); addItem(active.id) }}
              className="flex gap-2"
            >
              <input
                className="input text-sm flex-1"
                placeholder="Engadir elemento..."
                value={newText[active.id] || ''}
                onChange={e => setNewText({ ...newText, [active.id]: e.target.value })}
              />
              <button type="submit" className="btn-primary text-sm px-4">+</button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
