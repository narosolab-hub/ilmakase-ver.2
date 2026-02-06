import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from 'date-fns'
import { ko } from 'date-fns/locale'

// 한국 표준시 날짜 문자열 반환
export function getKSTDate(): string {
  const now = new Date()
  const kstOffset = 9 * 60 // KST is UTC+9
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const kst = new Date(utc + kstOffset * 60000)
  return format(kst, 'yyyy-MM-dd')
}

// 날짜 포맷팅
export function formatDate(date: string | Date, formatStr: string = 'yyyy-MM-dd'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, formatStr, { locale: ko })
}

// 날짜를 한글로 표시
export function formatDateKorean(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, 'M월 d일 (EEEE)', { locale: ko })
}

// 주간 범위 계산
export function getWeekRange(date: string | Date) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return {
    start: format(startOfWeek(dateObj, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    end: format(endOfWeek(dateObj, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  }
}

// 월간 범위 계산
export function getMonthRange(date: string | Date) {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return {
    start: format(startOfMonth(dateObj), 'yyyy-MM-dd'),
    end: format(endOfMonth(dateObj), 'yyyy-MM-dd'),
  }
}

// 연월 문자열 반환 (2025-01)
export function getYearMonth(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, 'yyyy-MM')
}

// 이전/다음 날짜
export function getAdjacentDate(date: string, days: number): string {
  return format(addDays(parseISO(date), days), 'yyyy-MM-dd')
}

// 완료율 계산
export function calculateCompletionRate(
  tasks: Array<{ is_completed: boolean; progress: number }>
): number {
  if (tasks.length === 0) return 0
  const completed = tasks.filter(t => t.is_completed).length
  return Math.round((completed / tasks.length) * 100)
}

// 클래스명 결합
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

// 기간 계산 (개월 수)
export function calculatePeriodMonths(start: string, end: string): number {
  const startDate = parseISO(start)
  const endDate = parseISO(end)
  const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth()) + 1
  return Math.max(1, months)
}
