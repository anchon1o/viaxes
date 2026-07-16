import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../App.jsx'
import DrawingPad from './DrawingPad.jsx'

const TYPE_ICON = { texto: '📝', foto: '📸', audio: '🎙️', debuxo: '✏️' }

export default function Diary({ tripId }) {
  const session = useSession()
  const [entries, setEntries] = useState([])
  const [mode, setMode] = useState('texto')
  const [text, setText] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  // grabación de audio
  const [recording, setRecording] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  const load = async () => {
    const { data } = await supabase
      .from('diary_entries')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })
    if (data) setEntries(data)
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`diary-${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'diary_entries', filter: `trip_id=eq.${tripId}` }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [tripId])

  const saveEntry = async ({ type, content, caption }) => {
    await supabase.from('diary_entries').insert({
      trip_id: tripId,
      author_id: session.user.id,
      type,
      content,
      caption: caption || null,
    })
  }

  const handleTextSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    await saveEntry({ type: 'texto', content: text.trim() })
    setText('')
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const path = `${tripId}/foto-${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('trip-media').upload(path, file)
    if (!error) {
      const { data } = supabase.storage.from('trip-media').getPublicUrl(path)
      await saveEntry({ type: 'foto', content: data.publicUrl })
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream)
    chunksRef.current = []
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      setUploading(true)
      const path = `${tripId}/audio-${Date.now()}.webm`
      const { error } = await supabase.storage.from('trip-media').upload(path, blob)
      if (!error) {
        const { data } = supabase.storage.from('trip-media').getPublicUrl(path)
        await saveEntry({ type: 'audio', content: data.publicUrl })
      }
      setUploading(false)
      stream.getTracks().forEach((t) => t.stop())
    }
    recorder.start()
    mediaRecorderRef.current = recorder
    setRecording(true)
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  const handleDrawingSave = async (dataUrl) => {
    setUploading(true)
    const blob = await (await fetch(dataUrl)).blob()
    const path = `${tripId}/debuxo-${Date.now()}.png`
    const { error } = await supabase.storage.from('trip-media').upload(path, blob)
    if (!error) {
      const { data } = supabase.storage.from('trip-media').getPublicUrl(path)
      await saveEntry({ type: 'debuxo', content: data.publicUrl })
    }
    setUploading(false)
  }

  const removeEntry = async (id) => {
    await supabase.from('diary_entries').delete().eq('id', id)
  }

  return (
    <div>
      {/* Selector de modo */}
      <div className="flex gap-2 mb-4">
        {Object.entries(TYPE_ICON).map(([m, icon]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              mode === m ? 'bg-ink text-paper' : 'bg-paperdark text-charcoal/60'
            }`}
          >
            {icon} {m}
          </button>
        ))}
      </div>

      {/* Panel de entrada segundo o modo */}
      <div className="stamp-card rounded-2xl shadow-stamp p-4 mb-6">
        {mode === 'texto' && (
          <form onSubmit={handleTextSubmit} className="space-y-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Que aconteceu hoxe?"
              rows={3}
              className="w-full border border-ink/15 rounded-lg px-3 py-2"
            />
            <button type="submit" className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium">
              Gardar anotación
            </button>
          </form>
        )}

        {mode === 'foto' && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoUpload}
              className="text-sm"
              disabled={uploading}
            />
            {uploading && <p className="text-xs text-charcoal/50 mt-2">Subindo foto...</p>}
          </div>
        )}

        {mode === 'audio' && (
          <div className="flex items-center gap-3">
            <button
              onClick={recording ? stopRecording : startRecording}
              disabled={uploading}
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                recording ? 'bg-coral text-white animate-pulse' : 'bg-brand text-white'
              }`}
            >
              {recording ? '⏹ Parar' : '🎙️ Gravar nota de voz'}
            </button>
            {uploading && <p className="text-xs text-charcoal/50">Subindo audio...</p>}
          </div>
        )}

        {mode === 'debuxo' && <DrawingPad onSave={handleDrawingSave} disabled={uploading} />}
      </div>

      {/* Listado de entradas */}
      <div className="grid gap-3 sm:grid-cols-2">
        {entries.map((entry) => (
          <div key={entry.id} className="stamp-card rounded-2xl shadow-stamp p-4 relative group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-brass">
                {TYPE_ICON[entry.type]} {new Date(entry.created_at).toLocaleDateString('gl-ES')}
              </span>
              <button
                onClick={() => removeEntry(entry.id)}
                className="text-charcoal/30 hover:text-coral opacity-0 group-hover:opacity-100 text-xs"
              >
                ✕
              </button>
            </div>
            {entry.type === 'texto' && <p className="text-charcoal whitespace-pre-wrap">{entry.content}</p>}
            {entry.type === 'foto' && (
              <img src={entry.content} alt="" className="rounded-lg w-full object-cover max-h-64" />
            )}
            {entry.type === 'audio' && <audio controls src={entry.content} className="w-full" />}
            {entry.type === 'debuxo' && (
              <img src={entry.content} alt="" className="rounded-lg w-full bg-white" />
            )}
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-charcoal/40 col-span-2 text-center py-8">
            Aínda non hai anotacións. Empezade a escribir a vosa historia ✍️
          </p>
        )}
      </div>
    </div>
  )
}
