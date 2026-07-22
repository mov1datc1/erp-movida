import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../src/lib/prisma';

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

// Levenshtein distance for fuzzy matching
function getEditDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  return matrix[b.length][a.length];
}

async function main() {
  const dataDir = path.resolve(process.cwd(), '../datos_historicos');
  if (!fs.existsSync(dataDir)) {
    console.error(`No directory found: ${dataDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(dataDir).filter(f => f.toLowerCase().endsWith('.csv'));
  const namesI = new Set<string>();
  const namesE = new Set<string>();

  for (const file of files) {
    const content = fs.readFileSync(path.join(dataDir, file), 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      if (!line.startsWith('I;') && !line.startsWith('E;')) continue;
      const cols = line.split(';');
      const tipo = cols[0];
      const nombre = cols[2].trim();
      if (!nombre) continue;
      if (tipo === 'I') namesI.add(nombre);
      else if (tipo === 'E') namesE.add(nombre);
    }
  }

  const allClientes = await prisma.cliente.findMany();
  const allProveedores = await prisma.proveedor.findMany();

  console.log("# Análisis de Clientes (Ingresos)");
  console.log("| Nombre en CSV | Match Sugerido en ERP | Tipo de Match |");
  console.log("|---|---|---|");
  for (const name of Array.from(namesI).sort()) {
    const norm = normalizeName(name);
    let bestMatch = "";
    let bestDist = 999;
    for (const c of allClientes) {
      const cNorm = normalizeName(c.nombre);
      if (cNorm === norm) { bestMatch = c.nombre; bestDist = 0; break; }
      const dist = getEditDistance(norm, cNorm);
      if (dist < bestDist) { bestDist = dist; bestMatch = c.nombre; }
    }
    
    let status = bestDist === 0 ? "Exacto ✅" : (bestDist <= 3 ? "Similitud ⚠️" : "NUEVO 🆕");
    let matchName = bestDist <= 3 ? bestMatch : "(Crear Nuevo)";
    console.log(`| ${name} | ${matchName} | ${status} |`);
  }

  console.log("\n# Análisis de Proveedores (Egresos)");
  console.log("| Nombre en CSV | Match Sugerido en ERP | Tipo de Match |");
  console.log("|---|---|---|");
  for (const name of Array.from(namesE).sort()) {
    const norm = normalizeName(name);
    let bestMatch = "";
    let bestDist = 999;
    for (const p of allProveedores) {
      const pNorm = normalizeName(p.nombre);
      if (pNorm === norm) { bestMatch = p.nombre; bestDist = 0; break; }
      const dist = getEditDistance(norm, pNorm);
      if (dist < bestDist) { bestDist = dist; bestMatch = p.nombre; }
    }
    
    let status = bestDist === 0 ? "Exacto ✅" : (bestDist <= 3 ? "Similitud ⚠️" : "NUEVO 🆕");
    let matchName = bestDist <= 3 ? bestMatch : "(Crear Nuevo)";
    console.log(`| ${name} | ${matchName} | ${status} |`);
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
