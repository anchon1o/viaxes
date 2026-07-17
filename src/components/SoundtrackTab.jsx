import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../App.jsx'

function extractSpotifyId(url) {
  // Extrae ID e tipo de calquera URL de Spotify
  const m = url.match(/spotify\.com\/(playlist|album|track|artist)\/([a-zA-Z0-9]+)/)
  if (m) return { type: m[1], id: m[2] }
  const m2 = url.match(/spotify:([a-zA-Z0-9]+):([a-zA-Z0-9]+)/)
  if (m2) return { type: m2[1], id: m2[2] }
  return null
}

function extractYTId(url) {
  const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

export default function SoundtrackTab({ tripId }) {
  const session = useSession()
  const [songs, setSongs]     = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch]   = useState('')
  const [form, setForm] = useState({ title: '', artist: '', day: '', note: '', url: '' })
  const [spotifyEmbed, setSpotifyEmbed] = useState(null) // { type, id }
  const [embedInput, setEmbedInput]     = useState('')

  const load = async () => {
    const { data } = await supabase.from('trip_songs').select('*').eq('trip_id', tripId).order('created_at')
    if (data) setSongs(data)
  }

  useEffect(() => { load() }, [tripId])

  const add = async e => {
    e.preventDefault()
    let ytId = null, spotifyId = null, spotifyType = null
    if (form.url) {
      const yt = extractYTId(form.url)
      if (yt) ytId = yt
      const sp = extractSpotifyId(form.url)
      if (sp) { spotifyId = sp.id; spotifyType = sp.type }
    }
    await supabase.from('trip_songs').insert({
      trip_id:  tripId,
      title:    form.title || 'Canción',
      artist:   form.artist || null,
      day:      form.day || null,
      note:     form.note || null,
      youtube_id: ytId,
      added_by: session.user.id,
    })
    setForm({ title: '', artist: '', day: '', note: '', url: '' })
    setShowAdd(false)
  }

  const remove = async id => {
    setSongs(prev => prev.filter(s => s.id !== id))
    await supabase.from('trip_songs').delete().eq('id', id)
  }

  const openYT  = s => window.open(`https://www.youtube.com/watch?v=${s.youtube_id}`, '_blank')
  const searchYT = s => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(`${s.title} ${s.artist||''}`)}`, '_blank')

  const tryEmbed = () => {
    const sp = extractSpotifyId(embedInput)
    if (sp) setSpotifyEmbed(sp)
    else alert('Non se recoñece como URL de Spotify. Exemplo: https://open.spotify.com/playlist/...')
  }

  const filtered = songs.filter(s =>
    !search || s.title.toLowerCase().includes(search.toLowerCase()) || (s.artist || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>🎵 Banda sonora</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>As cancions que marcaron a viaxe</p>
        </div>
        <button onClick={() => setShowAdd(v => !v)} className="vb vb-p vb-sm">
          {showAdd ? '✕' : '+ Canción'}
        </button>
      </div>

      {/* Spotify embed por URL */}
      <div className="widget p-4">
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-muted)' }}>
          🎧 Reproducir playlist de Spotify
        </p>
        {spotifyEmbed ? (
          <div>
            <iframe
              src={`https://open.spotify.com/embed/${spotifyEmbed.type}/${spotifyEmbed.id}?utm_source=generator&theme=0`}
              width="100%" height="152" frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy" style={{ borderRadius: 12 }} />
            <button onClick={() => { setSpotifyEmbed(null); setEmbedInput('') }}
              className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>
              Cambiar playlist
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input className="vi text-sm flex-1" placeholder="Pega aquí o link de Spotify (playlist, álbum, canción...)"
              value={embedInput} onChange={e => setEmbedInput(e.target.value)} />
            <button onClick={tryEmbed} className="vb vb-p vb-sm" style={{ background: '#1DB954', color: '#fff' }}>
              ▶ Reproducir
            </button>
          </div>
        )}
      </div>

      {/* Formulario nova canción */}
      {showAdd && (
        <form onSubmit={add} className="widget p-4 scale-in space-y-3">
          <p className="font-semibold" style={{ color: 'var(--color-text)' }}>Engadir canción</p>
          <div className="flex gap-2">
            <input className="vi flex-1" placeholder="Título" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })} autoFocus />
            <input className="vi" style={{ width: 130 }} placeholder="Artista" value={form.artist}
              onChange={e => setForm({ ...form, artist: e.target.value })} />
          </div>
          <input className="vi" placeholder="URL de YouTube ou Spotify (opcional)" value={form.url}
            onChange={e => setForm({ ...form, url: e.target.value })} />
          <div className="flex gap-2">
            <input type="date" className="vi flex-1" value={form.day}
              onChange={e => setForm({ ...form, day: e.target.value })} />
            <input className="vi flex-1" placeholder="Nota (onde soaba...)" value={form.note}
              onChange={e => setForm({ ...form, note: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="vb vb-p flex-1">Gardar</button>
            <button type="button" onClick={() => setShowAdd(false)} className="vb vb-s">Cancelar</button>
          </div>
        </form>
      )}

      {/* Busca */}
      {songs.length > 4 && (
        <input className="vi" placeholder="🔍 Buscar canción..." value={search}
          onChange={e => setSearch(e.target.value)} />
      )}

      {/* Lista de cancions */}
      {filtered.length === 0 ? (
        <div className="widget p-8 text-center">
          <p style={{ fontSize: 36 }} className="mb-2">🎶</p>
          <p style={{ color: 'var(--color-muted)' }}>Engade a primeira canción da viaxe</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((song, i) => (
            <div key={song.id} className="widget p-4 flex items-center gap-3 fade-up"
                 style={{ animationDelay: `${i * 0.03}s` }}>
              {song.youtube_id ? (
                <img src={`https://img.youtube.com/vi/${song.youtube_id}/default.jpg`}
                  alt="" style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 52, height: 52, borderRadius: 10, background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                  🎵
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate" style={{ fontSize: 15, color: 'var(--color-text)' }}>{song.title}</p>
                {song.artist && <p className="text-xs truncate" style={{ color: 'var(--color-muted)' }}>{song.artist}</p>}
                {song.note   && <p className="text-xs italic truncate" style={{ color: 'var(--color-muted)' }}>"{song.note}"</p>}
                {song.day    && <p className="text-xs font-mono" style={{ color: 'var(--color-accent)' }}>{song.day}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => song.youtube_id ? openYT(song) : searchYT(song)}
                  className="vb-icon" style={{ width: 40, height: 40, background: '#FF0000', color: '#fff', fontSize: 16, borderRadius: 10 }}>▶</button>
                <button onClick={() => remove(song.id)}
                  className="vb-icon" style={{ width: 40, height: 40, background: 'var(--color-bg)', fontSize: 18, borderRadius: 10 }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
