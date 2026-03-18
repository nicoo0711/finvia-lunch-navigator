const CATEGORIES: { label: string; keywords: string[] }[] = [
  { label: 'Suppe', keywords: ['suppe', 'eintopf', 'brühe', 'cremesuppe', 'linsensuppe', 'tomatensuppe', 'dal'] },
  { label: 'Salat', keywords: ['salat'] },
  { label: 'Schnitzel', keywords: ['schnitzel', 'piccata', 'cordon bleu'] },
  { label: 'Pasta', keywords: ['pasta', 'nudel', 'spaghetti', 'pappardelle', 'cannelloni', 'lasagne', 'tagliatelle', 'orzo', 'linguine', 'rigatoni'] },
  { label: 'Pizza', keywords: ['pizza'] },
  { label: 'Burger', keywords: ['burger'] },
  { label: 'Steak', keywords: ['steak', 'flank', 'leiterchen', 'rumpsteak', 'entrecôte'] },
  { label: 'Geflügel', keywords: ['hähnchen', 'hühnchen', 'geflügel', 'chicken', 'pute', 'ente'] },
  { label: 'Fisch', keywords: ['fisch', 'lachs', 'forelle', 'thunfisch', 'kabeljau', 'lachsforelle', 'matjes'] },
  { label: 'Curry', keywords: ['curry'] },
  { label: 'Sushi', keywords: ['sushi', 'maki', 'nigiri'] },
]

export function categorize(name: string): string | undefined {
  const lower = name.toLowerCase()
  for (const { label, keywords } of CATEGORIES) {
    if (keywords.some(k => lower.includes(k))) return label
  }
  return undefined
}
