import { useEffect, useState } from "react";
import { Plus, Search, Trash2, ExternalLink, X } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function SuppliesMaster() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [productLink, setProductLink] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    const { data, error } = await supabase
      .from("supply_products")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      alert("Error loading products.");
      return;
    }

    setProducts(data || []);
  }

  async function addProduct() {
    const link = productLink.trim();
    if (!link) return;

    setLoading(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-product-from-link`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ url: link }),
        }
      );

      const scraped = await res.json();

      if (!res.ok) {
        console.error(scraped);
        alert("Could not read product link.");
        return;
      }

      const { error } = await supabase.from("supply_products").insert({
        name: scraped.name || "Unnamed Product",
        model: scraped.model_no || "",
        description: scraped.description || "",
        image_url: scraped.image_url || "",
        product_url: scraped.product_url || link,
      });

      if (error) {
        console.error(error);
        alert("Error saving product.");
        return;
      }

      setProductLink("");
      setShowAdd(false);
      await loadProducts();
    } catch (err) {
      console.error(err);
      alert("Error adding product.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteProduct(id) {
    const ok = window.confirm("Delete this product from the catalog?");
    if (!ok) return;

    const { error } = await supabase
      .from("supply_products")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Error deleting product.");
      return;
    }

    setSelected(null);
    await loadProducts();
  }

  const filtered = products.filter((p) => {
    const text = `${p.name || ""} ${p.model || ""} ${p.description || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>SUPPLIES MASTER</h1>
          <p style={styles.subtitle}>Add and delete products from the catalog.</p>
        </div>

        <button style={styles.redBtn} onClick={() => setShowAdd(true)}>
          <Plus size={18} />
          Add Item
        </button>
      </div>

      <div style={styles.searchBox}>
        <Search size={18} />
        <input
          style={styles.searchInput}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
        />
      </div>

      <div style={styles.grid}>
        {filtered.map((product) => (
          <button
            key={product.id}
            type="button"
            style={styles.card}
            onClick={() => setSelected(product)}
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
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={styles.emptyBox}>No products found.</div>
      )}

      {showAdd && (
        <div style={styles.overlay}>
          <div style={styles.smallModal}>
            <button style={styles.xBtn} onClick={() => setShowAdd(false)}>
              <X size={20} />
            </button>

            <h2 style={styles.modalTitle}>Add Product</h2>
            <p style={styles.subtitle}>Paste any product link.</p>

            <input
              style={styles.input}
              value={productLink}
              onChange={(e) => setProductLink(e.target.value)}
              placeholder="https://..."
              autoFocus
            />

            <button
              style={styles.fullRedBtn}
              onClick={addProduct}
              disabled={loading}
            >
              {loading ? "Adding..." : "Add"}
            </button>
          </div>
        </div>
      )}

      {selected && (
        <div style={styles.overlay}>
          <div style={styles.productModal}>
            <button style={styles.xBtn} onClick={() => setSelected(null)}>
              <X size={22} />
            </button>

            <div style={styles.modalImageBox}>
              {selected.image_url ? (
                <img
                  style={styles.modalImage}
                  src={selected.image_url}
                  alt={selected.name}
                />
              ) : (
                <span style={styles.noImage}>No Image</span>
              )}
            </div>

            <h2 style={styles.modalProductName}>{selected.name}</h2>

            {selected.model && <p style={styles.modelText}>{selected.model}</p>}

            {selected.description && (
              <p style={styles.description}>{selected.description}</p>
            )}

            <div style={styles.actions}>
              {selected.product_url && (
                <button
                  style={styles.darkBtn}
                  onClick={() => window.open(selected.product_url, "_blank")}
                >
                  <ExternalLink size={18} />
                  Open Product
                </button>
              )}

              <button
                style={styles.dangerBtn}
                onClick={() => deleteProduct(selected.id)}
              >
                <Trash2 size={18} />
                Delete Product
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
    background: "#f4f4f4",
    padding: "32px",
    fontFamily: "Arial, sans-serif",
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
    color: "#8b0000",
    fontSize: "34px",
    fontWeight: "900",
  },
  subtitle: {
    margin: "6px 0 0",
    color: "#555",
    fontSize: "15px",
  },
  redBtn: {
    background: "#8b0000",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "12px 18px",
    fontWeight: "800",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
  fullRedBtn: {
    width: "100%",
    background: "#8b0000",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "13px 18px",
    fontWeight: "800",
    cursor: "pointer",
  },
  searchBox: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "14px",
    padding: "12px 16px",
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
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
    gap: "18px",
  },
  card: {
    border: "1px solid #ddd",
    background: "#fff",
    borderRadius: "18px",
    padding: "14px",
    cursor: "pointer",
    textAlign: "left",
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  },
  imageBox: {
    width: "100%",
    height: "145px",
    background: "#fafafa",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  noImage: {
    color: "#999",
    fontSize: "13px",
  },
  cardTitle: {
    margin: "12px 0 4px",
    color: "#111",
    fontSize: "16px",
    fontWeight: "900",
  },
  cardModel: {
    margin: 0,
    color: "#666",
    fontSize: "13px",
  },
  emptyBox: {
    background: "#fff",
    borderRadius: "16px",
    padding: "24px",
    color: "#666",
    textAlign: "center",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    zIndex: 9999,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "18px",
  },
  smallModal: {
    position: "relative",
    background: "#fff",
    borderRadius: "22px",
    padding: "24px",
    width: "min(520px, 100%)",
    maxHeight: "92vh",
    overflowY: "auto",
  },
  productModal: {
    position: "relative",
    background: "#fff",
    borderRadius: "22px",
    padding: "24px",
    width: "min(680px, 100%)",
    maxHeight: "92vh",
    overflowY: "auto",
  },
  xBtn: {
    position: "absolute",
    top: "14px",
    right: "14px",
    border: "none",
    background: "#eee",
    borderRadius: "50%",
    width: "36px",
    height: "36px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    margin: "0 0 6px",
    color: "#111",
    fontSize: "24px",
    fontWeight: "900",
  },
  input: {
    width: "100%",
    border: "1px solid #ccc",
    borderRadius: "12px",
    padding: "12px",
    fontSize: "16px",
    margin: "16px 0",
    boxSizing: "border-box",
  },
  modalImageBox: {
    width: "100%",
    height: "280px",
    background: "#fafafa",
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
    color: "#111",
    fontSize: "26px",
    fontWeight: "900",
  },
  modelText: {
    color: "#8b0000",
    fontWeight: "900",
    margin: "0 0 10px",
  },
  description: {
    color: "#444",
    lineHeight: "1.45",
  },
  actions: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "18px",
  },
  darkBtn: {
    background: "#222",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "12px 16px",
    fontWeight: "800",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
  dangerBtn: {
    background: "#b00020",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "12px 16px",
    fontWeight: "800",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
};