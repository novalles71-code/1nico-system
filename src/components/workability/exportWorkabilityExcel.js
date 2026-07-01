import * as XLSX from "xlsx-js-style";
import {
  formatDate,
  getDaysRemaining,
  getShelfLifeColor,
} from "./workabilityHelpers";

const getRowTypeFill = (value) => {
  if (value === "SITE GROUP") return { fgColor: { rgb: "DBEAFE" } };
  if (value === "EXP DATE GROUP") return { fgColor: { rgb: "F1F5F9" } };
  return undefined;
};

const styleSheet = (worksheet) => {
  const range = XLSX.utils.decode_range(worksheet["!ref"]);

  for (let row = range.s.r; row <= range.e.r; row += 1) {
    const rowTypeCell = worksheet[XLSX.utils.encode_cell({ r: row, c: 0 })];
    const rowTypeFill = getRowTypeFill(rowTypeCell?.v);

    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const cell = XLSX.utils.encode_cell({ r: row, c: col });
      if (!worksheet[cell]) continue;

      worksheet[cell].s = {
        font: {
          bold: row === 0 || row === 6 || row === 7 || Boolean(rowTypeFill),
          sz: row === 0 ? 16 : 11,
          color: row === 0 ? { rgb: "FFFFFF" } : { rgb: "000000" },
        },
        alignment: {
          horizontal: "center",
          vertical: "center",
          wrapText: true,
        },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } },
        },
        fill:
          row === 0
            ? { fgColor: { rgb: "DC2626" } }
            : row === 6 || row === 7
              ? { fgColor: { rgb: "E5E7EB" } }
              : rowTypeFill,
      };
    }
  }
};

