require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');
const analyzer = require('./analyzer');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretnexuskey123';

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Authentication Middleware to protect API routes
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>
    
    if (!token) {
        return res.status(401).json({ error: "Access denied. Auth token required." });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: "Invalid or expired token." });
    }
};

// --- AUTHENTICATION ENDPOINTS ---

// Register User
app.post('/api/auth/signup', (req, res) => {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({ error: "Missing required fields: name, email, password" });
    }

    const existingUser = db.users.findUserByEmail(email);
    if (existingUser) {
        return res.status(400).json({ error: "A user with this email already exists." });
    }

    // Hash password and store user
    const hashedPassword = bcrypt.hashSync(password, 10);
    const newUser = db.users.createUser({
        name,
        email,
        password: hashedPassword
    });

    // Auto-create default project for this user
    db.projects.findOrCreateDefaultProject(newUser.id);

    // Generate JWT token
    const token = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
        token,
        user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email
        }
    });
});

// Login User
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
    }

    const user = db.users.findUserByEmail(email);
    if (!user) {
        return res.status(401).json({ error: "Invalid credentials." });
    }

    const validPass = bcrypt.compareSync(password, user.password);
    if (!validPass) {
        return res.status(401).json({ error: "Invalid credentials." });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email
        }
    });
});

// Get User Profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
    const user = db.users.findUserById(req.user.id);
    if (!user) {
        return res.status(404).json({ error: "User not found." });
    }
    res.status(200).json({
        id: user.id,
        name: user.name,
        email: user.email
    });
});


// --- CODE REVIEW ENDPOINTS ---

// Run a code review (Protected)
app.post('/api/reviews', authenticateToken, async (req, res) => {
    const { code, fileName, language } = req.body;

    if (!code || !fileName || !language) {
        return res.status(400).json({ error: "Missing required fields: code, fileName, language" });
    }

    try {
        // 1. Run Static + AI Analysis
        const analysis = await analyzer.analyzeCode(code, language);
        
        // 2. Get user default project
        const project = db.projects.findOrCreateDefaultProject(req.user.id);

        // 3. Create Review log in DB
        const newReview = db.reviews.createReview({
            project_id: project.id,
            review_type: "Automated + AI Review",
            overall_score: analysis.score,
            summary: analysis.summary,
            file_name: fileName,
            code_body: code
        });

        // 4. Save review findings to DB
        const savedFindings = [];
        for (const f of analysis.findings) {
            const savedFinding = db.findings.createFinding({
                review_id: newReview.id,
                severity: f.severity,
                issue: f.issue,
                explanation: f.explanation,
                suggested_fix: f.suggested_fix,
                file_name: fileName,
                line_number: f.line
            });
            savedFindings.push(savedFinding);
        }

        // Return completed report
        res.status(201).json({
            review: newReview,
            findings: savedFindings,
            metrics: {
                loc: code.split('\n').length,
                complexity: `${analysis.complexity} (Cyclomatic)`
            }
        });
    } catch (err) {
        console.error("Code review execution failed:", err);
        res.status(500).json({ error: "An error occurred during code analysis execution." });
    }
});

// Get review history (Protected)
app.get('/api/reviews', authenticateToken, (req, res) => {
    const project = db.projects.findOrCreateDefaultProject(req.user.id);
    const reviewList = db.reviews.findReviewsByProject(project.id);
    
    // Enrich reviews with findings count
    const enrichedList = reviewList.map(r => {
        const reviewFindings = db.findings.findFindingsByReview(r.id);
        let critical = 0, warning = 0, info = 0;
        reviewFindings.forEach(f => {
            if (f.severity === 'critical') critical++;
            else if (f.severity === 'warning') warning++;
            else if (f.severity === 'info') info++;
        });

        return {
            id: r.id,
            fileName: r.file_name,
            language: r.file_name.split('.').pop() === 'py' ? 'Python' : r.file_name.split('.').pop() === 'go' ? 'Go' : r.file_name.split('.').pop() === 'rs' ? 'Rust' : 'TypeScript',
            date: r.created_at.slice(0, 16).replace('T', ' '),
            critical,
            warning,
            info,
            score: r.overall_score
        };
    });

    res.status(200).json(enrichedList);
});

// Get individual review details (Protected)
app.get('/api/reviews/:id', authenticateToken, (req, res) => {
    const reviewId = req.params.id;
    const review = db.reviews.findReviewById(reviewId);
    
    if (!review) {
        return res.status(404).json({ error: "Review report not found." });
    }

    const reviewFindings = db.findings.findFindingsByReview(reviewId);
    const codeLines = review.code_body.split('\n');

    // Structure findings and lines in a way the frontend dashboard renders them
    const structuredCode = codeLines.map((line, idx) => {
        const lineNum = idx + 1;
        const lineFinding = reviewFindings.find(f => f.line_number === lineNum);
        
        return {
            num: lineNum,
            content: line,
            status: lineFinding ? lineFinding.severity : 'normal',
            annotation: lineFinding ? `AI recommendation: ${lineFinding.explanation}` : null
        };
    });

    res.status(200).json({
        review: {
            id: review.id,
            fileName: review.file_name,
            overall_score: review.overall_score,
            summary: review.summary,
            created_at: review.created_at
        },
        findings: reviewFindings.map(f => ({
            id: f.id,
            severity: f.severity,
            line: f.line_number,
            title: f.issue,
            desc: f.explanation,
            diff: f.suggested_fix ? {
                removed: `- ${codeLines[f.line_number - 1] || ''}`,
                added: `+ ${f.suggested_fix}`
            } : null
        })),
        code: structuredCode,
        metrics: {
            loc: codeLines.length,
            complexity: `${3 + Math.floor(Math.random() * 4)} (Moderate)` // dynamic complexity mock for single files
        }
    });
});

// Delete Review (Protected)
app.delete('/api/reviews/:id', authenticateToken, (req, res) => {
    const reviewId = req.params.id;
    const review = db.reviews.findReviewById(reviewId);
    
    if (!review) {
        return res.status(404).json({ error: "Review report not found." });
    }

    db.reviews.deleteReview(reviewId);
    res.status(200).json({ success: true, message: "Review report deleted successfully." });
});

// Handle all SPA frontend routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start Express Listener
app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`  Nexus.AI Code Review server listening on PORT ${PORT}`);
    console.log(`  Access the Web client at http://localhost:${PORT}`);
    console.log(`=================================================`);
});
