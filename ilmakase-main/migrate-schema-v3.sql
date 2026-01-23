-- 스키마 마이그레이션: v2 → v3
-- 5개 기록 → 패턴 분석, 4개 패턴 분석 → 포트폴리오 카드

-- 1. records 테이블에 analysis_id 컬럼 추가
ALTER TABLE records 
ADD COLUMN IF NOT EXISTS analysis_id UUID REFERENCES ai_analyses(id) ON DELETE SET NULL;

-- 2. ai_analyses 테이블에 project_id 컬럼 추가
ALTER TABLE ai_analyses 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES project_cards(id) ON DELETE SET NULL;

-- 3. project_cards 테이블에 analysis_ids 컬럼 추가
ALTER TABLE project_cards 
ADD COLUMN IF NOT EXISTS analysis_ids UUID[];

-- 4. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_records_analysis ON records(user_id, analysis_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_project ON ai_analyses(user_id, project_id);

-- 완료!
SELECT 'Schema migration v2 → v3 completed!' AS status;

