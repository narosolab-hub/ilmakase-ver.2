import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const year = searchParams.get('year') ?? String(new Date().getFullYear())

  try {
    const res = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/KR`,
      { next: { revalidate: 60 * 60 * 24 * 30 } } // 서버 30일 캐시
    )
    if (!res.ok) return NextResponse.json([])

    const data = await res.json()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=2592000, s-maxage=2592000' },
    })
  } catch {
    return NextResponse.json([])
  }
}
