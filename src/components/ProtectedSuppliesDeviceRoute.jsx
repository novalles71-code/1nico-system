import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const BUILDING_SYSTEM_NAMES = {
  "B6": "B6",
  "B8": "B8",
  "B9": "B9",
};

export default function ProtectedSuppliesDeviceRoute({ building, children }) {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [token, setToken] = useState("");

  const systemName = BUILDING_SYSTEM_NAMES[building];
  const storageKey = `supplies_device_token_${systemName}`;

  useEffect(() => {
    checkSavedDevice();
  }, [building]);

  function getDeviceFingerprint() {
    let deviceId = localStorage.getItem("device_fingerprint");

    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem("device_fingerprint", deviceId);
    }

    return deviceId;
  }

  async function checkSavedDevice() {
    const savedDeviceId = localStorage.getItem(storageKey);

    if (!savedDeviceId) {
      setChecking(false);
      return;
    }

    const { data, error } = await supabase
      .from("device_authorizations")
      .select("*")
      .eq("device_token", savedDeviceId)
      .eq("system_name", systemName)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error(error);
      localStorage.removeItem(storageKey);
      setChecking(false);
      return;
    }

    if (data) {
      setAuthorized(true);
    } else {
      localStorage.removeItem(storageKey);
    }

    setChecking(false);
  }

  async function validateFirstToken(value) {
    const cleanToken = value.trim();

    const { data: device, error } = await supabase
      .from("device_authorizations")
      .select("*")
      .eq("device_token", cleanToken)
      .eq("system_name", systemName)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error(error);
      return false;
    }

    if (!device) return false;

    const deviceId = getDeviceFingerprint();

    const { error: updateError } = await supabase
      .from("device_authorizations")
      .update({
        device_token: deviceId,
      })
      .eq("id", device.id);

    if (updateError) {
      console.error(updateError);
      return false;
    }

    localStorage.setItem(storageKey, deviceId);

    return true;
  }

  async function submitToken(e) {
    e.preventDefault();

    const cleanToken = token.trim();
    if (!cleanToken) return;

    setChecking(true);

    const ok = await validateFirstToken(cleanToken);

    if (!ok) {
      alert("Invalid or inactive device token.");
      setChecking(false);
      return;
    }

    setAuthorized(true);
    setChecking(false);
  }

  if (checking) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>Checking device...</h1>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div style={styles.page}>
        <form style={styles.card} onSubmit={submitToken}>
          <div style={styles.logo}>1NICO</div>

          <h1 style={styles.title}>{building}</h1>
          <p style={styles.text}>
            This device must be authorized to access this supplies page.
          </p>

          <input
            style={styles.input}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Enter device token"
            autoFocus
          />

          <button style={styles.button} type="submit">
            Authorize Device
          </button>
        </form>
      </div>
    );
  }

  return children;
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#eef3f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    width: "min(430px, 100%)",
    background: "#fff",
    borderRadius: "22px",
    padding: "28px",
    boxShadow: "0 14px 36px rgba(0,0,0,0.15)",
    border: "1px solid #d8e0ea",
  },
  logo: {
    display: "inline-block",
    background: "#e11d25",
    color: "#fff",
    fontWeight: "900",
    borderRadius: "8px",
    padding: "8px 12px",
    marginBottom: "18px",
  },
  title: {
    margin: "0 0 10px",
    color: "#111827",
    fontSize: "28px",
    fontWeight: "900",
  },
  text: {
    color: "#53657d",
    marginBottom: "18px",
  },
  input: {
    width: "100%",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    padding: "13px",
    fontSize: "16px",
    boxSizing: "border-box",
    marginBottom: "14px",
  },
  button: {
    width: "100%",
    background: "#e11d25",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "14px",
    fontWeight: "900",
    cursor: "pointer",
  },
};