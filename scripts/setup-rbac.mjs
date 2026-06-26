import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { createClient } from '@supabase/supabase-js';
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

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function migrateRoles() {
  const roles = await prisma.appRole.findMany();
  for (const role of roles) {
    let oldPerms = role.permisos;
    if (typeof oldPerms === 'string') {
      try {
        oldPerms = JSON.parse(oldPerms);
      } catch (e) {
        oldPerms = [];
      }
    }
    
    // Si ya es un objeto (no array), asumimos que ya migró
    if (!Array.isArray(oldPerms)) {
      continue;
    }
    
    const newPerms = {};
    for (const mod of oldPerms) {
      newPerms[mod] = { ver: true, crear: true, editar: true, eliminar: true };
    }
    
    await prisma.appRole.update({
      where: { id: role.id },
      data: { permisos: newPerms }
    });
    console.log(`Migrated permissions for role: ${role.nombre}`);
  }
}

async function setupUsers() {
  const jonathanEmail = 'jonathan@movidatci.com';
  const ricardoEmail = 'ricardo@movidatci.com';

  // Admin Role (for assignment)
  let adminRole = await prisma.appRole.findUnique({ where: { nombre: 'Admin' } });
  
  // 1. Setup Jonathan
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
  let jonathanAuth = authUsers.users.find(u => u.email === jonathanEmail);
  
  if (!jonathanAuth) {
    const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
      email: jonathanEmail,
      password: 'Admin123+',
      email_confirm: true,
      user_metadata: { nombre: 'Jonathan Palacios' }
    });
    if (error) throw error;
    jonathanAuth = newUser.user;
    console.log('Created Jonathan in Auth');
  } else {
    // Update password just in case
    await supabaseAdmin.auth.admin.updateUserById(jonathanAuth.id, {
      password: 'Admin123+',
      user_metadata: { nombre: 'Jonathan Palacios' }
    });
    console.log('Updated Jonathan in Auth');
  }

  // Upsert profile
  await prisma.profile.upsert({
    where: { auth_id: jonathanAuth.id },
    update: { rol: 'SUPERADMIN', nombre: 'Jonathan Palacios', app_role_id: adminRole?.id },
    create: {
      auth_id: jonathanAuth.id,
      email: jonathanEmail,
      nombre: 'Jonathan Palacios',
      rol: 'SUPERADMIN',
      app_role_id: adminRole?.id
    }
  });
  console.log('Upserted Profile for Jonathan (SUPERADMIN)');

  // 2. Setup Ricardo
  let ricardoAuth = authUsers.users.find(u => u.email === ricardoEmail);
  if (ricardoAuth) {
    await prisma.profile.upsert({
      where: { auth_id: ricardoAuth.id },
      update: { rol: 'SUPERADMIN', app_role_id: adminRole?.id },
      create: {
        auth_id: ricardoAuth.id,
        email: ricardoEmail,
        nombre: 'Ricardo Zerpa',
        rol: 'SUPERADMIN',
        app_role_id: adminRole?.id
      }
    });
    console.log('Upserted Profile for Ricardo (SUPERADMIN)');
  }
}

async function main() {
  await migrateRoles();
  await setupUsers();
  await prisma.$disconnect();
  pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
