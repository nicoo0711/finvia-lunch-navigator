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
  const months: Record<string, string> = {
    januar: '01', februar: '02', märz: '03', april: '04',
    mai: '05', juni: '06', juli: '07', august: '08',
    september: '09', oktober: '10', november: '11', dezember: '12',
  }
  const match = text.match(/(\d{1,2})\.\s*(\w+)\s*(\d{4})/i)
  if (!match) return null
  const month = months[match[2].toLowerCase()]
  if (!month) return null
  return `${match[3]}-${month}-${match[1].padStart(2, '0')}`
}

const DAY_LABELS: Record<number, string> = {
  1: 'Montag',
  2: 'Dienstag',
  3: 'Mittwoch',
  4: 'Donnerstag',
  5: 'Freitag',
}

export async function scrapeSandwicher(): Promise<RestaurantMenu> {
  const chromium = (await import('@sparticuz/chromium-min')).default
  const puppeteer = (await import('puppeteer-core')).default

  const todayDow = new Date().toLocaleDateString('en-US', { timeZone: 'Europe/Berlin', weekday: 'long' })
  const dowMap: Record<string, number> = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5 }
  const todayIndex = dowMap[todayDow]
  const todayLabel = DAY_LABELS[todayIndex]

  const execPath = await chromium.executablePath(
    'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
  )
  if (!execPath) throw new Error('Chromium executable not found')

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1280, height: 800 },
    executablePath: execPath,
    headless: true,
  })

  try {
    const page = await browser.newPage()
    await page.goto('https://www.sandwicher.de', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await new Promise(r => setTimeout(r, 5000))

    // Click on today's day navigation dot
    if (todayLabel) {
      const navSelector = `[aria-label="${todayLabel}"]`
      const navEl = await page.$(navSelector)
      if (navEl) {
        await navEl.click()
        await new Promise(r => setTimeout(r, 3000))
      }
    }

    // Extract text from the "Was gibt's heute?" section
    const text = await page.evaluate(() => {
      // Try innerText first, then textContent
      const all = document.body.innerText || document.body.textContent || ''
      const idx = all.indexOf("gibt's heute")
      return idx >= 0 ? all.slice(idx, idx + 2000) : all.slice(0, 2000)
    })

    const date = parseDate(text)
    if (!date) return { restaurantId: 'sandwicher', lastUpdated: new Date().toISOString(), days: [] }

    const items: MenuItem[] = []
    // Join multi-line dish names (price comes after the name, sometimes on next line)
    const cleaned = text.replace(/\n​\n/g, '\n').replace(/\u200B/g, '')
    const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 3)

    let currentName = ''
    lines.forEach((line) => {
      const price = parsePrice(line)
      if (price > 0) {
        const nameFromLine = line.replace(/([\d]+[.,][\d]+)\s*€/, '').trim()
        const fullName = (currentName + ' ' + nameFromLine).trim()
        if (fullName.length > 3) items.push({ name: fullName, price, tags: parseTags(fullName) })
        currentName = ''
      } else if (!line.match(/\d{1,2}\.\s*\w+\s*\d{4}/) && line.length > 3) {
        currentName = line
      }
    })

    const days: DayMenu[] = items.length > 0 ? [{ date, items }] : []
    return { restaurantId: 'sandwicher', lastUpdated: new Date().toISOString(), days }

  } finally {
    await browser.close()
  }
}
