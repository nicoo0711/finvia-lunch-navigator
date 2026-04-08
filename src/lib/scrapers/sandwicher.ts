import { DayMenu, MenuItem, RestaurantMenu } from '../types'
import Anthropic from '@anthropic-ai/sdk'

async function findPdfUrl(): Promise<string> {
  const chromium = (await import('@sparticuz/chromium-min')).default
  const puppeteer = (await import('puppeteer-core')).default
  const execPath = await chromium.executablePath(
    'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
  )
  const browser = await puppeteer.launch({
    args: [...chromium.args, '--disable-popup-blocking'],
    defaultViewport: { width: 1280, height: 800 },
    executablePath: execPath,
    headless: true,
  })
  try {
    const page = await browser.newPage()

    // Intercept ALL JS/JSON responses during page load.
    // Wix loads the full page model as JSON — the PDF URL must be in there.
    const foundUrls: string[] = []
    page.on('response', async resp => {
      const ct = resp.headers()['content-type'] ?? ''
      if (!ct.includes('json') && !ct.includes('javascript')) return
      try {
        const text = await resp.text()
        const matches = text.match(/b086f8_[a-f0-9]{32}\.pdf/gi)
        if (matches) {
          for (const m of matches) {
            foundUrls.push(`https://static.wixstatic.com/ugd/${m}`)
          }
        }
      } catch { /* ignore */ }
    })

    await page.goto('https://www.sandwicher.de/bestellen', { waitUntil: 'networkidle0', timeout: 30000 })
    await new Promise(r => setTimeout(r, 2000))

    // Return the LAST found PDF (most recently referenced = most likely the current week)
    if (foundUrls.length > 0) {
      return foundUrls[foundUrls.length - 1]
    }

    // Fallback: check rendered <a> tags
    const hrefUrl = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*=".pdf"]'))
      return links.map(a => (a as HTMLAnchorElement).href).find(h => h.includes('ugd')) ?? null
    })
    if (hrefUrl) return hrefUrl

    throw new Error(`Keine PDF gefunden. Gefundene URLs: ${foundUrls.join(', ')}`)
  } finally {
    await browser.close()
  }
}

function parseTags(name: string): MenuItem['tags'] {
  const lower = name.toLowerCase()
  const tags: MenuItem['tags'] = []
  if (lower.includes('vegan')) tags.push('vegan')
  if (lower.includes('vegetar')) tags.push('vegetarisch')
  if (lower.includes('glutenfrei') || lower.includes('gluten frei')) tags.push('glutenfrei')
  return tags
}

export async function scrapeSandwicher(): Promise<RestaurantMenu> {
  const pdfUrl = await findPdfUrl()

  const response = await fetch(pdfUrl)
  if (!response.ok) throw new Error(`PDF fetch fehlgeschlagen: ${response.status}`)
  const buffer = await response.arrayBuffer()
  const pdfBase64 = Buffer.from(buffer).toString('base64')

  const client = new Anthropic()
  const aiResponse = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
        },
        {
          type: 'text',
          text: 'Das ist der Wochenplan eines Restaurants. Extrahiere alle Gerichte pro Tag mit Name und Preis. Antworte NUR im JSON-Format: [{"date": "YYYY-MM-DD", "name": "Gerichtname", "price": 9.50}]. Das Datum steht als Wochentag + deutsches Datum im PDF (z.B. "Montag, 7. April 2026").',
        },
      ],
    }],
  })

  const raw = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : ''
  const jsonMatch = raw.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error(`Claude Antwort: ${raw.slice(0, 300)}`)

  const parsed = JSON.parse(jsonMatch[0]) as { date: string; name: string; price: number }[]

  // Remap PDF dates to current week by weekday
  const now = new Date()
  const dow = now.getDay()
  const thisMonday = new Date(now)
  thisMonday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1))
  thisMonday.setHours(0, 0, 0, 0)

  function remapToCurrentWeek(isoDate: string): string {
    const d = new Date(isoDate + 'T12:00:00Z')
    const wd = d.getUTCDay()
    const offset = wd === 0 ? 6 : wd - 1
    const mapped = new Date(thisMonday)
    mapped.setDate(thisMonday.getDate() + offset)
    const y = mapped.getFullYear()
    const m = String(mapped.getMonth() + 1).padStart(2, '0')
    const day = String(mapped.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const dayMap = new Map<string, MenuItem[]>()
  for (const item of parsed) {
    const date = item.date || ''
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    const remapped = remapToCurrentWeek(date)
    if (!dayMap.has(remapped)) dayMap.set(remapped, [])
    dayMap.get(remapped)!.push({ name: item.name, price: item.price, tags: parseTags(item.name) })
  }

  const days: DayMenu[] = Array.from(dayMap.entries())
    .map(([date, items]) => ({ date, items }))
    .sort((a, b) => a.date.localeCompare(b.date))

  if (days.length === 0) throw new Error(`Keine Tage geparst. Claude JSON: ${jsonMatch[0].slice(0, 300)}`)
  return { restaurantId: 'sandwicher', lastUpdated: new Date().toISOString(), days }
}
