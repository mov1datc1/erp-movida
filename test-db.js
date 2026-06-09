const { Client } = require('pg');

async function testConnection(name, connectionString) {
  console.log(`\nTesting ${name}...`);
  const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    console.log(`✅ SUCCESS: ${name} connected!`);
    await client.end();
    return true;
  } catch (error) {
    console.log(`❌ ERROR: ${name} failed. Message: ${error.message}`);
    return false;
  }
}

async function run() {
  const pw = 'Admin123';
  const encodedPw = encodeURIComponent(pw); // Admin123 is the same encoded, but just in case
  const projectRef = 'uurbizxxqoxkrtbjafiq';

  const strings = {
    'Direct DB (IPv6)': `postgresql://postgres:${pw}@db.${projectRef}.supabase.co:5432/postgres`,
    'Pooler aws-0 (Port 5432)': `postgresql://postgres.${projectRef}:${pw}@aws-0-us-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true`,
    'Pooler aws-0 (Port 6543)': `postgresql://postgres.${projectRef}:${pw}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`,
    'Pooler aws-1 (Port 5432)': `postgresql://postgres.${projectRef}:${pw}@aws-1-us-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true`,
    'Pooler aws-1 (Port 6543)': `postgresql://postgres.${projectRef}:${pw}@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`,
    'Pooler aws-0 NO TENANT': `postgresql://postgres:${pw}@aws-0-us-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true`,
  };

  for (const [name, url] of Object.entries(strings)) {
    await testConnection(name, url);
  }
  
  process.exit(0);
}

run();
