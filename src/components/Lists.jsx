import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../App.jsx'

// 200 suxestións para a maleta
const MALETA_ITEMS = [
  // Documentación
  'Pasaporte','DNI','Tarxeta sanitaria','Seguro de viaxe','Billetes de avión/tren','Reservas de hotel',
  'Carné de conducir','Tarxeta de crédito','Tarxeta de débito','Diñeiro en efectivo',
  // Roupa
  'Camisetas','Pantalóns','Calzóns/cuecas','Calcetíns','Suxeitador','Pijama','Roupa de abrigo',
  'Chuvasqueiro/chuvia','Bañador','Toalla de praia','Cinturón','Fular/pañuelo','Gorra/sombreiro',
  'Luvas','Abrigo','Jersey/sudadera','Leggins','Roupa interior térmica','Calcetíns de abrigo',
  // Calzado
  'Zapatos para camiñar','Sandalias','Chanclas','Zapatos de vestir','Botas de monte','Zapatillas de deporte',
  // Aseo
  'Cepillo de dentes','Pasta de dentes','Champú','Acondicionador','Xel de ducha','Desodorante',
  'Afeitadora','Creme de afeitar','Maquillaxe','Desmaquillante','Hidratante','Protector solar',
  'Repelente de insectos','Papel hixiénico de viaxe','Compresas/tampóns','Pastillas anticonceptivas',
  'Pinzas','Tijeras de uñas','Lima de uñas','Cotiños','Espello','Perfume','Colonia',
  // Saúde
  'Medicamentos habituais','Analxésicos (ibuprofeno/paracetamol)','Antidiarreico','Antihistamínico',
  'Termómetro','Tiritas','Venda elástica','Alcohol/antiséptico','Crema para picaduras',
  'Pastillas para o estómago','Pastillas para o mareo','Gotas oculares','Protector labial',
  // Electrónica
  'Teléfono móbil','Cargador do móbil','Power bank','Auriculares','iPad/tablet','Cargador iPad',
  'Portátil','Cargador portátil','Cámara de fotos','Batería extra cámara','Tarxetas de memoria',
  'Adaptador de enchufes','Alargador','Reloxo','Smartwatch','Auriculares con cable',
  // Bebé/nenos (se aplica)
  'Chupete','Biberón','Papillas','Cueiro/pañal','Toalliñas húmidas','Mochila portabebés',
  'Xoguetes pequenos','Carrito de bebé',
  // Outros
  'Mochila','Maleta','Neceser','Bolsa de plaia','Paraguas','Gafas de sol','Gafas de reposto',
  'Solución para lentes de contacto','Lentes de contacto','Lentes de reposto',
  'Almofada de viaxe','Antifaz para durmir','Tapóns para os oídos','Manta de viaxe',
  'Libro/ebook','Guía da cidade','Mapa offline descargado','Bolsas ziploc','Etiquetas de equipaxe',
  'Cadeado para maleta','Cinto de seguridade portátil','Adaptador de coche','Snacks para o camiño',
  'Botella de auga reutilizable','Navalla multiusos','Linterna','Pila extra linterna',
  'Impermeable de mochila','Calcetíns extra','Roupa para lavar (sucios)','Bolsa lavandería',
  'Detergente de viaxe','Colgador portátil','Pinzas de roupa','Saco de durmir',
  'Esterilla de yoga','Mancuernas de viaxe','Banda elástica exercicio',
  'Tarxeta SIM internacional','Funda de móbil impermeable','Selfie stick',
  'Tarxeta de fidelidade hotel','Miles & More tarxeta','Visado (se necesario)',
  'Foto de pasaporte extra','Fotocopias documentos','Listado emerxencias/contactos',
  'App de tradución descargada offline','App de mapas offline',
]

const LIST_TYPES = [
  { id: 'checklist',   icon: '✅', label: 'Checklist',   desc: 'Elementos cun tick ao completar' },
  { id: 'estruturada', icon: '📂', label: 'Estruturada', desc: 'Con categorías e subcategorías' },
  { id: 'tarefas',     icon: '🎯', label: 'Tarefas',     desc: 'Con prioridade e barra de progreso' },
]

