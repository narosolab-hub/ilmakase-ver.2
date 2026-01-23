import { generateJSON } from './client'
import type {
  AIPreviewResponse,
  AIAnalysisResponse,
  AIDailyAnalysisResponse,
  CareerDocResponse,
  AICoachingResponse
} from '@/types'

/**
 * 프롬프트 1: 일일 업무 AI 분석
 * 오늘 한 일에 대한 사고방식 분석 + 피드백
 */
export async function generateDailyAnalysis(
  workLogs: Array<{ content: string; detail?: string; progress: number; is_completed: boolean }>
): Promise<AIDailyAnalysisResponse> {
  const systemPrompt = `당신은 친근하고 전문적인 업무 코치입니다.
사용자의 오늘 업무 기록을 보고, 사고방식을 분석하고 건설적인 피드백을 제공해주세요.

<규칙>
1. 칭찬할 점은 구체적으로
2. 개선점은 부드럽게 제안
3. 내일 실천 가능한 제안 포함
4. 쉬운 말로 설명
</규칙>`

  const logsText = workLogs
    .map((log, i) => {
      const status = log.is_completed ? '완료' : `${log.progress}%`;
      const detail = log.detail ? `\n   상세: ${log.detail}` : '';
      return `${i + 1}. [${status}] ${log.content}${detail}`;
    })
    .join('\n');

  const prompt = `오늘의 업무 기록을 분석해주세요:

${logsText}

다음 JSON 형식으로 응답해주세요:
{
  "strengths": [
    "잘한 점 1 - 구체적인 칭찬",
    "잘한 점 2"
  ],
  "improvements": [
    "개선할 점 1 - 부드러운 제안"
  ],
  "suggestions": [
    "내일 실천 가능한 제안 1",
    "내일 실천 가능한 제안 2"
  ],
  "thinking_type": "사고방식 유형 (예: 리스크 관리형, 협업 주도형, 데이터 기반 의사결정형 등)"
}`

  return generateJSON<AIDailyAnalysisResponse>(prompt, systemPrompt)
}

/**
 * 프롬프트 2: 패턴 분석 (5일치 업무)
 */
export async function generatePatternAnalysis(
  records: Array<{ date: string; contents: string[] }>
): Promise<AIAnalysisResponse> {
  const systemPrompt = `당신은 커리어 코치입니다.
사용자의 최근 업무 일지들을 분석하여 업무 패턴과 성장 인사이트를 제공해주세요.`

  const recordsText = records
    .map((r, i) => {
      const itemsText = r.contents.map((item, idx) => `  ${idx + 1}. ${item}`).join('\n')
      return `[${i + 1}일차] ${r.date}\n${itemsText}`
    })
    .join('\n\n')

  const prompt = `다음 ${records.length}일간의 업무 일지를 분석해주세요:

${recordsText}

다음 JSON 형식으로 응답해주세요:
{
  "pattern": "발견된 업무 패턴 (예: 신규 캠페인 관련 업무가 반복적으로 기록되고 있어요)",
  "workflow": "업무 흐름 요약 (예: 데이터 분석 → 가설 설정 → 테스트 → 수정)",
  "keywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"],
  "insight": "사용자에게 주는 인사이트 (예: 데이터를 기반으로 의사결정하는 스타일이네요!)"
}`

  return generateJSON<AIAnalysisResponse>(prompt, systemPrompt)
}

/**
 * 프롬프트 3: 경력기술서 생성 (프로젝트 카드)
 */
export async function generateCareerDocument(
  projectInfo: {
    name: string;
    period: { start: string; end: string };
    role?: string;
    team_size?: string;
  },
  tasksSummary: Array<{
    task_name: string;
    work_count: number;
    sample_works: string[];
  }>
): Promise<CareerDocResponse> {
  const systemPrompt = `당신은 모든 직군을 아우르는 '전천후 포트폴리오 컨설턴트'입니다.

[목표]
사용자의 업무 기록을 분석하여, 채용 담당자가 매력을 느낄 수 있는 경력기술서를 3가지 버전으로 작성해주세요.

[규칙]
1. 간결형 (200자): 핵심만 담아 바로 복붙 가능
2. 상세형 (500자): 태스크별 상세 설명
3. STAR 형식: 면접 대비용
4. 구체적인 숫자 포함
5. 쉬운 단어 사용 (고등학생도 이해 가능)
6. 과장하지 않고 현실적으로`

  const tasksText = tasksSummary
    .map(t => `- ${t.task_name} (${t.work_count}개 업무)\n  예시: ${t.sample_works.slice(0, 3).join(', ')}`)
    .join('\n')

  const prompt = `다음 프로젝트의 경력기술서를 생성해주세요:

프로젝트명: ${projectInfo.name}
기간: ${projectInfo.period.start} ~ ${projectInfo.period.end}
역할: ${projectInfo.role || '미지정'}
팀 규모: ${projectInfo.team_size || '미지정'}

태스크별 업무:
${tasksText}

다음 JSON 형식으로 응답해주세요:
{
  "brief_version": "간결형 경력기술서 (200자 내외)",
  "detailed_version": "상세형 경력기술서 (500자 내외, 태스크별 설명 포함)",
  "star_version": {
    "situation": "상황 설명",
    "task": "맡은 역할/과제",
    "action": ["수행한 핵심 행동 1", "수행한 핵심 행동 2"],
    "result": ["달성한 성과 1", "달성한 성과 2"]
  },
  "thinking_analysis": [
    {
      "type": "사고방식 유형 (예: 리스크 선제 관리)",
      "description": "해당 사고방식이 드러나는 구체적 근거"
    }
  ]
}`

  return generateJSON<CareerDocResponse>(prompt, systemPrompt)
}

