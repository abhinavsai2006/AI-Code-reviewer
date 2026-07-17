const https = require('https');

// --- Helper to execute requests to OpenAI using pure Node.js HTTPS module ---
const callOpenAI = (apiKey, prompt) => {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a professional, senior software developer reviewing code. You must output reviews in strict JSON format. Never output markdown around the JSON. The JSON schema must be:\n{\n  \"score\": 85, // 0-100 quality score\n  \"complexity\": 12, // cyclomatic index\n  \"summary\": \"Short overview description\",\n  \"findings\": [\n    {\n      \"severity\": \"critical\" | \"warning\" | \"info\",\n      \"line\": 12,\n      \"issue\": \"Title of finding\",\n      \"explanation\": \"Deep review details\",\n      \"suggested_fix\": \"Clean alternative code\"\n    }\n  ]\n}"
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.2
        });

        const options = {
            hostname: 'api.openai.com',
            port: 443,
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Content-Length': data.length
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
                        // Strip any potential markdown wrappers if the model returned them
                        const jsonStr = content.replace(/^```json/, '').replace(/```$/, '').trim();
                        resolve(JSON.parse(jsonStr));
                    } else {
                        console.error("OpenAI Error Response:", body);
                        reject(new Error("Empty choices returned from OpenAI API"));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(data);
        req.end();
    });
};

// --- Local Rules-based Fallback Analyzer (Static + AI Mock) ---
const analyzeLocally = (code, language) => {
    const lines = code.split('\n');
    const findings = [];
    let score = 95;
    let complexity = 1; // Base complexity

    // Simple complexity heuristic: count branches/loops/conditionals
    const complexityRegexes = [
        /\bif\b/g, /\bfor\b/g, /\bwhile\b/g, /\bcatch\b/g,
        /\bcase\b/g, /&&/g, /\|\|/g, /\bmap\b/g, /\bforEach\b/g
    ];

    complexityRegexes.forEach(regex => {
        const matches = code.match(regex);
        if (matches) {
            complexity += matches.length;
        }
    });

    // Check lines for common vulnerabilities/antipatterns
    lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        const trimmed = line.trim();

        // 1. SQL Injection Risk (string interpolation or concatenation in SQL statements)
        if (/select\b|insert\b|update\b|delete\b/i.test(trimmed)) {
            // Check for TS/JS template literals
            if (/\$\{.*\}/.test(trimmed) && !trimmed.includes('?')) {
                findings.push({
                    severity: "critical",
                    line: lineNum,
                    issue: "SQL Injection risk via string interpolation",
                    explanation: "Constructing SQL queries using dynamic string variables allows malicious users to manipulate the query logic. Use parameterized statements or prepared queries.",
                    suggested_fix: "const query = 'SELECT * FROM users WHERE id = ?';\nconst result = await db.query(query, [userId]);"
                });
                score -= 15;
            }
            // Check for concatenation using +
            else if (/\+\s*[a-zA-Z0-9_]/.test(trimmed) || /[a-zA-Z0-9_]\s*\+/.test(trimmed)) {
                findings.push({
                    severity: "critical",
                    line: lineNum,
                    issue: "SQL Injection risk via string concatenation",
                    explanation: "Appending parameters directly to a query string bypasses parsing protection mechanisms.",
                    suggested_fix: "db.execute('SELECT * FROM accounts WHERE name = ?', [accountName]);"
                });
                score -= 15;
            }
        }

        // 2. Unused / Unassigned values
        if (trimmed.startsWith('let ') || trimmed.startsWith('const ')) {
            const matches = trimmed.match(/(?:let|const)\s+([a-zA-Z0-9_]+)\s*=/);
            if (matches && matches[1]) {
                const varName = matches[1];
                // Check if variable is used anywhere else in the code
                const count = (code.match(new RegExp('\\b' + varName + '\\b', 'g')) || []).length;
                if (count === 1) {
                    findings.push({
                        severity: "warning",
                        line: lineNum,
                        issue: `Unused variable '${varName}'`,
                        explanation: `Variable '${varName}' is declared but its value is never read. Leaving dead variables degrades readability and increases cognitive load.`,
                        suggested_fix: `// Remove declaration if unused, or delete prefix`
                    });
                    score -= 4;
                }
            }
        }

        // 3. Hardcoded secrets / Auth tokens
        if (/api_key|secret|password|token/i.test(trimmed) && /=\s*['"`][a-zA-Z0-9_-]{8,}['"`]/.test(trimmed)) {
            findings.push({
                severity: "critical",
                line: lineNum,
                issue: "Hardcoded sensitive credential",
                explanation: "Plaintext secrets or keys should not be hardcoded in codebases. If leaked to repositories, credentials could be compromised. Load keys from environment variables.",
                suggested_fix: "const API_KEY = process.env.API_KEY || '';"
            });
            score -= 10;
        }

        // 4. Console log in production
        if (trimmed.includes('console.log(')) {
            findings.push({
                severity: "info",
                line: lineNum,
                issue: "Console logging statements present",
                explanation: "Ensure diagnostic console logs are cleaned up or replaced by a structured logging framework before production deployments.",
                suggested_fix: "// Remove logger statement"
            });
            score -= 2;
        }

        // 5. Go unhandled error
        if (language === 'Go' && /^[a-zA-Z0-9_]+,\s*[a-zA-Z0-9_]+\s*:=\s*/.test(trimmed)) {
            // If it returned an error variable but doesn't check it
            const errVarMatches = trimmed.match(/,\s*([a-zA-Z0-9_]+)\s*:=/);
            if (errVarMatches && errVarMatches[1] === 'err') {
                const followingCode = lines.slice(idx).join('\n');
                if (!followingCode.includes('if err != nil')) {
                    findings.push({
                        severity: "warning",
                        line: lineNum,
                        issue: "Unhandled error variable",
                        explanation: "Function returns an error but the error variable is never checked or handled. Neglecting errors causes program crashes or silent failures.",
                        suggested_fix: "if err != nil {\n    return err\n}"
                    });
                    score -= 8;
                }
            }
        }
    });

    // Bounds check score
    score = Math.max(10, Math.min(100, score));

    // Summary description builder
    let summary = `Static analysis successfully completed. Found ${findings.length} warning(s).`;
    if (score >= 90) {
        summary += " Code demonstrates excellent structure and follows standard quality guidelines.";
    } else if (score >= 70) {
        summary += " Code structure is moderate. Review findings detail areas to parameterize database calls and remove unused variables.";
    } else {
        summary += " Critical code issues detected. Ensure security configurations and error boundaries are addressed.";
    }

    return {
        score,
        complexity,
        summary,
        findings
    };
};

// --- Main Analyzer Hook ---
const analyzeCode = async (code, language) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey.trim() !== '') {
        try {
            console.log(`Analyzing code with GPT-4o-mini (${language})...`);
            const prompt = `Review the following ${language} source code. Return strict JSON. Do not write markdown blocks around it.\n\nCode:\n${code}`;
            const result = await callOpenAI(apiKey, prompt);
            return result;
        } catch (e) {
            console.warn("OpenAI API analysis failed, falling back to local static ruleset:", e.message);
            return analyzeLocally(code, language);
        }
    } else {
        console.log(`No OPENAI_API_KEY found. Running local rules-based analyzer...`);
        return analyzeLocally(code, language);
    }
};

module.exports = {
    analyzeCode
};
