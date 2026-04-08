import { DayMenu, MenuItem, RestaurantMenu } from '../types'
import Anthropic from '@anthropic-ai/sdk'

async function findPdfUrl(): Promise<string> {
  const chromium = (await import('@sparticuz/chromium-min')).default
  const puppeteer = (await import('puppeteer-core')).default
  const execPath = await chromium.executablePath(
    'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
  )
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1280, height: 800 },
    executablePath: execPath,
    headless: true,
  })
  try {
    const page = await browser.newPage()

    // Intercept network requests to catch the PDF URL directly
    let interceptedPdfUrl: string | null = null
    page.on('request', req => {
      const url = req.url()
      if (url.includes('.pdf') && (url.includes('ugd') || url.includes('sandwicher'))) {
        interceptedPdfUrl = url
      }
    })

    // Navigate to the ordering page and wait for Wix JS to inject page data
    await page.goto('https://www.sandwicher.de/bestellen', { waitUntil: 'networkidle0', timeout: 30000 })
    await new Promise(r => setTimeout(r, 2000))

    // All PDF links are embedded in the Wix JS data blobs in the HTML.
    // Find the PDF URL that appears closest AFTER the word "wochenkarte".
    const pdfUrl = await page.evaluate(() => {
      const html = document.documentElement.innerHTML
      const lower = html.toLowerCase()

      // Find all positions of "wochenkarte"
      const wochenPositions: number[] = []
      let pos = 0
      while ((pos = lower.indexOf('wochenkarte', pos)) !== -1) {
        wochenPositions.push(pos)
        pos++
      }

      // Find all PDF URLs and their positions
      const pdfRegex = /https:\/\/[^"'\s\\]{10,}\.pdf/gi
      let m: RegExpExecArray | null
      const pdfs: { url: string; idx: number }[] = []
      while ((m = pdfRegex.exec(html)) !== null) {
        pdfs.push({ url: m[0], idx: m.index })
      }

      if (pdfs.length === 0) return null

      // For each "wochenkarte" occurrence, find the nearest PDF URL within 5000 chars after it
      for (const wPos of wochenPositions) {
        const nearby = pdfs.filter(p => p.idx > wPos && p.idx < wPos + 5000)
        if (nearby.length > 0) return nearby[0].url
      }

      // Fallback: return any ugd PDF (last resort)
      const ugd = pdfs.find(p => p.url.includes('ugd/b086f8'))
      return ugd?.url ?? null
    })

    if (pdfUrl) return pdfUrl

    // If still not found, try intercepted request from clicking
    await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'))
      const el = all.find(e => e.textContent?.toLowerCase().includes('wochenkarte öffnen'))
      if (el) (el as HTMLElement).click()
    })
    await new Promise(r => setTimeout(r, 3000))
    if (interceptedPdfUrl) return interceptedPdfUrl

    throw new Error('Keine Wochenkarte-PDF auf sandwicher.de/bestellen gefunden')
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

  // Remap PDF dates to the current week by weekday position.
  // Ensures menu always appears even if the PDF has last week's dates.
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
