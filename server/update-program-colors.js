const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const updateQuery = `
WITH color_assignments AS (
  SELECT 
    id,
    ((ROW_NUMBER() OVER (ORDER BY id) - 1) % 6) + 1 AS scheme_id,
    CASE 
      WHEN ((ROW_NUMBER() OVER (ORDER BY id) - 1) % 6) + 1 = 1 THEN 'fa-code'
      WHEN ((ROW_NUMBER() OVER (ORDER BY id) - 1) % 6) + 1 = 2 THEN 'fa-brain'
      WHEN ((ROW_NUMBER() OVER (ORDER BY id) - 1) % 6) + 1 = 3 THEN 'fa-server'
      WHEN ((ROW_NUMBER() OVER (ORDER BY id) - 1) % 6) + 1 = 4 THEN 'fa-palette'
      WHEN ((ROW_NUMBER() OVER (ORDER BY id) - 1) % 6) + 1 = 5 THEN 'fa-rocket'
      WHEN ((ROW_NUMBER() OVER (ORDER BY id) - 1) % 6) + 1 = 6 THEN 'fa-cloud'
      ELSE 'fa-code'
    END AS icon_val
  FROM programs
  WHERE deleted_at IS NULL
)
UPDATE programs
SET 
  color_scheme_id = color_assignments.scheme_id,
  icon_class = color_assignments.icon_val,
  updated_at = NOW()
FROM color_assignments
WHERE programs.id = color_assignments.id
  AND programs.deleted_at IS NULL;
`;

const verifyQuery = `SELECT id, title, color_scheme_id, icon_class FROM programs WHERE deleted_at IS NULL ORDER BY id;`;

async function updateColors() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    console.log('Assigning color schemes to programs...');
    const updateResult = await client.query(updateQuery);
    console.log(`✓ Updated ${updateResult.rowCount} programs`);
    
    console.log('\nVerifying assignments:');
    const verifyResult = await client.query(verifyQuery);
    console.table(verifyResult.rows);
    
    client.release();
    await pool.end();
    
    console.log('\n✓ Color scheme assignment complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating colors:', error);
    process.exit(1);
  }
}

updateColors();
