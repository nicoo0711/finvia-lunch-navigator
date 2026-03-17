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
  const months: Record<string, string> = {
    januar: '01', februar: '02', märz: '03', april: '04',
    mai: '05', juni: '06', juli: '07', august: '08',
    september: '09', oktober: '10', november: '11', dezember: '12',
  }
  const match = text.match(/(\d{1,2})\.\s*(\w+)\s*(\d{4})/i)
  if (!match) return null
  const month = months[match[2].toLowerCase()]
  if (!month) return null
  return `${match[3]}-${month}-${match[1].padStart(2, '0')}`
}

export async function scrapeSandwicher(): Promise<RestaurantMenu> {
  const res = await fetch('https://www.sandwicher.de', {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FINVIALunchBot/1.0)' },
  })
  const html = await res.text()

  // Decode HTML entities
  const decoded = html
    .replace(/&auml;/g, 'ä').replace(/&ouml;/g, 'ö').replace(/&uuml;/g, 'ü')
    .replace(/&Auml;/g, 'Ä').replace(/&Ouml;/g, 'Ö').replace(/&Uuml;/g, 'Ü')
    .replace(/&szlig;/g, 'ß').replace(/&euro;/g, '€').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

  // Find the "Was gibt's heute?" section
  const heuteIdx = decoded.indexOf("gibt's heute")
  if (heuteIdx === -1) return { restaurantId: 'sandwicher', lastUpdated: new Date().toISOString(), days: [] }

  const section = decoded.slice(heuteIdx, heuteIdx + 3000)
  const $ = cheerio.load(section)
  const text = $.text()

  const date = parseDate(text)
  if (!date) return { restaurantId: 'sandwicher', lastUpdated: new Date().toISOString(), days: [] }

  const items: MenuItem[] = []
  const lines = text.split(/[\n​]+/).map(l => l.trim()).filter(l => l.length > 3)

  lines.forEach((line) => {
    const price = parsePrice(line)
    if (price > 0) {
      const name = line.replace(/([\d]+[.,][\d]+)\s*€/, '').trim()
      if (name.length > 3) {
        items.push({ name, price, tags: parseTags(name) })
      }
    }
  })

  const days: DayMenu[] = items.length > 0 ? [{ date, items }] : []

  return {
    restaurantId: 'sandwicher',
    lastUpdated: new Date().toISOString(),
    days,
  }
}
