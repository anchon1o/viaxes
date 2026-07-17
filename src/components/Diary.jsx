import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../App.jsx'
import DrawingPad from './DrawingPad.jsx'

const MODES = [
  { id: 'texto',  icon: '✍️',  label: 'Texto' },
  { id: 'foto',   icon: '📷',  label: 'Foto' },
  { id: 'video',  icon: '🎬',  label: 'Vídeo' },
  { id: 'audio',  icon: '🎙️', label: 'Audio' },
  { id: 'debuxo', icon: '✏️',  label: 'Debuxo' },
]

// Comprimir imaxe antes de subir (reduce ~70% o tamaño)
async function compressImage(file, maxW = 1400, quality = 0.82) {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width)
      const canvas = document.createElement('canvas')
      canvas.width  = img.width  * scale
      canvas.height = img.height * scale
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => { URL.revokeObjectURL(url); resolve(blob) }, 'image/jpeg', quality)
    }
    img.src = url
  })
}

const fmtDate = (iso) => new Date(iso).toLocaleDateString('gl', { weekday: 'long', day: 'numeric', month: 'long' })
const fmtTime = (iso) => new Date(iso).toLocaleTimeString('gl', { hour: '2-digit', minute: '2-digit' })

const TYPE_ICON = { texto: '✍️', foto: '📷', video: '🎬', audio: '🎙️', debuxo: '✏️' }

