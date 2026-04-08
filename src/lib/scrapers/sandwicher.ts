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
    await page.goto('https://www.sandwicher.de/bestellen', { waitUntil: 'networkidle0', timeout: 30000 })
    await new Promise(r => setTimeout(r, 3000))

    // Strategy 1: find <a href="...pdf"> near "wochenkarte" text in fully rendered DOM
    const fromHref = await page.evaluate(() => {
      // Check all <a> tags for PDF href
      const links = Array.from(document.querySelectorAll('a[href]'))
      for (const a of links) {
        const href = (a as HTMLAnchorElement).href
        if (href.includes('.pdf') && href.includes('ugd')) {
          // Is this link near "wochenkarte" text?
          const container = a.closest('[id], [data-testid], section') ?? document.body
          if (container.textContent?.toLowerCase().includes('wochenkarte')) return href
          // Or does the link itself contain wochenkarte text?
          if (a.textContent?.toLowerCase().includes('wochenkarte')) return href
        }
      }
      // Fallback: any PDF link on the page
      for (const a of links) {
        const href = (a as HTMLAnchorElement).href
        if (href.includes('.pdf') && href.includes('ugd')) return href
      }
      return null
    })
    if (fromHref) return fromHref

    // Strategy 2: snapshot tabs before click, then diff after to find the new PDF tab
    const urlsBefore = new Set(browser.targets().map(t => t.url()))

    await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'))
      const el = all.find(e =>
        e.children.length === 0 &&
        e.textContent?.toLowerCase().includes('wochenkarte')
      )
      if (el) (el as HTMLElement).click()
    })

    // Wait for the new tab to appear and navigate to the PDF
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 500))
      for (const target of browser.targets()) {
        const url = target.url()
        if (!urlsBefore.has(url) && (url.includes('.pdf') || url.includes('ugd'))) {
          return url
        }
        // New tab may still be loading — check its current URL
        if (!urlsBefore.has(url) && url !== 'about:blank') {
          try {
            const newPage = await target.page()
            const navUrl = newPage?.url() ?? ''
            if (navUrl.includes('.pdf') || navUrl.includes('ugd')) return navUrl
          } catch { /* ignore */ }
        }
      }
    }

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

  // Remap PDF dates to current week by weekday — works even if PDF has old dates
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
