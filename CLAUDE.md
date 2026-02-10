
# 일마카세 v2 프로젝트 컨텍스트

> Claude Code가 참조하는 프로젝트 지침서

---

## 프로젝트 개요

**일마카세**: 사수 없는 주니어를 위한 업무 성장 서비스

### 핵심 가치
> "매일 쓰는 업무 기록이 성장의 피드백이 된다"

- **타겟**: 사수 없이 혼자 일하는 주니어 (직군 무관 - 개발, 기획, 디자인, 영업, 마케팅, HR 등)
- **문제**: 내가 잘하고 있는지 모르겠고, 뭘 더 해야 하는지 모르겠음
- **해결**: 업무 기록 + 사고 체크리스트로 스스로 성장 방향 찾기

### 서비스 핵심 흐름
```
업무 기록 → 사고 체크리스트로 스스로 점검 → 경력 축적
```

### 핵심 데이터 구조 (3단계)
```
프로젝트 (자동 매칭 or 수기 등록)
  └── 태스크 (수기 등록)
       └── 업무 (수기 등록, 메모장처럼)
```

---

## 사고 체크리스트 (MVP)

### 설계 배경
- AI가 업무 내용을 해석해서 조언하면 → 틀릴 가능성 높음
- 직군별 특화 조언은 → 확장성 제한 (IT 외 직군 커버 불가)
- **해결**: 모든 직군에 적용 가능한 "범용 사고 프레임워크" 제공

### 5가지 체크리스트 질문
업무 카드 클릭 시 표시되는 사고 점검 질문:

```typescript
const THINKING_CHECKLIST = [
  { id: 'why',  icon: '🎯', question: '이걸 왜 해야 하지?',           hint: '목적과 배경' },
  { id: 'who',  icon: '👤', question: '결과물을 누가 보지?',          hint: '대상과 이해관계자' },
  { id: 'done', icon: '✅', question: '어떻게 되면 끝이지?',          hint: '완료 기준' },
  { id: 'need', icon: '🔗', question: '누구한테 뭘 받아야 하지?',     hint: '필요한 것들' },
  { id: 'risk', icon: '⚠️', question: '늦어지면 어떻게 되지?',        hint: '우선순위와 영향' },
]
```

### 특징
- **직군 무관**: 개발, 기획, 영업, HR, 마케팅 등 모든 업무에 적용 가능
- **AI 의존 없음**: API 호출 없이 클라이언트에서 바로 표시
- **오류 가능성 0**: 업무 내용을 해석하지 않음
- **사용자 주도**: 스스로 생각하게 유도 (답을 주지 않음)

### 향후 확장 방향 (디벨롭 필요)
- 업무 성격별 분기 (문서 작성, 회의, 분석 등)
- 사용자 피드백 기반 질문 개선
- AI 코칭 (고도화 후 재도입 검토)

---

## 기술 스택

- **Frontend**: Next.js 16.x (App Router), React 19.x, TypeScript
- **Styling**: Tailwind CSS 4.x
- **Backend**: Supabase (PostgreSQL, Auth)
- **배포**: 미정

---

## 프로젝트 구조

