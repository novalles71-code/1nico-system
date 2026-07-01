import * as XLSX from "xlsx";

const normalizeText = (value) => String(value || "").trim().toUpperCase();

const normalizeQtyPerCase = (value) => {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/–/g, "-")
    .replace(/—/g, "-");
};

const splitComponentOptions = (value) => {
  return String(value || "")
    .split(",")
    .map((item) => normalizeText(item))
    .filter(Boolean);
};

const getPrimarySku = (value) => {
  const options = splitComponentOptions(value);
  return options[0] || "";
};

const getComponentOptions = (value) => {
  const options = splitComponentOptions(value);
  return options.length > 1 ? options : null;
};

export async function importBazookaExcel(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const skuLabel = normalizeText(sheet["A1"]?.v);
  const descriptionLabel = normalizeText(sheet["A2"]?.v);
  const componentHeader = normalizeText(sheet["A4"]?.v);
  const qtyHeader = normalizeText(sheet["B4"]?.v);

  const isBazookaFormat =
    skuLabel === "FINISHED GOOD MATERIAL SKU" &&
    descriptionLabel === "FINISHED GOOD MATERIAL DESCRIPTION" &&
    componentHeader === "COMPONENT SKU" &&
    qtyHeader === "QUANTITY (PER CASE)";

  if (!isBazookaFormat) {
    throw new Error(
      "Invalid BAZOOKA BOM format. Expected A1 Finished Good Material SKU, A2 Finished Good Material Description, A4 Component SKU, B4 Quantity (per case)."
    );
  }

  const productSku = normalizeText(sheet["B1"]?.v);
  const productDescription = normalizeText(sheet["B2"]?.v);

  if (!productSku || !productDescription) {
    throw new Error("BAZOOKA BOM is missing Finished Good SKU or Description.");
  }

  const components = [];

  for (let row = 5; row <= 500; row += 1) {
    const componentSkuCell = String(sheet[`A${row}`]?.v || "").trim();
    const qtyPerCase = normalizeQtyPerCase(sheet[`B${row}`]?.v);

    const componentSku = getPrimarySku(componentSkuCell);
    const componentOptions = getComponentOptions(componentSkuCell);

    if (!componentSku && !qtyPerCase) continue;
    if (!componentSku || !qtyPerCase) continue;

    components.push({
      type: "OTHER",
      component_sku: componentSku,
      component_description: null,
      qty_per_case: qtyPerCase,
      uom: null,
      vendor: null,
      reject_percent: null,
      shelf_life_months: null,
      component_options: componentOptions,
      inventory_pattern: null,
      selected_option: null,
    });
  }

  if (components.length === 0) {
    throw new Error("No BAZOOKA BOM components found.");
  }

  return {
    customer: "BAZOOKA",
    bomSku: productSku,
    bomDescription: productDescription,
    componentsToInsert: components,
  };
}