import { DayMenu, MenuItem, RestaurantMenu } from '../types'
import Anthropic from '@anthropic-ai/sdk'

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

const DAY_LABELS: Record<string, number> = {
  montag: 0, dienstag: 1, mittwoch: 2, donnerstag: 3, freitag: 4,
}

export async function scrapeFresh74(): Promise<RestaurantMenu> {
  // Jina.ai takes a screenshot of the page, bypassing Cloudflare
  const jinaRes = await fetch('https://r.jina.ai/https://www.fresh74.de/menue/', {
    headers: { 'X-Return-Format': 'screenshot' },
  })

  if (!jinaRes.ok) throw new Error(`Jina screenshot fehlgeschlagen: ${jinaRes.status}`)

  const buffer = await jinaRes.arrayBuffer()
  if (buffer.byteLength < 10000) throw new Error('Screenshot zu klein – Seite nicht geladen')

  const imageBase64 = Buffer.from(buffer).toString('base64')
  const contentType = jinaRes.headers.get('content-type') || 'image/png'
  const imageMime = contentType.split(';')[0]

  // Use Claude Vision to read the menu from the screenshot
  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: imageMime as any, data: imageBase64 },
        },
        {
          type: 'text',
          text: 'Das ist ein Screenshot der Wochenspeisekarte eines Restaurants. Extrahiere alle Gerichte mit Preis pro Wochentag. Antworte NUR im JSON-Format: {"montag": [{"name": "...", "price": 9.50}], "dienstag": [...], ...}. Wenn kein Preis erkennbar, setze 0. Wenn kein Tag erkennbar, nutze "allgemein".',
        },
      ],
    }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error(`Claude sieht: ${raw.slice(0, 300)}`)

  const parsed = JSON.parse(jsonMatch[0]) as Record<string, { name: string; price: number }[]>
  const days: DayMenu[] = []

  for (const [dayKey, items] of Object.entries(parsed)) {
    const key = dayKey.toLowerCase()
    const mappedItems = items.map(i => ({ name: i.name, price: i.price, tags: parseTags(i.name) }))
    if (key === 'allgemein') {
      // No day breakdown — store once (weekly view shows all days anyway)
      days.push({ date: getDateForWeekday(0), items: mappedItems })
    } else {
      const dayIndex = DAY_LABELS[key]
      if (dayIndex === undefined) continue
      days.push({ date: getDateForWeekday(dayIndex), items: mappedItems })
    }
  }

  if (days.length === 0) throw new Error(`Claude JSON: ${jsonMatch[0].slice(0, 300)}`)
  return { restaurantId: 'fresh74', lastUpdated: new Date().toISOString(), days }
}
