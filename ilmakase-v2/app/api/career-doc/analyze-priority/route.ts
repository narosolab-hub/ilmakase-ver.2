import { createClient } from '@/lib/supabase/server'
import { generateJSON } from '@/lib/gemini/client'
import { NextResponse } from 'next/server'

// 프로젝트 우선순위 분석
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { projectIds } = await request.json()

    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      return NextResponse.json({ error: '프로젝트 ID가 필요합니다' }, { status: 400 })
    }

    // 프로젝트 정보 가져오기
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .in('id', projectIds)
      .eq('user_id', user.id)

    if (projectsError || !projects) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다' }, { status: 404 })
    }

    // 각 프로젝트의 업무 기록 가져오기
    const projectsWithWorkLogs = await Promise.all(
      projects.map(async (project) => {
        const { data: workLogs } = await supabase
          .from('work_logs')
          .select('content, is_completed, progress')
          .eq('project_id', project.id)
          .limit(20)

        return {
          id: project.id,
          name: project.name,
          summary: project.summary,
          role: project.role,
          status: project.status,
          outcomes: project.outcomes,
          tech_stack: project.tech_stack,
          work_count: workLogs?.length || 0,
          sample_works: workLogs?.slice(0, 5).map(w => w.content) || [],
        }
      })
    )

    // AI 분석
    const systemPrompt = `당신은 채용 담당자 관점에서 경력기술서를 분석하는 전문가입니다.
주어진 프로젝트들을 분석하여 이직 시 어필할 수 있는 순서로 우선순위를 매겨주세요.

우선순위 기준:
- high: 성과가 명확하고, 임팩트가 큰 프로젝트
- medium: 경험을 보여줄 수 있지만 성과가 불분명한 프로젝트
- low: 간단히 언급만 해도 되는 프로젝트

각 프로젝트에 대해 왜 그 우선순위를 매겼는지 한 줄로 설명해주세요.`

    const prompt = `다음 프로젝트들의 이직 어필 우선순위를 분석해주세요:

${projectsWithWorkLogs.map((p, i) => `
${i + 1}. ${p.name}
   - 역할: ${p.role || '미입력'}
   - 상태: ${p.status}
   - 요약: ${p.summary || '없음'}
   - 성과: ${Array.isArray(p.outcomes) && p.outcomes.length ? (p.outcomes as Array<{ content: string }>).map(o => o.content).join(', ') : '미입력'}
   - 기술스택: ${p.tech_stack?.join(', ') || '미입력'}
   - 업무 기록 수: ${p.work_count}개
   - 샘플 업무: ${p.sample_works.join(' / ') || '없음'}
`).join('\n')}

JSON 형식으로 응답:
{
  "priorities": [
    {
      "projectId": "프로젝트 ID",
      "priority": "high" | "medium" | "low",
      "reason": "우선순위 이유 (한 줄)"
    }
  ]
}`

    const result = await generateJSON<{
      priorities: Array<{
        projectId: string
        priority: 'high' | 'medium' | 'low'
        reason: string
      }>
    }>(prompt, systemPrompt)

    // projectId 매핑 (AI가 이름으로 응답할 수도 있으므로)
    const mappedPriorities = result.priorities.map((p, index) => ({
      ...p,
      projectId: projectsWithWorkLogs[index]?.id || p.projectId,
    }))

    return NextResponse.json({ priorities: mappedPriorities })
  } catch (error) {
    console.error('우선순위 분석 에러:', error)
    return NextResponse.json(
      { error: '우선순위 분석에 실패했습니다' },
      { status: 500 }
    )
  }
}