export const exportWorkabilitySummaryExcel = ({
  customer,
  selectedProduct,
  components,
  getSelectedSkuForComponent,
  getQtyPerCaseForComponent,
  getOnHand,
  getCasesPossible,
}) => {
  if (!selectedProduct || !components.length) {
    alert("Select a SKU before downloading.");
    return;
  }

  const rows = [
    ["WORKABILITY CALCULATOR"],
    [],
    ["Customer", customer],
    ["SKU", selectedProduct.sku],
    ["Description", selectedProduct.description],
    [],
    ["Items #", "Qty / CS", "On Hand", "Cases Possible"],
    ...components.map((component) => {
      const itemSku = getSelectedSkuForComponent(component);
      const qtyPerCase = getQtyPerCaseForComponent
        ? getQtyPerCaseForComponent(component, itemSku)
        : component.qty_per_case;

      return [
        itemSku,
        qtyPerCase,
        getOnHand(component, itemSku),
        getCasesPossible(component, null, itemSku),
      ];
    }),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  worksheet["!cols"] = [{ wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];
  worksheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];

  styleSheet(worksheet);

  XLSX.utils.book_append_sheet(workbook, worksheet, "Summary");

  const safeSku = String(selectedProduct.sku || "workability").replace(
    /[^a-zA-Z0-9-_]/g,
    "_"
  );

  XLSX.writeFile(workbook, `Workability_Summary_${safeSku}.xlsx`);
};

const buildVisibleDetailRowsForExport = ({
  detailDisplayRows = [],
  isMultiSite = false,
  shelfLifeApplied,
  shelfLifeDays,
  selectedDetailComponent,
  getCasesPossible,
}) => {
  return detailDisplayRows
    .filter((row) => !row.empty)
    .map((row) => {
      if (isMultiSite && row.groupType === "site") {
        return [
          "SITE GROUP",
          row.siteKey || "-",
          "",
          "",
          "",
          "",
          "",
          Number(row.onHand || 0),
          "-",
          `${getCasesPossible(selectedDetailComponent, row.onHand)} CS`,
        ];
      }

      if (row.groupType === "date" || row.group) {
        const days = getDaysRemaining(row.expDate);
        const blocked =
          shelfLifeApplied &&
          shelfLifeDays > 0 &&
          days !== null &&
          days < shelfLifeDays;

        return isMultiSite
          ? [
              "EXP DATE GROUP",
              row.siteKey || "-",
              row.location || "-",
              row.pallet || "-",
              row.uom || "-",
              row.lot || "-",
              formatDate(row.expDate),
              Number(row.onHand || 0),
              shelfLifeApplied && days !== null ? `${days} DAYS` : "-",
              blocked
                ? "0 CS"
                : `${getCasesPossible(selectedDetailComponent, row.onHand)} CS`,
            ]
          : [
              "EXP DATE GROUP",
              row.location || "-",
              row.pallet || "-",
              row.uom || "-",
              row.lot || "-",
              formatDate(row.expDate),
              Number(row.onHand || 0),
              shelfLifeApplied && days !== null ? `${days} DAYS` : "-",
              blocked
                ? "0 CS"
                : `${getCasesPossible(selectedDetailComponent, row.onHand)} CS`,
            ];
      }

      const days = getDaysRemaining(row.expDate);
      const blocked =
        shelfLifeApplied &&
        shelfLifeDays > 0 &&
        days !== null &&
        days < shelfLifeDays;

      return isMultiSite
        ? [
            "DETAIL",
            row.site || "-",
            row.location || "-",
            row.pallet || "-",
            row.uom || "-",
            row.lot || "-",
            formatDate(row.expDate),
            Number(row.onHand || 0),
            shelfLifeApplied && days !== null ? `${days} DAYS` : "-",
            blocked
              ? "0 CS"
              : `${getCasesPossible(selectedDetailComponent, row.onHand)} CS`,
          ]
        : [
            "DETAIL",
            row.location || "-",
            row.pallet || "-",
            row.uom || "-",
            row.lot || "-",
            formatDate(row.expDate),
            Number(row.onHand || 0),
            shelfLifeApplied && days !== null ? `${days} DAYS` : "-",
            blocked
              ? "0 CS"
              : `${getCasesPossible(selectedDetailComponent, row.onHand)} CS`,
          ];
    });
};

const buildFlatDetailRowsForExport = ({
  sortedDetailRows = [],
  isMultiSite = false,
  shelfLifeApplied,
  shelfLifeDays,
  selectedDetailComponent,
  getCasesPossible,
}) => {
  return sortedDetailRows.map((row) => {
    const days = getDaysRemaining(row.expDate);
    const blocked =
      shelfLifeApplied &&
      shelfLifeDays > 0 &&
      days !== null &&
      days < shelfLifeDays;

    return isMultiSite
      ? [
          "DETAIL",
          row.site || "-",
          row.location || "-",
          row.pallet,
          row.uom,
          row.lot,
          formatDate(row.expDate),
          row.onHand,
          shelfLifeApplied && days !== null ? `${days} DAYS` : "-",
          blocked
            ? "0 CS"
            : `${getCasesPossible(selectedDetailComponent, row.onHand)} CS`,
        ]
      : [
          "DETAIL",
          row.location || "-",
          row.pallet,
          row.uom,
          row.lot,
          formatDate(row.expDate),
          row.onHand,
          shelfLifeApplied && days !== null ? `${days} DAYS` : "-",
          blocked
            ? "0 CS"
            : `${getCasesPossible(selectedDetailComponent, row.onHand)} CS`,
        ];
  });
};

export const exportWorkabilityDetailExcel = ({
  customer,
  selectedProduct,
  selectedDetailComponent,
  sortedDetailRows,
  detailDisplayRows,
  isMultiSite = false,
  shelfLifeApplied,
  detailShelfLifeDays,
  shelfLifeDays,
  getSelectedSkuForComponent,
  getCasesPossible,
}) => {
  if (!selectedDetailComponent) return;

  const itemSku = getSelectedSkuForComponent(selectedDetailComponent);

  const header = isMultiSite
    ? [
        "Row Type",
        "Site",
        "Location",
        "Pallet",
        "UOM",
        "Lot",
        "Exp Date",
        "On Hand",
        "Shelf Life",
        "Workability",
      ]
    : [
        "Row Type",
        "Location",
        "Pallet",
        "UOM",
        "Lot",
        "Exp Date",
        "On Hand",
        "Shelf Life",
        "Workability",
      ];

  const visibleRows =
    Array.isArray(detailDisplayRows) && detailDisplayRows.length > 0
      ? buildVisibleDetailRowsForExport({
          detailDisplayRows,
          isMultiSite,
          shelfLifeApplied,
          shelfLifeDays,
          selectedDetailComponent,
          getCasesPossible,
        })
      : buildFlatDetailRowsForExport({
          sortedDetailRows,
          isMultiSite,
          shelfLifeApplied,
          shelfLifeDays,
          selectedDetailComponent,
          getCasesPossible,
        });

  const rows = [
    ["WORKABILITY ITEM DETAIL"],
    [],
    ["Customer", customer],
    ["SKU", selectedProduct?.sku || ""],
    ["Item", itemSku],
    ["Shelf Life Applied", shelfLifeApplied ? `${detailShelfLifeDays} DAYS` : "NO"],
    ["Export View", "Same grouping currently visible on screen"],
    header,
    ...visibleRows,
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  worksheet["!cols"] = isMultiSite
    ? [
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 10 },
        { wch: 18 },
        { wch: 16 },
        { wch: 12 },
        { wch: 18 },
        { wch: 16 },
      ]
    : [
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 10 },
        { wch: 18 },
        { wch: 16 },
        { wch: 12 },
        { wch: 18 },
        { wch: 16 },
      ];

  worksheet["!merges"] = [
    {
      s: { r: 0, c: 0 },
      e: { r: 0, c: isMultiSite ? 9 : 8 },
    },
  ];

  styleSheet(worksheet);

  XLSX.utils.book_append_sheet(workbook, worksheet, "Item Detail");

  const safeItem = String(itemSku || "item").replace(/[^a-zA-Z0-9-_]/g, "_");

  XLSX.writeFile(workbook, `Workability_Item_${safeItem}.xlsx`);
};
