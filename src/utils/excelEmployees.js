import * as XLSX from 'xlsx';

const ROLE_HEADERS = {
  AST: 'AST',
  QC: 'QC',
  OPERATORS: 'OP',
  'SUPPORT TEAM': 'SUPPORT',
  GUYS: 'LW',
  GIRLS: 'LW',
  DRIVERS: 'SUPPORT',
};

const GENDER_HEADERS = {
  GUYS: 'M',
  GIRLS: 'F',
};

export function cleanEmployeeName(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function normalizeHeader(value) {
  const text = cleanEmployeeName(value);
  if (text.startsWith('GIRLS')) return 'GIRLS';
  return text;
}

export async function readEmployeesFromExcel(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const employees = [];
  const seen = new Set();
  let currentSection = '';

  rows.forEach((row) => {
    const firstCell = cleanEmployeeName(row[0]);
    if (!firstCell) return;

    const possibleHeader = normalizeHeader(firstCell);

    if (ROLE_HEADERS[possibleHeader]) {
      currentSection = possibleHeader;
      return;
    }

    if (!currentSection) return;
    if (seen.has(firstCell)) return;

    seen.add(firstCell);

    employees.push({
      name: firstCell,
      active: true,
      role: ROLE_HEADERS[currentSection] || 'SUPPORT',
      gender: GENDER_HEADERS[currentSection] || null,
    });
  });

  return employees;
}
