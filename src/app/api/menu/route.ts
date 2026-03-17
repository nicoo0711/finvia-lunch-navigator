import { NextResponse } from 'next/server'
import { loadAllMenus } from '@/lib/store'

export async function GET() {
  const menus = loadAllMenus()
  return NextResponse.json(menus)
}
