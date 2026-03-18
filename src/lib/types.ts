export type MenuItem = {
  name: string
  price: number
  tags: ('vegan' | 'vegetarisch' | 'glutenfrei')[]
  category?: string
}

export type DayMenu = {
  date: string // ISO date string
  items: MenuItem[]
}

export type Restaurant = {
  id: string
  name: string
  address: string
  hours: string
  url: string
  scrapeType: 'auto' | 'manual'
  menuType?: 'daily' | 'weekly'
  emoji: string
  color: string
  logo?: string
  staticItems?: { name: string; price?: number }[]
}

export type RestaurantMenu = {
  restaurantId: string
  lastUpdated: string
  days: DayMenu[]
}

// ─── Restaurant Registry ───────────────────────────────────────────────────

export const RESTAURANTS: Restaurant[] = [
  {
    id: 'illing',
    name: 'Metzgerei Illing',
    address: 'Grüneburgweg 47',
    hours: 'Mo–Fr ab 11:45 Uhr',
    url: 'https://www.metzgerei-illing.de/Speiseplan/',
    scrapeType: 'auto',
    emoji: '🥩',
    color: '#FAECE7',
    logo: 'https://www.google.com/s2/favicons?domain=metzgerei-illing.de&sz=64',
  },
  {
    id: 'sandwicher',
    name: 'Sandwicher',
    address: 'Reuterweg 63',
    hours: 'Mo–Fr 9:00–16:00 Uhr',
    url: 'https://www.sandwicher.de',
    scrapeType: 'auto',
    emoji: '🥪',
    color: '#E1F5EE',
    logo: 'https://www.google.com/s2/favicons?domain=sandwicher.de&sz=64',
  },
  {
    id: 'blockhouse',
    name: 'Block House',
    address: 'Bockenheimer Anlage 38',
    hours: 'Mo–Fr 12:00–15:00 Uhr',
    url: 'https://www.block-house.de/speisekarte/lunch-time/',
    scrapeType: 'auto',
    emoji: '🥩',
    color: '#FFF3E0',
    logo: 'https://www.google.com/s2/favicons?domain=block-house.de&sz=64',
    staticItems: [
      { name: 'Block Burger mit Pilz-Zwiebel-Gemüse', price: 14.90 },
      { name: 'Großer Salat mit Rindfleischstreifen', price: 14.90 },
      { name: 'Tagesgericht (wechselt täglich Mo–Fr)' },
    ],
  },
  {
    id: 'edensgarden',
    name: "Eden's Garden",
    address: 'Kronberger Str. 9',
    hours: 'Di–Do 11:00–14:00 Uhr',
    url: 'https://edensgarden-restaurant.com/our-menu/',
    scrapeType: 'auto',
    menuType: 'weekly',
    emoji: '🇪🇹',
    color: '#E8F5E9',
    logo: 'https://www.google.com/s2/favicons?domain=edensgarden-restaurant.com&sz=64',
    staticItems: [
      { name: 'Gemüsevariation Teller', price: 12.90 },
      { name: 'Nech Tibs Bowl', price: 14.90 },
      { name: 'Beef Tibs Bowl', price: 14.90 },
      { name: 'Reis Veggie Tibs', price: 12.90 },
      { name: 'Greek Salad', price: 10.90 },
      { name: 'Caesar Salad', price: 12.90 },
      { name: 'Classic Chicken Wrap', price: 11.90 },
      { name: 'Tibs Wrap', price: 12.90 },
      { name: 'Veggie Wrap', price: 10.90 },
    ],
  },
  {
    id: 'fresh74',
    name: 'fresh74',
    address: 'Oberlindau 74',
    hours: 'Mo–Fr 12:00–14:30 Uhr',
    url: 'https://www.fresh74.de/menue/',
    scrapeType: 'auto',
    menuType: 'weekly',
    emoji: '🥗',
    color: '#E6F1FB',
    logo: '/fresh74-logo.png',
  },
]
