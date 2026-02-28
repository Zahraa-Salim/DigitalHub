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
  console.log('📊 Connecting to database...\n');
  
  // Check admin_profiles table
  const adminResult = await pool.query(`
    SELECT 
      ap.user_id,
      ap.full_name,
      ap.avatar_url,
      ap.bio,
      ap.job_title,
      ap.admin_role,
      ap.linkedin_url,
      ap.github_url,
      ap.portfolio_url,
      ap.is_public,
      ap.sort_order,
      ap.created_at,
      u.email,
      u.is_admin
    FROM admin_profiles ap
    LEFT JOIN users u ON u.id = ap.user_id
    ORDER BY ap.sort_order ASC
  `);
  
  console.log('✅ Admin Profiles from Database:');
  console.log('===================================\n');
  
  if (adminResult.rowCount === 0) {
    console.log('⚠️  No admin profiles found in database!');
  } else {
    console.log(`Found ${adminResult.rowCount} admin profile(s):\n`);
    adminResult.rows.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.full_name}`);
      console.log(`   User ID: ${admin.user_id}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Job Title: ${admin.job_title}`);
      console.log(`   Admin Role: ${admin.admin_role}`);
      console.log(`   Bio: ${admin.bio || 'N/A'}`);
      console.log(`   Is Public: ${admin.is_public}`);
      console.log(`   Avatar URL: ${admin.avatar_url || 'N/A'}`);
      console.log(`   LinkedIn: ${admin.linkedin_url || 'N/A'}`);
      console.log(`   GitHub: ${admin.github_url || 'N/A'}`);
      console.log(`   Portfolio: ${admin.portfolio_url || 'N/A'}`);
      console.log(`   Sort Order: ${admin.sort_order}`);
      console.log(`   Created: ${admin.created_at}`);
      console.log('');
    });
  }
  
  // Check if users table has admins
  const usersResult = await pool.query(`
    SELECT id, email, is_admin, is_active
    FROM users
    WHERE is_admin = TRUE
    ORDER BY created_at ASC
  `);
  
  console.log('\n✅ Admin Users in Database:');
  console.log('===================================\n');
  
  if (usersResult.rowCount === 0) {
    console.log('⚠️  No admin users found in database!');
  } else {
    console.log(`Found ${usersResult.rowCount} admin user(s):\n`);
    usersResult.rows.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id} | Email: ${user.email} | Active: ${user.is_active}`);
    });
  }
  
  await pool.end();
  console.log('\n✅ Database connection closed successfully');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
