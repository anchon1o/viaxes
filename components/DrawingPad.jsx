import { useRef, useState, useEffect } from 'react'

const COLORS = ['#0a0a0a', '#2563eb', '#ef4444', '#16a34a', '#d97706', '#737373']

export default function DrawingPad({ onSave, disabled }) {
  const canvasRef = useRef(null)
  const drawing   = useRef(false)
  const [color, setColor]     = useState(COLORS[0])
  const [size, setSize]       = useState(3)
  const [eraser, setEraser]   = useState(false)

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  }, [])

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const pt = e.touches ? e.touches[0] : e
    return {
      x: ((pt.clientX - rect.left) / rect.width) * canvasRef.current.width,
      y: ((pt.clientY - rect.top) / rect.height) * canvasRef.current.height,
    }
  }

  const start = (e) => {
    drawing.current = true
    const ctx = canvasRef.current.getContext('2d')
    const { x, y } = getPos(e)
    ctx.beginPath(); ctx.moveTo(x, y)
  }

  const move = (e) => {
    if (!drawing.current) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.strokeStyle = eraser ? '#ffffff' : color
    ctx.lineWidth   = eraser ? size * 5 : size
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.stroke()
  }

  const end = () => { drawing.current = false }

  const clear = () => {
    const ctx = canvasRef.current.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  }

  const save = () => {
    onSave(canvasRef.current.toDataURL('image/png'))
    clear()
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        className="w-full rounded-xl border border-line bg-white touch-none"
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        style={{ cursor: eraser ? 'cell' : 'crosshair' }}
      />
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-3">
          {/* Colores */}
          <div className="flex gap-1.5">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => { setColor(c); setEraser(false) }}
                style={{
                  width: 20, height: 20,
                  background: c,
                  borderRadius: '50%',
                  border: color === c && !eraser ? '2px solid #2563eb' : '2px solid transparent',
                  outline: '1px solid #e5e5e5',
                }}
              />
            ))}
          </div>
          {/* Borrador */}
          <button
            onClick={() => setEraser(v => !v)}
            className={`text-xs px-2 py-1 rounded border ${eraser ? 'border-ink text-ink' : 'border-line text-mid'}`}
          >
            Borrador
          </button>
          {/* Grosor */}
          <input type="range" min="1" max="12" value={size} onChange={e => setSize(Number(e.target.value))} className="w-16" />
        </div>
        <div className="flex gap-2">
          <button onClick={clear} className="btn-ghost text-sm py-1.5">Limpar</button>
          <button onClick={save} disabled={disabled} className="btn-primary text-sm py-1.5">
            Gardar debuxo
          </button>
        </div>
      </div>
    </div>
  )
}