```
ilmakase.ver2/
├── INTEGRATION-v2.md      # 프로젝트 기획서
├── CLAUDE.md              # 이 파일 (Claude 컨텍스트)
├── ilmakase-v2/           # ⭐ 메인 프로젝트 (여기서 개발)
│   ├── app/
│   │   ├── (main)/
│   │   │   ├── worklog/page.tsx    # 데일리 로그
│   │   │   ├── projects/page.tsx   # 프로젝트 아카이브
│   │   │   └── review/page.tsx     # 월간 회고
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   └── api/
│   │       ├── projects/auto-match/route.ts
│   │       ├── ai-analysis/daily/route.ts
│   │       ├── career-doc/generate/route.ts
│   │       └── monthly-review/route.ts
│   ├── components/
│   │   ├── WorkLog/
│   │   │   ├── DailyLogEditor.tsx  # 메인 업무 입력 에디터
│   │   │   ├── CalendarView.tsx    # 캘린더
│   │   │   ├── WeeklySummary.tsx   # 이번 주 요약
│   │   │   ├── DatePicker.tsx
│   │   │   ├── MobileQuickInput.tsx    # 모바일 하단 고정 입력 바
│   │   │   ├── MobileFullEditor.tsx    # 모바일 풀스크린 에디터
│   │   │   └── MobileCalendarPanel.tsx # 모바일 캘린더 사이드 패널
│   │   ├── Review/
│   │   │   ├── MonthlyWorkSummary.tsx  # 월간 업무 통계
│   │   │   ├── MentorFeedback.tsx     # AI 멘토 피드백
│   │   │   └── KPTReflection.tsx      # KPT 회고
│   │   ├── Project/
│   │   │   └── ProjectDetailModal.tsx  # 프로젝트 상세 편집 모달
│   │   └── UI/
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Input.tsx
│   │       ├── ProgressBar.tsx
│   │       └── MobileBottomNav.tsx  # 모바일 하단 탭 (3페이지 공용)
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useDailyLog.ts
│   │   ├── useWorkLogs.ts          # work_logs CRUD
│   │   ├── useCarryOver.ts         # 미완료 업무 가져오기
│   │   ├── useProjects.ts
│   │   └── useIsMobile.ts          # 모바일 감지 (1024px 기준)
│   ├── lib/
│   │   ├── cache.ts                # 메모리 캐시 (탭 전환 최적화)
│   │   ├── parser.ts               # 업무 텍스트 파싱
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   └── server.ts
│   │   └── utils.ts
│   └── types/
│       └── index.ts
├── worklog-db/            # 기존 WorkLog (독립 유지)
└── ilmakase-main/         # 기존 일마카세 (참고용)
```

---

## 업무 입력 파싱 형식

### 형식
```
#프로젝트명/ 업무내용
```

### 예시
```
#도매 플랫폼/ API 명세서 검토       → 프로젝트: "도매 플랫폼"
#UI 디자인/ 메인페이지 작업         → 프로젝트: "UI 디자인"
#앱개발 로그인 구현                 → 프로젝트: "앱개발" (기존 방식 호환)
```

### 파싱 로직 (lib/parser.ts)
1. `/` 구분자가 있으면 → `/` 앞이 프로젝트명 (띄어쓰기 가능)
2. `/` 없으면 → 첫 번째 공백까지가 프로젝트명 (기존 방식)

### 프로젝트 자동 생성 (DailyLogEditor)
- 저장 시 파싱된 프로젝트명이 기존 프로젝트에 없으면 자동 생성
- `auto_matched: true`로 표시됨
- 프로젝트 페이지에서 상세 정보(역할, 성과 등) 입력 가능

---

## 주요 컴포넌트

### DailyLogEditor
- 왼쪽: 텍스트 입력 (메모장 방식)
- 오른쪽: 파싱된 업무 목록 (체크박스, 진척도)
- 업무 카드 클릭 시: 사고 체크리스트 5가지 질문 표시
- 미완료 업무 아코디언 (최근 7일 미완료 업무 표시)
- 오늘 업무 진척도 (개별 진척도 합산 %)
- **세부 업무 기능**: 업무별 체크박스 리스트 추가 가능
  - 세부 업무 완료 시 진척도 자동 계산 (최대 90%)
  - 메인 체크박스 완료 시 나머지 10% 반영
  - 세부 업무 없으면 기존 수동 진척도 방식 유지

### WeeklySummary
- 이번 주 요약 (전체/완료/완료율)
- 일별 진척도 바 차트

### CalendarView
- 월별 캘린더
- 날짜별 업무 완료율 표시 (색상으로)

### ProjectDetailModal
- 프로젝트 상세 정보 편집 모달
- 기본 정보: 프로젝트명, 한 줄 요약, 설명
- 역할/팀: 담당 역할, 팀 규모
- 기술 스택 (쉼표로 구분)
- 담당 업무/기여도
- 성과/결과 (정량적/정성적 구분)

---

## DB 테이블 구조 (Supabase)

### daily_logs
- 일별 로그 원본 텍스트 저장
- `raw_content`, `parsed_tasks_count`, `completion_rate`

### work_logs
- 개별 업무 (파싱된 결과)
- `content`, `detail`, `progress`, `is_completed`, `keywords[]`
- `due_date` (DATE) - 마감일 (nullable)
- `subtasks` (JSONB) - 세부 업무 목록 `[{id, content, is_completed}]`

