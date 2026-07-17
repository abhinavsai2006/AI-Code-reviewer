-- AI Code Review Assistant — Supabase / PostgreSQL Schema Migration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS projects (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_name VARCHAR(150) NOT NULL,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- 3. CODE SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS submissions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id     UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type    VARCHAR(20) NOT NULL CHECK (source_type IN ('paste', 'file_upload')),
  language       VARCHAR(30) NOT NULL,
  file_name      VARCHAR(255),
  storage_path   TEXT,
  raw_code       TEXT,
  code_hash      VARCHAR(64) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);

-- 4. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS reviews (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id  UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  project_id     UUID REFERENCES projects(id) ON DELETE CASCADE,
  review_type    VARCHAR(20) NOT NULL DEFAULT 'full' CHECK (review_type IN ('static_only','ai_only','full')),
  status         VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
  overall_score  SMALLINT CHECK (overall_score BETWEEN 0 AND 100),
  summary        TEXT,
  error_message  TEXT,
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reviews_submission_id ON reviews(submission_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);

-- 5. REVIEW FINDINGS TABLE
CREATE TABLE IF NOT EXISTS review_findings (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id      UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  source         VARCHAR(20) NOT NULL CHECK (source IN ('static_analysis','ai_review')),
  severity       VARCHAR(20) NOT NULL CHECK (severity IN ('critical','warning','info')),
  category       VARCHAR(40),
  issue          VARCHAR(255) NOT NULL,
  explanation    TEXT,
  suggested_fix  TEXT,
  file_name      VARCHAR(255),
  line_number    INT,
  column_number  INT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_findings_review_id ON review_findings(review_id);
CREATE INDEX IF NOT EXISTS idx_findings_severity ON review_findings(severity);

-- 6. COMPLEXITY METRICS TABLE
CREATE TABLE IF NOT EXISTS complexity_metrics (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id             UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  cyclomatic_complexity INT,
  function_complexity   JSONB,
  file_complexity       INT,
  num_functions         INT,
  num_classes           INT,
  lines_of_code         INT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_complexity_review_id ON complexity_metrics(review_id);
