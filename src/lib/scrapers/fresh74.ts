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
  const chromium = (await import('@sparticuz/chromium-min')).default
  const puppeteer = (await import('puppeteer-core')).default

  const execPath = await chromium.executablePath(
    'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
  )

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1280, height: 900 },
    executablePath: execPath,
    headless: true,
  })

  let imageBase64 = ''
  let imageMime = 'image/jpeg'

  try {
    const page = await browser.newPage()
    await page.goto('https://www.fresh74.de/menue/', { waitUntil: 'domcontentloaded', timeout: 20000 })
    await new Promise(r => setTimeout(r, 3000))

    // Find the menu image URL
    const imgUrl = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'))
      // Find the largest image (likely the menu)
      const menuImg = imgs
        .filter(img => img.src && img.naturalWidth > 200)
        .sort((a, b) => (b.naturalWidth * b.naturalHeight) - (a.naturalWidth * a.naturalHeight))[0]
      return menuImg?.src || ''
    })

    if (imgUrl) {
      const imgRes = await page.goto(imgUrl)
      if (imgRes) {
        const buffer = await imgRes.buffer()
        imageBase64 = buffer.toString('base64')
        const ct = imgRes.headers()['content-type'] || 'image/jpeg'
        imageMime = ct.split(';')[0] as typeof imageMime
      }
    }
  } finally {
    await browser.close()
  }

  if (!imageBase64) throw new Error('Kein Bild gefunden auf fresh74')

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
  if (!jsonMatch) throw new Error(`Claude Response: ${raw.slice(0, 200)}`)

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

  return { restaurantId: 'fresh74', lastUpdated: new Date().toISOString(), days }
}
