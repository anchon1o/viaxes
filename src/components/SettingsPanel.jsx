import { useState } from 'react'
import { useAppSettings } from '../App.jsx'
import { FONTS, ACCENTS } from '../hooks/useSettings.js'

export default function SettingsPanel({ onClose }) {
  const { settings, save } = useAppSettings()
  const [customColor, setCustomColor] = useState(settings.accent)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
         style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
         onClick={onClose}>
      <div className="widget w-full max-w-sm p-6 scale-in" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Aparencia</h2>
          <button onClick={onClose} className="v-btn v-btn-ghost v-btn-sm">✕</button>
        </div>

        {/* Tema */}
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-muted)' }}>Tema</p>
          <div className="flex gap-2">
            {[
              { id: 'light', label: '☀️ Claro' },
              { id: 'dark',  label: '🌙 Escuro' },
            ].map(t => (
              <button key={t.id} onClick={() => save({ theme: t.id })}
                className={`flex-1 v-btn v-btn-sm ${settings.theme === t.id ? 'v-btn-primary' : 'v-btn-secondary'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cor de acento */}
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-muted)' }}>Cor</p>
          <div className="flex flex-wrap gap-2">
            {ACCENTS.filter(a => a.color).map(a => (
              <button key={a.id} onClick={() => save({ accent: a.color })}
                title={a.label}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: a.color,
                  border: settings.accent === a.color ? '3px solid var(--color-text)' : '3px solid transparent',
                  outline: '2px solid transparent',
                  transition: 'border 0.15s',
                }}
              />
            ))}
            {/* Cor persoalizada */}
            <div className="relative">
              <input type="color" value={customColor}
                onChange={e => setCustomColor(e.target.value)}
                onBlur={() => save({ accent: customColor })}
                style={{ width: 32, height: 32, borderRadius: '50%', padding: 0, border: 'none', cursor: 'pointer', opacity: 0, position: 'absolute', inset: 0 }}
              />
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)', border: '3px solid transparent', pointerEvents: 'none' }} />
            </div>
          </div>
        </div>

        {/* Tipografía */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-muted)' }}>Tipografía</p>
          <div className="space-y-1.5">
            {FONTS.map(f => (
              <button key={f.id} onClick={() => save({ font: f.id })}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors"
                style={{
                  background: settings.font === f.id ? 'var(--color-accent)' : 'var(--color-bg)',
                  color: settings.font === f.id ? 'var(--color-accent-fg)' : 'var(--color-text)',
                }}>
                <span style={{ fontFamily: f.id === 'inter' ? 'Inter' : f.id === 'fraunces' ? 'Fraunces' : f.id === 'dm' ? 'DM Sans' : 'JetBrains Mono' }}>
                  {f.label}
                </span>
                <span className="text-xs opacity-60">{f.sample}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
