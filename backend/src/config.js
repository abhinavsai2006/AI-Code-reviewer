const path = require('path');
// Load .env from project root (e:\Ai code review\.env) with override to ensure fresh values
const envPath = path.join(__dirname, '..', '..', '.env');
require('dotenv').config({ path: envPath, override: true });
console.log(`[Config] Loading .env from: ${envPath}`);

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretnexuskey123';
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const DATABASE_URL = process.env.DATABASE_URL || '';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '';
const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NVIDIA_LLM_MODEL = process.env.NVIDIA_LLM_MODEL || 'meta/llama-3.1-8b-instruct';

// Database Client Wrapper
let dbClient = null;
let dbType = 'sqlite'; // 'postgres' or 'sqlite' fallback

// Simple in-memory fallback db (matching sqlite schemas)
const memoryDb = {
    users: [],
    projects: [],
    submissions: [],
    reviews: [],
    review_findings: [],
    complexity_metrics: []
};

// Seed initial memory DB
const seedMemoryDb = () => {
    // Default system user
    memoryDb.users.push({
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Nexus Developer',
        email: 'dev@nexus.ai',
        password_hash: '$2a$10$75HFtiz1K0ppmqnZiUij9O63UwPOt5xbA5BchRvV9w9y8RDlMshsG', // password is 'password'
        created_at: new Date().toISOString()
    });
    // Default project
    memoryDb.projects.push({
        id: '11111111-1111-1111-1111-111111111111',
        user_id: '00000000-0000-0000-0000-000000000000',
        project_name: 'Nexus Sandbox',
        description: 'Default project sandbox for quick snippet analysis.',
        created_at: new Date().toISOString()
    });

    // 1. Seed Submissions
    const subId = '22222222-2222-2222-2222-222222222222';
    memoryDb.submissions.push({
        id: subId,
        project_id: '11111111-1111-1111-1111-111111111111',
        user_id: '00000000-0000-0000-0000-000000000000',
        source_type: 'paste',
        language: 'TypeScript',
        file_name: 'PaymentProcessor.ts',
        raw_code: `export class PaymentProcessor {
  async processPayment(userId: string, amount: number) {
    const query = \`SELECT * FROM users WHERE id = \${userId}\`;
    const user = await db.execute(query);
    if (!user) throw new Error('User not found');
    
    // Process transaction
    const response = await paymentGateway.charge(amount);
    return { success: true };
  }
}`,
        code_hash: 'mockhash123456',
        created_at: new Date(Date.now() - 3600000).toISOString()
    });

    // 2. Seed Review (completed)
    const revId = '33333333-3333-3333-3333-333333333333';
    memoryDb.reviews.push({
        id: revId,
        submission_id: subId,
        project_id: '11111111-1111-1111-1111-111111111111',
        review_type: 'full',
        status: 'completed',
        overall_score: 82,
        summary: 'Solid payment helper structure with minor security (SQL injection risk) and styling concerns.',
        error_message: null,
        started_at: new Date(Date.now() - 3590000).toISOString(),
        completed_at: new Date(Date.now() - 3580000).toISOString(),
        created_at: new Date(Date.now() - 3600000).toISOString()
    });

    // 3. Seed Findings
    memoryDb.review_findings.push({
        id: 'finding1',
        review_id: revId,
        source: 'ai_review',
        severity: 'critical',
        category: 'security',
        issue: 'SQL Injection Risk in query string',
        explanation: 'Using string interpolation to build SQL queries allows arbitrary SQL execution. Secure the query execution parameter.',
        suggested_fix: "const query = 'SELECT * FROM users WHERE id = ?';\nconst user = await db.execute(query, [userId]);",
        file_name: 'PaymentProcessor.ts',
        line_number: 3,
        column_number: 5,
        created_at: new Date().toISOString()
    });
    memoryDb.review_findings.push({
        id: 'finding2',
        review_id: revId,
        source: 'static_analysis',
        severity: 'warning',
        category: 'code_smell',
        issue: "Unused variable 'response'",
        explanation: "Variable 'response' is declared and fetched but is never read or used in follow-up instructions.",
        suggested_fix: "// Remove response prefix if unused\nawait paymentGateway.charge(amount);",
        file_name: 'PaymentProcessor.ts',
        line_number: 8,
        column_number: 5,
        created_at: new Date().toISOString()
    });

    // 4. Seed Complexity Metrics
    memoryDb.complexity_metrics.push({
        id: 'metric1',
        review_id: revId,
        cyclomatic_complexity: 2,
        function_complexity: {},
        file_complexity: 1,
        num_functions: 1,
        num_classes: 1,
        lines_of_code: 11,
        created_at: new Date().toISOString()
    });
};
seedMemoryDb();

