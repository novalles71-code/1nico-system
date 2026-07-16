import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabase";
import { importThcPdf } from "../components/thc/importThcPdf";

const CUSTOMER_OPTIONS = ["THC", "MDLZ", "BAZOOKA", "MARS"];
const COMPONENT_TYPES = ["FILM", "CORRUGATE", "FEEDSTOCK", "ZIPPER", "OTHER"];

const emptyComponentRow = {
  type: "OTHER",
  component_sku: "",
  component_description: "",
  qty_per_case: "",
  uom: "",
  component_options: "",
  inventory_pattern: "",
  selected_option: "",
  inventory_regex: "",
  search_mode: "EXACT",
  requires_shelf_life: false,
  shelf_life_days: "",
  minimum_remaining_days: "",
};

const normalizeText = (value) => String(value || "").trim().toUpperCase();
const normalizeQtyPerCase = (value) => String(value || "").trim();

const getPrimarySkuFromCell = (value) =>
  String(value || "")
    .split(",")
    .map((item) => normalizeText(item))
    .filter(Boolean)[0] || "";

const getOptionsFromCell = (value) => {
  const options = String(value || "")
    .split(",")
    .map((item) => normalizeText(item))
    .filter(Boolean);

  return options.length > 1 ? options : null;
};

const parseOptionsForSave = (value) => {
  if (Array.isArray(value)) return value;

  const clean = String(value || "").trim();
  if (!clean) return null;

  return clean
    .split(/[,|]/)
    .map((item) => normalizeText(item))
    .filter(Boolean);
};

const formatOptionsForEdit = (value) => {
  if (!value) return "";

  if (Array.isArray(value)) return value.join(", ");

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.join(", ");
    } catch {
      return value;
    }
  }

  return "";
};

