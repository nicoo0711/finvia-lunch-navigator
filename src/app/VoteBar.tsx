'use client'

import styles from './VoteBar.module.css'

interface Props {
  restaurantId: string
  votes: Record<string, string[]>
  myName: string | null
  onVote: (restaurantId: string) => void
}

export function VoteBar({ restaurantId, votes, myName, onVote }: Props) {
  const names = votes[restaurantId] ?? []
  const isMine = myName ? names.some(n => n.toLowerCase() === myName.toLowerCase()) : false
  const total = names.length

  // Count total people going anywhere (to show relative interest)
  const anyVoters = Object.values(votes).some(arr => arr.length > 0)

  return (
    <div className={styles.voteBar}>
      <div className={styles.namePills}>
        {names.map(name => (
          <span
            key={name}
            className={`${styles.pill} ${myName && name.toLowerCase() === myName.toLowerCase() ? styles.pillMe : ''}`}
            title={name}
          >
            {initials(name)}
          </span>
        ))}
        {names.length > 0 && (
          <span className={styles.goingLabel}>
            {total === 1 ? `${names[0]} geht hin` : `${names.join(', ')} gehen hin`}
          </span>
        )}
      </div>

      <button
        className={`${styles.voteBtn} ${isMine ? styles.voteBtnActive : ''}`}
        onClick={() => onVote(restaurantId)}
      >
        {isMine ? '✓ Dabei' : total > 0 ? 'Anschließen' : 'Ich gehe hin'}
      </button>
    </div>
  )
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map(w => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')
}
