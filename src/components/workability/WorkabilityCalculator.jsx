import { useEffect, useMemo, useState } from "react";
import { Download, PackageSearch, RotateCcw, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { fetchInventoryBatchMap } from "./inventoryApi";
import {
  FILTER_NONE,
  SITE_ALL,
  calculateCasesPossible,
  formatDate,
  getComponentOptionRows,
  getQtyPerCaseForComponentOption,
  getDaysRemaining,
  getDefaultSiteForCustomer,
  getInventoryRows,
  getSelectedSkuForBomComponent,
  getShelfLifeColor,
  getSitesForCustomer,
  normalizeKey,
} from "./workabilityHelpers";
import {
  exportWorkabilityDetailExcel,
  exportWorkabilitySummaryExcel,
} from "./exportWorkabilityExcel";
import { getMdlzSearchCandidatesForComponent } from "../mdlz/searchRules";

export default function WorkabilityCalculator() {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  const [clients, setClients] = useState([]);
  const [customer, setCustomer] = useState("");
  const [selectedSites, setSelectedSites] = useState([]);
  const [draftSelectedSites, setDraftSelectedSites] = useState([]);
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
  const [openComponentOptionId, setOpenComponentOptionId] = useState(null);

  const selectedSite = selectedSites[0] || SITE_ALL;
  const [products, setProducts] = useState([]);
  const [components, setComponents] = useState([]);
  const [inventory, setInventory] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({});

  const [skuSearch, setSkuSearch] = useState("");
  const [skuHighlightIndex, setSkuHighlightIndex] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [selectedDetailId, setSelectedDetailId] = useState(null);
  const [detailShelfLifeDays, setDetailShelfLifeDays] = useState("");
  const [shelfLifeApplied, setShelfLifeApplied] = useState(false);

  const [openFilter, setOpenFilter] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    field: null,
    direction: null,
  });
  const [expandedDates, setExpandedDates] = useState({});

  const [filters, setFilters] = useState({
    site: [],
    location: [],
    pallet: [],
    lot: [],
    expDate: [],
  });

  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingComponents, setLoadingComponents] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [inventoryLoadError, setInventoryLoadError] = useState("");

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

  const getPrimarySkuForComponent = (component) => {
    const optionRows = getComponentOptionRows(component);
    return optionRows[0]?.sku || normalizeKey(component.component_sku);
  };

  const getSelectedSkuForComponent = (component) => {
    return getSelectedSkuForBomComponent(component, selectedOptions);
  };

  const getQtyPerCaseForComponent = (component, itemSku = null) => {
    const skuToUse = itemSku || getSelectedSkuForComponent(component);
    return getQtyPerCaseForComponentOption(component, skuToUse);
  };

  const getInventorySearchCandidatesForComponent = (component, itemSku = null) => {
    const customerCode = normalizeKey(customer);
    const skuToUse = itemSku || getSelectedSkuForComponent(component);

    if (customerCode === "MDLZ") {
      return getMdlzSearchCandidatesForComponent(component, skuToUse);
    }

    return [normalizeKey(skuToUse)].filter(Boolean);
  };

  const loadClients = async () => {
    setLoadingClients(true);

    const { data, error } = await supabase
      .from("workability_clients")
      .select("*")
      .eq("active", true)
      .order("code", { ascending: true });

    if (error) {
      console.error("Load workability clients error:", error);
      alert("Unable to load Workability clients.");
      setLoadingClients(false);
      return;
    }

    const list = data || [];
    setClients(list);

    if (list.length > 0) {
      const hasMdlz = list.find((client) => client.code === "MDLZ");
      setCustomer(hasMdlz ? "MDLZ" : list[0].code);
    }

    setLoadingClients(false);
  };

  const loadProducts = async (clientCode) => {
    if (!clientCode) {
      setProducts([]);
      return;
    }

    setLoadingProducts(true);

    const { data, error } = await supabase
      .from("workability_products")
      .select("*")
      .eq("customer", clientCode)
      .eq("active", true)
      .order("sku", { ascending: true });

    if (error) {
      console.error("Load workability products error:", error);
      alert("Unable to load SKUs for this customer.");
      setLoadingProducts(false);
      return;
    }

    setProducts(data || []);
    setLoadingProducts(false);
  };

  const loadInventory = async (bomComponents, sitesToUse = selectedSites) => {
    if (!bomComponents || bomComponents.length === 0) {
      setInventory({});
      return;
    }

    const cleanSites = Array.from(
      new Set(
        (Array.isArray(sitesToUse) ? sitesToUse : [sitesToUse])
          .filter(Boolean)
      )
    );

    setLoadingInventory(true);
    setInventoryLoadError("");

    try {
      const map = await fetchInventoryBatchMap({
        bomComponents,
        siteToUse: cleanSites[0] || SITE_ALL,
        selectedSites: cleanSites,
        customer,
      });

      setInventory(map);
    } catch (err) {
      console.error("Inventory server error:", err);
      setInventoryLoadError("Inventory Server not connected.");
      setInventory({});
    } finally {
      setLoadingInventory(false);
    }
  };

  const loadComponents = async (productId) => {
    if (!productId) {
      setComponents([]);
      setInventory({});
      setInventoryLoadError("");
      setSelectedOptions({});
      setSelectedDetailId(null);
      return;
    }

    setLoadingComponents(true);
    setInventory({});
    setSelectedOptions({});
    setSelectedDetailId(null);
    setShelfLifeApplied(false);
    setDetailShelfLifeDays("");
    setOpenFilter(null);
    setSortConfig({ field: null, direction: null });
    setExpandedDates({});
    setFilters({
      site: [],
      location: [],
      pallet: [],
      lot: [],
      expDate: [],
    });

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

    const bomComponents = data || [];
    const defaults = {};

    bomComponents.forEach((component) => {
      defaults[component.id] = getPrimarySkuForComponent(component);
    });

    setComponents(bomComponents);
    setSelectedOptions(defaults);
    setLoadingComponents(false);

    await loadInventory(bomComponents, selectedSites);
  };

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (!customer) return;

    const defaultSite = getDefaultSiteForCustomer(customer);
    const defaultSites = defaultSite ? [defaultSite] : [];

    setSkuSearch("");
    setSelectedSites(defaultSites);
    setDraftSelectedSites(defaultSites);
    setSiteDropdownOpen(false);
    setOpenComponentOptionId(null);
    setSelectedProduct(null);
    setComponents([]);
    setInventory({});
    setSelectedOptions({});
    setSelectedDetailId(null);
    loadProducts(customer);
  }, [customer]);

  useEffect(() => {
    if (!selectedProduct || components.length === 0 || selectedSites.length === 0) return;

    setSelectedDetailId(null);
    setOpenFilter(null);
    setExpandedDates({});
    setOpenComponentOptionId(null);
    setFilters({
      site: [],
      location: [],
      pallet: [],
      lot: [],
      expDate: [],
    });

    loadInventory(components, selectedSites);
  }, [selectedSites]);

  const filteredProducts = products.filter((item) => {
    const search = skuSearch.toLowerCase();

    return (
      item.sku.toLowerCase().includes(search) ||
      item.description.toLowerCase().includes(search)
    );
  });

  useEffect(() => {
    setSkuHighlightIndex(0);
  }, [skuSearch, filteredProducts.length]);

  const handleSkuKeyDown = async (event) => {
    if (!skuSearch || selectedProduct || filteredProducts.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSkuHighlightIndex((prev) =>
        prev >= filteredProducts.length - 1 ? 0 : prev + 1
      );
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSkuHighlightIndex((prev) =>
        prev <= 0 ? filteredProducts.length - 1 : prev - 1
      );
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const selected = filteredProducts[skuHighlightIndex] || filteredProducts[0];
      if (selected) await handleSelectSku(selected);
    }
  };

  const handleSelectSku = async (product) => {
    setSelectedProduct(product);
    setSkuSearch(`${product.sku} - ${product.description}`);
    await loadComponents(product.id);
  };

  const getInventoryForSku = (itemSku) => {
    const key = normalizeKey(itemSku);
    return inventory[key] || null;
  };

  const getInventoryForComponent = (component, itemSku = null) => {
    const candidates = getInventorySearchCandidatesForComponent(component, itemSku);

    for (const candidate of candidates) {
      const found = getInventoryForSku(candidate);
      if (found) return found;
    }

    return null;
  };

  const getInventoryRowsForComponent = (component, itemSku = null) => {
    const skuToUse = itemSku || getSelectedSkuForComponent(component);
    const inv = getInventoryForComponent(component, skuToUse);
    const rows = getInventoryRows(inv, SITE_ALL, customer);
    const allowedSites = selectedSites.map(normalizeKey).filter(Boolean);

    if (!allowedSites.length) return rows;

    return rows.filter((row) => allowedSites.includes(normalizeKey(row.site)));
  };

  const getOnHand = (component, itemSku = null) => {
    const skuToUse = itemSku || getSelectedSkuForComponent(component);
    const inv = getInventoryForComponent(component, skuToUse);
    const rows = getInventoryRowsForComponent(component, skuToUse);
    const rowsOnHand = rows.reduce((sum, row) => sum + Number(row.onHand || 0), 0);

    if (rowsOnHand > 0) return rowsOnHand;

    if (inv?.totalOnHand !== undefined) {
      return Number(inv.totalOnHand || 0);
    }

    return 0;
  };

  const getCasesPossible = (component, onHandOverride = null, itemSku = null) => {
    const skuToUse = itemSku || getSelectedSkuForComponent(component);
    const onHand = onHandOverride ?? getOnHand(component, skuToUse);
    const qtyPerCase = getQtyPerCaseForComponent(component, skuToUse);
    return calculateCasesPossible(onHand, qtyPerCase);
  };

  const summaryRows = useMemo(() => {
    return components.map((component) => {
      const optionRows = getComponentOptionRows(component);
      const primary = optionRows[0] || {
        sku: normalizeKey(component.component_sku),
        qtyPerCase: component.qty_per_case,
      };

      const hasOptions = optionRows.length > 1;
      const selectedSku = selectedOptions[component.id] || primary.sku;
      const selectedOption =
        optionRows.find((option) => option.sku === selectedSku) || primary;

      const onHand = getOnHand(component, selectedOption.sku);
      const casesPossible = getCasesPossible(component, null, selectedOption.sku);
      const inventoryMissing =
        loadingInventory && !getInventoryForComponent(component, selectedOption.sku);

      return {
        component,
        optionRows,
        hasOptions,
        selectedOption,
        onHand,
        casesPossible,
        inventoryMissing,
      };
    });
  }, [components, selectedOptions, inventory, loadingInventory, selectedSites, customer]);

  const limitingMaterial = useMemo(() => {
    if (!summaryRows.length) return null;

    const validRows = summaryRows
      .filter((row) => row.selectedOption?.sku)
      .map((row) => ({
        item: row.selectedOption.sku,
        qtyPerCase: row.selectedOption.qtyPerCase,
        onHand: row.onHand,
        casesPossible: row.casesPossible,
      }))
      .sort((a, b) => a.casesPossible - b.casesPossible);

    return validRows[0] || null;
  }, [summaryRows]);

  const selectedDetailComponent = components.find(
    (component) => component.id === selectedDetailId
  );

  const detailRows = selectedDetailComponent
    ? getInventoryRowsForComponent(selectedDetailComponent)
    : [];

  const uniqueValues = (field) => {
    const values = detailRows
      .map((row) => (field === "expDate" ? formatDate(row.expDate) : row[field]))
      .filter(Boolean);

    return Array.from(new Set(values)).sort();
  };

  const isRowVisibleByFilter = (row, field, value) => {
    if (!value || value.length === 0) return true;
    if (value.includes(FILTER_NONE)) return false;

    const rowValue = field === "expDate" ? formatDate(row.expDate) : row[field];
    return value.includes(rowValue);
  };

  const filteredDetailRows = detailRows.filter((row) => {
    return (
      isRowVisibleByFilter(row, "site", filters.site) &&
      isRowVisibleByFilter(row, "location", filters.location) &&
      isRowVisibleByFilter(row, "pallet", filters.pallet) &&
      isRowVisibleByFilter(row, "lot", filters.lot) &&
      isRowVisibleByFilter(row, "expDate", filters.expDate)
    );
  });

  const sortedDetailRows = [...filteredDetailRows].sort((a, b) => {
    if (!sortConfig.field || !sortConfig.direction) return 0;

    const getValue = (row) => {
      if (sortConfig.field === "expDate") return new Date(row.expDate).getTime() || 0;
      return String(row[sortConfig.field] || "").toLowerCase();
    };

    const valueA = getValue(a);
    const valueB = getValue(b);

    if (valueA < valueB) return sortConfig.direction === "asc" ? -1 : 1;
    if (valueA > valueB) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const shelfLifeDays = Number(detailShelfLifeDays || 0);

  const handleOpenDetail = (component, itemSku = null) => {
    const skuToUse = itemSku || getSelectedSkuForComponent(component);

    setSelectedOptions((prev) => ({
      ...prev,
      [component.id]: skuToUse,
    }));

    setSelectedDetailId(component.id);
    setOpenComponentOptionId(null);
    setShelfLifeApplied(false);
    setDetailShelfLifeDays("");
    setOpenFilter(null);
    setSortConfig({ field: null, direction: null });
    setExpandedDates({});
    setFilters({
      site: [],
      location: [],
      pallet: [],
      lot: [],
      expDate: [],
    });
  };

  const handleApplyShelfLife = () => {
    if (!detailShelfLifeDays || Number(detailShelfLifeDays) <= 0) {
      alert("Enter Shelf Life days first.");
      return;
    }

    setShelfLifeApplied(true);
  };

  const clearFilters = () => {
    setFilters({
      site: [],
      location: [],
      pallet: [],
      lot: [],
      expDate: [],
    });
    setOpenFilter(null);
    setSortConfig({
      field: null,
      direction: null,
    });
  };

  const handleDownloadSummaryExcel = () => {
    exportWorkabilitySummaryExcel({
      customer,
      selectedProduct,
      components,
      getSelectedSkuForComponent,
      getQtyPerCaseForComponent,
      getOnHand,
      getCasesPossible,
    });
  };

  const handleDownloadDetailExcel = () => {
    exportWorkabilityDetailExcel({
      customer,
      selectedProduct,
      selectedDetailComponent,
      sortedDetailRows,
      detailDisplayRows,
      isMultiSite,
      shelfLifeApplied,
      detailShelfLifeDays,
      shelfLifeDays,
      getSelectedSkuForComponent,
      getCasesPossible,
    });
  };

  const availableSites = useMemo(() => {
    return Array.from(new Set((getSitesForCustomer(customer) || []).filter(Boolean)));
  }, [customer]);
  const isMultiSite = selectedSites.length > 1;
  const selectedSiteLabel =
    selectedSites.length === 0
      ? "Select site..."
      : selectedSites.length === availableSites.length
        ? "All sites"
        : selectedSites.length === 1
          ? selectedSites[0]
          : `${selectedSites.length} sites selected`;

  const openSiteDropdown = () => {
    const cleanSites = Array.from(new Set((selectedSites || []).filter(Boolean)));
    setDraftSelectedSites(cleanSites);
    setSiteDropdownOpen((prev) => !prev);
  };

  const toggleDraftSite = (site) => {
    setDraftSelectedSites((prev) => {
      const cleanPrev = Array.from(new Set((prev || []).filter(Boolean)));

      if (cleanPrev.includes(site)) {
        return cleanPrev.filter((item) => item !== site);
      }

      return [...cleanPrev, site];
    });
  };

  const toggleDraftAllSites = () => {
    setDraftSelectedSites((prev) =>
      prev.length === availableSites.length ? [] : [...availableSites]
    );
  };

  const clearSiteFilter = () => {
    const defaultSite = getDefaultSiteForCustomer(customer);
    setDraftSelectedSites(defaultSite ? [defaultSite] : []);
  };

  const applySiteSelection = () => {
    const defaultSite = getDefaultSiteForCustomer(customer);
    const uniqueDraftSites = Array.from(
      new Set((draftSelectedSites || []).filter(Boolean))
    );

    const nextSites = uniqueDraftSites.length
      ? uniqueDraftSites
      : [defaultSite].filter(Boolean);

    setSelectedSites(nextSites);
    setDraftSelectedSites(nextSites);
    setSiteDropdownOpen(false);
  };

  const groupedDetailRows = sortedDetailRows.reduce((groups, row) => {
    const siteKey = row.site || "NO SITE";
    const dateKey = formatDate(row.expDate);

    if (!groups[siteKey]) {
      groups[siteKey] = {
        id: `site-${siteKey}`,
        siteKey,
        rows: [],
        onHand: 0,
        dates: {},
      };
    }

    groups[siteKey].rows.push(row);
    groups[siteKey].onHand += Number(row.onHand || 0);

    if (!groups[siteKey].dates[dateKey]) {
      groups[siteKey].dates[dateKey] = {
        id: `group-${siteKey}-${dateKey}`,
        siteKey,
        dateKey,
        expDate: row.expDate,
        uom: row.uom,
        rows: [],
        onHand: 0,
      };
    }

    groups[siteKey].dates[dateKey].rows.push(row);
    groups[siteKey].dates[dateKey].onHand += Number(row.onHand || 0);
    return groups;
  }, {});

  const siteGroups = Object.values(groupedDetailRows);
  const groupedRows = isMultiSite ? siteGroups : Object.values(siteGroups[0]?.dates || {});
  const detailDisplayRows = [];

  if (isMultiSite) {
    siteGroups.forEach((siteGroup) => {
      detailDisplayRows.push({
        ...siteGroup,
        group: true,
        groupType: "site",
      });

      if (expandedDates[siteGroup.siteKey]) {
        Object.values(siteGroup.dates).forEach((dateGroup) => {
          detailDisplayRows.push({
            ...dateGroup,
            group: true,
            groupType: "date",
            location: `${dateGroup.rows.length} location${dateGroup.rows.length === 1 ? "" : "s"}`,
            pallet: `${dateGroup.rows.length} pallet${dateGroup.rows.length === 1 ? "" : "s"}`,
            lot: `${dateGroup.rows.length} lot${dateGroup.rows.length === 1 ? "" : "s"}`,
          });

          const dateExpandKey = `${dateGroup.siteKey}-${dateGroup.dateKey}`;

          if (expandedDates[dateExpandKey]) {
            dateGroup.rows.forEach((row) => {
              detailDisplayRows.push({
                ...row,
                child: true,
                id: `${dateExpandKey}-${row.id}`,
              });
            });
          }
        });
      }
    });
  } else {
    groupedRows.forEach((group) => {
      detailDisplayRows.push({
        ...group,
        group: true,
        groupType: "date",
        location: `${group.rows.length} location${group.rows.length === 1 ? "" : "s"}`,
        pallet: `${group.rows.length} pallet${group.rows.length === 1 ? "" : "s"}`,
        lot: `${group.rows.length} lot${group.rows.length === 1 ? "" : "s"}`,
      });

      if (expandedDates[group.dateKey]) {
        group.rows.forEach((row) => {
          detailDisplayRows.push({
            ...row,
            child: true,
            id: `${group.dateKey}-${row.id}`,
          });
        });
      }
    });
  }

  while (detailDisplayRows.length < 8) {
    detailDisplayRows.push({
      empty: true,
      id: `empty-${detailDisplayRows.length}`,
    });
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <span style={logoStyle}>1NICO</span>
          <span style={workstationStyle}>Workstation</span>
        </div>

        <div style={headerTitleStyle}>WORKABILITY CALCULATOR</div>

        <div style={dateBoxStyle}>
          <div style={dateTextStyle}>{formattedDate}</div>
          <div style={timeTextStyle}>{formattedTime}</div>
        </div>
      </div>

      <div style={contentWrapStyle}>
        <div style={mainCardStyle}>
          <div style={topControlsStyle}>
            <div>
              <label style={labelStyle}>CUSTOMER</label>
              <select
                value={customer}
                disabled={loadingClients}
                onChange={(e) => setCustomer(e.target.value)}
                style={inputStyle}
              >
                {clients.length === 0 && (
                  <option value="">
                    {loadingClients ? "Loading..." : "No clients found"}
                  </option>
                )}

                {clients.map((client) => (
                  <option key={client.id} value={client.code}>
                    {client.code}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ position: "relative" }}>
              <label style={labelStyle}>SITE</label>
              <button type="button" onClick={openSiteDropdown} style={siteDropdownButtonStyle}>
                <span>{selectedSiteLabel}</span>
                <span>▼</span>
              </button>

              {siteDropdownOpen && (
                <div style={siteMenuStyle}>
                  <div style={siteMenuActionsStyle}>
                    <button type="button" onClick={clearSiteFilter} style={siteMiniButtonStyle}>
                      Clear Filter
                    </button>
                    <button type="button" onClick={toggleDraftAllSites} style={siteMiniButtonStyle}>
                      {draftSelectedSites.length === availableSites.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>

                  <div style={siteOptionsScrollStyle}>
                    {availableSites.map((site) => (
                      <label key={site} style={siteCheckLabelStyle}>
                        <input
                          type="checkbox"
                          checked={draftSelectedSites.includes(site)}
                          onChange={() => toggleDraftSite(site)}
                        />
                        <span>{site}</span>
                      </label>
                    ))}
                  </div>

                  <div style={siteMenuFooterStyle}>
                    <button type="button" onClick={applySiteSelection} style={siteOkButtonStyle}>
                      OK
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ position: "relative" }}>
              <label style={labelStyle}>SKU</label>
              <input
                value={skuSearch}
                onChange={(e) => {
                  setSkuSearch(e.target.value);
                  setSelectedProduct(null);
                  setComponents([]);
                  setInventory({});
                  setSelectedOptions({});
                  setSelectedDetailId(null);
                }}
                onKeyDown={handleSkuKeyDown}
                placeholder={loadingProducts ? "Loading SKUs..." : "Type or select SKU..."}
                style={inputStyle}
              />

              {skuSearch && !selectedProduct && filteredProducts.length > 0 && (
                <div style={dropdownListStyle}>
                  {filteredProducts.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectSku(item)}
                      style={{
                        ...skuOptionStyle,
                        backgroundColor: index === skuHighlightIndex ? "#eff6ff" : "#fff",
                      }}
                    >
                      <div style={{ color: "#0f172a", fontWeight: "900" }}>
                        {item.sku}
                      </div>
                      <div style={{ color: "#64748b", fontSize: "0.8rem" }}>
                        {item.description}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedProduct && components.length > 0 && (
              <button
                type="button"
                onClick={handleDownloadSummaryExcel}
                style={downloadBtnStyle}
                title="Download Summary Excel"
              >
                <Download size={15} />
                Excel
              </button>
            )}
          </div>

          {!selectedProduct ? (
            <EmptyState />
          ) : loadingComponents ? (
            <div style={emptyStateStyle}>
              <PackageSearch size={54} color="#94a3b8" />
              <h2 style={emptyTitleStyle}>LOADING BOM</h2>
              <p style={emptyTextStyle}>Reading BOM components.</p>
            </div>
          ) : (
            <div>
              <div style={productTitleStyle}>{selectedProduct.description}</div>

              {loadingInventory && (
                <div style={inventoryStatusStyle}>
                  Loading inventory in the background...
                </div>
              )}

              {!loadingInventory && inventoryLoadError && (
                <div style={inventoryErrorStyle}>
                  <AlertCircle size={20} />
                  <div>
                    <strong>{inventoryLoadError}</strong>
                    <span>
                      BOM components are loaded. Start or check the Inventory Server, then
                      change Site or reselect SKU.
                    </span>
                  </div>
                </div>
              )}

              <table style={summaryTableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>ITEMS #</th>
                    <th style={thStyle}>QTY/CS</th>
                    <th style={thStyle}>ON HAND</th>
                    <th style={thStyle}>CASES POSSIBLE</th>
                  </tr>
                </thead>

                <tbody>
                  {summaryRows.map((row) => {
                    const {
                      component,
                      optionRows,
                      hasOptions,
                      selectedOption,
                      onHand,
                      casesPossible,
                      inventoryMissing,
                    } = row;

                    return (
                      <tr key={component.id}>
                        <td style={{ ...tdStyle, textAlign: "left" }}>
                          {hasOptions ? (
                            <div style={itemDropdownShellStyle}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDetail(component, selectedOption.sku);
                                }}
                                style={itemDropdownTextStyle}
                              >
                                {selectedOption.sku}
                              </button>

                              <div style={{ position: "relative" }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenComponentOptionId((prev) =>
                                      prev === component.id ? null : component.id
                                    );
                                  }}
                                  style={itemDropdownArrowButtonStyle}
                                  title="Select component option"
                                >
                                  ▼
                                </button>

                                {openComponentOptionId === component.id && (
                                  <div style={itemOptionMenuStyle}>
                                    {optionRows.map((option) => (
                                      <button
                                        key={option.sku}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedOptions((prev) => ({
                                            ...prev,
                                            [component.id]: option.sku,
                                          }));
                                          setOpenComponentOptionId(null);
                                        }}
                                        style={{
                                          ...itemOptionButtonStyle,
                                          backgroundColor:
                                            option.sku === selectedOption.sku ? "#eff6ff" : "#fff",
                                          color:
                                            option.sku === selectedOption.sku ? "#1d5ee8" : "#0f172a",
                                        }}
                                      >
                                        {option.sku}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenDetail(component, selectedOption.sku)
                              }
                              style={itemLinkStyle}
                            >
                              {selectedOption.sku}
                            </button>
                          )}
                        </td>

                        <td style={tdStyle}>{selectedOption.qtyPerCase}</td>

                        <td style={tdStyle}>
                          {inventoryMissing ? "Loading..." : onHand.toLocaleString("en-US")}
                        </td>

                        <td style={casesStyle}>
                          {inventoryMissing
                            ? "Loading..."
                            : `${casesPossible.toLocaleString("en-US")} CS`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {limitingMaterial && (
                <div style={limitingCardStyle}>
                  <div>
                    <div style={limitingLabelStyle}>LIMITING MATERIAL</div>
                    <div style={limitingItemStyle}>{limitingMaterial.item}</div>
                  </div>

                  <div style={limitingRightStyle}>
                    <div style={limitingCasesStyle}>
                      {limitingMaterial.casesPossible.toLocaleString("en-US")} CS
                    </div>
                    <div style={limitingSubStyle}>
                      On Hand: {limitingMaterial.onHand.toLocaleString("en-US")} · Qty/CS:{" "}
                      {limitingMaterial.qtyPerCase}
                    </div>
                  </div>
                </div>
              )}

              <div style={hintBoxStyle}>
                Click item number to view inventory details. Use ▼ only to change item option.
              </div>
            </div>
          )}
        </div>

        {selectedDetailComponent && (
          <div style={{ marginTop: "22px" }}>
            <div style={dividerStyle}>CLICKED ITEM DETAILS</div>

            <div style={mainCardStyle}>
              <div style={detailHeaderStyle}>
                <button
                  type="button"
                  onClick={() => setSelectedDetailId(null)}
                  style={backBtnStyle}
                >
                  ← BACK TO SUMMARY
                </button>

                <div>
                  <div style={{ fontWeight: "900", fontSize: "1.2rem", color: "#0f172a" }}>
                    ITEM DETAILS:{" "}
                    <span style={{ color: "#1d4ed8" }}>
                      {getSelectedSkuForComponent(selectedDetailComponent)}
                    </span>
                  </div>
                  <div style={{ marginTop: "4px", color: "#64748b", fontWeight: "800" }}>
                    Qty/Case: {getQtyPerCaseForComponent(selectedDetailComponent)}
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>
                    SHELF LIFE <span style={{ fontWeight: "500" }}>(OPTIONAL)</span>
                  </label>

                  <div style={{ display: "flex" }}>
                    <input
                      value={detailShelfLifeDays}
                      onChange={(e) => {
                        setDetailShelfLifeDays(e.target.value.replace(/\D/g, ""));
                        setShelfLifeApplied(false);
                      }}
                      placeholder="Enter days"
                      style={{
                        ...inputStyle,
                        borderTopRightRadius: 0,
                        borderBottomRightRadius: 0,
                      }}
                    />

                    <button type="button" onClick={handleApplyShelfLife} style={applyInsideBtnStyle}>
                      APPLY
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={handleDownloadDetailExcel}
                    style={smallExcelBtnStyle}
                    title="Download Item Detail Excel"
                  >
                    <Download size={15} />
                    Excel
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: "10px" }}>
                <button type="button" onClick={clearFilters} style={clearBtnStyle}>
                  <RotateCcw size={14} />
                  Clear Filters
                </button>
              </div>

              <div style={tableScrollStyle}>
                <table style={detailTableStyle}>
                  <thead>
                    <tr>
                      {isMultiSite && (
                        <FilterHeader
                          id="site"
                          field="site"
                          label="SITE"
                          values={uniqueValues("site")}
                          selected={filters.site}
                          openFilter={openFilter}
                          setOpenFilter={setOpenFilter}
                          sortConfig={sortConfig}
                          setSortConfig={setSortConfig}
                          onChange={(value) =>
                            setFilters((prev) => ({ ...prev, site: value }))
                          }
                        />
                      )}

                      <FilterHeader
                        id="location"
                        field="location"
                        label="LOCATION"
                        values={uniqueValues("location")}
                        selected={filters.location}
                        openFilter={openFilter}
                        setOpenFilter={setOpenFilter}
                        sortConfig={sortConfig}
                        setSortConfig={setSortConfig}
                        onChange={(value) =>
                          setFilters((prev) => ({ ...prev, location: value }))
                        }
                      />

                      <FilterHeader
                        id="pallet"
                        field="pallet"
                        label="PALLET"
                        values={uniqueValues("pallet")}
                        selected={filters.pallet}
                        openFilter={openFilter}
                        setOpenFilter={setOpenFilter}
                        sortConfig={sortConfig}
                        setSortConfig={setSortConfig}
                        onChange={(value) =>
                          setFilters((prev) => ({ ...prev, pallet: value }))
                        }
                      />

                      <th style={thStyle}>UOM</th>

                      <FilterHeader
                        id="lot"
                        field="lot"
                        label="LOT"
                        values={uniqueValues("lot")}
                        selected={filters.lot}
                        openFilter={openFilter}
                        setOpenFilter={setOpenFilter}
                        sortConfig={sortConfig}
                        setSortConfig={setSortConfig}
                        onChange={(value) =>
                          setFilters((prev) => ({ ...prev, lot: value }))
                        }
                      />

                      <FilterHeader
                        id="expDate"
                        field="expDate"
                        label="EXP DATE"
                        values={uniqueValues("expDate")}
                        selected={filters.expDate}
                        openFilter={openFilter}
                        setOpenFilter={setOpenFilter}
                        sortConfig={sortConfig}
                        setSortConfig={setSortConfig}
                        onChange={(value) =>
                          setFilters((prev) => ({ ...prev, expDate: value }))
                        }
                      />

                      <th style={thStyle}>ON HAND</th>
                      <th style={thStyle}>SHELF LIFE</th>
                      <th style={thStyle}>WORKABILITY</th>
                    </tr>
                  </thead>

                  <tbody>
                    {groupedRows.length === 0 ? (
                      <tr>
                        <td style={tdStyle} colSpan={isMultiSite ? 9 : 8}>
                          No inventory rows found for this filter.
                        </td>
                      </tr>
                    ) : (
                      detailDisplayRows.map((row) => {
                        if (row.empty) {
                          return (
                            <tr key={row.id}>
                              {isMultiSite && <td style={tdStyle}></td>}
                              <td style={tdStyle}>&nbsp;</td>
                              <td style={tdStyle}></td>
                              <td style={tdStyle}></td>
                              <td style={tdStyle}></td>
                              <td style={tdStyle}></td>
                              <td style={tdStyle}></td>
                              <td style={tdStyle}></td>
                              <td style={tdStyle}></td>
                            </tr>
                          );
                        }

                        const days = getDaysRemaining(row.expDate);
                        const status = getShelfLifeColor(days, shelfLifeDays);
                        const blocked =
                          shelfLifeApplied &&
                          shelfLifeDays > 0 &&
                          days !== null &&
                          days < shelfLifeDays;

                        if (isMultiSite && row.groupType === "site") {
                          return (
                            <tr key={row.id} style={siteGroupRowStyle}>
                              <td style={{ ...tdStyle, textAlign: "left" }}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedDates((prev) => ({
                                      ...prev,
                                      [row.siteKey]: !prev[row.siteKey],
                                    }))
                                  }
                                  style={collapseButtonStyle}
                                >
                                  {expandedDates[row.siteKey] ? "∨" : ">"}
                                </button>
                                {row.siteKey}
                              </td>
                              <td style={tdStyle} colSpan={5}>
                                {row.rows.length} inventory row{row.rows.length === 1 ? "" : "s"}
                              </td>
                              <td style={tdStyle}>{row.onHand.toLocaleString("en-US")}</td>
                              <td style={tdStyle}>-</td>
                              <td style={tdStyle}>
                                {`${getCasesPossible(selectedDetailComponent, row.onHand)} CS`}
                              </td>
                            </tr>
                          );
                        }

                        if (row.group) {
                          const dateExpandKey = isMultiSite
                            ? `${row.siteKey}-${row.dateKey}`
                            : row.dateKey;

                          return (
                            <tr key={row.id} style={groupRowStyle}>
                              {isMultiSite && <td style={tdStyle}></td>}
                              <td style={{ ...tdStyle, textAlign: "left" }}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedDates((prev) => ({
                                      ...prev,
                                      [dateExpandKey]: !prev[dateExpandKey],
                                    }))
                                  }
                                  style={collapseButtonStyle}
                                >
                                  {expandedDates[dateExpandKey] ? "∨" : ">"}
                                </button>
                                {row.location}
                              </td>
                              <td style={tdStyle}>{row.pallet}</td>
                              <td style={tdStyle}>{row.uom}</td>
                              <td style={tdStyle}>{row.lot}</td>
                              <td
                                style={{
                                  ...tdStyle,
                                  color: status === "bad" ? "#dc2626" : "#166534",
                                }}
                              >
                                {formatDate(row.expDate)}
                              </td>
                              <td style={tdStyle}>{row.onHand.toLocaleString("en-US")}</td>
                              <td style={tdStyle}>
                                {shelfLifeApplied ? (
                                  <span style={badgeStyle(status)}>
                                    {days !== null ? `${days} DAYS` : "-"}
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td style={tdStyle}>
                                {blocked
                                  ? "0 CS"
                                  : `${getCasesPossible(selectedDetailComponent, row.onHand)} CS`}
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={row.id} style={row.child ? childRowStyle : undefined}>
                            {isMultiSite && <td style={tdStyle}>{row.site || "-"}</td>}
                            <td
                              style={{
                                ...tdStyle,
                                textAlign: "left",
                                paddingLeft: row.child ? "32px" : "10px",
                              }}
                            >
                              {row.child ? "↳ " : ""}
                              {row.location || "-"}
                            </td>
                            <td style={tdStyle}>{row.pallet}</td>
                            <td style={tdStyle}>{row.uom}</td>
                            <td style={tdStyle}>{row.lot}</td>
                            <td
                              style={{
                                ...tdStyle,
                                color: status === "bad" ? "#dc2626" : "#166534",
                              }}
                            >
                              {formatDate(row.expDate)}
                            </td>
                            <td style={tdStyle}>{row.onHand}</td>
                            <td style={tdStyle}>
                              {shelfLifeApplied ? (
                                <span style={badgeStyle(status)}>
                                  {days !== null ? `${days} DAYS` : "-"}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td style={tdStyle}>
                              {blocked
                                ? "0 CS"
                                : `${getCasesPossible(selectedDetailComponent, row.onHand)} CS`}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={emptyStateStyle}>
      <PackageSearch size={58} color="#94a3b8" />
      <h2 style={emptyTitleStyle}>SELECT A SKU</h2>
      <p style={emptyTextStyle}>
        Select a customer and SKU to load components and calculate workability.
      </p>
    </div>
  );
}

function FilterHeader({
  id,
  field,
  label,
  values,
  selected,
  onChange,
  openFilter,
  setOpenFilter,
  sortConfig,
  setSortConfig,
}) {
  return (
    <th style={thStyle}>
      <ExcelFilter
        id={id}
        field={field}
        label={label}
        values={values}
        selected={selected}
        openFilter={openFilter}
        setOpenFilter={setOpenFilter}
        sortConfig={sortConfig}
        setSortConfig={setSortConfig}
        onChange={onChange}
      />
    </th>
  );
}

function ExcelFilter({
  id,
  field,
  label,
  values,
  selected,
  onChange,
  openFilter,
  setOpenFilter,
  sortConfig,
  setSortConfig,
}) {
  const [draft, setDraft] = useState(selected || []);
  const isOpen = openFilter === id;
  const isNone = draft.includes(FILTER_NONE);
  const isAllSelected = !isNone && (draft.length === 0 || draft.length === values.length);

  useEffect(() => {
    setDraft(selected || []);
  }, [selected, isOpen]);

  const toggleValue = (value) => {
    setDraft((prev) => {
      if (prev.includes(FILTER_NONE)) return [value];

      if (prev.length === 0) {
        return values.filter((item) => item !== value);
      }

      if (prev.includes(value)) {
        const next = prev.filter((item) => item !== value);
        return next.length === 0 ? [FILTER_NONE] : next;
      }

      return [...prev, value];
    });
  };

  const toggleAll = () => {
    setDraft(isAllSelected ? [FILTER_NONE] : []);
  };

  const apply = () => {
    if (draft.includes(FILTER_NONE)) {
      onChange([FILTER_NONE]);
    } else if (draft.length === values.length) {
      onChange([]);
    } else {
      onChange(draft);
    }

    setOpenFilter(null);
  };

  const selectedLabel = selected.includes(FILTER_NONE)
    ? "(0)"
    : selected.length > 0
      ? `(${selected.length})`
      : "▼";

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpenFilter(isOpen ? null : id)}
        style={headerFilterButtonStyle}
      >
        <span>{label}</span>
        <span style={{ fontSize: "0.7rem", color: "#64748b" }}>{selectedLabel}</span>
      </button>

      {isOpen && (
        <div style={excelFilterMenuStyle}>
          <div style={sortBoxStyle}>
            <button
              type="button"
              style={sortButtonStyle}
              onClick={() => {
                setSortConfig({ field, direction: "asc" });
                setOpenFilter(null);
              }}
            >
              Sort A to Z
            </button>

            <button
              type="button"
              style={sortButtonStyle}
              onClick={() => {
                setSortConfig({ field, direction: "desc" });
                setOpenFilter(null);
              }}
            >
              Sort Z to A
            </button>
          </div>

          <label style={excelCheckRowStyle}>
            <input type="checkbox" checked={isAllSelected} onChange={toggleAll} />
            <span>Select All</span>
          </label>

          <div style={excelOptionsScrollStyle}>
            {values.map((value) => {
              const checked = !isNone && (draft.length === 0 || draft.includes(value));

              return (
                <label key={value} style={excelCheckRowStyle}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleValue(value)}
                  />
                  <span>{value}</span>
                </label>
              );
            })}
          </div>

          <div style={excelMenuFooterStyle}>
            <button type="button" onClick={apply} style={excelOkButtonStyle}>
              OK
            </button>
            <button
              type="button"
              onClick={() => setOpenFilter(null)}
              style={excelCancelButtonStyle}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
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
  padding: "34px 24px 48px",
  maxWidth: "1320px",
  margin: "0 auto",
};

const mainCardStyle = {
  backgroundColor: "#fff",
  padding: "40px 56px",
  borderRadius: "10px",
  border: "1px solid #dbe3ea",
  boxShadow: "0 8px 28px rgba(15, 23, 42, 0.08)",
};

const topControlsStyle = {
  display: "grid",
  gridTemplateColumns: "230px 230px 490px 100px",
  gap: "24px",
  alignItems: "end",
  marginBottom: "30px",
};

const detailHeaderStyle = {
  display: "grid",
  gridTemplateColumns: "180px 1fr 360px 90px",
  gap: "18px",
  alignItems: "end",
  marginBottom: "18px",
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
  padding: "0 14px",
  fontSize: "0.98rem",
  outline: "none",
  boxSizing: "border-box",
  backgroundColor: "#fff",
  color: "#0f172a",
  boxShadow: "inset 0 1px 1px rgba(15,23,42,0.03)",
};

const productTitleStyle = {
  marginBottom: "14px",
  color: "#758399",
  fontWeight: "950",
  fontSize: "1rem",
  letterSpacing: "0.03em",
};

const applyInsideBtnStyle = {
  border: "1px solid #1d4ed8",
  borderLeft: "none",
  backgroundColor: "#1d4ed8",
  color: "#fff",
  padding: "0 18px",
  borderTopRightRadius: "6px",
  borderBottomRightRadius: "6px",
  fontWeight: "900",
  cursor: "pointer",
};

const dropdownListStyle = {
  position: "absolute",
  zIndex: 20,
  top: "78px",
  left: 0,
  right: 0,
  backgroundColor: "#fff",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  boxShadow: "0 10px 20px rgba(15,23,42,0.12)",
  overflow: "hidden",
  maxHeight: "260px",
  overflowY: "auto",
};

const skuOptionStyle = {
  width: "100%",
  textAlign: "left",
  border: "none",
  background: "#fff",
  padding: "12px",
  cursor: "pointer",
  borderBottom: "1px solid #e2e8f0",
};

const downloadBtnStyle = {
  background: "linear-gradient(180deg, #ef2b2b 0%, #dc2626 100%)",
  color: "#fff",
  border: "none",
  padding: "0 14px",
  borderRadius: "6px",
  fontWeight: "950",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  fontSize: "0.82rem",
  width: "96px",
  height: "33px",
  boxShadow: "0 4px 12px rgba(220,38,38,0.22)",
};

const smallExcelBtnStyle = {
  ...downloadBtnStyle,
  background: "linear-gradient(180deg, #16a34a 0%, #15803d 100%)",
  boxShadow: "0 4px 12px rgba(22,163,74,0.24)",
};

const summaryTableStyle = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  fontSize: "0.95rem",
  border: "1px solid #dbe3ea",
  borderRadius: "6px",
  overflow: "hidden",
};

const detailTableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.86rem",
  minWidth: "980px",
};

const tableScrollStyle = {
  maxHeight: "62vh",
  minHeight: "520px",
  overflowY: "auto",
  overflowX: "auto",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
};

const thStyle = {
  borderRight: "1px solid #dbe3ea",
  borderBottom: "1px solid #dbe3ea",
  padding: "9px 8px",
  color: "#172033",
  textAlign: "center",
  fontWeight: "950",
  backgroundColor: "#f8fafc",
  position: "sticky",
  top: 0,
  zIndex: 4,
  overflow: "visible",
  letterSpacing: "0.02em",
};

const tdStyle = {
  borderRight: "1px solid #dbe3ea",
  borderBottom: "1px solid #dbe3ea",
  padding: "6px 12px",
  color: "#172033",
  textAlign: "center",
  fontWeight: "800",
  height: "32px",
};

const casesStyle = {
  ...tdStyle,
  color: "#11843b",
  fontWeight: "950",
};

const itemLinkStyle = {
  border: "none",
  background: "transparent",
  color: "#1d5ee8",
  fontWeight: "950",
  cursor: "pointer",
  fontSize: "0.96rem",
  textDecoration: "none",
  padding: 0,
};


const siteDropdownButtonStyle = {
  width: "100%",
  height: "33px",
  border: "1px solid #cbd5e1",
  borderRadius: "6px",
  padding: "0 12px",
  backgroundColor: "#fff",
  color: "#0f172a",
  fontSize: "0.92rem",
  fontWeight: "800",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
  boxSizing: "border-box",
  boxShadow: "inset 0 1px 1px rgba(15,23,42,0.03)",
};

const siteMenuStyle = {
  position: "absolute",
  zIndex: 50,
  top: "64px",
  left: 0,
  width: "280px",
  backgroundColor: "#fff",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  boxShadow: "0 12px 24px rgba(15,23,42,0.18)",
  overflow: "hidden",
};

const siteMenuActionsStyle = {
  display: "flex",
  gap: "6px",
  padding: "8px",
  borderBottom: "1px solid #e2e8f0",
  backgroundColor: "#f8fafc",
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

const siteOptionsScrollStyle = {
  maxHeight: "245px",
  overflowY: "auto",
};

const siteCheckLabelStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  color: "#0f172a",
  fontWeight: "850",
  fontSize: "0.82rem",
  cursor: "pointer",
  padding: "8px 10px",
  borderBottom: "1px solid #eef2f7",
};

const siteMenuFooterStyle = {
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


const itemDropdownShellStyle = {
  width: "230px",
  height: "31px",
  border: "1px solid #cbd5e1",
  borderRadius: "6px",
  backgroundColor: "#fff",
  display: "grid",
  gridTemplateColumns: "1fr 34px",
  alignItems: "center",
  overflow: "visible",
};

const itemDropdownTextStyle = {
  border: "none",
  backgroundColor: "transparent",
  color: "#1d5ee8",
  fontWeight: "950",
  cursor: "pointer",
  textAlign: "left",
  padding: "0 10px",
  height: "29px",
  fontSize: "0.92rem",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const itemDropdownArrowButtonStyle = {
  width: "34px",
  height: "31px",
  border: "none",
  borderLeft: "1px solid #cbd5e1",
  backgroundColor: "#f8fafc",
  color: "#1d5ee8",
  fontWeight: "950",
  cursor: "pointer",
  outline: "none",
};

const itemOptionMenuStyle = {
  position: "absolute",
  zIndex: 80,
  top: "34px",
  right: 0,
  width: "230px",
  backgroundColor: "#fff",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  boxShadow: "0 12px 24px rgba(15,23,42,0.18)",
  overflow: "hidden",
};

const itemOptionButtonStyle = {
  width: "100%",
  border: "none",
  borderBottom: "1px solid #eef2f7",
  backgroundColor: "#fff",
  padding: "9px 12px",
  textAlign: "left",
  cursor: "pointer",
  fontWeight: "900",
  fontSize: "0.82rem",
};

const siteGroupRowStyle = {
  backgroundColor: "#eef6ff",
};

const limitingCardStyle = {
  marginTop: "18px",
  border: "1px solid #dbe3ea",
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  padding: "14px 16px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
};

const limitingLabelStyle = {
  color: "#64748b",
  fontWeight: "950",
  fontSize: "0.72rem",
  letterSpacing: "0.06em",
};

const limitingItemStyle = {
  color: "#1d5ee8",
  fontWeight: "950",
  fontSize: "1rem",
  marginTop: "3px",
};

const limitingRightStyle = {
  textAlign: "right",
};

const limitingCasesStyle = {
  color: "#11843b",
  fontWeight: "950",
  fontSize: "1.05rem",
};

const limitingSubStyle = {
  color: "#64748b",
  fontSize: "0.78rem",
  fontWeight: "800",
  marginTop: "3px",
};

const hintBoxStyle = {
  marginTop: "18px",
  padding: "12px 14px",
  backgroundColor: "#eff6ff",
  color: "#1e3a8a",
  borderRadius: "8px",
  fontWeight: "800",
  width: "fit-content",
  maxWidth: "520px",
};

const dividerStyle = {
  textAlign: "center",
  color: "#dc2626",
  fontWeight: "950",
  borderTop: "1px dashed #ef4444",
  marginBottom: "16px",
  paddingTop: "10px",
};

const backBtnStyle = {
  border: "none",
  backgroundColor: "transparent",
  color: "#111827",
  fontWeight: "950",
  cursor: "pointer",
  textAlign: "left",
};

const clearBtnStyle = {
  border: "1px solid #cbd5e1",
  backgroundColor: "#fff",
  padding: "7px 10px",
  borderRadius: "5px",
  fontWeight: "900",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  justifyContent: "center",
  fontSize: "0.78rem",
};

const headerFilterButtonStyle = {
  width: "100%",
  border: "none",
  backgroundColor: "transparent",
  fontSize: "0.78rem",
  fontWeight: "900",
  cursor: "pointer",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "8px",
  color: "#111827",
};

const excelFilterMenuStyle = {
  position: "absolute",
  top: "20px",
  left: "calc(50% + 18px)",
  zIndex: 999,
  backgroundColor: "#fff",
  border: "1px solid #cbd5e1",
  borderRadius: "6px",
  boxShadow: "0 12px 24px rgba(15,23,42,0.18)",
  width: "205px",
  padding: "8px",
  textAlign: "left",
};

const sortBoxStyle = {
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: "6px",
  marginBottom: "6px",
};

const sortButtonStyle = {
  width: "100%",
  border: "none",
  backgroundColor: "#fff",
  color: "#111827",
  textAlign: "left",
  padding: "7px 4px",
  cursor: "pointer",
  fontSize: "0.82rem",
  fontWeight: "800",
};

const excelOptionsScrollStyle = {
  maxHeight: "150px",
  overflowY: "auto",
  borderTop: "1px solid #e5e7eb",
  borderBottom: "1px solid #e5e7eb",
  padding: "6px 0",
  margin: "6px 0",
};

const excelCheckRowStyle = {
  display: "flex",
  gap: "8px",
  alignItems: "center",
  fontSize: "0.82rem",
  padding: "5px 2px",
  color: "#111827",
  cursor: "pointer",
};

const excelMenuFooterStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
};

const excelOkButtonStyle = {
  flex: 1,
  border: "1px solid #dc2626",
  backgroundColor: "#dc2626",
  color: "#fff",
  padding: "7px 10px",
  borderRadius: "5px",
  fontWeight: "900",
  cursor: "pointer",
};

const excelCancelButtonStyle = {
  flex: 1,
  border: "1px solid #cbd5e1",
  backgroundColor: "#fff",
  color: "#334155",
  padding: "7px 10px",
  borderRadius: "5px",
  fontWeight: "900",
  cursor: "pointer",
};

const groupRowStyle = {
  backgroundColor: "#f8fafc",
};

const childRowStyle = {
  backgroundColor: "#ffffff",
};

const collapseButtonStyle = {
  border: "none",
  backgroundColor: "transparent",
  color: "#111827",
  fontWeight: "950",
  cursor: "pointer",
  marginRight: "8px",
  fontSize: "0.95rem",
};

const badgeStyle = (status) => {
  const colors = {
    bad: {
      backgroundColor: "#dc2626",
      color: "#fff",
    },
    low: {
      backgroundColor: "#fde68a",
      color: "#111827",
    },
    good: {
      backgroundColor: "#bbf7d0",
      color: "#14532d",
    },
    none: {
      backgroundColor: "#e5e7eb",
      color: "#111827",
    },
  };

  return {
    ...colors[status || "none"],
    display: "inline-block",
    minWidth: "90px",
    padding: "5px 10px",
    borderRadius: "5px",
    fontWeight: "900",
  };
};

const emptyStateStyle = {
  minHeight: "420px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  textAlign: "center",
  color: "#64748b",
};

const emptyTitleStyle = {
  color: "#1f2937",
  margin: "14px 0 6px 0",
  fontWeight: "950",
};

const emptyTextStyle = {
  maxWidth: "360px",
  margin: 0,
  lineHeight: "1.5",
};

const inventoryStatusStyle = {
  marginBottom: "14px",
  padding: "10px 12px",
  backgroundColor: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  borderRadius: "8px",
  fontWeight: "850",
  width: "fit-content",
};

const inventoryErrorStyle = {
  marginBottom: "18px",
  padding: "14px 16px",
  backgroundColor: "#fff7f7",
  color: "#b91c1c",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  fontWeight: "850",
  display: "flex",
  alignItems: "center",
  gap: "12px",
};
