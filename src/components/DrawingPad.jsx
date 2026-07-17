import { useRef, useState, useEffect } from 'react'

const COLORS = ['#1c1c1e','#007AFF','#FF3B30','#34C759','#FF9500','#AF52DE','#ffffff']

export default function DrawingPad({ onSave, disabled }) {
  const canvasRef  = useRef(null)
  const drawing    = useRef(false)
  const lastPos    = useRef(null)
  const [color,    setColor]    = useState(COLORS[0])
  const [size,     setSize]     = useState(4)
  const [eraser,   setEraser]   = useState(false)
  const [strokes,  setStrokes]  = useState(0) // para saber se hai algo debuxado

  useEffect(() => {
    const canvas = canvasRef.current
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width  = rect.width  * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)
  }, [])

  const getPos = e => {
    const rect  = canvasRef.current.getBoundingClientRect()
    const point = e.touches ? e.touches[0] : e
    return { x: point.clientX - rect.left, y: point.clientY - rect.top }
  }

  const start = e => {
    e.preventDefault()
    drawing.current = true
    lastPos.current = getPos(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
  }

  const move = e => {
    e.preventDefault()
    if (!drawing.current) return
    const pos = getPos(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = eraser ? '#ffffff' : color
    ctx.lineWidth   = eraser ? size * 4 : size
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.stroke()
    lastPos.current = pos
  }

  const end = e => {
    e.preventDefault()
    drawing.current = false
    setStrokes(s => s + 1)
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    const dpr    = window.devicePixelRatio || 1
    const rect   = canvas.getBoundingClientRect()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)
    setStrokes(0)
  }

  const save = () => {
    onSave(canvasRef.current.toDataURL('image/png'))
    clear()
  }

  return (
    <div>
      <canvas ref={canvasRef}
        style={{ width: '100%', height: 220, borderRadius: 'calc(var(--radius)*0.5)', border: '1px solid var(--color-border)', background: '#fff', touchAction: 'none', cursor: eraser ? 'cell' : 'crosshair', display: 'block' }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      />

      {/* Controles compactos */}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {/* Paleta de cores */}
        <div className="flex gap-1.5 flex-wrap">
          {COLORS.map(c => (
            <button key={c} onClick={() => { setColor(c); setEraser(false) }}
              style={{
                width: 28, height: 28, borderRadius: '50%', background: c, flexShrink: 0,
                border: color === c && !eraser ? '3px solid var(--color-accent)' : '2px solid rgba(128,128,128,0.3)',
                boxShadow: c === '#ffffff' ? '0 0 0 1px rgba(0,0,0,0.15) inset' : 'none',
              }}
            />
          ))}
        </div>

        {/* Borrador e tamaño */}
        <button onClick={() => setEraser(v => !v)}
          style={{ fontSize: 22, opacity: eraser ? 1 : 0.4, background: 'none', border: 'none', cursor: 'pointer' }}
          title={eraser ? 'Borrador activo' : 'Borrador'}>
          🧹
        </button>

        {/* Tamaño con slider compacto */}
        <input type="range" min="1" max="16" value={size} onChange={e => setSize(Number(e.target.value))}
          style={{ flex: 1, minWidth: 60, accentColor: 'var(--color-accent)' }} />

        {/* Preview do trazo */}
        <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: Math.min(size * 2, 22), height: Math.min(size * 2, 22), borderRadius: '50%',
            background: eraser ? '#aaa' : color, border: color === '#ffffff' ? '1px solid #ddd' : 'none' }} />
        </div>

        <div className="flex gap-1 ml-auto">
          <button onClick={clear} style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }} title="Limpar">🗑️</button>
          <button onClick={save} disabled={disabled || strokes === 0} className="vb vb-p vb-sm">
            💾 Gardar
          </button>
        </div>
      </div>
    </div>
  )
}
