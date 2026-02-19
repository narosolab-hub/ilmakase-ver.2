-- ============================================================
-- 미사용 DB 정리 마이그레이션
-- 실행: Supabase SQL Editor에서 붙여넣기 후 실행
-- ============================================================

-- 1. ai_analyses 테이블 삭제 (코드에서 전혀 사용하지 않음)
DROP TABLE IF EXISTS ai_analyses;

-- 2. career_documents 미사용 컬럼 삭제
--    (이전 프로젝트 단위 생성 API 유산 — generate-by-company로 대체됨)
ALTER TABLE career_documents
  DROP COLUMN IF EXISTS brief_version,
  DROP COLUMN IF EXISTS detailed_version,
  DROP COLUMN IF EXISTS star_version,
  DROP COLUMN IF EXISTS task_summary,
  DROP COLUMN IF EXISTS thinking_analysis,
  DROP COLUMN IF EXISTS project_id;

-- 3. monthly_reviews 미사용 컬럼 삭제
--    (저장도 읽기도 하지 않는 컬럼들 — project_distribution은 저장 중이므로 유지)
ALTER TABLE monthly_reviews
  DROP COLUMN IF EXISTS goals_for_next_month,
  DROP COLUMN IF EXISTS monthly_comparison,
  DROP COLUMN IF EXISTS work_type_distribution;
