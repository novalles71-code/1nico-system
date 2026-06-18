import { useNavigate } from "react-router-dom";
import { ClipboardList, Boxes, Building2 } from "lucide-react";

export default function Supplies() {
  const navigate = useNavigate();

  const cards = [
    {
      title: "SUPPLIES DASHBOARD",
      desc: "View all building orders and download the weekly report.",
      path: "/supplies-dashboard",
      icon: <ClipboardList size={42} />,
    },
    {
      title: "SUPPLIES MASTER",
      desc: "Add and delete products from the catalog.",
      path: "/supplies-master",
      icon: <Boxes size={42} />,
    },
    {
      title: "BUILDING 6",
      desc: "Weekly supplies request page.",
      path: "/supplies-building-6",
      icon: <Building2 size={42} />,
    },
    {
      title: "BUILDING 8",
      desc: "Weekly supplies request page.",
      path: "/supplies-building-8",
      icon: <Building2 size={42} />,
    },
    {
      title: "BUILDING 9",
      desc: "Weekly supplies request page.",
      path: "/supplies-building-9",
      icon: <Building2 size={42} />,
    },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>SUPPLIES</h1>
        <p style={styles.subtitle}>Weekly supplies orders module.</p>
      </div>

      <div style={styles.grid}>
        {cards.map((card) => (
          <button
            key={card.title}
            type="button"
            style={styles.card}
            onClick={() => navigate(card.path)}
          >
            <div style={styles.icon}>{card.icon}</div>
            <h2 style={styles.cardTitle}>{card.title}</h2>
            <p style={styles.cardDesc}>{card.desc}</p>
          </button>
        ))}
      </div>
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
    marginBottom: "28px",
  },
  title: {
    margin: 0,
    color: "#8b0000",
    fontSize: "38px",
    fontWeight: "900",
    letterSpacing: "1px",
  },
  subtitle: {
    marginTop: "8px",
    color: "#555",
    fontSize: "16px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "20px",
  },
  card: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "20px",
    padding: "24px",
    minHeight: "210px",
    textAlign: "left",
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
    transition: "0.2s ease",
  },
  icon: {
    color: "#8b0000",
    marginBottom: "18px",
  },
  cardTitle: {
    margin: "0 0 10px",
    fontSize: "21px",
    fontWeight: "900",
    color: "#111",
  },
  cardDesc: {
    margin: 0,
    color: "#555",
    fontSize: "15px",
    lineHeight: "1.4",
  },
};