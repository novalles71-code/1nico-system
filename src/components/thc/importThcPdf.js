import * as pdfjsLib from "pdfjs-dist";
import { THC_RULES } from "./thcRules";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const normalizeText = (value) =>
  String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeUpper = (value) => normalizeText(value).toUpperCase();

const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeQty = (value) => {
  const clean = normalizeText(value).replace(/,/g, "");

  if (!clean) return "";

  const numericValue = Number(clean);

  if (!Number.isFinite(numericValue)) {
    return clean;
  }

  return String(numericValue);
};

const parseShelfLifeDays = (value, fallback = null) => {
  const clean = normalizeText(value);

  if (!clean) return fallback;

  const dayMatch = clean.match(/(\d+(?:\.\d+)?)\s*DAY/i);

  if (dayMatch) {
    const days = Number(dayMatch[1]);
    return Number.isFinite(days) ? Math.round(days) : fallback;
  }

  const numericValue = Number(clean);

  return Number.isFinite(numericValue)
    ? Math.round(numericValue)
    : fallback;
};

const parseQuantityAndUom = (value) => {
  const clean = normalizeUpper(value);

  if (!clean) {
    return {
      qty: "",
      uom: "",
    };
  }

  const match = clean.match(
    /^(-?\d+(?:\.\d+)?)\s*([A-Z][A-Z0-9]*)?$/
  );

  if (!match) {
    return {
      qty: normalizeQty(clean),
      uom: "",
    };
  }

  return {
    qty: normalizeQty(match[1]),
    uom: normalizeUpper(match[2]),
  };
};

const getFieldValue = (field) => {
  if (!field) return "";

  if (Array.isArray(field)) {
    for (const entry of field) {
      const value =
        entry?.value ??
        entry?.formattedValue ??
        entry?.defaultValue ??
        entry?.text ??
        "";

      if (normalizeText(value)) {
        return normalizeText(value);
      }
    }

    return "";
  }

  if (typeof field === "object") {
    return normalizeText(
      field.value ??
        field.formattedValue ??
        field.defaultValue ??
        field.text ??
        ""
    );
  }

  return normalizeText(field);
};

const flattenFieldObjects = (fieldObjects = {}) => {
  const fields = {};

  Object.entries(fieldObjects).forEach(([fieldName, field]) => {
    fields[fieldName] = getFieldValue(field);
  });

  return fields;
};

const findFieldEntries = (fields, patterns) =>
  Object.entries(fields).filter(([fieldName, value]) => {
    if (!normalizeText(value)) return false;

    return patterns.some((pattern) => pattern.test(fieldName));
  });

const findFirstFieldValue = (fields, patterns) => {
  const match = findFieldEntries(fields, patterns)[0];
  return match ? normalizeText(match[1]) : "";
};

const getComponentType = ({ description, section }) => {
  const text = normalizeUpper(description);

  if (section === "PRODUCT") {
    return "FEEDSTOCK";
  }

  if (
    text.includes("ZIPPER") ||
    text.includes("ZIP LOCK") ||
    text.includes("ZIPLOC")
  ) {
    return "ZIPPER";
  }

  if (
    text.includes("FILM") ||
    text.includes("OVERWRAP") ||
    text.includes("OVR,") ||
    text.startsWith("OVR ") ||
    text.includes("BRSTK") ||
    text.includes("BOARDSTOCK") ||
    text.includes("WEB")
  ) {
    return "FILM";
  }

  if (
    text.includes("CORRUGATE") ||
    text.includes("CARTON") ||
    text.includes("CASE") ||
    text.startsWith("CA,") ||
    text.startsWith("CA ") ||
    text.includes("DISPLAY") ||
    text.includes("TRAY")
  ) {
    return "CORRUGATE";
  }

  return "OTHER";
};

