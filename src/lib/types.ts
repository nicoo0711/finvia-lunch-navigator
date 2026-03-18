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
      { name: 'Tagesgericht (wechselt täglich) → Tageskarte' },
      { name: 'Block Burger', price: 12.90 },
      { name: 'Rumpsteak 180g', price: 24.90 },
      { name: 'Mr. Rumpsteak 250g', price: 29.90 },
      { name: 'Hereford Rib-Eye 250g', price: 32.90 },
      { name: 'Filet Mignon 180g', price: 34.90 },
      { name: 'Flank Steak 300g', price: 27.90 },
      { name: 'Caesar Salad', price: 9.90 },
      { name: 'Chicken Salad', price: 11.90 },
      { name: 'Knusprige Calamari', price: 10.90 },
      { name: 'Carpaccio vom Rind', price: 12.90 },
      { name: 'Onion Rings', price: 7.90 },
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
    id: 'yumas',
    name: 'Yumas',
    address: 'Feuerbachstr. 46',
    hours: 'Mo–Fr 11:30–14:30 Uhr',
    url: 'https://www.yumas.de',
    scrapeType: 'manual',
    emoji: '🌮',
    color: '#FFF8E1',
    logo: '/yumas-logo.svg',
    staticItems: [
      { name: 'Chicken Burrito', price: 13.50 },
      { name: 'Barbacoa Burrito', price: 14.00 },
      { name: 'Mole Burrito', price: 13.50 },
      { name: 'Gamba Burrito / Bowl', price: 14.90 },
      { name: 'Quesadillas Mixtas', price: 13.90 },
      { name: 'Tacos de Cochinita Pibil', price: 13.40 },
      { name: 'Alambre de Champiñones', price: 11.90 },
      { name: 'Mole Rojo con Pollo', price: 16.90 },
      { name: 'Filete de Res', price: 23.90 },
      { name: 'Frische Avocado / Guacamole', price: 4.90 },
      { name: 'Gemischte Vorspeiseplatte', price: 16.90 },
    ],
  },
  {
    id: 'doori',
    name: 'eatDOORI',
    address: 'Oeder Weg 30',
    hours: 'Mo–Fr 11:30–15:00 Uhr',
    url: 'https://eatdoori.com',
    scrapeType: 'manual',
    emoji: '🍛',
    color: '#FBE9E7',
    logo: 'https://eatdoori.com/wp-content/uploads/ED_Logo_2025_red_rgb-1536x1107.png',
    staticItems: [
      { name: 'Butter Chicken', price: 17.90 },
      { name: 'Chicken Tikka Masala', price: 17.90 },
      { name: 'Chicken Tikka Tadka', price: 17.90 },
      { name: 'Butter Chicken Bowl', price: 17.90 },
      { name: 'Chicken Tikka Masala Bowl', price: 17.90 },
      { name: 'Momos (vegetarische Dumplings)' },
      { name: 'Biryani' },
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
