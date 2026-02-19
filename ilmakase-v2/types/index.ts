// 세부 업무 타입
export interface Subtask {
  id: string
  content: string
  is_completed: boolean
  created_at?: string  // YYYY-MM-DD (optional, 이전 데이터 호환)
}

// 메모 타입 (여러 개, 날짜 기록)
export interface Memo {
  id: string
  content: string    // 여러 줄 가능
  created_at: string // YYYY-MM-DD
}

// 파싱된 태스크 타입
export interface ParsedTask {
  lineIndex: number;
  project_name: string;
  content: string;
  isCompleted: boolean;
  progress: number;
}

// 월간 회고 - AI 사수 피드백
export interface MentorPoint {
  title: string
  detail: string
  relatedWork?: string
}

export interface MentorFeedback {
  mentorSummary: string
  goodPoints: MentorPoint[]
  improvementPoints: MentorPoint[]
  nextMonthTips: string[]
}

// 월간 회고 - KPT
export interface KPTReflection {
  keep: string
  problem: string
  try: string
}

// 월간 회고 - 업무 요약
export interface ProjectWorkGroup {
  projectId: string | null
  projectName: string
  tasks: Array<{
    content: string
    detail: string | null
    subtasks: Array<{ id: string; content: string; is_completed: boolean }> | null
    progress: number
    isCompleted: boolean
  }>
  completedCount: number
  totalCount: number
}

export interface MonthlyWorkSummary {
  totalTasks: number
  completedTasks: number
  projects: ProjectWorkGroup[]
}

// 경력기술서 문서 타입 (저장된 문서)
export interface CareerDocument {
  id: string
  userId: string
  companyId: string | null
  title: string
  content: string | null
  projectIds: string[]
  priorityConfig: { projectId: string; priority: string }[] | null
  periodStart: string | null
  periodEnd: string | null
  role: string | null
  createdAt: string
  updatedAt: string
}

// 프로젝트 성과 타입
export interface ProjectOutcome {
  type: 'quantitative' | 'qualitative'  // 정량적 / 정성적
  content: string
}

// 회사 타입 (경력기술서용)
export interface Company {
  id: string
  user_id: string
  name: string
  position: string | null       // 직무/직급
  department: string | null     // 부서
  start_date: string | null
  end_date: string | null
  is_current: boolean           // 현재 재직중
  created_at: string
  updated_at: string
}

// 프로젝트 타입
export interface Project {
  id: string
  user_id: string
  company_id: string | null        // 회사 연결 (경력기술서용)
  name: string
  description: string | null
  status: '진행중' | '완료' | '보류'
  start_date: string | null
  end_date: string | null
  auto_matched: boolean
  keywords: string[]
  // 경력기술서용 필드
  role: string | null              // 담당 역할
  team_size: string | null         // 팀 규모
  tech_stack: string[] | null       // 기술 스택
  outcomes: ProjectOutcome[] | null // 성과/결과
  contribution: string | null      // 기여도/담당 업무 설명
  summary: string | null           // 프로젝트 한 줄 요약
  created_at: string
  updated_at: string
}

