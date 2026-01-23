# Supabase 데이터 사용량 확인 방법

## 🚀 방법 1: 대시보드에서 확인 (가장 빠름)

1. **Supabase 대시보드 접속**
   - https://supabase.com/dashboard
   - 로그인 후 프로젝트 선택

2. **Settings → Usage 메뉴**
   - 왼쪽 사이드바에서 **Settings** 클릭
   - **Usage** 탭 선택

3. **확인할 정보**
   - **Database Size**: 현재 데이터베이스 사용량
   - **Bandwidth**: 월간 대역폭 사용량
   - **API Requests**: API 요청 수

4. **제한 확인**
   - 무료 플랜: 500MB (Database), 5GB (Bandwidth)
   - 현재 사용량과 제한을 비교하여 확인

## 📊 방법 2: SQL 쿼리로 상세 확인

### 빠른 확인 (quick-check-db.sql)
Supabase SQL Editor에서 실행:

```sql
-- 전체 데이터베이스 크기
SELECT 
  pg_size_pretty(pg_database_size(current_database())) AS "전체 DB 크기";
```

### 상세 확인 (check-db-size.sql)
각 테이블별 크기와 상세 정보 확인

## 📈 사용량 해석

### 무료 플랜 기준
- **500MB 미만**: 안전 ✅
- **400-500MB**: 업그레이드 고려 ⚠️
- **500MB 초과**: 업그레이드 필요 ❌

### 예상 사용량
- 사용자 1명, 월 20일 기록 기준: 약 155KB
- 500MB = 약 3,200명의 활성 사용자까지 가능

## 🔍 정기 확인 권장
- 주 1회 또는 월 1회 확인
- 사용량이 급증하면 원인 파악
- 400MB 이상이면 최적화 또는 업그레이드 고려

