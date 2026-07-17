import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../App.jsx'
import DrawingPad from './DrawingPad.jsx'

const MODES = [
  { id: 'texto',  icon: '✍️', label: 'Texto' },
  { id: 'foto',   icon: '📷', label: 'Foto' },
  { id: 'video',  icon: '🎬', label: 'Vídeo' },
  { id: 'audio',  icon: '🎙️', label: 'Audio' },
  { id: 'debuxo', icon: '✏️', label: 'Debuxo' },
]

async function compressImage(file, maxW = 1400, q = 0.82) {
  return new Promise(resolve => {
    const img = new Image(), url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width)
      const c = document.createElement('canvas')
      c.width = img.width * scale; c.height = img.height * scale
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      c.toBlob(blob => { URL.revokeObjectURL(url); resolve(blob) }, 'image/jpeg', q)
    }
    img.src = url
  })
}

const fmtDate = iso => new Date(iso).toLocaleDateString('gl', { weekday: 'long', day: 'numeric', month: 'long' })
const fmtTime = iso => new Date(iso).toLocaleTimeString('gl', { hour: '2-digit', minute: '2-digit' })
const TYPE_ICON = { texto: '✍️', foto: '📷', video: '🎬', audio: '🎙️', debuxo: '✏️' }

export default function Diary({ tripId }) {
  const session = useSession()
  const [entries,   setEntries]   = useState([])
  const [mode,      setMode]      = useState('texto')
  const [text,      setText]      = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress,  setProgress]  = useState('')
  const [recording, setRecording] = useState(false)
  const [viewMode,  setViewMode]  = useState('lineal')
  const photoRef = useRef(null)  // cámara
  const galleryRef = useRef(null) // galería
  const videoRef = useRef(null)
  const recRef   = useRef(null)
  const chunksRef = useRef([])

  const load = async () => {
    const { data } = await supabase.from('diary_entries').select('*')
      .eq('trip_id', tripId).order('created_at', { ascending: false })
    if (data) setEntries(data)
  }

  useEffect(() => {
    load()
    const ch = supabase.channel(`diary8-${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'diary_entries', filter: `trip_id=eq.${tripId}` }, load)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [tripId])

  const saveEntry = async ({ type, content }) => {
    const { data } = await supabase.from('diary_entries')
      .insert({ trip_id: tripId, author_id: session.user.id, type, content })
      .select().single()
    if (data) setEntries(prev => [data, ...prev])
  }

  const upload = async (blob, ext, type) => {
    setUploading(true); setProgress('Subindo...')
    const path = `${tripId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('trip-media').upload(path, blob, { contentType: blob.type || 'application/octet-stream' })
    if (!error) {
      const { data } = supabase.storage.from('trip-media').getPublicUrl(path)
      await saveEntry({ type, content: data.publicUrl })
    }
    setUploading(false); setProgress('')
  }

  const handleText = async e => {
    e.preventDefault()
    if (!text.trim()) return
    await saveEntry({ type: 'texto', content: text.trim() })
    setText('')
  }

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setProgress('Comprimindo...')
    const compressed = await compressImage(file)
    await upload(compressed, 'jpg', 'foto')
    if (e.target) e.target.value = ''
  }

  const handleVideo = async e => {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 50 * 1024 * 1024) { alert('Máximo 50MB para vídeos'); return }
    const ext = file.name.split('.').pop() || 'mp4'
    await upload(file, ext, 'video')
    if (e.target) e.target.value = ''
  }

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const rec = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const ext  = mimeType.includes('webm') ? 'webm' : 'm4a'
        await upload(blob, ext, 'audio')
        stream.getTracks().forEach(t => t.stop())
      }
      rec.start(100)
      recRef.current = rec
      setRecording(true)
    } catch (err) {
      alert('Non se puido acceder ao micrófono: ' + err.message)
    }
  }

  const stopRec = () => {
    if (recRef.current && recRef.current.state !== 'inactive') {
      recRef.current.stop()
    }
    setRecording(false)
  }

  const handleDrawing = async dataUrl => {
    const blob = await (await fetch(dataUrl)).blob()
    await upload(blob, 'png', 'debuxo')
  }

  const remove = async id => {
    if (!confirm('Eliminar esta entrada?')) return
    setEntries(prev => prev.filter(e => e.id !== id))
    await supabase.from('diary_entries').delete().eq('id', id)
  }

  const grouped = entries.reduce((acc, e) => {
    const d = e.created_at.slice(0, 10)
    ;(acc[d] = acc[d] || []).push(e)
    return acc
  }, {})

  const mediaEntries = entries.filter(e => ['foto', 'video', 'debuxo'].includes(e.type))

  return (
    <div className="max-w-2xl mx-auto">

      {/* Selector de modo */}
      <div className="widget p-1.5 flex gap-1 mb-4">
        {MODES.map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            className="flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-all"
            style={{ borderRadius: 'calc(var(--radius)*0.5)', background: mode === m.id ? 'var(--color-accent)' : 'transparent', color: mode === m.id ? 'var(--color-accent-fg)' : 'var(--color-muted)' }}>
            <span style={{ fontSize: 22 }}>{m.icon}</span>
            <span className="text-xs font-medium hidden sm:block">{m.label}</span>
          </button>
        ))}
      </div>

      {/* Panel entrada */}
      <div className="widget p-4 mb-4">

        {mode === 'texto' && (
          <form onSubmit={handleText} className="space-y-3">
            <textarea value={text} onChange={e => setText(e.target.value)}
              placeholder="Que aconteceu? Como te sentes? Que queres recordar..."
              rows={4} className="vi" style={{ resize: 'vertical' }} />
            <button type="submit" disabled={!text.trim()} className="vb vb-p vb-sm">Gardar nota</button>
          </form>
        )}

        {mode === 'foto' && (
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1 text-center">
                <input ref={photoRef} type="file" accept="image/*" capture="environment"
                  onChange={handlePhoto} className="hidden" />
                <button onClick={() => photoRef.current?.click()} disabled={uploading}
                  className="vb vb-p w-full" style={{ fontSize: 22 }}>
                  📷 Cámara
                </button>
                <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Fai foto agora</p>
              </div>
              <div className="flex-1 text-center">
                <input ref={galleryRef} type="file" accept="image/*"
                  onChange={handlePhoto} className="hidden" />
                <button onClick={() => galleryRef.current?.click()} disabled={uploading}
                  className="vb vb-s w-full" style={{ fontSize: 22 }}>
                  🖼️ Galería
                </button>
                <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Escoller foto</p>
              </div>
            </div>
            {uploading && (
              <p className="text-sm text-center" style={{ color: 'var(--color-muted)' }}>{progress}</p>
            )}
          </div>
        )}

        {mode === 'video' && (
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1 text-center">
                <input ref={videoRef} type="file" accept="video/*" capture="environment"
                  onChange={handleVideo} className="hidden" />
                <button onClick={() => { videoRef.current.removeAttribute('capture'); videoRef.current.setAttribute('capture','environment'); videoRef.current?.click() }}
                  disabled={uploading} className="vb vb-p w-full" style={{ fontSize: 22 }}>
                  🎬 Gravar
                </button>
              </div>
              <div className="flex-1 text-center">
                <button onClick={() => { const i = document.createElement('input'); i.type='file'; i.accept='video/*'; i.onchange=handleVideo; i.click() }}
                  disabled={uploading} className="vb vb-s w-full" style={{ fontSize: 22 }}>
                  📂 Galería
                </button>
              </div>
            </div>
            <p className="text-xs text-center" style={{ color: 'var(--color-muted)' }}>Máximo 50MB</p>
            {uploading && <p className="text-sm text-center" style={{ color: 'var(--color-muted)' }}>{progress}</p>}
          </div>
        )}

        {mode === 'audio' && (
          <div className="text-center py-2">
            {recording && (
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: '#FF3B30' }} />
                <span className="font-semibold" style={{ color: '#FF3B30' }}>Gravando...</span>
              </div>
            )}
            <button onClick={recording ? stopRec : startRec} disabled={uploading}
              className="vb w-full" style={{ fontSize: 22, background: recording ? '#FF3B30' : 'var(--color-accent)', color: '#fff' }}>
              {recording ? '⏹ Parar gravación' : '🎙️ Gravar nota de voz'}
            </button>
            {uploading && <p className="text-sm mt-2" style={{ color: 'var(--color-muted)' }}>Gardando audio...</p>}
          </div>
        )}

        {mode === 'debuxo' && <DrawingPad onSave={handleDrawing} disabled={uploading} />}
      </div>

      {/* Vista selector */}
      {entries.length > 0 && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold" style={{ color: 'var(--color-muted)' }}>
            {entries.length} entradas
          </p>
          <div className="flex gap-1 p-1 widget">
            {[{ id: 'lineal', icon: '📋' }, { id: 'muro', icon: '🖼️' }].map(v => (
              <button key={v.id} onClick={() => setViewMode(v.id)} className="px-3 py-1.5 text-sm transition-all"
                style={{ borderRadius: 'calc(var(--radius)*0.5)', background: viewMode === v.id ? 'var(--color-accent)' : 'transparent', color: viewMode === v.id ? '#fff' : 'var(--color-muted)' }}>
                {v.icon}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Vista lineal */}
      {viewMode === 'lineal' && (
        <div className="space-y-5">
          {Object.entries(grouped).map(([date, dayEntries]) => (
            <div key={date}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2 capitalize"
                 style={{ color: 'var(--color-muted)' }}>{fmtDate(date)}</p>
              <div className="space-y-3">
                {dayEntries.map(entry => (
                  <div key={entry.id} className="widget p-4 group relative">
                    <div className="flex items-center gap-2 mb-2">
                      <span style={{ fontSize: 18 }}>{TYPE_ICON[entry.type]}</span>
                      <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{fmtTime(entry.created_at)}</span>
                      <button onClick={() => remove(entry.id)}
                        className="ml-auto vb-icon"
                        style={{ width: 32, height: 32, fontSize: 16, background: 'transparent', color: '#FF3B30', opacity: 0 }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                        onTouchStart={e => e.currentTarget.style.opacity = '1'}>
                        🗑
                      </button>
                    </div>
                    {entry.type === 'texto' && (
                      <p className="leading-relaxed whitespace-pre-wrap" style={{ fontSize: 16, color: 'var(--color-text)' }}>{entry.content}</p>
                    )}
                    {entry.type === 'foto' && (
                      <img src={entry.content} alt="" className="rounded-xl w-full object-cover" style={{ maxHeight: 360 }} />
                    )}
                    {entry.type === 'video' && (
                      <video controls src={entry.content} className="rounded-xl w-full" style={{ maxHeight: 360 }} playsInline />
                    )}
                    {entry.type === 'audio' && (
                      <audio controls src={entry.content} className="w-full" style={{ minHeight: 44 }} />
                    )}
                    {entry.type === 'debuxo' && (
                      <img src={entry.content} alt="" className="rounded-xl w-full bg-white" style={{ maxHeight: 280, objectFit: 'contain' }} />
                    )}
                    {/* Botón borrar visible en táctil */}
                    <button onClick={() => remove(entry.id)}
                      className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full"
                      style={{ background: 'rgba(255,59,48,0.12)', color: '#FF3B30', fontSize: 14 }}>
                      ✕
                    </button>
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

      {/* Vista muro */}
      {viewMode === 'muro' && (
        <div>
          {mediaEntries.length === 0 ? (
            <div className="widget p-8 text-center">
              <p style={{ color: 'var(--color-muted)' }}>Sen fotos, vídeos nin debuxos aínda.</p>
            </div>
          ) : (
            <div className="columns-2 sm:columns-3 gap-2 space-y-2">
              {mediaEntries.map(e => (
                <div key={e.id} className="break-inside-avoid widget overflow-hidden group relative">
                  {e.type === 'foto' && <img src={e.content} alt="" className="w-full object-cover" />}
                  {e.type === 'video' && <video src={e.content} className="w-full" muted playsInline loop
                    onMouseEnter={v => v.target.play()} onMouseLeave={v => v.target.pause()} />}
                  {e.type === 'debuxo' && <img src={e.content} alt="" className="w-full bg-white object-contain" />}
                  <button onClick={() => remove(e.id)}
                    className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full text-xs"
                    style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
