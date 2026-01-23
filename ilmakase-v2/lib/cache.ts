/**
 * 간단한 메모리 캐시
 * 탭 전환 시 데이터를 즉시 표시하기 위한 용도
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
}

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
