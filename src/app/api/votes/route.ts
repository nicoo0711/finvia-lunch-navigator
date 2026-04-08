import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

function todayKey(date: string) {
  return `lunch:votes:${date}`
}

// GET /api/votes?date=2026-04-08
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }
  const votes = await redis.get<Record<string, string[]>>(todayKey(date)) ?? {}
  return NextResponse.json(votes)
}

// POST /api/votes  { date, restaurantId, name }
export async function POST(req: NextRequest) {
  const { date, restaurantId, name } = await req.json() as {
    date: string
    restaurantId: string
    name: string
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !restaurantId || !name?.trim()) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const trimmed = name.trim().slice(0, 30)
  const key = todayKey(date)
  const votes: Record<string, string[]> = await redis.get(key) ?? {}

  // Remove user from any previous restaurant
  for (const rid of Object.keys(votes)) {
    votes[rid] = votes[rid].filter(n => n.toLowerCase() !== trimmed.toLowerCase())
  }

  // Add to new restaurant (toggle off if same)
  if (restaurantId !== '__remove__') {
    if (!votes[restaurantId]) votes[restaurantId] = []
    votes[restaurantId].push(trimmed)
  }

  // Clean up empty entries
  for (const rid of Object.keys(votes)) {
    if (votes[rid].length === 0) delete votes[rid]
  }

  // TTL: expire at midnight (seconds until next midnight Berlin time)
  const now = new Date()
  const berlinOffset = 2 * 3600 // CEST; good enough
  const secondsUntilMidnight = 86400 - ((now.getTime() / 1000 + berlinOffset) % 86400)
  await redis.set(key, votes, { ex: Math.ceil(secondsUntilMidnight) })

  return NextResponse.json(votes)
}
