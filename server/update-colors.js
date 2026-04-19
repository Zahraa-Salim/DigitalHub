import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const { Client } = pg;

async function updateProgramColors() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');

    const updateQuery = `
      WITH numbered_programs AS (
        SELECT 
          id,
          ROW_NUMBER() OVER (ORDER BY id) as row_num
        FROM programs
        WHERE deleted_at IS NULL
      )
      UPDATE programs
      SET 
        color_scheme_id = ((np.row_num - 1) % 6) + 1,
        icon_class = CASE 
          WHEN ((np.row_num - 1) % 6) + 1 = 1 THEN 'fa-code'
          WHEN ((np.row_num - 1) % 6) + 1 = 2 THEN 'fa-brain'
          WHEN ((np.row_num - 1) % 6) + 1 = 3 THEN 'fa-server'
          WHEN ((np.row_num - 1) % 6) + 1 = 4 THEN 'fa-palette'
          WHEN ((np.row_num - 1) % 6) + 1 = 5 THEN 'fa-rocket'
          WHEN ((np.row_num - 1) % 6) + 1 = 6 THEN 'fa-cloud'
          ELSE 'fa-code'
        END,
        updated_at = NOW()
      FROM numbered_programs np
      WHERE programs.id = np.id;
    `;

    console.log('Executing UPDATE query...');
    const updateResult = await client.query(updateQuery);
    console.log(`Updated ${updateResult.rowCount} programs`);

    const selectQuery = `
      SELECT id, title, color_scheme_id, icon_class 
      FROM programs 
      WHERE deleted_at IS NULL 
      ORDER BY id;
    `;

    console.log('Executing SELECT query...');
    const selectResult = await client.query(selectQuery);
    
    console.log('\nPrograms with assigned color schemes:');
    console.log('====================================\n');
    selectResult.rows.forEach((row) => {
      console.log(`ID: ${row.id} | Title: ${row.title} | Color: ${row.color_scheme_id} | Icon: ${row.icon_class}`);
    });

    console.log(`\nTotal programs: ${selectResult.rows.length}`);

  } catch (error) {
    console.error('Error executing query:', error.message);
  } finally {
    await client.end();
    console.log('\nConnection closed');
  }
}

updateProgramColors();