if (DATABASE_URL) {
    const { Pool } = require('pg');
    try {
        dbClient = new Pool({
            connectionString: DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        dbType = 'postgres';
        console.log('PostgreSQL database connection pool initialized.');
    } catch (err) {
        console.error('Failed to initialize PostgreSQL pool, falling back to local memory DB:', err);
    }
} else {
    console.log('No DATABASE_URL configured. Falling back to local memory database.');
}

// Database Helper Methods to abstract query operations
const db = {
    query: async (text, params = []) => {
        if (dbType === 'postgres') {
            const res = await dbClient.query(text, params);
            return res;
        } else {
            // Local SQL evaluator fallback
            return mockSqlEvaluator(text, params);
        }
    },
    getType: () => dbType,
    client: dbClient
};

// SQL string evaluator parsing helper
function mockSqlEvaluator(text, params) {
    const cleanText = text.replace(/\s+/g, ' ').trim().toLowerCase();
    
    // 1. SELECT * FROM users WHERE email = $1
    if (cleanText.includes('select * from users where email =')) {
        const email = params[0];
        const rows = memoryDb.users.filter(u => u.email === email);
        return { rows };
    }
    
    // 2. SELECT * FROM users WHERE id = $1
    if (cleanText.includes('select * from users where id =')) {
        const id = params[0];
        const rows = memoryDb.users.filter(u => u.id === id);
        return { rows };
    }

    // 3. INSERT INTO users
    if (cleanText.includes('insert into users')) {
        // e.g., INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *
        const id = require('crypto').randomUUID();
        const newUser = {
            id,
            name: params[0],
            email: params[1],
            password_hash: params[2],
            avatar_url: params[3] || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        memoryDb.users.push(newUser);
        return { rows: [newUser] };
    }

    // 4. SELECT * FROM projects WHERE user_id = $1
    if (cleanText.includes('select * from projects where user_id =')) {
        const userId = params[0];
        const rows = memoryDb.projects.filter(p => p.user_id === userId);
        return { rows };
    }

    // 5. INSERT INTO projects
    if (cleanText.includes('insert into projects')) {
        const id = require('crypto').randomUUID();
        const newProj = {
            id,
            user_id: params[0],
            project_name: params[1],
            description: params[2] || '',
            created_at: new Date().toISOString()
        };
        memoryDb.projects.push(newProj);
        return { rows: [newProj] };
    }

    // 6. INSERT INTO submissions
    if (cleanText.includes('insert into submissions')) {
        const id = require('crypto').randomUUID();
        const newSub = {
            id,
            project_id: params[0],
            user_id: params[1],
            source_type: params[2],
            language: params[3],
            file_name: params[4],
            raw_code: params[5],
            code_hash: params[6],
            created_at: new Date().toISOString()
        };
        memoryDb.submissions.push(newSub);
        return { rows: [newSub] };
    }

    // 7. INSERT INTO reviews
    if (cleanText.includes('insert into reviews')) {
        const id = require('crypto').randomUUID();
        const newRev = {
            id,
            submission_id: params[0],
            project_id: params[1],
            review_type: params[2],
            status: params[3] || 'pending',
            overall_score: params[4] || null,
            summary: params[5] || null,
            error_message: params[6] || null,
            started_at: params[7] || null,
            completed_at: params[8] || null,
            created_at: new Date().toISOString()
        };
        memoryDb.reviews.push(newRev);
        return { rows: [newRev] };
    }

    // 8. UPDATE reviews SET status = $1, ... WHERE id = $2
    if (cleanText.includes('update reviews set')) {
        // Simple update handler
        const id = params[params.length - 1]; // assumed last parameter is ID for WHERE id = $x
        const review = memoryDb.reviews.find(r => r.id === id);
        if (review) {
            // Find status, score, summary, errors
            if (cleanText.includes('status =')) {
                const statusIdx = text.toLowerCase().indexOf('status =');
                const paramIdx = parseInt(text.slice(statusIdx).match(/\$(\d+)/)[1]) - 1;
                review.status = params[paramIdx];
            }
            if (cleanText.includes('overall_score =')) {
                const scoreIdx = text.toLowerCase().indexOf('overall_score =');
                const paramIdx = parseInt(text.slice(scoreIdx).match(/\$(\d+)/)[1]) - 1;
                review.overall_score = params[paramIdx];
            }
            if (cleanText.includes('summary =')) {
                const summaryIdx = text.toLowerCase().indexOf('summary =');
                const paramIdx = parseInt(text.slice(summaryIdx).match(/\$(\d+)/)[1]) - 1;
                review.summary = params[paramIdx];
            }
            if (cleanText.includes('error_message =')) {
                const errIdx = text.toLowerCase().indexOf('error_message =');
                const paramIdx = parseInt(text.slice(errIdx).match(/\$(\d+)/)[1]) - 1;
                review.error_message = params[paramIdx];
            }
            if (cleanText.includes('completed_at =')) {
                review.completed_at = new Date().toISOString();
            }
            return { rows: [review] };
        }
    }

    // 9. SELECT * FROM reviews WHERE id = $1
    if (cleanText.includes('select * from reviews where id =')) {
        const id = params[0];
        const rows = memoryDb.reviews.filter(r => r.id === id);
        return { rows };
    }

    // 17. SELECT s.* FROM submissions s JOIN reviews r ON r.submission_id = s.id WHERE r.id = $1
    if (cleanText.includes('select s.* from submissions s join reviews')) {
        const reviewId = params[0];
        const review = memoryDb.reviews.find(r => r.id === reviewId);
        if (review) {
            const submission = memoryDb.submissions.find(s => s.id === review.submission_id);
            return { rows: submission ? [submission] : [] };
        }
        return { rows: [] };
    }

    // 10. SELECT * FROM submissions WHERE id = $1
    if (cleanText.includes('select * from submissions where id =')) {
        const id = params[0];
        const rows = memoryDb.submissions.filter(s => s.id === id);
        return { rows };
    }

    // 11. INSERT INTO review_findings
    if (cleanText.includes('insert into review_findings')) {
        const id = require('crypto').randomUUID();
        const newFinding = {
            id,
            review_id: params[0],
            source: params[1],
            severity: params[2],
            category: params[3],
            issue: params[4],
            explanation: params[5],
            suggested_fix: params[6],
            file_name: params[7],
            line_number: params[8],
            column_number: params[9],
            created_at: new Date().toISOString()
        };
        memoryDb.review_findings.push(newFinding);
        return { rows: [newFinding] };
    }

    // 12. INSERT INTO complexity_metrics
    if (cleanText.includes('insert into complexity_metrics')) {
        const id = require('crypto').randomUUID();
        const newMetric = {
            id,
            review_id: params[0],
            cyclomatic_complexity: params[1],
            function_complexity: params[2],
            file_complexity: params[3],
            num_functions: params[4],
            num_classes: params[5],
            lines_of_code: params[6],
            created_at: new Date().toISOString()
        };
        memoryDb.complexity_metrics.push(newMetric);
        return { rows: [newMetric] };
    }

    // 13. SELECT * FROM review_findings WHERE review_id = $1
    if (cleanText.includes('select * from review_findings where review_id =')) {
        const reviewId = params[0];
        const rows = memoryDb.review_findings.filter(f => f.review_id === reviewId);
        return { rows };
    }

    // 14. SELECT * FROM complexity_metrics WHERE review_id = $1
    if (cleanText.includes('select * from complexity_metrics where review_id =')) {
        const reviewId = params[0];
        const rows = memoryDb.complexity_metrics.filter(m => m.review_id === reviewId);
        return { rows };
    }

    // 15. SELECT reviews.* FROM reviews JOIN submissions ... WHERE reviews.user_id = $1
    // Simplification for Listing reviews: SELECT r.*, s.file_name, s.language FROM reviews r JOIN submissions s ON r.submission_id = s.id
    if (cleanText.includes('select r.*') || cleanText.includes('select reviews.*')) {
        // Return reviews matched with submissions
        const rows = memoryDb.reviews.map(r => {
            const s = memoryDb.submissions.find(sub => sub.id === r.submission_id) || {};
            // Filter findings for this review to count severities
            const findings = memoryDb.review_findings.filter(f => f.review_id === r.id);
            const critical = findings.filter(f => f.severity === 'critical').length;
            const warning = findings.filter(f => f.severity === 'warning').length;
            const info = findings.filter(f => f.severity === 'info').length;

            return {
                ...r,
                fileName: s.file_name || 'code_snippet',
                language: s.language || 'TypeScript',
                date: r.created_at.slice(0, 16).replace('T', ' '),
                score: r.overall_score || 0,
                critical,
                warning,
                info
            };
        });
        return { rows };
    }

    // 16. DELETE FROM reviews WHERE id = $1
    if (cleanText.includes('delete from reviews where id =')) {
        const id = params[0];
        memoryDb.reviews = memoryDb.reviews.filter(r => r.id !== id);
        return { rowCount: 1 };
    }

    return { rows: [] };
}

module.exports = {
    PORT,
    JWT_SECRET,
    REDIS_URL,
    DATABASE_URL,
    NVIDIA_API_KEY,
    NVIDIA_BASE_URL,
    NVIDIA_LLM_MODEL,
    db,
    memoryDb
};
