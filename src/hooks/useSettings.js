import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULTS = { theme: 'light', accent: '#007AFF', font: 'inter' }

export const THEMES = [
  { id: 'light', label: '☀️ Claro' },
  { id: 'dark',  label: '🌙 Escuro' },
  { id: 'pixel', label: '👾 Pixel Art' },
]

export const FONTS = [
  { id: 'inter',    label: 'Inter',           sample: 'Moderno' },
  { id: 'fraunces', label: 'Fraunces',        sample: 'Editorial' },
  { id: 'dm',       label: 'DM Sans',         sample: 'Amigable' },
  { id: 'jbmono',   label: 'JetBrains Mono',  sample: 'Técnico' },
  { id: 'pixel',    label: 'Press Start 2P',  sample: '8-BIT' },
]

export const ACCENTS = [
  '#007AFF','#AF52DE','#FF2D55','#FF9500',
  '#34C759','#5AC8FA','#5856D6','#FF6B35',
]

const FONT_MAP = {
  inter:    "'Inter', system-ui, sans-serif",
  fraunces: "'Fraunces', Georgia, serif",
  dm:       "'DM Sans', system-ui, sans-serif",
  jbmono:   "'JetBrains Mono', monospace",
  pixel:    "'Press Start 2P', monospace",
}

export function useSettings(userId) {
  const [settings, setSettings] = useState(DEFAULTS)

  const apply = useCallback((s) => {
    const r = document.documentElement
    r.classList.remove('dark', 'pixel')
    if (s.theme === 'dark')  r.classList.add('dark')
    if (s.theme === 'pixel') r.classList.add('pixel')
    r.classList.remove('font-inter','font-fraunces','font-dm','font-jbmono','font-pixel')
    r.classList.add(`font-${s.font}`)
    r.style.setProperty('--color-accent', s.accent)
    r.style.setProperty('--color-accent-fg', s.theme === 'pixel' ? '#000' : '#fff')
    r.style.setProperty('--font-body', FONT_MAP[s.font] || FONT_MAP.inter)
    const hex = s.accent.replace('#','')
    const ri = parseInt(hex.slice(0,2),16), gi = parseInt(hex.slice(2,4),16), bi = parseInt(hex.slice(4,6),16)
    r.style.setProperty('--accent-rgb', `${ri},${gi},${bi}`)
  }, [])

  useEffect(() => {
    if (!userId) { apply(DEFAULTS); return }
    supabase.from('user_settings').select('*').eq('user_id', userId).single()
      .then(({ data }) => {
        const s = data ? { theme: data.theme, accent: data.accent, font: data.font } : DEFAULTS
        setSettings(s); apply(s)
      })
  }, [userId, apply])

  const save = async (partial) => {
    const next = { ...settings, ...partial }
    setSettings(next); apply(next)
    await supabase.from('user_settings').upsert({ user_id: userId, ...next, updated_at: new Date().toISOString() })
  }

  return { settings, save }
}