### projects
- 프로젝트 목록
- 기본: `name`, `status`, `auto_matched`, `start_date`, `end_date`, `keywords[]`
- 경력기술서용: `role`, `team_size`, `tech_stack[]`, `outcomes` (JSONB), `contribution`, `summary`

---

## 개발 컨벤션

### 스타일링
- Tailwind CSS 사용
- primary 색상: 오렌지 계열 (`primary-500`, `primary-600`)
- 카드: `bg-white rounded-2xl border border-gray-200 shadow-sm`
- 버튼: `rounded-xl` 사용

### 상태 관리
- 서버 상태: Supabase 직접 호출 (hooks로 추상화)
- 로컬 상태: useState
- 수동 저장: 저장 버튼 클릭 시에만 DB 저장 (자동 저장 제거)

### 인증
- Supabase Auth 사용
- `useAuth()` 훅으로 user 정보 접근

---

## 데이터 캐싱 전략

### 캐시 시스템 (`lib/cache.ts`)
```typescript
// 싱글톤 메모리 캐시
export const dataCache = new MemoryCache()

// 캐시 키 생성 헬퍼
export const cacheKeys = {
  dailyLog: (userId: string, date: string) => `dailyLog:${userId}:${date}`,
  workLogs: (userId: string, date: string) => `workLogs:${userId}:${date}`,
  weeklyStats: (userId: string, weekStart: string) => `weeklyStats:${userId}:${weekStart}`,
  projects: (userId: string) => `projects:${userId}`,
  incompleteTasks: (userId: string, date: string) => `incomplete:${userId}:${date}`,
}
```

### 캐싱 적용 패턴
탭 전환 시 로딩 없이 즉시 표시하기 위한 전략:

```typescript
// 1. 초기값으로 캐시 데이터 사용
const [data, setData] = useState(() => {
  return dataCache.getImmediate<T>(cacheKey) || defaultValue
})

// 2. fetch 시 캐시 먼저 표시 → 백그라운드에서 최신 데이터 로드
const fetchData = async () => {
  const cached = dataCache.getImmediate<T>(cacheKey)
  if (cached) {
    setData(cached)
    setLoading(false)
  }

  // 네트워크 요청
  const freshData = await supabase.from('table').select('*')

  // 캐시 갱신
  dataCache.set(cacheKey, freshData)
  setData(freshData)
}

// 3. 저장 시 캐시도 함께 갱신
const saveData = async (newData) => {
  await supabase.from('table').upsert(newData)
  dataCache.set(cacheKey, newData)  // 캐시 갱신
}
```

### 적용된 훅/컴포넌트
| 파일 | 캐시 키 | 설명 |
|------|---------|------|
| `useDailyLog.ts` | `dailyLog:{userId}:{date}` | 일별 로그 원본 텍스트 |
| `useWorkLogs.ts` | `workLogs:{userId}:{date}` | 파싱된 업무 목록 |
| `WeeklySummary.tsx` | `weeklyStats:{userId}:{weekStart}` | 주간 통계 |

### 컴포넌트 간 데이터 연동
업무 목록 변경 시 WeeklySummary 즉시 갱신:

```typescript
// worklog/page.tsx
const [refreshKey, setRefreshKey] = useState(0)
const handleWorkLogsUpdate = () => setRefreshKey(prev => prev + 1)

<DailyLogEditor onSave={handleWorkLogsUpdate} />
<WeeklySummary refreshKey={refreshKey} />

// WeeklySummary.tsx
useEffect(() => {
  if (refreshKey > 0) {
    loadWeeklyStats(true)  // skipCache=true로 새 데이터 로드
  }
}, [refreshKey])
```

### 초기 로딩 최적화
첫 로딩 후 탭 전환 시 "로딩 중" 표시 방지:

```typescript
const [initialLoadDone, setInitialLoadDone] = useState(false)

// 초기 로딩 시에만 로딩 화면 표시
if (!initialLoadDone && loading) {
  return <div>로딩 중...</div>
}
```

### 프로젝트/회고 탭 적용 시 참고사항
1. `cacheKeys`에 새 키 추가
2. 해당 훅에서 캐시 패턴 적용
3. 데이터 변경 시 관련 캐시 갱신
4. `initialLoadDone` 패턴으로 첫 로딩만 표시

---

## 현재 진행 상황 (2026-02-10)

