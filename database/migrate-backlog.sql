-- 백로그 기능을 위한 work_logs.status 컬럼 추가
-- NULL = 일반 업무 (active)
-- 'backlog' = 나중에 할 일 (백로그)
ALTER TABLE work_logs ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT NULL;

-- 인덱스 추가 (백로그 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_work_logs_status ON work_logs(user_id, status) WHERE status IS NOT NULL;
