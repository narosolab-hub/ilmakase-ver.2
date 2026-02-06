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
