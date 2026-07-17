const { Worker } = require('bullmq');
const { db, NVIDIA_API_KEY, NVIDIA_BASE_URL, NVIDIA_LLM_MODEL } = require('./config');
const { redisConnection, isRedisConnected } = require('./queue');
const https = require('https');
const EventEmitter = require('events');

// Global event emitter to notify server of job updates (useful for local SSE push notifications)
const workerEvents = new EventEmitter();

// --- Stage 1: Static Rules-based Analyzer ---
const runStaticAnalysis = (code, language) => {
    const lines = code.split('\n');
    const findings = [];
    let complexity = 1;
    
    // Heuristic: Cyclomatic complexity branches
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

        // SQL Injection Checks
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

        // Hardcoded Credentials Checks
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

        // Unused variables
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

        // Diagnostic Console Logging
        if (trimmed.includes('console.log(')) {
            findings.push({
                source: 'static_analysis',
                severity: 'info',
                category: 'style',
                issue: 'Production Console Logging',
                explanation: 'Clean up console diagnostic logs before pushing to staging environments, or replace them with structured application loggers.',
                suggested_fix: '// Remove console.log statement',
                line_number: lineNum,
                column_number: 1
            });
        }
    });

    // Counts
    const loc = lines.length;
    const numFunctions = (code.match(/\bfunction\b|\bafn\b|=>/g) || []).length;
    const numClasses = (code.match(/\bclass\b/g) || []).length;

    return {
        findings,
        metrics: {
            cyclomatic_complexity: complexity,
            file_complexity: Math.ceil(complexity / 2),
            num_functions: numFunctions,
            num_classes: numClasses,
            lines_of_code: loc
        }
    };
};

// --- Stage 2: AI Review — NVIDIA NIM API (OpenAI-compatible endpoint) ---
const callNvidiaAI = (apiKey, baseUrl, model, code, language, linterFindings) => {
    return new Promise((resolve, reject) => {
        const isAutoDetect = language === 'auto';

        const systemPrompt = isAutoDetect
            ? `You are an elite senior systems architect performing code reviews.
First, automatically detect the programming language of the submitted code.
We already ran a static linter which found: ${JSON.stringify(linterFindings)}. Do not repeat the exact same static findings.
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
We already ran a static linter which found: ${JSON.stringify(linterFindings)}. Do not repeat the exact same static findings.
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
            model: model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
            ],
            temperature: 0.2,
            max_tokens: 4096
        });

        // Parse the base URL to get hostname and path prefix
        const parsedBase = new URL(baseUrl);
        const options = {
            hostname: parsedBase.hostname,
            port: 443,
            path: `${parsedBase.pathname}/chat/completions`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    if (parsed.choices && parsed.choices[0]) {
                        const content = parsed.choices[0].message.content.trim();
                        // Strip markdown code fences if the model adds them
                        let jsonStr = content
                            .replace(/^```json\s*/i, '')
                            .replace(/^```\s*/i, '')
                            .replace(/```\s*$/i, '')
                            .trim();

                        // Try to parse; if truncated, attempt to repair the JSON
                        let result;
                        try {
                            result = JSON.parse(jsonStr);
                        } catch (parseErr) {
                            console.warn('NVIDIA response JSON truncated, attempting repair...');
                            // Find the last complete finding object and close the JSON
                            const lastCompleteIdx = jsonStr.lastIndexOf('},');
                            if (lastCompleteIdx !== -1) {
                                // Truncate to last complete finding and close arrays/object
                                jsonStr = jsonStr.slice(0, lastCompleteIdx + 1) + '\n  ]\n}';
                            } else {
                                // Fallback: close whatever we have
                                jsonStr = jsonStr.replace(/,\s*$/, '') + ']}'; 
                            }
                            result = JSON.parse(jsonStr);
                        }
                        resolve(result);
                    } else {
                        reject(new Error(parsed.error ? parsed.error.message : `Unexpected NVIDIA API response: ${body.slice(0, 200)}`));
                    }
                } catch (err) {
                    reject(new Error(`Failed to parse NVIDIA AI response: ${err.message}. Raw: ${body.slice(0, 300)}`));
                }
            });
        });

        req.on('error', (err) => reject(err));
        req.write(payload);
        req.end();
    });
};

