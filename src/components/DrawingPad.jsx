import { useRef, useState, useEffect } from 'react'

const COLORS = ['#16324F', '#E1572C', '#3E7C59', '#C89B3C', '#000000']

export default function DrawingPad({ onSave, disabled }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const [color, setColor] = useState(COLORS[0])
  const [lineWidth, setLineWidth] = useState(3)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const point = e.touches ? e.touches[0] : e
    return {
      x: ((point.clientX - rect.left) / rect.width) * canvasRef.current.width,
      y: ((point.clientY - rect.top) / rect.height) * canvasRef.current.height,
    }
  }

  const start = (e) => {
    drawing.current = true
    const ctx = canvasRef.current.getContext('2d')
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const move = (e) => {
    if (!drawing.current) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  const end = () => {
    drawing.current = false
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const save = () => {
    const dataUrl = canvasRef.current.toDataURL('image/png')
    onSave(dataUrl)
    clear()
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={500}
        height={300}
        className="w-full rounded-lg border border-ink/15 touch-none bg-white"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <div className="flex items-center justify-between mt-2">
        <div className="flex gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-6 h-6 rounded-full border-2"
              style={{ backgroundColor: c, borderColor: color === c ? '#C89B3C' : 'transparent' }}
            />
          ))}
          <input
            type="range"
            min="1"
            max="10"
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="ml-2 w-16"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={clear} className="text-xs text-charcoal/50 px-2">Limpar</button>
          <button
            onClick={save}
            disabled={disabled}
            className="bg-brand text-white px-4 py-1.5 rounded-lg text-sm font-medium"
          >
            Gardar debuxo
          </button>
        </div>
      </div>
    </div>
  )
}
