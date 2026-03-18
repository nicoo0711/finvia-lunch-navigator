import * as cheerio from 'cheerio'
import { DayMenu, MenuItem, RestaurantMenu } from '../types'

function parsePrice(text: string): number {
  const match = text.match(/([\d]+[.,][\d]+)\s*€/)
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

function parseDate(text: string): string | null {
  const match = text.match(/(\d{1,2})\.(\d{2})\.(\d{4})/)
  if (!match) return null
  return `${match[3]}-${match[2]}-${match[1].padStart(2, '0')}`
}

const DAY_CLASSES: Record<string, string> = {
  monday: 'montag', tuesday: 'dienstag', wednesday: 'mittwoch',
  thursday: 'donnerstag', friday: 'freitag',
}

export async function scrapeBlockHouse(): Promise<RestaurantMenu> {
  const res = await fetch('https://www.block-house.de/speisekarte/lunch-time/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LunchNavigator/1.0)' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  const $ = cheerio.load(html)

  const days: DayMenu[] = []

  // Per-day dishes
  $('.lunchtime .days .day').each((_, el) => {
    const dateText = $(el).find('.roof-line p').first().text().trim()
    const date = parseDate(dateText)
    if (!date) return

    const name = $(el).find('.headline h4').first().text().trim()
    const price = parsePrice($(el).find('p.prize').first().text())
    if (!name) return

    days.push({
      date,
      items: [{ name, price, tags: parseTags(name) }],
    })
  })

  // Weekly highlights — add to each day
  const highlights: MenuItem[] = []
  $('.lunchtime .week .offer').each((_, el) => {
    const name = $(el).find('.headline h4').first().text().trim()
    const price = parsePrice($(el).find('p.prize').first().text())
    if (name) highlights.push({ name, price, tags: parseTags(name) })
  })
  if (highlights.length > 0) {
    days.forEach(d => { d.items.push(...highlights) })
  }

  if (days.length === 0) throw new Error('Keine Gerichte gefunden')
  return { restaurantId: 'blockhouse', lastUpdated: new Date().toISOString(), days }
}
