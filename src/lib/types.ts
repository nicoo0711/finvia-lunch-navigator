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
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRqzb60ERd7yF2Xzlp6EYOwM6QN2u_G62XgIg&s',
  },
  {
    id: 'sushiammain',
    name: 'Sushi am Main',
    address: 'Reuterweg 61',
    hours: 'Mo–Fr 11:45–22:00 Uhr',
    url: 'https://reuterweg.sushiammain.de',
    scrapeType: 'manual',
    emoji: '🍣',
    color: '#FDE8E8',
    logo: 'https://reuterweg.sushiammain.de/wp-content/uploads/2024/12/sushiammain_reuterweg.svg',
    staticItems: [
      { name: 'Kappa Maki (8 Stk.)', price: 4.50 },
      { name: 'Avocado Maki (8 Stk.)', price: 5.00 },
      { name: 'Tekka Maki (8 Stk.)', price: 6.00 },
      { name: 'Futo Maki (8 Stk.)', price: 6.00 },
      { name: 'California Inside-Out (8 Stk.)', price: 11.00 },
      { name: 'Lachs-Avo Inside-Out (8 Stk.)', price: 12.00 },
      { name: 'Tuna-Avo Inside-Out (8 Stk.)', price: 13.00 },
      { name: 'Spicy Tuna Roll', price: 13.00 },
      { name: 'Panko Salmon Inside-Out', price: 9.00 },
      { name: 'Miso Ramen', price: 14.00 },
      { name: 'Tantanmen Ramen', price: 14.00 },
      { name: 'Shoyu Ramen', price: 14.00 },
      { name: 'Tempura Udon / Soba', price: 16.00 },
      { name: 'Lachs & Thunfisch Sashimi', price: 26.00 },
    ],
  },
  {
    id: 'asiathai',
    name: 'ASIA Thai Food',
    address: 'Freiherr-vom-Stein-Str. 22',
    hours: 'Mo–Fr 11:30–21:30 Uhr',
    url: 'https://www.asia-thaifood.com',
    scrapeType: 'manual',
    emoji: '🍜',
    color: '#E8F5E9',
    logo: 'https://images.squarespace-cdn.com/content/v1/590b29121b631b14ff8403ae/1496786793361-D7C7DMDY7FQWRRAGVHNJ/logo_schwarz_klein.jpg',
    staticItems: [
      { name: 'Phad-Thai-Gai (Reisnudeln, Hühnchen)', price: 14.50 },
      { name: 'Kie-Wan-Gai (Grünes Curry)', price: 15.00 },
      { name: 'Gaeng-Gai (Rotes Curry)', price: 15.00 },
      { name: 'Massaman Gai', price: 15.00 },
      { name: 'Gai-Phad-Gra-Prau (Basilikum, scharf)', price: 14.50 },
      { name: 'Gai-Sam-Ros (Pineapple, süß-scharf)', price: 14.50 },
      { name: 'Phed-Asia (Knusprige Ente)', price: 17.00 },
      { name: 'Phed Makham (Ente, Tamarinde)', price: 17.00 },
      { name: 'Gung-Phad-Gra-Prau (Garnelen, Basilikum)', price: 17.00 },
      { name: 'Som Tam (Papaya Salat, scharf)', price: 15.00 },
      { name: 'Poh-Pia (Frühlingsrollen, 6 Stk.)', price: 4.80 },
      { name: 'Satay-Gai (Chicken Skewers, 4 Stk.)', price: 7.00 },
    ],
  },
  {
    id: 'dominion',
    name: 'Dominion Food Revolution',
    address: 'Grüneburgweg 41–43',
    hours: 'Mo–So 11:30–21:00 Uhr',
    url: 'https://dominionfood.de',
    scrapeType: 'manual',
    emoji: '🧆',
    color: '#F3E5F5',
    logo: 'https://dominionfood.de/wp-content/uploads/2022/11/dominion-food-vegan-kosher-frankfurt-512-icon.png',
    staticItems: [
      { name: 'Dominion Mix Plate (Kebab, Shawarma, Hummus, Salat)', price: 15.90 },
      { name: 'Kebab Revolution Teller', price: 14.90 },
      { name: 'Hackpommes', price: 12.90 },
      { name: 'Moving Mountain Burger (vegan)' },
      { name: 'Life Burger (vegan)' },
      { name: 'Hummus Teller' },
      { name: 'Hummus Falafel' },
      { name: 'Shawarma Wrap' },
      { name: 'Schwarma Fries' },
      { name: 'Malabi (Rosenwasser-Dessert)' },
    ],
  },
  {
    id: 'bestworscht',
    name: 'Best Worscht in Town',
    address: 'Grüneburgweg 37',
    hours: 'Mo–Fr 10:30–19:00 Uhr',
    url: 'https://bestworschtintown.de',
    scrapeType: 'manual',
    emoji: '🌭',
    color: '#FFF3E0',
    logo: 'https://www.hessen-center-frankfurt.de/fileadmin/user_upload/GLOBAL/brand_stores/logos/bestworschtintown.png',
    staticItems: [
      { name: 'Currywurst', price: 5.50 },
      { name: 'Vegan Currywurst', price: 5.90 },
      { name: 'Hot Dog (Beef)', price: 5.50 },
      { name: 'Hot Dog (Vegan)', price: 5.90 },
      { name: 'Worscht-Venganza 6.666', price: 6.66 },
      { name: 'Kleine Pommes', price: 3.90 },
      { name: 'Pommes', price: 4.50 },
      { name: 'Snackers-Combo', price: 12.90 },
      { name: 'X-Treme Combo', price: 13.50 },
    ],
  },
]
