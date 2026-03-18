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
  // Use Jina.ai reader to bypass Cloudflare and get the page HTML
  const jinaRes = await fetch('https://r.jina.ai/https://www.fresh74.de/menue/', {
    headers: {
      'Accept': 'application/json',
      'X-Return-Format': 'html',
    },
  })
  const html = await jinaRes.text()

  // Extract all image URLs from the HTML
  const imgRegex = /src="(https?:\/\/[^"]+\.(jpg|jpeg|png|webp)[^"]*)"/gi
  const imgUrls: string[] = []
  let m: RegExpExecArray | null
  while ((m = imgRegex.exec(html)) !== null) {
    const url = m[1]
    if (!url.includes('logo') && !url.includes('icon') && !url.includes('avatar')) {
      imgUrls.push(url)
    }
  }

  if (imgUrls.length === 0) throw new Error('Kein Bild auf der fresh74 Seite gefunden')

  // Try each image until we find one that looks like a menu (large enough)
  let imageBase64 = ''
  let imageMime = 'image/jpeg'

  for (const url of imgUrls) {
    try {
      const imgRes = await fetch(url)
      if (!imgRes.ok) continue
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
      const buffer = await imgRes.arrayBuffer()
      if (buffer.byteLength < 50000) continue // skip small images
      imageBase64 = Buffer.from(buffer).toString('base64')
      imageMime = contentType.split(';')[0]
      break
    } catch {
      continue
    }
  }

  if (!imageBase64) throw new Error('Kein Menübild geladen (alle Bilder zu klein oder nicht erreichbar)')

  // Use Claude Vision to read the menu
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
          text: 'Das ist die Wochenspeisekarte eines Restaurants. Extrahiere alle Gerichte mit Preis pro Wochentag. Antworte NUR im JSON-Format: {"montag": [{"name": "...", "price": 9.50}], "dienstag": [...], ...}. Wenn kein Preis erkennbar, setze 0. Wenn kein Tag erkennbar, nutze "allgemein".',
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
    const dayIndex = DAY_LABELS[dayKey.toLowerCase()]
    if (dayIndex === undefined) continue
    days.push({
      date: getDateForWeekday(dayIndex),
      items: items.map(i => ({ name: i.name, price: i.price, tags: parseTags(i.name) })),
    })
  }

  if (days.length === 0) throw new Error(`Claude JSON: ${jsonMatch[0].slice(0, 300)}`)
  return { restaurantId: 'fresh74', lastUpdated: new Date().toISOString(), days }
}
