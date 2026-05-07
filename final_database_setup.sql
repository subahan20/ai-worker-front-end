-- ==========================================
-- FINAL DATABASE SETUP FOR CEO DASHBOARD
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 0. Core Plans Table
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department TEXT NOT NULL,
  profile_link TEXT,
  business_type TEXT,
  target_audience TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1. Operations Insights
CREATE TABLE IF NOT EXISTS ops_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  inefficiencies TEXT[],
  improvements TEXT[],
  execution_steps TEXT[],
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Sales Insights & Leads
CREATE TABLE IF NOT EXISTS sales_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  overview TEXT,
  target_customers TEXT,
  strategy TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  name TEXT,
  platform TEXT,
  profile_link TEXT,
  reason TEXT,
  status TEXT DEFAULT 'New',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Finance Insights
CREATE TABLE IF NOT EXISTS finance_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  summary TEXT,
  score INTEGER,
  highlights TEXT[],
  recommendations TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Developer / Engineering Insights
CREATE TABLE IF NOT EXISTS dev_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  architecture_overview TEXT,
  tech_stack TEXT[],
  scalability_plan TEXT,
  vulnerabilities TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Marketing Insights
CREATE TABLE IF NOT EXISTS marketing_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE, 
  overview TEXT,
  strategy JSONB,
  new_content_ideas TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id UUID REFERENCES marketing_insights(id) ON DELETE CASCADE,
  link TEXT,
  platform TEXT,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Candidate Analysis
CREATE TABLE IF NOT EXISTS candidate_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID,
  decision TEXT,
  reason TEXT,
  improvement TEXT,
  next_step TEXT,
  match_score INTEGER DEFAULT 0,
  matched_skills TEXT[] DEFAULT '{}',
  missing_skills TEXT[] DEFAULT '{}',
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Guard: add columns if table existed before this migration
ALTER TABLE candidate_analysis ADD COLUMN IF NOT EXISTS match_score INTEGER DEFAULT 0;
ALTER TABLE candidate_analysis ADD COLUMN IF NOT EXISTS matched_skills TEXT[] DEFAULT '{}';
ALTER TABLE candidate_analysis ADD COLUMN IF NOT EXISTS missing_skills TEXT[] DEFAULT '{}';
ALTER TABLE candidate_analysis ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}';
ALTER TABLE candidate_analysis ADD COLUMN IF NOT EXISTS improvement TEXT;

-- 7. HR CEO Reports
CREATE TABLE IF NOT EXISTS hr_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department TEXT DEFAULT 'HR',
  subject TEXT,
  email_body TEXT,
  shortlisted_candidates JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Guard: add columns if table existed before this migration
ALTER TABLE hr_reports ADD COLUMN IF NOT EXISTS shortlisted_candidates JSONB;
ALTER TABLE hr_reports ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'HR';

-- ==========================================
-- FORCE UNRESTRICTED ACCESS (RLS BYPASS)
-- ==========================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN 
        ('plans', 'ops_insights', 'sales_insights', 'sales_leads', 'finance_insights', 'dev_insights', 'marketing_insights', 'marketing_posts', 'candidate_analysis', 'hr_reports'))
    LOOP
        -- Disable RLS
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', r.tablename);
        
        -- Drop existing policies
        EXECUTE format('DROP POLICY IF EXISTS "Allow all" ON %I', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "Public access" ON %I', r.tablename);
        
        -- Create a wide-open policy as fallback
        EXECUTE format('CREATE POLICY "Allow all" ON %I FOR ALL USING (true) WITH CHECK (true)', r.tablename);
    END LOOP;
END $$;

-- ==========================================
-- ENABLE REALTIME (SAFE IDEMPOTENT BLOCK)
-- ==========================================
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Ensure publication exists
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN 
        ('plans', 'ops_insights', 'sales_insights', 'sales_leads', 'finance_insights', 'dev_insights', 'marketing_insights', 'marketing_posts', 'candidate_analysis', 'hr_reports'))
    LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = r.tablename) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', r.tablename);
        END IF;
    END LOOP;
END $$;
