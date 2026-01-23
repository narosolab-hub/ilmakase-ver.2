-- 데이터베이스 사용량 확인 쿼리
-- Supabase SQL Editor에서 실행하세요

-- 1. 전체 데이터베이스 크기
SELECT 
  pg_size_pretty(pg_database_size(current_database())) AS total_size;

-- 2. 각 테이블별 크기
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;

-- 3. records 테이블 상세 정보
SELECT 
  COUNT(*) AS total_records,
  pg_size_pretty(pg_total_relation_size('records')) AS table_size,
  pg_size_pretty(pg_indexes_size('records')) AS indexes_size,
  AVG(array_length(contents, 1)) AS avg_items_per_record,
  AVG(length(contents::text)) AS avg_content_length
FROM records;

-- 4. ai_analyses 테이블 상세 정보
SELECT 
  COUNT(*) AS total_analyses,
  pg_size_pretty(pg_total_relation_size('ai_analyses')) AS table_size
FROM ai_analyses;

-- 5. project_cards 테이블 상세 정보
SELECT 
  COUNT(*) AS total_cards,
  pg_size_pretty(pg_total_relation_size('project_cards')) AS table_size
FROM project_cards;

-- 6. 사용자별 기록 수 (데이터가 많은 사용자 확인)
SELECT 
  u.email,
  COUNT(r.id) AS record_count,
  COUNT(a.id) AS analysis_count,
  COUNT(p.id) AS card_count
FROM users u
LEFT JOIN records r ON u.id = r.user_id
LEFT JOIN ai_analyses a ON u.id = a.user_id
LEFT JOIN project_cards p ON u.id = p.user_id
GROUP BY u.id, u.email
ORDER BY record_count DESC
LIMIT 10;

