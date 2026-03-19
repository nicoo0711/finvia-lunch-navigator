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

const MONTHS: Record<string, string> = {
  januar: '01', februar: '02', märz: '03', april: '04',
  mai: '05', juni: '06', juli: '07', august: '08',
  september: '09', oktober: '10', november: '11', dezember: '12',
}

// Lines to skip as item names (page UI noise)
const NOISE_PATTERNS = [
  /steckt zwischen/i,
  /sandwicher/i,
  /reuterweg/i,
  /ob für/i,
  /heute/i,
  /\d{1,2}:\d{2}/,
  /mo[–-]fr/i,
  /täglich/i,
  /unsere/i,
  /willkommen/i,
]

function parseSection(section: string): MenuItem[] {
  const items: MenuItem[] = []
  const lines = section.replace(/\u200B/g, '').split('\n').map(l => l.trim()).filter(l => l.length > 3)
  let currentName = ''

  for (const line of lines) {
    // Stop at any date-like string (section boundary)
    if (/\d{1,2}\.\s*[a-zA-ZäöüÄÖÜ]+\s*\d{4}/.test(line)) break

    const price = parsePrice(line)
    if (price > 0 && price > 3 && price < 30) {
      const rawName = line.replace(/([\d]+[.,][\d]+)\s*€/, '').trim()
      // Strip tagline that bleeds into the same line as price
      const nameFromLine = rawName.replace(/steckt zwischen zwei scheiben\s*/gi, '').trim()
      const name = nameFromLine.length > 5 ? nameFromLine : `${currentName} ${nameFromLine}`.trim()
      if (name.length > 3) items.push({ name, price, tags: parseTags(name) })
      currentName = ''
    } else if (line.length < 80 && !NOISE_PATTERNS.some(p => p.test(line))) {
      currentName = line
    }
  }
  return items
}

const WEEKDAY_LABELS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag']

function getDateForWeekdayIndex(i: number): string {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  monday.setDate(monday.getDate() + i)
  return monday.toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' })
}

function toGermanDate(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00')
  return d.toLocaleDateString('de-DE', {
    timeZone: 'Europe/Berlin',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export async function scrapeSandwicher(): Promise<RestaurantMenu> {
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

  const days: DayMenu[] = []

  try {
    const page = await browser.newPage()
    await page.goto('https://www.sandwicher.de', { waitUntil: 'domcontentloaded', timeout: 20000 })
    await new Promise(r => setTimeout(r, 3000))

    // Click all tabs to ensure every slide's content is loaded into the DOM
    for (const label of WEEKDAY_LABELS) {
      const navEl = await page.$(`[aria-label="${label}"]`)
      if (navEl) {
        await navEl.click()
        await new Promise(r => setTimeout(r, 800))
      }
    }

    // Get text from ALL DOM nodes including hidden elements (textContent, not innerText).
    // Wix sliders keep all slides in the DOM; innerText skips hidden ones.
    const fullText: string = await page.evaluate(() => {
      const parts: string[] = []
      const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const t = node.textContent?.trim()
          if (t) parts.push(t)
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const tag = (node as Element).tagName.toLowerCase()
          if (['script', 'style', 'noscript'].includes(tag)) return
          node.childNodes.forEach(walk)
          if (['p', 'div', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'span', 'br'].includes(tag)) {
            parts.push('\n')
          }
        }
      }
      walk(document.body)
      return parts.join('')
    })

    // Build date entries: find where each day's date marker sits in the full text.
    // The date appears at the END of each day's slide content.
    const dateEntries = WEEKDAY_LABELS.map((_, i) => {
      const isoDate = getDateForWeekdayIndex(i)
      const germanDate = toGermanDate(isoDate)
      const idx = fullText.indexOf(germanDate)
      return { isoDate, germanDate, idx }
    })

    for (let i = 0; i < dateEntries.length; i++) {
      const { isoDate, germanDate, idx: endIdx } = dateEntries[i]
      if (endIdx < 0) continue

      // Start = right after the previous date marker (or beginning of file for Monday)
      const prevIdx = dateEntries.slice(0, i).map(e => e.idx).filter(p => p >= 0)
      const startIdx = prevIdx.length > 0 ? Math.max(...prevIdx) + 1 : 0

      // Section: everything between previous date and this date (date is at end of section)
      const section = fullText.slice(startIdx, endIdx + germanDate.length)
      const items = parseSection(section)
      if (items.length > 0) days.push({ date: isoDate, items })
    }

  } finally {
    await browser.close()
  }

  return { restaurantId: 'sandwicher', lastUpdated: new Date().toISOString(), days }
}
