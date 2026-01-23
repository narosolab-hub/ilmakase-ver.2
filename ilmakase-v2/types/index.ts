// 파싱된 태스크 타입
export interface ParsedTask {
  lineIndex: number;
  project_name: string;
  content: string;
  isCompleted: boolean;
  progress: number;
}

// AI 분석 응답 타입
export interface AIPreviewResponse {
  items: Array<{
    original: string;
    skill: string;
    portfolioTerm: string;
  }>;
}

export interface AIAnalysisResponse {
  pattern: string;
  workflow: string;
  keywords: string[];
  insight: string;
}

export interface AICardResponse {
  title: string;
  tasks: string[];
  results: string[];
  thinking_summary: string;
}

// 일일 분석 응답
export interface AIDailyAnalysisResponse {
  strengths: string[];
  improvements: string[];
  suggestions: string[];
  thinking_type: string;
}

// AI 업무 확장 제안 (사수 코칭)
export interface AITaskSuggestion {
  task: string                    // 원래 업무
  suggestions: string[]           // 추가로 확인/검토해야 할 것들
  why?: string                    // 왜 이런 제안을 하는지 (선택)
}

export interface AICoachingResponse {
  coaching: AITaskSuggestion[]    // 업무별 코칭
  overall_tip?: string            // 전체적인 한 마디 (선택)
}

// 경력기술서 생성 응답
export interface CareerDocResponse {
  brief_version: string;
  detailed_version: string;
  star_version: {
    situation: string;
    task: string;
    action: string[];
    result: string[];
  };
  thinking_analysis: {
    type: string;
    description: string;
  }[];
}

// 월간 리뷰 통계
export interface MonthlyStats {
  total_work_days: number;
  avg_completion_rate: number;
  work_type_distribution: Record<string, number>;
  project_distribution: Record<string, number>;
}

// 프로젝트 매칭 결과
export interface ProjectMatchResult {
  matched: boolean;
  project: {
    id: string;
    name: string;
    score: number;
  } | null;
  alternatives: Array<{
    id: string;
    name: string;
    score: number;
  }>;
  suggestNew: boolean;
  suggestedName?: string;
}

// 프로젝트 카드 상세
export interface ProjectCardDetail {
  id: string;
  name: string;
  period: {
    start: string;
    end: string;
  };
  role: string;
  team_size: string;
  total_tasks: number;
  completion_rate: number;
  tasks_by_category: Record<string, {
    count: number;
    items: string[];
  }>;
  thinking_analysis: {
    type: string;
    description: string;
  }[];
}

// 프로젝트 성과 타입
export interface ProjectOutcome {
  type: 'quantitative' | 'qualitative'  // 정량적 / 정성적
  content: string
}

// 프로젝트 타입
export interface Project {
  id: string
  user_id: string
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
  tech_stack: string[]             // 기술 스택
  outcomes: ProjectOutcome[]       // 성과/결과
  contribution: string | null      // 기여도/담당 업무 설명
  summary: string | null           // 프로젝트 한 줄 요약
  created_at: string
  updated_at: string
}

// 플랜 제한
export interface PlanLimits {
  free: {
    ai_analysis: 3;
    career_doc: 1;
    monthly_review: false;
    insights: false;
  };
  basic: {
    ai_analysis: -1; // unlimited
    career_doc: -1;
    monthly_review: true;
    insights: 1; // per month
  };
  premium: {
    ai_analysis: -1;
    career_doc: -1;
    monthly_review: true;
    insights: -1;
  };
}
