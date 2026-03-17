import fs from 'fs'
import path from 'path'
import { RestaurantMenu } from './types'

const DATA_DIR = path.join(process.cwd(), 'data')

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

export function getMenuFilePath(restaurantId: string): string {
  return path.join(DATA_DIR, `${restaurantId}.json`)
}

export function saveMenu(menu: RestaurantMenu): void {
  ensureDataDir()
  fs.writeFileSync(getMenuFilePath(menu.restaurantId), JSON.stringify(menu, null, 2))
}

export function loadMenu(restaurantId: string): RestaurantMenu | null {
  const filePath = getMenuFilePath(restaurantId)
  if (!fs.existsSync(filePath)) return null
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }
}

export function loadAllMenus(): RestaurantMenu[] {
  ensureDataDir()
  return fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf-8'))
      } catch {
        return null
      }
    })
    .filter(Boolean)
}
