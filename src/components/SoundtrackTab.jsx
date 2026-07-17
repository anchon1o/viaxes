import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../App.jsx'

export default function SoundtrackTab({ tripId }) {
  const session = useSession()
  const [songs, setSongs]   = useState([])
  const [form, setForm]     = useState({ title: '', artist: '', day: '', note: '' })
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')

  const load = async () => {
    const { data } = await supabase.from('trip_songs').select('*').eq('trip_id', tripId).order('created_at')
    if (data) setSongs(data)
  }

  useEffect(() => { load() }, [tripId])

  const add = async (e) => {
    e.preventDefault()
    // Extraer youtube_id se o titulo parece unha URL
    let ytId = null
    const ytMatch = form.title.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    if (ytMatch) ytId = ytMatch[1]

    await supabase.from('trip_songs').insert({
      trip_id: tripId,
      title: ytId ? form.title.replace(/https?:\/\/\S+/, '').trim() || 'Canción' : form.title,
      artist: form.artist || null,
      day: form.day || null,
      note: form.note || null,
      youtube_id: ytId,
      added_by: session.user.id,
    })
    setForm({ title: '', artist: '', day: '', note: '' }); setShowAdd(false)
  }

  const remove = async (id) => {
    setSongs(prev => prev.filter(s => s.id !== id))
    await supabase.from('trip_songs').delete().eq('id', id)
  }

  const openYT = (song) => {
    const q = song.youtube_id
      ? `https://www.youtube.com/watch?v=${song.youtube_id}`
      : `https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.title} ${song.artist || ''}`)}`
    window.open(q, '_blank')
  }

  const filtered = songs.filter(s =>
    !search || s.title.toLowerCase().includes(search.toLowerCase()) || (s.artist || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>🎵 Banda sonora</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>As cancions que marcaron a viaxe</p>
        </div>
        <button onClick={() => setShowAdd(v => !v)} className="v-btn v-btn-primary v-btn-sm">
          {showAdd ? '✕' : '+ Canción'}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={add} className="widget p-4 mb-4 scale-in space-y-2">
          <div className="flex gap-2">
            <input className="v-input text-sm flex-1" placeholder="Título ou URL de YouTube" value={form.title}
              onChange={e => setForm({...form, title: e.target.value})} autoFocus required />
            <input className="v-input text-sm" style={{ width: 130 }} placeholder="Artista" value={form.artist}
              onChange={e => setForm({...form, artist: e.target.value})} />
          </div>
          <div className="flex gap-2">
            <input type="date" className="v-input text-sm" value={form.day}
              onChange={e => setForm({...form, day: e.target.value})} />
            <input className="v-input text-sm flex-1" placeholder="Nota (onde soaba...)" value={form.note}
              onChange={e => setForm({...form, note: e.target.value})} />
          </div>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            Podes pegar directamente un link de YouTube
          </p>
          <div className="flex gap-2">
            <button type="submit" className="v-btn v-btn-primary flex-1">Gardar</button>
            <button type="button" onClick={() => setShowAdd(false)} className="v-btn v-btn-secondary">Cancelar</button>
          </div>
        </form>
      )}

      {songs.length > 4 && (
        <input className="v-input text-sm mb-3" placeholder="Buscar canción..." value={search}
          onChange={e => setSearch(e.target.value)} />
      )}

      {filtered.length === 0 ? (
        <div className="widget p-8 text-center">
          <p className="text-4xl mb-2">🎶</p>
          <p style={{ color: 'var(--color-muted)' }}>Aínda non hai cancions. Engade a primeira!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((song, i) => (
            <div key={song.id} className="widget p-4 flex items-center gap-3 group fade-up"
                 style={{ animationDelay: `${i * 0.03}s` }}>
              {/* Miniatura YouTube */}
              {song.youtube_id ? (
                <img src={`https://img.youtube.com/vi/${song.youtube_id}/default.jpg`}
                  alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                     style={{ background: 'var(--color-bg)' }}>
                  🎵
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{song.title}</p>
                {song.artist && <p className="text-xs truncate" style={{ color: 'var(--color-muted)' }}>{song.artist}</p>}
                {song.note && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-muted)', fontStyle: 'italic' }}>"{song.note}"</p>}
                {song.day && <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--color-accent)' }}>{song.day}</p>}
              </div>

              <div className="flex gap-2 items-center">
                <button onClick={() => openYT(song)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
                  style={{ background: '#FF0000', color: '#fff' }}>▶</button>
                <button onClick={() => remove(song.id)}
                  className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: '#FF3B30' }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
