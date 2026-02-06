import { generateJSON } from './client'
import type {
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
  const systemPrompt = `당신은 IT/스타트업 채용 담당자입니다.
"이 사람이 실제로 뭘 했는지" 명확하게 드러나는 경력기술서만 통과시킵니다.

===== 절대 규칙 =====
1. 없는 데이터는 절대 지어내지 마세요
   - 수치가 없으면 수치 없이 작성
   - 성과가 없으면 성과 문장 생략
   - STAR의 result도 데이터 없으면 "업무 기록에 성과 미기재"로 작성

2. 다음 표현 절대 금지 (AI스러운 표현)
   ❌ "혁신적인", "효율적인", "원활한", "체계적인"
   ❌ "~에 기여함", "~를 담당하며", "~를 수행함"
   ❌ "적극적으로 참여", "성공적으로 수행"
   ❌ "다양한 경험", "폭넓은 이해"

3. 좋은 표현 예시
   ✅ "응답속도 800ms → 240ms"
   ✅ "전환율 12% → 21%"
   ✅ "Node.js 기반 API 개발"
   ✅ "Figma로 모바일 앱 UI 설계"

===== 출력 형식 =====
- 간결형: 실제 한 일만 나열 (200자)
- 상세형: 태스크별로 구체적 행동 (500자)
- STAR: 면접용, 없는 데이터는 솔직하게 "미기재"`

  const tasksText = tasksSummary
    .map(t => `- ${t.task_name} (${t.work_count}개 업무)\n  예시: ${t.sample_works.slice(0, 3).join(', ')}`)
    .join('\n')

  const prompt = `⚠️ 아래 데이터에 없는 내용은 절대 쓰지 마세요.

프로젝트명: ${projectInfo.name}
기간: ${projectInfo.period.start} ~ ${projectInfo.period.end}
역할: ${projectInfo.role || '미입력'}
팀 규모: ${projectInfo.team_size || '미입력'}

태스크별 업무:
${tasksText || '(업무 기록 없음)'}

JSON 형식:
{
  "brief_version": "간결형 (200자, 없는 성과는 생략)",
  "detailed_version": "상세형 (500자, 태스크별 설명)",
  "star_version": {
    "situation": "상황 (데이터 기반으로만)",
    "task": "맡은 역할",
    "action": ["실제 한 행동만"],
    "result": ["성과 데이터 있으면 작성, 없으면 '업무 기록에 성과 미기재'"]
  },
  "thinking_analysis": [
    {
      "type": "업무에서 드러나는 사고방식",
      "description": "구체적 근거"
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
 * 친근한 사수처럼 질문 형식으로 피드백
 */
export async function generateTaskSuggestions(
  tasks: Array<{ project: string; content: string }>,
  projectContext?: { name: string; description?: string }
): Promise<AICoachingResponse> {
  const systemPrompt = `당신은 같은 팀에서 3년 동안 함께 일한 믿음직한 사수예요.
후배가 놓치기 쉬운 '진짜 실무 포인트'를 콕콕 짚어주는 스타일이에요.

당신의 특징:
- "이거 흔히 빠뜨리더라~" 하면서 경험에서 나온 구체적인 케이스를 알려줌
- 포괄적인 조언("꼼꼼히 확인하세요") 대신 딱 집어서 말함 ("iOS에서 푸시 권한 거부했을 때 처리 확인했어요?")
- 가끔 "나도 예전에 이거 빼먹어서 혼났어요 ㅎㅎ" 같은 공감 섞인 말투

반드시 지킬 것:
- 추상적인 말 금지 (X: "에러 케이스 확인", O: "결제 실패 시 장바구니 상품 복구되는지")
- 업무당 2개의 구체적인 체크포인트
- 실제 주니어가 자주 놓치는 것 위주로`

  const tasksText = tasks
    .map((t, i) => `${i + 1}. [${t.project}] ${t.content}`)
    .join('\n')

  const contextText = projectContext?.name ? ` (프로젝트: ${projectContext.name})` : ''

  const prompt = `후배가 오늘 할 일이에요:

${tasksText}${contextText}

사수로서 "아 그거 확인했어요?" 하고 물어볼 구체적인 포인트를 알려주세요.
"꼼꼼히 확인하세요" 같은 뻔한 말 말고, 실제로 놓치기 쉬운 거요!

JSON:
{
  "coaching": [
    {
      "task": "업무내용만",
      "suggestions": [
        "구체적인 체크 질문 1 (예: 비회원 상태에서도 테스트해봤어요?)",
        "구체적인 체크 질문 2"
      ],
      "why": "짧은 이유 (선배 경험담이면 더 좋음)"
    }
  ],
  "overall_tip": "오늘 업무에 대한 한마디 (격려나 꿀팁)"
}`

  return generateJSON<AICoachingResponse>(prompt, systemPrompt)
}
