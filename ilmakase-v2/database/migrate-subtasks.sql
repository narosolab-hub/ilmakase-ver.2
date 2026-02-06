-- 세부 업무(Subtasks) 기능 추가 마이그레이션
-- 실행 방법: Supabase SQL Editor에서 실행

-- work_logs 테이블에 subtasks 컬럼 추가 (JSONB)
ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT NULL;

-- 컬럼 설명 추가
COMMENT ON COLUMN work_logs.subtasks IS '세부 업무 목록. JSON 배열 형식: [{id: string, content: string, is_completed: boolean}]';

-- 인덱스 추가 (세부 업무 검색 성능 향상, 필요시)
-- CREATE INDEX IF NOT EXISTS idx_work_logs_subtasks ON work_logs USING GIN (subtasks);