const PRIORITY = [
  { id: 'alta',  label: '🔴 Alta',  color: '#FF3B30' },
  { id: 'media', label: '🟡 Media', color: '#FF9500' },
  { id: 'baixa', label: '🟢 Baixa', color: '#34C759' },
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
  const [suggestions, setSuggestions] = useState([])

  const load = useCallback(async () => {
    const { data: ls } = await supabase.from('lists').select('*').eq('trip_id', tripId).order('created_at')
    if (!ls) return
    setLists(ls)
    setActiveId(prev => (prev && ls.find(l => l.id === prev)) ? prev : (ls[0]?.id || null))
    if (!ls.length) { setItems({}); return }
    const { data: its } = await supabase.from('list_items').select('*')
      .in('list_id', ls.map(l => l.id)).order('created_at')
    const g = {}
    ls.forEach(l => g[l.id] = [])
    its?.forEach(it => { if (g[it.list_id]) g[it.list_id].push(it) })
    setItems(g)
  }, [tripId])

  useEffect(() => {
    load()
    const ch = supabase.channel(`lists8-${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'list_items' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lists', filter: `trip_id=eq.${tripId}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [load])

  // Suxestións de maleta
  const active = lists.find(l => l.id === activeId)
  const activeItems = useMemo(() => items[activeId] || [], [items, activeId])

  useEffect(() => {
    if (!newText.trim() || active?.type !== 'checklist') { setSuggestions([]); return }
    const existingTexts = activeItems.map(i => i.text.toLowerCase())
    const filtered = MALETA_ITEMS.filter(s =>
      s.toLowerCase().includes(newText.toLowerCase()) &&
      !existingTexts.includes(s.toLowerCase())
    ).slice(0, 5)
    setSuggestions(filtered)
  }, [newText, activeItems, active?.type])

  const createList = async (name, icon, type) => {
    const { data } = await supabase.from('lists')
      .insert({ trip_id: tripId, name, icon, type: type || 'checklist' }).select().single()
    if (data) setActiveId(data.id)
    setShowNew(false); setNewName('')
  }

  const deleteList = async (id) => {
    if (!confirm('Eliminar esta listaxe e todos os seus elementos?')) return
    setLists(prev => prev.filter(l => l.id !== id))
    setItems(prev => { const n = { ...prev }; delete n[id]; return n })
    setActiveId(prev => prev === id ? (lists.find(l => l.id !== id)?.id || null) : prev)
    await supabase.from('lists').delete().eq('id', id)
  }

  const addItem = async (text = newText) => {
    const t = text.trim()
    if (!t || !activeId) return
    const payload = {
      list_id: activeId, text: t,
      added_by: session.user.id, checked: false,
      ...(active?.type === 'estruturada' && { category: newCat || null, level: newLevel }),
      ...(active?.type === 'tarefas'     && { priority: newPrio, progress: 0 }),
    }
    setNewText(''); setSuggestions([])
    const { data } = await supabase.from('list_items').insert(payload).select().single()
    if (data) setItems(prev => ({ ...prev, [activeId]: [...(prev[activeId] || []), data] }))
  }

  const toggle = async (item) => {
    const updated = { ...item, checked: !item.checked }
    setItems(prev => ({ ...prev, [item.list_id]: prev[item.list_id].map(i => i.id === item.id ? updated : i) }))
    await supabase.from('list_items').update({ checked: !item.checked }).eq('id', item.id)
  }

  const deleteItem = async (id, listId) => {
    setItems(prev => ({ ...prev, [listId]: prev[listId].filter(i => i.id !== id) }))
    await supabase.from('list_items').delete().eq('id', id)
  }

  const updateProgress = async (id, progress) => {
    setItems(prev => ({ ...prev, [activeId]: prev[activeId].map(i => i.id === id ? { ...i, progress } : i) }))
    await supabase.from('list_items').update({ progress }).eq('id', id)
  }

  const checked = activeItems.filter(i => i.checked).length
  const totalPct = active?.type === 'tarefas'
    ? Math.round(activeItems.reduce((s, i) => s + (i.progress || 0), 0) / Math.max(activeItems.length, 1))
    : (activeItems.length ? Math.round(checked / activeItems.length * 100) : 0)

  const grouped = active?.type === 'estruturada'
    ? activeItems.reduce((acc, it) => {
        const k = it.category || ''; (acc[k] = acc[k] || []).push(it); return acc
      }, {})
    : null

  return (
    <div className="flex flex-col gap-3">

      {/* Selector de listaxes en horizontal */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {lists.map(l => (
          <button key={l.id} onClick={() => setActiveId(l.id)}
            className="vb vb-sm shrink-0"
            style={{ background: activeId === l.id ? 'var(--color-accent)' : 'var(--color-surface)', color: activeId === l.id ? 'var(--color-accent-fg)' : 'var(--color-text)', border: activeId === l.id ? 'none' : '1px solid var(--color-border)' }}>
            {l.icon} {l.name}
          </button>
        ))}
        {!showNew && PRESETS.filter(p => !lists.find(l => l.name === p.name)).map(p => (
          <button key={p.name} onClick={() => createList(p.name, p.icon, p.type)}
            className="vb vb-sm shrink-0"
            style={{ background: 'var(--color-bg)', color: 'var(--color-muted)', border: '1.5px dashed var(--color-border)' }}>
            + {p.icon} {p.name}
          </button>
        ))}
        <button onClick={() => setShowNew(v => !v)}
          className="vb vb-sm shrink-0"
          style={{ background: 'var(--color-bg)', color: 'var(--color-accent)', border: '1.5px dashed var(--color-accent)' }}>
          {showNew ? '✕' : '+ Nova'}
        </button>
      </div>

      {/* Form nova listaxe */}
      {showNew && (
        <div className="widget p-4 scale-in space-y-3">
          <input autoFocus className="vi" placeholder="Nome da listaxe" value={newName}
            onChange={e => setNewName(e.target.value)} />
          <div className="flex flex-wrap gap-1.5">
            {['📋','✈️','🧳','🛒','💊','📷','🎵','🍕','💡','🎁','🏖️','🎒'].map(ic => (
              <button key={ic} onClick={() => setNewIcon(ic)} style={{ fontSize: 24, padding: 4, background: newIcon === ic ? 'var(--color-accent)' : 'var(--color-bg)', borderRadius: 8 }}>
                {ic}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2">
            {LIST_TYPES.map(t => (
              <button key={t.id} onClick={() => setNewType(t.id)}
                className="flex items-center gap-3 px-3 py-2.5 text-left"
                style={{ borderRadius: 'calc(var(--radius)*0.5)', background: newType === t.id ? 'var(--color-accent)' : 'var(--color-bg)', color: newType === t.id ? 'var(--color-accent-fg)' : 'var(--color-text)' }}>
                <span style={{ fontSize: 22 }}>{t.icon}</span>
                <div>
                  <p className="font-semibold text-sm">{t.label}</p>
                  <p className="text-xs opacity-70">{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => newName.trim() && createList(newName.trim(), newIcon, newType)} className="vb vb-p flex-1">Crear listaxe</button>
            <button onClick={() => setShowNew(false)} className="vb vb-s">Cancelar</button>
          </div>
        </div>
      )}

      {/* Contido da listaxe activa */}
      {!active ? (
        <div className="widget p-8 text-center">
          <p style={{ fontSize: 32 }} className="mb-2">✅</p>
          <p style={{ color: 'var(--color-muted)' }}>Selecciona ou crea unha listaxe</p>
        </div>
      ) : (
        <div className="widget overflow-hidden">
          {/* Cabeceira */}
          <div className="px-4 py-3 border-b flex items-center justify-between"
               style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2">
              <h2 className="font-bold" style={{ fontSize: 18, color: 'var(--color-text)' }}>{active.icon} {active.name}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-bg)', color: 'var(--color-muted)' }}>
                {active.type === 'tarefas' ? `${totalPct}%` : `${checked}/${activeItems.length}`}
              </span>
            </div>
            <button onClick={() => deleteList(active.id)} style={{ fontSize: 20, color: '#FF3B30', background: 'none', border: 'none', cursor: 'pointer' }}>🗑</button>
          </div>

          {/* Barra progreso */}
          {activeItems.length > 0 && (
            <div className="h-1" style={{ background: 'var(--color-border)' }}>
              <div className="h-full transition-all duration-500"
                   style={{ width: `${totalPct}%`, background: totalPct >= 100 ? '#34C759' : 'var(--color-accent)' }} />
            </div>
          )}

          {/* Elementos */}
          <div className="divide-y" style={{ borderColor: 'var(--color-border)', minHeight: 60 }}>

            {/* CHECKLIST */}
            {active.type === 'checklist' && activeItems.map(item => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <input type="checkbox" checked={!!item.checked} onChange={() => toggle(item)}
                  style={{ width: 22, height: 22, accentColor: 'var(--color-accent)', flexShrink: 0, cursor: 'pointer' }} />
                <span className="flex-1" style={{ fontSize: 16, color: 'var(--color-text)', textDecoration: item.checked ? 'line-through' : 'none', opacity: item.checked ? 0.4 : 1 }}>
                  {item.text}
                </span>
                <button onClick={() => deleteItem(item.id, item.list_id)} style={{ fontSize: 20, color: '#FF3B30', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px' }}>✕</button>
              </div>
            ))}

            {/* ESTRUTURADA */}
            {active.type === 'estruturada' && grouped && Object.entries(grouped).map(([cat, catItems]) => (
              <div key={cat}>
                {cat && (
                  <div className="px-4 py-2" style={{ background: 'var(--color-bg)' }}>
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>{cat}</span>
                  </div>
                )}
                {catItems.map(item => (
                  <div key={item.id} className="flex items-center gap-2 py-3 pr-4"
                       style={{ paddingLeft: ((item.level || 0) * 16) + 16 }}>
                    <span style={{ color: 'var(--color-muted)', fontSize: 14 }}>{(item.level || 0) > 0 ? '↳' : '·'}</span>
                    <span className="flex-1" style={{ fontSize: 16, color: 'var(--color-text)' }}>{item.text}</span>
                    <button onClick={() => deleteItem(item.id, item.list_id)} style={{ fontSize: 20, color: '#FF3B30', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px' }}>✕</button>
                  </div>
                ))}
              </div>
            ))}

            {/* TAREFAS */}
            {active.type === 'tarefas' && activeItems.map(item => (
              <div key={item.id} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-3 h-3 rounded-full shrink-0"
                       style={{ background: PRIORITY.find(p => p.id === (item.priority || 'media'))?.color || '#FF9500' }} />
                  <span className="flex-1 font-medium" style={{ fontSize: 15, color: 'var(--color-text)' }}>{item.text}</span>
                  <span className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>{item.progress || 0}%</span>
                  <button onClick={() => deleteItem(item.id, item.list_id)} style={{ fontSize: 20, color: '#FF3B30', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px' }}>✕</button>
                </div>
                <div className="flex items-center gap-2 ml-5">
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${item.progress || 0}%`, background: 'var(--color-accent)' }} />
                  </div>
                  <input type="range" min="0" max="100" step="5" value={item.progress || 0}
                    onChange={e => updateProgress(item.id, Number(e.target.value))}
                    style={{ width: 80, accentColor: 'var(--color-accent)' }} />
                </div>
              </div>
            ))}

            {activeItems.length === 0 && (
              <p className="px-4 py-6 text-center" style={{ fontSize: 15, color: 'var(--color-muted)' }}>
                A listaxe está baleira — engade o primeiro elemento
              </p>
            )}
          </div>

          {/* Campo engadir con suxestións */}
          <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
            {/* Campos extras para tipo estruturada/tarefas */}
            {active.type === 'estruturada' && (
              <div className="flex gap-2 mb-2">
                <input className="vi text-sm" style={{ flex: 2 }} placeholder="Categoría (opcional)"
                  value={newCat} onChange={e => setNewCat(e.target.value)} />
                <select className="vi text-sm" style={{ flex: 1 }} value={newLevel} onChange={e => setNewLevel(Number(e.target.value))}>
                  <option value={0}>Nivel 0</option>
                  <option value={1}>↳ Nivel 1</option>
                  <option value={2}>↳↳ Nivel 2</option>
                </select>
              </div>
            )}
            {active.type === 'tarefas' && (
              <div className="flex gap-1 mb-2">
                {PRIORITY.map(p => (
                  <button key={p.id} onClick={() => setNewPrio(p.id)} className="vb vb-sm flex-1"
                    style={{ background: newPrio === p.id ? p.color : 'var(--color-bg)', color: newPrio === p.id ? '#fff' : 'var(--color-muted)', fontSize: 13 }}>
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            {/* Suxestións */}
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {suggestions.map(s => (
                  <button key={s} onClick={() => addItem(s)}
                    className="text-sm px-3 py-1 rounded-full"
                    style={{ background: 'var(--color-accent)' + '18', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' + '44' }}>
                    + {s}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input className="vi flex-1" placeholder={active.type === 'checklist' ? 'Engadir elemento... (suxestións ao escribir)' : 'Engadir...'}
                value={newText} onChange={e => setNewText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }} />
              <button onClick={() => addItem()} className="vb vb-p vb-sm" style={{ fontSize: 22 }}>+</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
