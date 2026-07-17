import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

function extractSpotifyId(url) {
  const m = url.match(/spotify\.com\/(playlist|album|track|artist)\/([a-zA-Z0-9]+)/)
  if (m) return { type: m[1], id: m[2] }
  return null
}

export default function MusicWidget({ tripId }) {
  const [embed,    setEmbed]    = useState(null)
  const [input,    setInput]    = useState('')
  const [editing,  setEditing]  = useState(false)
  const [lastSong, setLastSong] = useState(null)

  useEffect(() => {
    // Última canción engadida
    supabase.from('trip_songs').select('*').eq('trip_id', tripId)
      .order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => { if (data?.[0]) setLastSong(data[0]) })
    // Playlist gardada en localStorage
    const saved = localStorage.getItem(`spotify_embed_${tripId}`)
    if (saved) {
      try { setEmbed(JSON.parse(saved)) } catch {}
    }
  }, [tripId])

  const saveEmbed = () => {
    const sp = extractSpotifyId(input)
    if (!sp) { alert('URL de Spotify non recoñecida'); return }
    setEmbed(sp)
    localStorage.setItem(`spotify_embed_${tripId}`, JSON.stringify(sp))
    setEditing(false); setInput('')
  }

  if (!embed && !editing && !lastSong) return null

  return (
    <div className="widget overflow-hidden">
      {embed ? (
        <div>
          <iframe
            src={`https://open.spotify.com/embed/${embed.type}/${embed.id}?utm_source=generator&theme=0`}
            width="100%" height="80" frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy" />
          <div className="px-3 py-2 flex items-center justify-between">
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Spotify</p>
            <button onClick={() => setEditing(true)} className="text-xs" style={{ color: 'var(--color-accent)' }}>Cambiar</button>
          </div>
        </div>
      ) : editing ? (
        <div className="p-3 space-y-2">
          <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>🎧 Playlist de Spotify</p>
          <div className="flex gap-2">
            <input className="vi text-sm flex-1" placeholder="https://open.spotify.com/playlist/..."
              value={input} onChange={e => setInput(e.target.value)} autoFocus />
            <button onClick={saveEmbed} className="vb vb-sm" style={{ background: '#1DB954', color: '#fff' }}>OK</button>
          </div>
          <button onClick={() => setEditing(false)} className="text-xs" style={{ color: 'var(--color-muted)' }}>Cancelar</button>
        </div>
      ) : lastSong ? (
        <div className="p-3 flex items-center gap-3">
          {lastSong.youtube_id ? (
            <img src={`https://img.youtube.com/vi/${lastSong.youtube_id}/default.jpg`}
              alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🎵</div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate" style={{ fontSize: 14, color: 'var(--color-text)' }}>{lastSong.title}</p>
            {lastSong.artist && <p className="text-xs truncate" style={{ color: 'var(--color-muted)' }}>{lastSong.artist}</p>}
          </div>
          <button onClick={() => setEditing(true)} className="vb vb-sm" style={{ background: '#1DB954', color: '#fff', fontSize: 18 }}>🎧</button>
        </div>
      ) : null}
    </div>
  )
}
