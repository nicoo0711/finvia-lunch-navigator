'use client'

import { useRef, useState, useEffect } from 'react'
import { Restaurant } from '@/lib/types'
import styles from './GambleWheel.module.css'

export function GambleWheel({ restaurants }: { restaurants: Restaurant[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rotationRef = useRef(0)
  const imagesRef = useRef<(HTMLImageElement | null)[]>([])
  const [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState<Restaurant | null>(null)
  const [imagesLoaded, setImagesLoaded] = useState(false)

  const n = restaurants.length
  const sliceAngle = (2 * Math.PI) / n
  const SIZE = 480

  // Preload all logos
  useEffect(() => {
    let loaded = 0
    const imgs = restaurants.map((rest, i) => {
      if (!rest.logo) { loaded++; if (loaded === n) setImagesLoaded(true); return null }
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => { loaded++; if (loaded === n) setImagesLoaded(true) }
      img.onerror = () => { loaded++; if (loaded === n) setImagesLoaded(true) }
      img.src = rest.logo
      return img
    })
    imagesRef.current = imgs
  }, [restaurants, n])

  function drawWheel(rot: number) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const cx = SIZE / 2
    const cy = SIZE / 2
    const r = cx - 8

    ctx.clearRect(0, 0, SIZE, SIZE)

    restaurants.forEach((rest, i) => {
      const startAngle = rot + i * sliceAngle - Math.PI / 2
      const endAngle = startAngle + sliceAngle

      // Slice
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = rest.color || '#f0f0f0'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2.5
      ctx.stroke()

      // Logo image in slice
      const midAngle = startAngle + sliceAngle / 2
      const logoR = r * 0.62
      const lx = cx + logoR * Math.cos(midAngle)
      const ly = cy + logoR * Math.sin(midAngle)
      const imgSize = Math.max(22, Math.min(40, Math.floor(260 / n)))
      const img = imagesRef.current[i]

      ctx.save()
      ctx.translate(lx, ly)
      ctx.rotate(midAngle + Math.PI / 2)

      if (img && img.complete && img.naturalWidth > 0) {
        // Clip to a rounded rect for the logo
        const half = imgSize / 2
        ctx.beginPath()
        ctx.roundRect(-half, -half, imgSize, imgSize, 4)
        ctx.clip()
        ctx.drawImage(img, -half, -half, imgSize, imgSize)
      } else {
        // Fallback: emoji
        ctx.font = `${Math.max(12, Math.min(22, Math.floor(200 / n)))}px serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#333'
        ctx.fillText(rest.emoji, 0, 0)
      }
      ctx.restore()
    })

    // Outer ring
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, 2 * Math.PI)
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'
    ctx.lineWidth = 4
    ctx.stroke()

    // Center circle
    ctx.beginPath()
    ctx.arc(cx, cy, 20, 0, 2 * Math.PI)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.strokeStyle = '#ddd'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  useEffect(() => {
    if (imagesLoaded) drawWheel(rotationRef.current)
  }, [imagesLoaded])

  function spin() {
    if (spinning) return
    setSpinning(true)
    setWinner(null)

    const startRot = rotationRef.current
    const extraSpins = (6 + Math.random() * 5) * 2 * Math.PI
    const randomAngle = Math.random() * 2 * Math.PI
    const endRot = startRot + extraSpins + randomAngle
    const duration = 4500
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
        <canvas ref={canvasRef} width={SIZE} height={SIZE} className={styles.canvas} />
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
