-- 일마카세 아카이브 Supabase 스키마
-- v2.0: contents 배열 구조로 변경

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users 테이블
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 온보딩 정보
  situation TEXT CHECK (situation IN ('working', 'job_seeking', 'freelance')),
  main_work TEXT,
  record_reason TEXT,
  time_preference TEXT CHECK (time_preference IN ('3min', '5min', 'flexible')),
  emotional_phrase TEXT
);

-- Project Cards 테이블 (4개 패턴 분석 = 20일 기록) - records보다 먼저 생성!
CREATE TABLE IF NOT EXISTS project_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  analysis_ids UUID[] NOT NULL,  -- 4개 패턴 분석 카드 ID
  record_ids UUID[] NOT NULL,  -- 총 20개 기록 ID
  title TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  tasks TEXT[] NOT NULL,
  results TEXT[] NOT NULL,
  thinking_summary TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Records 테이블 (핵심 변경: contents 배열 + ai_preview)
CREATE TABLE IF NOT EXISTS records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contents TEXT[] NOT NULL,  -- 변경: 항목 단위 배열
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- AI 추출 정보
  keywords TEXT[],
  ai_preview JSONB,  -- 추가: AI 즉시 미리보기 (items: [{original, skill, portfolioTerm}])
  analysis_id UUID REFERENCES ai_analyses(id) ON DELETE SET NULL,  -- 패턴 분석 연결
  project_id UUID REFERENCES project_cards(id) ON DELETE SET NULL,  -- 포트폴리오 카드 연결
  
  -- 하루 1회 작성 제한을 위한 유니크 제약
  UNIQUE(user_id, date)
);

-- AI Analyses 테이블 (5일 기록 → 패턴 분석)
CREATE TABLE IF NOT EXISTS ai_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  record_ids UUID[] NOT NULL,  -- 5개 기록 ID
  pattern TEXT NOT NULL,
  workflow TEXT NOT NULL,
  top_keywords TEXT[] NOT NULL,
  insight TEXT NOT NULL,
  project_id UUID REFERENCES project_cards(id) ON DELETE SET NULL,  -- 포트폴리오 카드 연결
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_records_user_date ON records(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_records_user_project ON records(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_records_ai_preview ON records USING GIN (ai_preview);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_user ON ai_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_project_cards_user ON project_cards(user_id, created_at DESC);

-- Row Level Security (RLS) 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_cards ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (안전하게 재실행하기 위해)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view own records" ON records;
DROP POLICY IF EXISTS "Users can insert own records" ON records;
DROP POLICY IF EXISTS "Users can update own records" ON records;
DROP POLICY IF EXISTS "Users can delete own records" ON records;
DROP POLICY IF EXISTS "Users can view own analyses" ON ai_analyses;
DROP POLICY IF EXISTS "Users can insert own analyses" ON ai_analyses;
DROP POLICY IF EXISTS "Users can view own cards" ON project_cards;
DROP POLICY IF EXISTS "Users can insert own cards" ON project_cards;
DROP POLICY IF EXISTS "Users can update own cards" ON project_cards;
DROP POLICY IF EXISTS "Users can delete own cards" ON project_cards;

-- Users 정책
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Records 정책
CREATE POLICY "Users can view own records"
  ON records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own records"
  ON records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own records"
  ON records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own records"
  ON records FOR DELETE
  USING (auth.uid() = user_id);

-- AI Analyses 정책
CREATE POLICY "Users can view own analyses"
  ON ai_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses"
  ON ai_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Project Cards 정책
CREATE POLICY "Users can view own cards"
  ON project_cards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cards"
  ON project_cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cards"
  ON project_cards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cards"
  ON project_cards FOR DELETE
  USING (auth.uid() = user_id);

-- Functions & Triggers

-- 1. 새 사용자 생성 시 users 테이블에 자동 삽입
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;  -- 이미 존재하면 무시
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: auth.users에 새 사용자 추가 시
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 완료!
SELECT 'Supabase schema setup completed!' AS status;
