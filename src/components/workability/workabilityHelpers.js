export const SYSTEM_LABEL = "Workability";
export const FILTER_NONE = "__NONE__";
export const SITE_ALL = "ALL_RELATED";

export const SITE_OPTIONS_BY_CUSTOMER = {
  MDLZ: [
    "MDLZ8",
    "MDLZ8 HOLD",
    "MDLZ9",
    "MDLZ9 HOLD",
    "MDLZ9 REL HOLD",
  ],
  BAZOOKA: [
    "TOPPS",
    "TOPPS PXP",
    "TOPPS DEFECTIVE",
    "TOPPS HOLD",
    "TOPPS INV",
    "TOPPS ML6",
    "TOPPS ML6 AVL",
    "TOPPS ML6 AVL PK",
    "TOPPS ML6 DEFECTIVE",
    "TOPPS ML6 HOLD",
    "TOPPS ML6 PXP",
    "TOPPS ML6 WP",
    "TOPPS ML6 AVL",
    "TOPPS ML7 OF",
    "TOPPS ML7 OF PXP",
    "TOPPS ML8 AVL",
    "TOPPS ML8 AVL PK",
    "TOPPS ML8 DEF",
    "TOPPS ML8 DMG PK",
    "TOPPS ML8 HLD",
    "TOPPS ML8 INB",
    "TOPPS ML8 PXP",
    "TOPPS ML8 RTN",
    "TOPPS ML8 SLS",
    "TOPPS ML8 SMP",
    "TOPPS ML8 WP",
  ],
  THC: [
    "THC",
    "THC HOLD",
    "THC ML6",
    "THC ML6 DEFECTIVE",
    "THC ML6 HOLD",
  ],
};

export const DEFAULT_SITE_BY_CUSTOMER = {
  MDLZ: "MDLZ8",
  BAZOOKA: "TOPPS ML6",
  THC: "THC ML6",
};

export const normalizeKey = (value) => String(value || "").trim().toUpperCase();

export const normalizeCustomerCode = (customerCode) => {
  const code = normalizeKey(customerCode);

  if (code.includes("BAZOOKA") || code.includes("TOPPS")) return "BAZOOKA";
  if (code.includes("MDLZ")) return "MDLZ";
  if (code.includes("THC")) return "THC";

  return code;
};

export const getSitesForCustomer = (customerCode) => {
  const key = normalizeCustomerCode(customerCode);
  return SITE_OPTIONS_BY_CUSTOMER[key] || [];
};

export const getDefaultSiteForCustomer = (customerCode) => {
  const key = normalizeCustomerCode(customerCode);
  const sites = getSitesForCustomer(customerCode);
  return DEFAULT_SITE_BY_CUSTOMER[key] || sites[0] || SITE_ALL;
};

export const parseOptions = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map(normalizeKey).filter(Boolean);
  }

  if (typeof value === "string") {
    const clean = value.trim();
    if (!clean) return [];

    try {
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed)) return parsed.map(normalizeKey).filter(Boolean);
    } catch {
      // New Workability V2 rule: Excel options are separated by comma.
    }

    return clean
      .split(",")
      .map(normalizeKey)
      .filter(Boolean);
  }

  return [];
};

export const parseQtyOptions = (value) => {
  if (value === undefined || value === null) return [];

  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  return String(value)
    .split("-")
    .map((item) => item.trim())
    .filter(Boolean);
};

export const getComponentOptionRows = (component) => {
  const componentSku = normalizeKey(component.component_sku);
  const optionSkus = parseOptions(component.component_options);

  const skus = Array.from(
    new Set([componentSku, ...optionSkus].map(normalizeKey).filter(Boolean))
  );

  const qtyList = parseQtyOptions(component.qty_per_case);
  const fallbackQty = qtyList[0] || component.qty_per_case || "";

  return skus.map((sku, index) => ({
    sku,
    qtyPerCase: qtyList[index] || fallbackQty,
    index,
  }));
};

export const getComponentOptions = (component) => {
  const rows = getComponentOptionRows(component);
  const options = rows.map((row) => row.sku);

  const pattern = normalizeKey(component.inventory_pattern);
  if (pattern && !pattern.includes("XX")) options.push(pattern);

  return Array.from(new Set(options.filter(Boolean)));
};

export const getQtyPerCaseForComponentOption = (component, itemSku = null) => {
  const rows = getComponentOptionRows(component);
  const normalizedSku = normalizeKey(itemSku);

  if (!rows.length) return component.qty_per_case || 0;

  if (!normalizedSku) return rows[0].qtyPerCase || component.qty_per_case || 0;

  const found = rows.find((row) => row.sku === normalizedSku);
  return found?.qtyPerCase || rows[0].qtyPerCase || component.qty_per_case || 0;
};

export const getSelectedSkuForBomComponent = (component, selectedOptions = {}) => {
  const options = getComponentOptions(component);

  return (
    normalizeKey(selectedOptions[component.id]) ||
    options[0] ||
    normalizeKey(component.component_sku)
  );
};

export const buildInventoryItems = (bomComponents) => {
  const items = [];

  (bomComponents || []).forEach((component) => {
    getComponentOptions(component).forEach((option) => items.push(option));

    const pattern = normalizeKey(component.inventory_pattern);
    if (pattern && !pattern.includes("XX")) items.push(pattern);
  });

  return Array.from(new Set(items.filter(Boolean)));
};

