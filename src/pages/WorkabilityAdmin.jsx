import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabase";

const CUSTOMER_OPTIONS = ["THC", "MDLZ", "TOPPS", "MARS"];
const COMPONENT_TYPES = ["FILM", "CORRUGATE", "FEEDSTOCK", "ZIPPER", "OTHER"];

export default function WorkabilityAdmin() {
  const navigate = useNavigate();

  const [customer, setCustomer] = useState("MDLZ");
  const [products, setProducts] = useState([]);
  const [components, setComponents] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [search, setSearch] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");

  const [componentType, setComponentType] = useState("FILM");
  const [componentSku, setComponentSku] = useState("");
  const [componentDescription, setComponentDescription] = useState("");
  const [qtyPerCase, setQtyPerCase] = useState("");
  const [uom, setUom] = useState("");
  const [rejectPercent, setRejectPercent] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const loadProducts = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("workability_products")
      .select("*")
      .eq("customer", customer)
      .order("sku", { ascending: true });

    if (error) {
      console.error("Load workability products error:", error);
      alert("Unable to load Workability products.");
      setLoading(false);
      return;
    }

    setProducts(data || []);
    setLoading(false);
  };

  const loadComponents = async (productId) => {
    if (!productId) {
      setComponents([]);
      return;
    }

    const { data, error } = await supabase
      .from("workability_components")
      .select("*")
      .eq("product_id", productId)
      .order("type", { ascending: true });

    if (error) {
      console.error("Load BOM components error:", error);
      alert("Unable to load BOM components.");
      return;
    }

    setComponents(data || []);
  };

  useEffect(() => {
    loadProducts();
    setSelectedProduct(null);
    setComponents([]);
  }, [customer]);

  const addProduct = async () => {
    const cleanSku = sku.trim().toUpperCase();
    const cleanDescription = description.trim().toUpperCase();

    if (!cleanSku || !cleanDescription) {
      alert("Enter SKU and description.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("workability_products").insert({
      customer,
      sku: cleanSku,
      description: cleanDescription,
      active: true,
    });

    if (error) {
      console.error("Add workability product error:", error);
      alert("Unable to add product. It may already exist for this customer.");
      setSaving(false);
      return;
    }

    setSku("");
    setDescription("");
    await loadProducts();
    setSaving(false);
  };

  const selectProduct = async (product) => {
    setSelectedProduct(product);
    await loadComponents(product.id);
  };

  const addComponent = async () => {
    if (!selectedProduct) {
      alert("Select a SKU first.");
      return;
    }

    const cleanComponentSku = componentSku.trim().toUpperCase();
    const cleanComponentDescription = componentDescription.trim().toUpperCase();
    const cleanQty = Number(qtyPerCase);

    if (!cleanComponentSku || !cleanQty) {
      alert("Enter component SKU and Qty / Case.");
      return;
    }

    const { error } = await supabase.from("workability_components").insert({
      product_id: selectedProduct.id,
      type: componentType,
      component_sku: cleanComponentSku,
      component_description: cleanComponentDescription || null,
      qty_per_case: cleanQty,
      uom: uom.trim().toUpperCase() || null,
      reject_percent: rejectPercent.trim() || null,
    });

    if (error) {
      console.error("Add component error:", error);
      alert("Unable to add BOM component.");
      return;
    }

    setComponentType("FILM");
    setComponentSku("");
    setComponentDescription("");
    setQtyPerCase("");
    setUom("");
    setRejectPercent("");

    await loadComponents(selectedProduct.id);
  };

  const handleBomImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setImporting(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const bomSku = String(sheet["C4"]?.v || "").trim().toUpperCase();
      const bomDescription = String(sheet["C5"]?.v || "").trim().toUpperCase();

      if (!bomSku || !bomDescription) {
        alert("Unable to read SKU or description from this BOM.");
        setImporting(false);
        return;
      }

      const componentsToInsert = [];

      for (let row = 8; row <= 40; row++) {
        const componentSku = String(sheet[`A${row}`]?.v || "").trim().toUpperCase();
        const componentDescription = String(sheet[`B${row}`]?.v || "").trim().toUpperCase();
        const type = String(sheet[`C${row}`]?.v || "").trim().toUpperCase();
        const qtyPerCaseValue = Number(sheet[`D${row}`]?.v || 0);
        const uomValue = String(sheet[`E${row}`]?.v || "").trim();
        const vendorValue = String(sheet[`F${row}`]?.v || "").trim();
        const rejectValue = String(sheet[`G${row}`]?.v || "").trim();

        if (!componentSku || !type || !qtyPerCaseValue) continue;

        componentsToInsert.push({
          type,
          component_sku: componentSku,
          component_description: componentDescription || null,
          qty_per_case: qtyPerCaseValue,
          uom: uomValue || null,
          vendor: vendorValue || null,
          reject_percent: rejectValue || null,
        });
      }

      if (componentsToInsert.length === 0) {
        alert("No BOM components found.");
        setImporting(false);
        return;
      }

      const { data: product, error: productError } = await supabase
        .from("workability_products")
        .upsert(
          {
            customer,
            sku: bomSku,
            description: bomDescription,
            active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "customer,sku" }
        )
        .select()
        .single();

      if (productError) {
        console.error("Import product error:", productError);
        alert("Unable to save BOM product.");
        setImporting(false);
        return;
      }

      const { error: deleteError } = await supabase
        .from("workability_components")
        .delete()
        .eq("product_id", product.id);

      if (deleteError) {
        console.error("Delete old components error:", deleteError);
        alert("Unable to clear old BOM components.");
        setImporting(false);
        return;
      }

      const { error: componentError } = await supabase
        .from("workability_components")
        .insert(
          componentsToInsert.map((component) => ({
            ...component,
            product_id: product.id,
          }))
        );

      if (componentError) {
        console.error("Import components error:", componentError);
        alert("Unable to save BOM components.");
        setImporting(false);
        return;
      }

      alert(
        `BOM imported successfully:\n\n${bomSku}\n${bomDescription}\n\nComponents: ${componentsToInsert.length}`
      );

      await loadProducts();
      setSelectedProduct(product);
      await loadComponents(product.id);
    } catch (error) {
      console.error("BOM import error:", error);
      alert("Unable to import BOM file.");
    }

    setImporting(false);
  };

  const deleteComponent = async (componentId) => {
    const ok = confirm("Delete this BOM component?");
    if (!ok) return;

    const { error } = await supabase
      .from("workability_components")
      .delete()
      .eq("id", componentId);

    if (error) {
      console.error("Delete component error:", error);
      alert("Unable to delete component.");
      return;
    }

    await loadComponents(selectedProduct.id);
  };

  const deleteProduct = async (productId) => {
    const ok = confirm("Delete this SKU and all BOM components connected to it?");
    if (!ok) return;

    const { error } = await supabase
      .from("workability_products")
      .delete()
      .eq("id", productId);

    if (error) {
      console.error("Delete workability product error:", error);
      alert("Unable to delete product.");
      return;
    }

    if (selectedProduct?.id === productId) {
      setSelectedProduct(null);
      setComponents([]);
    }

    await loadProducts();
  };

  const toggleProduct = async (product) => {
    const { error } = await supabase
      .from("workability_products")
      .update({ active: !product.active })
      .eq("id", product.id);

    if (error) {
      console.error("Toggle workability product error:", error);
      alert("Unable to update product.");
      return;
    }

    await loadProducts();
  };

  const filteredProducts = products.filter((product) => {
    const q = search.toLowerCase();

    return (
      product.sku.toLowerCase().includes(q) ||
      product.description.toLowerCase().includes(q)
    );
  });

  const totalProducts = products.length;
  const enabledProducts = products.filter((p) => p.active).length;
  const disabledProducts = products.filter((p) => !p.active).length;

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: "1150px", margin: "0 auto" }}>
        <button onClick={() => navigate("/home")} style={backButtonStyle}>
          ← Back to Dashboard
        </button>

        <div style={headerStyle}>
          <div>
            <h1 style={titleStyle}>Workability Admin</h1>
            <p style={subtitleStyle}>Load and manage customers, SKUs and BOMs.</p>

            <div style={counterStyle}>
              <span style={counterItemStyle}>Customer: <strong>{customer}</strong></span>
              <span style={counterItemStyle}>Total: <strong>{totalProducts}</strong></span>
              <span style={{ ...counterItemStyle, color: "#86efac" }}>Enable: <strong>{enabledProducts}</strong></span>
              <span style={{ ...counterItemStyle, color: "#fca5a5" }}>Disable: <strong>{disabledProducts}</strong></span>
            </div>
          </div>

          <button onClick={loadProducts} style={refreshButtonStyle}>Refresh</button>
        </div>

        <div style={cardStyle}>
          <label style={labelStyle}>Customer</label>
          <select
            value={customer}
            onChange={(e) => {
              setCustomer(e.target.value);
              setSearch("");
              setSku("");
              setDescription("");
            }}
            style={{ ...inputStyle, width: "220px" }}
          >
            {CUSTOMER_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Import BOM</h2>
          <p style={sectionSubtitleStyle}>
            Select customer first, then upload the BOM Excel file.
          </p>

          <input
            id="bom-upload"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleBomImport}
            style={{ display: "none" }}
          />

          <button
            onClick={() => document.getElementById("bom-upload")?.click()}
            disabled={importing}
            style={{
              ...addButtonStyle,
              marginTop: "14px",
              opacity: importing ? 0.6 : 1,
              cursor: importing ? "not-allowed" : "pointer",
            }}
          >
            {importing ? "Importing..." : "Import BOM Excel"}
          </button>
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Add SKU Manually</h2>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "14px" }}>
            <input value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} placeholder="SKU / JOB NUMBER..." style={inputStyle} />
            <input value={description} onChange={(e) => setDescription(e.target.value.toUpperCase())} placeholder="PRODUCT DESCRIPTION..." style={{ ...inputStyle, flex: 2 }} />
            <button onClick={addProduct} disabled={saving} style={addButtonStyle}>
              {saving ? "Saving..." : "+ Add SKU"}
            </button>
          </div>
        </div>

        <div style={cardStyle}>
          <label style={labelStyle}>Search SKU / Description</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="SEARCH PRODUCT..." style={{ ...inputStyle, width: "100%" }} />
        </div>

        <div style={tableContainerStyle}>
          <div style={tableHeaderStyle}>
            <span>Products for {customer} ({loading ? "Loading..." : filteredProducts.length})</span>
            <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>Click a SKU to edit BOM</span>
          </div>

          {loading ? (
            <div style={emptyStyle}>Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div style={emptyStyle}>No products found for {customer}.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={{ backgroundColor: "#0f172a" }}>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>SKU</th>
                    <th style={thStyle}>Description</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredProducts.map((product, index) => (
                    <tr
                      key={product.id}
                      onClick={() => selectProduct(product)}
                      style={{
                        cursor: "pointer",
                        backgroundColor: selectedProduct?.id === product.id ? "#334155" : "transparent",
                      }}
                    >
                      <td style={tdStyle}>{index + 1}</td>
                      <td style={{ ...tdStyle, fontWeight: "900", color: "#f8fafc" }}>{product.sku}</td>
                      <td style={{ ...tdStyle, textAlign: "left" }}>{product.description}</td>
                      <td style={tdStyle}>{product.active ? "Enable" : "Disable"}</td>
                      <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => toggleProduct(product)} style={smallButtonStyle}>
                          {product.active ? "Disable" : "Enable"}
                        </button>
                        <button onClick={() => deleteProduct(product.id)} style={{ ...smallButtonStyle, color: "#fca5a5", borderColor: "#fca5a5", marginLeft: 8 }}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedProduct && (
          <div style={{ ...cardStyle, marginTop: "18px" }}>
            <h2 style={sectionTitleStyle}>Selected SKU</h2>
            <p style={sectionSubtitleStyle}>
              <strong>{selectedProduct.sku}</strong> — {selectedProduct.description}
            </p>

            <h3 style={{ ...sectionTitleStyle, marginTop: "22px" }}>Add BOM Component</h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginTop: "14px" }}>
              <select value={componentType} onChange={(e) => setComponentType(e.target.value)} style={inputStyle}>
                {COMPONENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>

              <input value={componentSku} onChange={(e) => setComponentSku(e.target.value.toUpperCase())} placeholder="COMPONENT SKU..." style={inputStyle} />
              <input value={componentDescription} onChange={(e) => setComponentDescription(e.target.value.toUpperCase())} placeholder="DESCRIPTION..." style={inputStyle} />
              <input value={qtyPerCase} onChange={(e) => setQtyPerCase(e.target.value)} placeholder="QTY / CASE..." type="number" style={inputStyle} />
              <input value={uom} onChange={(e) => setUom(e.target.value.toUpperCase())} placeholder="UOM..." style={inputStyle} />
              <input value={rejectPercent} onChange={(e) => setRejectPercent(e.target.value)} placeholder="REJECT %..." style={inputStyle} />
            </div>

            <button onClick={addComponent} style={{ ...addButtonStyle, marginTop: "14px" }}>
              + Add Component
            </button>

            <div style={{ marginTop: "22px", overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={{ backgroundColor: "#0f172a" }}>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Component SKU</th>
                    <th style={thStyle}>Description</th>
                    <th style={thStyle}>Qty / Case</th>
                    <th style={thStyle}>UOM</th>
                    <th style={thStyle}>Vendor</th>
                    <th style={thStyle}>Reject %</th>
                    <th style={thStyle}>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {components.length === 0 ? (
                    <tr>
                      <td style={tdStyle} colSpan={8}>No BOM components loaded.</td>
                    </tr>
                  ) : (
                    components.map((component) => (
                      <tr key={component.id}>
                        <td style={tdStyle}>{component.type}</td>
                        <td style={tdStyle}>{component.component_sku}</td>
                        <td style={{ ...tdStyle, textAlign: "left" }}>{component.component_description || "-"}</td>
                        <td style={tdStyle}>{component.qty_per_case}</td>
                        <td style={tdStyle}>{component.uom || "-"}</td>
                        <td style={tdStyle}>{component.vendor || "-"}</td>
                        <td style={tdStyle}>{component.reject_percent || "-"}</td>
                        <td style={tdStyle}>
                          <button onClick={() => deleteComponent(component.id)} style={{ ...smallButtonStyle, color: "#fca5a5", borderColor: "#fca5a5" }}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const pageStyle = { backgroundColor: "#0f172a", color: "#f8fafc", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "40px" };
const backButtonStyle = { backgroundColor: "#1e293b", color: "#fff", border: "1px solid #334155", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", marginBottom: "28px", fontWeight: "800" };
const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", borderBottom: "1px solid #334155", paddingBottom: "20px", gap: "16px", flexWrap: "wrap" };
const titleStyle = { margin: 0, color: "#38bdf8", fontSize: "2rem" };
const subtitleStyle = { color: "#94a3b8", marginTop: "6px" };
const counterStyle = { display: "flex", gap: "12px", marginTop: "12px", flexWrap: "wrap" };
const counterItemStyle = { backgroundColor: "#1e293b", border: "1px solid #334155", color: "#cbd5e1", padding: "6px 10px", borderRadius: "999px", fontSize: "0.78rem", fontWeight: "800" };
const cardStyle = { backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "14px", padding: "18px", marginBottom: "18px" };
const sectionTitleStyle = { margin: 0, color: "#f8fafc", fontSize: "1.1rem" };
const sectionSubtitleStyle = { color: "#94a3b8", margin: "6px 0 0 0", fontSize: "0.86rem" };
const labelStyle = { display: "block", color: "#cbd5e1", fontSize: "0.85rem", fontWeight: "800", marginBottom: "8px" };
const inputStyle = { flex: 1, minWidth: "160px", backgroundColor: "#0f172a", border: "1px solid #334155", color: "#f8fafc", padding: "12px", borderRadius: "8px", outline: "none", fontWeight: "700", boxSizing: "border-box" };
const addButtonStyle = { backgroundColor: "#22c55e", color: "#fff", border: "none", borderRadius: "8px", padding: "12px 18px", fontWeight: "900", cursor: "pointer" };
const refreshButtonStyle = { backgroundColor: "#38bdf8", color: "#0f172a", border: "none", borderRadius: "8px", padding: "10px 14px", fontWeight: "900", cursor: "pointer" };
const tableContainerStyle = { backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "14px", overflow: "hidden" };
const tableHeaderStyle = { padding: "16px 18px", borderBottom: "1px solid #334155", fontWeight: "900", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" };
const tableStyle = { width: "100%", borderCollapse: "collapse", minWidth: "850px" };
const thStyle = { color: "#94a3b8", padding: "12px", fontSize: "0.8rem", textAlign: "center", borderBottom: "1px solid #334155" };
const tdStyle = { padding: "12px", borderBottom: "1px solid #334155", textAlign: "center", color: "#e2e8f0" };
const emptyStyle = { padding: "28px", textAlign: "center", color: "#94a3b8", fontWeight: "800" };
const smallButtonStyle = { backgroundColor: "transparent", border: "1px solid #334155", color: "#e2e8f0", borderRadius: "8px", padding: "7px 10px", fontWeight: "900", cursor: "pointer" };