import { createClient } from '@/lib/supabase/server'
import { generateCareerDocument } from '@/lib/gemini/prompts'
import { NextResponse } from 'next/server'

// 경력기술서 생성
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { projectId } = await request.json()

    if (!projectId) {
      return NextResponse.json({ error: '프로젝트 ID가 필요합니다' }, { status: 400 })
    }

    // 사용자 정보 및 크레딧 확인
    const { data: userData } = await supabase
      .from('users')
      .select('plan, career_doc_credits_used, credits_reset_at')
      .eq('id', user.id)
      .single()

    // 무료 플랜 크레딧 확인 (월 1회)
    if (userData?.plan === 'free') {
      const now = new Date()
      const resetAt = userData.credits_reset_at ? new Date(userData.credits_reset_at) : null

      if (resetAt && resetAt.getMonth() === now.getMonth() && (userData.career_doc_credits_used ?? 0) >= 1) {
        return NextResponse.json(
          { error: '이번 달 무료 경력기술서 생성 횟수를 모두 사용했습니다.' },
          { status: 403 }
        )
      }
    }

    // 프로젝트 정보 가져오기
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다' }, { status: 404 })
    }

    // 프로젝트의 업무 기록 가져오기
    const { data: workLogs } = await supabase
      .from('work_logs')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('work_date', { ascending: true })

    if (!workLogs || workLogs.length === 0) {
      return NextResponse.json(
        { error: '이 프로젝트에 연결된 업무 기록이 없습니다' },
        { status: 400 }
      )
    }

    // 태스크별로 그룹화
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, name')
      .eq('project_id', projectId)

    const taskMap = new Map(tasks?.map(t => [t.id, t.name]) || [])

    // 태스크별 업무 집계
    const tasksSummary: Array<{
      task_name: string
      work_count: number
      sample_works: string[]
    }> = []

    const worksByTask = new Map<string, string[]>()
    for (const log of workLogs) {
      const taskName = log.task_id ? (taskMap.get(log.task_id) || '기타') : '기타'
      if (!worksByTask.has(taskName)) {
        worksByTask.set(taskName, [])
      }
      worksByTask.get(taskName)!.push(log.content)
    }

    for (const [taskName, works] of worksByTask) {
      tasksSummary.push({
        task_name: taskName,
        work_count: works.length,
        sample_works: works.slice(0, 5),
      })
    }

    // 경력기술서 생성
    const careerDoc = await generateCareerDocument(
      {
        name: project.name,
        period: {
          start: project.start_date || workLogs[0].work_date,
          end: project.end_date || workLogs[workLogs.length - 1].work_date,
        },
      },
      tasksSummary
    )

    // DB에 저장
    const { data: savedDoc, error: saveError } = await supabase
      .from('career_documents')
      .insert({
        user_id: user.id,
        project_id: projectId,
        title: project.name,
        period_start: project.start_date,
        period_end: project.end_date,
        task_summary: tasksSummary,
        brief_version: careerDoc.brief_version,
        detailed_version: careerDoc.detailed_version,
        star_version: careerDoc.star_version,
        thinking_analysis: careerDoc.thinking_analysis,
      })
      .select()
      .single()

    if (saveError) throw saveError

    // 크레딧 사용 기록
    if (userData?.plan === 'free') {
      await supabase
        .from('users')
        .update({
          career_doc_credits_used: (userData.career_doc_credits_used || 0) + 1,
        })
        .eq('id', user.id)
    }

    return NextResponse.json({
      careerDocument: savedDoc,
      versions: {
        brief: careerDoc.brief_version,
        detailed: careerDoc.detailed_version,
        star: careerDoc.star_version,
      },
      thinkingAnalysis: careerDoc.thinking_analysis,
    })
  } catch (error: unknown) {
    console.error('경력기술서 생성 에러:', error)
    return NextResponse.json(
      { error: '경력기술서 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
