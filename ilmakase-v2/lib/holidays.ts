export interface Holiday {
  date: string      // 'yyyy-MM-dd'
  localName: string // 한국어 이름
  name: string      // 영어 이름
}

const CACHE_PREFIX = 'ilmakase_holidays_'
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30일

export async function getHolidays(year: number): Promise<Holiday[]> {
  if (typeof window === 'undefined') return []

  const cacheKey = `${CACHE_PREFIX}${year}`

  // localStorage 캐시 확인
  try {
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      const { data, expiresAt } = JSON.parse(cached)
      if (Date.now() < expiresAt) return data as Holiday[]
    }
  } catch {}

  // API 호출 (Next.js 서버 프록시)
  try {
    const res = await fetch(`/api/holidays?year=${year}`)
    if (!res.ok) return []
    const data: Holiday[] = await res.json()

    // localStorage 캐시 저장
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        data,
        expiresAt: Date.now() + CACHE_TTL_MS,
      }))
    } catch {}

    return data
  } catch {
    return []
  }
}

export function buildHolidayMap(holidays: Holiday[]): Map<string, string> {
  return new Map(holidays.map(h => [h.date, h.localName]))
}
