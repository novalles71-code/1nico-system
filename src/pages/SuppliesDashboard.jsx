import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";

const BUILDINGS = ["BUILDING 6", "BUILDING 8", "BUILDING 9"];

export default function SuppliesDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);

    const { data, error } = await supabase
      .from("supply_orders")
      .select(`
        id,
        building,
        qty_text,
        submitted,
        submitted_at,
        product:supply_products (
          id,
          name
        )
      `)
      .order("building", { ascending: true });

    if (error) {
      console.error(error);
      alert("Error loading supplies orders.");
      setLoading(false);
      return;
    }

    setOrders(data || []);
    setLoading(false);
  }

  function getBuildingOrders(building) {
    return orders.filter(
      (order) =>
        order.building === building &&
        order.qty_text &&
        order.qty_text.trim() !== ""
    );
  }

  function getBuildingStatus(building) {
    const buildingOrders = getBuildingOrders(building);

    if (buildingOrders.length === 0) {
      return "No requests";
    }

    const hasSubmitted = buildingOrders.some((o) => o.submitted);

    return hasSubmitted ? "Submitted" : "Draft";
  }

  function hasAnyOrder() {
    return BUILDINGS.some((building) => getBuildingOrders(building).length > 0);
  }

  async function downloadWord() {
    if (!hasAnyOrder()) {
      alert("There are no supplies requested yet.");
      return;
    }

    const confirmDownload = window.confirm(
      "Download weekly supplies order? After download, all building requests will be cleared."
    );

    if (!confirmDownload) return;

    const children = [
      new Paragraph({
        children: [
          new TextRun({
            text: "SUPPLIES NEEDED",
            bold: true,
            size: 32,
          }),
        ],
        spacing: { after: 400 },
      }),
    ];

    BUILDINGS.forEach((building) => {
      const buildingOrders = getBuildingOrders(building);

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: building,
              bold: true,
              size: 26,
            }),
          ],
          spacing: { before: 300, after: 200 },
        })
      );

      if (buildingOrders.length === 0) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "Nothing requested.",
                italics: true,
                size: 22,
              }),
            ],
            spacing: { after: 200 },
          })
        );
      } else {
        buildingOrders.forEach((order) => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${order.product?.name || "Unnamed Product"} = ${order.qty_text}`,
                  size: 22,
                }),
              ],
              spacing: { after: 120 },
            })
          );
        });
      }
    });

    const doc = new Document({
      sections: [
        {
          properties: {},
          children,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "Supplies_Needed.docx");

   const orderIds = orders.map((order) => order.id);

const { error } = await supabase
  .from("supply_orders")
  .delete()
  .in("id", orderIds);

    if (error) {
      console.error(error);
      alert("Word downloaded, but orders were not cleared.");
      return;
    }

    await loadOrders();
    alert("Weekly supplies order downloaded and cleared.");
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>SUPPLIES DASHBOARD</h1>
          <p style={styles.subtitle}>Review all building orders and download the weekly Word report.</p>
        </div>

        <button style={styles.refreshBtn} onClick={loadOrders}>
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      <div style={styles.statusGrid}>
        {BUILDINGS.map((building) => {
          const buildingOrders = getBuildingOrders(building);
          const status = getBuildingStatus(building);

          return (
            <div key={building} style={styles.statusCard}>
              <h2 style={styles.buildingTitle}>{building}</h2>
              <p style={styles.statusText}>{status}</p>
              <strong>{buildingOrders.length} products requested</strong>
            </div>
          );
        })}
      </div>

      <div style={styles.ordersBox}>
        {BUILDINGS.map((building) => {
          const buildingOrders = getBuildingOrders(building);

          return (
            <div key={building} style={styles.buildingSection}>
              <h2 style={styles.sectionTitle}>{building}</h2>

              {buildingOrders.length === 0 ? (
                <p style={styles.emptyText}>Nothing requested.</p>
              ) : (
                buildingOrders.map((order) => (
                  <div key={order.id} style={styles.orderRow}>
                    <span>{order.product?.name || "Unnamed Product"}</span>
                    <strong>{order.qty_text}</strong>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>

      <button
        style={{
          ...styles.downloadBtn,
          opacity: hasAnyOrder() ? 1 : 0.5,
        }}
        onClick={downloadWord}
        disabled={!hasAnyOrder() || loading}
      >
        <Download size={20} />
        Download Weekly Order
      </button>
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
    marginBottom: "24px",
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
  },
  refreshBtn: {
    background: "#222",
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
  statusGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "18px",
    marginBottom: "24px",
  },
  statusCard: {
    background: "#fff",
    borderRadius: "18px",
    padding: "20px",
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
    border: "1px solid #ddd",
  },
  buildingTitle: {
    margin: "0 0 8px",
    color: "#111",
    fontSize: "22px",
    fontWeight: "900",
  },
  statusText: {
    margin: "0 0 8px",
    color: "#8b0000",
    fontWeight: "900",
  },
  ordersBox: {
    background: "#fff",
    borderRadius: "22px",
    padding: "24px",
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
    border: "1px solid #ddd",
    marginBottom: "24px",
  },
  buildingSection: {
    borderBottom: "2px solid #eee",
    paddingBottom: "20px",
    marginBottom: "20px",
  },
  sectionTitle: {
    color: "#8b0000",
    fontSize: "24px",
    fontWeight: "900",
    marginBottom: "14px",
  },
  orderRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
    background: "#f7f7f7",
    borderRadius: "12px",
    padding: "12px 14px",
    marginBottom: "10px",
    fontSize: "16px",
  },
  emptyText: {
    color: "#777",
    fontStyle: "italic",
  },
  downloadBtn: {
    width: "100%",
    background: "#8b0000",
    color: "#fff",
    border: "none",
    borderRadius: "16px",
    padding: "16px 20px",
    fontSize: "18px",
    fontWeight: "900",
    cursor: "pointer",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px",
  },
};