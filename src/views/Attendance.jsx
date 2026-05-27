import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date) {
  return date.toLocaleDateString('en-US');
}

function getWeekInfo() {
  const monday = getMonday();
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    monday,
    sunday,
    weekKey: monday.toISOString().split('T')[0],
    weekLabel: `${formatDate(monday)} to ${formatDate(sunday)}`,
  };
}

export default function Attendance() {
  const navigate = useNavigate();
  const { monday, weekKey, weekLabel } = getWeekInfo();

  const storageKey = `weekly_attendance_data_${weekKey}`;

  const [weeklyData, setWeeklyData] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(weeklyData));
  }, [weeklyData, storageKey]);

  const getDayDate = (index) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + index);
    return formatDate(d);
  };

  const downloadExcel = () => {
    const rows = [];

    DAYS.forEach((day, index) => {
      const records = weeklyData[day] || [];

      records.forEach((person) => {
        rows.push({
          Week: weekLabel,
          Day: day,
          Date: getDayDate(index),
          Name: person.name,
          'Time In': person.timeIn,
          'Time Out': person.timeOut,
          System: person.system,
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    XLSX.writeFile(workbook, `weekly-attendance-${weekKey}.xlsx`);
  };

  const resetWeek = () => {
    const confirmReset = confirm(
      'Download the Excel file before resetting. Reset this weekly attendance?'
    );

    if (!confirmReset) return;

    localStorage.removeItem(storageKey);
    setWeeklyData({});
  };

  return (
    <div
      style={{
        backgroundColor: '#0f172a',
        minHeight: '100vh',
        padding: '40px',
        color: '#f8fafc',
        fontFamily: 'system-ui',
      }}
    >
      <div style={{ maxWidth: '1500px', margin: '0 auto' }}>
        <button
          onClick={() => navigate('/home')}
          style={{
            backgroundColor: '#1e293b',
            color: '#fff',
            border: '1px solid #334155',
            padding: '10px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            marginBottom: '24px',
          }}
        >
          ← Back to Dashboard
        </button>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '28px',
            borderBottom: '1px solid #334155',
            paddingBottom: '20px',
            gap: '20px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1 style={{ margin: 0, color: '#38bdf8' }}>
              Weekly Attendance
            </h1>

            <p style={{ color: '#94a3b8', marginTop: '6px' }}>
              Week: {weekLabel}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={downloadExcel}
              style={{
                backgroundColor: '#22c55e',
                color: '#fff',
                border: 'none',
                padding: '12px 18px',
                borderRadius: '8px',
                fontWeight: '800',
                cursor: 'pointer',
              }}
            >
              Download Excel
            </button>

            <button
              onClick={resetWeek}
              style={{
                backgroundColor: '#ef4444',
                color: '#fff',
                border: 'none',
                padding: '12px 18px',
                borderRadius: '8px',
                fontWeight: '800',
                cursor: 'pointer',
              }}
            >
              Reset Week
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px',
          }}
        >
          {DAYS.map((day, index) => {
            const records = weeklyData[day] || [];

            return (
              <div
                key={day}
                style={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#dc2626',
                    padding: '14px 18px',
                    fontWeight: '900',
                  }}
                >
                  {day.toUpperCase()} — {getDayDate(index)}
                </div>

                <div style={{ padding: '16px' }}>
                  {records.length === 0 ? (
                    <div
                      style={{
                        padding: '24px',
                        textAlign: 'center',
                        color: '#94a3b8',
                        border: '1px dashed #334155',
                        borderRadius: '8px',
                      }}
                    >
                      No records.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      {records.map((person, idx) => (
                        <div
                          key={idx}
                          style={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            padding: '12px',
                            color: '#f8fafc',
                            fontSize: '0.92rem',
                            fontWeight: '700',
                            lineHeight: '1.4',
                          }}
                        >
                          {idx + 1}. {person.name} {person.timeIn || '--:--'} -{' '}
                          {person.timeOut || '--:--'} {person.system}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}