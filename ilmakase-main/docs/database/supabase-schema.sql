-- 일마카세 아카이브 데이터베이스 스키마
-- Supabase SQL Editor에서 실행하세요

-- 1. users 테이블 (확장)
-- auth.users 테이블에 추가 정보를 저장하기 위한 프로필 테이블
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 온보딩 정보
  situation TEXT CHECK (situation IN ('working', 'job_seeking', 'freelance')),
  main_work TEXT,
  record_reason TEXT,
  time_preference TEXT CHECK (time_preference IN ('3min', '5min', 'flexible')),
  emotional_phrase TEXT
);

-- users 테이블 RLS (Row Level Security) 설정
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 데이터만 조회 가능
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- 사용자는 자신의 데이터만 업데이트 가능
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- 2. records 테이블 (기록)
CREATE TABLE IF NOT EXISTS public.records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- AI 추출 정보
  keywords TEXT[],
  project_id UUID
);

-- records 테이블 인덱스
CREATE INDEX IF NOT EXISTS records_user_id_idx ON public.records(user_id);
CREATE INDEX IF NOT EXISTS records_date_idx ON public.records(date DESC);
CREATE INDEX IF NOT EXISTS records_project_id_idx ON public.records(project_id);

-- records 테이블 RLS 설정
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 기록만 조회 가능
CREATE POLICY "Users can view own records"
  ON public.records FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자는 자신의 기록만 삽입 가능
CREATE POLICY "Users can insert own records"
  ON public.records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 기록만 업데이트 가능
CREATE POLICY "Users can update own records"
  ON public.records FOR UPDATE
  USING (auth.uid() = user_id);

-- 사용자는 자신의 기록만 삭제 가능
CREATE POLICY "Users can delete own records"
  ON public.records FOR DELETE
  USING (auth.uid() = user_id);

-- 3. ai_analyses 테이블 (AI 분석 결과)
CREATE TABLE IF NOT EXISTS public.ai_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  record_ids UUID[] NOT NULL,
  pattern TEXT NOT NULL,
  workflow TEXT NOT NULL,
  top_keywords TEXT[] NOT NULL,
  insight TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ai_analyses 테이블 인덱스
CREATE INDEX IF NOT EXISTS ai_analyses_user_id_idx ON public.ai_analyses(user_id);
CREATE INDEX IF NOT EXISTS ai_analyses_created_at_idx ON public.ai_analyses(created_at DESC);

-- ai_analyses 테이블 RLS 설정
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 분석 결과만 조회 가능
CREATE POLICY "Users can view own analyses"
  ON public.ai_analyses FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자는 자신의 분석 결과만 삽입 가능
CREATE POLICY "Users can insert own analyses"
  ON public.ai_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. project_cards 테이블 (프로젝트 카드)
CREATE TABLE IF NOT EXISTS public.project_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  record_ids UUID[] NOT NULL,
  title TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  tasks TEXT[] NOT NULL,
  results TEXT[],
  thinking_summary TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- project_cards 테이블 인덱스
CREATE INDEX IF NOT EXISTS project_cards_user_id_idx ON public.project_cards(user_id);
CREATE INDEX IF NOT EXISTS project_cards_created_at_idx ON public.project_cards(created_at DESC);

-- project_cards 테이블 RLS 설정
ALTER TABLE public.project_cards ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 카드만 조회 가능
CREATE POLICY "Users can view own cards"
  ON public.project_cards FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자는 자신의 카드만 삽입 가능
CREATE POLICY "Users can insert own cards"
  ON public.project_cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 카드만 업데이트 가능
CREATE POLICY "Users can update own cards"
  ON public.project_cards FOR UPDATE
  USING (auth.uid() = user_id);

-- 사용자는 자신의 카드만 삭제 가능
CREATE POLICY "Users can delete own cards"
  ON public.project_cards FOR DELETE
  USING (auth.uid() = user_id);

-- 5. 트리거: auth.users에 유저 생성 시 public.users에 자동 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성 (이미 존재하면 무시)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ 일마카세 아카이브 데이터베이스 스키마가 성공적으로 생성되었습니다!';
  RAISE NOTICE '📊 생성된 테이블: users, records, ai_analyses, project_cards';
  RAISE NOTICE '🔒 RLS (Row Level Security)가 모든 테이블에 적용되었습니다.';
END $$;