### 완료
- [x] 프로젝트 구조 세팅 (ilmakase-v2)
- [x] 인증 (로그인/회원가입)
- [x] 데일리 로그 에디터 (텍스트 입력 + 파싱)
- [x] 캘린더 뷰
- [x] 이번 주 요약 (WeeklySummary)
- [x] 업무 CRUD (체크박스, 진척도, 상세내용, 삭제)
- [x] 미완료 업무 아코디언 (최근 7일)
- [x] 프로젝트명 띄어쓰기 지원 (`/` 구분자)
- [x] 메모리 캐싱 시스템 (`lib/cache.ts`)
- [x] 탭 전환 시 로딩 없이 즉시 표시
- [x] 업무 변경 시 WeeklySummary 즉시 반영
- [x] **프로젝트 자동 생성** - 업무 기록 시 새 프로젝트명 감지하면 자동 생성
- [x] **프로젝트 경력기술서용 필드** - role, team_size, tech_stack, outcomes, contribution, summary
- [x] **프로젝트 상세 편집 UI** - 프로젝트 카드 클릭 시 모달로 상세 정보 입력
- [x] **사고 체크리스트** - AI 코칭 대신 범용 5가지 질문으로 스스로 점검 (항상 표시)
- [x] **메모 기능 개선** - 저장/취소 버튼, 삭제 확인, 실수 방지
- [x] **데일리 로그 UI 완료** - 테두리/포커스 스타일 정리
- [x] **경력기술서 프롬프트 개선** (2026-02-05)
- [x] **세부 업무(Subtasks) 기능** (2026-02-05)
  - 업무별 세부 체크리스트 추가/토글/삭제
  - 진척도 자동 계산: (완료 세부업무/전체) × 90% + (메인 완료 시 10%)
  - 경력기술서 생성 시 세부 업무를 AI 맥락 파악용으로 활용
- [x] **데이터 로딩 최적화** (2026-02-06)
  - useCarryOver 캐싱 추가 (5분 TTL)
  - 병렬 데이터 로딩 (log + carryOver 동시 로드)
  - 실시간 파싱 버그 수정 (hasInitialized ref 패턴)
- [x] **미완료 업무 세부업무/메모 복사** (2026-02-06)
  - 미완료 업무 추가 시 기존 세부업무/메모 함께 복사
  - useCarryOver에서 IncompleteTaskData 반환 (detail, subtasks 포함)
  - syncFromParsedTasks에 carryOverData 파라미터 추가
- [x] **경력기술서 생성 개선** (2026-02-06)
  - maxOutputTokens 1024 → 4096 증가
  - JSON 추출 로직 강화 (여러 패턴 시도, 에러 로깅)
  - 프롬프트 전면 개선: "업무 나열 금지, 역할/성과로 재구성" 원칙
  - 세부업무/메모를 적극 활용하여 가치 추출하도록 지시
- [x] **월간 회고 페이지 전면 개편** (2026-02-09)
  - MonthlyWorkSummary, MentorFeedback, KPTReflection 컴포넌트 분리
  - AI 멘토 피드백 생성 (Gemini API)
  - KPT 회고 저장/편집 기능
  - 월별 업무 통계 요약
- [x] **업무 카드 마감일(데드라인) 기능** (2026-02-09)
  - work_logs 테이블에 due_date 컬럼 추가
  - 카드 헤더에 마감일 뱃지 (D-day, 지남 경고, 날짜 표시)
  - 상세 영역에서 날짜 설정/해제
  - 미완료 업무 가져오기 시 마감일도 함께 복사
- [x] **메모 줄바꿈 적용** (2026-02-09)
  - whitespace-pre-wrap 추가
- [x] **모바일 하이브리드 입력 UX** (2026-02-10)
  - 하단 고정 입력 바 (MobileQuickInput) — 카톡처럼 1줄 빠른 입력, 엔터로 즉시 저장
  - 풀스크린 에디터 (MobileFullEditor) — 여러 줄 몰아쓰기, 슬라이드업 오버레이
  - 모바일: 업무 카드 목록 중심 레이아웃, 데스크톱: 기존 2컬럼 그대로
  - DailyLogEditor 조건부 렌더링 (isMobile 분기)
  - saveWithText() 리팩토링 — 텍스트를 인자로 받아 빠른 입력에서도 즉시 저장
