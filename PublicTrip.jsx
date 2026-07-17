import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULTS = { theme: 'light', accent: '#007AFF', font: 'inter' }

export const FONTS = [
  { id: 'inter',    label: 'Inter',          sample: 'Moderno e limpo' },
  { id: 'fraunces', label: 'Fraunces',       sample: 'Elegante e editorial' },
  { id: 'dm',       label: 'DM Sans',        sample: 'Xeométrico e amigable' },
  { id: 'mono-jb',  label: 'JetBrains Mono', sample: 'Técnico e preciso' },
  { id: 'pixel',    label: 'Press Start 2P', sample: '8-BIT RETRO' },
]

export const ACCENTS = [
  { color: '#007AFF', label: 'Azul' },
  { color: '#AF52DE', label: 'Violeta' },
  { color: '#FF2D55', label: 'Rosa' },
  { color: '#FF9500', label: 'Laranxa' },
  { color: '#34C759', label: 'Verde' },
  { color: '#5AC8FA', label: 'Cian' },
  { color: '#5856D6', label: 'Índigo' },
  { color: '#FF6B35', label: 'Coral' },
]

export const THEMES = [
  { id: 'light', label: '☀️ Claro' },
  { id: 'dark',  label: '🌙 Escuro' },
  { id: 'pixel', label: '👾 Pixel Art' },
]

export function useSettings(userId) {
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading, setLoading]   = useState(true)

  const apply = useCallback((s) => {
    const root = document.documentElement
    root.classList.remove('dark', 'pixel')
    if (s.theme === 'dark')  root.classList.add('dark')
    if (s.theme === 'pixel') root.classList.add('pixel')

    root.classList.remove('font-inter','font-fraunces','font-dm','font-mono-jb','font-pixel')
    root.classList.add(`font-${s.font}`)

    root.style.setProperty('--color-accent', s.accent)
    root.style.setProperty('--color-accent-fg',
      s.theme === 'pixel' ? '#000000' : '#ffffff')

    const hex = s.accent.replace('#','')
    const r = parseInt(hex.slice(0,2),16)
    const g = parseInt(hex.slice(2,4),16)
    const b = parseInt(hex.slice(4,6),16)
    root.style.setProperty('--accent-rgb', `${r},${g},${b}`)

    const fontMap = {
      'inter':    "'Inter', system-ui, sans-serif",
      'fraunces': "'Fraunces', Georgia, serif",
      'dm':       "'DM Sans', system-ui, sans-serif",
      'mono-jb':  "'JetBrains Mono', monospace",
      'pixel':    "'Press Start 2P', monospace",
    }
    root.style.setProperty('--font-body', fontMap[s.font] || fontMap['inter'])
  }, [])

  useEffect(() => {
    if (!userId) { apply(DEFAULTS); setLoading(false); return }
    supabase.from('user_settings').select('*').eq('user_id', userId).single()
      .then(({ data }) => {
        const s = data ? { theme: data.theme, accent: data.accent, font: data.font } : DEFAULTS
        setSettings(s); apply(s); setLoading(false)
      })
  }, [userId, apply])

  const save = async (partial) => {
    const next = { ...settings, ...partial }
    setSettings(next); apply(next)
    await supabase.from('user_settings').upsert({
      user_id: userId, ...next, updated_at: new Date().toISOString()
    })
  }

  return { settings, save, loading, FONTS, ACCENTS, THEMES }
}
