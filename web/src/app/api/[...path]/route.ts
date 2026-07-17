import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import https from 'https';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretnexuskey123';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '';
const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NVIDIA_LLM_MODEL = process.env.NVIDIA_LLM_MODEL || 'meta/llama-3.1-8b-instruct';
const DATABASE_URL = process.env.DATABASE_URL || '';

// Persistent local file fallback database
const DATA_DIR = path.join(process.cwd(), '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');
const FINDINGS_FILE = path.join(DATA_DIR, 'findings.json');
const METRICS_FILE = path.join(DATA_DIR, 'metrics.json');

const getAppOrigin = (req: NextRequest) => {
  const forwardedHost = req.headers.get('x-forwarded-host');
  const forwardedProto = req.headers.get('x-forwarded-proto');
  if (forwardedHost && forwardedProto) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  if (req.nextUrl?.origin) {
    return req.nextUrl.origin;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return 'http://localhost:8000';
};

const getGoogleOAuthConfig = (req: NextRequest) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const redirectUri = process.env.GOOGLE_CALLBACK_URL || `${getAppOrigin(req)}/api/auth/google/callback`;

  return { clientId, clientSecret, redirectUri };
};

const ensureDirectoryExists = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

const readJsonFile = (filePath: string, defaultVal: any = []) => {
  ensureDirectoryExists();
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2));
    return defaultVal;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content || JSON.stringify(defaultVal));
  } catch {
    return defaultVal;
  }
};

const writeJsonFile = (filePath: string, data: any) => {
  ensureDirectoryExists();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error writing file:', filePath, e);
  }
};

// PostgreSQL client pool initialization
let pgPool: any = null;
if (DATABASE_URL) {
  try {
    const { Pool } = require('pg');
    pgPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    console.log('PostgreSQL database connected.');
  } catch (err) {
    console.error('Failed to initialize PostgreSQL pool:', err);
  }
}

// Global SQL database wrapper
const db = {
  query: async (text: string, params: any[] = []) => {
    if (pgPool) {
      return pgPool.query(text, params);
    }
    // Fallback Mock SQL Engine for Local JSON files
    return mockSqlEngine(text, params);
  }
};

