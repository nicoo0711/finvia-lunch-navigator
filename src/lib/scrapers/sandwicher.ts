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

function parseItemsFromSection(text: string): MenuItem[] {
  const items: MenuItem[] = []
  const lines = text.replace(/\u200B/g, '').split('\n').map(l => l.trim()).filter(l => l.length > 3)
  let currentName = ''

  for (const line of lines) {
    const price = parsePrice(line)
    if (price > 3 && price < 30) {
      const nameFromLine = line.replace(/([\d]+[.,][\d]+)\s*€/, '').trim()
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

    // Click each tab and collect body.innerText per tab.
    // Works for both display:none (only current slide visible) and
    // visibility:hidden (all slides in innerText) Wix rendering modes.
    const tabTexts: string[] = []
    for (const label of WEEKDAY_LABELS) {
      const navEl = await page.$(`[aria-label="${label}"]`)
      if (navEl) {
        await navEl.click()
        await new Promise(r => setTimeout(r, 1800))
      }
      const text = await page.evaluate(() => (document.body as HTMLElement).innerText || '')
      tabTexts.push(text)
    }

    // For each day, extract items between the previous day's date and this day's date.
    // - display:none: only current slide text is present → prevDate not found → startIdx=0
    // - visibility:hidden: all slides present → prevDate found → exact section extracted
    for (let i = 0; i < WEEKDAY_LABELS.length; i++) {
      const text = tabTexts[i]
      const isoDate = getDateForWeekdayIndex(i)
      const germanDate = toGermanDate(isoDate)

      const dateIdx = text.indexOf(germanDate)
      if (dateIdx < 0) continue

      let startIdx = 0
      if (i > 0) {
        const prevGermanDate = toGermanDate(getDateForWeekdayIndex(i - 1))
        const prevIdx = text.indexOf(prevGermanDate)
        if (prevIdx >= 0 && prevIdx < dateIdx) {
          startIdx = prevIdx + prevGermanDate.length
        }
      }

      const section = text.slice(startIdx, dateIdx)
      const items = parseItemsFromSection(section)
      if (items.length > 0) days.push({ date: isoDate, items })
    }

  } finally {
    await browser.close()
  }

  return { restaurantId: 'sandwicher', lastUpdated: new Date().toISOString(), days }
}
