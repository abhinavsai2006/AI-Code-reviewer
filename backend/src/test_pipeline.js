const { db } = require('./config');
const { processReviewJob } = require('./worker');
const crypto = require('crypto');

async function runTestAnalysis() {
  console.log('--- STARTING AI AUDIT PIPELINE TEST AND ANALYSIS ---');
  
  try {
    // 1. Resolve or Create Test User
    const email = 'dev@nexus.ai';
    let user = null;
    const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length > 0) {
      user = userRes.rows[0];
      console.log('Test User resolved:', user.email);
    } else {
      const newUserRes = await db.query(
        'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
        ['Nexus Developer', email, 'hashedpassword']
      );
      user = newUserRes.rows[0];
      console.log('Test User created:', user.email);
    }

    // 2. Create Project
    let projectId = null;
    const projRes = await db.query('SELECT id FROM projects WHERE user_id = $1 LIMIT 1', [user.id]);
    if (projRes.rows.length > 0) {
      projectId = projRes.rows[0].id;
    } else {
      const newProj = await db.query(
        'INSERT INTO projects (user_id, project_name, description) VALUES ($1, $2, $3) RETURNING id',
        [user.id, 'Test Sandbox', 'Analysis Sandbox']
      );
      projectId = newProj.rows[0].id;
    }
    console.log('Project resolved:', projectId);

    // 3. Create Submission (TypeScript with SQL injection and unused variables)
    const codeSnippet = `export class PaymentService {
  async process(userId: string, amount: number) {
    const query = \`SELECT * FROM users WHERE id = \${userId}\`;
    const userResult = await db.execute(query);
    const response = await paymentGateway.charge(amount);
    return { success: true };
  }
}`;
    const codeHash = crypto.createHash('sha256').update(codeSnippet).digest('hex');
    const subRes = await db.query(
      `INSERT INTO submissions (project_id, user_id, source_type, language, file_name, raw_code, code_hash) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [projectId, user.id, 'paste', 'TypeScript', 'PaymentService.ts', codeSnippet, codeHash]
    );
    const submissionId = subRes.rows[0].id;
    console.log('Submission created:', submissionId);

    // 4. Create Review (pending)
    const revRes = await db.query(
      `INSERT INTO reviews (submission_id, project_id, status) VALUES ($1, $2, $3) RETURNING id`,
      [submissionId, projectId, 'pending']
    );
    const reviewId = revRes.rows[0].id;
    console.log('Review initialized:', reviewId);

    // 5. Execute Async Pipeline Worker directly
    console.log('\nExecuting Pipeline Worker on Submission...');
    await processReviewJob(reviewId, {
      submissionId,
      language: 'TypeScript',
      raw_code: codeSnippet,
      fileName: 'PaymentService.ts'
    });

    // 6. Verify Results from DB
    console.log('\n--- VERIFYING RESULTS FROM SQL METADATA TABLES ---');
    const reviewFinalRes = await db.query('SELECT * FROM reviews WHERE id = $1', [reviewId]);
    const review = reviewFinalRes.rows[0];
    console.log('Review Status:', review.status);
    console.log('Overall Score:', review.overall_score);
    console.log('Summary:', review.summary);

    const findingsRes = await db.query('SELECT * FROM review_findings WHERE review_id = $1', [reviewId]);
    console.log(`\nFindings Logged: ${findingsRes.rows.length}`);
    findingsRes.rows.forEach((f, idx) => {
      console.log(`[Finding ${idx + 1}]`);
      console.log(` - Source: ${f.source}`);
      console.log(` - Severity: ${f.severity}`);
      console.log(` - Line: ${f.line_number}`);
      console.log(` - Category: ${f.category}`);
      console.log(` - Issue: ${f.issue}`);
      console.log(` - Explanation: ${f.explanation}`);
      console.log(` - Fix:\n${f.suggested_fix}\n`);
    });

    const metricsRes = await db.query('SELECT * FROM complexity_metrics WHERE review_id = $1', [reviewId]);
    const metrics = metricsRes.rows[0];
    console.log('--- COMPLEXITY METRICS ---');
    console.log('LOC:', metrics.lines_of_code);
    console.log('Cyclomatic Complexity:', metrics.cyclomatic_complexity);
    console.log('File Complexity:', metrics.file_complexity);
    console.log('Functions Count:', metrics.num_functions);
    console.log('Classes Count:', metrics.num_classes);

    console.log('\n--- TEST AUDIT PIPELINE COMPLETED SUCCESSFULLY ---');

  } catch (err) {
    console.error('Pipeline test execution failed with error:', err);
  }
}

runTestAnalysis();
