import { NextRequest, NextResponse } from 'next/server'
import { scrapeIlling } from '@/lib/scrapers/illing'
import { scrapeSandwicher } from '@/lib/scrapers/sandwicher'
import { scrapeFresh74 } from '@/lib/scrapers/fresh74'
import { scrapeBlockHouse } from '@/lib/scrapers/blockhouse'
import { saveMenu, mergeMenu } from '@/lib/store'

export const maxDuration = 60

export async function GET(req: NextRequest) {
  // Protect with cron secret in production
  const secret = req.nextUrl.searchParams.get('secret')
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, string> = {}

  try {
    const blockhouseMenu = await scrapeBlockHouse()
    await saveMenu(blockhouseMenu)
    results.blockhouse = `OK – ${blockhouseMenu.days.length} Tage gescrapt`
  } catch (e) {
    results.blockhouse = `Fehler: ${String(e)}`
  }

  try {
    const illingMenu = await scrapeIlling()
    saveMenu(illingMenu)
    results.illing = `OK – ${illingMenu.days.length} Tage gescrapt`
  } catch (e) {
    results.illing = `Fehler: ${e}`
  }

  try {
    const sandwicherMenu = await scrapeSandwicher()
    await mergeMenu(sandwicherMenu)
    results.sandwicher = `OK – ${sandwicherMenu.days.length} Tage gescrapt`
  } catch (e) {
    results.sandwicher = `Fehler: ${String(e)}`
  }

  // fresh74 only on Mondays (menu changes weekly), or when forced
  const dow = new Date().toLocaleDateString('en-US', { timeZone: 'Europe/Berlin', weekday: 'long' })
  const forceFresh74 = req.nextUrl.searchParams.get('force_fresh74') === '1'
  if (dow === 'Monday' || forceFresh74) {
    try {
      const fresh74Menu = await scrapeFresh74()
      await saveMenu(fresh74Menu)
      results.fresh74 = `OK – ${fresh74Menu.days.length} Tage gescrapt`
    } catch (e) {
      results.fresh74 = `Fehler: ${String(e)}`
    }
  }

  return NextResponse.json({ success: true, results, time: new Date().toISOString() })
}
