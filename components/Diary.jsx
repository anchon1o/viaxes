import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../App.jsx'
import DrawingPad from './DrawingPad.jsx'

const MODES = [
  { id: 'texto',  icon: '✍️', label: 'Texto' },
  { id: 'foto',   icon: '📷', label: 'Foto' },
  { id: 'audio',  icon: '🎙', label: 'Audio' },
  { id: 'debuxo', icon: '✏️', label: 'Debuxo' },
]

const fmtDate = (iso) => new Date(iso).toLocaleDateString('gl', { day: 'numeric', month: 'long', year: 'numeric' })
const fmtTime = (iso) => new Date(iso).toLocaleTimeString('gl', { hour: '2-digit', minute: '2-digit' })

export default function Diary({ tripId }) {
  const session = useSession()
  const [entries, setEntries]   = useState([])
  const [mode, setMode]         = useState('texto')
  const [text, setText]         = useState('')
  const [uploading, setUploading] = useState(false)
  const [recording, setRecording] = useState(false)
  const fileRef    = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef  = useRef([])

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

  const save = async ({ type, content }) => {
    await supabase.from('diary_entries').insert({ trip_id: tripId, author_id: session.user.id, type, content })
  }

  const uploadFile = async (file, ext) => {
    setUploading(true)
    const path = `${tripId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('trip-media').upload(path, file)
    if (!error) {
      const { data } = supabase.storage.from('trip-media').getPublicUrl(path)
      await save({ type: ext === 'webm' ? 'audio' : ext === 'png' ? 'debuxo' : 'foto', content: data.publicUrl })
    }
    setUploading(false)
  }

  const handleTextSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    await save({ type: 'texto', content: text.trim() })
    setText('')
  }

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop() || 'jpg'
    await uploadFile(file, ext)
    if (fileRef.current) fileRef.current.value = ''
  }

  const startRec = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const rec = new MediaRecorder(stream)
    chunksRef.current = []
    rec.ondataavailable = e => chunksRef.current.push(e.data)
    rec.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      await uploadFile(blob, 'webm')
      stream.getTracks().forEach(t => t.stop())
    }
    rec.start()
    recorderRef.current = rec
    setRecording(true)
  }

  const stopRec = () => { recorderRef.current?.stop(); setRecording(false) }

  const handleDrawing = async (dataUrl) => {
    const blob = await (await fetch(dataUrl)).blob()
    await uploadFile(blob, 'png')
  }

  const remove = async (id) => {
    if (!confirm('Eliminar esta entrada?')) return
    await supabase.from('diary_entries').delete().eq('id', id)
  }

  // Agrupa por fecha
  const grouped = entries.reduce((acc, e) => {
    const d = e.created_at.slice(0, 10)
    if (!acc[d]) acc[d] = []
    acc[d].push(e)
    return acc
  }, {})

  return (
    <div className="max-w-2xl">

      {/* Selector de modo */}
      <div className="flex gap-1 p-1 bg-soft rounded-lg w-fit mb-5">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === m.id ? 'bg-white text-ink shadow-sm' : 'text-mid hover:text-ink'
            }`}
          >
            <span>{m.icon}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* Panel de entrada */}
      <div className="mb-8">
        {mode === 'texto' && (
          <form onSubmit={handleTextSubmit}>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Que aconteceu hoxe?"
              rows={3}
              className="input mb-2"
              style={{ resize: 'vertical' }}
            />
            <button type="submit" className="btn-primary text-sm" disabled={!text.trim()}>
              Gardar
            </button>
          </form>
        )}

        {mode === 'foto' && (
          <div className="p-5 rounded-xl border border-dashed border-line text-center">
            <p className="text-sm text-mid mb-3">Selecciona ou fai unha foto</p>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
            <button onClick={() => fileRef.current?.click()} className="btn-ghost text-sm" disabled={uploading}>
              {uploading ? 'Subindo...' : 'Escoller foto'}
            </button>
          </div>
        )}

        {mode === 'audio' && (
          <div className="p-5 rounded-xl border border-dashed border-line text-center">
            <p className="text-sm text-mid mb-3">Grava unha nota de voz</p>
            <button
              onClick={recording ? stopRec : startRec}
              disabled={uploading}
              className={recording ? 'btn-primary text-sm' : 'btn-ghost text-sm'}
              style={recording ? { background: '#ef4444' } : {}}
            >
              {recording ? '⏹ Parar gravación' : '⏺ Comezar a gravar'}
            </button>
            {uploading && <p className="text-xs text-mid mt-2">Gardando audio...</p>}
          </div>
        )}

        {mode === 'debuxo' && (
          <DrawingPad onSave={handleDrawing} disabled={uploading} />
        )}
      </div>

      {/* Entradas agrupadas por día */}
      {Object.keys(grouped).length === 0 ? (
        <p className="text-sm text-mid">Aínda non hai entradas no diario.</p>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([date, dayEntries]) => (
            <div key={date}>
              <p className="text-xs font-mono text-mid uppercase tracking-wider mb-3">{fmtDate(date)}</p>
              <div className="space-y-3">
                {dayEntries.map(entry => (
                  <div key={entry.id} className="group relative">
                    <div className="text-xs font-mono text-mid mb-1">{fmtTime(entry.created_at)}</div>

                    {entry.type === 'texto' && (
                      <p className="text-base text-ink whitespace-pre-wrap leading-relaxed">{entry.content}</p>
                    )}
                    {entry.type === 'foto' && (
                      <img src={entry.content} alt="" className="rounded-xl max-h-96 object-cover w-full border border-line" />
                    )}
                    {entry.type === 'audio' && (
                      <audio controls src={entry.content} className="w-full" style={{ height: 36 }} />
                    )}
                    {entry.type === 'debuxo' && (
                      <img src={entry.content} alt="" className="rounded-xl border border-line bg-white max-h-64 object-contain w-full" />
                    )}

                    <button
                      onClick={() => remove(entry.id)}
                      className="absolute top-0 right-0 text-xs text-mid hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>

                    {/* Separador sutil entre entradas del mismo día */}
                    <div className="mt-3 border-b border-line/60" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
