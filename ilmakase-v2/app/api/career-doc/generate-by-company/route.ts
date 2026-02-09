import { createClient } from '@/lib/supabase/server'
import { generateJSON } from '@/lib/gemini/client'
import { NextResponse } from 'next/server'

interface ProjectPriority {
  projectId: string
  priority: 'high' | 'medium' | 'low'
}

// 회사 단위 경력기술서 생성
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { companyId, projects: projectPriorities } = await request.json() as {
      companyId: string
      projects: ProjectPriority[]
    }

    if (!companyId || !projectPriorities || projectPriorities.length === 0) {
      return NextResponse.json({ error: '회사 ID와 프로젝트가 필요합니다' }, { status: 400 })
    }

    // 회사 정보 가져오기
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .eq('user_id', user.id)
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: '회사를 찾을 수 없습니다' }, { status: 404 })
    }

    // 프로젝트 정보 가져오기
    const projectIds = projectPriorities.map(p => p.projectId)
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .in('id', projectIds)
      .eq('user_id', user.id)

    if (projectsError || !projects) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다' }, { status: 404 })
    }

    // 우선순위별로 프로젝트 정리
    const priorityMap = new Map(projectPriorities.map(p => [p.projectId, p.priority]))

    const highProjects = projects.filter(p => priorityMap.get(p.id) === 'high')
    const mediumProjects = projects.filter(p => priorityMap.get(p.id) === 'medium')
    const lowProjects = projects.filter(p => priorityMap.get(p.id) === 'low')

    // 각 프로젝트의 업무 기록 가져오기 (high 우선순위만 상세)
    const projectsWithDetails = await Promise.all(
      projects.map(async (project) => {
        const priority = priorityMap.get(project.id)
        const limit = priority === 'high' ? 30 : priority === 'medium' ? 10 : 5

        const { data: workLogs } = await supabase
          .from('work_logs')
          .select('content, detail, is_completed, subtasks')
          .eq('project_id', project.id)
          .order('work_date', { ascending: false })
          .limit(limit)

        return {
          ...project,
          priority,
          workLogs: workLogs || [],
        }
      })
    )

    // AI 경력기술서 생성
    const systemPrompt = `당신은 경력기술서 작성 전문가입니다.

===== 가장 중요한 규칙 =====
❌ 절대 금지: 업무를 그대로 나열하는 것
✅ 해야 할 것: 업무들을 분석해서 "역할"과 "성과"로 재구성

===== 변환 예시 (필수 참고) =====

[BAD - 업무 나열] ← 이렇게 쓰면 안 됨
- 상품 연동 QA 진행
- 슬랙 문의 응대
- 장바구니 QA 진행
- 서류 요청

[GOOD - 역할/성과로 재구성] ← 이렇게 써야 함
- B2B 도매 플랫폼 QA 리드: 쿠팡/네이버 등 외부 채널 상품 연동 검증
- QA 과정에서 1원 단위 절삭 이슈 발견 → 정산 오류 사전 방지
- CS/운영팀 문의 대응 및 이슈 트래킹 (공급사 관리, 정산, 상품 연동)

===== 변환 로직 =====
1. 비슷한 업무들을 묶어서 "역할"로 표현
   - "QA 진행" + "이슈 관리" + "검수" → "QA 리드" 또는 "품질 관리"
   - "문의 응대" + "협업" + "요청" → "커뮤니케이션 허브" 또는 "이해관계자 조율"

2. 세부업무/메모에서 "성과"나 "발견한 것" 추출
   - "1원 단위 절삭 이슈 발견" → 이건 성과임! 강조해야 함
   - "서버 배포 이슈로 지연" → 이슈 파악 능력 보여줌

3. 숫자나 구체적 사실은 반드시 포함
   - 연동한 채널 수, 처리한 건수, 발견한 이슈 등

===== 절대 금지 표현 =====
❌ "~진행", "~응대", "~확인", "~요청" (단순 동사로 끝나는 것)
❌ "~에 기여", "~를 담당", "~를 수행"
❌ "효율적인", "원활한", "체계적인"

===== 작성 형식 =====
- 회사명 | 직무 | 재직기간
- [프로젝트명]
- 불릿포인트로 역할/성과 (3-5개)
- 마크다운 없이 순수 텍스트`

    const formatPeriod = () => {
      if (!company.start_date) return ''
      const start = company.start_date.slice(0, 7).replace('-', '.')
      if (company.is_current) return `${start} ~ 현재`
      if (company.end_date) {
        const end = company.end_date.slice(0, 7).replace('-', '.')
        return `${start} ~ ${end}`
      }
      return start
    }

    const formatProject = (p: typeof projectsWithDetails[0]) => {
      const outcomesArr = (Array.isArray(p.outcomes) ? p.outcomes : []) as Array<{ type: string; content: string }>
      const outcomes = outcomesArr.length > 0
        ? outcomesArr.map(o =>
            `[${o.type === 'quantitative' ? '정량' : '정성'}] ${o.content}`
          ).join('\n      ')
        : '없음'

      // 업무별 상세 정보 (세부업무 + 메모 포함)
      const workDetails = p.workLogs.map((w) => {
        const parts = [`    ▸ ${w.content}`]

        // 세부 업무가 있으면 추가
        const subtasks = w.subtasks as Array<{ content: string; is_completed: boolean }> | null
        if (subtasks && subtasks.length > 0) {
          const subtaskContents = subtasks.map(s => s.content).join(', ')
          parts.push(`      세부: ${subtaskContents}`)
        }

        // 메모가 있으면 추가
        if (w.detail) {
          parts.push(`      메모: ${w.detail}`)
        }

        return parts.join('\n')
      }).join('\n')

      return `
   프로젝트: ${p.name}
   역할: ${p.role || '미입력'}
   기간: ${p.start_date?.slice(0, 7) || '미입력'} ~ ${p.end_date?.slice(0, 7) || p.status === '진행중' ? '진행중' : '미입력'}
   요약: ${p.summary || '없음'}
   기술스택: ${p.tech_stack?.join(', ') || '없음'}
   성과: ${outcomes}
   기여도: ${p.contribution || '없음'}

   ===== 업무 기록 (세부업무/메모 포함) =====
${workDetails || '    (업무 기록 없음)'}
`
    }

    const prompt = `다음 정보를 바탕으로 경력기술서를 작성하세요.

⚠️ 핵심 지시사항:
1. "업무 기록(세부업무/메모)"를 꼼꼼히 읽고, 이 사람이 실제로 어떻게 일했는지 파악하세요
2. 세부업무/메모에서 기술적 디테일, 문제 해결 경험, 구체적인 수치를 뽑아내세요
3. 단순히 "~개발", "~작업"이 아니라, HOW(어떻게)와 WHY(왜)가 드러나도록 작성
4. 없는 데이터는 절대 지어내지 마세요 - 수치/성과가 없으면 생략

===== 회사 정보 =====
회사명: ${company.name}
직무/직급: ${company.position || '미입력'}
부서: ${company.department || '미입력'}
재직기간: ${formatPeriod()}

===== 핵심 프로젝트 (상세 서술) =====
${highProjects.length > 0 ? highProjects.map(p => formatProject(projectsWithDetails.find(pd => pd.id === p.id)!)).join('\n---\n') : '(없음)'}

===== 주요 프로젝트 (요약) =====
${mediumProjects.length > 0 ? mediumProjects.map(p => formatProject(projectsWithDetails.find(pd => pd.id === p.id)!)).join('\n---\n') : '(없음)'}

===== 기타 프로젝트 (간략 언급) =====
${lowProjects.length > 0 ? lowProjects.map(p => `- ${p.name}: ${p.summary || p.role || '경험'}`).join('\n') : '(없음)'}

⚠️ 반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력:
\`\`\`json
{
  "career_description": "경력기술서 전문 내용 (줄바꿈은 \\n으로 표현)"
}
\`\`\``

    const result = await generateJSON<{ career_description: string }>(prompt, systemPrompt)

    // 프로젝트들을 이 회사에 연결
    await supabase
      .from('projects')
      .update({ company_id: companyId })
      .in('id', projectIds)
      .eq('user_id', user.id)

    return NextResponse.json({
      content: result.career_description,
      company: {
        name: company.name,
        position: company.position,
        period: formatPeriod(),
      },
      projectCount: {
        high: highProjects.length,
        medium: mediumProjects.length,
        low: lowProjects.length,
      },
    })
  } catch (error) {
    console.error('경력기술서 생성 에러:', error)
    return NextResponse.json(
      { error: '경력기술서 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
