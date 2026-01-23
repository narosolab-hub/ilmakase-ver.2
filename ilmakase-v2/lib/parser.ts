import type { ParsedTask } from '@/types'

/**
 * 텍스트에서 모든 태스크를 파싱
 *
 * 형식 1: #프로젝트명/ 업무내용 (프로젝트명에 띄어쓰기 가능)
 * 형식 2: #프로젝트명 업무내용 (기존 방식, 띄어쓰기 없는 프로젝트명)
 *
 * 예시:
 *   #도매 플랫폼/ API 검토
 *   #앱개발 로그인 API 연동
 *   #UI 디자인/ 메인페이지 작업
 *   #회의 주간 스프린트 미팅
 *
 * 참고: 진행도/완료 상태는 더 이상 텍스트에서 관리하지 않음
 *       대신 work_logs 테이블에서 직접 관리
 */
export function parseAllTasks(text: string): ParsedTask[] {
  const lines = text.split('\n')
  const tasks: ParsedTask[] = []

  lines.forEach((line, index) => {
    const trimmedLine = line.trim()
    if (!trimmedLine) return

    // 먼저 / 구분자가 있는지 확인
    // 패턴 1: #프로젝트명/ 내용 (띄어쓰기 포함 프로젝트명)
    const slashMatch = trimmedLine.match(/^#(.+?)\/\s*(.+)$/)

    if (slashMatch) {
      const [, projectName, content] = slashMatch
      tasks.push({
        lineIndex: index,
        project_name: projectName.trim(),
        content: content.trim(),
        isCompleted: false,
        progress: 0,
      })
      return
    }

    // 패턴 2: #프로젝트명 내용 (기존 방식, 띄어쓰기 없는 프로젝트명)
    const spaceMatch = trimmedLine.match(/^#(\S+)\s+(.+)$/)

    if (spaceMatch) {
      const [, projectName, content] = spaceMatch
      tasks.push({
        lineIndex: index,
        project_name: projectName,
        content: content.trim(),
        isCompleted: false,
        progress: 0,
      })
    }
  })

  return tasks
}

/**
 * 프로젝트명 추출 (자동 매칭용)
 */
export function extractProjectKeywords(text: string): string[] {
  const keywords: string[] = []

  // #태그 추출
  const tagMatches = text.match(/#(\S+)/g)
  if (tagMatches) {
    keywords.push(...tagMatches.map(t => t.slice(1)))
  }

  // 주요 명사 추출 (간단한 패턴)
  const words = text.split(/\s+/)
  const importantWords = words.filter(
    w => w.length >= 2 && !w.startsWith('#') && !w.startsWith('[')
  )

  // 첫 3개 단어만 키워드로 추가
  keywords.push(...importantWords.slice(0, 3))

  return [...new Set(keywords)]
}

/**
 * 업무 유형 분류 (AI 없이 간단한 규칙 기반)
 */
export function classifyWorkType(content: string): string {
  const lowerContent = content.toLowerCase()

  if (/회의|미팅|논의|협의|조율/.test(lowerContent)) return '커뮤니케이션'
  if (/기획|정리|분석|리서치|조사|검토/.test(lowerContent)) return '기획'
  if (/디자인|시안|UI|UX|피그마/.test(lowerContent)) return '디자인'
  if (/개발|코드|API|버그|테스트|QA/.test(lowerContent)) return '개발'
  if (/보고|발표|리포트|문서/.test(lowerContent)) return '문서작업'
  if (/교육|학습|스터디/.test(lowerContent)) return '학습'

  return '기타'
}