- [x] **모바일 네비게이션 개편** (2026-02-10)
  - 하단 탭 바 (MobileBottomNav) — 3페이지 공용, usePathname 활성 상태
  - 캘린더 왼쪽 사이드 패널 (MobileCalendarPanel) — 슬라이드인 + WeeklySummary 포함
  - 모바일 헤더 간소화: [캘린더 아이콘] < 날짜 > (로고 제거)
  - 상단 탭 → 데스크톱 전용 (hidden lg:flex)
- [x] **useIsMobile 훅** (2026-02-10)
  - matchMedia('max-width: 1023px') 기반, SSR-safe
- [x] **미완료 업무 중복 버그 수정** (2026-02-10)
  - useCarryOver에서 오늘 work_logs도 병렬 조회하여 이미 존재하는 업무 제외
  - dismissedIncompleteRef 패턴으로 컴포넌트 마운트 중 추가된 항목 추적
  - 추가 시 invalidateCache 호출로 캐시 무효화
- [x] **체크박스 요동 버그 수정** (2026-02-10)
  - key={task.lineIndex} → key={project:content:idx} 변경 (빈 줄 삽입 시 안정)

### 진행 예정
- [ ] (추후) AI 코칭 고도화 후 재도입 검토

---

## 경력기술서 생성 기능

### 플로우 (회사 단위)
```
[경력기술서 생성] (/career-doc)
    ↓
1. 회사 선택/추가 (CompanyStep)
   - 회사명, 재직기간, 직무/직급
    ↓
2. 프로젝트 선택 (ProjectSelectStep)
   - 해당 회사에서 한 프로젝트들 체크박스 선택
    ↓
3. 우선순위 조정 (PriorityStep)
   - AI가 "이직에 어필되는 프로젝트" 추천
   - 핵심/보통/간략 3단계로 비중 조정
    ↓
4. 경력기술서 생성 & 편집 (ResultStep)
   - 회사 전체 경력기술서 생성
   - 직접 수정 가능
   - 복사하기
```

### 관련 파일
- `app/(main)/career-doc/page.tsx` - 메인 페이지
- `components/CareerDoc/` - 스텝별 컴포넌트
- `hooks/useCompanies.ts` - 회사 CRUD
- `api/career-doc/generate-by-company/route.ts` - 경력기술서 생성 API
- `api/career-doc/analyze-priority/route.ts` - 우선순위 분석 API

### DB 마이그레이션 (Supabase SQL Editor에서 실행)
```bash
database/migrate-companies.sql    # 회사 테이블
database/migrate-subtasks.sql     # 세부 업무 컬럼 (work_logs.subtasks)
# work_logs.due_date: ALTER TABLE work_logs ADD COLUMN due_date DATE DEFAULT NULL;
```

### 프롬프트 설계 원칙 (적용 완료)
1. **지어내지 말 것** - 없는 데이터는 생략
2. **AI스러운 표현 금지** - "혁신적인", "효율적인 업무 수행" 등
3. **세부 업무 활용** - AI가 맥락 파악용으로 참고, 출력에는 프로젝트 단위 요약
4. **좋은 예시 few-shot** - 아래 예시 참고

---

## 좋은 경력기술서 작성 가이드

### 예시 1: 개발자 (구체적 수치 + 임팩트)
```
ABC테크 | 백엔드 개발자 | 2022.03 ~ 2024.01

[커머스 플랫폼 주문/결제 시스템 재구축]
- 레거시 모놀리식 → MSA 전환, 주문 처리 TPS 3배 향상 (200 → 600)
- Redis 캐싱 도입으로 상품 조회 응답속도 70% 개선 (avg 800ms → 240ms)
- 결제 실패율 5.2% → 1.8%로 감소 (PG사 연동 로직 개선)

[실시간 재고 관리 시스템]
- Kafka 기반 이벤트 드리븐 아키텍처 설계 및 구현
- 재고 불일치 이슈 월 평균 47건 → 3건으로 감소
```