const getRowIndexes = (fields, assemblyNames) => {
  const indexes = new Set();

  Object.keys(fields).forEach((fieldName) => {
    const belongsToAssembly = assemblyNames.some((assemblyName) =>
      fieldName.toUpperCase().includes(assemblyName.toUpperCase())
    );

    if (!belongsToAssembly) return;

    const matches = [
      ...fieldName.matchAll(/DATA\[(\d+)\]/gi),
      ...fieldName.matchAll(/ROW\[(\d+)\]/gi),
      ...fieldName.matchAll(/ITEM\[(\d+)\]/gi),
    ];

    matches.forEach((match) => {
      const index = Number(match[1]);

      if (Number.isFinite(index)) {
        indexes.add(index);
      }
    });
  });

  return Array.from(indexes).sort((a, b) => a - b);
};

const findRowValue = ({
  fields,
  assemblyNames,
  rowIndex,
  fieldKeys,
}) => {
  const rowPatterns = [
    `DATA\\[${rowIndex}\\]`,
    `ROW\\[${rowIndex}\\]`,
    `ITEM\\[${rowIndex}\\]`,
  ];

  for (const [fieldName, value] of Object.entries(fields)) {
    if (!normalizeText(value)) continue;

    const belongsToAssembly = assemblyNames.some((assemblyName) =>
      fieldName.toUpperCase().includes(assemblyName.toUpperCase())
    );

    if (!belongsToAssembly) continue;

    const belongsToRow = rowPatterns.some((rowPattern) =>
      new RegExp(rowPattern, "i").test(fieldName)
    );

    if (!belongsToRow) continue;

    const matchesFieldKey = fieldKeys.some((fieldKey) =>
      new RegExp(escapeRegex(fieldKey), "i").test(fieldName)
    );

    if (matchesFieldKey) {
      return normalizeText(value);
    }
  }

  return "";
};

const buildAssemblyRows = ({
  fields,
  assemblyNames,
  section,
}) => {
  const rowIndexes = getRowIndexes(fields, assemblyNames);
  const components = [];

  rowIndexes.forEach((rowIndex) => {
    const componentSku = findRowValue({
      fields,
      assemblyNames,
      rowIndex,
      fieldKeys: [
        "MATNR[0]",
        "MATERIAL[0]",
        "COMPONENT[0]",
        "COMPONENT_MATERIAL[0]",
      ],
    });

    const description = findRowValue({
      fields,
      assemblyNames,
      rowIndex,
      fieldKeys: [
        "TDLINE[0]",
        "DESCRIPTION[0]",
        "MATERIAL_DESC[0]",
        "COMPONENT_DESC[0]",
      ],
    });

    const quantityValue = findRowValue({
      fields,
      assemblyNames,
      rowIndex,
      fieldKeys: [
        "QUANTITY[0]",
        "QTY[0]",
        "COMP_QTY[0]",
      ],
    });

    const directUom = findRowValue({
      fields,
      assemblyNames,
      rowIndex,
      fieldKeys: [
        "UOM[0]",
        "MEINS[0]",
        "UNIT[0]",
      ],
    });

    const shelfLifeValue = findRowValue({
      fields,
      assemblyNames,
      rowIndex,
      fieldKeys: [
        "SHELF_LIFE[0]",
        "SHELFLIFE[0]",
        "SHELF LIFE[0]",
      ],
    });

    if (!componentSku || !quantityValue) return;

    const parsedQuantity = parseQuantityAndUom(quantityValue);
    const qty = parsedQuantity.qty;
    const uom = normalizeUpper(directUom || parsedQuantity.uom);

    if (!qty) return;

    const requiresShelfLife = section === "PRODUCT";

    components.push({
      type: getComponentType({
        description,
        section,
      }),
      component_sku: normalizeUpper(componentSku),
      component_description: normalizeUpper(description),
      qty_per_case: qty,
      uom,
      component_options: "",
      inventory_pattern: normalizeUpper(componentSku),
      inventory_regex: "",
      selected_option: "",
      search_mode: "EXACT",
      requires_shelf_life: requiresShelfLife,
      shelf_life_days: requiresShelfLife
        ? parseShelfLifeDays(
            shelfLifeValue,
            THC_RULES.finishedProductShelfLifeDays
          )
        : null,
      minimum_remaining_days: requiresShelfLife
        ? THC_RULES.minimumRemainingShelfLifeDays
        : null,
    });
  });

  return components;
};

