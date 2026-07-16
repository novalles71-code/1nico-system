import { useEffect, useMemo, useState } from "react";

const SHIFT_1_JOBS = {
  A: "1",
  B: "4",
  C: "7",
  D: "A",
  E: "D",
  F: "G",
  G: "J",
  H: "M",
  J: "P",
  K: "S",
  L: "V",
  M: "Y",
};

const SHIFT_2_JOBS = {
  N: "2",
  O: "5",
  P: "8",
  Q: "B",
  R: "E",
  S: "H",
  T: "K",
  U: "N",
  V: "Q",
  W: "T",
  X: "W",
  Y: "Z",
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function pad2(value) {
  return String(value).padStart(2, "0");
}

function pad3(value) {
  return String(value).padStart(3, "0");
}

function getAutomaticShift(date = new Date()) {
  const totalMinutes = date.getHours() * 60 + date.getMinutes();

  // Shift 1: 6:01 AM through 6:00 PM
  if (totalMinutes >= 361 && totalMinutes <= 1080) {
    return "1";
  }

  // Shift 2: 6:01 PM through 6:00 AM
  return "2";
}

function getJulianDay(date) {
  const current = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const start = Date.UTC(date.getFullYear(), 0, 0);
  const day = Math.floor((current - start) / 86400000);

  return pad3(day);
}

function formatCurrentTime(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function formatBestIfUsedBy(value) {
  if (!value) return "";

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return "";

  return `${pad2(day)}${MONTHS[month - 1]}${String(year).slice(-2)}`;
}

export default function BoxesCodeModule({
  systemNumber = 1,
  onUpdateMessage,
}) {
  const [currentTime, setCurrentTime] = useState(new Date());

  const [shift, setShift] = useState(() =>
    getAutomaticShift(new Date())
  );

  const [job, setJob] = useState(() =>
    getAutomaticShift(new Date()) === "1" ? "A" : "N"
  );

  const [bestIfUsedBy, setBestIfUsedBy] = useState("");
  const [selectedHeads, setSelectedHeads] = useState("both");
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const jobTable = shift === "1" ? SHIFT_1_JOBS : SHIFT_2_JOBS;
  const jobs = Object.keys(jobTable);

  const systemCode = pad2(systemNumber);
  const julianDay = getJulianDay(currentTime);
  const yearCode = String(currentTime.getFullYear()).slice(-2);
  const jobCode = jobTable[job] || jobs[0];
  const displayedTime = formatCurrentTime(currentTime);

  const lot = useMemo(() => {
    return `MX${julianDay}${yearCode}${systemCode}${jobCode}`;
  }, [julianDay, yearCode, systemCode, jobCode]);

  const formattedExpiration = formatBestIfUsedBy(bestIfUsedBy);

  const line1 = `${lot} ${displayedTime}`;

  const line2 = formattedExpiration
    ? `BEST IF USED BY ${formattedExpiration}`
    : "BEST IF USED BY";

  const handleShiftChange = (event) => {
    const nextShift = event.target.value;

    setShift(nextShift);
    setJob(nextShift === "1" ? "A" : "N");
    setStatusMessage("");
  };

  const handleUpdateMessage = async () => {
    if (!bestIfUsedBy) {
      window.alert("Please select the BEST IF USED BY date.");
      return;
    }

    const sendTime = new Date();
    const finalJulian = getJulianDay(sendTime);
    const finalYear = String(sendTime.getFullYear()).slice(-2);
    const finalJobCode = jobTable[job];

    const finalLot =
      `MX${finalJulian}${finalYear}${systemCode}${finalJobCode}`;

    const payload = {
      system: systemNumber,
      shift: Number(shift),
      job,
      jobCode: finalJobCode,
      heads: selectedHeads,
      line1: `${finalLot} ${formatCurrentTime(sendTime)}`,
      line2: `BEST IF USED BY ${formattedExpiration}`,
    };

    setIsSending(true);
    setStatusMessage("");

    try {
      /*
        Cuando conectemos el servidor CoreFlex, esta función recibirá
        exactamente el mensaje y los heads seleccionados.

        Ejemplo:

        onUpdateMessage({
          system: 1,
          shift: 1,
          job: "A",
          jobCode: "1",
          heads: "both",
          line1: "MX19326011 16:26",
          line2: "BEST IF USED BY 13Apr27"
        });
      */

      if (typeof onUpdateMessage === "function") {
        await onUpdateMessage(payload);
      } else {
        console.log("CoreFlex payload:", payload);
      }

      setCurrentTime(sendTime);
      setStatusMessage("MESSAGE READY");
    } catch (error) {
      console.error("CoreFlex update error:", error);
      setStatusMessage("UPDATE FAILED");
    } finally {
      setIsSending(false);
    }
  };

  const styles = {
    page: {
      minHeight: "100vh",
      background: "#eef0f2",
      fontFamily: "Arial, Helvetica, sans-serif",
      color: "#171717",
    },

    header: {
      background: "linear-gradient(135deg, #df1026, #b3081b)",
      color: "#ffffff",
      padding: "20px 30px",
      boxShadow: "0 3px 10px rgba(0,0,0,0.16)",
    },

    title: {
      margin: 0,
      fontSize: "28px",
      fontWeight: 900,
      letterSpacing: "0.4px",
    },

    systemTitle: {
      margin: "8px 0 0",
      fontSize: "16px",
      fontWeight: 900,
      letterSpacing: "0.8px",
    },

    container: {
      width: "min(900px, calc(100% - 30px))",
      margin: "26px auto",
      padding: "22px",
      boxSizing: "border-box",
      background: "#ffffff",
      border: "1px solid #d3d6da",
      borderRadius: "15px",
      boxShadow: "0 10px 28px rgba(0,0,0,0.1)",
    },

    screenBorder: {
      padding: "8px",
      background: "#24292d",
      border: "5px solid #252a2e",
      borderRadius: "15px",
      boxShadow:
        "inset 0 0 0 2px #0f1113, 0 5px 15px rgba(0,0,0,0.18)",
    },

    screen: {
      minHeight: "180px",
      padding: "35px 32px",
      boxSizing: "border-box",
      background: "#eff0d8",
      border: "2px solid #a8aa97",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      overflow: "hidden",
    },

    line1: {
      color: "#111111",
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: "clamp(20px, 2vw, 30px)",
      fontWeight: 700,
      letterSpacing: "3px",
      whiteSpace: "nowrap",
      marginBottom: "27px",
    },

    line2: {
      color: "#111111",
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: "clamp(15px, 1.7vw, 22px)",
      fontWeight: 700,
      letterSpacing: "3px",
      whiteSpace: "nowrap",
    },

    controls: {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: "18px",
      marginTop: "22px",
    },

    field: {
      display: "flex",
      flexDirection: "column",
      gap: "7px",
    },

    label: {
      fontSize: "13px",
      fontWeight: 900,
      letterSpacing: "0.8px",
      color: "#33373b",
    },

    input: {
      minHeight: "40px",
      width: "100%",
      boxSizing: "border-box",
      padding: "0 15px",
      border: "1px solid #b7bbc0",
      borderRadius: "9px",
      background: "#ffffff",
      color: "#252525",
      fontSize: "14px",
      fontWeight: 700,
    },

    informationRow: {
      gridColumn: "1 / -1",
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: "18px",
    },

    infoCard: {
      padding: "15px 17px",
      background: "#f3f4f5",
      border: "1px solid #d5d8db",
      borderRadius: "9px",
    },

    infoLabel: {
      display: "block",
      marginBottom: "5px",
      color: "#666b70",
      fontSize: "11px",
      fontWeight: 900,
      letterSpacing: "0.8px",
    },

    infoValue: {
      fontSize: "19px",
      fontWeight: 900,
    },

    headsSection: {
      gridColumn: "1 / -1",
    },

    headButtons: {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: "12px",
      marginTop: "9px",
    },

    headButton: {
      minHeight: "38px",
      border: "1px solid #adb1b6",
      borderRadius: "9px",
      background: "#f4f5f6",
      color: "#25282b",
      fontSize: "13px",
      fontWeight: 900,
      cursor: "pointer",
    },

    selectedHeadButton: {
      border: "1px solid #9e0717",
      background: "#bd0b20",
      color: "#ffffff",
      boxShadow: "0 4px 10px rgba(189,11,32,0.24)",
    },

    updateButton: {
      gridColumn: "1 / -1",
      width: "min(350px, 100%)",
      minHeight: "42px",
      margin: "5px auto 0",
      border: "none",
      borderRadius: "10px",
      background: "linear-gradient(135deg, #a50818, #76030e)",
      color: "#ffffff",
      fontSize: "14px",
      fontWeight: 900,
      cursor: isSending ? "wait" : "pointer",
      opacity: isSending ? 0.65 : 1,
      boxShadow: "0 5px 13px rgba(122,4,17,0.3)",
    },

    status: {
      gridColumn: "1 / -1",
      minHeight: "20px",
      textAlign: "center",
      color:
        statusMessage === "UPDATE FAILED" ? "#a20d1d" : "#176128",
      fontSize: "14px",
      fontWeight: 900,
    },
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>BOXES CODE</h1>
        <p style={styles.systemTitle}>SYSTEM {systemCode}</p>
      </header>

      <main style={styles.container}>
        <section style={styles.screenBorder}>
          <div style={styles.screen}>
            <div style={styles.line1}>{line1}</div>
            <div style={styles.line2}>{line2}</div>
          </div>
        </section>

        <section style={styles.controls}>
          <div style={styles.field}>
            <label htmlFor="boxes-shift" style={styles.label}>
              SHIFT
            </label>

            <select
              id="boxes-shift"
              value={shift}
              onChange={handleShiftChange}
              style={styles.input}
            >
              <option value="1">Shift 1</option>
              <option value="2">Shift 2</option>
            </select>
          </div>

          <div style={styles.field}>
            <label htmlFor="boxes-job" style={styles.label}>
              JOB
            </label>

            <select
              id="boxes-job"
              value={job}
              onChange={(event) => {
                setJob(event.target.value);
                setStatusMessage("");
              }}
              style={styles.input}
            >
              {jobs.map((jobOption) => (
                <option key={jobOption} value={jobOption}>
                  Job {jobOption}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label htmlFor="best-if-used-by" style={styles.label}>
              BEST IF USED BY
            </label>

            <input
              id="best-if-used-by"
              type="date"
              value={bestIfUsedBy}
              onChange={(event) => {
                setBestIfUsedBy(event.target.value);
                setStatusMessage("");
              }}
              style={styles.input}
            />
          </div>

          <div style={styles.informationRow}>
            <div style={styles.infoCard}>
              <span style={styles.infoLabel}>JULIAN DAY</span>
              <span style={styles.infoValue}>{julianDay}</span>
            </div>

            <div style={styles.infoCard}>
              <span style={styles.infoLabel}>JOB CODE</span>
              <span style={styles.infoValue}>{jobCode}</span>
            </div>
          </div>

          <div style={styles.headsSection}>
            <span style={styles.label}>HEADS</span>

            <div style={styles.headButtons}>
              <button
                type="button"
                onClick={() => {
                  setSelectedHeads("head1");
                  setStatusMessage("");
                }}
                style={{
                  ...styles.headButton,
                  ...(selectedHeads === "head1"
                    ? styles.selectedHeadButton
                    : {}),
                }}
              >
                HEAD 1
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedHeads("head2");
                  setStatusMessage("");
                }}
                style={{
                  ...styles.headButton,
                  ...(selectedHeads === "head2"
                    ? styles.selectedHeadButton
                    : {}),
                }}
              >
                HEAD 2
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedHeads("both");
                  setStatusMessage("");
                }}
                style={{
                  ...styles.headButton,
                  ...(selectedHeads === "both"
                    ? styles.selectedHeadButton
                    : {}),
                }}
              >
                BOTH
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleUpdateMessage}
            disabled={isSending}
            style={styles.updateButton}
          >
            {isSending ? "UPDATING..." : "UPDATE MESSAGE"}
          </button>

          <div style={styles.status}>{statusMessage}</div>
        </section>
      </main>
    </div>
  );
}