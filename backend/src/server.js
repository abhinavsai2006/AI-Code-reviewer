const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const { PORT, JWT_SECRET, db } = require('./config');
const { addReviewJob } = require('./queue');
const { workerEvents } = require('./worker');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});

// Root endpoint pointing to the Next.js frontend
app.get('/', (req, res) => {
    res.send('Backend API is running. Please access the application frontend at http://localhost:8000');
});
app.use(express.static(path.join(__dirname, '..', 'public')));

// Authorization Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Authentication token required.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
};

// --- AUTHENTICATION ---
app.post('/api/auth/signup', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    try {
        const checkUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (checkUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered.' });
        }

        const passHash = bcrypt.hashSync(password, 10);
        const newUserResult = await db.query(
            'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
            [name, email, passHash]
        );
        const user = newUserResult.rows[0];

        // Seed a default sandbox project for the user
        await db.query(
            'INSERT INTO projects (user_id, project_name, description) VALUES ($1, $2, $3)',
            [user.id, 'Nexus Sandbox', 'Sandbox project context.']
        );

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            token,
            user: { id: user.id, name: user.name, email: user.email }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        const checkUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (checkUser.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const user = checkUser.rows[0];
        const validPass = bcrypt.compareSync(password, user.password_hash);
        if (!validPass) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.status(200).json({
            token,
            user: { id: user.id, name: user.name, email: user.email }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const checkUser = await db.query('SELECT id, name, email, avatar_url FROM users WHERE id = $1', [req.user.id]);
        if (checkUser.rows.length === 0) {
            return res.status(404).json({ error: 'User profile not found.' });
        }
        res.status(200).json(checkUser.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SUBMISSIONS & REVIEWS ---
app.post('/api/submissions', authenticateToken, async (req, res) => {
    const { project_id, language, raw_code, fileName } = req.body;
    if (!language || !raw_code) {
        return res.status(400).json({ error: 'Language and code block are required.' });
    }

    try {
        // Resolve default project if none supplied
        let projectId = project_id;
        if (!projectId) {
            const projectRes = await db.query('SELECT id FROM projects WHERE user_id = $1 LIMIT 1', [req.user.id]);
            if (projectRes.rows.length > 0) {
                projectId = projectRes.rows[0].id;
            } else {
                const newProj = await db.query(
                    'INSERT INTO projects (user_id, project_name, description) VALUES ($1, $2, $3) RETURNING id',
                    [req.user.id, 'Nexus Sandbox', 'Sandbox project context.']
                );
                projectId = newProj.rows[0].id;
            }
        }

        const nameOfFile = fileName || `code_file.${language === 'TypeScript' ? 'ts' : language === 'Python' ? 'py' : language === 'Go' ? 'go' : 'rs'}`;
        const codeHash = crypto.createHash('sha256').update(raw_code).digest('hex');

        // Create Submission record
        const subRes = await db.query(
            `INSERT INTO submissions (project_id, user_id, source_type, language, file_name, raw_code, code_hash) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [projectId, req.user.id, 'paste', language, nameOfFile, raw_code, codeHash]
        );
        const submissionId = subRes.rows[0].id;

        // Create Review record (status = pending)
        const revRes = await db.query(
            `INSERT INTO reviews (submission_id, project_id, status) VALUES ($1, $2, $3) RETURNING id`,
            [submissionId, projectId, 'pending']
        );
        const reviewId = revRes.rows[0].id;

        // Enqueue background processing job
        await addReviewJob(reviewId, {
            submissionId,
            language,
            raw_code,
            fileName: nameOfFile
        });

        res.status(201).json({
            submission_id: submissionId,
            review_id: reviewId,
            status: 'pending'
        });

    } catch (err) {
        console.error('Error creating review submission:', err);
        res.status(500).json({ error: err.message });
    }
});

// SSE Status Stream Endpoint
app.get('/api/reviews/:id/stream', (req, res) => {
    const reviewId = req.params.id;

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    res.write(`data: ${JSON.stringify({ status: 'pending' })}\n\n`);

    const onUpdate = (event) => {
        if (event.reviewId === reviewId) {
            res.write(`data: ${JSON.stringify(event)}\n\n`);
            if (event.status === 'completed' || event.status === 'failed') {
                cleanup();
            }
        }
    };

    const cleanup = () => {
        workerEvents.off('status-update', onUpdate);
        res.end();
    };

    workerEvents.on('status-update', onUpdate);
    req.on('close', cleanup);
});

// Get Review Status & Findings
app.get('/api/reviews/:id', authenticateToken, async (req, res) => {
    const reviewId = req.params.id;

    try {
        const reviewRes = await db.query('SELECT * FROM reviews WHERE id = $1', [reviewId]);
        if (reviewRes.rows.length === 0) {
            return res.status(404).json({ error: 'Review report not found.' });
        }
        const review = reviewRes.rows[0];

        // Fetch submission code
        const subRes = await db.query('SELECT * FROM submissions WHERE id = $1', [review.submission_id]);
        const submission = subRes.rows[0];

        // If not completed, return status directly
        if (review.status !== 'completed') {
            return res.status(200).json({ review, code: [], findings: [], metrics: {} });
        }

        // Fetch findings
        const findingsRes = await db.query('SELECT * FROM review_findings WHERE review_id = $1', [reviewId]);
        
        // Fetch complexity metrics
        const metricsRes = await db.query('SELECT * FROM complexity_metrics WHERE review_id = $1', [reviewId]);
        const metrics = metricsRes.rows[0] || {};

        // Parse code lines
        const codeLines = submission.raw_code.split('\n').map((content, idx) => {
            const lineNum = idx + 1;
            // Find if there is a finding matching this line number
            const lineFinding = findingsRes.rows.find(f => f.line_number === lineNum);
            
            return {
                num: lineNum,
                content: content,
                status: lineFinding ? lineFinding.severity : 'normal',
                annotation: lineFinding ? lineFinding.suggested_fix : null
            };
        });

        res.status(200).json({
            review: {
                id: review.id,
                fileName: submission.file_name,
                language: submission.language,
                overall_score: review.overall_score,
                summary: review.summary,
                created_at: review.created_at
            },
            findings: findingsRes.rows,
            code: codeLines,
            metrics: {
                loc: metrics.lines_of_code || codeLines.length,
                complexity: metrics.cyclomatic_complexity || 1
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// List User Reviews
app.get('/api/reviews', authenticateToken, async (req, res) => {
    try {
        const reviewsRes = await db.query(
            `SELECT r.*, s.file_name, s.language FROM reviews r 
             JOIN submissions s ON r.submission_id = s.id 
             WHERE s.user_id = $1 
             ORDER BY r.created_at DESC`,
            [req.user.id]
        );

        // Compile findings counters
        const records = [];
        for (const row of reviewsRes.rows) {
            const findingsRes = await db.query('SELECT severity FROM review_findings WHERE review_id = $1', [row.id]);
            const critical = findingsRes.rows.filter(f => f.severity === 'critical').length;
            const warning = findingsRes.rows.filter(f => f.severity === 'warning').length;
            const info = findingsRes.rows.filter(f => f.severity === 'info').length;

            records.push({
                id: row.id,
                fileName: row.file_name,
                language: row.language,
                date: row.created_at.slice(0, 16).replace('T', ' '),
                score: row.overall_score || 0,
                critical,
                warning,
                info
            });
        }

        res.status(200).json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Review Log
app.delete('/api/reviews/:id', authenticateToken, async (req, res) => {
    try {
        await db.query('DELETE FROM reviews WHERE id = $1', [req.params.id]);
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fallback HTML page router
app.get('*', (req, res) => {
    // Attempt local frontend serving
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'index.html'), (err) => {
        if (err) {
            res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
        }
    });
});

app.listen(PORT, () => {
    console.log(`Express API Server running on port ${PORT}`);
    console.log(`Server environment DB: ${db.getType()}`);
});
