import fs from 'fs';
import path from 'path';
import { Prioridad, TareaStatus } from '@prisma/client';
import { prisma } from '../src/lib/prisma';

// This script expects a CSV where columns are separated by commas.
// To handle commas inside quotes, we need a small CSV parser.
function parseCSVRow(text: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && text[i + 1] === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Map Priority from CSV
function mapPrioridad(p: string): Prioridad {
  const pLower = p.toLowerCase().trim();
  if (pLower === 'alta') return 'ALTA';
  if (pLower === 'urgente') return 'URGENTE';
  if (pLower === 'baja') return 'BAJA';
  return 'MEDIA';
}

// Map Status from CSV
function mapStatus(s: string): TareaStatus {
  const sLower = s.toLowerCase().trim();
  if (sLower === 'listo' || sLower === 'completado' || sLower === 'cerrado') return 'COMPLETADA';
  if (sLower === 'on hold') return 'ON_HOLD';
  if (sLower === 'en curso') return 'EN_CURSO';
  return 'PENDIENTE';
}

// Parse comments and dates
// Pattern like "26/01 - Cerrado. Configurado Funnel e ventas." or "26/01/ - Confirmado"
function extractComments(text: string): { fecha: Date; texto: string }[] {
  const block = text.trim();
  if (!block) return [];

  const comments: { fecha: Date; texto: string }[] = [];
  // Split by regex that looks for DD/MM or DD-MM at the start of a line or after space
  // We'll do a simpler approach: assume lines or blocks that start with a date.
  
  // Since the dates don't usually have years, we'll assume current year or 2026 for now
  const defaultYear = new Date().getFullYear();

  // Regex matches DD/MM, DD-MM, DD/MM/YYYY
  const dateRegex = /(?:^|\n)\s*(\d{2}[\/\-]\d{2}(?:[\/\-]\d{2,4})?)\s*[-\/]?\s*(.*?)(?=(?:\n\s*\d{2}[\/\-]\d{2}|$))/gs;
  
  let match;
  let hasMatches = false;
  while ((match = dateRegex.exec(block)) !== null) {
    hasMatches = true;
    const dateStr = match[1];
    let content = match[2].trim();
    
    // Parse dateStr (e.g. 26/01)
    let day = 1;
    let month = 0; // 0-indexed
    let year = defaultYear;
    
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length >= 2) {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      if (parts.length === 3 && parts[2]) {
        year = parts[2].length === 2 ? 2000 + parseInt(parts[2], 10) : parseInt(parts[2], 10);
      }
    }
    
    const parsedDate = new Date(year, month, day, 12, 0, 0);
    
    comments.push({
      fecha: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
      texto: content
    });
  }

  // If no date pattern matched, just push the whole block as one comment today
  if (!hasMatches) {
    comments.push({ fecha: new Date(), texto: block });
  }

  // Reverse to make oldest first, or just leave them. The regex scans top to bottom.
  // Actually, usually newest is at the top in logs. If we want them inserted in historical order, we reverse.
  return comments.reverse();
}

async function main() {
  const filePath = path.join(__dirname, '../tareas_import.csv');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  
  const lines = fileContent.split('\n');
  
  // Skip the first 7 rows (metrics)
  const dataLines = lines.slice(7);
  
  // Row 8 is header in some files, but in our output it looks like row 8 is already data!
  const header = parseCSVRow(dataLines[0]);
  console.log("First Row:", header);

  let count = 0;

  for (let i = 0; i < dataLines.length; i++) {
    const rowStr = dataLines[i].trim();
    if (!rowStr) continue;
    
    const row = parseCSVRow(rowStr);
    const proyectoNombre = row[0]?.trim();
    const titulo = row[1]?.trim();
    const encargadosRaw = row[2]?.trim();
    const prioridadStr = row[6]?.trim();
    const estatusStr = row[7]?.trim();
    const comentariosRaw = row[10]?.trim();

    // skip if titulo is empty or if it's actually the header row
    if (!titulo || titulo.toLowerCase() === 'descripción') continue; 

    console.log(`Importing: ${titulo}`);

    // 1. Get or Create Cliente
    let clienteId = null;
    if (proyectoNombre) {
      let cliente = await prisma.cliente.findFirst({ where: { nombre: proyectoNombre } });
      if (!cliente) {
        cliente = await prisma.cliente.create({ data: { nombre: proyectoNombre, estatus: 'ACTIVO' } });
      }
      clienteId = cliente.id;
    }

    // 2. Get or Create Encargados
    const encargadosToConnect: { id: string }[] = [];
    if (encargadosRaw) {
      const names = encargadosRaw.split(/[\/,]/).map(n => n.trim()).filter(n => n);
      for (const name of names) {
        let encargado = await prisma.encargado.findUnique({ where: { nombre: name } });
        if (!encargado) {
          encargado = await prisma.encargado.create({ data: { nombre: name } });
        }
        encargadosToConnect.push({ id: encargado.id });
      }
    }

    // 3. Create Tarea
    const tarea = await prisma.tarea.create({
      data: {
        titulo,
        cliente_id: clienteId,
        prioridad: mapPrioridad(prioridadStr || ''),
        estatus: mapStatus(estatusStr || ''),
        encargados: {
          connect: encargadosToConnect
        }
      }
    });

    // 4. Parse and Insert Comments
    if (comentariosRaw) {
      const historicalComments = extractComments(comentariosRaw);
      for (const comment of historicalComments) {
        if (comment.texto) {
          await prisma.comentarioTarea.create({
            data: {
              texto: comment.texto,
              createdAt: comment.fecha,
              tarea_id: tarea.id
            }
          });
        }
      }
    }

    count++;
  }

  console.log(`\n✅ Importación Finalizada. ${count} tareas importadas con éxito.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
