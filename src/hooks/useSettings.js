import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULTS = { theme: 'light', accent: '#007AFF', font: 'inter' }

const FONTS = [
  { id: 'inter',    label: 'Inter',         sample: 'Moderno e limpo' },
  { id: 'fraunces', label: 'Fraunces',      sample: 'Elegante e editorial' },
  { id: 'dm',       label: 'DM Sans',       sample: 'Xeométrico e amigable' },
  { id: 'mono',     label: 'JetBrains Mono', sample: 'Técnico e preciso' },
]

const ACCENTS = [
  { id: 'ios-blue',   color: '#007AFF', label: 'Azul' },
  { id: 'ios-purple', color: '#AF52DE', label: 'Violeta' },
  { id: 'ios-pink',   color: '#FF2D55', label: 'Rosa' },
  { id: 'ios-orange', color: '#FF9500', label: 'Laranxa' },
  { id: 'ios-green',  color: '#34C759', label: 'Verde' },
  { id: 'ios-teal',   color: '#5AC8FA', label: 'Cian' },
  { id: 'ios-indigo', color: '#5856D6', label: 'Índigo' },
  { id: 'custom',     color: null,      label: 'Persoalizado' },
]

export { FONTS, ACCENTS }

export function useSettings(userId) {
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading, setLoading]   = useState(true)

  const apply = useCallback((s) => {
    const root = document.documentElement
    root.classList.toggle('dark', s.theme === 'dark')
    root.classList.remove('font-inter', 'font-fraunces', 'font-dm', 'font-mono')
    root.classList.add(`font-${s.font}`)
    root.style.setProperty('--color-accent', s.accent)
    // accent RGB para sombras de focus
    const hex = s.accent.replace('#', '')
    const r = parseInt(hex.slice(0,2),16)
    const g = parseInt(hex.slice(2,4),16)
    const b = parseInt(hex.slice(4,6),16)
    root.style.setProperty('--accent-rgb', `${r},${g},${b}`)
    root.style.setProperty('--font-body',
      s.font === 'inter'    ? "'Inter', system-ui, sans-serif" :
      s.font === 'fraunces' ? "'Fraunces', Georgia, serif" :
      s.font === 'dm'       ? "'DM Sans', system-ui, sans-serif" :
                              "'JetBrains Mono', monospace"
    )
  }, [])

  useEffect(() => {
    if (!userId) return
    supabase.from('user_settings').select('*').eq('user_id', userId).single()
      .then(({ data }) => {
        const s = data ? { theme: data.theme, accent: data.accent, font: data.font } : DEFAULTS
        setSettings(s)
        apply(s)
        setLoading(false)
      })
  }, [userId, apply])

  const save = async (partial) => {
    const next = { ...settings, ...partial }
    setSettings(next)
    apply(next)
    await supabase.from('user_settings').upsert({ user_id: userId, ...next, updated_at: new Date().toISOString() })
  }

  return { settings, save, loading, FONTS, ACCENTS }
}
