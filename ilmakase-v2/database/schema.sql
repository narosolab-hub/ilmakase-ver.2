-- 일마카세 v2 통합 데이터베이스 스키마
-- WorkLog + 일마카세 통합 (프로젝트 > 태스크 > 업무 3단계 구조)

-- 사용자 테이블
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  -- 온보딩 정보
  situation TEXT CHECK (situation IN ('working', 'job_seeking', 'freelance')),
  main_work TEXT,
  record_reason TEXT,
  time_preference TEXT CHECK (time_preference IN ('3min', '5min', 'flexible')),
  emotional_phrase TEXT,
  -- 구독 정보
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'premium')),
  ai_credits_used INT DEFAULT 0,
  career_doc_credits_used INT DEFAULT 0,
  credits_reset_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 프로젝트 테이블
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT '진행중' CHECK (status IN ('진행중', '완료', '보류')),
  start_date DATE,
  end_date DATE,
  auto_matched BOOLEAN DEFAULT false,
  keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 태스크 테이블
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT '진행중' CHECK (status IN ('진행중', '완료', '보류')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 업무 기록 테이블 (WorkLog + 일마카세 통합)
CREATE TABLE work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- 기본 정보
  content TEXT NOT NULL,
  detail TEXT,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- 완료율
  progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  is_completed BOOLEAN DEFAULT false,

  -- AI 분석 결과 (JSON)
  ai_analysis JSONB,

  -- 메타 정보
  keywords TEXT[] DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI 분석 테이블 (패턴 분석)
CREATE TABLE ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_log_ids UUID[] NOT NULL,

  -- 분석 결과
  pattern TEXT,
  workflow TEXT,
  top_keywords TEXT[],
  insight TEXT,
  thinking_analysis JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 경력기술서 테이블
CREATE TABLE career_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- 프로젝트 요약 정보
  title TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  role TEXT,
  team_size TEXT,

  -- 태스크별 집계
  task_summary JSONB,

  -- 생성된 문구 (3가지 버전)
  brief_version TEXT,
  detailed_version TEXT,
  star_version JSONB,

  -- 사고방식 분석
  thinking_analysis JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 월간 회고 테이블
CREATE TABLE monthly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year_month VARCHAR(7) NOT NULL,

  -- 통계
  total_work_days INT,
  avg_completion_rate DECIMAL(5,2),
  work_type_distribution JSONB,
  project_distribution JSONB,

  -- 월별 비교
  monthly_comparison JSONB,

  -- AI 인사이트
  ai_insights JSONB,

  -- 사용자 회고
  user_reflection TEXT,
  goals_for_next_month JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 일일 로그 테이블 (raw content 저장용)
CREATE TABLE daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  raw_content TEXT,
  parsed_tasks_count INT DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, log_date)
);

-- 인덱스 생성
CREATE INDEX idx_work_logs_user_date ON work_logs(user_id, work_date);
CREATE INDEX idx_work_logs_task ON work_logs(task_id);
CREATE INDEX idx_work_logs_project ON work_logs(project_id);
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(user_id, status);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_user ON tasks(user_id);
CREATE INDEX idx_daily_logs_user_date ON daily_logs(user_id, log_date);
CREATE INDEX idx_monthly_reviews_user_month ON monthly_reviews(user_id, year_month);

-- RLS (Row Level Security) 정책
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

-- 사용자별 데이터 접근 정책
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own projects" ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own tasks" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own work_logs" ON work_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own work_logs" ON work_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own work_logs" ON work_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own work_logs" ON work_logs FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own ai_analyses" ON ai_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ai_analyses" ON ai_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own career_documents" ON career_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own career_documents" ON career_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own career_documents" ON career_documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own career_documents" ON career_documents FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own monthly_reviews" ON monthly_reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own monthly_reviews" ON monthly_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own monthly_reviews" ON monthly_reviews FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own daily_logs" ON daily_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily_logs" ON daily_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily_logs" ON daily_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own daily_logs" ON daily_logs FOR DELETE USING (auth.uid() = user_id);

-- 트리거: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_work_logs_updated_at BEFORE UPDATE ON work_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_career_documents_updated_at BEFORE UPDATE ON career_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_monthly_reviews_updated_at BEFORE UPDATE ON monthly_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_logs_updated_at BEFORE UPDATE ON daily_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
