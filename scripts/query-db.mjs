import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=["']?(.+?)["']?$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
});

const { Pool } = pg;
// Use DIRECT_URL for auth schema access (no pgbouncer)
const pool = new Pool({ connectionString: process.env.DIRECT_URL });

async function main() {
  try {
    const authUsers = await pool.query(`
      SELECT id, email, raw_user_meta_data->>'nombre' as nombre, created_at 
      FROM auth.users 
      ORDER BY created_at DESC
    `);
    console.log('=== AUTH USERS ===');
    authUsers.rows.forEach(r => console.log(JSON.stringify(r)));
  } catch(e) {
    console.log('Cannot query auth.users directly (expected with pooler connection)');
    console.log('Error:', e.message);
  }

  // Check profiles for Jonathan / Ricardo
  const profiles = await pool.query(`
    SELECT p.*, ar.nombre as role_nombre, ar.permisos
    FROM "Profile" p 
    LEFT JOIN "AppRole" ar ON p."app_role_id" = ar.id 
    WHERE LOWER(p.nombre) LIKE '%jonathan%' OR LOWER(p.nombre) LIKE '%ricardo%' OR LOWER(p.email) LIKE '%jonathan%' OR LOWER(p.email) LIKE '%ricardo%'
  `);
  console.log('\n=== MATCHING PROFILES (jonathan/ricardo) ===');
  profiles.rows.forEach(r => console.log(JSON.stringify(r)));

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
