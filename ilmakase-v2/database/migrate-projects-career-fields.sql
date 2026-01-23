-- 프로젝트 테이블에 경력기술서용 필드 추가
-- 실행: Supabase SQL Editor에서 실행

-- 1. 담당 역할
ALTER TABLE projects ADD COLUMN IF NOT EXISTS role VARCHAR(100);

-- 2. 팀 규모
ALTER TABLE projects ADD COLUMN IF NOT EXISTS team_size VARCHAR(50);

-- 3. 기술 스택 (배열)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tech_stack TEXT[] DEFAULT '{}';

-- 4. 성과/결과 (JSONB - 정량적/정성적 구분)
-- 형식: [{ "type": "quantitative" | "qualitative", "content": "..." }, ...]
ALTER TABLE projects ADD COLUMN IF NOT EXISTS outcomes JSONB DEFAULT '[]';

-- 5. 기여도/담당 업무 설명
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contribution TEXT;

-- 6. 프로젝트 한 줄 요약 (경력기술서용)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS summary TEXT;

-- 인덱스 (성과 검색용)
CREATE INDEX IF NOT EXISTS idx_projects_outcomes ON projects USING GIN (outcomes);
