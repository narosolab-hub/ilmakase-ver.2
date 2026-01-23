# 문서 디렉토리

이 디렉토리에는 프로젝트 관련 문서들이 정리되어 있습니다.

## 📁 디렉토리 구조

```
docs/
├── README.md (이 파일)
├── ilmakase-prd.md                    # PRD (Product Requirements Document)
├── 일마카세_기능명세서_v2.md          # 기능명세서
├── AI_LOGIC_FLOW.md                   # AI 로직 플로우 가이드
├── supabase/                          # Supabase 관련 가이드
│   ├── PROJECT_PAUSE_PREVENTION.md   # 프로젝트 일시 정지 방지 가이드
│   ├── HOW_TO_CHECK_USAGE.md         # 사용량 확인 방법
│   └── UPGRADE_GUIDE.md              # 업그레이드 가이드
└── database/                          # 데이터베이스 관련
    ├── check-db-size.sql              # 데이터베이스 크기 상세 확인
    ├── quick-check-db.sql             # 데이터베이스 크기 빠른 확인
    ├── optimize-db.sql                # 데이터베이스 최적화
    └── supabase-schema.sql            # 구버전 스키마 (참고용)
```

## 📄 주요 문서

### 프로젝트 문서
- **ilmakase-prd.md**: 제품 요구사항 문서 (PRD)
- **일마카세_기능명세서_v2.md**: 상세 기능명세서
- **AI_LOGIC_FLOW.md**: AI 로직 플로우 및 동작 원리

### Supabase 가이드
- **PROJECT_PAUSE_PREVENTION.md**: 무료 플랜 프로젝트 일시 정지 방지 방법
- **HOW_TO_CHECK_USAGE.md**: 데이터베이스 사용량 확인 방법
- **UPGRADE_GUIDE.md**: Pro 플랜 업그레이드 가이드

### 데이터베이스 스크립트
- **check-db-size.sql**: 상세한 데이터베이스 사용량 분석
- **quick-check-db.sql**: 빠른 사용량 확인
- **optimize-db.sql**: 데이터베이스 최적화 쿼리

## 🔍 빠른 참조

### 데이터베이스 사용량 확인
```sql
-- Supabase SQL Editor에서 실행
SELECT pg_size_pretty(pg_database_size(current_database()));
```

### 프로젝트 일시 정지 방지
- 주 1회 이상 Supabase 대시보드 접속
- 또는 애플리케이션 사용으로 API 호출 발생

