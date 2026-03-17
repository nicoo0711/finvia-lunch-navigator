import { NextRequest, NextResponse } from 'next/server'
import { saveMenu } from '@/lib/store'
import { RestaurantMenu } from '@/lib/types'

export async function POST(req: NextRequest) {
  const password = req.headers.get('x-admin-password')
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const menu: RestaurantMenu = {
    restaurantId: body.restaurantId,
    lastUpdated: new Date().toISOString(),
    days: body.days,
  }

  saveMenu(menu)
  return NextResponse.json({ success: true })
}
