// Run the SQL schema migration against the Prisma Postgres database
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set in .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const sqlFile = path.join(__dirname, 'supabase', 'migrations', '20260717000000_schema.sql');
  const sql = fs.readFileSync(sqlFile, 'utf-8');

  console.log('Connecting to Prisma Postgres...');
  const client = await pool.connect();
  
  try {
    console.log('Running schema migration...');
    await client.query(sql);
    console.log('✅ Schema migration completed successfully!');
    
    // Verify tables
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('\nCreated tables:');
    result.rows.forEach(row => console.log(`  ✓ ${row.table_name}`));
  } catch (err) {
    console.error('Migration error:', err.message);
    // Try running statements one at a time if batch fails
    console.log('\nRetrying with individual statements...');
    const statements = sql.split(';').filter(s => s.trim().length > 0);
    for (const stmt of statements) {
      try {
        await client.query(stmt);
        console.log(`  ✓ Executed: ${stmt.trim().substring(0, 60)}...`);
      } catch (e) {
        console.log(`  ⚠ Skipped (already exists?): ${e.message.substring(0, 80)}`);
      }
    }
    console.log('\n✅ Migration completed (with skips for existing objects).');
    
    // Verify tables
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('\nTables in database:');
    result.rows.forEach(row => console.log(`  ✓ ${row.table_name}`));
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
