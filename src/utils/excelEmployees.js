import * as XLSX from 'xlsx';

export function cleanEmployeeName(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

export function detectGender(value) {
  const text = String(value || '').trim().toUpperCase();

  if (['M', 'MALE', 'MASCULINO', 'HOMBRE'].includes(text)) return 'M';
  if (['F', 'FEMALE', 'FEMENINO', 'MUJER'].includes(text)) return 'F';

  return null;
}

export async function readEmployeesFromExcel(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const employees = [];
  const seen = new Set();

  rows.forEach((row) => {
    const possibleName = row.find((cell) => {
      const value = cleanEmployeeName(cell);
      return value && value.length > 5 && !value.includes('NAME');
    });

    if (!possibleName) return;

    const name = cleanEmployeeName(possibleName);
    if (seen.has(name)) return;

    const genderCell = row.find((cell) => detectGender(cell));

    employees.push({
      name,
      gender: detectGender(genderCell),
    });

    seen.add(name);
  });

  return employees;
}