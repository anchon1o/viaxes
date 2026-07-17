import { useState } from 'react'
import { useAppSettings } from '../App.jsx'
import { THEMES, FONTS, ACCENTS } from '../hooks/useSettings.js'

export default function SettingsPanel({ onClose }) {
  const { settings, save } = useAppSettings()
  const [custom, setCustom] = useState(settings.accent)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4"
         style={{ background:'rgba(0,0,0,0.45)', backdropFilter:'blur(6px)' }}
         onClick={onClose}>
      <div className="widget w-full max-w-sm p-5 scale-in" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold" style={{ color:'var(--color-text)' }}>Aparencia</h2>
          <button onClick={onClose} className="vb vb-g vb-sm">✕</button>
        </div>

        {/* Temas */}
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color:'var(--color-muted)' }}>Tema</p>
        <div className="flex gap-2 mb-5">
          {THEMES.map(t => (
            <button key={t.id} onClick={() => save({ theme: t.id })}
              className={`flex-1 vb vb-sm ${settings.theme === t.id ? 'vb-p' : 'vb-s'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Cores */}
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color:'var(--color-muted)' }}>Cor</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {ACCENTS.map(a => (
            <button key={a} onClick={() => save({ accent: a })}
              style={{ width:30, height:30, borderRadius:'50%', background:a, cursor:'pointer', flexShrink:0,
                border: settings.accent === a ? '3px solid var(--color-text)' : '3px solid transparent',
                outline:'1.5px solid rgba(128,128,128,0.3)' }} />
          ))}
          <div className="relative" style={{ width:30, height:30 }}>
            <input type="color" value={custom} onChange={e => setCustom(e.target.value)}
              onBlur={() => save({ accent: custom })}
              style={{ position:'absolute', inset:0, opacity:0, width:'100%', height:'100%', cursor:'pointer' }} />
            <div style={{ width:30, height:30, borderRadius:'50%', pointerEvents:'none',
              background:'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)',
              outline:'1.5px solid rgba(128,128,128,0.3)' }} />
          </div>
        </div>

        {/* Fontes */}
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color:'var(--color-muted)' }}>Tipografía</p>
        <div className="space-y-1.5">
          {FONTS.map(f => (
            <button key={f.id} onClick={() => save({ font: f.id })}
              className="w-full flex items-center justify-between px-3 py-2.5 transition-colors"
              style={{ borderRadius:'calc(var(--radius)*0.5)',
                background: settings.font === f.id ? 'var(--color-accent)' : 'var(--color-bg)',
                color: settings.font === f.id ? 'var(--color-accent-fg)' : 'var(--color-text)' }}>
              <span style={{ fontFamily: f.id === 'pixel' ? "'Press Start 2P'" : f.id === 'fraunces' ? 'Fraunces' : f.id === 'dm' ? 'DM Sans' : f.id === 'jbmono' ? 'JetBrains Mono' : 'Inter' }}>
                {f.label}
              </span>
              <span className="text-xs opacity-60" style={{ fontFamily:'Inter,sans-serif' }}>{f.sample}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
