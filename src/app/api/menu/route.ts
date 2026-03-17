import { NextResponse } from 'next/server'
import { loadAllMenus } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  const menus = await loadAllMenus()
  return NextResponse.json(menus)
}
