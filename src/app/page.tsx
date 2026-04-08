'use client'

import { useEffect, useState } from 'react'
import { RESTAURANTS, RestaurantMenu, DayMenu, MenuItem } from '@/lib/types'
import { GambleWheel } from './GambleWheel'
import { VoteBar } from './VoteBar'
import styles from './page.module.css'

type Filter = 'alle' | 'vegan' | 'vegetarisch' | 'glutenfrei' | 'unter10'

const WEEKDAYS = [
  { label: 'Mo', full: 'Montag' },
  { label: 'Di', full: 'Dienstag' },
  { label: 'Mi', full: 'Mittwoch' },
  { label: 'Do', full: 'Donnerstag' },
  { label: 'Fr', full: 'Freitag' },
]

function getWeekDates(): string[] {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' })
  })
}

function getTodayIndex(): number {
  const day = new Date().toLocaleDateString('en-US', { timeZone: 'Europe/Berlin', weekday: 'long' })
  const map: Record<string, number> = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4 }
  return map[day] ?? 0
}

function formatDate(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function filterItems(items: MenuItem[], filter: Filter): MenuItem[] {
  if (filter === 'alle') return items
  if (filter === 'unter10') return items.filter((i) => i.price < 10)
  return items.filter((i) => i.tags.includes(filter as never))
}

export default function Home() {
  const [menus, setMenus] = useState<RestaurantMenu[]>([])
  const [filter, setFilter] = useState<Filter>('alle')
  const [loading, setLoading] = useState(true)

  const [selectedDay, setSelectedDay] = useState(getTodayIndex)
  const [activeTab, setActiveTab] = useState<'tageskarte' | 'restaurants' | 'gamble'>('tageskarte')
  const [expandedRestaurant, setExpandedRestaurant] = useState<string | null>(null)
  const weekDates = getWeekDates()
  const selectedDate = weekDates[selectedDay]

  // Voting
  const [votes, setVotes] = useState<Record<string, string[]>>({})
  const [myName, setMyName] = useState<string | null>(null)
  const [showNameModal, setShowNameModal] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [pendingVote, setPendingVote] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/menu')
      .then((r) => r.json())
      .then((data) => { setMenus(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Load name from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('lunch-name')
    if (stored) setMyName(stored)
  }, [])

  // Load + poll votes for selected date
  useEffect(() => {
    function fetchVotes() {
      fetch(`/api/votes?date=${selectedDate}`)
        .then(r => r.json())
        .then(setVotes)
        .catch(() => {})
    }
    fetchVotes()
    const interval = setInterval(fetchVotes, 20000)
    return () => clearInterval(interval)
  }, [selectedDate])

  async function submitVote(restaurantId: string, name: string) {
    const isMine = (votes[restaurantId] ?? []).some(n => n.toLowerCase() === name.toLowerCase())
    const res = await fetch('/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: selectedDate, restaurantId: isMine ? '__remove__' : restaurantId, name }),
    })
    if (res.ok) setVotes(await res.json())
  }

  function handleVoteClick(restaurantId: string) {
    if (!myName) {
      setPendingVote(restaurantId)
      setShowNameModal(true)
      return
    }
    submitVote(restaurantId, myName)
  }

  function confirmName() {
    const trimmed = nameInput.trim()
    if (!trimmed) return
    localStorage.setItem('lunch-name', trimmed)
    setMyName(trimmed)
    setShowNameModal(false)
    setNameInput('')
    if (pendingVote) {
      submitVote(pendingVote, trimmed)
      setPendingVote(null)
    }
  }

  function getMenuForDate(restaurantId: string, weekly?: boolean): DayMenu | null {
    const menu = menus.find((m) => m.restaurantId === restaurantId)
    if (!menu) return null
    if (weekly) {
      const allItems = menu.days.flatMap((d) => d.items)
      if (allItems.length === 0) return null
      return { date: selectedDate, items: allItems }
    }
    return menu.days.find((d) => d.date === selectedDate) || null
  }

  function getLastUpdated(restaurantId: string): string | null {
    const menu = menus.find((m) => m.restaurantId === restaurantId)
    return menu?.lastUpdated || null
  }

  return (
    <main className={styles.main}>
      {showNameModal && (
        <div className={styles.modalOverlay} onClick={() => setShowNameModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <p className={styles.modalTitle}>Wie heißt du?</p>
            <p className={styles.modalSub}>Damit andere sehen können, wer mitkommt.</p>
            <input
              className={styles.modalInput}
              placeholder="Dein Name"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmName()}
              autoFocus
              maxLength={30}
            />
            <button className={styles.modalBtn} onClick={confirmName}>Bestätigen</button>
          </div>
        </div>
      )}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="https://www.google.com/s2/favicons?domain=finvia.fo&sz=64" alt="FINVIA" width={32} height={32} style={{ borderRadius: 6 }} />
            <div>
              <h1 className={styles.title}>Lunch Navigator</h1>
              <p className={styles.subtitle}>FINVIA · {formatDate(selectedDate)}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Tabs */}
      <div className={styles.mainTabs}>
        <button
          className={`${styles.mainTab} ${activeTab === 'tageskarte' ? styles.mainTabActive : ''}`}
          onClick={() => setActiveTab('tageskarte')}
        >
          Tageskarte
        </button>
        <button
          className={`${styles.mainTab} ${activeTab === 'restaurants' ? styles.mainTabActive : ''}`}
          onClick={() => setActiveTab('restaurants')}
        >
          Abstimmung
        </button>
        <button
          className={`${styles.mainTab} ${activeTab === 'gamble' ? styles.mainTabActive : ''}`}
          onClick={() => setActiveTab('gamble')}
        >
          🎰 Gamble
        </button>
      </div>

      <div className={styles.container}>

        {/* Restaurants in der Nähe */}
        {activeTab === 'restaurants' && (<section className={styles.nearbySection}>
          <h2 className={styles.sectionTitle}>Restaurants in der Nähe</h2>
          <div className={styles.nearbyGrid}>
            {[...RESTAURANTS].sort((a, b) => (votes[b.id]?.length ?? 0) - (votes[a.id]?.length ?? 0)).map((restaurant) => {
              const menu = menus.find((m) => m.restaurantId === restaurant.id)
              const scrapedItems = menu
                ? menu.days.flatMap((d) => d.items).filter((item, idx, arr) => arr.findIndex(x => x.name === item.name) === idx)
                : []
              const displayItems = restaurant.staticItems ?? scrapedItems
              const isExpanded = expandedRestaurant === restaurant.id
              return (
                <div key={restaurant.id} className={styles.nearbyCard}>
                  <div
                    className={styles.nearbyCardHeader}
                    onClick={() => setExpandedRestaurant(isExpanded ? null : restaurant.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={styles.iconWrap} style={{ background: restaurant.color }}>
                      {restaurant.logo
                        ? <img src={restaurant.logo} alt={restaurant.name} width={28} height={28} style={{ borderRadius: 4, objectFit: 'contain' }} />
                        : <span>{restaurant.emoji}</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 className={styles.nearbyName}>{restaurant.name}</h3>
                      <p className={styles.nearbyMeta}>{restaurant.address} · {restaurant.hours}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <a href={restaurant.url} target="_blank" rel="noreferrer" className={styles.siteLink} onClick={e => e.stopPropagation()}>Website →</a>
                      <span className={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {isExpanded && (
                    ['sandwicher', 'illing', 'fresh74'].includes(restaurant.id) ? (
                      <p className={styles.nearbyTageskarte} onClick={() => setActiveTab('tageskarte')}>→ Siehe Tageskarte</p>
                    ) : displayItems.length > 0 ? (
                      <div className={styles.nearbyItems}>
                        {displayItems.map((item, i) => (
                          <div key={i} className={styles.nearbyItem}>
                            <span>{item.name}</span>
                            <span className={styles.nearbyPrice}>
                              {item.price && item.price > 0 ? `${item.price.toFixed(2).replace('.', ',')} €` : '–'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.nearbyTageskarte} style={{ cursor: 'default' }}>Keine Menüdaten verfügbar.</p>
                    )
                  )}
                  <VoteBar
                    restaurantId={restaurant.id}
                    votes={votes}
                    myName={myName}
                    onVote={handleVoteClick}
                  />
                </div>
              )
            })}
          </div>
        </section>)}

        {/* Tageskarte */}
        {activeTab === 'gamble' && (
          <GambleWheel restaurants={RESTAURANTS} />
        )}

        {activeTab === 'tageskarte' && (<section className={styles.dailySection}>

          {/* Day Tabs */}
          <div className={styles.dayTabs}>
            {WEEKDAYS.map((wd, i) => {
              const dateShort = new Date(weekDates[i] + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
              return (
                <button
                  key={i}
                  className={`${styles.dayTab} ${selectedDay === i ? styles.dayTabActive : ''}`}
                  onClick={() => setSelectedDay(i)}
                >
                  <span className={styles.dayTabLabel}>{wd.label}</span>
                  <span className={styles.dayTabDate}>{dateShort}</span>
                </button>
              )
            })}
          </div>

          {/* Filter Bar */}
          <div className={styles.filters}>
            {(['alle', 'vegan', 'vegetarisch', 'glutenfrei', 'unter10'] as Filter[]).map((f) => (
              <button
                key={f}
                className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'unter10' ? 'Unter 10 €' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {loading && <p className={styles.loading}>Menüs werden geladen…</p>}

          {/* Restaurant Cards */}
          <div className={styles.cards}>
            {RESTAURANTS.filter(r => !['edensgarden', 'yumas', 'doori', 'sushiammain', 'asiathai', 'bestworscht', 'dominion'].includes(r.id)).map((restaurant) => {
              const dayMenu = getMenuForDate(restaurant.id, restaurant.menuType === 'weekly')
              const lastUpdated = getLastUpdated(restaurant.id)
              const filtered = dayMenu ? filterItems(dayMenu.items, filter) : []
              const hasItems = filtered.length > 0

              return (
                <div
                  key={restaurant.id}
                  className={`${styles.card} ${!hasItems && filter !== 'alle' ? styles.dimmed : ''}`}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.iconWrap} style={{ background: restaurant.color }}>
                      {restaurant.logo
                        ? <img src={restaurant.logo} alt={restaurant.name} width={32} height={32} style={{ borderRadius: 4, objectFit: 'contain' }} />
                        : <span>{restaurant.emoji}</span>}
                    </div>
                    <div>
                      <h2 className={styles.restaurantName}>{restaurant.name}</h2>
                      <p className={styles.restaurantMeta}>{restaurant.address} · {restaurant.hours}</p>
                    </div>
                    {restaurant.scrapeType === 'manual' && (
                      <span className={styles.manualBadge}>manuell</span>
                    )}
                  </div>

                  {!dayMenu || filtered.length === 0 ? (
                    <div className={styles.empty}>
                      {filter !== 'alle'
                        ? 'Keine Gerichte für diesen Filter.'
                        : restaurant.scrapeType === 'manual'
                        ? 'Noch nicht eingetragen – bitte im Admin-Bereich ergänzen.'
                        : 'Kein Menü verfügbar.'}
                    </div>
                  ) : (
                    <div className={styles.menuList}>
                      {filtered.map((item, i) => (
                        <div key={i} className={styles.menuItem}>
                          <div className={styles.menuName}>
                            {item.name}
                            <span className={styles.tagRow}>
                              {item.tags.map((t) => (
                                <span key={t} className={`${styles.tag} ${styles[t]}`}>{t}</span>
                              ))}
                            </span>
                          </div>
                          <div className={styles.menuPrice}>
                            {item.price > 0 ? `${item.price.toFixed(2).replace('.', ',')} €` : '–'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className={styles.cardFooter}>
                    <span className={styles.statusDot} />
                    <span className={styles.statusText}>
                      {lastUpdated
                        ? `Aktualisiert: ${new Date(lastUpdated).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`
                        : 'Noch nicht geladen'}
                    </span>
                    <a href={restaurant.url} target="_blank" rel="noreferrer" className={styles.siteLink}>
                      Zur Website →
                    </a>
                  </div>
                </div>
              )
            })}
          </div>

        </section>)}
      </div>
    </main>
  )
}
