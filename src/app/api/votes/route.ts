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

  // TTL: expire at 15:00 Berlin time today (or 15:00 tomorrow if already past)
  const now = new Date()
  const berlin = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }))
  const reset = new Date(berlin)
  reset.setHours(15, 0, 0, 0)
  if (berlin >= reset) reset.setDate(reset.getDate() + 1)
  const secondsUntilReset = Math.ceil((reset.getTime() - berlin.getTime()) / 1000)
  await redis.set(key, votes, { ex: secondsUntilReset })

  return NextResponse.json(votes)
}
