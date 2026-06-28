import { useEffect, useState } from "react";
import { ClipboardCheck, PackageSearch, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabase";

const SYSTEM_LABEL = "Workability";
const INVENTORY_SERVER_URL = "http://10.1.3.70:3001";

export default function Workability() {
  const [activeTab, setActiveTab] = useState("Home");
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  const [clients, setClients] = useState([]);
  const [customer, setCustomer] = useState("");
  const [products, setProducts] = useState([]);
  const [components, setComponents] = useState([]);
  const [inventory, setInventory] = useState({});

  const [skuSearch, setSkuSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingComponents, setLoadingComponents] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);

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

  const loadInventory = async (bomComponents) => {
    if (!bomComponents?.length) {
      setInventory({});
      return;
    }

    setLoadingInventory(true);

    try {
      const response = await fetch(`${INVENTORY_SERVER_URL}/inventory/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: bomComponents.map((c) => c.component_sku),
        }),
      });

      const data = await response.json();
      const map = {};

      (data.items || []).forEach((item) => {
        map[item.itemNumber] = item;
      });

      setInventory(map);
    } catch (err) {
      console.error("Inventory server error:", err);
      alert("Unable to connect to Inventory Server.");
      setInventory({});
    }

    setLoadingInventory(false);
  };

  const loadComponents = async (productId) => {
    if (!productId) {
      setComponents([]);
      setInventory({});
      return;
    }

    setLoadingComponents(true);
    setInventory({});

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
    setComponents(bomComponents);
    setLoadingComponents(false);

    await loadInventory(bomComponents);
  };

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (!customer) return;

    setSkuSearch("");
    setSelectedProduct(null);
    setComponents([]);
    setInventory({});
    loadProducts(customer);
  }, [customer]);

  const filteredProducts = products.filter((item) => {
    const search = skuSearch.toLowerCase();

    return (
      item.sku.toLowerCase().includes(search) ||
      item.description.toLowerCase().includes(search)
    );
  });

  const handleSelectSku = async (product) => {
    setSelectedProduct(product);
    setSkuSearch(`${product.sku} - ${product.description}`);
    await loadComponents(product.id);
  };

  const getInventoryForComponent = (component) => {
    return inventory[component.component_sku] || null;
  };

  const getCasesPossible = (component) => {
    const inv = getInventoryForComponent(component);
    const onHand = Number(inv?.totalOnHand || 0);
    const qtyPerCase = Number(component.qty_per_case || 0);

    if (!qtyPerCase || qtyPerCase <= 0) return 0;

    return Math.floor(onHand / qtyPerCase);
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "-";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-US");
  };

  const getFeedstockDates = (inv) => {
    if (!inv?.lots?.length) return [];

    const dates = inv.lots
      .map((lot) => lot.ExpirationDate)
      .filter(Boolean)
      .map((dateValue) => formatDate(dateValue));

    return Array.from(new Set(dates));
  };

  const getWorkabilitySummary = () => {
    if (!components.length) {
      return {
        workability: 0,
        limitingMaterial: "-",
      };
    }

    const calculated = components.map((component) => ({
      component,
      casesPossible: getCasesPossible(component),
    }));

    const validRows = calculated.filter((row) => row.casesPossible >= 0);

    if (!validRows.length) {
      return {
        workability: 0,
        limitingMaterial: "-",
      };
    }

    const limiting = validRows.reduce((lowest, current) => {
      return current.casesPossible < lowest.casesPossible ? current : lowest;
    }, validRows[0]);

    return {
      workability: limiting.casesPossible,
      limitingMaterial: `${limiting.component.type} - ${limiting.component.component_sku}`,
    };
  };

  const handleDownloadExcel = () => {
    if (!selectedProduct || !components.length) {
      alert("Select a SKU before downloading.");
      return;
    }

    const summary = getWorkabilitySummary();

    const rows = [
      ["Customer", customer],
      ["SKU", selectedProduct.sku],
      ["Description", selectedProduct.description],
      ["Workability", summary.workability],
      ["Limiting Material", summary.limitingMaterial],
      [],
      [
        "Component",
        "Description",
        "Type",
        "Qty / Case",
        "Reject Allowed",
        "Exp. Date",
        "On Hand",
        "Cases Possible",
      ],
      ...components.map((component) => {
        const inv = getInventoryForComponent(component);
        const type = String(component.type || "").toUpperCase();
        const isFeedstock = type === "FEEDSTOCK";

        return [
          component.component_sku,
          component.component_description || "-",
          component.type || "-",
          component.qty_per_case || 0,
          component.reject_percent || "-",
          isFeedstock ? formatDate(inv?.earliestExpiration) : "-",
          inv?.totalOnHand ?? 0,
          getCasesPossible(component),
        ];
      }),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    worksheet["!cols"] = [
      { wch: 18 },
      { wch: 42 },
      { wch: 16 },
      { wch: 12 },
      { wch: 16 },
      { wch: 14 },
      { wch: 12 },
      { wch: 16 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Workability");

    const safeSku = String(selectedProduct.sku || "workability").replace(
      /[^a-zA-Z0-9-_]/g,
      "_"
    );

    XLSX.writeFile(workbook, `Workability_${safeSku}.xlsx`);
  };

  const summary = getWorkabilitySummary();

  const tabs = ["Home", "Workability"];

  const homeModulesInfo = [
    {
      title: "Workability",
      desc: "Select customer, SKU, BOM and calculate cases possible.",
      icon: <ClipboardCheck size={24} />,
    },
  ];

  return (
    <div
      style={{
        backgroundColor: "#f1f5f9",
        minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
        margin: 0,
      }}
    >
      <div
        style={{
          backgroundColor: "#dc2626",
          color: "#fff",
          padding: "14px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            style={{
              backgroundColor: "#fff",
              color: "#dc2626",
              fontWeight: "900",
              padding: "3px 8px",
              borderRadius: "4px",
              fontSize: "0.9rem",
            }}
          >
            1NICO
          </span>

          <span style={{ fontWeight: "500", fontSize: "0.95rem", opacity: 0.9 }}>
            Workstation
          </span>
        </div>

        <div style={{ textAlign: "right", lineHeight: "1.3" }}>
          <div style={{ fontWeight: "800", fontSize: "1.05rem" }}>
            {SYSTEM_LABEL}
          </div>
          <div style={{ fontSize: "0.78rem", opacity: 0.95 }}>
            {formattedDate} • {formattedTime}
          </div>
        </div>
      </div>

      <div style={{ padding: "32px 24px", maxWidth: "1200px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #cbd5e1",
            marginBottom: "24px",
            gap: "4px",
            flexWrap: "wrap",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "12px 20px",
                border: "1px solid transparent",
                borderBottom: "none",
                backgroundColor: activeTab === tab ? "#fff" : "transparent",
                borderTopLeftRadius: "8px",
                borderTopRightRadius: "8px",
                cursor: "pointer",
                fontSize: "0.95rem",
                fontWeight: activeTab === tab ? "700" : "500",
                color: activeTab === tab ? "#0f172a" : "#64748b",
                borderColor:
                  activeTab === tab
                    ? "#cbd5e1 #cbd5e1 transparent"
                    : "transparent",
                position: "relative",
                top: "1px",
                whiteSpace: "nowrap",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div
          style={{
            backgroundColor: "#fff",
            padding: "32px",
            borderRadius: "12px",
            border: "1px solid #cbd5e1",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          {activeTab === "Home" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "24px",
              }}
            >
              {homeModulesInfo.map((mod, i) => (
                <div
                  key={i}
                  onClick={() => setActiveTab(mod.title)}
                  style={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    padding: "24px",
                    borderRadius: "8px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ color: "#dc2626", marginBottom: "12px" }}>
                    {mod.icon}
                  </div>

                  <h3
                    style={{
                      fontSize: "1.2rem",
                      fontWeight: "700",
                      margin: "0 0 8px 0",
                      color: "#0f172a",
                    }}
                  >
                    {mod.title}
                  </h3>

                  <p
                    style={{
                      color: "#64748b",
                      fontSize: "0.9rem",
                      margin: 0,
                      lineHeight: "1.5",
                    }}
                  >
                    {mod.desc}
                  </p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "Workability" && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "22px",
                }}
              >
                <PackageSearch size={24} color="#dc2626" />

                <div>
                  <h2
                    style={{
                      margin: 0,
                      color: "#0f172a",
                      fontSize: "1.35rem",
                      fontWeight: "800",
                    }}
                  >
                    Workability Calculator
                  </h2>

                  <p
                    style={{
                      margin: "4px 0 0 0",
                      color: "#64748b",
                      fontSize: "0.9rem",
                    }}
                  >
                    Select customer and SKU to load BOM information.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "18px",
                  marginBottom: "24px",
                }}
              >
                <div>
                  <label style={labelStyle}>Customer</label>
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
                  <label style={labelStyle}>SKU / Job</label>
                  <input
                    value={skuSearch}
                    onChange={(e) => {
                      setSkuSearch(e.target.value);
                      setSelectedProduct(null);
                      setComponents([]);
                      setInventory({});
                    }}
                    placeholder={
                      loadingProducts ? "Loading SKUs..." : "Type or select SKU..."
                    }
                    style={inputStyle}
                  />

                  {skuSearch && !selectedProduct && filteredProducts.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        zIndex: 10,
                        top: "72px",
                        left: 0,
                        right: 0,
                        backgroundColor: "#fff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        boxShadow: "0 10px 20px rgba(15,23,42,0.12)",
                        overflow: "hidden",
                        maxHeight: "260px",
                        overflowY: "auto",
                      }}
                    >
                      {filteredProducts.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectSku(item)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            border: "none",
                            background: "#fff",
                            padding: "12px",
                            cursor: "pointer",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          <div
                            style={{
                              color: "#0f172a",
                              fontWeight: "800",
                              fontSize: "0.9rem",
                            }}
                          >
                            {item.sku}
                          </div>
                          <div
                            style={{
                              color: "#64748b",
                              fontSize: "0.8rem",
                              marginTop: "2px",
                            }}
                          >
                            {item.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "18px",
                  marginBottom: "22px",
                }}
              >
                <label style={labelStyle}>Product Description</label>
                <div
                  style={{
                    color: selectedProduct ? "#0f172a" : "#94a3b8",
                    fontWeight: "800",
                    fontSize: "1rem",
                    marginTop: "6px",
                  }}
                >
                  {selectedProduct?.description || "Select a SKU to load description."}
                </div>
              </div>

              {selectedProduct && components.length > 0 && !loadingInventory && (
                <div
                  style={{
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "10px",
                    padding: "16px",
                    marginBottom: "18px",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.78rem", color: "#991b1b", fontWeight: "900" }}>
                      WORKABILITY
                    </div>
                    <div style={{ fontSize: "1.3rem", color: "#7f1d1d", fontWeight: "900" }}>
                      {summary.workability.toLocaleString("en-US")} Cases
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.78rem", color: "#991b1b", fontWeight: "900" }}>
                      LIMITING MATERIAL
                    </div>
                    <div style={{ fontSize: "1rem", color: "#7f1d1d", fontWeight: "900" }}>
                      {summary.limitingMaterial}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadExcel}
                    style={{
                      backgroundColor: "#dc2626",
                      color: "#fff",
                      border: "none",
                      padding: "10px 16px",
                      borderRadius: "8px",
                      fontWeight: "900",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Download size={18} />
                    Download Excel
                  </button>
                </div>
              )}

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.9rem",
                    minWidth: "850px",
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#f1f5f9" }}>
                      <th style={thStyle}>Component</th>
                      <th style={thStyle}>Type</th>
                      <th style={thStyle}>Qty / Case</th>
                      <th style={thStyle}>Reject Allowed</th>
                      <th style={thStyle}>Exp. Date</th>
                      <th style={thStyle}>On Hand</th>
                      <th style={thStyle}>Cases Possible</th>
                    </tr>
                  </thead>

                  <tbody>
                    {!selectedProduct ? (
                      <tr>
                        <td style={tdStyle} colSpan={7}>
                          Select a SKU to load BOM components.
                        </td>
                      </tr>
                    ) : loadingComponents ? (
                      <tr>
                        <td style={tdStyle} colSpan={7}>
                          Loading BOM components...
                        </td>
                      </tr>
                    ) : components.length === 0 ? (
                      <tr>
                        <td style={tdStyle} colSpan={7}>
                          No BOM components loaded for this SKU.
                        </td>
                      </tr>
                    ) : (
                      components.map((component) => {
                        const inv = getInventoryForComponent(component);
                        const onHand = inv?.totalOnHand ?? 0;
                        const casesPossible = getCasesPossible(component);
                        const type = String(component.type || "").toUpperCase();
                        const isFeedstock = type === "FEEDSTOCK";
                        const feedstockDates = getFeedstockDates(inv);

                        return (
                          <tr key={component.id}>
                            <td style={tdStyle}>
                              <strong>{component.component_sku}</strong>
                              <div
                                style={{
                                  color: "#64748b",
                                  fontSize: "0.78rem",
                                  marginTop: "4px",
                                }}
                              >
                                {component.component_description || "-"}
                              </div>
                              {inv?.searchedAs &&
                                inv.searchedAs !== component.component_sku && (
                                  <div
                                    style={{
                                      color: "#2563eb",
                                      fontSize: "0.72rem",
                                      marginTop: "4px",
                                      fontWeight: "800",
                                    }}
                                  >
                                    Found as {inv.searchedAs}
                                  </div>
                                )}
                            </td>

                            <td style={tdStyle}>{component.type}</td>
                            <td style={tdStyle}>{component.qty_per_case}</td>
                            <td style={tdStyle}>{component.reject_percent || "-"}</td>

                            <td style={tdStyle}>
                              {loadingInventory ? (
                                "Loading..."
                              ) : isFeedstock && feedstockDates.length > 0 ? (
                                <details style={{ position: "relative" }}>
                                  <summary
                                    style={{
                                      cursor: "pointer",
                                      listStyle: "none",
                                      color: "#0f172a",
                                      fontWeight: "900",
                                    }}
                                  >
                                    {formatDate(inv?.earliestExpiration)} ▼
                                  </summary>

                                  <div
                                    style={{
                                      marginTop: "8px",
                                      backgroundColor: "#fff",
                                      border: "1px solid #cbd5e1",
                                      borderRadius: "8px",
                                      padding: "8px",
                                      boxShadow: "0 8px 18px rgba(15,23,42,0.12)",
                                      minWidth: "120px",
                                    }}
                                  >
                                    {feedstockDates.map((date) => (
                                      <div
                                        key={date}
                                        style={{
                                          padding: "5px 8px",
                                          borderBottom: "1px solid #e2e8f0",
                                          fontSize: "0.8rem",
                                          color: "#334155",
                                          fontWeight: "800",
                                        }}
                                      >
                                        {date}
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              ) : (
                                "-"
                              )}
                            </td>

                            <td style={tdStyle}>
                              {loadingInventory ? "Loading..." : onHand}
                            </td>

                            <td style={tdStyle}>
                              {loadingInventory ? "Loading..." : casesPossible}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: "0.8rem",
  fontWeight: "800",
  color: "#475569",
  marginBottom: "6px",
};

const inputStyle = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  padding: "11px 12px",
  fontSize: "0.95rem",
  outline: "none",
  boxSizing: "border-box",
  backgroundColor: "#fff",
  color: "#0f172a",
};

const thStyle = {
  border: "1px solid #cbd5e1",
  padding: "12px",
  color: "#0f172a",
  textAlign: "left",
  fontWeight: "800",
};

const tdStyle = {
  border: "1px solid #e2e8f0",
  padding: "12px",
  color: "#334155",
  textAlign: "center",
  fontWeight: "700",
};