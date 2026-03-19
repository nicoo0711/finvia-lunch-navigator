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
  let fullText = ''

  try {
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'de-DE,de;q=0.9' })
    await page.goto('https://www.sandwicher.de', { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise(r => setTimeout(r, 4000))

    fullText = await page.evaluate(() => (document.body as HTMLElement).innerText || '')

    // Parse each day's section from the full page text.
    // Wix renders all slides in the DOM (visibility:hidden), so all dates appear in innerText.
    for (let i = 0; i < WEEKDAY_LABELS.length; i++) {
      const isoDate = getDateForWeekdayIndex(i)
      const germanDate = toGermanDate(isoDate)

      const dateIdx = fullText.indexOf(germanDate)
      if (dateIdx < 0) continue

      const afterDate = fullText.slice(dateIdx + germanDate.length)

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
      fullTextLength: fullText.length,
      fullTextSample: fullText.slice(0, 500),
      expectedDates: Array.from({ length: 5 }, (_, i) => toGermanDate(getDateForWeekdayIndex(i))),
      dateFoundAt: Array.from({ length: 5 }, (_, i) => {
        const gd = toGermanDate(getDateForWeekdayIndex(i))
        return { date: gd, idx: fullText.indexOf(gd) }
      }),
    },
  }
}
