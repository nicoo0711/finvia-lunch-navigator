import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const jinaRes = await fetch('https://r.jina.ai/https://www.fresh74.de/menue/', {
    headers: { 'Accept': 'application/json' },
  })
  const data = await jinaRes.json()
  return NextResponse.json({
    keys: Object.keys(data?.data || {}),
    images: data?.data?.images,
    content_preview: (data?.data?.content || '').slice(0, 1000),
    html_preview: (data?.data?.html || '').slice(0, 1000),
  })
}
