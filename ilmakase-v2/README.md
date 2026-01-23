# 일마카세 v2.0

> WorkLog + 일마카세 통합 서비스
> **"메모장처럼 쓴 업무 기록이 이직용 경력기술서로 자동 변환되는"** 완전한 서비스

## 핵심 기능

- **프로젝트별 자동 집계** - 업무를 프로젝트 단위로 자동 정리
- **경력기술서 자동 생성** - 바로 복붙 가능한 이력서 문구 제공 (3가지 버전)
- **메모장 같은 UX** - 부담 없이 쓰고 AI가 알아서 정리
- **월별 트렌드 분석** - 내 업무 패턴 시각화

## 데이터 구조

```
프로젝트 (자동 매칭 or 수기 등록)
  └── 태스크 (수기 등록)
       └── 업무 (수기 등록, 메모장처럼)
```

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 `.env.local`로 복사하고 값을 입력합니다:

```bash
cp .env.example .env.local
```

필요한 환경 변수:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase Anonymous Key
- `GOOGLE_AI_API_KEY` - Google AI (Gemini) API Key

### 3. 데이터베이스 설정

`database/schema.sql` 파일의 SQL을 Supabase SQL Editor에서 실행합니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

## 폴더 구조

```
ilmakase-v2/
├── app/
│   ├── (auth)/           # 인증 페이지 (로그인, 회원가입)
│   ├── (main)/           # 메인 페이지 (워크로그, 프로젝트, 회고)
│   ├── api/              # API 라우트
│   │   ├── ai-analysis/  # AI 분석 API
│   │   ├── career-doc/   # 경력기술서 생성 API
│   │   ├── monthly-review/ # 월간 회고 API
│   │   └── projects/     # 프로젝트 자동 매칭 API
│   └── auth/callback/    # OAuth 콜백
├── components/
│   ├── UI/               # 공통 UI 컴포넌트
│   └── WorkLog/          # 워크로그 관련 컴포넌트
├── hooks/                # React Hooks
├── lib/
│   ├── gemini/           # Google AI (Gemini) 클라이언트
│   └── supabase/         # Supabase 클라이언트
├── types/                # TypeScript 타입 정의
└── database/             # 데이터베이스 스키마
```

## 요금제

### 무료 플랜
- 일일 업무 기록 (무제한)
- 완료율 체크 (무제한)
- AI 분석 (3회/월)
- 경력기술서 생성 (1회/월)

### 베이직 플랜 (₩9,900/월)
- 무료 플랜 모두 포함
- AI 분석 (무제한)
- 경력기술서 생성 (무제한)
- 월간 회고 리포트

### 프리미엄 플랜 (₩19,900/월)
- 베이직 플랜 모두 포함
- 인사이트 대시보드
- 면접 시뮬레이션
- 1:1 커리어 컨설팅

## 기술 스택

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini 1.5 Flash
- **Auth**: Supabase Auth

## 라이선스

Private - All rights reserved
