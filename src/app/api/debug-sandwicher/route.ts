import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
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

    const page = await browser.newPage()
    await page.goto('https://www.sandwicher.de', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await new Promise(r => setTimeout(r, 5000))

    const navEl = await page.$('[aria-label="Mittwoch"]')
    if (navEl) {
      await navEl.click()
      await new Promise(r => setTimeout(r, 3000))
    }

    const text = await page.evaluate(() => document.body.innerText || '')
    await browser.close()

    const idx = text.indexOf("gibt's heute")
    const section = idx >= 0 ? text.slice(idx, idx + 500) : text.slice(0, 500)

    return NextResponse.json({ execPath, navFound: !!navEl, section })
  } catch (e) {
    return NextResponse.json({ error: String(e) })
  }
}
