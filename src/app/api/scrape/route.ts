import { NextRequest, NextResponse } from 'next/server'
import { scrapeIlling } from '@/lib/scrapers/illing'
import { scrapeSandwicher } from '@/lib/scrapers/sandwicher'
import { saveMenu } from '@/lib/store'

export const maxDuration = 60

export async function GET(req: NextRequest) {
  // Protect with cron secret in production
  const secret = req.nextUrl.searchParams.get('secret')
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, string> = {}

  try {
    const illingMenu = await scrapeIlling()
    saveMenu(illingMenu)
    results.illing = `OK – ${illingMenu.days.length} Tage gescrapt`
  } catch (e) {
    results.illing = `Fehler: ${e}`
  }

  try {
    const sandwicherMenu = await scrapeSandwicher()
    await saveMenu(sandwicherMenu)
    results.sandwicher = `OK – ${sandwicherMenu.days.length} Tage | debug: ${JSON.stringify((sandwicherMenu as any).debug)}`
  } catch (e) {
    results.sandwicher = `Fehler: ${String(e)}`
  }

  return NextResponse.json({ success: true, results, time: new Date().toISOString() })
}
