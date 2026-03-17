import * as cheerio from 'cheerio'
import { DayMenu, MenuItem, RestaurantMenu } from '../types'

const WEEKDAY_MAP: Record<string, number> = {
  montag: 0, dienstag: 1, mittwoch: 2, donnerstag: 3, freitag: 4,
}

function parsePrice(text: string): number {
  const match = text.match(/EUR?\s*([\d.,]+)/i)
  if (!match) return 0
  return parseFloat(match[1].replace(',', '.'))
}

function parseTags(name: string): MenuItem['tags'] {
  const lower = name.toLowerCase()
  const tags: MenuItem['tags'] = []
  if (lower.includes('vegan')) tags.push('vegan')
  if (lower.includes('vegetar')) tags.push('vegetarisch')
  if (lower.includes('glutenfrei') || lower.includes('gluten frei')) tags.push('glutenfrei')
  return tags
}

function getDateForWeekday(weekdayIndex: number): string {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  monday.setDate(monday.getDate() + weekdayIndex)
  return monday.toISOString().split('T')[0]
}

export async function scrapeIlling(): Promise<RestaurantMenu> {
  const res = await fetch('https://www.metzgerei-illing.de/Speiseplan/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FINVIALunchBot/1.0)' },
  })
  const html = await res.text()
  const $ = cheerio.load(html)

  const days: DayMenu[] = []

  // Find all headings and paragraphs that contain day names
  $('h2, h3, p').each((_, el) => {
    const text = $(el).text().trim().toLowerCase().replace(':', '')
    const dayKey = Object.keys(WEEKDAY_MAP).find((d) => text.includes(d))
    if (!dayKey) return

    const items: MenuItem[] = []

    // The table may be inside a sibling div — search next siblings
    let sibling = $(el).next()
    for (let i = 0; i < 3; i++) {
      if (!sibling.length) break
      const table = sibling.is('table') ? sibling : sibling.find('table').first()
      if (table.length) {
        table.find('tr').each((_, row) => {
          const cellText = $(row).text().trim()
          if (!cellText || cellText.toLowerCase().includes('ruhetag')) return
          const price = parsePrice(cellText)
          const name = cellText.replace(/EUR?\s*[\d.,]+/gi, '').trim()
          if (name) items.push({ name, price, tags: parseTags(name) })
        })
        break
      }
      sibling = sibling.next()
    }

    if (items.length > 0) {
      const dayIndex = WEEKDAY_MAP[dayKey]
      if (!days.find((d) => d.date === getDateForWeekday(dayIndex))) {
        days.push({ date: getDateForWeekday(dayIndex), items })
      }
    }
  })

  return {
    restaurantId: 'illing',
    lastUpdated: new Date().toISOString(),
    days,
  }
}