const cleanComponentDescription = (value) => {
  const clean = normalizeUpper(value)
    .replace(/^[\s\-–—_=.*]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return clean;
};

const isInvalidDescription = (value) => {
  const clean = normalizeText(value);

  if (!clean) return true;

  // Ignore separator rows such as:
  // -----------------------
  // =======================
  // .......................
  return /^[\s\-–—_=.*]+$/.test(clean);
};

const getDescriptionScore = (value) => {
  const clean = cleanComponentDescription(value);

  if (!clean || isInvalidDescription(value)) {
    return 0;
  }

  let score = clean.length;

  // Prefer descriptions containing letters and meaningful words.
  if (/[A-Z]/i.test(clean)) score += 20;
  if (clean.split(/\s+/).length > 1) score += 10;

  return score;
};

const mergeDuplicateComponent = (current, candidate) => {
  const currentDescriptionScore = getDescriptionScore(
    current.component_description
  );

  const candidateDescriptionScore = getDescriptionScore(
    candidate.component_description
  );

  const preferred =
    candidateDescriptionScore > currentDescriptionScore
      ? candidate
      : current;

  const secondary = preferred === candidate ? current : candidate;

  return {
    ...secondary,
    ...preferred,

    component_description:
      cleanComponentDescription(preferred.component_description) ||
      cleanComponentDescription(secondary.component_description),

    type:
      preferred.type && preferred.type !== "OTHER"
        ? preferred.type
        : secondary.type || "OTHER",

    inventory_pattern:
      preferred.inventory_pattern ||
      secondary.inventory_pattern ||
      preferred.component_sku ||
      secondary.component_sku,

    inventory_regex:
      preferred.inventory_regex ||
      secondary.inventory_regex ||
      "",

    search_mode:
      preferred.search_mode ||
      secondary.search_mode ||
      "EXACT",

    requires_shelf_life:
      Boolean(preferred.requires_shelf_life) ||
      Boolean(secondary.requires_shelf_life),

    shelf_life_days:
      preferred.shelf_life_days ??
      secondary.shelf_life_days ??
      null,

    minimum_remaining_days:
      preferred.minimum_remaining_days ??
      secondary.minimum_remaining_days ??
      null,
  };
};

const removeDuplicateComponents = (components) => {
  const groupedComponents = new Map();

  components.forEach((rawComponent) => {
    const component = {
      ...rawComponent,
      component_sku: normalizeUpper(rawComponent.component_sku),
      component_description: cleanComponentDescription(
        rawComponent.component_description
      ),
      qty_per_case: normalizeQty(rawComponent.qty_per_case),
      uom: normalizeUpper(rawComponent.uom),
    };

    if (!component.component_sku || !component.qty_per_case) {
      return;
    }

    const key = [
      component.component_sku,
      component.qty_per_case,
      component.uom,
    ].join("||");

    const existingComponent = groupedComponents.get(key);

    if (!existingComponent) {
      groupedComponents.set(key, component);
      return;
    }

    groupedComponents.set(
      key,
      mergeDuplicateComponent(existingComponent, component)
    );
  });

  return Array.from(groupedComponents.values());
};

const extractVisiblePages = async (pdf) => {
  const pages = [];

  for (
    let pageNumber = 1;
    pageNumber <= pdf.numPages;
    pageNumber += 1
  ) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    const items = content.items
      .map((item) => ({
        text: normalizeText(item.str),
        x: Number(item.transform?.[4] || 0),
        y: Number(item.transform?.[5] || 0),
      }))
      .filter((item) => item.text);

    pages.push({
      pageNumber,
      items,
      text: items.map((item) => item.text).join("\n"),
    });
  }

  return pages;
};

const getAllVisibleText = (pages) =>
  pages.map((page) => page.text).join("\n");

