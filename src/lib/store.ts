import { Redis } from '@upstash/redis'
import { RestaurantMenu } from './types'

const redis = Redis.fromEnv()

export async function saveMenu(menu: RestaurantMenu): Promise<void> {
  await redis.set(`menu:${menu.restaurantId}`, menu)
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