// Mock SQL Engine mapping to local json files
const mockSqlEngine = async (text: string, params: any[] = []) => {
  const clean = text.replace(/\s+/g, ' ').trim().toLowerCase();

  if (clean.includes('select * from users where email =')) {
    const list = readJsonFile(USERS_FILE);
    const rows = list.filter((u: any) => u.email === params[0].toLowerCase());
    return { rows };
  }

  if (clean.includes('select id, name, email, avatar_url from users where id =') || clean.includes('select * from users where id =')) {
    const list = readJsonFile(USERS_FILE);
    const rows = list.filter((u: any) => u.id === params[0]);
    return { rows };
  }

  if (clean.includes('insert into users')) {
    const list = readJsonFile(USERS_FILE);
    const newUser = {
      id: crypto.randomUUID(),
      name: params[0],
      email: params[1].toLowerCase(),
      password_hash: params[2],
      created_at: new Date().toISOString()
    };
    list.push(newUser);
    writeJsonFile(USERS_FILE, list);
    return { rows: [newUser] };
  }

  if (clean.includes('select * from projects where user_id =')) {
    const list = readJsonFile(PROJECTS_FILE);
    let rows = list.filter((p: any) => p.user_id === params[0]);
    if (rows.length === 0) {
      const newProj = {
        id: crypto.randomUUID(),
        user_id: params[0],
        project_name: 'Nexus Sandbox',
        description: 'Default project sandbox for quick snippet analysis.',
        created_at: new Date().toISOString()
      };
      list.push(newProj);
      writeJsonFile(PROJECTS_FILE, list);
      rows = [newProj];
    }
    return { rows };
  }

  if (clean.includes('insert into projects')) {
    const list = readJsonFile(PROJECTS_FILE);
    const newProj = {
      id: crypto.randomUUID(),
      user_id: params[0],
      project_name: params[1],
      description: params[2] || '',
      created_at: new Date().toISOString()
    };
    list.push(newProj);
    writeJsonFile(PROJECTS_FILE, list);
    return { rows: [newProj] };
  }

  if (clean.includes('insert into submissions')) {
    const list = readJsonFile(SUBMISSIONS_FILE);
    const newSub = {
      id: crypto.randomUUID(),
      project_id: params[0],
      user_id: params[1],
      source_type: params[2],
      language: params[3],
      file_name: params[4],
      raw_code: params[5],
      code_hash: params[6],
      created_at: new Date().toISOString()
    };
    list.push(newSub);
    writeJsonFile(SUBMISSIONS_FILE, list);
    return { rows: [newSub] };
  }

  if (clean.includes('insert into reviews')) {
    const list = readJsonFile(REVIEWS_FILE);
    const newRev = {
      id: crypto.randomUUID(),
      submission_id: params[0],
      project_id: params[1],
      review_type: 'full',
      status: params[2] || 'pending',
      overall_score: null,
      summary: null,
      error_message: null,
      created_at: new Date().toISOString()
    };
    list.push(newRev);
    writeJsonFile(REVIEWS_FILE, list);
    return { rows: [newRev] };
  }

  if (clean.includes('update reviews set')) {
    const list = readJsonFile(REVIEWS_FILE);
    const reviewId = params[params.length - 1];
    const review = list.find((r: any) => r.id === reviewId);
    if (review) {
      if (clean.includes('status =')) {
        const idx = text.toLowerCase().indexOf('status =');
        const paramIdx = parseInt(text.slice(idx).match(/\$(\d+)/)![1]) - 1;
        review.status = params[paramIdx];
      }
      if (clean.includes('overall_score =')) {
        const idx = text.toLowerCase().indexOf('overall_score =');
        const paramIdx = parseInt(text.slice(idx).match(/\$(\d+)/)![1]) - 1;
        review.overall_score = params[paramIdx];
      }
      if (clean.includes('summary =')) {
        const idx = text.toLowerCase().indexOf('summary =');
        const paramIdx = parseInt(text.slice(idx).match(/\$(\d+)/)![1]) - 1;
        review.summary = params[paramIdx];
      }
      if (clean.includes('error_message =')) {
        const idx = text.toLowerCase().indexOf('error_message =');
        const paramIdx = parseInt(text.slice(idx).match(/\$(\d+)/)![1]) - 1;
        review.error_message = params[paramIdx];
      }
      review.completed_at = new Date().toISOString();
      writeJsonFile(REVIEWS_FILE, list);
      return { rows: [review] };
    }
  }

  if (clean.includes('select * from reviews where id =')) {
    const list = readJsonFile(REVIEWS_FILE);
    const rows = list.filter((r: any) => r.id === params[0]);
    return { rows };
  }

  if (clean.includes('select * from submissions where id =')) {
    const list = readJsonFile(SUBMISSIONS_FILE);
    const rows = list.filter((s: any) => s.id === params[0]);
    return { rows };
  }

  if (clean.includes('select * from review_findings where review_id =')) {
    const list = readJsonFile(FINDINGS_FILE);
    const rows = list.filter((f: any) => f.review_id === params[0]);
    return { rows };
  }

  if (clean.includes('select * from complexity_metrics where review_id =')) {
    const list = readJsonFile(METRICS_FILE);
    const rows = list.filter((m: any) => m.review_id === params[0]);
    return { rows };
  }

  if (clean.includes('select reviews.*') || clean.includes('select r.*')) {
    const list = readJsonFile(REVIEWS_FILE);
    const submissionsList = readJsonFile(SUBMISSIONS_FILE);
    const findingsList = readJsonFile(FINDINGS_FILE);

    const rows = list.map((r: any) => {
      const s = submissionsList.find((sub: any) => sub.id === r.submission_id) || {};
      const findings = findingsList.filter((f: any) => f.review_id === r.id);
      return {
        ...r,
        id: r.id,
        fileName: s.file_name || 'code_snippet',
        language: s.language || 'TypeScript',
        date: r.created_at.slice(0, 16).replace('T', ' '),
        score: r.overall_score || 0,
        critical: findings.filter((f: any) => f.severity === 'critical').length,
        warning: findings.filter((f: any) => f.severity === 'warning').length,
        info: findings.filter((f: any) => f.severity === 'info').length
      };
    });
    return { rows };
  }

  if (clean.includes('delete from reviews where id =')) {
    let list = readJsonFile(REVIEWS_FILE);
    list = list.filter((r: any) => r.id !== params[0]);
    writeJsonFile(REVIEWS_FILE, list);

    let findingsList = readJsonFile(FINDINGS_FILE);
    findingsList = findingsList.filter((f: any) => f.review_id !== params[0]);
    writeJsonFile(FINDINGS_FILE, findingsList);

    let metricsList = readJsonFile(METRICS_FILE);
    metricsList = metricsList.filter((m: any) => m.review_id !== params[0]);
    writeJsonFile(METRICS_FILE, metricsList);

    return { rowCount: 1 };
  }

  return { rows: [] };
};