const findProductFromVisibleText = (visibleText) => {
  const text = normalizeText(visibleText);

  const skuPatterns = [
    /\b(\d{4,}-\d{4,}-\d{3})\b/,
    /\b(\d{5,}-\d{3,}-\d{3})\b/,
    /\b(\d{4,}-\d{3,}-\d{3})\b/,
  ];

  let sku = "";

  for (const pattern of skuPatterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      sku = normalizeUpper(match[1]);
      break;
    }
  }

  let description = "";

  const productPatterns = [
    /PRODUCT\s+SAP DESCRIPTION\s+SHELF LIFE\s+[A-Z0-9-]+\s+(.+?)\s+\d+\s*DAY/i,
    /SAP DESCRIPTION\s+SHELF LIFE\s+[A-Z0-9-]+\s+(.+?)\s+\d+\s*DAY/i,
    /MATERIAL\s+SAP DESCRIPTION\s+SHELF LIFE\s+[A-Z0-9-]+\s+(.+?)\s+\d+\s*DAY/i,
  ];

  for (const pattern of productPatterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      description = normalizeUpper(match[1]);
      break;
    }
  }

  const shelfLifeMatch = text.match(/(\d+)\s*DAY/i);

  return {
    sku,
    description,
    shelfLifeDays: parseShelfLifeDays(
      shelfLifeMatch?.[0],
      THC_RULES.finishedProductShelfLifeDays
    ),
  };
};

const splitVisibleTextIntoSections = (visibleText) => {
  const lines = String(visibleText || "")
    .split(/\r?\n/)
    .map(normalizeText)
    .filter(Boolean);

  const sections = {
    productAssembly: [],
    packagingAssembly: [],
  };

  let currentSection = null;

  lines.forEach((line) => {
    const upper = normalizeUpper(line);

    if (
      upper.includes("PRODUCT ASSEMBLY") ||
      upper.includes("PRODUCTS ASSEMBLY") ||
      upper.includes("PROD ASSEMBLY")
    ) {
      currentSection = "productAssembly";
      return;
    }

    if (
      upper.includes("PACKAGING ASSEMBLY") ||
      upper.includes("PACKAGE ASSEMBLY") ||
      upper.includes("PACK ASSM")
    ) {
      currentSection = "packagingAssembly";
      return;
    }

    if (
      upper.includes("QUALITY REQUIREMENTS") ||
      upper.includes("PALLET CONFIGURATION") ||
      upper.includes("REVISION HISTORY") ||
      upper.includes("DOCUMENT CONTROL")
    ) {
      currentSection = null;
      return;
    }

    if (currentSection) {
      sections[currentSection].push(line);
    }
  });

  return sections;
};

const parseVisibleAssemblyLines = (lines, section) => {
  const components = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = normalizeText(lines[index]);

    const skuMatch = line.match(
      /\b([A-Z0-9]+(?:-[A-Z0-9]+){1,4})\b/i
    );

    if (!skuMatch?.[1]) continue;

    const componentSku = normalizeUpper(skuMatch[1]);

    const combined = [
      line,
      lines[index + 1] || "",
      lines[index + 2] || "",
    ]
      .map(normalizeText)
      .join(" ");

    const qtyMatch = combined.match(
      /\b(\d+(?:\.\d+)?)\s+(EA|CS|LB|YD|FT|IN|KG|G|OZ|RL|ROLL|PC|PCS)\b/i
    );

    if (!qtyMatch) continue;

    const qty = normalizeQty(qtyMatch[1]);
    const uom = normalizeUpper(qtyMatch[2]);

    const description = normalizeUpper(
      combined
        .replace(componentSku, "")
        .replace(qtyMatch[0], "")
        .replace(/\b\d+\s*DAY\b/gi, "")
        .trim()
    );

    const shelfLifeMatch = combined.match(/\b(\d+)\s*DAY\b/i);
    const requiresShelfLife = section === "PRODUCT";

    components.push({
      type: getComponentType({
        description,
        section,
      }),
      component_sku: componentSku,
      component_description: description,
      qty_per_case: qty,
      uom,
      component_options: "",
      inventory_pattern: componentSku,
      inventory_regex: "",
      selected_option: "",
      search_mode: "EXACT",
      requires_shelf_life: requiresShelfLife,
      shelf_life_days: requiresShelfLife
        ? parseShelfLifeDays(
            shelfLifeMatch?.[0],
            THC_RULES.finishedProductShelfLifeDays
          )
        : null,
      minimum_remaining_days: requiresShelfLife
        ? THC_RULES.minimumRemainingShelfLifeDays
        : null,
    });
  }

  return components;
};

