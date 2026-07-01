export const normalizeMdlzText = (value) =>
  String(value || "").trim().toUpperCase();

export const parseMdlzComponentCell = (value) => {
  const options = String(value || "")
    .split(",")
    .map((item) => normalizeMdlzText(item))
    .filter(Boolean);

  return {
    primary: options[0] || "",
    options: options.length > 1 ? options : null,
  };
};

export const normalizeMdlzQtyPerCase = (value) => {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/–/g, "-")
    .replace(/—/g, "-");
};

export const applyMdlzImportRules = (component) => {
  return {
    type: normalizeMdlzText(component.type) || "OTHER",
    component_sku: normalizeMdlzText(component.component_sku),
    component_description:
      normalizeMdlzText(component.component_description) || null,
    qty_per_case: normalizeMdlzQtyPerCase(component.qty_per_case),
    uom: normalizeMdlzText(component.uom) || null,
    vendor: normalizeMdlzText(component.vendor) || null,
    reject_percent: String(component.reject_percent || "").trim() || null,
    shelf_life_months: component.shelf_life_months ?? null,
    component_options: component.component_options || null,
    inventory_pattern: normalizeMdlzText(component.inventory_pattern) || null,
    selected_option: null,
  };
};