// --- Static Rules-based Analyzer ---
const runStaticAnalysis = (code: string, language: string) => {
  const lines = code.split('\n');
  const findings: any[] = [];
  let complexity = 1;
  
  const branchKeywords = [
    /\bif\b/g, /\bfor\b/g, /\bwhile\b/g, /\bcatch\b/g,
    /\bcase\b/g, /&&/g, /\|\|/g, /\bmap\b/g, /\bforEach\b/g
  ];
  branchKeywords.forEach(regex => {
    const matches = code.match(regex);
    if (matches) complexity += matches.length;
  });

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();

    if (/select\b|insert\b|update\b|delete\b/i.test(trimmed)) {
      if (/\$\{.*\}/.test(trimmed) && !trimmed.includes('?')) {
        findings.push({
          source: 'static_analysis',
          severity: 'critical',
          category: 'security',
          issue: 'SQL Injection risk via string interpolation',
          explanation: 'Constructing SQL queries using dynamic string interpolation allows malicious inputs to alter the database command structure.',
          suggested_fix: "const query = 'SELECT * FROM users WHERE id = ?';\nconst result = await db.query(query, [userId]);",
          line_number: lineNum,
          column_number: 1
        });
      } else if (/\+\s*[a-zA-Z0-9_]/.test(trimmed) || /[a-zA-Z0-9_]\s*\+/.test(trimmed)) {
        findings.push({
          source: 'static_analysis',
          severity: 'critical',
          category: 'security',
          issue: 'SQL Injection risk via string concatenation',
          explanation: 'Appending dynamic parameter variables directly onto queries bypasses safe SQL driver escaping mechanisms.',
          suggested_fix: "db.execute('SELECT * FROM accounts WHERE name = ?', [accountName]);",
          line_number: lineNum,
          column_number: 1
        });
      }
    }

    if (/api_key|secret|password|token/i.test(trimmed) && /=\s*['"`][a-zA-Z0-9_-]{8,}['"`]/.test(trimmed)) {
      findings.push({
        source: 'static_analysis',
        severity: 'critical',
        category: 'security',
        issue: 'Hardcoded sensitive credential',
        explanation: 'A plaintext password or secret key appears to be hardcoded. This creates severe security issues if code is committed to public servers.',
        suggested_fix: 'const API_KEY = process.env.API_KEY || "";',
        line_number: lineNum,
        column_number: 1
      });
    }

    if (trimmed.startsWith('let ') || trimmed.startsWith('const ')) {
      const matches = trimmed.match(/(?:let|const)\s+([a-zA-Z0-9_]+)\s*=/);
      if (matches && matches[1]) {
        const varName = matches[1];
        const count = (code.match(new RegExp('\\b' + varName + '\\b', 'g')) || []).length;
        if (count === 1) {
          findings.push({
            source: 'static_analysis',
            severity: 'warning',
            category: 'code_smell',
            issue: `Unused variable '${varName}'`,
            explanation: `Variable '${varName}' is initialized but never subsequently referenced or read in scope.`,
            suggested_fix: `// Remove or utilize the '${varName}' variable`,
            line_number: lineNum,
            column_number: 1
          });
        }
      }
    }

    if (trimmed.includes('console.log(')) {
      findings.push({
        source: 'static_analysis',
        severity: 'info',
        category: 'style',
        issue: 'Production Console Logging',
        explanation: 'Clean up console diagnostic logs before pushing to staging environments, or replace them with structured loggers.',
        suggested_fix: '// Remove console.log statement',
        line_number: lineNum,
        column_number: 1
      });
    }
  });

  return {
    findings,
    metrics: {
      cyclomatic_complexity: complexity,
      file_complexity: Math.ceil(complexity / 2),
      num_functions: (code.match(/\bfunction\b|\bafn\b|=>/g) || []).length,
      num_classes: (code.match(/\bclass\b/g) || []).length,
      lines_of_code: lines.length
    }
  };
};

