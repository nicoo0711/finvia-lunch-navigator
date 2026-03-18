'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Restaurant } from '@/lib/types'
import styles from './GambleWheel.module.css'

export function GambleWheel({ restaurants }: { restaurants: Restaurant[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rotationRef = useRef(0)
  const [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState<Restaurant | null>(null)

  const n = restaurants.length
  const sliceAngle = (2 * Math.PI) / n

  const drawWheel = useCallback((rot: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const cx = canvas.width / 2
    const cy = canvas.height / 2
    const r = cx - 6

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    restaurants.forEach((rest, i) => {
      const startAngle = rot + i * sliceAngle - Math.PI / 2
      const endAngle = startAngle + sliceAngle

      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = rest.color || '#f0f0f0'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()

      // Emoji in each slice
      const midAngle = startAngle + sliceAngle / 2
      const labelR = r * 0.65
      const lx = cx + labelR * Math.cos(midAngle)
      const ly = cy + labelR * Math.sin(midAngle)

      ctx.save()
      ctx.translate(lx, ly)
      ctx.rotate(midAngle + Math.PI / 2)
      ctx.font = `${Math.max(10, Math.min(20, Math.floor(180 / n)))}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(rest.emoji, 0, 0)
      ctx.restore()
    })

    // Center circle
    ctx.beginPath()
    ctx.arc(cx, cy, 18, 0, 2 * Math.PI)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.strokeStyle = '#ddd'
    ctx.lineWidth = 2
    ctx.stroke()
  }, [restaurants, sliceAngle, n])

  useEffect(() => {
    drawWheel(rotationRef.current)
  }, [drawWheel])

  function spin() {
    if (spinning) return
    setSpinning(true)
    setWinner(null)

    const startRot = rotationRef.current
    const extraSpins = (5 + Math.random() * 5) * 2 * Math.PI
    const randomAngle = Math.random() * 2 * Math.PI
    const endRot = startRot + extraSpins + randomAngle
    const duration = 4000
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      drawWheel(startRot + (endRot - startRot) * eased)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        const finalRot = ((endRot % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
        rotationRef.current = finalRot
        drawWheel(finalRot)
        setSpinning(false)

        const normalized = (((-endRot) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
        const winnerIdx = Math.floor(normalized / sliceAngle) % n
        setWinner(restaurants[winnerIdx])
      }
    }

    requestAnimationFrame(animate)
  }

  return (
    <div className={styles.container}>
      <p className={styles.subtitle}>Das Rad entscheidet, wohin es heute geht.</p>

      <div className={styles.wheelWrap}>
        <div className={styles.pointer}>▼</div>
        <canvas ref={canvasRef} width={320} height={320} className={styles.canvas} />
      </div>

      <button className={styles.spinBtn} onClick={spin} disabled={spinning}>
        {spinning ? 'Dreht…' : '🎰 Drehen!'}
      </button>

      {winner && (
        <div className={styles.winnerCard}>
          <p className={styles.winnerLabel}>Heute geht's zu:</p>
          <div className={styles.winnerHeader}>
            {winner.logo
              ? <img src={winner.logo} alt={winner.name} width={44} height={44} style={{ borderRadius: 8, objectFit: 'contain', background: winner.color }} />
              : <span style={{ fontSize: 28 }}>{winner.emoji}</span>}
            <div>
              <div className={styles.winnerName}>{winner.name}</div>
              <div className={styles.winnerMeta}>{winner.address} · {winner.hours}</div>
            </div>
          </div>
          <a href={winner.url} target="_blank" rel="noreferrer" className={styles.winnerLink}>
            Zur Website →
          </a>
        </div>
      )}
    </div>
  )
}
