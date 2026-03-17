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
  // e.g. "Dienstag, 17. März 2026"
  const months: Record<string, string> = {
    januar: '01', februar: '02', märz: '03', april: '04',
    mai: '05', juni: '06', juli: '07', august: '08',
    september: '09', oktober: '10', november: '11', dezember: '12',
  }
  const match = text.match(/(\d{1,2})\.\s+(\w+)\s+(\d{4})/i)
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
  const $ = cheerio.load(html)

  const days: DayMenu[] = []

  // Sandwicher shows each day in a slider section
  // Each slide has a date and menu items
  $('[data-hook="slide"], .slide, section').each((_, section) => {
    const sectionText = $(section).text()
    const date = parseDate(sectionText)
    if (!date) return

    const items: MenuItem[] = []
    const lines = sectionText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 3)

    lines.forEach((line) => {
      const price = parsePrice(line)
      if (price > 0) {
        const name = line.replace(/([\d]+[.,][\d]+)\s*€/, '').trim()
        if (name.length > 3) {
          items.push({ name, price, tags: parseTags(name) })
        }
      }
    })

    if (items.length > 0) {
      // Avoid duplicate dates
      if (!days.find((d) => d.date === date)) {
        days.push({ date, items })
      }
    }
  })

  // Fallback: parse the whole page text for today's menu
  if (days.length === 0) {
    const bodyText = $('body').text()
    const date = parseDate(bodyText)
    if (date) {
      const items: MenuItem[] = []
      bodyText.split('\n').forEach((line) => {
        line = line.trim()
        const price = parsePrice(line)
        if (price > 0) {
          const name = line.replace(/([\d]+[.,][\d]+)\s*€/, '').trim()
          if (name.length > 3) {
            items.push({ name, price, tags: parseTags(name) })
          }
        }
      })
      if (items.length > 0) days.push({ date, items })
    }
  }

  return {
    restaurantId: 'sandwicher',
    lastUpdated: new Date().toISOString(),
    days,
  }
}
