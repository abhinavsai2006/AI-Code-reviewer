import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import https from 'https';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretnexuskey123';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '';
const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NVIDIA_LLM_MODEL = process.env.NVIDIA_LLM_MODEL || 'meta/llama-3.1-8b-instruct';

// Simple in-memory fallback database for the Vercel serverless session
const globalRef = global as any;
if (!globalRef.memoryDb) {
  globalRef.memoryDb = {
    users: [
      {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Nexus Developer',
        email: 'dev@nexus.ai',
        password_hash: '$2a$10$75HFtiz1K0ppmqnZiUij9O63UwPOt5xbA5BchRvV9w9y8RDlMshsG', // password is 'password'
        created_at: new Date().toISOString()
      }
    ],
    projects: [
      {
        id: '11111111-1111-1111-1111-111111111111',
        user_id: '00000000-0000-0000-0000-000000000000',
        project_name: 'Nexus Sandbox',
        description: 'Default project sandbox for quick snippet analysis.',
        created_at: new Date().toISOString()
      }
    ],
    submissions: [],
    reviews: [],
    findings: [],
    metrics: []
  };
}
const memoryDb = globalRef.memoryDb;

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
          id: crypto.randomUUID(),
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
          id: crypto.randomUUID(),
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
        id: crypto.randomUUID(),
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
            id: crypto.randomUUID(),
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
        id: crypto.randomUUID(),
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
            // Repair markdown code block wrapping if LLM ignores instruction
            if (contentStr.startsWith('```json')) {
              contentStr = contentStr.substring(7);
            }
            if (contentStr.endsWith('```')) {
              contentStr = contentStr.substring(0, contentStr.length - 3);
            }
            contentStr = contentStr.trim();
            
            // Basic JSON repair helper
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

    // Map static findings
    const staticFindings = staticRes.findings.map(f => ({
      ...f,
      review_id: reviewId,
      file_name: submission.file_name,
      created_at: new Date().toISOString()
    }));

    // Update database
    const review = memoryDb.reviews.find((r: any) => r.id === reviewId);
    if (review) {
      review.status = 'completed';
      review.overall_score = overallScore;
      review.summary = NVIDIA_API_KEY 
        ? 'Code review complete. Review suggestions highlight optimizations and security recommendations.'
        : 'Static analysis run completed. Please set your NVIDIA_API_KEY for full AI code quality reviews.';
      review.completed_at = new Date().toISOString();
    }

    // Save findings and metrics
    memoryDb.findings.push(...staticFindings, ...aiFindings);
    memoryDb.metrics.push({
      id: crypto.randomUUID(),
      review_id: reviewId,
      ...staticRes.metrics,
      created_at: new Date().toISOString()
    });

    updateStatus('completed');
  } catch (err: any) {
    console.error('Task execution failure:', err);
    const review = memoryDb.reviews.find((r: any) => r.id === reviewId);
    if (review) {
      review.status = 'failed';
      review.error_message = err.message || 'Worker pipeline error';
    }
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
    const checkUser = memoryDb.users.find((u: any) => u.email === email);
    if (checkUser) {
      return NextResponse.json({ error: 'Email already registered.' }, { status: 400 });
    }
    const passHash = bcrypt.hashSync(password, 10);
    const newUser = {
      id: crypto.randomUUID(),
      name,
      email,
      password_hash: passHash,
      created_at: new Date().toISOString()
    };
    memoryDb.users.push(newUser);
    const token = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: '7d' });
    return NextResponse.json({ token, user: { id: newUser.id, name, email } }, { status: 201 });
  }

  // 2. LOGIN
  if (path === 'auth/login') {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required.' }, { status: 400 });
    }
    const user = memoryDb.users.find((u: any) => u.email === email);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
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

    const submissionId = crypto.randomUUID();
    const reviewId = crypto.randomUUID();
    const submission = {
      id: submissionId,
      user_id: userId,
      language,
      raw_code,
      file_name: fileName || 'code_file.txt',
      created_at: new Date().toISOString()
    };

    memoryDb.submissions.push(submission);
    memoryDb.reviews.push({
      id: reviewId,
      submission_id: submissionId,
      status: 'pending',
      overall_score: null,
      summary: null,
      created_at: new Date().toISOString()
    });

    // Run review worker synchronously in the background context
    triggerReviewAnalysis(reviewId, submission);

    return NextResponse.json({ submission_id: submissionId, review_id: reviewId, status: 'pending' }, { status: 201 });
  }

  return NextResponse.json({ error: 'Route not found' }, { status: 404 });
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');

  // 1. GET ME
  if (path === 'auth/me') {
    const userId = getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    const user = memoryDb.users.find((u: any) => u.id === userId);
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
    const reviewsList = memoryDb.reviews.map((r: any) => {
      const s = memoryDb.submissions.find((sub: any) => sub.id === r.submission_id) || {};
      const findings = memoryDb.findings.filter((f: any) => f.review_id === r.id);
      return {
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
    return NextResponse.json(reviewsList);
  }

  // 4. GET REVIEW DETAILS
  if (path.startsWith('reviews/')) {
    const reviewId = path.split('/')[1];
    const review = memoryDb.reviews.find((r: any) => r.id === reviewId);
    if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

    const submission = memoryDb.submissions.find((s: any) => s.id === review.submission_id) || {};
    const findings = memoryDb.findings.filter((f: any) => f.review_id === reviewId);
    const metrics = memoryDb.metrics.find((m: any) => m.review_id === reviewId) || { loc: 0, complexity: 1 };

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
      metrics
    });
  }

  return NextResponse.json({ error: 'Route not found' }, { status: 404 });
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  if (path.startsWith('reviews/')) {
    const reviewId = path.split('/')[1];
    memoryDb.reviews = memoryDb.reviews.filter((r: any) => r.id !== reviewId);
    memoryDb.findings = memoryDb.findings.filter((f: any) => f.review_id !== reviewId);
    memoryDb.metrics = memoryDb.metrics.filter((m: any) => m.review_id !== reviewId);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Route not found' }, { status: 404 });
}
