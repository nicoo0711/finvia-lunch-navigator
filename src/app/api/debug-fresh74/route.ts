import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const jinaRes = await fetch('https://r.jina.ai/https://www.fresh74.de/menue/', {
    headers: { 'Accept': 'application/json' },
  })
  const data = await jinaRes.json()
  const content: string = data?.data?.content || ''
  // Extract all markdown image URLs
  const imgRegex = /!\[.*?\]\((https?:\/\/[^)]+)\)/g
  const imgUrls: string[] = []
  let m: RegExpExecArray | null
  while ((m = imgRegex.exec(content)) !== null) imgUrls.push(m[1])

  return NextResponse.json({
    keys: Object.keys(data?.data || {}),
    external: data?.data?.external,
    img_urls_from_markdown: imgUrls,
    content_preview: content.slice(0, 2000),
  })
}
