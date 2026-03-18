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

function parseDate(text: string): string | null {
  // Format: "18. März 2026"
  const months: Record<string, string> = {
    januar: '01', februar: '02', märz: '03', april: '04',
    mai: '05', juni: '06', juli: '07', august: '08',
    september: '09', oktober: '10', november: '11', dezember: '12',
  }
  const nameMatch = text.match(/(\d{1,2})\.\s*([a-zA-ZäöüÄÖÜ]+)\s*(\d{4})/i)
  if (nameMatch) {
    const month = months[nameMatch[2].toLowerCase()]
    if (month) return `${nameMatch[3]}-${month}-${nameMatch[1].padStart(2, '0')}`
  }
  // Format: "18.03.2026"
  const numMatch = text.match(/(\d{1,2})\.(\d{2})\.(\d{4})/)
  if (numMatch) return `${numMatch[3]}-${numMatch[2]}-${numMatch[1].padStart(2, '0')}`
  return null
}

function parseItems(text: string): MenuItem[] {
  const items: MenuItem[] = []
  const cleaned = text.replace(/\u200B/g, '')
  const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 3)
  const datePattern = /\d{1,2}\.\s*[a-zA-ZäöüÄÖÜ]+\s*\d{4}/
  let foundFirstDate = false
  let currentName = ''
  for (const line of lines) {
    if (datePattern.test(line)) {
      if (foundFirstDate) break
      foundFirstDate = true
      continue
    }
    const price = parsePrice(line)
    if (price > 0) {
      const nameFromLine = line.replace(/([\d]+[.,][\d]+)\s*€/, '').trim()
      const fullName = (currentName + ' ' + nameFromLine).trim()
      if (fullName.length > 3) items.push({ name: fullName, price, tags: parseTags(fullName) })
      currentName = ''
    } else if (!line.includes('heute') && !line.includes('Ob für') && line.length < 80) {
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

    // Click each day and extract menu
    for (let i = 0; i < WEEKDAY_LABELS.length; i++) {
      const label = WEEKDAY_LABELS[i]
      const expectedDate = getDateForWeekdayIndex(i)

      const navEl = await page.$(`[aria-label="${label}"]`)
      if (!navEl) continue

      // Try up to 3 times to load the correct slide
      let items: MenuItem[] = []
      for (let attempt = 0; attempt < 3; attempt++) {
        await navEl.click()
        await new Promise(r => setTimeout(r, 3000))

        const text = await page.evaluate(() => {
          const all = (document.body as HTMLElement).innerText || document.body.textContent || ''
          const idx = all.indexOf("gibt's heute")
          return idx >= 0 ? all.slice(idx, idx + 2000) : all.slice(0, 3000)
        })

        if (text.includes(label)) {
          items = parseItems(text)
          break
        }
      }

      if (items.length > 0) days.push({ date: expectedDate, items })
    }

  } finally {
    await browser.close()
  }

  return { restaurantId: 'sandwicher', lastUpdated: new Date().toISOString(), days }
}
