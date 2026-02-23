-- 사고 체크리스트 답변 저장 컬럼 추가
ALTER TABLE work_logs
ADD COLUMN IF NOT EXISTS thinking_answers JSONB DEFAULT NULL;
