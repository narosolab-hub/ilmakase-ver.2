-- 경력기술서 회사 단위 확장 마이그레이션
-- career_documents 테이블에 회사 기반 필드 추가

-- 회사 연결
ALTER TABLE career_documents ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- 생성된 경력기술서 본문
ALTER TABLE career_documents ADD COLUMN IF NOT EXISTS content TEXT;

-- 포함된 프로젝트 ID 목록
ALTER TABLE career_documents ADD COLUMN IF NOT EXISTS project_ids UUID[] DEFAULT '{}';

-- 우선순위 설정 (재생성용)
ALTER TABLE career_documents ADD COLUMN IF NOT EXISTS priority_config JSONB;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_career_documents_company ON career_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_career_documents_user ON career_documents(user_id);