/**
 * 프롬프트 4: 월간 트렌드 분석
 */
export async function generateMonthlyInsights(
  monthlyStats: {
    year_month: string;
    total_work_days: number;
    avg_completion_rate: number;
    work_type_distribution: Record<string, number>;
    project_distribution: Record<string, number>;
  },
  previousMonthStats?: {
    avg_completion_rate: number;
    work_type_distribution: Record<string, number>;
  }
): Promise<{
  summary: string;
  trends: string[];
  insights: string[];
  suggestions: string[];
}> {
  const systemPrompt = `당신은 데이터 분석가이자 커리어 코치입니다.
사용자의 월간 업무 통계를 분석하여 트렌드와 인사이트를 제공해주세요.`

  const statsText = `
월: ${monthlyStats.year_month}
총 업무 일수: ${monthlyStats.total_work_days}일
평균 완료율: ${monthlyStats.avg_completion_rate}%

업무 유형 분포:
${Object.entries(monthlyStats.work_type_distribution)
  .map(([type, pct]) => `- ${type}: ${pct}%`)
  .join('\n')}

프로젝트별 분포:
${Object.entries(monthlyStats.project_distribution)
  .map(([project, pct]) => `- ${project}: ${pct}%`)
  .join('\n')}
`

  const comparisonText = previousMonthStats
    ? `\n전월 대비:
- 완료율: ${previousMonthStats.avg_completion_rate}% → ${monthlyStats.avg_completion_rate}%`
    : ''

  const prompt = `다음 월간 통계를 분석해주세요:

${statsText}${comparisonText}

다음 JSON 형식으로 응답해주세요:
{
  "summary": "한 달 요약 (2-3문장)",
  "trends": ["발견된 트렌드 1", "발견된 트렌드 2"],
  "insights": ["인사이트 1", "인사이트 2"],
  "suggestions": ["다음 달 제안 1", "다음 달 제안 2"]
}`

  return generateJSON(prompt, systemPrompt)
}

/**
 * 프롬프트 5: 프로젝트 자동 매칭
 */
export async function suggestProjectMatch(
  inputText: string,
  existingProjects: Array<{ id: string; name: string; keywords: string[] }>
): Promise<{
  matched_project_id: string | null;
  confidence: number;
  suggested_new_name: string | null;
  extracted_keywords: string[];
}> {
  const systemPrompt = `당신은 프로젝트 분류 전문가입니다.
사용자의 업무 내용을 보고 기존 프로젝트와 매칭하거나, 새 프로젝트를 제안해주세요.`

  const projectsText = existingProjects.length > 0
    ? existingProjects
        .map(p => `- ID: ${p.id}, 이름: ${p.name}, 키워드: ${p.keywords.join(', ')}`)
        .join('\n')
    : '(기존 프로젝트 없음)'

  const prompt = `업무 내용: "${inputText}"

기존 프로젝트 목록:
${projectsText}

다음 JSON 형식으로 응답해주세요:
{
  "matched_project_id": "매칭된 프로젝트 ID (없으면 null)",
  "confidence": 매칭 신뢰도 (0.0 ~ 1.0),
  "suggested_new_name": "새 프로젝트명 제안 (매칭 실패 시)",
  "extracted_keywords": ["추출된", "키워드", "목록"]
}`

  return generateJSON(prompt, systemPrompt)
}

/**
 * 프롬프트 6: AI 업무 확장 제안 (사수 코칭)
 * 사용자가 입력한 업무를 기반으로 추가로 확인/검토해야 할 업무 제안
 */
export async function generateTaskSuggestions(
  tasks: Array<{ project: string; content: string }>,
  projectContext?: { name: string; description?: string }
): Promise<AICoachingResponse> {
  const systemPrompt = `당신은 경력 10년차 시니어 멘토입니다.
사수 없이 혼자 일하는 주니어를 도와주세요.

당신의 역할:
- 주니어가 업무를 할 때 놓치기 쉬운 것들을 미리 알려주기
- "아, 이것도 해야 하는구나" 싶은 것들 제안하기
- 너무 당연한 것(예: "열심히 하세요")은 제외
- 실제로 업무에 도움이 되는 구체적인 체크포인트 제안

<규칙>
1. 각 업무당 2-4개의 확인사항 제안
2. 실무적이고 구체적인 내용으로
3. 주니어가 바로 실행할 수 있는 수준으로
4. 친근하지만 전문적인 톤으로
5. 한국어로 응답
</규칙>`

  const tasksText = tasks
    .map((t, i) => `${i + 1}. [${t.project}] ${t.content}`)
    .join('\n')

  const contextText = projectContext
    ? `\n프로젝트 정보: ${projectContext.name}${projectContext.description ? ` - ${projectContext.description}` : ''}`
    : ''

  const prompt = `주니어가 오늘 할 업무입니다:

${tasksText}${contextText}

이 업무들을 할 때 놓치기 쉽지만 확인해야 할 것들을 제안해주세요.

다음 JSON 형식으로 응답해주세요:
{
  "coaching": [
    {
      "task": "원래 업무 내용",
      "suggestions": [
        "확인해볼 것 1",
        "확인해볼 것 2",
        "확인해볼 것 3"
      ],
      "why": "왜 이런 제안을 하는지 한 문장 (선택)"
    }
  ],
  "overall_tip": "오늘 업무 전체에 대한 한 마디 조언 (선택)"
}`

  return generateJSON<AICoachingResponse>(prompt, systemPrompt)
}
