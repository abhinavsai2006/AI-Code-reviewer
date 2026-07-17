# AI Code Review Assistant — Production Build Prompt

**Use this as a single master prompt in Antigravity.** It covers system architecture, database, API contracts, backend pipeline, frontend routing, and UI/UX. Paste it in as-is, or split into phases (Phase 1: DB+Auth, Phase 2: Submission+Analysis, Phase 3: Dashboard+History) if you want incremental builds.

**Explicitly out of scope:** GitHub repository import/OAuth, PR review integration. Code enters the system only via paste or file upload.

---

## 1. System Overview

A full-stack web app where an authenticated user pastes code or uploads a source file, the backend runs it through a two-stage pipeline (static analysis → AI review), and results are persisted and shown in a dashboard.

```
┌─────────────┐      ┌──────────────┐      ┌────────────────────┐
│   Frontend   │─────▶│   API (REST)  │─────▶│   Review Pipeline   │
│  Next.js     │◀─────│  Node/Express │◀─────│  (async job worker) │
└─────────────┘      └──────┬───────┘      └─────────┬──────────┘
                             │                          │
                      ┌──────▼──────┐          ┌────────▼────────┐
                      │  PostgreSQL  │          │ Static Analyzer  │
                      │  (Supabase)  │          │ (ESLint/Pylint)  │
                      └─────────────┘          └────────┬────────┘
                                                          │
                                                 ┌────────▼────────┐
                                                 │   LLM API (AI    │
                                                 │   review layer)  │
                                                 └─────────────────┘
```

**Key architectural decision:** the review pipeline is **asynchronous**. Static analysis + an LLM call on a real file can take 5–30 seconds — long enough that a synchronous HTTP request will feel broken or time out. The submission endpoint returns immediately with a `review_id` and status `pending`; the frontend polls (or subscribes via websocket/SSE) for status updates.

---

## 2. Tech Stack (finalized)

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14+ (App Router) | File-based routing, server components, easy Vercel deploy |
| Styling | Tailwind CSS + shadcn/ui | Fast, consistent, accessible primitives |
| Animation | Framer Motion | Scroll-triggered reveals, panel transitions |
| Code editor/display | Monaco Editor | Real syntax highlighting + inline gutter annotations |
| Backend | Node.js + Express (or Fastify) | Matches doc's suggested stack, good async support |
| Database | PostgreSQL via Supabase | Managed Postgres, built-in auth option, storage bucket for files |
| Auth | Supabase Auth (JWT-based) | Handles signup/login/forgot-password out of the box |
| Job queue | BullMQ + Redis | Decouples submission from processing; retries on failure |
| Static analysis | ESLint (JS/TS), Pylint (Python) via child_process/Docker sandbox | Language-specific, matches doc |
| AI integration | Anthropic API (Claude) or OpenAI API | Stage 2 review, structured JSON output |
| File storage | Supabase Storage | Uploaded source files |
| Deployment | Vercel (frontend) + Render/Railway (backend + worker + Redis) | Matches doc |

---

## 3. Database Schema (production-grade)

```sql
-- USERS (if not fully delegated to Supabase Auth, mirror table for app-level data)
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,          -- bcrypt/argon2; omit if using Supabase Auth entirely
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PROJECTS (a logical grouping a user creates; NOT tied to GitHub)
CREATE TABLE projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_name VARCHAR(150) NOT NULL,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_user_id ON projects(user_id);

-- CODE SUBMISSIONS (the raw input — pasted snippet OR uploaded file)
CREATE TABLE submissions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type    VARCHAR(20) NOT NULL CHECK (source_type IN ('paste', 'file_upload')),
  language       VARCHAR(30) NOT NULL,           -- detected or user-selected
  file_name      VARCHAR(255),                    -- null if pasted
  storage_path   TEXT,                             -- Supabase Storage path if uploaded
  raw_code       TEXT,                             -- inline if pasted / small file
  code_hash      VARCHAR(64) NOT NULL,             -- sha256, for dedupe/caching
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_submissions_user_id ON submissions(user_id);

-- REVIEWS (one review run against a submission)
CREATE TABLE reviews (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id  UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  project_id     UUID REFERENCES projects(id) ON DELETE CASCADE,
  review_type    VARCHAR(20) NOT NULL DEFAULT 'full' CHECK (review_type IN ('static_only','ai_only','full')),
  status         VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
  overall_score  SMALLINT CHECK (overall_score BETWEEN 0 AND 100),
  summary        TEXT,
  error_message  TEXT,                             -- populated if status = 'failed'
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_submission_id ON reviews(submission_id);
CREATE INDEX idx_reviews_status ON reviews(status);

-- REVIEW FINDINGS (individual issues within a review)
CREATE TABLE review_findings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id      UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  source         VARCHAR(20) NOT NULL CHECK (source IN ('static_analysis','ai_review')),
  severity       VARCHAR(20) NOT NULL CHECK (severity IN ('critical','warning','info')),
  category       VARCHAR(40),                      -- e.g. 'bug', 'code_smell', 'performance', 'security', 'style', 'naming'
  issue          VARCHAR(255) NOT NULL,
  explanation    TEXT,
  suggested_fix  TEXT,
  file_name      VARCHAR(255),
  line_number    INT,
  column_number  INT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_findings_review_id ON review_findings(review_id);
CREATE INDEX idx_findings_severity ON review_findings(severity);

-- COMPLEXITY METRICS (one row per review)
CREATE TABLE complexity_metrics (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id             UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  cyclomatic_complexity INT,
  function_complexity   JSONB,     -- { "functionName": complexityScore, ... }
  file_complexity       INT,
  num_functions         INT,
  num_classes           INT,
  lines_of_code         INT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_complexity_review_id ON complexity_metrics(review_id);
```

