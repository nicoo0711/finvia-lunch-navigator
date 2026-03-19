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

function parseDate(text: string): string | null {
  const m = text.match(/(\d{1,2})\.\s*([a-zA-ZäöüÄÖÜ]+)\s*(\d{4})/i)
  if (m) {
    const month = MONTHS[m[2].toLowerCase()]
    if (month) return `${m[3]}-${month}-${m[1].padStart(2, '0')}`
  }
  return null
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

function parseItemsFromSlide(text: string): MenuItem[] {
  const items: MenuItem[] = []
  const cleaned = text.replace(/\u200B/g, '')
  const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 3)
  let currentName = ''

  for (const line of lines) {
    if (/\d{1,2}\.\s*[a-zA-ZäöüÄÖÜ]+\s*\d{4}/.test(line)) break

    const price = parsePrice(line)
    if (price > 0 && price > 3 && price < 30) {
      const rawName = line.replace(/([\d]+[.,][\d]+)\s*€/, '').trim()
      // Strip tagline that may appear on the same line as a price
      const nameFromLine = rawName.replace(/steckt zwischen zwei scheiben\s*/gi, '').trim()
      const name = nameFromLine.length > 5 ? nameFromLine : `${currentName} ${nameFromLine}`.trim()
      if (name.length > 3) items.push({ name, price, tags: parseTags(name) })
      currentName = ''
    } else if (
      line.length < 80 &&
      !NOISE_PATTERNS.some(p => p.test(line))
    ) {
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
      await new Promise(r => setTimeout(r, 1800))

      const { slideText, foundDate } = await page.evaluate(() => {
        const allWithAriaHidden = Array.from(document.querySelectorAll('[aria-hidden]'))
        const activePanel = allWithAriaHidden.find(
          el => el.getAttribute('aria-hidden') === 'false' &&
                (el as HTMLElement).innerText?.length > 50
        )

        const text = activePanel
          ? (activePanel as HTMLElement).innerText
          : (document.body as HTMLElement).innerText

        const m = text.match(/\d{1,2}\.\s*(?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s*\d{4}/i)
        return { slideText: text, foundDate: m ? m[0] : null }
      })

      const isoDate = foundDate ? parseDate(foundDate) : getDateForWeekdayIndex(i)
      if (!isoDate) continue

      if (days.some(d => d.date === isoDate)) continue

      const items = parseItemsFromSlide(slideText)
      if (items.length > 0) days.push({ date: isoDate, items })
    }

  } finally {
    await browser.close()
  }

  return { restaurantId: 'sandwicher', lastUpdated: new Date().toISOString(), days }
}
