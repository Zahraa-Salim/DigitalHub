const pkg = await import('pg');
const { Pool } = pkg;
const dotenv = await import('dotenv');
dotenv.config();

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: { rejectUnauthorized: false }
});

try {
  console.log('📊 Testing the listPublicAdmins query...\n');
  
  // This is the exact query from public.repo.ts
  const result = await pool.query(`
    SELECT
      full_name,
      avatar_url,
      bio,
      job_title,
      linkedin_url,
      github_url,
      portfolio_url
    FROM admin_profiles
    WHERE is_public = TRUE
    ORDER BY sort_order ASC
  `);
  
  console.log('✅ API Query Result (what your frontend receives):');
  console.log('===================================\n');
  console.log(JSON.stringify(result.rows, null, 2));
  console.log(`\n✅ Total records returned: ${result.rowCount}`);
  
  await pool.end();
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