**Design notes:**
- `submissions` is separated from `reviews` so the same code can be re-reviewed (e.g., "re-run with updated AI model") without duplicating the source.
- `review_findings.source` distinguishes static-analysis findings from AI findings so the dashboard can filter/label them separately, matching the doc's two-stage model.
- `code_hash` enables caching — if identical code was already reviewed, you can short-circuit and reuse results (saves LLM cost).
- Status enum on `reviews` drives the async polling UX described below.

---

## 4. API Design (REST)

Base path: `/api/v1`

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/auth/signup` | Create account |
| POST | `/auth/login` | Returns JWT |
| POST | `/auth/logout` | Invalidate session |
| POST | `/auth/forgot-password` | Sends reset email |
| POST | `/auth/reset-password` | Consumes reset token |
| GET | `/auth/me` | Current user profile |
| PATCH | `/auth/me` | Update profile |

### Projects
| Method | Route | Description |
|---|---|---|
| GET | `/projects` | List user's projects |
| POST | `/projects` | Create project |
| GET | `/projects/:id` | Project detail + its submissions |
| PATCH | `/projects/:id` | Rename/edit |
| DELETE | `/projects/:id` | Delete (cascades submissions/reviews) |

### Submissions & Reviews
| Method | Route | Description |
|---|---|---|
| POST | `/submissions` | Submit pasted code — `{ project_id?, language, raw_code }`. Returns `submission_id` + triggers review |
| POST | `/submissions/upload` | Multipart file upload — returns `submission_id` + triggers review |
| GET | `/reviews/:id` | Poll review status + full results once `completed` |
| GET | `/reviews/:id/findings?severity=&category=` | Filtered findings list |
| GET | `/reviews` | List reviews (paginated) — `?search=&severity=&language=&from=&to=` |
| DELETE | `/reviews/:id` | Delete a review |
| POST | `/reviews/:id/rerun` | Re-trigger pipeline on existing submission |

**Submission → review flow (async contract):**
```
POST /submissions  →  201 { submission_id, review_id, status: "pending" }
GET  /reviews/:id  →  200 { status: "running" }        (client polls every ~2s)
GET  /reviews/:id  →  200 { status: "completed", overall_score, summary, findings: [...], metrics: {...} }
```
Recommend Server-Sent Events (`GET /reviews/:id/stream`) instead of polling for a snappier UI, with polling as fallback.

### Response shape example — completed review
```json
{
  "id": "uuid",
  "status": "completed",
  "overall_score": 78,
  "summary": "Solid structure with a few security and complexity concerns.",
  "findings": [
    {
      "id": "uuid",
      "source": "static_analysis",
      "severity": "critical",
      "category": "security",
      "issue": "Potential SQL injection",
      "explanation": "User input concatenated directly into query string.",
      "suggested_fix": "Use parameterized queries.",
      "file_name": "db.js",
      "line_number": 42
    }
  ],
  "metrics": {
    "cyclomatic_complexity": 14,
    "num_functions": 6,
    "num_classes": 1,
    "lines_of_code": 210
  }
}
```

---

## 5. Backend Pipeline (Stage 1 → Stage 2)

```
1. Client hits POST /submissions or /submissions/upload
2. API layer: validate input, detect language (extension or heuristic), 
   store raw_code or file in Supabase Storage, insert `submissions` row
3. Insert `reviews` row with status='pending', enqueue job (BullMQ) with review_id
4. Return 201 immediately with { submission_id, review_id, status: 'pending' }

--- Worker process (separate from API server) ---
5. Worker picks up job, sets review.status = 'running', started_at = now()
6. Stage 1 — Static Analysis:
   - Route to language-specific linter (ESLint for JS/TS, Pylint for Python) 
     run in a sandboxed child process or ephemeral Docker container 
     (never eval/exec user code directly on the host)
   - Parse linter output into review_findings rows (source='static_analysis')
   - Compute complexity_metrics (cyclomatic complexity via a library like 
     `escomplex` for JS or `radon` for Python)
