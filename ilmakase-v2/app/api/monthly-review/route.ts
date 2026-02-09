import { createClient } from '@/lib/supabase/server'
import { generateMentorFeedback } from '@/lib/gemini/prompts'
import { NextResponse } from 'next/server'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import type { ProjectWorkGroup, MonthlyWorkSummary } from '@/types'
import type { Json } from '@/types/database'

// 해당 월의 업무를 프로젝트별로 그룹화
async function getWorkSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  yearMonth: string
): Promise<MonthlyWorkSummary> {
  const [year, month] = yearMonth.split('-').map(Number)
  const monthStart = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')

  const { data: workLogs } = await supabase
    .from('work_logs')
    .select('content, detail, subtasks, progress, is_completed, project_id')
    .eq('user_id', userId)
    .gte('work_date', monthStart)
    .lte('work_date', monthEnd)

  if (!workLogs || workLogs.length === 0) {
    return { totalTasks: 0, completedTasks: 0, projects: [] }
  }

  // 프로젝트 이름 가져오기
  const projectIds = [...new Set(workLogs.map(w => w.project_id).filter(Boolean))] as string[]
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .in('id', projectIds.length > 0 ? projectIds : ['__none__'])

  const projectMap = new Map(projects?.map(p => [p.id, p.name]) || [])

  // 프로젝트별 그룹화
  const groups = new Map<string, ProjectWorkGroup>()

  for (const log of workLogs) {
    const projectId = log.project_id || null
    const projectName = projectId ? (projectMap.get(projectId) || '기타') : '기타'
    const key = projectId || '__none__'

    if (!groups.has(key)) {
      groups.set(key, {
        projectId,
        projectName,
        tasks: [],
        completedCount: 0,
        totalCount: 0,
      })
    }

    const group = groups.get(key)!
    const subtasks = Array.isArray(log.subtasks) ? log.subtasks as Array<{ id: string; content: string; is_completed: boolean }> : null
    group.tasks.push({
      content: log.content,
      detail: log.detail || null,
      subtasks,
      progress: log.progress ?? 0,
      isCompleted: log.is_completed ?? false,
    })
    group.totalCount++
    if (log.is_completed) group.completedCount++
  }

  const totalTasks = workLogs.length
  const completedTasks = workLogs.filter(w => w.is_completed).length

  return {
    totalTasks,
    completedTasks,
    projects: Array.from(groups.values()).sort((a, b) => b.totalCount - a.totalCount),
  }
}

// GET: 월간 회고 조회 (+ 업무 요약)
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const yearMonth = searchParams.get('yearMonth') || format(new Date(), 'yyyy-MM')
    const includeWorkSummary = searchParams.get('includeWorkSummary') === 'true'

    // 기존 회고 조회
    const { data: existingReview } = await supabase
      .from('monthly_reviews')
      .select('*')
      .eq('user_id', user.id)
      .eq('year_month', yearMonth)
      .single()

    // 업무 요약 (요청 시)
    let workSummary: MonthlyWorkSummary | undefined
    if (includeWorkSummary) {
      workSummary = await getWorkSummary(supabase, user.id, yearMonth)
    }

    return NextResponse.json({
      review: existingReview || null,
      workSummary,
    })
  } catch (error: unknown) {
    console.error('월간 회고 조회 에러:', error)
    return NextResponse.json(
      { error: '월간 회고 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}

// POST: AI 사수 피드백 생성
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

    // 업무 요약 가져오기
    const workSummary = await getWorkSummary(supabase, user.id, yearMonth)

    if (workSummary.totalTasks === 0) {
      return NextResponse.json(
        { error: '이 달의 업무 기록이 없습니다' },
        { status: 400 }
      )
    }

    // 통계 계산 (기존 필드 호환)
    const [year, month] = yearMonth.split('-').map(Number)
    const monthStart = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')

    const { data: dailyLogs } = await supabase
      .from('daily_logs')
      .select('completion_rate, log_date')
      .eq('user_id', user.id)
      .gte('log_date', monthStart)
      .lte('log_date', monthEnd)

    const uniqueDates = new Set(dailyLogs?.map(d => d.log_date) || [])
    const totalWorkDays = uniqueDates.size
    const avgCompletionRate = dailyLogs && dailyLogs.length > 0
      ? Math.round(dailyLogs.reduce((sum, log) => sum + (log.completion_rate || 0), 0) / dailyLogs.length)
      : 0

    // 프로젝트별 분포
    const projectDistribution: Record<string, number> = {}
    for (const p of workSummary.projects) {
      projectDistribution[p.projectName] = Math.round((p.totalCount / workSummary.totalTasks) * 100)
    }

    // AI 사수 피드백 생성
    const aiInsights = await generateMentorFeedback(
      yearMonth,
      workSummary.projects,
      workSummary.totalTasks,
      workSummary.completedTasks
    )

    // DB 저장 (upsert)
    const reviewData = {
      user_id: user.id,
      year_month: yearMonth,
      total_work_days: totalWorkDays,
      avg_completion_rate: avgCompletionRate,
      project_distribution: projectDistribution,
      ai_insights: aiInsights as unknown as Json,
    }

    // 기존 row 확인
    const { data: existing } = await supabase
      .from('monthly_reviews')
      .select('id')
      .eq('user_id', user.id)
      .eq('year_month', yearMonth)
      .single()

    let review
    if (existing) {
      // 기존 row 업데이트 (user_reflection은 건드리지 않음)
      const { data, error } = await supabase
        .from('monthly_reviews')
        .update({
          total_work_days: totalWorkDays,
          avg_completion_rate: avgCompletionRate,
          project_distribution: projectDistribution,
          ai_insights: aiInsights as unknown as Json,
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      review = data
    } else {
      const { data, error } = await supabase
        .from('monthly_reviews')
        .insert(reviewData)
        .select()
        .single()

      if (error) throw error
      review = data
    }

    return NextResponse.json({ review })
  } catch (error: unknown) {
    console.error('월간 회고 생성 에러:', error)
    return NextResponse.json(
      { error: '월간 회고 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}

// PATCH: KPT 저장
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { yearMonth, userReflection } = await request.json()

    if (!yearMonth) {
      return NextResponse.json({ error: '연월이 필요합니다' }, { status: 400 })
    }

    // 기존 row 확인
    const { data: existing } = await supabase
      .from('monthly_reviews')
      .select('id')
      .eq('user_id', user.id)
      .eq('year_month', yearMonth)
      .single()

    let review
    if (existing) {
      const { data, error } = await supabase
        .from('monthly_reviews')
        .update({ user_reflection: userReflection })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      review = data
    } else {
      // 최소한의 row 생성
      const { data, error } = await supabase
        .from('monthly_reviews')
        .insert({
          user_id: user.id,
          year_month: yearMonth,
          total_work_days: 0,
          avg_completion_rate: 0,
          user_reflection: userReflection,
        })
        .select()
        .single()

      if (error) throw error
      review = data
    }

    return NextResponse.json({ review })
  } catch (error: unknown) {
    console.error('KPT 저장 에러:', error)
    return NextResponse.json(
      { error: 'KPT 저장에 실패했습니다' },
      { status: 500 }
    )
  }
}
