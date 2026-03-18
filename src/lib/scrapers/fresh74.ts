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
  // Use Jina.ai to bypass Cloudflare and get the og:image URL
  const jinaRes = await fetch('https://r.jina.ai/https://www.fresh74.de/menue/', {
    headers: { 'Accept': 'application/json', 'X-No-Cache': 'true' },
  })
  const jinaData = await jinaRes.json()
  const imgUrl = jinaData?.data?.metadata?.['og:image']
  if (!imgUrl) throw new Error('Kein Menübild gefunden auf fresh74')

  // Download the image
  const imgRes = await fetch(imgUrl)
  if (!imgRes.ok) throw new Error(`Bild konnte nicht geladen werden: ${imgRes.status}`)
  const buffer = await imgRes.arrayBuffer()
  const imageBase64 = Buffer.from(buffer).toString('base64')
  const imageMime = (imgRes.headers.get('content-type') || 'image/jpeg').split(';')[0]

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
