import { kv } from '@vercel/kv'
import { RestaurantMenu } from './types'

export async function saveMenu(menu: RestaurantMenu): Promise<void> {
  await kv.set(`menu:${menu.restaurantId}`, menu)
}

export async function loadMenu(restaurantId: string): Promise<RestaurantMenu | null> {
  return await kv.get<RestaurantMenu>(`menu:${restaurantId}`)
}

export async function loadAllMenus(): Promise<RestaurantMenu[]> {
  const keys = await kv.keys('menu:*')
  if (keys.length === 0) return []
  const menus = await Promise.all(keys.map((k) => kv.get<RestaurantMenu>(k)))
  return menus.filter(Boolean) as RestaurantMenu[]
}
