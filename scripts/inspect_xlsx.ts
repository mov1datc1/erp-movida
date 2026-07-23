import * as xlsx from 'xlsx';
import * as path from 'path';

const excelFilePath = path.resolve(process.cwd(), '../RELACION DE GASTOS MES A MES - MOVIDA TCI.xlsx');
console.log(`Leyendo archivo: ${excelFilePath}`);

const workbook = xlsx.readFile(excelFilePath);
console.log('Hojas disponibles:', workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
  // Solo nos importan hojas con formato MM-YY (ej. 05-26) o similares, pero imprimimos todas
  console.log(`\n--- Hoja: ${sheetName} ---`);
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  // Imprimir solo las primeras 5 filas para entender estructura
  console.log(data.slice(0, 5));
}