// --- E2E Async Pipeline Job Handler ---
const processReviewJob = async (reviewId, jobData) => {
    console.log(`Pipeline: Fetching review record details for review_id: ${reviewId}`);
    
    // 1. Fetch submission details
    const submissionResult = await db.query(
        `SELECT s.* FROM submissions s 
         JOIN reviews r ON r.submission_id = s.id 
         WHERE r.id = $1`,
        [reviewId]
    );

    if (submissionResult.rows.length === 0) {
        throw new Error(`Submission record not found for review: ${reviewId}`);
    }
    const submission = submissionResult.rows[0];

    // 2. Set review state to running
    await db.query(
        `UPDATE reviews SET status = $1, started_at = $2 WHERE id = $3`,
        ['running', new Date().toISOString(), reviewId]
    );
    workerEvents.emit('status-update', { reviewId, status: 'running' });

    try {
        const code = submission.raw_code;
        const language = submission.language;

        // Stage 1: Static Linter Analysis
        console.log(`Pipeline Stage 1: Processing static rules engine on ${submission.file_name || 'snippet'}`);
        const staticResult = runStaticAnalysis(code, language);

        // Stage 2: AI Review — NVIDIA NIM
        let aiResult = null;
        if (!NVIDIA_API_KEY || NVIDIA_API_KEY.trim() === '') {
            throw new Error('NVIDIA_API_KEY is not configured. Please add your key to the .env file and restart the server.');
        }

        console.log(`Pipeline Stage 2: Contacting NVIDIA NIM API (model: ${NVIDIA_LLM_MODEL})...`);
        aiResult = await callNvidiaAI(NVIDIA_API_KEY, NVIDIA_BASE_URL, NVIDIA_LLM_MODEL, code, language, staticResult.findings);

        // If AI returned a detected language (auto-detect mode), update the submission record
        if (aiResult.language && language === 'auto') {
            console.log(`Auto-detected language: ${aiResult.language}`);
            await db.query(
                'UPDATE submissions SET language = $1 WHERE id = $2',
                [aiResult.language, submission.id]
            );
        }

        // Save findings to database
        const allFindings = [...staticResult.findings, ...aiResult.findings];
        for (const finding of allFindings) {
            await db.query(
                `INSERT INTO review_findings (
                    review_id, source, severity, category, issue, explanation, suggested_fix, file_name, line_number, column_number
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                    reviewId,
                    finding.source || 'ai_review',
                    finding.severity,
                    finding.category || 'bug',
                    finding.issue,
                    finding.explanation,
                    finding.suggested_fix || '',
                    submission.file_name || 'code_snippet',
                    finding.line_number,
                    finding.column_number || 1
                ]
            );
        }

        // Save Complexity Metrics
        await db.query(
            `INSERT INTO complexity_metrics (
                review_id, cyclomatic_complexity, function_complexity, file_complexity, num_functions, num_classes, lines_of_code
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                reviewId,
                staticResult.metrics.cyclomatic_complexity,
                JSON.stringify({}),
                staticResult.metrics.file_complexity,
                staticResult.metrics.num_functions,
                staticResult.metrics.num_classes,
                staticResult.metrics.lines_of_code
            ]
        );

        // Calculate score
        let score = aiResult.score || 90;
        // Adjust score based on findings count
        let critCount = allFindings.filter(f => f.severity === 'critical').length;
        let warnCount = allFindings.filter(f => f.severity === 'warning').length;
        let infoCount = allFindings.filter(f => f.severity === 'info').length;

        score = Math.max(10, Math.min(100, 100 - (critCount * 15) - (warnCount * 4) - (infoCount * 1)));

        // Update reviews to completed
        await db.query(
            `UPDATE reviews SET status = $1, overall_score = $2, summary = $3, completed_at = $4 WHERE id = $5`,
            ['completed', score, aiResult.summary || 'Review complete. Code checked.', new Date().toISOString(), reviewId]
        );

        console.log(`Pipeline complete for review_id: ${reviewId}. Final Score: ${score}%`);
        workerEvents.emit('status-update', { reviewId, status: 'completed', score });

    } catch (err) {
        console.error(`Pipeline failure on review_id ${reviewId}:`, err);
        await db.query(
            `UPDATE reviews SET status = $1, error_message = $2, completed_at = $3 WHERE id = $4`,
            ['failed', err.message, new Date().toISOString(), reviewId]
        );
        workerEvents.emit('status-update', { reviewId, status: 'failed', error: err.message });
    }
};

// Start BullMQ Worker connection (if Redis is active)
let queueWorker = null;
if (isRedisConnected()) {
    try {
        queueWorker = new Worker('review-queue', async (job) => {
            await processReviewJob(job.data.reviewId, job.data);
        }, { connection: redisConnection });
        
        console.log('BullMQ background queue worker initialized successfully.');
    } catch (err) {
        console.error('Failed to initialize BullMQ Worker connection:', err);
    }
}

module.exports = {
    processReviewJob,
    workerEvents,
    queueWorker
};