export default function Diary({ tripId }) {
  const session = useSession()
  const [entries, setEntries]     = useState([])
  const [mode, setMode]           = useState('texto')
  const [text, setText]           = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState('')
  const [recording, setRecording] = useState(false)
  const [viewMode, setViewMode]   = useState('lineal') // lineal | muro
  const fileRef   = useRef(null)
  const videoRef  = useRef(null)
  const recRef    = useRef(null)
  const chunksRef = useRef([])

  const load = async () => {
    const { data } = await supabase.from('diary_entries').select('*').eq('trip_id', tripId).order('created_at', { ascending: false })
    if (data) setEntries(data)
  }

  useEffect(() => {
    load()
    const ch = supabase.channel(`diary-${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'diary_entries', filter: `trip_id=eq.${tripId}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [tripId])

  const saveEntry = async ({ type, content }) => {
    await supabase.from('diary_entries').insert({ trip_id: tripId, author_id: session.user.id, type, content })
  }

  const upload = async (blob, ext, type) => {
    setUploading(true); setProgress('Subindo...')
    const path = `${tripId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('trip-media').upload(path, blob)
    if (!error) {
      const { data } = supabase.storage.from('trip-media').getPublicUrl(path)
      await saveEntry({ type, content: data.publicUrl })
    }
    setUploading(false); setProgress('')
  }

  const handleText = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    await saveEntry({ type: 'texto', content: text.trim() })
    setText('')
  }

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setProgress('Comprimindo imaxe...')
    const compressed = await compressImage(file)
    await upload(compressed, 'jpg', 'foto')
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleVideo = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    // Vídeo: limit 30MB, non comprimimos (é video)
    if (file.size > 30 * 1024 * 1024) { alert('O vídeo non pode superar os 30MB'); return }
    const ext = file.name.split('.').pop() || 'mp4'
    await upload(file, ext, 'video')
    if (videoRef.current) videoRef.current.value = ''
  }

  const startRec = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const rec = new MediaRecorder(stream)
    chunksRef.current = []
    rec.ondataavailable = e => chunksRef.current.push(e.data)
    rec.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      await upload(blob, 'webm', 'audio')
      stream.getTracks().forEach(t => t.stop())
    }
    rec.start(); recRef.current = rec; setRecording(true)
  }
  const stopRec = () => { recRef.current?.stop(); setRecording(false) }

  const handleDrawing = async (dataUrl) => {
    const blob = await (await fetch(dataUrl)).blob()
    await upload(blob, 'png', 'debuxo')
  }

  const remove = async (id) => {
    if (!confirm('Eliminar esta entrada?')) return
    await supabase.from('diary_entries').delete().eq('id', id)
  }

  // Agrupa por data
  const grouped = entries.reduce((acc, e) => {
    const d = e.created_at.slice(0, 10)
    ;(acc[d] = acc[d] || []).push(e)
    return acc
  }, {})

  const mediaEntries = entries.filter(e => ['foto','video','debuxo'].includes(e.type))

  return (
    <div className="max-w-2xl mx-auto">

      {/* Selector de modo */}
      <div className="widget p-1.5 flex gap-1 mb-4">
        {MODES.map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs font-medium transition-all"
            style={{ background: mode === m.id ? 'var(--color-accent)' : 'transparent', color: mode === m.id ? '#fff' : 'var(--color-muted)' }}>
            <span className="text-lg leading-none">{m.icon}</span>
            <span className="hidden sm:block">{m.label}</span>
          </button>
        ))}
      </div>

      {/* Panel de entrada */}
      <div className="widget p-4 mb-5">
        {mode === 'texto' && (
          <form onSubmit={handleText} className="space-y-3">
            <textarea value={text} onChange={e => setText(e.target.value)}
              placeholder="Escribe aquí o que aconteceu, o que sentiste, o que queres recordar..."
              rows={4} className="v-input" style={{ resize: 'vertical' }} />
            <button type="submit" disabled={!text.trim()} className="v-btn v-btn-primary v-btn-sm">
              Gardar nota
            </button>
          </form>
        )}

        {mode === 'foto' && (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">📷</div>
            <p className="text-sm mb-3" style={{ color: 'var(--color-muted)' }}>As fotos comprimiranse automaticamente (−70% de tamaño)</p>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="v-btn v-btn-primary">
              {uploading ? progress || 'Subindo...' : 'Facer/escoller foto'}
            </button>
          </div>
        )}

        {mode === 'video' && (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">🎬</div>
            <p className="text-sm mb-3" style={{ color: 'var(--color-muted)' }}>Vídeos curtos (máx. 30MB)</p>
            <input ref={videoRef} type="file" accept="video/*" capture="environment" onChange={handleVideo} className="hidden" />
            <button onClick={() => videoRef.current?.click()} disabled={uploading} className="v-btn v-btn-primary">
              {uploading ? progress || 'Subindo...' : 'Gravar/escoller vídeo'}
            </button>
          </div>
        )}

        {mode === 'audio' && (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">🎙️</div>
            {recording && (
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-medium" style={{ color: '#FF3B30' }}>Gravando...</span>
              </div>
            )}
            <button onClick={recording ? stopRec : startRec} disabled={uploading}
              className="v-btn"
              style={{ background: recording ? '#FF3B30' : 'var(--color-accent)', color: '#fff' }}>
              {recording ? '⏹ Parar gravación' : '⏺ Gravar nota de voz'}
            </button>
          </div>
        )}

        {mode === 'debuxo' && (
          <DrawingPad onSave={handleDrawing} disabled={uploading} />
        )}
      </div>

      {/* Vista selector */}
      {entries.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-muted)' }}>
            {entries.length} {entries.length === 1 ? 'entrada' : 'entradas'}
          </p>
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--color-surface)' }}>
            {[{ id: 'lineal', icon: '📋' }, { id: 'muro', icon: '🖼️' }].map(v => (
              <button key={v.id} onClick={() => setViewMode(v.id)}
                className="px-3 py-1.5 rounded-lg text-sm transition-all"
                style={{ background: viewMode === v.id ? 'var(--color-accent)' : 'transparent', color: viewMode === v.id ? '#fff' : 'var(--color-muted)' }}>
                {v.icon}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Vista lineal ─── */}
      {viewMode === 'lineal' && (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dayEntries]) => (
            <div key={date} className="fade-up">
              <p className="text-xs font-semibold uppercase tracking-wider mb-3 capitalize"
                 style={{ color: 'var(--color-muted)' }}>{fmtDate(date)}</p>
              <div className="space-y-3">
                {dayEntries.map(entry => (
                  <div key={entry.id} className="widget p-4 group relative">
                    <div className="flex items-center gap-2 mb-2">
                      <span>{TYPE_ICON[entry.type]}</span>
                      <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{fmtTime(entry.created_at)}</span>
                      <button onClick={() => remove(entry.id)}
                        className="ml-auto opacity-0 group-hover:opacity-100 text-xs transition-opacity"
                        style={{ color: '#FF3B30' }}>✕</button>
                    </div>
                    {entry.type === 'texto' && (
                      <p className="text-base leading-relaxed" style={{ color: 'var(--color-text)' }}>{entry.content}</p>
                    )}
                    {entry.type === 'foto' && (
                      <img src={entry.content} alt="" className="rounded-xl w-full object-cover" style={{ maxHeight: 360 }} />
                    )}
                    {entry.type === 'video' && (
                      <video controls src={entry.content} className="rounded-xl w-full" style={{ maxHeight: 360 }} />
                    )}
                    {entry.type === 'audio' && (
                      <audio controls src={entry.content} className="w-full" />
                    )}
                    {entry.type === 'debuxo' && (
                      <img src={entry.content} alt="" className="rounded-xl w-full bg-white border" style={{ borderColor: 'var(--color-border)', maxHeight: 300, objectFit: 'contain' }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {entries.length === 0 && (
            <div className="widget p-8 text-center">
              <p className="text-3xl mb-2">📖</p>
              <p style={{ color: 'var(--color-muted)' }}>O diario está baleiro. Comeza a escribir a vosa historia.</p>
            </div>
          )}
        </div>
      )}

      {/* ─── Vista muro (só medios visuais) ─── */}
      {viewMode === 'muro' && (
        <div>
          {mediaEntries.length === 0 ? (
            <div className="widget p-8 text-center">
              <p style={{ color: 'var(--color-muted)' }}>Aínda non hai fotos, vídeos nin debuxos.</p>
            </div>
          ) : (
            <div className="columns-2 sm:columns-3 gap-2 space-y-2">
              {mediaEntries.map(e => (
                <div key={e.id} className="break-inside-avoid widget overflow-hidden group relative">
                  {e.type === 'foto' && (
                    <img src={e.content} alt="" className="w-full object-cover" />
                  )}
                  {e.type === 'video' && (
                    <video src={e.content} className="w-full" muted playsInline loop onMouseEnter={v => v.target.play()} onMouseLeave={v => v.target.pause()} />
                  )}
                  {e.type === 'debuxo' && (
                    <img src={e.content} alt="" className="w-full bg-white object-contain" />
                  )}
                  <button onClick={() => remove(e.id)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}>✕</button>
                  <div className="absolute bottom-0 left-0 right-0 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                       style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
                    <span className="text-xs text-white">{fmtDate(e.created_at.slice(0,10))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Texto non aparece no muro, só media */}
          {entries.filter(e => e.type === 'texto').length > 0 && (
            <p className="text-xs text-center mt-4" style={{ color: 'var(--color-muted)' }}>
              As notas de texto aparecen na vista lineal 📋
            </p>
          )}
        </div>
      )}
    </div>
  )
}