const getProductData = ({
  fields,
  visibleText,
}) => {
  const visibleFallback =
    findProductFromVisibleText(visibleText);

  const sku =
    findFirstFieldValue(fields, [
      /\.SF_PRODUCT.*\.MATERIAL\[0\]$/i,
      /\.PRODUCT.*\.MATERIAL\[0\]$/i,
      /\.MATERIAL\[0\]$/i,
    ]) || visibleFallback.sku;

  const description =
    findFirstFieldValue(fields, [
      /\.SF_PRODUCT.*\.MATERIAL_DESC\[0\]$/i,
      /\.PRODUCT.*\.MATERIAL_DESC\[0\]$/i,
      /\.MATERIAL_DESC\[0\]$/i,
      /\.SAP_DESCRIPTION\[0\]$/i,
    ]) || visibleFallback.description;

  const shelfLifeValue = findFirstFieldValue(fields, [
    /\.SF_PRODUCT.*\.SHELF_LIFE\[0\]$/i,
    /\.PRODUCT.*\.SHELF_LIFE\[0\]$/i,
    /\.SHELF_LIFE\[0\]$/i,
  ]);

  return {
    sku: normalizeUpper(sku),
    description: normalizeUpper(description),
    shelfLifeDays: parseShelfLifeDays(
      shelfLifeValue,
      visibleFallback.shelfLifeDays
    ),
  };
};

export async function importThcPdf(file) {
  if (!file) {
    throw new Error("No PDF file selected.");
  }

  if (!String(file.name || "").toLowerCase().endsWith(".pdf")) {
    throw new Error("THC BOM files must be PDF documents.");
  }

  const arrayBuffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    enableXfa: true,
    useSystemFonts: true,
  }).promise;

  const rawFieldObjects =
    typeof pdf.getFieldObjects === "function"
      ? await pdf.getFieldObjects()
      : {};

  const fields = flattenFieldObjects(rawFieldObjects || {});
  const visiblePages = await extractVisiblePages(pdf);
  const visibleText = getAllVisibleText(visiblePages);

  const product = getProductData({
    fields,
    visibleText,
  });

  if (!product.sku) {
    throw new Error(
      "Unable to identify the finished-good SKU in the THC PDF."
    );
  }

  if (!product.description) {
    throw new Error(
      "Unable to identify the finished-good description in the THC PDF."
    );
  }

  const productAssemblyNames = [
    "ET_PROD_ASSEMBLY",
    "ET_PRODUCT_ASSEMBLY",
    "PRODUCT_ASSEMBLY",
    "PROD_ASSEMBLY",
  ];

  const packagingAssemblyNames = [
    "ET_PACK_ASSM",
    "ET_PACK_ASSEMBLY",
    "PACKAGING_ASSEMBLY",
    "PACKAGE_ASSEMBLY",
  ];

  let productComponents = buildAssemblyRows({
    fields,
    assemblyNames: productAssemblyNames,
    section: "PRODUCT",
  });

  let packagingComponents = buildAssemblyRows({
    fields,
    assemblyNames: packagingAssemblyNames,
    section: "PACKAGING",
  });

  if (
    productComponents.length === 0 ||
    packagingComponents.length === 0
  ) {
    const visibleSections =
      splitVisibleTextIntoSections(visibleText);

    if (productComponents.length === 0) {
      productComponents = parseVisibleAssemblyLines(
        visibleSections.productAssembly,
        "PRODUCT"
      );
    }

    if (packagingComponents.length === 0) {
      packagingComponents = parseVisibleAssemblyLines(
        visibleSections.packagingAssembly,
        "PACKAGING"
      );
    }
  }

  const components = removeDuplicateComponents([
    ...productComponents,
    ...packagingComponents,
  ]);

  if (components.length === 0) {
    throw new Error(
      "The THC PDF was opened, but no Product Assembly or Packaging Assembly components were found."
    );
  }

  return {
    customer: THC_RULES.customer,
    sku: product.sku,
    description: product.description,
    shelf_life_days:
      product.shelfLifeDays ||
      THC_RULES.finishedProductShelfLifeDays,
    minimum_remaining_days:
      THC_RULES.minimumRemainingShelfLifeDays,
    source_type: THC_RULES.sourceType,
    source_file_name: file.name,
    components,
  };
}