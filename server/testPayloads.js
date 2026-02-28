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
  console.log('📊 Fetching admin profile for testing...\n');
  
  // Get one admin for testing
  const adminResult = await pool.query(`
    SELECT user_id FROM admin_profiles LIMIT 1
  `);
  
  if (!adminResult.rows.length) {
    console.log('❌ No admin profiles found');
    process.exit(1);
  }
  
  const adminUserId = adminResult.rows[0].user_id;
  console.log(`✅ Found admin with user_id: ${adminUserId}\n`);
  
  // Simulate test payloads
  console.log('📝 Test payloads that will be sent to the API:\n');
  
  const testPayloads = [
    {
      name: "Profile with empty optional fields",
      data: {
        full_name: "Admin Updated",
        job_title: "",
        bio: "",
        avatar_url: "",
        linkedin_url: "",
        github_url: "",
        portfolio_url: ""
      }
    },
    {
      name: "Profile with some fields filled",
      data: {
        full_name: "Updated Admin Name",
        job_title: "Senior Administrator",
        bio: "Managing the system",
        avatar_url: "",
        linkedin_url: "",
        github_url: "",
        portfolio_url: ""
      }
    },
    {
      name: "Profile with URLs",
      data: {
        full_name: "Admin User",
        job_title: "System Admin",
        bio: "Managing everything",
        avatar_url: "",
        linkedin_url: "https://linkedin.com/in/admin",
        github_url: "https://github.com/admin",
        portfolio_url: "https://admin.portfolio.com"
      }
    }
  ];
  
  testPayloads.forEach(test => {
    console.log(`Test: ${test.name}`);
    console.log(JSON.stringify(test.data, null, 2));
    console.log('');
  });
  
  console.log('✅ All test payloads are ready to be sent to the API');
  console.log('\n🔗 API Endpoint: PUT http://localhost:5000/api/admins/me');
  console.log('📌 Required header: Authorization: Bearer <valid-token>\n');
  
  await pool.end();
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
