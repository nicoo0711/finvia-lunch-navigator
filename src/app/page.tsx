'use client'

import { useEffect, useState } from 'react'
import { RESTAURANTS, RestaurantMenu, DayMenu, MenuItem } from '@/lib/types'
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
  const weekDates = getWeekDates()
  const selectedDate = weekDates[selectedDay]

  useEffect(() => {
    fetch('/api/menu')
      .then((r) => r.json())
      .then((data) => { setMenus(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

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
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="https://www.google.com/s2/favicons?domain=finvia.fo&sz=64" alt="FINVIA" width={32} height={32} style={{ borderRadius: 6 }} />
            <div>
              <h1 className={styles.title}>Lunch Navigator</h1>
              <p className={styles.subtitle}>FINVIA · {formatDate(selectedDate)}</p>
            </div>
          </div>
          <a href="/admin" className={styles.adminLink}>Admin</a>
        </div>
      </header>

      <div className={styles.container}>

        {/* Day Tabs */}
        <div className={styles.dayTabs}>
          {WEEKDAYS.map((wd, i) => (
            <button
              key={i}
              className={`${styles.dayTab} ${selectedDay === i ? styles.dayTabActive : ''}`}
              onClick={() => setSelectedDay(i)}
            >
              <span className={styles.dayTabShort}>{wd.label}</span>
              <span className={styles.dayTabFull}>{wd.full}</span>
            </button>
          ))}
        </div>

        {/* Section heading + Filter Bar */}
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Tagesgerichte</h2>
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
        </div>

        {loading && <p className={styles.loading}>Menüs werden geladen…</p>}

        {/* Restaurant Cards */}
        <div className={styles.cards}>
          {RESTAURANTS.map((restaurant) => {
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

        {/* Refresh button */}
        <div className={styles.refreshRow}>
          <button className={styles.refreshBtn} onClick={() => {
            setLoading(true)
            fetch('/api/scrape').finally(() => {
              fetch('/api/menu').then((r) => r.json()).then((d) => { setMenus(d); setLoading(false) })
            })
          }}>
            Menüs neu laden
          </button>
        </div>
      </div>
    </main>
  )
}
