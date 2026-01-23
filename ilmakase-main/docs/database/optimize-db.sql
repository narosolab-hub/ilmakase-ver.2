-- 데이터베이스 최적화 쿼리
-- 주의: 실행 전 백업을 권장합니다

-- 1. 오래된 데이터 정리 (예: 1년 이상 된 기록)
-- 필요시 주석을 해제하고 실행하세요
/*
DELETE FROM records 
WHERE date < CURRENT_DATE - INTERVAL '1 year'
AND project_id IS NOT NULL;  -- 포트폴리오 카드에 연결된 기록은 보존
*/

-- 2. 사용하지 않는 인덱스 확인 및 정리
-- VACUUM으로 공간 회수
VACUUM ANALYZE;

-- 3. JSONB 데이터 최적화 (ai_preview)
-- 큰 JSONB 필드가 있는 경우 압축
-- PostgreSQL은 자동으로 압축하지만, 명시적으로 확인
SELECT 
  COUNT(*) AS records_with_preview,
  AVG(pg_column_size(ai_preview)) AS avg_preview_size_bytes
FROM records
WHERE ai_preview IS NOT NULL;

-- 4. 테이블 통계 업데이트 (쿼리 성능 향상)
ANALYZE records;
ANALYZE ai_analyses;
ANALYZE project_cards;
ANALYZE users;

