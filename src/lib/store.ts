import { Redis } from '@upstash/redis'
import { RestaurantMenu } from './types'

const redis = Redis.fromEnv()

export async function saveMenu(menu: RestaurantMenu): Promise<void> {
  await redis.set(`menu:${menu.restaurantId}`, menu)
}

// Merges new days into existing menu — keeps all days from current week
export async function mergeMenu(menu: RestaurantMenu): Promise<void> {
  const existing = await redis.get<RestaurantMenu>(`menu:${menu.restaurantId}`)
  if (!existing) {
    await redis.set(`menu:${menu.restaurantId}`, menu)
    return
  }
  // Get current week's Monday date to filter out old weeks
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  const mondayISO = monday.toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' })

  // Keep existing days from current week, then overwrite with new days
  const existingThisWeek = existing.days.filter(d => d.date >= mondayISO)
  const newDates = new Set(menu.days.map(d => d.date))
  const merged = [
    ...existingThisWeek.filter(d => !newDates.has(d.date)),
    ...menu.days,
  ].sort((a, b) => a.date.localeCompare(b.date))

  await redis.set(`menu:${menu.restaurantId}`, { ...menu, days: merged })
}

export async function loadMenu(restaurantId: string): Promise<RestaurantMenu | null> {
  return await redis.get<RestaurantMenu>(`menu:${restaurantId}`)
}

export async function loadAllMenus(): Promise<RestaurantMenu[]> {
  const keys = await redis.keys('menu:*')
  if (keys.length === 0) return []
  const menus = await Promise.all(keys.map((k) => redis.get<RestaurantMenu>(k)))
  return menus.filter(Boolean) as RestaurantMenu[]
}