7. Stage 2 — AI Review:
   - Construct a structured prompt including the code + Stage 1 findings 
     (so the LLM doesn't repeat what the linter already caught)
   - Request STRICT JSON output (bug reports, code smells, optimization 
     suggestions, naming, security notes) — validate against a schema 
     before inserting
   - Insert as review_findings rows (source='ai_review')
8. Compute overall_score (weighted formula: e.g., start at 100, subtract 
   per critical/warning finding, factor in complexity)
9. Update review: status='completed', completed_at=now(), overall_score, summary
10. Emit SSE event / the client's next poll picks up the completed state
```

**Security must-haves for the pipeline:**
- Never execute user-submitted code — only run static analyzers (which parse, not execute) in an isolated, resource-limited sandbox.
- Sanitize/size-limit uploads (max file size, allowed extensions).
- Rate-limit submission endpoint per user to control LLM cost and abuse.

---

## 6. Frontend Routing (Next.js App Router)

```
/                          → Marketing landing page (public)
/login                     → Login
/signup                    → Sign up
/forgot-password           → Forgot password
/reset-password            → Reset password (token-based)

/dashboard                 → Authenticated home: recent reviews, quick "New Review" CTA
/dashboard/submit          → Paste code / upload file screen
/dashboard/reviews         → Review history — searchable, filterable table
/dashboard/reviews/[id]    → Single review detail (code + findings split view)
/dashboard/projects        → Projects list
/dashboard/projects/[id]   → Project detail — its submissions/reviews
/dashboard/settings        → Profile management, password change, account
```

- Route groups: `(marketing)` for `/`, `(auth)` for login/signup/forgot/reset, `(app)` for everything under `/dashboard` — lets you apply a different layout (auth guard, sidebar nav) to `(app)` only.
- Middleware: protect `(app)` routes — redirect unauthenticated users to `/login`.

---

## 7. UI/UX per Screen

**Landing (`/`)** — as previously scoped: dark hero with a live-look editor animating an in-progress review, scroll-triggered feature sections (Static Analysis → AI Review → Complexity → Dashboard), CTA to sign up.

**Submit (`/dashboard/submit`)**
- Two-tab entry: "Paste Code" (large Monaco textarea, language auto-detect dropdown) and "Upload File" (drag-and-drop zone, accepted extensions shown).
- On submit: button transitions to a loading state showing live pipeline progress — "Running static analysis…" → "AI reviewing…" → redirect to `/dashboard/reviews/[id]` on completion.

**Review Detail (`/dashboard/reviews/[id]`)**
- Split view: Monaco code viewer (left, read-only) with inline gutter markers colored by severity; findings panel (right) as expandable cards grouped by severity, each showing issue, explanation, suggested fix, and a "source" tag (Static / AI).
- Top bar: overall score ring (0–100, red→amber→green), summary text, complexity metric chips (cyclomatic complexity, LOC, # functions/classes).
- Clicking a finding scrolls/highlights the corresponding code line.

**Review History (`/dashboard/reviews`)**
- Table: date, project, language, score badge, critical/warning count, actions (view/delete).
- Search bar + filters (severity, language, date range).

**Projects (`/dashboard/projects`, `/dashboard/projects/[id]`)**
- Grid of project cards (name, submission count, last review score) → detail page lists that project's submissions/reviews.

**Settings (`/dashboard/settings`)**
- Profile form (name, avatar, email), change password, danger zone (delete account).

---

## 8. Build Instructions for Antigravity

```
Build the AI Code Review Assistant as a production full-stack app using the 
architecture, database schema, API contracts, backend pipeline, and frontend 
routing specified in this document exactly as defined.

Explicitly exclude: GitHub repository import, GitHub OAuth, and PR review 
integration. Code enters the system only via paste (Monaco textarea) or 
file upload (drag-and-drop).

Stack: Next.js 14 App Router + Tailwind + shadcn/ui + Framer Motion (frontend), 
Node.js + Express + BullMQ + Redis (backend/worker), PostgreSQL via Supabase 
(database + auth + storage), Monaco Editor for code display, ESLint/Pylint 
for static analysis (sandboxed execution), Anthropic or OpenAI API for the 
AI review stage with structured JSON output.

Implement in this order:
1. Database schema (all 6 tables, indexes, constraints) via Supabase migration
2. Auth flow (signup/login/logout/forgot-password/profile) using Supabase Auth
3. Submission endpoints (paste + file upload) that create submissions + 
   reviews rows and enqueue a BullMQ job
4. Worker process implementing the two-stage pipeline (static analysis → 
   AI review) exactly as described in Section 5, with sandboxed execution 
   and structured JSON validation for the AI stage
5. Review status polling/SSE endpoint
6. Frontend routes and layouts per Section 6, with middleware-based auth 
   guarding on the (app) route group
7. UI for each screen per Section 7, dark-mode-first design with the 
   severity color system (red=critical, amber=warning, blue=info) and 
   Monaco-based code+annotation view
8. Rate limiting on submission endpoints and file size/type validation on upload

Deliver clean, typed (TypeScript throughout), documented code with a README 
covering setup, environment variables, and deployment steps for Vercel 
(frontend) + Render/Railway (backend, worker, Redis).
```

---

## 9. Deployment Topology

```
Vercel          → Next.js frontend
Render/Railway  → Express API server
Render/Railway  → BullMQ worker process (separate service, same codebase)
Render/Railway  → Redis instance (job queue)
Supabase        → Postgres DB + Auth + Storage bucket for uploaded files
```
