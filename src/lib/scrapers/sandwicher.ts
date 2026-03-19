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
      // Always combine currentName (first line of multi-line item) with nameFromLine
      const name = [currentName, nameFromLine].filter(s => s.length > 0).join(' ').trim()
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
  const y = monday.getFullYear()
  const m = String(monday.getMonth() + 1).padStart(2, '0')
  const d = String(monday.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const GERMAN_MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

function toGermanDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return `${day}. ${GERMAN_MONTHS[month - 1]} ${year}`
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
  let tabTexts: string[] = []

  try {
    const page = await browser.newPage()
    await page.goto('https://www.sandwicher.de', { waitUntil: 'domcontentloaded', timeout: 20000 })
    await new Promise(r => setTimeout(r, 3000))

    // Click each tab and collect body.innerText per tab.
    // Works for both display:none (only current slide visible) and
    // visibility:hidden (all slides in innerText) Wix rendering modes.
    tabTexts = []
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

      // Menu items appear AFTER the date header
      const afterDate = text.slice(dateIdx + germanDate.length)

      // Stop at next date pattern (handles visibility:hidden where all days appear)
      const nextDateMatch = afterDate.search(
        /\d{1,2}\. (?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember) \d{4}/
      )
      const section = nextDateMatch >= 0 ? afterDate.slice(0, nextDateMatch) : afterDate

      const items = parseItemsFromSection(section)
      if (items.length > 0) days.push({ date: isoDate, items })
    }

  } finally {
    await browser.close()
  }

  return {
    restaurantId: 'sandwicher',
    lastUpdated: new Date().toISOString(),
    days,
    // @ts-ignore debug info
    _debug: {
      tabTextLengths: tabTexts.map(t => t.length),
      firstTabSample: tabTexts[0]?.slice(0, 300) ?? '',
      expectedDates: Array.from({ length: 5 }, (_, i) => toGermanDate(getDateForWeekdayIndex(i))),
      dateFoundAt: Array.from({ length: 5 }, (_, i) => {
        const t = tabTexts[i] ?? ''
        const gd = toGermanDate(getDateForWeekdayIndex(i))
        return { date: gd, idx: t.indexOf(gd) }
      }),
    },
  }
}
