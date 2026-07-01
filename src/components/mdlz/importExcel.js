import * as XLSX from "xlsx";
import {
  applyMdlzImportRules,
  normalizeMdlzText,
  normalizeMdlzQtyPerCase,
  parseMdlzComponentCell,
} from "./importRules";

const readCell = (sheet, address) => sheet[address]?.v;

export const importMdlzExcel = async (file) => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const bomSku = normalizeMdlzText(readCell(sheet, "C4"));
  const bomDescription = normalizeMdlzText(readCell(sheet, "C5"));

  if (!bomSku || !bomDescription) {
    throw new Error(
      "Unable to read MDLZ SKU or description. Expected C4 = SKU and C5 = Description."
    );
  }

  const componentsToInsert = [];

  for (let row = 8; row <= 80; row += 1) {
    const componentCell = String(readCell(sheet, `A${row}`) || "").trim();
    const { primary, options } = parseMdlzComponentCell(componentCell);

    const componentDescription = normalizeMdlzText(readCell(sheet, `B${row}`));
    const type = normalizeMdlzText(readCell(sheet, `C${row}`));
    const qtyPerCase = normalizeMdlzQtyPerCase(readCell(sheet, `D${row}`));
    const uom = normalizeMdlzText(readCell(sheet, `E${row}`));
    const vendor = normalizeMdlzText(readCell(sheet, `F${row}`));
    const rejectPercent = String(readCell(sheet, `G${row}`) || "").trim();

    if (!primary || !type || !qtyPerCase) continue;

    componentsToInsert.push(
      applyMdlzImportRules({
        type,
        component_sku: primary,
        component_description: componentDescription,
        qty_per_case: qtyPerCase,
        uom,
        vendor,
        reject_percent: rejectPercent,
        shelf_life_months: null,
        component_options: options,
        inventory_pattern: null,
      })
    );
  }

  if (componentsToInsert.length === 0) {
    throw new Error("No MDLZ BOM components found.");
  }

  return {
    bomSku,
    bomDescription,
    componentsToInsert,
  };
};