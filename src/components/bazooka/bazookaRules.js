export const BAZOOKA_DEFAULT_SHELF_LIFE_MONTHS = 8;

export function normalizeText(value) {
  return String(value || "")
    .replace(/\r/g, "\n")
    .replace(/[–—]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'");
}

export function normalizeLines(text) {
  return normalizeText(text)
    .split("\n")
    .map((line) => line.replace(/\.{2,}/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export function getBazookaShelfLifeMonths(fullText) {
  const text = normalizeText(fullText);
  const match = text.match(
    /(?:at least|minimum of|minimum)\s+(\d+)\s+months?\s+of\s+remaining\s+shelf\s+life/i
  );

  return Number(match?.[1] || BAZOOKA_DEFAULT_SHELF_LIFE_MONTHS);
}

// Alias para que funcione con el parser nuevo
export function getShelfLifeMonths(fullText) {
  return getBazookaShelfLifeMonths(fullText);
}

export function completeBazookaPattern(displayCode, patternCode) {
  const display = String(displayCode || "")
    .trim()
    .toUpperCase()
    .replace(/\*/g, "");

  let pattern = String(patternCode || "")
    .trim()
    .toUpperCase()
    .replace(/\*/g, "");

  if (!pattern) return display;

  if (pattern.startsWith("-")) {
    const prefix = display.includes("-")
      ? display.slice(0, display.lastIndexOf("-"))
      : display;

    pattern = `${prefix}${pattern}`;
  }

  return pattern;
}

export function getBazookaComponentType(code) {
  const cleanCode = String(code || "").trim().toUpperCase();

  if (/^BCBP/.test(cleanCode)) return "CORRUGATE";
  if (/^0-/.test(cleanCode)) return "CORRUGATE";
  if (/^2-/.test(cleanCode)) return "CORRUGATE";

  if (/^BCBW/.test(cleanCode)) return "FEEDSTOCK";
  if (/^NFS-/.test(cleanCode)) return "FEEDSTOCK";
  if (/^BCBG/.test(cleanCode)) return "FEEDSTOCK";
  if (/^\d+-/.test(cleanCode)) return "FEEDSTOCK";

  return "OTHER";
}

export function requiresBazookaShelfLife(code, type) {
  const cleanType = String(type || "").trim().toUpperCase();
  const cleanCode = String(code || "").trim().toUpperCase();

  if (["CORRUGATE", "FILM", "ZIPPER", "PACKAGING"].includes(cleanType)) {
    return false;
  }

  if (/^BCBP/.test(cleanCode)) return false;
  if (/^0-/.test(cleanCode)) return false;
  if (/^2-/.test(cleanCode)) return false;

  return true;
}

export function isValidNumber(value) {
  const n = Number(String(value || "").replace(/,/g, ""));
  return Number.isFinite(n) && n > 0;
}

export function buildBazookaInventoryRegex(pattern) {
  const cleanPattern = String(pattern || "").trim().toUpperCase();

  if (!cleanPattern.includes("XX")) return null;

  const escaped = cleanPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return `^${escaped.replace(/XX+/g, (match) => `[0-9]{${match.length}}`)}$`;
}