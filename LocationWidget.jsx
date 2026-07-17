import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../App.jsx'

const TYPES = [
  { id: 'accion', icon: '⚡', label: 'Acción',  desc: 'Fai algo específico' },
  { id: 'foto',   icon: '📷', label: 'Foto',    desc: 'Saca unha foto como proba' },
  { id: 'texto',  icon: '✍️', label: 'Resposta', desc: 'Responde a unha pregunta' },
  { id: 'lugar',  icon: '📍', label: 'Lugar',    desc: 'Chega a un lugar concreto' },
]

const STATUS_CONFIG = {
  pendente:   { label: 'Pendente',   color: '#FF9500', bg: '#FF950022' },
  aceptado:   { label: 'Aceptado',   color: '#007AFF', bg: '#007AFF22' },
  completado: { label: 'Completado', color: '#34C759', bg: '#34C75922' },
  rexeitado:  { label: 'Rexeitado', color: '#FF3B30', bg: '#FF3B3022' },
}

export default function ChallengesTab({ tripId }) {
  const session = useSession()
  const [challenges, setChallenges] = useState([])
  const [members,    setMembers]    = useState([])
  const [showNew,    setShowNew]    = useState(false)
  const [selected,   setSelected]   = useState(null) // para ver detalle
  const [proofText,  setProofText]  = useState('')
  const [uploading,  setUploading]  = useState(false)
  const fileRef = useRef(null)
  const [form, setForm] = useState({
    title: '', description: '', type: 'accion', points: 10, deadline: '', assigned_to: ''
  })

  const myId = session?.user?.id

  const load = async () => {
    const { data } = await supabase.from('trip_challenges').select('*')
      .eq('trip_id', tripId).order('created_at', { ascending: false })
    if (data) setChallenges(data)

    // Cargar membros para poder asignar retos
    const { data: tm } = await supabase.from('trip_members').select('user_id').eq('trip_id', tripId)
    if (tm) {
      const ids = tm.map(m => m.user_id).filter(id => id !== myId)
      if (ids.length) {
        const { data: users } = await supabase.from('user_settings').select('user_id').in('user_id', ids)
        // Gardar IDs dos outros membros
        setMembers(ids)
      } else {
        setMembers(ids)
      }
    }
  }

  useEffect(() => {
    load()
    const ch = supabase.channel(`challenges-${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_challenges', filter: `trip_id=eq.${tripId}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [tripId])

  const create = async (e) => {
    e.preventDefault()
    await supabase.from('trip_challenges').insert({
      trip_id:     tripId,
      created_by:  myId,
      assigned_to: form.assigned_to || members[0] || null,
      title:       form.title,
      description: form.description || null,
      type:        form.type,
      points:      Number(form.points),
      deadline:    form.deadline || null,
      status:      'pendente',
    })
    setForm({ title:'', description:'', type:'accion', points:10, deadline:'', assigned_to:'' })
    setShowNew(false)
  }

  const updateStatus = async (id, status) => {
    await supabase.from('trip_challenges').update({
      status,
      completed_at: status === 'completado' ? new Date().toISOString() : null
    }).eq('id', id)
  }

  const submitProof = async (challenge, text, url) => {
    await supabase.from('trip_challenges').update({
      status: 'completado',
      proof_text: text || null,
      proof_url: url || null,
      completed_at: new Date().toISOString(),
    }).eq('id', challenge.id)
    setSelected(null); setProofText('')
  }

  const uploadProofPhoto = async (file, challenge) => {
    setUploading(true)
    const path = `${tripId}/reto-${challenge.id}-${Date.now()}.jpg`
    const { error } = await supabase.storage.from('trip-media').upload(path, file)
    if (!error) {
      const { data } = supabase.storage.from('trip-media').getPublicUrl(path)
      await submitProof(challenge, null, data.publicUrl)
    }
    setUploading(false)
  }

  const deleteChallenge = async (id) => {
    if (!confirm('Eliminar este reto?')) return
    setChallenges(prev => prev.filter(c => c.id !== id))
    await supabase.from('trip_challenges').delete().eq('id', id)
  }

  // Puntos por usuario
  const myPoints  = challenges.filter(c => c.assigned_to === myId && c.status === 'completado').reduce((s, c) => s + c.points, 0)
  const theirPoints = challenges.filter(c => c.assigned_to !== myId && c.status === 'completado').reduce((s, c) => s + c.points, 0)

  const myPending    = challenges.filter(c => c.assigned_to === myId && c.status === 'pendente')
  const myActive     = challenges.filter(c => c.assigned_to === myId && c.status === 'aceptado')
  const theirPending = challenges.filter(c => c.created_by === myId && c.assigned_to !== myId)
  const completed    = challenges.filter(c => c.status === 'completado')

  return (
    <div className="max-w-2xl mx-auto">

      {/* Marcador */}
      <div className="widget p-5 mb-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>⚔️ Retos</h2>
          <button onClick={() => setShowNew(v => !v)} className="v-btn v-btn-primary v-btn-sm">
            {showNew ? '✕' : '+ Reto'}
          </button>
        </div>
        <div className="flex gap-4 mt-3">
          <div className="flex-1 text-center p-3 rounded-xl" style={{ background: 'var(--color-bg)' }}>
            <p className="text-3xl font-bold" style={{ color: 'var(--color-accent)' }}>{myPoints}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Os teus puntos</p>
          </div>
          <div className="flex items-center justify-center text-2xl font-bold" style={{ color: 'var(--color-muted)' }}>VS</div>
          <div className="flex-1 text-center p-3 rounded-xl" style={{ background: 'var(--color-bg)' }}>
            <p className="text-3xl font-bold" style={{ color: '#FF2D55' }}>{theirPoints}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Puntos dela</p>
          </div>
        </div>
        {myPoints !== theirPoints && (
          <p className="text-center text-xs mt-2 font-semibold"
             style={{ color: myPoints > theirPoints ? '#34C759' : '#FF3B30' }}>
            {myPoints > theirPoints ? '🏆 Vas gañando!' : '⚡ Tes que remontar!'}
          </p>
        )}
        {myPoints === theirPoints && challenges.length > 0 && (
          <p className="text-center text-xs mt-2" style={{ color: 'var(--color-muted)' }}>🤝 Empate!</p>
        )}
      </div>

      {/* Formulario novo reto */}
      {showNew && (
        <form onSubmit={create} className="widget p-5 mb-4 scale-in space-y-3">
          <p className="font-semibold" style={{ color: 'var(--color-text)' }}>Novo reto</p>
          <input className="v-input text-sm" placeholder="Título do reto" value={form.title}
            onChange={e => setForm({...form, title: e.target.value})} autoFocus required />
          <textarea className="v-input text-sm" placeholder="Descrición (opcional)" rows={2}
            value={form.description} onChange={e => setForm({...form, description: e.target.value})}
            style={{ resize: 'none' }} />

          {/* Tipo */}
          <div className="grid grid-cols-2 gap-1.5">
            {TYPES.map(t => (
              <button key={t.id} type="button" onClick={() => setForm({...form, type: t.id})}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left transition-all"
                style={{ background: form.type === t.id ? 'var(--color-accent)' : 'var(--color-bg)', color: form.type === t.id ? 'var(--color-accent-fg)' : 'var(--color-text)' }}>
                <span>{t.icon}</span>
                <div>
                  <p className="font-medium text-xs">{t.label}</p>
                  <p className="text-xs opacity-60">{t.desc}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--color-muted)' }}>Puntos</label>
              <input type="number" className="v-input text-sm" min="1" max="100" value={form.points}
                onChange={e => setForm({...form, points: e.target.value})} />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--color-muted)' }}>Prazo</label>
              <input type="date" className="v-input text-sm font-mono" value={form.deadline}
                onChange={e => setForm({...form, deadline: e.target.value})} />
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="v-btn v-btn-primary flex-1">Enviar reto 🎯</button>
            <button type="button" onClick={() => setShowNew(false)} className="v-btn v-btn-secondary">Cancelar</button>
          </div>
        </form>
      )}

      {/* Retos pendentes para min */}
      {myPending.length > 0 && (
        <section className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#FF9500' }}>
            ⚡ Retos que tes pendentes ({myPending.length})
          </p>
          <div className="space-y-2">
            {myPending.map(c => (
              <ChallengeCard key={c.id} c={c} myId={myId}
                onAccept={() => updateStatus(c.id, 'aceptado')}
                onReject={() => updateStatus(c.id, 'rexeitado')}
                onSelect={() => setSelected(c)}
                onDelete={() => deleteChallenge(c.id)} />
            ))}
          </div>
        </section>
      )}

      {/* Retos activos (aceptados) */}
      {myActive.length > 0 && (
        <section className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#007AFF' }}>
            🔥 En curso ({myActive.length})
          </p>
          <div className="space-y-2">
            {myActive.map(c => (
              <ChallengeCard key={c.id} c={c} myId={myId}
                onSelect={() => setSelected(c)}
                onDelete={() => deleteChallenge(c.id)} />
            ))}
          </div>
        </section>
      )}

      {/* Retos que eu criei */}
      {theirPending.length > 0 && (
        <section className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-muted)' }}>
            📤 Retos que enviaches
          </p>
          <div className="space-y-2">
            {theirPending.map(c => (
              <ChallengeCard key={c.id} c={c} myId={myId}
                onDelete={() => deleteChallenge(c.id)} />
            ))}
          </div>
        </section>
      )}

      {/* Completados */}
      {completed.length > 0 && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#34C759' }}>
            🏆 Completados ({completed.length})
          </p>
          <div className="space-y-2">
            {completed.map(c => (
              <ChallengeCard key={c.id} c={c} myId={myId}
                onDelete={() => deleteChallenge(c.id)} />
            ))}
          </div>
        </section>
      )}

      {challenges.length === 0 && (
        <div className="widget p-8 text-center">
          <p className="text-4xl mb-2">⚔️</p>
          <p className="font-semibold" style={{ color: 'var(--color-text)' }}>Sen retos aínda</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Crea o primeiro reto e desafía á outra persoa a completalo
          </p>
        </div>
      )}

      {/* Modal completar reto */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4"
             style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
             onClick={() => setSelected(null)}>
          <div className="widget w-full max-w-sm p-5 scale-in" onClick={e => e.stopPropagation()}>
            <p className="font-bold text-lg mb-1" style={{ color: 'var(--color-text)' }}>{selected.title}</p>
            {selected.description && (
              <p className="text-sm mb-3" style={{ color: 'var(--color-muted)' }}>{selected.description}</p>
            )}
            <div className="flex items-center gap-2 mb-4">
              <span>{TYPES.find(t => t.id === selected.type)?.icon}</span>
              <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
                {TYPES.find(t => t.id === selected.type)?.label}
              </span>
              <span className="pill ml-auto" style={{ fontSize: 11 }}>+{selected.points} pts</span>
            </div>

            {selected.status === 'pendente' && (
              <div className="flex gap-2">
                <button onClick={() => { updateStatus(selected.id, 'aceptado'); setSelected(null) }}
                  className="v-btn v-btn-primary flex-1">✅ Aceptar reto</button>
                <button onClick={() => { updateStatus(selected.id, 'rexeitado'); setSelected(null) }}
                  className="v-btn v-btn-secondary">✕ Rexeitar</button>
              </div>
            )}

            {selected.status === 'aceptado' && (
              <div className="space-y-3">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Enviar proba:</p>
                {(selected.type === 'texto' || selected.type === 'lugar' || selected.type === 'accion') && (
                  <div>
                    <textarea className="v-input text-sm" rows={3} placeholder="Describe como completaches o reto..."
                      value={proofText} onChange={e => setProofText(e.target.value)} style={{ resize: 'none' }} />
                    <button onClick={() => submitProof(selected, proofText, null)}
                      disabled={!proofText.trim()} className="v-btn v-btn-primary w-full mt-2">
                      Marcar como completado ✓
                    </button>
                  </div>
                )}
                {selected.type === 'foto' && (
                  <div className="text-center">
                    <input ref={fileRef} type="file" accept="image/*" capture="environment"
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadProofPhoto(f, selected) }}
                      className="hidden" />
                    <button onClick={() => fileRef.current?.click()} disabled={uploading}
                      className="v-btn v-btn-primary w-full">
                      {uploading ? 'Subindo...' : '📷 Facer foto como proba'}
                    </button>
                    {!uploading && (
                      <button onClick={() => submitProof(selected, 'Completado sen foto', null)}
                        className="v-btn v-btn-ghost v-btn-sm mt-2 w-full">
                        Marcar como completado sen foto
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {selected.status === 'completado' && (
              <div className="text-center py-2">
                <p className="text-2xl mb-1">🏆</p>
                <p className="font-semibold" style={{ color: '#34C759' }}>Reto completado!</p>
                {selected.proof_text && (
                  <p className="text-sm mt-2" style={{ color: 'var(--color-muted)' }}>"{selected.proof_text}"</p>
                )}
                {selected.proof_url && (
                  <img src={selected.proof_url} alt="Proba" className="rounded-xl mt-2 w-full object-cover" style={{ maxHeight: 200 }} />
                )}
              </div>
            )}

            <button onClick={() => setSelected(null)} className="v-btn v-btn-ghost v-btn-sm w-full mt-3">Pechar</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ChallengeCard({ c, myId, onAccept, onReject, onSelect, onDelete }) {
  const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.pendente
  const typeInfo  = TYPES.find(t => t.id === c.type) || TYPES[0]
  const isAssignedToMe = c.assigned_to === myId
  const isMine    = c.created_by === myId

  return (
    <div className="widget p-4 group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span>{typeInfo.icon}</span>
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{c.title}</p>
          </div>
          {c.description && (
            <p className="text-xs mb-2" style={{ color: 'var(--color-muted)' }}>{c.description}</p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: statusCfg.bg, color: statusCfg.color }}>
              {statusCfg.label}
            </span>
            <span className="text-xs font-bold" style={{ color: 'var(--color-accent)' }}>+{c.points} pts</span>
            {c.deadline && (
              <span className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>📅 {c.deadline}</span>
            )}
            <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
              {isAssignedToMe ? '← Para ti' : '→ Para ela'}
            </span>
          </div>

          {/* Proba completada */}
          {c.status === 'completado' && c.proof_url && (
            <img src={c.proof_url} alt="Proba" className="rounded-xl mt-2 w-24 h-16 object-cover" />
          )}
          {c.status === 'completado' && c.proof_text && (
            <p className="text-xs mt-1 italic" style={{ color: 'var(--color-muted)' }}>"{c.proof_text}"</p>
          )}
        </div>

        <div className="flex flex-col gap-1 shrink-0">
          {onDelete && isMine && (
            <button onClick={onDelete} className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: '#FF3B30' }}>✕</button>
          )}
        </div>
      </div>

      {/* Accións */}
      {isAssignedToMe && c.status === 'pendente' && (
        <div className="flex gap-2 mt-3">
          <button onClick={onAccept} className="v-btn v-btn-primary v-btn-sm flex-1">✅ Aceptar</button>
          <button onClick={onReject} className="v-btn v-btn-secondary v-btn-sm">✕ Rexeitar</button>
        </div>
      )}
      {isAssignedToMe && c.status === 'aceptado' && (
        <button onClick={onSelect} className="v-btn v-btn-primary v-btn-sm w-full mt-3">
          🎯 Completar reto
        </button>
      )}
      {isAssignedToMe && c.status === 'pendente' && (
        <button onClick={onSelect} className="v-btn v-btn-ghost v-btn-sm w-full mt-1 text-xs">
          Ver detalles
        </button>
      )}
    </div>
  )
}
