// File: server/src/scripts/seedAdmin.ts
// Purpose: Runs the seed admin script for the backend.
// It performs a one-off setup, seeding, or maintenance task outside the request cycle.

import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { pool } from "../db/index.js";
dotenv.config();
// Handles 'seedAdmin' workflow for this module.
async function seedAdmin() {
    const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.SEED_ADMIN_PASSWORD;
    if (!email || !password) {
        throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in environment.");
    }
    const existingUserResult = await pool.query(`
      SELECT id, is_admin
      FROM users
      WHERE email = $1
      LIMIT 1
    `, [email]);
    if (existingUserResult.rowCount) {
        const existing = existingUserResult.rows[0];
        if (!existing.is_admin) {
            await pool.query(`
          UPDATE users
          SET is_admin = TRUE, updated_at = NOW()
          WHERE id = $1
        `, [existing.id]);
            console.log(`Updated existing user ${email} to admin.`);
            return;
        }
        console.log(`Admin user already exists for ${email}.`);
        return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const insertResult = await pool.query(`
      INSERT INTO users
        (email, password_hash, is_admin, is_active, created_at, updated_at)
      VALUES
        ($1, $2, TRUE, TRUE, NOW(), NOW())
      RETURNING id, email, is_admin
    `, [email, passwordHash]);
    const created = insertResult.rows[0];
    console.log(`Created admin user #${created.id} (${created.email}).`);
}
seedAdmin()
    .catch((error) => {
    console.error("Failed to seed admin user:", error);
    process.exitCode = 1;
})
    .finally(async () => {
    await pool.end();
});

