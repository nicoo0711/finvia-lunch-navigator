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

const NOISE_PATTERNS = [
  /steckt zwischen/i,
  /sandwicher/i,
  /reuterweg/i,
  /ob für/i,
  /heute/i,
  /\d{1,2}:\d{2}/,
  /mo[–-]fr/i,
  /täglich/i,
  /willkommen/i,
]

// Parse items from a text section that ends just before a date marker.
// parseSection stops at the first date-like string it encounters.
function parseSection(text: string): MenuItem[] {
  const items: MenuItem[] = []
  const lines = text.replace(/\u200B/g, '').split('\n').map(l => l.trim()).filter(l => l.length > 3)
  let currentName = ''

  for (const line of lines) {
    if (/\d{1,2}\.\s*[a-zA-ZäöüÄÖÜ]+\s*\d{4}/.test(line)) break

    const price = parsePrice(line)
    if (price > 3 && price < 30) {
      const rawName = line.replace(/([\d]+[.,][\d]+)\s*€/, '').trim()
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

    for (let i = 0; i < WEEKDAY_LABELS.length; i++) {
      const label = WEEKDAY_LABELS[i]
      const navEl = await page.$(`[aria-label="${label}"]`)
      if (!navEl) continue

      await navEl.click()
      await new Promise(r => setTimeout(r, 1500))

      const fullText: string = await page.evaluate(
        () => (document.body as HTMLElement).innerText || ''
      )

      const isoDate = getDateForWeekdayIndex(i)
      const germanDate = toGermanDate(isoDate)

      const dateIdx = fullText.indexOf(germanDate)
      if (dateIdx < 0) continue

      // Determine start boundary:
      // If the body contains ALL slides (visibility:hidden), the previous day's date
      // is also present — start from after it to avoid including earlier days.
      // If only the active slide is visible (display:none), the previous date won't
      // be found, so we start from 0.
      let startIdx = 0
      if (i > 0) {
        const prevGermanDate = toGermanDate(getDateForWeekdayIndex(i - 1))
        const prevIdx = fullText.indexOf(prevGermanDate)
        if (prevIdx >= 0 && prevIdx < dateIdx) {
          startIdx = prevIdx + prevGermanDate.length
        }
      }

      const section = fullText.slice(startIdx, dateIdx)
      const items = parseSection(section)
      if (items.length > 0) days.push({ date: isoDate, items })
    }

  } finally {
    await browser.close()
  }

  return { restaurantId: 'sandwicher', lastUpdated: new Date().toISOString(), days }
}
