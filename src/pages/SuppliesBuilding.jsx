import { useEffect, useState } from "react";
import { Search, X, Save, Send, Edit3 } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function SuppliesBuilding({ building }) {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState({});
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [qtyText, setQtyText] = useState("");
  const [showReview, setShowReview] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [building]);

  async function loadData() {
    const { data: productData, error: productError } = await supabase
      .from("supply_products")
      .select("*")
      .order("name", { ascending: true });

    if (productError) {
      console.error(productError);
      alert("Error loading products.");
      return;
    }

    const { data: orderData, error: orderError } = await supabase
      .from("supply_orders")
      .select("*")
      .eq("building", building);

    if (orderError) {
      console.error(orderError);
      alert("Error loading order.");
      return;
    }

    const map = {};
    let isSubmitted = false;

    (orderData || []).forEach((order) => {
      map[order.product_id] = order;
      if (order.submitted) isSubmitted = true;
    });

    setProducts(productData || []);
    setOrders(map);
    setSubmitted(isSubmitted);
  }

  function openProduct(product) {
    if (submitted) return;
    setSelected(product);
    setQtyText(orders[product.id]?.qty_text || "");
  }

  async function saveQuantity() {
    if (!selected) return;

    const text = qtyText.trim();
    const existing = orders[selected.id];

    setLoading(true);

    if (existing) {
      const { error } = await supabase
        .from("supply_orders")
        .update({
          qty_text: text,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        console.error(error);
        alert("Error saving quantity.");
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.from("supply_orders").insert({
        product_id: selected.id,
        building,
        qty_text: text,
        notes: "",
        submitted: false,
      });

      if (error) {
        console.error(error);
        alert("Error saving quantity.");
        setLoading(false);
        return;
      }
    }

    setSelected(null);
    setQtyText("");
    await loadData();
    setLoading(false);
  }

  async function updateReviewQuantity(productId, value) {
    const existing = orders[productId];
    if (!existing) return;

    const { error } = await supabase
      .from("supply_orders")
      .update({
        qty_text: value,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      console.error(error);
      alert("Error updating quantity.");
      return;
    }

    setOrders((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        qty_text: value,
      },
    }));
  }

  async function sendOrder() {
    const requestedItems = getRequestedItems();

    if (requestedItems.length === 0) {
      alert("No items requested.");
      return;
    }

    setLoading(true);

    const ids = requestedItems
      .map((item) => orders[item.id]?.id)
      .filter(Boolean);

    const { error } = await supabase
      .from("supply_orders")
      .update({
        submitted: true,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in("id", ids);

    if (error) {
      console.error(error);
      alert("Error sending order.");
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setShowReview(false);
    await loadData();
    setLoading(false);
    alert("Order submitted successfully.");
  }

  function getRequestedItems() {
    return products.filter((p) => {
      const text = orders[p.id]?.qty_text || "";
      return text.trim() !== "";
    });
  }

  const filtered = products.filter((p) => {
    const text = `${p.name || ""} ${p.model || ""} ${p.description || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const requestedItems = getRequestedItems();

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div style={styles.leftTop}>
          <div style={styles.logo}>1NICO</div>
          <div style={styles.moduleName}>Supplies</div>
        </div>

        <div style={styles.rightTop}>
          <strong>{building}</strong>
          <span>{new Date().toLocaleDateString()}</span>
        </div>
      </div>

      <main style={styles.content}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>{building}</h1>
            <p style={styles.subtitle}>Weekly supplies request page.</p>
          </div>

          {!submitted ? (
            <button style={styles.redBtn} onClick={() => setShowReview(true)}>
              <Send size={18} />
              Review Order
            </button>
          ) : (
            <div style={styles.submittedBadge}>ORDER SUBMITTED</div>
          )}
        </div>

        {submitted && (
          <div style={styles.lockBox}>
            Your order has been sent to the administrator. Waiting for review.
          </div>
        )}

        <section style={styles.panel}>
          <div style={styles.searchBox}>
            <Search size={18} color="#e11d25" />
            <input
              style={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              disabled={submitted}
            />
          </div>

          <div style={styles.grid}>
            {filtered.map((product) => {
              const savedQty = orders[product.id]?.qty_text || "";

              return (
                <button
                  key={product.id}
                  type="button"
                  style={{
                    ...styles.card,
                    opacity: submitted ? 0.75 : 1,
                    border: savedQty.trim()
                      ? "2px solid #e11d25"
                      : "1px solid #d8e0ea",
                  }}
                  onClick={() => openProduct(product)}
                >
                  <div style={styles.imageBox}>
                    {product.image_url ? (
                      <img style={styles.image} src={product.image_url} alt={product.name} />
                    ) : (
                      <span style={styles.noImage}>No Image</span>
                    )}
                  </div>

                  <h3 style={styles.cardTitle}>{product.name}</h3>

                  {product.model && <p style={styles.cardModel}>{product.model}</p>}

                  {savedQty.trim() && (
                    <div style={styles.qtyBadge}>Requested: {savedQty}</div>
                  )}
                </button>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div style={styles.emptyBox}>No products found.</div>
          )}
        </section>
      </main>

      {selected && (
        <div style={styles.overlay}>
          <div style={styles.productModal}>
            <button style={styles.xBtn} onClick={() => setSelected(null)}>
              <X size={22} />
            </button>

            <div style={styles.modalImageBox}>
              {selected.image_url ? (
                <img style={styles.modalImage} src={selected.image_url} alt={selected.name} />
              ) : (
                <span style={styles.noImage}>No Image</span>
              )}
            </div>

            <h2 style={styles.modalProductName}>{selected.name}</h2>

            {selected.model && <p style={styles.modelText}>{selected.model}</p>}

            {selected.description && (
              <p style={styles.description}>{selected.description}</p>
            )}

            <label style={styles.label}>Quantity Needed</label>
            <input
              style={styles.input}
              value={qtyText}
              onChange={(e) => setQtyText(e.target.value)}
              placeholder="Example: 2 boxes, 1 gallon, 5 rolls..."
              autoFocus
            />

            <button style={styles.fullRedBtn} onClick={saveQuantity} disabled={loading}>
              <Save size={18} />
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {showReview && (
        <div style={styles.overlay}>
          <div style={styles.reviewModal}>
            <button style={styles.xBtn} onClick={() => setShowReview(false)}>
              <X size={22} />
            </button>

            <h2 style={styles.modalTitle}>Review Order</h2>
            <p style={styles.subtitle}>{building}</p>

            {requestedItems.length === 0 ? (
              <div style={styles.emptyBox}>No items requested yet.</div>
            ) : (
              <div style={styles.reviewList}>
                {requestedItems.map((product) => (
                  <div key={product.id} style={styles.reviewRow}>
                    <div style={styles.reviewName}>{product.name}</div>

                    <input
                      style={styles.reviewInput}
                      value={orders[product.id]?.qty_text || ""}
                      onChange={(e) =>
                        updateReviewQuantity(product.id, e.target.value)
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            <div style={styles.reviewActions}>
              <button style={styles.darkBtn} onClick={() => setShowReview(false)}>
                <Edit3 size={18} />
                Continue Editing
              </button>

              <button
                style={styles.redBtn}
                onClick={sendOrder}
                disabled={loading || requestedItems.length === 0}
              >
                <Send size={18} />
                {loading ? "Sending..." : "Send Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#eef3f9",
    fontFamily: "Arial, sans-serif",
  },
  topBar: {
    height: "78px",
    background: "#e11d25",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 30px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
  },
  leftTop: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  logo: {
    background: "#fff",
    color: "#e11d25",
    fontWeight: "900",
    borderRadius: "6px",
    padding: "8px 12px",
    fontSize: "18px",
  },
  moduleName: {
    fontWeight: "800",
    fontSize: "18px",
  },
  rightTop: {
    textAlign: "right",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  content: {
    width: "min(1500px, calc(100% - 48px))",
    margin: "36px auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "22px",
  },
  title: {
    margin: 0,
    color: "#111827",
    fontSize: "34px",
    fontWeight: "900",
  },
  subtitle: {
    margin: "6px 0 0",
    color: "#53657d",
    fontSize: "15px",
  },
  panel: {
    background: "#fff",
    border: "1px solid #cfd9e6",
    borderRadius: "18px",
    padding: "26px",
    boxShadow: "0 8px 26px rgba(31, 41, 55, 0.08)",
  },
  redBtn: {
    background: "#e11d25",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "12px 18px",
    fontWeight: "900",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
  fullRedBtn: {
    width: "100%",
    background: "#e11d25",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "14px 18px",
    fontWeight: "900",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    marginTop: "14px",
  },
  darkBtn: {
    background: "#1f2937",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "12px 16px",
    fontWeight: "900",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
  submittedBadge: {
    background: "#0f7a2f",
    color: "#fff",
    borderRadius: "12px",
    padding: "12px 18px",
    fontWeight: "900",
  },
  lockBox: {
    background: "#e9f7ef",
    border: "1px solid #b7e2c3",
    color: "#145a32",
    borderRadius: "14px",
    padding: "14px 18px",
    marginBottom: "18px",
    fontWeight: "800",
  },
  searchBox: {
    background: "#f8fafc",
    border: "1px solid #cfd9e6",
    borderRadius: "14px",
    padding: "13px 16px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "24px",
  },
  searchInput: {
    width: "100%",
    border: "none",
    outline: "none",
    fontSize: "16px",
    background: "transparent",
    color: "#111827",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
    gap: "18px",
  },
  card: {
    background: "#fff",
    borderRadius: "16px",
    padding: "14px",
    cursor: "pointer",
    textAlign: "left",
    boxShadow: "0 4px 14px rgba(31, 41, 55, 0.08)",
    transition: "transform .15s ease",
  },
  imageBox: {
    width: "100%",
    height: "155px",
    background: "#f8fafc",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: "12px",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  noImage: {
    color: "#94a3b8",
    fontSize: "13px",
  },
  cardTitle: {
    margin: "0 0 6px",
    color: "#111827",
    fontSize: "17px",
    fontWeight: "900",
  },
  cardModel: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
  },
  qtyBadge: {
    marginTop: "10px",
    background: "#fee2e2",
    color: "#b91c1c",
    borderRadius: "10px",
    padding: "8px",
    fontSize: "13px",
    fontWeight: "900",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.55)",
    backdropFilter: "blur(7px)",
    zIndex: 9999,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "18px",
  },
  productModal: {
    position: "relative",
    background: "#fff",
    borderRadius: "24px",
    padding: "24px",
    width: "min(760px, 100%)",
    maxHeight: "92vh",
    overflowY: "auto",
    boxShadow: "0 22px 60px rgba(0,0,0,0.3)",
  },
  reviewModal: {
    position: "relative",
    background: "#fff",
    borderRadius: "22px",
    padding: "24px",
    width: "min(820px, 100%)",
    maxHeight: "92vh",
    overflowY: "auto",
  },
  xBtn: {
    position: "absolute",
    top: "14px",
    right: "14px",
    border: "none",
    background: "#eef2f7",
    borderRadius: "50%",
    width: "38px",
    height: "38px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalImageBox: {
    width: "100%",
    height: "315px",
    background: "#f8fafc",
    borderRadius: "18px",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  modalProductName: {
    margin: "18px 0 6px",
    color: "#111827",
    fontSize: "27px",
    fontWeight: "900",
  },
  modelText: {
    color: "#e11d25",
    fontWeight: "900",
    margin: "0 0 10px",
  },
  description: {
    color: "#475569",
    lineHeight: "1.5",
  },
  label: {
    display: "block",
    marginTop: "18px",
    marginBottom: "8px",
    color: "#111827",
    fontWeight: "900",
  },
  input: {
    width: "100%",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    padding: "13px",
    fontSize: "16px",
    boxSizing: "border-box",
  },
  emptyBox: {
    background: "#f8fafc",
    borderRadius: "16px",
    padding: "24px",
    color: "#64748b",
    textAlign: "center",
  },
  modalTitle: {
    margin: "0 0 6px",
    color: "#111827",
    fontSize: "26px",
    fontWeight: "900",
  },
  reviewList: {
    marginTop: "18px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  reviewRow: {
    display: "grid",
    gridTemplateColumns: "1fr 260px",
    gap: "12px",
    alignItems: "center",
    background: "#f8fafc",
    borderRadius: "14px",
    padding: "12px",
  },
  reviewName: {
    fontWeight: "900",
    color: "#111827",
  },
  reviewInput: {
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "10px",
    fontSize: "15px",
  },
  reviewActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "20px",
  },
};