/**
 * 캐시 시스템
 * - 메모리 캐시: 탭 전환 시 즉시 표시
 * - localStorage 캐시: AI 응답 등 비용이 드는 데이터 (새로고침 후에도 유지)
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
}

// =====================
// 메모리 캐시 (기존)
// =====================
class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private defaultTTL = 5 * 60 * 1000 // 5분

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + (ttl ?? this.defaultTTL),
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // TTL 만료 체크
    if (Date.now() > entry.timestamp) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  // 즉시 사용할 데이터 (TTL 무시, 있으면 반환)
  getImmediate<T>(key: string): T | null {
    const entry = this.cache.get(key)
    return entry ? (entry.data as T) : null
  }

  invalidate(key: string): void {
    this.cache.delete(key)
  }

  invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  clear(): void {
    this.cache.clear()
  }
}

// 싱글톤 인스턴스
export const dataCache = new MemoryCache()

// 캐시 키 생성 헬퍼
export const cacheKeys = {
  dailyLog: (userId: string, date: string) => `dailyLog:${userId}:${date}`,
  workLogs: (userId: string, date: string) => `workLogs:${userId}:${date}`,
  weeklyStats: (userId: string, weekStart: string) => `weeklyStats:${userId}:${weekStart}`,
  projects: (userId: string) => `projects:${userId}`,
  incompleteTasks: (userId: string, date: string) => `incomplete:${userId}:${date}`,
  aiCoaching: (tasksHash: string) => `aiCoaching:${tasksHash}`,
  monthlyReview: (userId: string, yearMonth: string) => `monthlyReview:${userId}:${yearMonth}`,
  monthlyWorkSummary: (userId: string, yearMonth: string) => `monthlyWorkSummary:${userId}:${yearMonth}`,
}

// 업무 목록을 해시로 변환 (캐시 키용)
export function hashTasks(tasks: Array<{ project: string; content: string }>): string {
  const str = tasks.map(t => `${t.project}:${t.content}`).sort().join('|')
  // 간단한 해시 함수
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(36)
}

// =====================
// localStorage 캐시 (AI 응답용 - 새로고침 후에도 유지)
// =====================
const STORAGE_PREFIX = 'ilmakase_'
const AI_CACHE_TTL = 24 * 60 * 60 * 1000 // 24시간

interface StorageCacheEntry<T> {
  data: T
  expiresAt: number
}

export const storageCache = {
  set<T>(key: string, data: T, ttl: number = AI_CACHE_TTL): void {
    if (typeof window === 'undefined') return
    try {
      const entry: StorageCacheEntry<T> = {
        data,
        expiresAt: Date.now() + ttl,
      }
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry))
    } catch (e) {
      console.warn('localStorage 저장 실패:', e)
    }
  },

  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key)
      if (!raw) return null

      const entry: StorageCacheEntry<T> = JSON.parse(raw)

      // TTL 만료 체크
      if (Date.now() > entry.expiresAt) {
        localStorage.removeItem(STORAGE_PREFIX + key)
        return null
      }

      return entry.data
    } catch (e) {
      return null
    }
  },

  remove(key: string): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(STORAGE_PREFIX + key)
  },

  // 패턴으로 삭제
  removePattern(pattern: string): void {
    if (typeof window === 'undefined') return
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(STORAGE_PREFIX) && key.includes(pattern)) {
        localStorage.removeItem(key)
      }
    })
  },
}

// =====================
// AI 호출 제한 (일일 5회)
// =====================
const AI_DAILY_LIMIT = 5
const AI_LIMIT_KEY = 'ai_daily_usage'

interface AIDailyUsage {
  date: string // YYYY-MM-DD
  count: number
}

export const aiRateLimit = {
  /** 오늘 남은 호출 횟수 */
  getRemainingCalls(): number {
    if (typeof window === 'undefined') return AI_DAILY_LIMIT

    const today = new Date().toISOString().split('T')[0]
    const raw = localStorage.getItem(STORAGE_PREFIX + AI_LIMIT_KEY)

    if (!raw) return AI_DAILY_LIMIT

    try {
      const usage: AIDailyUsage = JSON.parse(raw)
      // 날짜가 다르면 리셋
      if (usage.date !== today) return AI_DAILY_LIMIT
      return Math.max(0, AI_DAILY_LIMIT - usage.count)
    } catch {
      return AI_DAILY_LIMIT
    }
  },

  /** 호출 가능 여부 */
  canCall(): boolean {
    return this.getRemainingCalls() > 0
  },

  /** 호출 기록 (호출 성공 후 실행) */
  recordCall(): void {
    if (typeof window === 'undefined') return

    const today = new Date().toISOString().split('T')[0]
    const raw = localStorage.getItem(STORAGE_PREFIX + AI_LIMIT_KEY)

    let usage: AIDailyUsage = { date: today, count: 0 }

    if (raw) {
      try {
        const parsed: AIDailyUsage = JSON.parse(raw)
        if (parsed.date === today) {
          usage = parsed
        }
      } catch {
        // 파싱 실패 시 새로 시작
      }
    }

    usage.count += 1
    localStorage.setItem(STORAGE_PREFIX + AI_LIMIT_KEY, JSON.stringify(usage))
  },

  /** 일일 한도 */
  getDailyLimit(): number {
    return AI_DAILY_LIMIT
  },
}