### 예시 2: 기획자 (문제→해결→결과)
```
XYZ커머스 | 서비스 기획자 | 2021.06 ~ 2023.08

[앱 전환율 개선 프로젝트]
문제: 장바구니→결제 전환율 12%로 업계 평균(18%) 대비 저조
해결: 사용자 이탈 구간 분석 → 결제 단계 3단계→1단계 간소화
결과: 전환율 12%→21%, 월 거래액 +8억원

[리뷰 시스템 리뉴얼]
- 포토리뷰 작성률 200% 증가 (인센티브 구조 개편)
- 리뷰 신뢰도 점수 도입으로 구매 결정 시간 단축
```

### 예시 3: 마케터 (캠페인 성과 중심)
```
브랜드마케팅팀 | 퍼포먼스 마케터 | 2022.01 ~ 현재

[2023 여름 시즌 캠페인]
- 예산 5천만원, ROAS 380% 달성 (목표 300%)
- 메타/구글 믹스 최적화로 CPA 32% 절감
- 신규 고객 획득 1.2만명, 재구매율 28%

[CRM 자동화 구축]
- 이탈 예측 모델 기반 리텐션 캠페인 설계
- 휴면 고객 재활성화율 15% → 34%
```

### 좋은 표현 vs 나쁜 표현
| 좋은 예 | 나쁜 예 |
|---------|---------|
| "응답속도 800ms → 240ms" | "성능을 대폭 개선함" |
| "전환율 12% → 21%" | "전환율 향상에 기여" |
| "월 거래액 +8억원" | "매출 증대에 기여함" |
| "재고 불일치 47건→3건" | "시스템 안정화 담당" |

### AI 프롬프트 금지 표현
- "혁신적인", "효율적인", "원활한"
- "~에 기여함", "~를 담당하며"
- "적극적으로 참여", "성공적으로 수행"
- "다양한 경험", "폭넓은 이해"

---

## 기술 부채 (점진적 개선 필요)

### DB 필드 네이밍 변환 (snake_case → camelCase)

**현재 상태**: DB 필드(`is_completed`, `user_id` 등)를 컴포넌트에서 그대로 사용 중

**목표 상태**: 컴포넌트에서는 camelCase 사용, 훅에서 매핑 처리

**적용 시점** (이때만 변환 작업):
1. ✅ 새 훅/컴포넌트 만들 때 → 처음부터 camelCase로
2. ✅ 기존 파일 버그 수정할 때 → 해당 파일만 변환
3. ❌ 일부러 리팩토링하러 가지 않음

**매퍼 유틸리티**: `lib/mappers.ts` (기반 완료)
```typescript
// 훅에서 사용 예시
import { mapWorkLog, type WorkLog } from '@/lib/mappers'

const { data } = await supabase.from('work_logs').select('*')
const workLogs: WorkLog[] = data.map(mapWorkLog)  // snake → camel 변환

// 컴포넌트에서 사용
task.isCompleted  // camelCase
```

**변환 완료된 파일**:
- `lib/mappers.ts` - WorkLog, DailyLog 매퍼 (기반)
- `hooks/useWorkLogs.ts` - WorkLog CRUD (2026-02-06)
- `components/WorkLog/DailyLogEditor.tsx` - workLog 필드 camelCase 사용 (2026-02-06)

---

## DB 타입 관리

### 타입 자동 생성 (Supabase CLI)
`types/database.ts`는 직접 수정하지 않는다. DB 스키마 변경 후 아래 명령어로 재생성:

```bash
cd ilmakase-v2
npx supabase gen types typescript --project-id tghwiknmkymgejzwvfrz > types/database.ts
```

> 실행 시 `SUPABASE_ACCESS_TOKEN` 환경변수 필요 (쉘 프로필에 설정하거나 인라인으로 전달)

### 타입 체크
커밋 전에 반드시 실행:

```bash
npm run typecheck
```

### 주의사항
- `types/database.ts`를 수동으로 편집하면 다음 gen types 시 덮어씌워짐
- DB에서 nullable인 필드는 코드에서 `?? 기본값` 으로 처리 (ex: `db.progress ?? 0`)
- `@supabase/supabase-js` 버전 업데이트 후에도 `npm run typecheck`로 깨지는 곳 확인

---

## 실행 방법

```bash
cd ilmakase-v2
npm run dev
# http://localhost:3001 (3000 사용 중이면)
```

---

## 참고 파일

- `INTEGRATION-v2.md`: 상세 기획서, 화면 설계, 워크플로우
- `worklog-db/`: 기존 WorkLog 코드 (UI 참고용)
