-- 빠른 데이터베이스 사용량 확인
-- Supabase SQL Editor에서 실행하세요

-- 1. 전체 데이터베이스 크기 (가장 중요!)
SELECT 
  pg_size_pretty(pg_database_size(current_database())) AS "전체 DB 크기",
  pg_database_size(current_database()) AS "크기 (바이트)";

-- 2. 각 테이블별 크기 (어떤 테이블이 공간을 많이 쓰는지 확인)
SELECT 
  tablename AS "테이블명",
  pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS "크기",
  pg_total_relation_size('public.'||tablename) AS "크기 (바이트)"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||tablename) DESC;

-- 3. 사용량 요약 (한눈에 보기)
SELECT 
  (SELECT pg_size_pretty(pg_database_size(current_database()))) AS "전체 DB",
  (SELECT COUNT(*) FROM records) AS "기록 수",
  (SELECT COUNT(*) FROM ai_analyses) AS "분석 수",
  (SELECT COUNT(*) FROM project_cards) AS "카드 수",
  (SELECT COUNT(*) FROM users) AS "사용자 수";

