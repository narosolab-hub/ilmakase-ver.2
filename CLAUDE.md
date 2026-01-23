# 일마카세 v2 프로젝트 컨텍스트

> Claude Code가 참조하는 프로젝트 지침서

---

## 프로젝트 개요

**일마카세**: 사수 없는 주니어를 위한 AI 업무 코칭 서비스

### 핵심 가치
> "매일 쓰는 업무 기록이 성장의 피드백이 된다"

- **타겟**: 사수 없이 혼자 일하는 주니어 개발자/기획자/디자이너
- **문제**: 내가 잘하고 있는지 모르겠고, 뭘 더 해야 하는지 모르겠음
- **해결**: AI가 사수처럼 업무를 확장 제안하고, 사고방식을 분석하고, 성장 피드백 제공

### 서비스 핵심 흐름
```
업무 기록 → AI 업무 확장 제안 → 사고방식 분석 → 성장 피드백 → 경력 축적
```

### 핵심 데이터 구조 (3단계)
```
프로젝트 (자동 매칭 or 수기 등록)
  └── 태스크 (수기 등록)
       └── 업무 (수기 등록, 메모장처럼)
```

---

## AI 코칭 기능 (핵심)

### 1. 업무 확장 제안 ⭐ (우선 구현)
사용자가 입력한 업무를 기반으로 "추가로 확인/검토해야 할 업무" 제안

```
[사용자 입력]
#랜딩페이지/ 신규 서비스 기획안 작성

[AI 제안]
💡 이 업무 하실 때 같이 확인해보세요:
- 타겟 사용자 페르소나 정의했나요?
- 경쟁사 랜딩페이지 벤치마킹
- CTA 문구 초안 작성
- 전환 퍼널 흐름 설계
- 법적 고지사항 검토 필요 여부
```

**구현 위치**: 데일리 로그 저장 후 or "AI 제안" 버튼 클릭 시
**API**: `POST /api/ai/suggest-tasks`

### 2. 사고방식 분석
오늘/이번 주 업무 패턴을 분석해서 사고 유형 파악

```
[분석 결과]
📊 이번 주 업무 패턴: "실행형"
- 기획보다 실행 업무가 많았어요
- 가끔 "왜 해야 하는지" 먼저 정리하면 더 효율적일 수 있어요
- 추천: 업무 시작 전 5분 목적 정리 습관
```

**구현 위치**: 주간 요약 or 월간 회고
**API**: `POST /api/ai/analyze-pattern`

### 3. 역량 매핑
오늘 한 업무가 어떤 역량으로 쌓이는지 인식

```
[역량 매핑]
✅ API 명세서 검토 → "요구사항 분석" 역량
💡 검토 결과를 문서화하면 "커뮤니케이션" 역량도 쌓여요
```

**구현 위치**: 업무 목록 옆에 태그로 표시
**API**: `POST /api/ai/map-skill`

### 4. 성장 피드백
더 잘하려면 어떻게 해야 하는지 조언

```
[성장 피드백]
🚀 이번 주 회의가 많았네요
- 회의 전 안건 정리 습관 들이면 시니어처럼 보여요
- 회의록 작성하면 "문서화" 역량도 쌓을 수 있어요
```

**구현 위치**: 주간/월간 회고
**API**: `POST /api/ai/growth-feedback`

---

## AI 프롬프트 가이드

### 업무 확장 제안 프롬프트
```
당신은 경력 10년차 시니어 멘토입니다.
주니어가 아래 업무를 한다고 합니다.
이 업무를 할 때 놓치기 쉽지만 확인해야 할 것들을 3-5개 제안해주세요.
너무 당연한 것보다는 "아, 이것도 해야 하는구나" 싶은 것들로요.

[업무 목록]
{tasks}

[프로젝트 컨텍스트]
{project_name}: {project_description}
```

### 사고방식 분석 프롬프트
```
아래는 사용자의 이번 주 업무 기록입니다.
업무 패턴을 분석해서 사고 유형을 파악해주세요.

유형 예시:
- 실행형: 바로 행동으로 옮기는 스타일
- 분석형: 충분히 검토 후 실행하는 스타일
- 협업형: 소통과 조율 중심 스타일
- 창의형: 새로운 시도를 즐기는 스타일

[업무 기록]
{weekly_tasks}

1~2문장으로 사고 유형과 특징을 설명하고,
한 가지 성장 팁을 제안해주세요.
```

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
│   │   │   └── DatePicker.tsx
│   │   ├── Project/
│   │   │   └── ProjectDetailModal.tsx  # 프로젝트 상세 편집 모달
│   │   └── UI/
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Input.tsx
│   │       └── ProgressBar.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useDailyLog.ts
│   │   ├── useWorkLogs.ts          # work_logs CRUD
│   │   ├── useCarryOver.ts         # 미완료 업무 가져오기
│   │   └── useProjects.ts
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
- 미완료 업무 아코디언 (최근 7일 미완료 업무 표시)
- 오늘 업무 진척도 (개별 진척도 합산 %)

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

## 현재 진행 상황 (2026-01-23)

### 완료 - 기록 기능
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
- [x] 프로젝트 자동 생성 - 업무 기록 시 새 프로젝트명 감지하면 자동 생성
- [x] 프로젝트 경력기술서용 필드 - role, team_size, tech_stack, outcomes, contribution, summary
- [x] 프로젝트 상세 편집 UI - 프로젝트 카드 클릭 시 모달로 상세 정보 입력

### 진행 예정 - AI 코칭 기능 (핵심)
- [ ] **AI 업무 확장 제안** ⭐ 우선순위 1
  - 업무 저장 시 AI가 추가 확인/검토 업무 제안
  - "사수가 체크해주는 것"을 AI가 대신
- [ ] **사고방식 분석**
  - 주간 업무 패턴 분석 → 사고 유형 파악
  - 실행형/분석형/협업형/창의형 등
- [ ] **역량 매핑**
  - 업무 → 역량 태그 자동 매핑
  - "이 업무는 XX 역량이에요"
- [ ] **성장 피드백**
  - 더 잘하려면 어떻게 해야 하는지 조언
  - 시니어처럼 일하는 팁

### 진행 예정 - 부가 기능
- [ ] 월간 회고 페이지
- [ ] 경력기술서 자동 생성

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