// --- NVIDIA NIM API Call ---
const callNvidiaAI = (code: string, language: string, staticFindings: any[]): Promise<any> => {
  return new Promise((resolve, reject) => {
    const isAutoDetect = language === 'auto';
    const systemPrompt = isAutoDetect
      ? `You are an elite senior systems architect performing code reviews.
First, automatically detect the programming language of the submitted code.
We already ran a static linter which found: ${JSON.stringify(staticFindings)}. Do not repeat the exact same static findings.
Review the code for deep structural design flaws, security risks, memory leaks, performance bugs, and optimization paths.
You MUST output your findings in strict JSON matching this structure:
{
  "language": "The detected programming language (e.g. Python, TypeScript, Java)",
  "summary": "Short overview description of the review",
  "score": 85,
  "findings": [
    {
      "severity": "critical" | "warning" | "info",
      "category": "bug" | "performance" | "security" | "style",
      "issue": "Title of finding",
      "explanation": "Detailed description of why this is a problem",
      "suggested_fix": "Drop-in code block or fix",
      "line_number": 12
    }
  ]
}
Do not surround the JSON response with markdown code block formatting or tick marks. Output raw JSON only.`
      : `You are an elite senior systems architect performing code reviews.
We already ran a static linter which found: ${JSON.stringify(staticFindings)}. Do not repeat the exact same static findings.
Review the ${language} code for deep structural design flaws, security risks, memory leaks, performance bugs, and optimization paths.
You MUST output your findings in strict JSON matching this structure:
{
  "summary": "Short overview description of the review",
  "score": 85,
  "findings": [
    {
      "severity": "critical" | "warning" | "info",
      "category": "bug" | "performance" | "security" | "style",
      "issue": "Title of finding",
      "explanation": "Detailed description of why this is a problem",
      "suggested_fix": "Drop-in code block or fix",
      "line_number": 12
    }
  ]
}
Do not surround the JSON response with markdown code block formatting or tick marks. Output raw JSON only.`;

    const userMessage = isAutoDetect
      ? `Please auto-detect the language and review the following code:\n\n${code}`
      : `Here is the ${language} code:\n\n${code}`;

    const payload = JSON.stringify({
      model: NVIDIA_LLM_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      max_tokens: 3000,
      temperature: 0.2
    });

    const parsedUrl = new URL(NVIDIA_BASE_URL + '/chat/completions');
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.choices && parsed.choices[0] && parsed.choices[0].message) {
            let contentStr = parsed.choices[0].message.content.trim();
            if (contentStr.startsWith('```json')) {
              contentStr = contentStr.substring(7);
            }
            if (contentStr.endsWith('```')) {
              contentStr = contentStr.substring(0, contentStr.length - 3);
            }
            contentStr = contentStr.trim();
            
            let fixedJson = contentStr;
            if (!fixedJson.endsWith('}') && fixedJson.includes('"findings"')) {
              fixedJson = fixedJson.trim();
              if (fixedJson.endsWith(']')) {
                fixedJson += '}';
              } else if (fixedJson.endsWith('}')) {
                fixedJson += ']}';
              } else {
                const lastFindingIndex = fixedJson.lastIndexOf('}');
                if (lastFindingIndex !== -1) {
                  fixedJson = fixedJson.substring(0, lastFindingIndex + 1) + ']}';
                }
              }
            }

            const aiResult = JSON.parse(fixedJson);
            resolve(aiResult);
          } else {
            reject(new Error(body || 'Empty response from NVIDIA API'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
};

// --- AUTH UTILITIES ---
const getUserIdFromRequest = (req: NextRequest) => {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    return decoded.id;
  } catch {
    return null;
  }
};

// SSE global streams map for status-updates
const sseStreams = new Map<string, any>();

// Helper to push review jobs synchronously and immediately trigger updates
const triggerReviewAnalysis = async (reviewId: string, submission: any) => {
  const updateStatus = (status: string, payload: any = {}) => {
    const stream = sseStreams.get(reviewId);
    if (stream) {
      stream.write(`data: ${JSON.stringify({ status, reviewId, ...payload })}\n\n`);
    }
  };

  try {
    updateStatus('running');
    
    // 1. Static linter
    const staticRes = runStaticAnalysis(submission.raw_code, submission.language);
    
    // 2. NVIDIA AI LLM
    let aiFindings: any[] = [];
    let overallScore = 80;
    let finalLanguage = submission.language;

    if (NVIDIA_API_KEY) {
      try {
        const aiRes = await callNvidiaAI(submission.raw_code, submission.language, staticRes.findings);
        if (aiRes.language) finalLanguage = aiRes.language;
        if (aiRes.score) overallScore = aiRes.score;
        if (aiRes.findings) {
          aiFindings = aiRes.findings.map((f: any) => ({
            id: crypto.randomUUID(),
            review_id: reviewId,
            source: 'ai_review',
            severity: f.severity || 'warning',
            category: f.category || 'bug',
            issue: f.issue || 'Design hotspot',
            explanation: f.explanation || '',
            suggested_fix: f.suggested_fix || '',
            file_name: submission.file_name,
            line_number: f.line_number || 1,
            column_number: 1,
            created_at: new Date().toISOString()
          }));
        }
      } catch (e) {
        console.error('NVIDIA AI evaluation error:', e);
      }
    }

    // Save findings and metrics
    if (pgPool) {
      // 1. Save static findings to Postgres
      for (const f of staticRes.findings) {
        await db.query(
          `INSERT INTO review_findings (review_id, source, severity, category, issue, explanation, suggested_fix, file_name, line_number, column_number) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [reviewId, 'static_analysis', f.severity, f.category, f.issue, f.explanation, f.suggested_fix, submission.file_name, f.line_number, 1]
        );
      }
      // 2. Save AI findings to Postgres
      for (const f of aiFindings) {
        await db.query(
          `INSERT INTO review_findings (review_id, source, severity, category, issue, explanation, suggested_fix, file_name, line_number, column_number) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [reviewId, 'ai_review', f.severity, f.category, f.issue, f.explanation, f.suggested_fix, submission.file_name, f.line_number, 1]
        );
      }
      // 3. Save complexity metrics to Postgres
      await db.query(
        `INSERT INTO complexity_metrics (review_id, cyclomatic_complexity, function_complexity, file_complexity, num_functions, num_classes, lines_of_code) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [reviewId, staticRes.metrics.cyclomatic_complexity, '{}', staticRes.metrics.file_complexity, staticRes.metrics.num_functions, staticRes.metrics.num_classes, staticRes.metrics.lines_of_code]
      );
      // 4. Update review status
      await db.query(
        `UPDATE reviews SET status = $1, overall_score = $2, summary = $3, completed_at = now() WHERE id = $4`,
        ['completed', overallScore, NVIDIA_API_KEY ? 'Code review complete. AI and static metrics gathered.' : 'Static analysis complete. (NVIDIA API KEY missing)', reviewId]
      );
    } else {
      // Local JSON File update
      const reviewsList = readJsonFile(REVIEWS_FILE);
      const rev = reviewsList.find((r: any) => r.id === reviewId);
      if (rev) {
        rev.status = 'completed';
        rev.overall_score = overallScore;
        rev.summary = 'Code review complete. Review suggestions highlight optimizations and security recommendations.';
        rev.completed_at = new Date().toISOString();
        writeJsonFile(REVIEWS_FILE, reviewsList);
      }

      const findingsList = readJsonFile(FINDINGS_FILE);
      const staticFindings = staticRes.findings.map(f => ({
        id: crypto.randomUUID(),
        review_id: reviewId,
        source: 'static_analysis',
        severity: f.severity,
        category: f.category,
        issue: f.issue,
        explanation: f.explanation,
        suggested_fix: f.suggested_fix,
        file_name: submission.file_name,
        line_number: f.line_number,
        column_number: 1,
        created_at: new Date().toISOString()
      }));
      findingsList.push(...staticFindings, ...aiFindings);
      writeJsonFile(FINDINGS_FILE, findingsList);

      const metricsList = readJsonFile(METRICS_FILE);
      metricsList.push({
        id: crypto.randomUUID(),
        review_id: reviewId,
        ...staticRes.metrics,
        created_at: new Date().toISOString()
      });
      writeJsonFile(METRICS_FILE, metricsList);
    }

    updateStatus('completed');
  } catch (err: any) {
    console.error('Task execution failure:', err);
    await db.query(
      `UPDATE reviews SET status = $1, error_message = $2, completed_at = now() WHERE id = $3`,
      ['failed', err.message || 'Worker pipeline error', reviewId]
    );
    updateStatus('failed', { error: err.message });
  }
};

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');

  // 1. SIGNUP
  if (path === 'auth/signup') {
    const { name, email, password } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password required.' }, { status: 400 });
    }

    const checkUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (checkUser.rows.length > 0) {
      return NextResponse.json({ error: 'Email already registered.' }, { status: 400 });
    }

    const passHash = bcrypt.hashSync(password, 10);
    const newUserResult = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
      [name, email, passHash]
    );
    const user = newUserResult.rows[0];

    // Seed a default project
    await db.query(
      'INSERT INTO projects (user_id, project_name, description) VALUES ($1, $2, $3)',
      [user.id, 'Nexus Sandbox', 'Default workspace project context.']
    );

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    return NextResponse.json({ token, user: { id: user.id, name, email } }, { status: 201 });
  }

  // 2. LOGIN
  if (path === 'auth/login') {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required.' }, { status: 400 });
    }

    const checkUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (checkUser.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    const user = checkUser.rows[0];
    if (user.password_hash && !bcrypt.compareSync(password, user.password_hash)) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    return NextResponse.json({ token, user: { id: user.id, name: user.name, email } }, { status: 200 });
  }

  // Auth Guard
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorised access.' }, { status: 401 });
  }

  // 3. SUBMISSIONS
  if (path === 'submissions') {
    const { language, raw_code, fileName } = await req.json();
    if (!language || !raw_code) {
      return NextResponse.json({ error: 'Language and raw_code are required.' }, { status: 400 });
    }

    // Fetch user's sandbox project
    const projectRes = await db.query('SELECT id FROM projects WHERE user_id = $1 LIMIT 1', [userId]);
    let projectId = projectRes.rows[0]?.id;
    if (!projectId) {
      const newProj = await db.query(
        'INSERT INTO projects (user_id, project_name, description) VALUES ($1, $2, $3) RETURNING id',
        [userId, 'Nexus Sandbox', 'Default workspace project context.']
      );
      projectId = newProj.rows[0].id;
    }

    const nameOfFile = fileName || 'code_file.txt';
    const codeHash = crypto.createHash('sha256').update(raw_code).digest('hex');

    // Create Submission record
    const subRes = await db.query(
      `INSERT INTO submissions (project_id, user_id, source_type, language, file_name, raw_code, code_hash) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [projectId, userId, 'paste', language, nameOfFile, raw_code, codeHash]
    );
    const submissionId = subRes.rows[0].id;

    // Create Review record (status = pending)
    const revRes = await db.query(
      `INSERT INTO reviews (submission_id, project_id, status) VALUES ($1, $2, $3) RETURNING id`,
      [submissionId, projectId, 'pending']
    );
    const reviewId = revRes.rows[0].id;

    // Run review worker synchronously in the background context
    const submission = { id: submissionId, user_id: userId, language, raw_code, file_name: nameOfFile };
    triggerReviewAnalysis(reviewId, submission);

    return NextResponse.json({ submission_id: submissionId, review_id: reviewId, status: 'pending' }, { status: 201 });
  }

  return NextResponse.json({ error: 'Route not found' }, { status: 404 });
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const path = params.path.join('/');

  // Google Login Redirection Route
  if (path === 'auth/google') {
    const { clientId, redirectUri } = getGoogleOAuthConfig(req);
    if (!clientId) {
      return NextResponse.json(
        { error: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID in the deployment environment.' },
        { status: 500 }
      );
    }

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20profile%20email&prompt=select_account`;
    return NextResponse.redirect(googleAuthUrl);
  }

  // Google Login Callback Route
  if (path === 'auth/google/callback') {
    const code = req.nextUrl.searchParams.get('code');
    if (!code) {
      return NextResponse.json({ error: 'Code parameter is missing.' }, { status: 400 });
    }

    try {
      const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig(req);

      if (!clientId || !clientSecret) {
        return NextResponse.json(
          { error: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the deployment environment.' },
          { status: 500 }
        );
      }

      // Exchange code for Google tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });

      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok) {
        return NextResponse.json({ error: tokenData.error_description || 'Token exchange failed.' }, { status: 400 });
      }

      // Decode the id_token
      const idToken = tokenData.id_token;
      const base64Url = idToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        Buffer.from(base64, 'base64')
          .toString()
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const googleUser = JSON.parse(jsonPayload);

      // Find or create user
      let checkUser = await db.query('SELECT * FROM users WHERE email = $1', [googleUser.email]);
      let user = checkUser.rows[0];
      if (!user) {
        const newUserResult = await db.query(
          'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
          [googleUser.name || 'Google User', googleUser.email, '']
        );
        user = newUserResult.rows[0];
        
        // Seed project
        await db.query(
          'INSERT INTO projects (user_id, project_name, description) VALUES ($1, $2, $3)',
          [user.id, 'Nexus Sandbox', 'Default workspace project context.']
        );
      }

      // Generate JWT Token
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

      // Return a helper script to save local credentials and redirect browser to workstation
      const redirectHtml = `
        <html>
          <body>
            <script>
              localStorage.setItem('token', '${token}');
              localStorage.setItem('user', JSON.stringify(${JSON.stringify({ id: user.id, name: user.name, email: user.email })}));
              window.dispatchEvent(new Event('auth-change'));
              window.location.href = '/dashboard/submit';
            </script>
          </body>
        </html>
      `;
      return new Response(redirectHtml, {
        headers: { 'Content-Type': 'text/html' }
      });

    } catch (err: any) {
      console.error('Google callback error:', err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // 1. GET ME
  if (path === 'auth/me') {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    const userRes = await db.query('SELECT id, name, email FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ id: user.id, name: user.name, email: user.email });
  }

  // 2. SSE STREAM ROUTER (Bypasses auth check since EventSource doesn't support custom headers)
  if (path.endsWith('/stream')) {
    const reviewId = path.split('/')[1];
    
    const responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();
    const encoder = new TextEncoder();

    const streamObject = {
      write: (data: string) => {
        writer.write(encoder.encode(data));
      }
    };
    sseStreams.set(reviewId, streamObject);

    // Initial connection stream write
    writer.write(encoder.encode(`data: ${JSON.stringify({ status: 'pending', reviewId })}\n\n`));

    // Auto close helper to avoid hanging connection leaks
    req.signal.addEventListener('abort', () => {
      sseStreams.delete(reviewId);
      writer.close();
    });

    return new Response(responseStream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  }

  // Auth Guard
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorised access.' }, { status: 401 });
  }

  // 3. GET LIST REVIEWS
  if (path === 'reviews') {
    const reviewsRes = await db.query(`
      SELECT r.*, s.file_name, s.language 
      FROM reviews r 
      JOIN submissions s ON r.submission_id = s.id 
      WHERE s.user_id = $1 
      ORDER BY r.created_at DESC
    `, [userId]);

    const reviewsList = [];
    for (const r of reviewsRes.rows) {
      const findingsRes = await db.query('SELECT severity FROM review_findings WHERE review_id = $1', [r.id]);
      const findings = findingsRes.rows;
      reviewsList.push({
        id: r.id,
        fileName: r.file_name || 'code_snippet',
        language: r.language || 'TypeScript',
        date: new Date(r.created_at).toISOString().slice(0, 16).replace('T', ' '),
        score: r.overall_score || 0,
        critical: findings.filter((f: any) => f.severity === 'critical').length,
        warning: findings.filter((f: any) => f.severity === 'warning').length,
        info: findings.filter((f: any) => f.severity === 'info').length
      });
    }

    return NextResponse.json(reviewsList);
  }

  // 4. GET REVIEW DETAILS
  if (path.startsWith('reviews/')) {
    const reviewId = path.split('/')[1];
    const reviewRes = await db.query('SELECT * FROM reviews WHERE id = $1', [reviewId]);
    const review = reviewRes.rows[0];
    if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

    const subRes = await db.query('SELECT * FROM submissions WHERE id = $1', [review.submission_id]);
    const submission = subRes.rows[0] || {};
    
    const findingsRes = await db.query('SELECT * FROM review_findings WHERE review_id = $1', [reviewId]);
    const findings = findingsRes.rows;

    const metricsRes = await db.query('SELECT * FROM complexity_metrics WHERE review_id = $1', [reviewId]);
    const metrics = metricsRes.rows[0] || { loc: 0, complexity: 1 };

    const parsedCodeLines = (submission.raw_code || '').split('\n').map((content: string, idx: number) => {
      const lineNum = idx + 1;
      const lineFinding = findings.find((f: any) => f.line_number === lineNum);
      return {
        num: lineNum,
        content,
        status: lineFinding ? lineFinding.severity : 'normal',
        annotation: lineFinding ? lineFinding.suggested_fix : null
      };
    });

    return NextResponse.json({
      review,
      findings,
      code: parsedCodeLines,
      metrics: {
        loc: metrics.lines_of_code || parsedCodeLines.length,
        complexity: metrics.cyclomatic_complexity || 1
      }
    });
  } catch (err: any) {
    console.error('API GET route error:', err);
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  if (path.startsWith('reviews/')) {
    const reviewId = path.split('/')[1];
    await db.query('DELETE FROM reviews WHERE id = $1', [reviewId]);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Route not found' }, { status: 404 });
}