export default function WorkabilityAdmin() {
  const navigate = useNavigate();

  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [customer, setCustomer] = useState("MDLZ");

  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [bomSearch, setBomSearch] = useState("");
  const [bomDropdownOpen, setBomDropdownOpen] = useState(false);
  const [draftBomFilter, setDraftBomFilter] = useState("all");

  const [draftProduct, setDraftProduct] = useState({
    sku: "",
    description: "",
    active: true,
    shelf_life_days: null,
    minimum_remaining_days: null,
    source_type: null,
    source_file_name: null,
  });

  const [draftComponents, setDraftComponents] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [catalogOpenIndex, setCatalogOpenIndex] = useState(null);

  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingComponents, setLoadingComponents] = useState(false);
  const [importing, setImporting] = useState(false);
  const [savingBom, setSavingBom] = useState(false);
  const [message, setMessage] = useState("");

  const formattedDate = currentDateTime.toLocaleDateString("en-US");
  const formattedTime = currentDateTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 3500);
  };

  const loadProducts = async () => {
    setLoadingProducts(true);

    const { data, error } = await supabase
      .from("workability_products")
      .select("*")
      .eq("customer", customer)
      .order("sku", { ascending: true });

    if (error) {
      console.error("Load workability products error:", error);
      alert("Unable to load BOMs.");
      setLoadingProducts(false);
      return;
    }

    setProducts(data || []);
    setLoadingProducts(false);
  };

  const loadCatalog = async () => {
    const { data, error } = await supabase
      .from("workability_component_catalog")
      .select("*")
      .eq("customer", customer)
      .order("component_sku", { ascending: true });

    if (error) {
      console.warn("Component catalog not available yet:", error);
      setCatalog([]);
      return;
    }

    setCatalog(data || []);
  };

  const componentToDraft = (component) => ({
    id: component.id,
    type: component.type || "OTHER",
    component_sku: component.component_sku || "",
    component_description: component.component_description || "",
    qty_per_case: component.qty_per_case ?? "",
    uom: component.uom || "",
    component_options: formatOptionsForEdit(component.component_options),
    inventory_pattern: component.inventory_pattern || "",
    selected_option: component.selected_option || "",
    inventory_regex: component.inventory_regex || "",
    search_mode: component.search_mode || "EXACT",
    requires_shelf_life: component.requires_shelf_life === true,
    shelf_life_days: component.shelf_life_days ?? "",
    minimum_remaining_days: component.minimum_remaining_days ?? "",
    _delete: false,
  });

  const loadComponents = async (productId) => {
    if (!productId) {
      setDraftComponents([]);
      return;
    }

    setLoadingComponents(true);

    const { data, error } = await supabase
      .from("workability_components")
      .select("*")
      .eq("product_id", productId)
      .order("type", { ascending: true });

    if (error) {
      console.error("Load BOM components error:", error);
      alert("Unable to load BOM components.");
      setLoadingComponents(false);
      return;
    }

    setDraftComponents((data || []).map(componentToDraft));
    setLoadingComponents(false);
  };

  useEffect(() => {
    setSelectedProduct(null);
    setDraftProduct({
      sku: "",
      description: "",
      active: true,
      shelf_life_days: null,
      minimum_remaining_days: null,
      source_type: null,
      source_file_name: null,
    });
    setDraftComponents([]);
    setBomSearch("");
    setBomDropdownOpen(false);
    setDraftBomFilter("all");
    loadProducts();
    loadCatalog();
  }, [customer]);

  const filteredProducts = useMemo(() => {
    const q = bomSearch.toLowerCase().trim();

    return products.filter((product) => {
      const matchesSearch =
        !q ||
        String(product.sku || "").toLowerCase().includes(q) ||
        String(product.description || "").toLowerCase().includes(q);

      const matchesStatus =
        draftBomFilter === "all" ||
        (draftBomFilter === "active" && product.active) ||
        (draftBomFilter === "inactive" && !product.active);

      return matchesSearch && matchesStatus;
    });
  }, [products, bomSearch, draftBomFilter]);

  const activeProducts = products.filter((item) => item.active).length;
  const inactiveProducts = products.filter((item) => !item.active).length;

  const selectProduct = async (product) => {
    setSelectedProduct(product);
    setDraftProduct({
      sku: product.sku || "",
      description: product.description || "",
      active: product.active !== false,
      shelf_life_days: product.shelf_life_days ?? null,
      minimum_remaining_days: product.minimum_remaining_days ?? null,
      source_type: product.source_type || null,
      source_file_name: product.source_file_name || null,
    });
    setBomSearch(`${product.sku || ""} - ${product.description || ""}`);
    setBomDropdownOpen(false);
    await loadComponents(product.id);
  };

  const createManualBom = () => {
    setSelectedProduct(null);
    setBomDropdownOpen(false);
    setBomSearch("");
    setDraftProduct({
      sku: "",
      description: "",
      active: true,
      shelf_life_days: null,
      minimum_remaining_days: null,
      source_type: "MANUAL",
      source_file_name: null,
    });
    setDraftComponents([{ ...emptyComponentRow }]);
    showMessage("New manual BOM ready.");
  };

  const buildComponentForSave = (row, productId) => {
    const primarySku = getPrimarySkuFromCell(row.component_sku) || normalizeText(row.component_sku);
    const optionsFromSku = getOptionsFromCell(row.component_sku);
    const manualOptions = parseOptionsForSave(row.component_options);

    return {
      product_id: productId,
      type: normalizeText(row.type) || "OTHER",
      component_sku: primarySku,
      component_description: normalizeText(row.component_description) || null,
      qty_per_case: normalizeQtyPerCase(row.qty_per_case),
      uom: normalizeText(row.uom) || null,
      component_options: manualOptions || optionsFromSku,
      inventory_pattern: normalizeText(row.inventory_pattern) || null,
      selected_option: normalizeText(row.selected_option) || null,
      inventory_regex: String(row.inventory_regex || "").trim() || null,
      search_mode: normalizeText(row.search_mode) || "EXACT",
      requires_shelf_life: row.requires_shelf_life === true,
      shelf_life_days:
        row.shelf_life_days === "" || row.shelf_life_days == null
          ? null
          : Number(row.shelf_life_days),
      minimum_remaining_days:
        row.minimum_remaining_days === "" || row.minimum_remaining_days == null
          ? null
          : Number(row.minimum_remaining_days),
    };
  };

  const upsertCatalogRows = async (rows) => {
    const catalogRows = rows
      .filter((row) => normalizeText(row.component_sku))
      .map((row) => {
        const primarySku =
          getPrimarySkuFromCell(row.component_sku) || normalizeText(row.component_sku);

        return {
          customer,
          type: normalizeText(row.type) || "OTHER",
          component_sku: primarySku,
          component_description: normalizeText(row.component_description) || null,
          uom: normalizeText(row.uom) || null,
          inventory_pattern: normalizeText(row.inventory_pattern) || null,
          shelf_life_days:
            row.shelf_life_days === "" || row.shelf_life_days == null
              ? null
              : Number(row.shelf_life_days),
          minimum_remaining_days:
            row.minimum_remaining_days === "" || row.minimum_remaining_days == null
              ? null
              : Number(row.minimum_remaining_days),
          updated_at: new Date().toISOString(),
        };
      });

    if (catalogRows.length === 0) return;

    const { error } = await supabase
      .from("workability_component_catalog")
      .upsert(catalogRows, { onConflict: "customer,component_sku" });

    if (error) {
      console.warn("Unable to update component catalog:", error);
    } else {
      await loadCatalog();
    }
  };

  const saveBomChanges = async () => {
    const cleanSku = normalizeText(draftProduct.sku);
    const cleanDescription = normalizeText(draftProduct.description);

    if (!cleanSku || !cleanDescription) {
      alert("SKU and Description are required.");
      return;
    }

    const activeRows = draftComponents.filter((row) => !row._delete);
    const invalidRow = activeRows.find(
      (row) => !normalizeText(row.component_sku) || !normalizeQtyPerCase(row.qty_per_case)
    );

    if (invalidRow) {
      alert("Every active component needs Component SKU and Qty / Case.");
      return;
    }

    setSavingBom(true);

    const productPayload = {
      customer,
      sku: cleanSku,
      description: cleanDescription,
      active: draftProduct.active !== false,
      shelf_life_days:
        draftProduct.shelf_life_days == null || draftProduct.shelf_life_days === ""
          ? null
          : Number(draftProduct.shelf_life_days),
      minimum_remaining_days:
        draftProduct.minimum_remaining_days == null ||
        draftProduct.minimum_remaining_days === ""
          ? null
          : Number(draftProduct.minimum_remaining_days),
      source_type: draftProduct.source_type || null,
      source_file_name: draftProduct.source_file_name || null,
      updated_at: new Date().toISOString(),
    };

    const { data: savedProduct, error: productError } = await supabase
      .from("workability_products")
      .upsert(productPayload, { onConflict: "customer,sku" })
      .select()
      .single();

    if (productError) {
      console.error("Save BOM product error:", productError);
      alert("Unable to save BOM.");
      setSavingBom(false);
      return;
    }

    if (selectedProduct?.id) {
      const { error: deleteError } = await supabase
        .from("workability_components")
        .delete()
        .eq("product_id", selectedProduct.id);

      if (deleteError) {
        console.error("Delete old components error:", deleteError);
        alert("Unable to replace old BOM components.");
        setSavingBom(false);
        return;
      }
    } else {
      await supabase
        .from("workability_components")
        .delete()
        .eq("product_id", savedProduct.id);
    }

    const rowsToInsert = activeRows.map((row) =>
      buildComponentForSave(row, savedProduct.id)
    );

    if (rowsToInsert.length > 0) {
      const { error: componentError } = await supabase
        .from("workability_components")
        .insert(rowsToInsert);

      if (componentError) {
        console.error("Save components error:", componentError);
        alert(`Unable to save BOM components.\n\n${componentError.message || ""}`);
        setSavingBom(false);
        return;
      }
    }

    await upsertCatalogRows(activeRows);
    await loadProducts();

    setSelectedProduct(savedProduct);
    setDraftProduct({
      sku: savedProduct.sku || "",
      description: savedProduct.description || "",
      active: savedProduct.active !== false,
      shelf_life_days: savedProduct.shelf_life_days ?? null,
      minimum_remaining_days: savedProduct.minimum_remaining_days ?? null,
      source_type: savedProduct.source_type || null,
      source_file_name: savedProduct.source_file_name || null,
    });

    await loadComponents(savedProduct.id);
    setBomSearch(`${savedProduct.sku} - ${savedProduct.description}`);

    setSavingBom(false);
    showMessage("BOM saved successfully.");
  };

  const deleteBom = async () => {
    if (!selectedProduct?.id) return;

    const ok = confirm("Delete this BOM and all components?");
    if (!ok) return;

    const { error } = await supabase
      .from("workability_products")
      .delete()
      .eq("id", selectedProduct.id);

    if (error) {
      console.error("Delete BOM error:", error);
      alert("Unable to delete BOM.");
      return;
    }

    setSelectedProduct(null);
    setDraftProduct({
      sku: "",
      description: "",
      active: true,
      shelf_life_days: null,
      minimum_remaining_days: null,
      source_type: null,
      source_file_name: null,
    });
    setDraftComponents([]);
    setBomSearch("");
    await loadProducts();
    showMessage("BOM deleted.");
  };

  const toggleActive = () => {
    setDraftProduct((prev) => ({ ...prev, active: !prev.active }));
  };

  const addDraftComponent = () => {
    setDraftComponents((prev) => [...prev, { ...emptyComponentRow }]);
  };

  const updateDraftComponent = (index, field, value) => {
    setDraftComponents((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const markDraftComponentDeleted = (index) => {
    setDraftComponents((prev) =>
      prev.map((row, i) => (i === index ? { ...row, _delete: !row._delete } : row))
    );
  };

  const getCatalogSuggestions = (value) => {
    const q = String(value || "").toLowerCase().trim();
    if (!q) return [];

    return catalog
      .filter(
        (item) =>
          String(item.component_sku || "").toLowerCase().includes(q) ||
          String(item.component_description || "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  };

  const applyCatalogSuggestion = (index, item) => {
    updateDraftComponent(index, "type", item.type || "OTHER");
    updateDraftComponent(index, "component_sku", item.component_sku || "");
    updateDraftComponent(index, "component_description", item.component_description || "");
    updateDraftComponent(index, "uom", item.uom || "");
    updateDraftComponent(index, "inventory_pattern", item.inventory_pattern || "");
    setCatalogOpenIndex(null);
  };

  const handleBomImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setImporting(true);

    try {
      if (customer === "THC") {
        const importedBom = await importThcPdf(file);

        const componentsToDraft = importedBom.components.map((component) => ({
          ...emptyComponentRow,
          ...component,
          component_options: formatOptionsForEdit(component.component_options),
          shelf_life_days: component.shelf_life_days ?? "",
          minimum_remaining_days: component.minimum_remaining_days ?? "",
          _delete: false,
        }));

        setSelectedProduct(null);
        setDraftProduct({
          sku: importedBom.sku,
          description: importedBom.description,
          active: true,
          shelf_life_days: importedBom.shelf_life_days ?? null,
          minimum_remaining_days:
            importedBom.minimum_remaining_days ?? null,
          source_type: importedBom.source_type || "PDF",
          source_file_name: importedBom.source_file_name || file.name,
        });
        setDraftComponents(componentsToDraft);
        setBomSearch(`${importedBom.sku} - ${importedBom.description}`);
        showMessage(
          `THC PDF loaded: ${componentsToDraft.length} components. Review and click Save BOM.`
        );
        return;
      }

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const bomSku = normalizeText(sheet["B1"]?.v) || normalizeText(sheet["C4"]?.v);
      const bomDescription =
        normalizeText(sheet["B2"]?.v) || normalizeText(sheet["C5"]?.v);

      if (!bomSku || !bomDescription) {
        throw new Error(
          "Unable to read SKU or description. New format: B1 = SKU and B2 = Description."
        );
      }

      const componentsToDraft = [];
      const isSimpleFormat =
        normalizeText(sheet["A4"]?.v).includes("COMPONENT") &&
        normalizeText(sheet["B4"]?.v).includes("QUANTITY");

      if (isSimpleFormat) {
        for (let row = 5; row <= 150; row += 1) {
          const componentSkuCell = String(sheet[`A${row}`]?.v || "").trim();
          const qtyPerCaseValue = String(sheet[`B${row}`]?.v || "").trim();

          if (!componentSkuCell || !qtyPerCaseValue) continue;

          const primary = getPrimarySkuFromCell(componentSkuCell);
          const options = getOptionsFromCell(componentSkuCell);

          componentsToDraft.push({
            ...emptyComponentRow,
            component_sku: primary,
            qty_per_case: qtyPerCaseValue,
            component_options: options ? options.join(", ") : "",
            inventory_pattern: primary,
          });
        }
      } else {
        for (let row = 8; row <= 80; row += 1) {
          const componentSkuCell = String(sheet[`A${row}`]?.v || "");
          const primary = getPrimarySkuFromCell(componentSkuCell);
          const options = getOptionsFromCell(componentSkuCell);
          const componentDescription = normalizeText(sheet[`B${row}`]?.v);
          const type = normalizeText(sheet[`C${row}`]?.v);
          const qtyPerCaseValue = String(sheet[`D${row}`]?.v || "").trim();
          const uomValue = normalizeText(sheet[`E${row}`]?.v);

          if (!primary || !qtyPerCaseValue) continue;

          componentsToDraft.push({
            ...emptyComponentRow,
            type: type || "OTHER",
            component_sku: primary,
            component_description: componentDescription,
            qty_per_case: qtyPerCaseValue,
            uom: uomValue,
            component_options: options ? options.join(", ") : "",
            inventory_pattern: primary,
          });
        }
      }

      if (componentsToDraft.length === 0) {
        throw new Error("No BOM components found in the Excel file.");
      }

      setSelectedProduct(null);
      setDraftProduct({
        sku: bomSku,
        description: bomDescription,
        active: true,
        shelf_life_days: null,
        minimum_remaining_days: null,
        source_type: "EXCEL",
        source_file_name: file.name,
      });
      setDraftComponents(componentsToDraft);
      setBomSearch(`${bomSku} - ${bomDescription}`);
      showMessage(
        `Excel BOM loaded: ${componentsToDraft.length} components. Review and click Save BOM.`
      );
    } catch (error) {
      console.error("BOM import error:", error);
      alert(error?.message || "Unable to import BOM file.");
    } finally {
      setImporting(false);
    }
  };

  const exportBom = () => {
    const rows = [
      ["WORKABILITY BOM"],
      [],
      ["Customer", customer],
      ["SKU", draftProduct.sku],
      ["Description", draftProduct.description],
      ["Active", draftProduct.active ? "YES" : "NO"],
      [],
      [
        "Type",
        "Component SKU",
        "Description",
        "Qty / Case",
        "UOM",
        "Component Options",
        "Inventory Pattern",
        "Selected Option",
      ],
      ...draftComponents
        .filter((row) => !row._delete)
        .map((row) => [
          row.type,
          row.component_sku,
          row.component_description,
          row.qty_per_case,
          row.uom,
          row.component_options,
          row.inventory_pattern,
          row.selected_option,
        ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();

    ws["!cols"] = [
      { wch: 18 },
      { wch: 24 },
      { wch: 36 },
      { wch: 12 },
      { wch: 10 },
      { wch: 34 },
      { wch: 28 },
      { wch: 24 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "BOM");

    const safeSku = String(draftProduct.sku || "bom").replace(/[^a-zA-Z0-9-_]/g, "_");
    XLSX.writeFile(wb, `BOM_${customer}_${safeSku}.xlsx`);
  };

  const hasEditor = draftProduct.sku || draftProduct.description || draftComponents.length > 0;

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <span style={logoStyle}>1NICO</span>
          <span style={workstationStyle}>Workstation</span>
        </div>

        <div style={headerTitleStyle}>WORKABILITY ADMIN</div>

        <div style={dateBoxStyle}>
          <div style={dateTextStyle}>{formattedDate}</div>
          <div style={timeTextStyle}>{formattedTime}</div>
        </div>
      </div>

      <div style={contentWrapStyle}>
        <button type="button" onClick={() => navigate("/home")} style={backBtnStyle}>
          ← Back to Dashboard
        </button>

        <div style={mainCardStyle}>
          <div style={adminTopBarStyle}>
            <div>
              <div style={eyebrowStyle}>BOM CONTROL CENTER</div>
              <h1 style={pageTitleStyle}>Create, edit and organize Workability BOMs.</h1>
              <p style={pageSubtitleStyle}>
                Manual entry first, Excel import when needed, and smart component suggestions.
              </p>
            </div>

            <div style={statsWrapStyle}>
              <span style={statPillStyle}>Total: {products.length}</span>
              <span style={statPillGreenStyle}>Active: {activeProducts}</span>
              <span style={statPillRedStyle}>Inactive: {inactiveProducts}</span>
            </div>
          </div>

          {message && <div style={messageBoxStyle}>{message}</div>}

          <div style={topControlsStyle}>
            <div>
              <label style={labelStyle}>CUSTOMER</label>
              <select
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                style={inputStyle}
              >
                {CUSTOMER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ position: "relative" }}>
              <label style={labelStyle}>BOM</label>
              <button
                type="button"
                onClick={() => setBomDropdownOpen((prev) => !prev)}
                style={bomDropdownButtonStyle}
              >
                <span>
                  {selectedProduct
                    ? `${selectedProduct.sku} - ${selectedProduct.description}`
                    : bomSearch || "Search SKU or Description..."}
                </span>
                <span>▼</span>
              </button>

              {bomDropdownOpen && (
                <div style={bomMenuStyle}>
                  <div style={bomSearchBoxStyle}>
                    <input
                      value={bomSearch}
                      onChange={(e) => setBomSearch(e.target.value.toUpperCase())}
                      placeholder="Search SKU or Description..."
                      style={bomSearchInputStyle}
                      autoFocus
                    />
                  </div>

                  <div style={bomMenuActionsStyle}>
                    <button
                      type="button"
                      onClick={() => {
                        setBomSearch("");
                        setDraftBomFilter("all");
                      }}
                      style={siteMiniButtonStyle}
                    >
                      Clear
                    </button>

                    <button
                      type="button"
                      onClick={() => setDraftBomFilter("all")}
                      style={{
                        ...siteMiniButtonStyle,
                        backgroundColor: draftBomFilter === "all" ? "#eff6ff" : "#fff",
                      }}
                    >
                      All
                    </button>

                    <button
                      type="button"
                      onClick={() => setDraftBomFilter("active")}
                      style={{
                        ...siteMiniButtonStyle,
                        backgroundColor: draftBomFilter === "active" ? "#dcfce7" : "#fff",
                      }}
                    >
                      Active
                    </button>

                    <button
                      type="button"
                      onClick={() => setDraftBomFilter("inactive")}
                      style={{
                        ...siteMiniButtonStyle,
                        backgroundColor: draftBomFilter === "inactive" ? "#fee2e2" : "#fff",
                      }}
                    >
                      Inactive
                    </button>
                  </div>

                  <div style={bomOptionsScrollStyle}>
                    {loadingProducts ? (
                      <div style={emptyDropdownStyle}>Loading BOMs...</div>
                    ) : filteredProducts.length === 0 ? (
                      <div style={emptyDropdownStyle}>No BOM found.</div>
                    ) : (
                      filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => selectProduct(product)}
                          style={{
                            ...bomOptionStyle,
                            backgroundColor:
                              selectedProduct?.id === product.id ? "#eff6ff" : "#fff",
                          }}
                        >
                          <div>
                            <div style={bomSkuStyle}>{product.sku}</div>
                            <div style={bomDescriptionStyle}>{product.description}</div>
                          </div>

                          <span
                            style={{
                              ...bomStatusPillStyle,
                              backgroundColor: product.active ? "#dcfce7" : "#fee2e2",
                              color: product.active ? "#166534" : "#991b1b",
                            }}
                          >
                            {product.active ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </button>
                      ))
                    )}
                  </div>

                  <div style={bomMenuFooterStyle}>
                    <button
                      type="button"
                      onClick={() => setBomDropdownOpen(false)}
                      style={siteOkButtonStyle}
                    >
                      OK
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={actionClusterStyle}>
              <button type="button" onClick={createManualBom} style={primaryRedButtonStyle}>
                + Manual BOM
              </button>

              <input
                id="bom-upload"
                type="file"
                accept={customer === "THC" ? ".pdf,application/pdf" : ".xlsx,.xls"}
                onChange={handleBomImport}
                style={{ display: "none" }}
              />

              <button
                type="button"
                disabled={importing}
                onClick={() => document.getElementById("bom-upload")?.click()}
                style={{
                  ...secondaryButtonStyle,
                  opacity: importing ? 0.6 : 1,
                  cursor: importing ? "not-allowed" : "pointer",
                }}
              >
                {importing ? "Importing..." : "Import BOM"}
              </button>
            </div>
          </div>

          {!hasEditor ? (
            <div style={emptyStateStyle}>
              <div style={emptyIconStyle}>📦</div>
              <h2 style={emptyTitleStyle}>SELECT OR CREATE A BOM</h2>
              <p style={emptyTextStyle}>
                Use the BOM dropdown to edit an existing SKU, or create a new manual BOM.
              </p>
            </div>
          ) : (
            <div>
              <div style={editorHeaderStyle}>
                <div>
                  <div style={eyebrowStyle}>BOM EDITOR</div>
                  <div style={editorTitleStyle}>
                    {draftProduct.sku || "NEW BOM"}
                    <span
                      style={{
                        ...activeBadgeStyle,
                        backgroundColor: draftProduct.active ? "#dcfce7" : "#fee2e2",
                        color: draftProduct.active ? "#166534" : "#991b1b",
                      }}
                    >
                      {draftProduct.active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                </div>

                <div style={editorActionsStyle}>
                  <button type="button" onClick={toggleActive} style={secondaryButtonStyle}>
                    {draftProduct.active ? "Disable" : "Enable"}
                  </button>

                  {selectedProduct?.id && (
                    <button type="button" onClick={deleteBom} style={dangerButtonStyle}>
                      Delete
                    </button>
                  )}

                  <button type="button" onClick={exportBom} style={excelButtonStyle}>
                    Export BOM
                  </button>

                  <button
                    type="button"
                    disabled={savingBom}
                    onClick={saveBomChanges}
                    style={{
                      ...greenButtonStyle,
                      opacity: savingBom ? 0.6 : 1,
                      cursor: savingBom ? "not-allowed" : "pointer",
                    }}
                  >
                    {savingBom ? "Saving..." : "Save BOM"}
                  </button>
                </div>
              </div>

              <div style={productEditGridStyle}>
                <div>
                  <label style={labelStyle}>SKU</label>
                  <input
                    value={draftProduct.sku}
                    onChange={(e) =>
                      setDraftProduct((prev) => ({
                        ...prev,
                        sku: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="Finished Good SKU..."
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>DESCRIPTION</label>
                  <input
                    value={draftProduct.description}
                    onChange={(e) =>
                      setDraftProduct((prev) => ({
                        ...prev,
                        description: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="Finished Good Description..."
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={componentToolbarStyle}>
                <div>
                  <div style={sectionTitleStyle}>Components</div>
                  <div style={sectionSubtitleStyle}>
                    Write options separated by commas. Example: NFS-RNP-0015,NFS-RNP-0015-A
                  </div>
                </div>

                <button type="button" onClick={addDraftComponent} style={primaryRedButtonStyle}>
                  + Add Component
                </button>
              </div>

              <div style={tableScrollStyle}>
                <table style={componentTableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>TYPE</th>
                      <th style={thStyle}>COMPONENT SKU</th>
                      <th style={thStyle}>DESCRIPTION</th>
                      <th style={thStyle}>QTY/CASE</th>
                      <th style={thStyle}>UOM</th>
                      <th style={thStyle}>OPTIONS</th>
                      <th style={thStyle}>INVENTORY PATTERN</th>
                      <th style={thStyle}>SELECTED OPTION</th>
                      <th style={thStyle}>ACTION</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loadingComponents ? (
                      <tr>
                        <td style={tdStyle} colSpan={9}>
                          Loading components...
                        </td>
                      </tr>
                    ) : draftComponents.length === 0 ? (
                      <tr>
                        <td style={tdStyle} colSpan={9}>
                          No components yet.
                        </td>
                      </tr>
                    ) : (
                      draftComponents.map((component, index) => {
                        const suggestions = getCatalogSuggestions(component.component_sku);
                        const optionChips = parseOptionsForSave(component.component_options);

                        return (
                          <tr
                            key={`${component.id || "new"}-${index}`}
                            style={{
                              backgroundColor: component._delete ? "#fff1f2" : "#fff",
                              opacity: component._delete ? 0.55 : 1,
                            }}
                          >
                            <td style={tdStyle}>
                              <select
                                value={component.type}
                                onChange={(e) =>
                                  updateDraftComponent(index, "type", e.target.value)
                                }
                                style={tableInputStyle}
                              >
                                {COMPONENT_TYPES.map((type) => (
                                  <option key={type} value={type}>
                                    {type}
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td style={{ ...tdStyle, position: "relative" }}>
                              <input
                                value={component.component_sku}
                                onFocus={() => setCatalogOpenIndex(index)}
                                onChange={(e) => {
                                  updateDraftComponent(
                                    index,
                                    "component_sku",
                                    e.target.value.toUpperCase()
                                  );
                                  setCatalogOpenIndex(index);
                                }}
                                placeholder="SKU..."
                                style={tableInputStyle}
                              />

                              {catalogOpenIndex === index && suggestions.length > 0 && (
                                <div style={catalogMenuStyle}>
                                  {suggestions.map((item) => (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() => applyCatalogSuggestion(index, item)}
                                      style={catalogOptionStyle}
                                    >
                                      <div style={{ fontWeight: "950", color: "#0f172a" }}>
                                        {item.component_sku}
                                      </div>
                                      <div style={{ fontSize: "0.76rem", color: "#64748b" }}>
                                        {item.component_description || "No description"}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </td>

                            <td style={tdStyle}>
                              <input
                                value={component.component_description}
                                onChange={(e) =>
                                  updateDraftComponent(
                                    index,
                                    "component_description",
                                    e.target.value.toUpperCase()
                                  )
                                }
                                placeholder="Description..."
                                style={{ ...tableInputStyle, minWidth: "260px" }}
                              />
                            </td>

                            <td style={tdStyle}>
                              <input
                                value={component.qty_per_case}
                                onChange={(e) =>
                                  updateDraftComponent(index, "qty_per_case", e.target.value)
                                }
                                placeholder="0.30 or 0.30-0.2571"
                                style={{ ...tableInputStyle, minWidth: "135px" }}
                              />
                            </td>

                            <td style={tdStyle}>
                              <input
                                value={component.uom}
                                onChange={(e) =>
                                  updateDraftComponent(index, "uom", e.target.value.toUpperCase())
                                }
                                placeholder="EA"
                                style={{ ...tableInputStyle, minWidth: "85px" }}
                              />
                            </td>

                            <td style={tdStyle}>
                              <input
                                value={component.component_options}
                                onChange={(e) =>
                                  updateDraftComponent(
                                    index,
                                    "component_options",
                                    e.target.value.toUpperCase()
                                  )
                                }
                                placeholder="SKU-A, SKU-B..."
                                style={{ ...tableInputStyle, minWidth: "230px" }}
                              />

                              {optionChips && optionChips.length > 1 && (
                                <div style={chipsWrapStyle}>
                                  {optionChips.map((option) => (
                                    <span key={option} style={chipStyle}>
                                      {option}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>

                            <td style={tdStyle}>
                              <input
                                value={component.inventory_pattern}
                                onChange={(e) =>
                                  updateDraftComponent(
                                    index,
                                    "inventory_pattern",
                                    e.target.value.toUpperCase()
                                  )
                                }
                                placeholder="Pattern..."
                                style={{ ...tableInputStyle, minWidth: "190px" }}
                              />
                            </td>

                            <td style={tdStyle}>
                              <input
                                value={component.selected_option}
                                onChange={(e) =>
                                  updateDraftComponent(
                                    index,
                                    "selected_option",
                                    e.target.value.toUpperCase()
                                  )
                                }
                                placeholder="Optional..."
                                style={{ ...tableInputStyle, minWidth: "170px" }}
                              />
                            </td>

                            <td style={tdStyle}>
                              <button
                                type="button"
                                onClick={() => markDraftComponentDeleted(index)}
                                style={{
                                  ...smallActionButtonStyle,
                                  color: component._delete ? "#166534" : "#991b1b",
                                  borderColor: component._delete ? "#86efac" : "#fecaca",
                                  backgroundColor: component._delete ? "#dcfce7" : "#fff1f2",
                                }}
                              >
                                {component._delete ? "Undo" : "Delete"}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div style={hintBoxStyle}>
                Component suggestions come from saved BOMs for this customer. Save the BOM to update
                the component memory.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const pageStyle = {
  backgroundColor: "#f3f6fa",
  minHeight: "100vh",
  fontFamily: "system-ui, sans-serif",
  margin: 0,
};

const headerStyle = {
  background: "linear-gradient(180deg, #ef2b2b 0%, #d91f1f 100%)",
  color: "#fff",
  height: "80px",
  padding: "0 24px",
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  boxShadow: "0 2px 12px rgba(185, 28, 28, 0.24)",
};

const logoStyle = {
  backgroundColor: "#fff",
  color: "#ef2b2b",
  fontWeight: "950",
  padding: "9px 13px",
  borderRadius: "6px",
  fontSize: "1rem",
  letterSpacing: "-0.5px",
};

const workstationStyle = {
  fontWeight: "900",
  fontSize: "1.05rem",
};

const headerTitleStyle = {
  fontWeight: "950",
  fontSize: "1.65rem",
  letterSpacing: "0.2px",
  textShadow: "0 1px 2px rgba(0,0,0,0.18)",
};

const dateBoxStyle = {
  textAlign: "right",
  lineHeight: "1.35",
};

const dateTextStyle = {
  fontWeight: "950",
  fontSize: "0.98rem",
};

const timeTextStyle = {
  fontSize: "0.86rem",
  fontWeight: "800",
  opacity: 0.95,
};

const contentWrapStyle = {
  padding: "28px 24px 48px",
  maxWidth: "1440px",
  margin: "0 auto",
};

const backBtnStyle = {
  border: "1px solid #dbe3ea",
  backgroundColor: "#fff",
  color: "#172033",
  height: "33px",
  padding: "0 14px",
  borderRadius: "6px",
  fontWeight: "950",
  cursor: "pointer",
  marginBottom: "14px",
  boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
};

const mainCardStyle = {
  backgroundColor: "#fff",
  padding: "34px 42px",
  borderRadius: "10px",
  border: "1px solid #dbe3ea",
  boxShadow: "0 8px 28px rgba(15, 23, 42, 0.08)",
};

const adminTopBarStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "18px",
  marginBottom: "22px",
};

const eyebrowStyle = {
  color: "#dc2626",
  fontSize: "0.72rem",
  fontWeight: "950",
  letterSpacing: "0.08em",
};

const pageTitleStyle = {
  margin: "4px 0 4px",
  color: "#172033",
  fontSize: "1.45rem",
  fontWeight: "950",
};

const pageSubtitleStyle = {
  margin: 0,
  color: "#64748b",
  fontWeight: "750",
};

const statsWrapStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const statPillStyle = {
  border: "1px solid #dbe3ea",
  backgroundColor: "#f8fafc",
  color: "#334155",
  borderRadius: "999px",
  padding: "7px 11px",
  fontSize: "0.76rem",
  fontWeight: "950",
};

const statPillGreenStyle = {
  ...statPillStyle,
  backgroundColor: "#dcfce7",
  color: "#166534",
  borderColor: "#bbf7d0",
};

const statPillRedStyle = {
  ...statPillStyle,
  backgroundColor: "#fee2e2",
  color: "#991b1b",
  borderColor: "#fecaca",
};

const topControlsStyle = {
  display: "grid",
  gridTemplateColumns: "180px minmax(420px, 1fr) 270px",
  gap: "18px",
  alignItems: "end",
  marginBottom: "24px",
};

const labelStyle = {
  display: "block",
  fontSize: "0.76rem",
  fontWeight: "950",
  color: "#172033",
  marginBottom: "8px",
  letterSpacing: "0.02em",
};

const inputStyle = {
  width: "100%",
  height: "33px",
  border: "1px solid #cbd5e1",
  borderRadius: "6px",
  padding: "0 12px",
  fontSize: "0.92rem",
  outline: "none",
  boxSizing: "border-box",
  backgroundColor: "#fff",
  color: "#0f172a",
  fontWeight: "800",
  boxShadow: "inset 0 1px 1px rgba(15,23,42,0.03)",
};

const bomDropdownButtonStyle = {
  width: "100%",
  height: "33px",
  border: "1px solid #cbd5e1",
  borderRadius: "6px",
  padding: "0 12px",
  backgroundColor: "#fff",
  color: "#0f172a",
  fontSize: "0.9rem",
  fontWeight: "850",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
  boxSizing: "border-box",
  boxShadow: "inset 0 1px 1px rgba(15,23,42,0.03)",
  overflow: "hidden",
};

const bomMenuStyle = {
  position: "absolute",
  zIndex: 80,
  top: "64px",
  left: 0,
  right: 0,
  backgroundColor: "#fff",
  border: "1px solid #cbd5e1",
  borderRadius: "10px",
  boxShadow: "0 16px 34px rgba(15,23,42,0.18)",
  overflow: "hidden",
};

const bomSearchBoxStyle = {
  padding: "10px",
  backgroundColor: "#f8fafc",
  borderBottom: "1px solid #e2e8f0",
};

const bomSearchInputStyle = {
  ...inputStyle,
  height: "34px",
  backgroundColor: "#fff",
};

const bomMenuActionsStyle = {
  display: "flex",
  gap: "6px",
  padding: "8px 10px",
  borderBottom: "1px solid #e2e8f0",
  backgroundColor: "#fff",
};

const siteMiniButtonStyle = {
  border: "1px solid #cbd5e1",
  backgroundColor: "#fff",
  color: "#334155",
  borderRadius: "5px",
  padding: "5px 8px",
  fontWeight: "900",
  cursor: "pointer",
  fontSize: "0.72rem",
};

const bomOptionsScrollStyle = {
  maxHeight: "310px",
  overflowY: "auto",
};

const bomOptionStyle = {
  width: "100%",
  border: "none",
  borderBottom: "1px solid #eef2f7",
  backgroundColor: "#fff",
  padding: "10px 12px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  textAlign: "left",
};

const bomSkuStyle = {
  color: "#0f172a",
  fontWeight: "950",
  fontSize: "0.88rem",
};

const bomDescriptionStyle = {
  color: "#64748b",
  fontSize: "0.78rem",
  fontWeight: "800",
  marginTop: "2px",
};

const bomStatusPillStyle = {
  borderRadius: "999px",
  padding: "5px 8px",
  fontSize: "0.66rem",
  fontWeight: "950",
  whiteSpace: "nowrap",
};

const emptyDropdownStyle = {
  padding: "24px",
  textAlign: "center",
  color: "#64748b",
  fontWeight: "900",
};

const bomMenuFooterStyle = {
  padding: "8px",
  borderTop: "1px solid #e2e8f0",
  backgroundColor: "#f8fafc",
  display: "flex",
  justifyContent: "flex-end",
};

const siteOkButtonStyle = {
  border: "none",
  background: "linear-gradient(180deg, #ef2b2b 0%, #dc2626 100%)",
  color: "#fff",
  borderRadius: "6px",
  padding: "6px 14px",
  fontWeight: "950",
  fontSize: "0.78rem",
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(220,38,38,0.18)",
};

const actionClusterStyle = {
  display: "flex",
  gap: "8px",
  justifyContent: "flex-end",
};

const primaryRedButtonStyle = {
  height: "33px",
  border: "none",
  background: "linear-gradient(180deg, #ef2b2b 0%, #dc2626 100%)",
  color: "#fff",
  padding: "0 14px",
  borderRadius: "6px",
  fontWeight: "950",
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(220,38,38,0.18)",
};

const secondaryButtonStyle = {
  height: "33px",
  border: "1px solid #cbd5e1",
  backgroundColor: "#fff",
  color: "#334155",
  padding: "0 12px",
  borderRadius: "6px",
  fontWeight: "950",
  cursor: "pointer",
};

const greenButtonStyle = {
  height: "33px",
  border: "none",
  background: "linear-gradient(180deg, #16a34a 0%, #15803d 100%)",
  color: "#fff",
  padding: "0 14px",
  borderRadius: "6px",
  fontWeight: "950",
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(22,163,74,0.22)",
};

const excelButtonStyle = {
  ...greenButtonStyle,
};

const dangerButtonStyle = {
  height: "33px",
  border: "1px solid #fecaca",
  backgroundColor: "#fff1f2",
  color: "#991b1b",
  padding: "0 12px",
  borderRadius: "6px",
  fontWeight: "950",
  cursor: "pointer",
};

const messageBoxStyle = {
  marginBottom: "16px",
  padding: "11px 13px",
  backgroundColor: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: "8px",
  fontWeight: "850",
  width: "fit-content",
};

const emptyStateStyle = {
  minHeight: "420px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  textAlign: "center",
  color: "#64748b",
  border: "1px dashed #cbd5e1",
  borderRadius: "10px",
  backgroundColor: "#f8fafc",
};

const emptyIconStyle = {
  fontSize: "3.2rem",
  marginBottom: "8px",
};

const emptyTitleStyle = {
  color: "#1f2937",
  margin: "8px 0 6px 0",
  fontWeight: "950",
};

const emptyTextStyle = {
  maxWidth: "380px",
  margin: 0,
  lineHeight: "1.5",
  fontWeight: "750",
};

const editorHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "18px",
  borderTop: "1px solid #e2e8f0",
  paddingTop: "20px",
};

const editorTitleStyle = {
  color: "#172033",
  fontSize: "1.35rem",
  fontWeight: "950",
  marginTop: "4px",
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const activeBadgeStyle = {
  borderRadius: "999px",
  padding: "5px 9px",
  fontSize: "0.68rem",
  fontWeight: "950",
};

const editorActionsStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const productEditGridStyle = {
  display: "grid",
  gridTemplateColumns: "260px 1fr",
  gap: "14px",
  marginTop: "18px",
};

const componentToolbarStyle = {
  marginTop: "24px",
  marginBottom: "12px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "18px",
};

const sectionTitleStyle = {
  color: "#172033",
  fontWeight: "950",
  fontSize: "1rem",
};

const sectionSubtitleStyle = {
  color: "#64748b",
  fontWeight: "750",
  fontSize: "0.82rem",
  marginTop: "3px",
};

const tableScrollStyle = {
  maxHeight: "62vh",
  minHeight: "430px",
  overflowY: "auto",
  overflowX: "auto",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
};

const componentTableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.84rem",
  minWidth: "1360px",
};

const thStyle = {
  borderRight: "1px solid #dbe3ea",
  borderBottom: "1px solid #dbe3ea",
  padding: "8px 8px",
  color: "#172033",
  textAlign: "center",
  fontWeight: "950",
  backgroundColor: "#f8fafc",
  position: "sticky",
  top: 0,
  zIndex: 4,
  letterSpacing: "0.02em",
  whiteSpace: "nowrap",
};

const tdStyle = {
  borderRight: "1px solid #dbe3ea",
  borderBottom: "1px solid #dbe3ea",
  padding: "6px 8px",
  color: "#172033",
  textAlign: "center",
  fontWeight: "800",
  height: "32px",
  backgroundClip: "padding-box",
};

const tableInputStyle = {
  width: "100%",
  height: "29px",
  minWidth: "120px",
  border: "1px solid #cbd5e1",
  borderRadius: "5px",
  padding: "0 9px",
  outline: "none",
  boxSizing: "border-box",
  color: "#0f172a",
  fontWeight: "800",
  backgroundColor: "#fff",
};

const catalogMenuStyle = {
  position: "absolute",
  zIndex: 120,
  top: "39px",
  left: "8px",
  width: "310px",
  backgroundColor: "#fff",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  boxShadow: "0 14px 28px rgba(15,23,42,0.18)",
  overflow: "hidden",
};

const catalogOptionStyle = {
  width: "100%",
  border: "none",
  borderBottom: "1px solid #eef2f7",
  backgroundColor: "#fff",
  padding: "9px 11px",
  textAlign: "left",
  cursor: "pointer",
};

const chipsWrapStyle = {
  marginTop: "5px",
  display: "flex",
  gap: "5px",
  flexWrap: "wrap",
};

const chipStyle = {
  backgroundColor: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: "999px",
  padding: "3px 7px",
  fontSize: "0.68rem",
  fontWeight: "950",
};

const smallActionButtonStyle = {
  border: "1px solid #cbd5e1",
  borderRadius: "5px",
  padding: "6px 9px",
  fontWeight: "950",
  cursor: "pointer",
};

const hintBoxStyle = {
  marginTop: "14px",
  padding: "11px 13px",
  backgroundColor: "#eff6ff",
  color: "#1e3a8a",
  borderRadius: "8px",
  fontWeight: "800",
  width: "fit-content",
  maxWidth: "680px",
};