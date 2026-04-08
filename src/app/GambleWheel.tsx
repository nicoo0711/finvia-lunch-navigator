'use client'

import { useEffect, useRef, useState } from 'react'
import { Restaurant } from '@/lib/types'
import styles from './GambleWheel.module.css'

const SIZE = 480
const STORAGE_KEY = 'gamble-selection'

export function GambleWheel({ restaurants }: { restaurants: Restaurant[] }) {
  const wheelRef = useRef<HTMLDivElement>(null)
  const rotationRef = useRef(0)
  const [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState<Restaurant | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(restaurants.map(r => r.id)))

  // Load persisted selection from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: string[] = JSON.parse(stored)
        // Only keep ids that still exist in restaurant list
        const valid = parsed.filter(id => restaurants.some(r => r.id === id))
        if (valid.length > 0) setSelectedIds(new Set(valid))
      }
    } catch { /* ignore */ }
  }, [restaurants])

  // Persist selection to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(selectedIds)))
    } catch { /* ignore */ }
  }, [selectedIds])

  const active = restaurants.filter(r => selectedIds.has(r.id))
  const n = active.length
  const sliceAngle = n > 0 ? 360 / n : 360

  const gradient = active.map((r, i) => {
    const start = i * sliceAngle
    const end = (i + 1) * sliceAngle
    return `${r.color || '#f0f0f0'} ${start}deg ${end}deg`
  }).join(', ')

  function toggleRestaurant(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        // Don't deselect last one
        if (next.size <= 1) return prev
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
    setWinner(null)
  }

  function spin() {
    if (spinning || n === 0) return
    setSpinning(true)
    setWinner(null)

    const startRot = rotationRef.current
    const extraSpins = (6 + Math.random() * 5) * 360
    const endRot = startRot + extraSpins + Math.random() * 360
    const duration = 4500
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      const currentRot = startRot + (endRot - startRot) * eased

      if (wheelRef.current) {
        wheelRef.current.style.transform = `rotate(${currentRot}deg)`
      }

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        rotationRef.current = ((endRot % 360) + 360) % 360
        setSpinning(false)
        const normalized = ((-endRot % 360) + 360) % 360
        setWinner(active[Math.floor(normalized / sliceAngle) % n])
      }
    }

    requestAnimationFrame(animate)
  }

  const imgSize = Math.max(36, Math.min(56, Math.floor(400 / Math.max(n, 1))))

  return (
    <div className={styles.container}>
      <p className={styles.subtitle}>Das Rad entscheidet, wohin es heute geht.</p>

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

      <div className={styles.wheelWrap}>
        <div className={styles.pointer}>▼</div>

        <div
          ref={wheelRef}
          className={styles.wheel}
          style={{ width: SIZE, height: SIZE, background: n > 0 ? `conic-gradient(${gradient})` : '#eee' }}
        >
          {active.map((_, i) => (
            <div
              key={i}
              className={styles.divider}
              style={{ transform: `translateX(-50%) rotate(${i * sliceAngle}deg)` }}
            />
          ))}

          {active.map((r, i) => {
            const angleDeg = i * sliceAngle + sliceAngle / 2
            const angleRad = (angleDeg - 90) * Math.PI / 180
            const logoR = (SIZE / 2) * 0.62
            const x = SIZE / 2 + logoR * Math.cos(angleRad)
            const y = SIZE / 2 + logoR * Math.sin(angleRad)
            return (
              <div
                key={r.id}
                className={styles.logoWrap}
                style={{ left: x - imgSize / 2, top: y - imgSize / 2, width: imgSize, height: imgSize }}
              >
                {r.logo
                  ? <img src={r.logo} alt={r.name} width={imgSize} height={imgSize} style={{ objectFit: 'contain', borderRadius: 4, background: r.color }} />
                  : <span style={{ fontSize: Math.max(12, Math.floor(imgSize * 0.6)) }}>{r.emoji}</span>
                }
              </div>
            )
          })}
        </div>

        <div className={styles.centerDot} />
      </div>

      <button className={styles.spinBtn} onClick={spin} disabled={spinning || n === 0}>
        {spinning ? 'Dreht…' : '🎰 Drehen!'}
      </button>

      <div className={styles.pickerSection}>
        <p className={styles.pickerTitle}>Teilnehmer auswählen</p>
        <div className={styles.pickerGrid}>
          {restaurants.map(r => {
            const isSelected = selectedIds.has(r.id)
            return (
              <button
                key={r.id}
                className={`${styles.pickerPill} ${isSelected ? styles.pickerPillActive : styles.pickerPillInactive}`}
                onClick={() => toggleRestaurant(r.id)}
                title={isSelected ? 'Ausschließen' : 'Einschließen'}
              >
                {r.logo
                  ? <img src={r.logo} alt="" width={18} height={18} style={{ objectFit: 'contain', borderRadius: 3, background: r.color, flexShrink: 0 }} />
                  : <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{r.emoji}</span>
                }
                <span className={styles.pickerName}>{r.name}</span>
                <span className={styles.pickerCheck}>{isSelected ? '✓' : '+'}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
