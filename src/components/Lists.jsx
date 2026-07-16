import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../App.jsx'

export default function Lists({ tripId }) {
  const session = useSession()
  const [lists, setLists] = useState([])
  const [items, setItems] = useState({}) // list_id -> [items]
  const [newListName, setNewListName] = useState('')
  const [showNewList, setShowNewList] = useState(false)
  const [newItemText, setNewItemText] = useState({}) // list_id -> texto

  const load = async () => {
    const { data: listsData } = await supabase
      .from('lists')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true })
    if (!listsData) return
    setLists(listsData)

    const { data: itemsData } = await supabase
      .from('list_items')
      .select('*')
      .in('list_id', listsData.map((l) => l.id))
      .order('created_at', { ascending: true })

    const grouped = {}
    listsData.forEach((l) => (grouped[l.id] = []))
    itemsData?.forEach((it) => grouped[it.list_id]?.push(it))
    setItems(grouped)
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`lists-${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'list_items' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lists', filter: `trip_id=eq.${tripId}` }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [tripId])

  const createList = async (e, preset) => {
    e?.preventDefault()
    const name = preset || newListName.trim()
    if (!name) return
    await supabase.from('lists').insert({ trip_id: tripId, name, icon: preset === 'Maleta' ? '🧳' : preset === 'Compra' ? '🛒' : '📋' })
    setNewListName('')
    setShowNewList(false)
  }

  const addItem = async (listId) => {
    const text = (newItemText[listId] || '').trim()
    if (!text) return
    await supabase.from('list_items').insert({
      list_id: listId,
      text,
      added_by: session.user.id,
    })
    setNewItemText({ ...newItemText, [listId]: '' })
  }

  const toggleItem = async (item) => {
    await supabase.from('list_items').update({ checked: !item.checked }).eq('id', item.id)
  }

  const deleteItem = async (id) => {
    await supabase.from('list_items').delete().eq('id', id)
  }

  const deleteList = async (id) => {
    await supabase.from('lists').delete().eq('id', id)
  }

  return (
    <div>
      {lists.length === 0 && !showNewList && (
        <div className="text-center py-6 space-y-3">
          <p className="text-charcoal/50">Non hai listas aínda. Crea a primeira:</p>
          <div className="flex gap-2 justify-center flex-wrap">
            <button onClick={(e) => createList(e, 'Maleta')} className="bg-paperdark px-4 py-2 rounded-full text-sm font-medium hover:bg-brand hover:text-white transition-colors">
              🧳 Maleta
            </button>
            <button onClick={(e) => createList(e, 'Compra')} className="bg-paperdark px-4 py-2 rounded-full text-sm font-medium hover:bg-brand hover:text-white transition-colors">
              🛒 Compra
            </button>
            <button onClick={() => setShowNewList(true)} className="bg-paperdark px-4 py-2 rounded-full text-sm font-medium hover:bg-brand hover:text-white transition-colors">
              + Outra
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {lists.map((list) => {
          const listItems = items[list.id] || []
          const checkedCount = listItems.filter((i) => i.checked).length
          return (
            <div key={list.id} className="stamp-card rounded-2xl shadow-stamp p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-display text-lg text-ink font-semibold">
                  {list.icon} {list.name}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-charcoal/40">
                    {checkedCount}/{listItems.length}
                  </span>
                  <button onClick={() => deleteList(list.id)} className="text-charcoal/30 hover:text-coral text-xs">
                    ✕
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 mb-3">
                {listItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 group">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleItem(item)}
                      className="w-4 h-4 accent-brand"
                    />
                    <span className={`flex-1 text-sm ${item.checked ? 'line-through text-charcoal/40' : 'text-charcoal'}`}>
                      {item.text}
                    </span>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="text-charcoal/20 hover:text-coral opacity-0 group-hover:opacity-100 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  addItem(list.id)
                }}
                className="flex gap-2"
              >
                <input
                  value={newItemText[list.id] || ''}
                  onChange={(e) => setNewItemText({ ...newItemText, [list.id]: e.target.value })}
                  placeholder="Engadir elemento..."
                  className="flex-1 border border-ink/15 rounded-lg px-2 py-1.5 text-sm"
                />
                <button type="submit" className="bg-brand text-white px-3 rounded-lg text-sm">
                  +
                </button>
              </form>
            </div>
          )
        })}
      </div>

      {lists.length > 0 && (
        <div className="mt-4">
          {showNewList ? (
            <form onSubmit={createList} className="flex gap-2">
              <input
                autoFocus
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Nome da nova lista"
                className="flex-1 border border-ink/15 rounded-lg px-3 py-2 text-sm"
              />
              <button type="submit" className="bg-brand text-white px-4 rounded-lg text-sm">
                Crear
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowNewList(true)}
              className="w-full border-2 border-dashed border-ink/20 rounded-xl py-2.5 text-sm text-ink/50 hover:border-brand hover:text-brand transition-colors"
            >
              + Nova lista
            </button>
          )}
        </div>
      )}
    </div>
  )
}
