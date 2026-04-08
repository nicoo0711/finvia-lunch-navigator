import { DayMenu, MenuItem, RestaurantMenu } from '../types'
import Anthropic from '@anthropic-ai/sdk'

const PDF_URL = 'https://www.sandwicher.de/_files/ugd/b086f8_efad15618a2044f388aae4c8f1e78639.pdf'

function parseTags(name: string): MenuItem['tags'] {
  const lower = name.toLowerCase()
  const tags: MenuItem['tags'] = []
  if (lower.includes('vegan')) tags.push('vegan')
  if (lower.includes('vegetar')) tags.push('vegetarisch')
  if (lower.includes('glutenfrei') || lower.includes('gluten frei')) tags.push('glutenfrei')
  return tags
}

export async function scrapeSandwicher(): Promise<RestaurantMenu> {
  const response = await fetch(PDF_URL)
  if (!response.ok) throw new Error(`PDF fetch fehlgeschlagen: ${response.status}`)
  const buffer = await response.arrayBuffer()
  const pdfBase64 = Buffer.from(buffer).toString('base64')

  const client = new Anthropic()
  const aiResponse = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
        },
        {
          type: 'text',
          text: 'Das ist der Wochenplan eines Restaurants. Extrahiere alle Gerichte pro Tag mit Name und Preis. Antworte NUR im JSON-Format: [{"date": "YYYY-MM-DD", "name": "Gerichtname", "price": 9.50}]. Das Datum steht als Wochentag + deutsches Datum im PDF (z.B. "Montag, 23. März 2026").',
        },
      ],
    }],
  })

  const raw = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : ''
  const jsonMatch = raw.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error(`Claude Antwort: ${raw.slice(0, 300)}`)

  const parsed = JSON.parse(jsonMatch[0]) as { date: string; name: string; price: number }[]

  // Remap PDF dates to the current week.
  // Sandwicher may not update the PDF URL every week, so the dates in the PDF
  // can lag behind. We preserve the weekday (Mon=this Mon, Tue=this Tue, ...)
  // and replace the year/month/day with this week's corresponding date.
  const now = new Date()
  const dow = now.getDay() // 0=Sun
  const thisMonday = new Date(now)
  thisMonday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1))
  thisMonday.setHours(0, 0, 0, 0)

  function remapToCurrentWeek(isoDate: string): string {
    const d = new Date(isoDate + 'T12:00:00Z')
    const wd = d.getUTCDay() // 0=Sun,1=Mon,...
    const offset = wd === 0 ? 6 : wd - 1 // days from Monday
    const mapped = new Date(thisMonday)
    mapped.setDate(thisMonday.getDate() + offset)
    const y = mapped.getFullYear()
    const m = String(mapped.getMonth() + 1).padStart(2, '0')
    const day = String(mapped.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const dayMap = new Map<string, MenuItem[]>()
  for (const item of parsed) {
    const date = item.date || ''
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    const remapped = remapToCurrentWeek(date)
    if (!dayMap.has(remapped)) dayMap.set(remapped, [])
    dayMap.get(remapped)!.push({ name: item.name, price: item.price, tags: parseTags(item.name) })
  }

  const days: DayMenu[] = Array.from(dayMap.entries())
    .map(([date, items]) => ({ date, items }))
    .sort((a, b) => a.date.localeCompare(b.date))

  if (days.length === 0) throw new Error(`Keine Tage geparst. Claude JSON: ${jsonMatch[0].slice(0, 300)}`)
  return { restaurantId: 'sandwicher', lastUpdated: new Date().toISOString(), days }
}
