# 일마카세 아카이브 (ILMAKASE Archive)

> "오늘 한 일이 내일의 포트폴리오가 됩니다"

매일의 업무 기록이 AI를 통해 자동으로 포트폴리오 카드로 변환되는 서비스입니다.

## 🎯 프로젝트 개요

일마카세 아카이브는 **업무 부담을 최소화**하면서 **꾸준한 기록 습관**을 형성하도록 돕는 서비스입니다.

- 하루 1번, 업무 일지를 항목별로 작성
- 5일이 쌓이면 AI가 자동으로 프로젝트 카드 생성
- 나중에 원하는 항목만 선택해서 커스텀 카드 생성 (V1.0)
- 월간 업무 리포트 자동 생성 (V2.0)

## 🛠️ 기술 스택

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Font**: Pretendard

### Backend
- **API**: Next.js Route Handlers
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage

### AI
- **Provider**: Google Gemini 1.5 Flash
- **Use Cases**:
  - 즉시 미리보기 (1일 기록)
  - 패턴 분석 (3일 기록)
  - 프로젝트 카드 생성 (5일 기록)

### Deployment
- **Platform**: Vercel
- **Environment**: Serverless

## 📂 프로젝트 구조

```
ilmakase-mvp/
├── app/
│   ├── (auth)/              # 인증 관련 페이지
│   │   ├── login/
│   │   └── signup/
│   ├── (main)/              # 메인 기능 페이지
│   │   ├── home/            # 홈 화면
│   │   ├── write/           # 기록 작성 (항목 단위)
│   │   ├── records/         # 기록 목록/상세
│   │   ├── analysis/        # AI 분석 결과
│   │   ├── cards/           # 프로젝트 카드
│   │   └── onboarding/      # 온보딩
│   └── api/                 # API 라우트
│       ├── records/
│       ├── ai/
│       └── cards/
├── components/              # 재사용 컴포넌트
│   └── ui/
├── lib/
│   ├── supabase/           # Supabase 클라이언트
│   └── gemini/             # Gemini AI 통합
├── types/                  # TypeScript 타입 정의
├── docs/                   # 프로젝트 문서
│   ├── supabase/           # Supabase 가이드
│   └── database/           # DB 관련 스크립트
└── public/
```

> 📚 **문서**: 상세한 문서는 [`docs/`](./docs/) 디렉토리를 참고하세요.

## 🚀 시작하기

### 1. 저장소 클론

```bash
git clone <repository-url>
cd ilmakase-mvp
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 내용을 입력하세요:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key
```

#### Supabase 설정 방법:

1. [Supabase](https://supabase.com) 회원가입 및 로그인
2. 새 프로젝트 생성
3. Project Settings > API에서 URL과 anon key 복사
4. SQL Editor에서 `supabase-schema-safe.sql` 실행하여 테이블 생성
5. Authentication > Providers > Email에서 "Confirm email" 비활성화 (MVP 단계)

#### Gemini API 키 발급 방법:

1. [Google AI Studio](https://aistudio.google.com) 접속
2. "Get API Key" 클릭
3. API 키 생성 및 복사

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

## 📊 데이터베이스 스키마

### users
- 사용자 기본 정보
- 온보딩 정보 (situation, main_work 등)

### records
- **contents**: `string[]` - 항목 단위 업무 일지
- date: 작성 날짜
- project_id: 연결된 프로젝트 카드 ID

### ai_analyses
- 3일 기록 시 생성되는 AI 분석 결과
- pattern, workflow, keywords, insight

### project_cards
- 5일 기록 시 자동 생성되는 포트폴리오 카드
- title, tasks, results, thinking_summary

자세한 스키마는 `supabase-schema-safe.sql` 참조

## 🎨 핵심 기능

### 1. 항목 단위 업무 일지 작성
- 하루 1번 작성 제한
- 동적으로 추가 가능한 업무 항목 (최대 10개)
- 각 항목당 10-500자

### 2. AI 즉시 미리보기
- 작성 완료 즉시 AI가 포트폴리오 형식으로 변환
- "무엇을 했는지" + "어떻게 생각했는지" 추출

### 3. 진행도 시각화
- 다음 카드까지 남은 일수 표시
- 5일 주기 progress bar
- 기록/카드/대기 중 통계

### 4. AI 패턴 분석 (3일)
- 업무 패턴 발견
- 업무 흐름 요약
- 키워드 추출
- 인사이트 제공

### 5. 프로젝트 카드 자동 생성 (5일)
- 5일간의 기록을 1개의 프로젝트로 변환
- AI가 프로젝트 제목, 핵심 업무, 사고 방식 자동 생성
- 포트폴리오로 바로 활용 가능한 형식

## 🗺️ 로드맵

### MVP (현재)
- ✅ 항목 단위 업무 일지 작성
- ✅ 5일 자동 카드 생성
- ✅ 진행도 시각화
- ✅ AI 분석 (3일)

### V1.0 (향후)
- 📅 캘린더 뷰 (월별 기록 현황)
- 📊 주간 모아보기
- ☑️ 라인별 선택 → 커스텀 카드 생성
- 🔍 기록 검색 기능

### V2.0 (향후)
- 📈 월간 업무 리포트 자동 생성
- 🎨 카드 디자인 커스터마이징
- 📤 카드 공유 기능
- 💾 외부 연동 (Slack, Notion)

## 🤝 기여

이슈와 PR은 언제나 환영합니다!

## 📄 라이선스

MIT License

## 📞 문의

문의사항이 있으시면 이슈를 등록해주세요.
