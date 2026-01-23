import { createClient } from '@/lib/supabase/server'
import { generateMonthlyInsights } from '@/lib/gemini/prompts'
import { NextResponse } from 'next/server'
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns'

// 월간 회고 조회/생성
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const yearMonth = searchParams.get('yearMonth') || format(new Date(), 'yyyy-MM')

    // 기존 회고 조회
    const { data: existingReview } = await supabase
      .from('monthly_reviews')
      .select('*')
      .eq('user_id', user.id)
      .eq('year_month', yearMonth)
      .single()

    if (existingReview) {
      return NextResponse.json({ review: existingReview })
    }

    return NextResponse.json({ review: null })
  } catch (error: unknown) {
    console.error('월간 회고 조회 에러:', error)
    return NextResponse.json(
      { error: '월간 회고 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { yearMonth } = await request.json()

    if (!yearMonth) {
      return NextResponse.json({ error: '연월이 필요합니다' }, { status: 400 })
    }

    // 사용자 플랜 확인
    const { data: userData } = await supabase
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single()

    if (userData?.plan === 'free') {
      return NextResponse.json(
        { error: '월간 회고는 베이직 플랜 이상에서 사용할 수 있습니다' },
        { status: 403 }
      )
    }

    // 해당 월의 업무 기록 가져오기
    const [year, month] = yearMonth.split('-').map(Number)
    const monthStart = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')

    const { data: workLogs } = await supabase
      .from('work_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('work_date', monthStart)
      .lte('work_date', monthEnd)

    if (!workLogs || workLogs.length === 0) {
      return NextResponse.json(
        { error: '이 달의 업무 기록이 없습니다' },
        { status: 400 }
      )
    }

    // 일별 로그 가져오기
    const { data: dailyLogs } = await supabase
      .from('daily_logs')
      .select('completion_rate')
      .eq('user_id', user.id)
      .gte('log_date', monthStart)
      .lte('log_date', monthEnd)

    // 통계 계산
    const uniqueDates = new Set(workLogs.map(w => w.work_date))
    const totalWorkDays = uniqueDates.size

    const avgCompletionRate = dailyLogs && dailyLogs.length > 0
      ? dailyLogs.reduce((sum, log) => sum + (log.completion_rate || 0), 0) / dailyLogs.length
      : 0

    // 프로젝트별 분포
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name')
      .eq('user_id', user.id)

    const projectMap = new Map(projects?.map(p => [p.id, p.name]) || [])
    const projectCounts: Record<string, number> = {}

    for (const log of workLogs) {
      const projectName = log.project_id ? (projectMap.get(log.project_id) || '기타') : '기타'
      projectCounts[projectName] = (projectCounts[projectName] || 0) + 1
    }

    const total = workLogs.length
    const projectDistribution: Record<string, number> = {}
    for (const [name, count] of Object.entries(projectCounts)) {
      projectDistribution[name] = Math.round((count / total) * 100)
    }

    // 업무 유형별 분포 (간단한 키워드 기반 분류)
    const workTypeCounts: Record<string, number> = {
      '기획': 0,
      '개발': 0,
      '디자인': 0,
      '커뮤니케이션': 0,
      '문서작업': 0,
      '기타': 0,
    }

    for (const log of workLogs) {
      const content = log.content.toLowerCase()
      if (/회의|미팅|논의/.test(content)) workTypeCounts['커뮤니케이션']++
      else if (/기획|분석|조사/.test(content)) workTypeCounts['기획']++
      else if (/개발|코드|API|버그/.test(content)) workTypeCounts['개발']++
      else if (/디자인|UI|UX/.test(content)) workTypeCounts['디자인']++
      else if (/문서|보고|리포트/.test(content)) workTypeCounts['문서작업']++
      else workTypeCounts['기타']++
    }

    const workTypeDistribution: Record<string, number> = {}
    for (const [type, count] of Object.entries(workTypeCounts)) {
      if (count > 0) {
        workTypeDistribution[type] = Math.round((count / total) * 100)
      }
    }

    // 전월 데이터 가져오기 (비교용)
    const prevMonthDate = subMonths(new Date(year, month - 1), 1)
    const prevMonthStart = format(startOfMonth(prevMonthDate), 'yyyy-MM-dd')
    const prevMonthEnd = format(endOfMonth(prevMonthDate), 'yyyy-MM-dd')

    const { data: prevDailyLogs } = await supabase
      .from('daily_logs')
      .select('completion_rate')
      .eq('user_id', user.id)
      .gte('log_date', prevMonthStart)
      .lte('log_date', prevMonthEnd)

    const prevAvgCompletionRate = prevDailyLogs && prevDailyLogs.length > 0
      ? prevDailyLogs.reduce((sum, log) => sum + (log.completion_rate || 0), 0) / prevDailyLogs.length
      : null

    // AI 인사이트 생성
    const monthlyStats = {
      year_month: yearMonth,
      total_work_days: totalWorkDays,
      avg_completion_rate: Math.round(avgCompletionRate),
      work_type_distribution: workTypeDistribution,
      project_distribution: projectDistribution,
    }

    const aiInsights = await generateMonthlyInsights(
      monthlyStats,
      prevAvgCompletionRate !== null
        ? { avg_completion_rate: prevAvgCompletionRate, work_type_distribution: {} }
        : undefined
    )

    // 월간 비교 데이터
    const monthlyComparison = prevAvgCompletionRate !== null
      ? {
          completion_rate_change: Math.round(avgCompletionRate - prevAvgCompletionRate),
          previous_month: format(prevMonthDate, 'yyyy-MM'),
        }
      : null

    // DB에 저장
    const { data: review, error: saveError } = await supabase
      .from('monthly_reviews')
      .insert({
        user_id: user.id,
        year_month: yearMonth,
        total_work_days: totalWorkDays,
        avg_completion_rate: Math.round(avgCompletionRate),
        work_type_distribution: workTypeDistribution,
        project_distribution: projectDistribution,
        monthly_comparison: monthlyComparison,
        ai_insights: aiInsights,
      })
      .select()
      .single()

    if (saveError) throw saveError

    return NextResponse.json({
      review,
      insights: aiInsights,
    })
  } catch (error: unknown) {
    console.error('월간 회고 생성 에러:', error)
    return NextResponse.json(
      { error: '월간 회고 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
