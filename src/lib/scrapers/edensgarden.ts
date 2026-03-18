import * as cheerio from 'cheerio'
import { DayMenu, MenuItem, RestaurantMenu } from '../types'

function parsePrice(text: string): number {
  const match = text.match(/([\d]+[.,][\d]+)/)
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

function getThisWeekDates(): string[] {
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

export async function scrapeEdensGarden(): Promise<RestaurantMenu> {
  const res = await fetch('https://edensgarden-restaurant.com/our-menu/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LunchNavigator/1.0)' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  const $ = cheerio.load(html)

  const items: MenuItem[] = []

  // Find the Mittagsmenü section and extract h5 pairs (name + price)
  let inMittag = false
  $('h4, h5').each((_, el) => {
    const tag = el.tagName.toLowerCase()
    const text = $(el).text().trim()

    if (tag === 'h4') {
      inMittag = text.toLowerCase().includes('mittag')
      return
    }

    if (!inMittag || tag !== 'h5') return

    // Check if this h5 is a price
    if (text.includes('€') || /^\d+[.,]\d+$/.test(text)) return

    // This h5 is a dish name — find the next h5 as price
    const nextH5 = $(el).nextAll('h5').first().text().trim()
    const price = parsePrice(nextH5)
    if (text.length > 2) {
      items.push({ name: text, price, tags: parseTags(text) })
    }
  })

  if (items.length === 0) throw new Error('Keine Mittagsmenü-Gerichte gefunden')

  // Show same items every day of the week
  const dates = getThisWeekDates()
  const days: DayMenu[] = dates.map(date => ({ date, items }))

  return { restaurantId: 'edensgarden', lastUpdated: new Date().toISOString(), days }
}