export const getLocationValue = (row, inv = {}) => {
  return (
    row.Location ||
    row.location ||
    row.binLocation ||
    row.bin_location ||
    row.warehouseLocation ||
    row.warehouse_location ||
    row.inventoryLocation ||
    row.inventory_location ||
    row.loc ||
    row.LOC ||
    inv.Location ||
    inv.location ||
    ""
  );
};

export const getSiteValue = (row, inv = {}) => {
  return (
    row.Site ||
    row.site ||
    row.siteCode ||
    row.site_code ||
    row.warehouse ||
    row.Warehouse ||
    inv.Site ||
    inv.site ||
    inv.siteCode ||
    inv.site_code ||
    ""
  );
};

export const isAllowedSiteForCustomer = (site, customerCode) => {
  const normalizedSite = normalizeKey(site);
  const sites = getSitesForCustomer(customerCode).map(normalizeKey);

  if (!sites.length) return true;
  if (!normalizedSite) return true;

  return sites.some((allowedSite) => normalizedSite === allowedSite);
};

export const isSelectedSiteMatch = (site, selectedSite, customerCode) => {
  const normalizedSite = normalizeKey(site);
  const normalizedSelected = normalizeKey(selectedSite);

  if (!normalizedSite) return true;

  if (!selectedSite || selectedSite === SITE_ALL) {
    return isAllowedSiteForCustomer(normalizedSite, customerCode);
  }

  return normalizedSite === normalizedSelected;
};

export const isWipLocation = (location) => normalizeKey(location).startsWith("WIP");

export const cleanLocation = (location) => {
  const value = String(location || "").trim();
  return value.replace(/^TOPPS\s+/i, "");
};

export const getExpirationValue = (value) => {
  if (!value) return "";

  return (
    value.ExpDate ||
    value.expDate ||
    value.exp_date ||
    value.expirationDate ||
    value.ExpirationDate ||
    value.expiration ||
    value.Expiration ||
    value.lotExpiration ||
    value.lot_expiration ||
    value.earliestExpiration ||
    value.earliestExpirationDate ||
    ""
  );
};

export const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-US");
};

export const getDaysRemaining = (value) => {
  if (!value) return null;

  const exp = new Date(value);
  if (Number.isNaN(exp.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);

  return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export const getRowOnHand = (row) => {
  if (!row) return 0;

  const direct =
    row.OnHand ??
    row.onHand ??
    row.on_hand ??
    row["On Hand"] ??
    row["On Hand "] ??
    row.On_Hand ??
    row.InventoryOnHand ??
    row.inventoryOnHand ??
    row.Quantity ??
    row.quantity ??
    row.Qty ??
    row.qty ??
    row.AvailableQty ??
    row.availableQty ??
    row.available_qty ??
    row.totalOnHand;

  if (direct !== undefined && direct !== null) return Number(direct || 0);

  const key = Object.keys(row).find((k) =>
    k.toLowerCase().replace(/\s|_/g, "").includes("onhand")
  );

  return key ? Number(row[key] || 0) : 0;
};

export const getInventoryRows = (inv, selectedSite = SITE_ALL, customerCode = "") => {
  if (!inv) return [];

  const sourceRows =
    inv.lots ||
    inv.rows ||
    inv.inventoryRows ||
    inv.inventory_rows ||
    inv.inventory ||
    inv.items ||
    inv.details ||
    inv.expirations ||
    [];

  const rows = Array.isArray(sourceRows) && sourceRows.length > 0 ? sourceRows : [inv];

  return rows
    .map((row, index) => {
      const rawLocation = getLocationValue(row, inv);
      const site = getSiteValue(row, inv);
      const expDate = getExpirationValue(row) || getExpirationValue(inv);

      return {
        id: `${index}-${row.Pallet || row.pallet || row.Lot || row.lot || expDate || index}`,
        site,
        location: cleanLocation(rawLocation),
        rawLocation,
        pallet:
          row.Pallet ||
          row.pallet ||
          row.palletNumber ||
          row.pallet_number ||
          row.licensePlate ||
          row.license_plate ||
          row.lpn ||
          "-",
        uom:
          row.UOM ||
          row.uom ||
          row.unit ||
          row.unitOfMeasure ||
          inv.unitOfMeasure ||
          inv.uom ||
          "CS",
        lot: row.Lot || row.lot || row.lotNumber || row.lot_number || row.batch || "-",
        expDate,
        onHand: getRowOnHand(row),
      };
    })
    .filter((row) => !isWipLocation(row.rawLocation))
    .filter((row) => isSelectedSiteMatch(row.site, selectedSite, customerCode));
};

export const getShelfLifeColor = (daysRemaining, shelfLifeDays) => {
  if (!shelfLifeDays || daysRemaining === null) return "none";
  if (daysRemaining < shelfLifeDays) return "bad";
  if (daysRemaining <= shelfLifeDays + 30) return "low";
  return "good";
};

export const calculateCasesPossible = (onHand, qtyPerCase) => {
  const cleanOnHand = Number(onHand || 0);
  const cleanQtyPerCase = Number(qtyPerCase || 0);

  if (!cleanQtyPerCase || cleanQtyPerCase <= 0) return 0;

  return Math.floor(cleanOnHand / cleanQtyPerCase);
};
