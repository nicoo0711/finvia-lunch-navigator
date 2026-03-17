import * as cheerio from 'cheerio'
import { DayMenu, MenuItem, RestaurantMenu } from '../types'

const WEEKDAY_MAP: Record<string, string> = {
  montag: 'Montag',
  dienstag: 'Dienstag',
  mittwoch: 'Mittwoch',
  donnerstag: 'Donnerstag',
  freitag: 'Freitag',
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

// Get the ISO date for a given weekday in the current week (Mon=0)
function getDateForWeekday(weekdayIndex: number): string {
  const now = new Date()
  const day = now.getDay() // 0=Sun, 1=Mon...
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
  let currentDayIndex = -1

  // Each day is a heading (h2 or strong), followed by a table
  $('h2, h3, strong').each((_, el) => {
    const text = $(el).text().trim().toLowerCase().replace(':', '')
    const dayKey = Object.keys(WEEKDAY_MAP).find((d) => text.includes(d))
    if (!dayKey) return

    currentDayIndex = Object.keys(WEEKDAY_MAP).indexOf(dayKey)
    const items: MenuItem[] = []

    // Find the next table after this heading
    const table = $(el).closest('h2, h3, p').nextAll('table').first()
    table.find('tr').each((_, row) => {
      const cellText = $(row).text().trim()
      if (!cellText || cellText.toLowerCase().includes('ruhetag')) return
      const price = parsePrice(cellText)
      const name = cellText.replace(/EUR?\s*[\d.,]+/gi, '').trim()
      if (name) {
        items.push({ name, price, tags: parseTags(name) })
      }
    })

    if (items.length > 0) {
      days.push({
        date: getDateForWeekday(currentDayIndex),
        items,
      })
    }
  })

  return {
    restaurantId: 'illing',
    lastUpdated: new Date().toISOString(),
    days,
  }
}
