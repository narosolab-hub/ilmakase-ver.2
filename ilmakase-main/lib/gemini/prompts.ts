import { generateJSON } from './client'
import type { AIPreviewResponse, AIAnalysisResponse, AICardResponse } from '@/types'

/**
 * 프롬프트 1: 즉시 미리보기 (기록 1개)
 * 각 업무별로 능력 분석 + 포트폴리오 표현 제안
 */
export async function generateInstantPreview(contents: string[]): Promise<AIPreviewResponse> {
  const systemPrompt = `당신은 친근하고 전문적인 포트폴리오 코치입니다.
사용자의 캐주얼한 업무 기록을 보고, 각 업무에서 어떤 능력을 발휘했는지 분석하고, 포트폴리오에는 어떻게 표현하면 좋을지 제안해주세요.

<규칙>
1. 각 업무마다 개별 분석
2. skill: 어떤 능력을 발휘했는지 구체적으로 2-3줄로 설명 (고등학생도 이해할 수 있는 쉬운 말로)
3. portfolioTerm: 포트폴리오에 쓸 수 있는 전문적인 표현 (6-10단어)
4. 어려운 단어 사용 금지 (예: 스코핑, 벤치마킹 등)
</규칙>`

  const contentsText = contents
    .map((item, i) => `${i + 1}. ${item}`)
    .join('\n')

  const prompt = `다음 업무 기록들을 각각 분석해주세요 (총 ${contents.length}개):

${contentsText}

다음 JSON 형식으로 응답해주세요:
{
  "items": [
    {
      "original": "업무 원본 내용 그대로",
      "skill": "이 업무에서 발휘한 능력을 구체적으로 2-3줄로 설명. 예: 데이터를 분석해서 타겟층을 찾아내고, 이를 이해하기 쉬운 기획서로 만들었어요.",
      "portfolioTerm": "포트폴리오에 쓸 표현. 예: 타겟 분석 및 기획서 작성"
    }
  ]
}

중요: 
- 반드시 모든 업무(${contents.length}개)에 대해 items 배열에 포함해주세요.
- original 필드는 위에 나온 업무 내용을 정확히 그대로 복사해주세요.
- JSON 형식만 응답하고 다른 설명은 포함하지 마세요.`

  return generateJSON<AIPreviewResponse>(prompt, systemPrompt)
}

/**
 * 프롬프트 2: AI 분석 (기록 3개)
 * 업무 패턴, 흐름, 키워드, 인사이트 추출
 */
export async function generateAnalysis(records: Array<{ date: string; contents: string[] }>): Promise<AIAnalysisResponse> {
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
 * 프롬프트 3: 프로젝트 카드 생성 (5일 업무 일지)
 * 5일간의 업무 일지를 하나의 미니 프로젝트로 변환하여 완성된 포트폴리오 카드 생성
 * [범용성 강화] 직무별 전문 용어 자동 적용
 */
export async function generateProjectCard(records: Array<{ date: string; contents: string[] }>): Promise<AICardResponse> {
  const systemPrompt = `당신은 모든 직군(개발, 디자인, 마케팅, 기획, 영업, 경영지원 등)을 아우르는 '전천후 포트폴리오 컨설턴트'입니다.

[목표]
사용자의 캐주얼한 업무 기록(Casual Tone)을 분석하여, 해당 직무의 채용 담당자가 매력을 느낄 수 있는 '전문적인 프로젝트 카드(Professional Tone)'로 재구성하십시오.

[핵심 프로세스]
1. **직무 및 맥락 추론 (Context Detection):** 기록에 포함된 키워드(예: '코드', '버그' → 개발자 / '시안', '피그마' → 디자이너 / '미팅', '매출' → 영업)를 분석하여 사용자의 직무를 파악하세요.
2. **프로젝트 그룹핑:** 입력된 기록들이 하나의 프로젝트나 목표를 향하고 있는지 확인하고, 전체를 관통하는 주제를 찾으세요.
3. **쉬운 단어 사용 (Easy Wording):** 전문 용어를 사용하되, 너무 어렵거나 생소한 단어는 피하세요.
   - ✅ 좋은 예: '데이터 분석', '고객 조사', '디자인 수정', '코드 개선', '회의', '제안서 작성'
   - ❌ 나쁜 예: '스코핑', '벤치마킹', '리팩토링', '딜 클로징', '어피니티 다이어그램'
   - 원칙: 고등학생이 읽어도 이해할 수 있는 단어를 사용하세요
4. **성과와 사고 (Thinking):** 단순 작업 나열이 아닌, 문제 해결 과정과 논리적 사고가 드러나도록 작성하세요.

[중요]
- 너무 과장하지 마세요. 사용자의 실제 업무 수준에 맞춰 현실적으로 작성해주세요.
- 제목은 간결하게, 핵심만 담아주세요 (6-12단어).
- 성과(results)는 구체적인 수치나 결과가 있을 때만 포함하고, 없으면 빈 배열로 두세요.
- 어려운 전문 용어나 외래어는 최대한 피하고, 쉬운 한국어로 표현하세요.`

  const recordsText = records
    .map((r, i) => {
      const itemsText = r.contents.map((item, idx) => `  ${idx + 1}. ${item}`).join('\n')
      return `[${i + 1}일차] ${r.date}\n${itemsText}`
    })
    .join('\n\n')

  const prompt = `다음 ${records.length}일간의 업무 일지를 분석하여, 하나의 프로젝트로 묶어 포트폴리오 카드를 생성해주세요:

${recordsText}

다음 JSON 형식으로 응답해주세요:
{
  "title": "직무에 적합한 프로젝트 제목 (6-12단어, 간결하게)",
  "tasks": [
    "전문 용어로 변환된 핵심 행동 1",
    "전문 용어로 변환된 핵심 행동 2",
    "전문 용어로 변환된 핵심 행동 3"
  ],
  "results": [
    "구체적인 성과 1 (수치/결과 포함)",
    "구체적인 성과 2"
  ],
  "thinking_summary": "해당 직무의 핵심 역량(기술적 도전, 커뮤니케이션, 데이터 리터러시 등)을 보여주는 요약 (30-50단어)"
}`

  return generateJSON<AICardResponse>(prompt, systemPrompt)
}

