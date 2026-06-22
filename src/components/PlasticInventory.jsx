import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const defaultPlasticData = {
  todaysStartingQty: '',
  pcsPerFullRoll: '',
  fullRollsRemaining: '',
  totalGoodBagsProduced: '',
  lines: {
    L1: { startingRollQty: '', batchCount: '' },
    L2: { startingRollQty: '', batchCount: '' },
    L3: { startingRollQty: '', batchCount: '' },
  },
};

export default function PlasticInventory() {
  const [plasticData, setPlasticData] = useState(defaultPlasticData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const num = (value) => {
    const n = Number(String(value || '').replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  };

  const format = (value) => Number(value || 0).toLocaleString('en-US');

  const updateField = (field, value) => {
    setPlasticData((prev) => ({ ...prev, [field]: value }));
  };

  const updateLine = (line, field, value) => {
    setPlasticData((prev) => ({
      ...prev,
      lines: {
        ...prev.lines,
        [line]: {
          ...prev.lines[line],
          [field]: value,
        },
      },
    }));
  };

  const loadLastLeftOvers = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('material_inventory_state')
      .select('line_name, last_left_over')
      .eq('system_name', 'system1')
      .eq('material_type', 'plastic');

    if (error) {
      console.error('Load plastic L/O error:', error);
      alert('Unable to load last plastic L/O.');
      setLoading(false);
      return;
    }

    setPlasticData((prev) => {
      const updated = { ...prev, lines: { ...prev.lines } };

      ['L1', 'L2', 'L3'].forEach((line) => {
        const found = data?.find((item) => item.line_name === line);
        updated.lines[line] = {
          ...updated.lines[line],
          startingRollQty: found ? String(found.last_left_over || '') : '',
        };
      });

      return updated;
    });

    setLoading(false);
  };

  useEffect(() => {
    loadLastLeftOvers();
  }, []);

  const calculateLine = (line) => {
    const start = num(plasticData.lines[line].startingRollQty);
    const batch = num(plasticData.lines[line].batchCount);
    const pcsPerRoll = num(plasticData.pcsPerFullRoll);

    if (batch <= start) {
      return {
        line,
        start,
        printed: batch,
        leftOver: start - batch,
        warning: '',
      };
    }

    if (pcsPerRoll <= 0) {
      return {
        line,
        start,
        printed: batch,
        leftOver: 0,
        warning: 'Batch count is higher than starting roll qty.',
      };
    }

    const extraUsed = batch - start;
    const usedOnCurrentRoll = extraUsed % pcsPerRoll;
    const leftOver =
      usedOnCurrentRoll === 0 ? 0 : pcsPerRoll - usedOnCurrentRoll;

    return {
      line,
      start,
      printed: batch,
      leftOver,
      warning:
        'Batch count is higher than starting roll qty. Possible counter was not reset. System adjusted automatically.',
    };
  };

  const results = ['L1', 'L2', 'L3'].map(calculateLine);

  const fullRollsTotal =
    num(plasticData.fullRollsRemaining) * num(plasticData.pcsPerFullRoll);

  const linesLOTotal = results.reduce((sum, item) => sum + item.leftOver, 0);
  const totalLO = fullRollsTotal + linesLOTotal;
  const usedQty = num(plasticData.todaysStartingQty) - totalLO;
  const rejects = usedQty - num(plasticData.totalGoodBagsProduced);

  const countWarning =
    num(plasticData.totalGoodBagsProduced) > 0 &&
    usedQty < num(plasticData.totalGoodBagsProduced);

  const saveLineState = async (lineName, leftOver) => {
    const { error } = await supabase.from('material_inventory_state').upsert(
      {
        system_name: 'system1',
        material_type: 'plastic',
        line_name: lineName,
        last_left_over: leftOver,
        unit: 'pcs',
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'system_name,material_type,line_name',
      }
    );

    if (error) {
      console.error(`Save plastic L/O error ${lineName}:`, error);
      return false;
    }

    return true;
  };

  const reset = async () => {
    if (!confirm('Save current L/O and reset this shift?')) return;

    setSaving(true);

    const saves = await Promise.all(
      results.map((item) => saveLineState(item.line, item.leftOver))
    );

    if (saves.some((ok) => !ok)) {
      alert('Unable to save one or more plastic L/O values.');
      setSaving(false);
      return;
    }

    setPlasticData({
      ...defaultPlasticData,
      lines: {
        L1: { startingRollQty: String(results[0].leftOver), batchCount: '' },
        L2: { startingRollQty: String(results[1].leftOver), batchCount: '' },
        L3: { startingRollQty: String(results[2].leftOver), batchCount: '' },
      },
    });

    alert('Shift reset. Last L/O saved for next shift.');
    setSaving(false);
  };

  if (loading) {
    return <div style={styles.loadingBox}>Loading last plastic L/O...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <div style={styles.wrapper}>
        <div style={styles.header}>
          <h3 style={styles.title}>Plastic Inventory</h3>
        </div>

        <div style={styles.body}>
          <div style={styles.topGrid}>
            {[
              ['todaysStartingQty', "Today's Starting QTY"],
              ['pcsPerFullRoll', 'Pcs per Full Roll'],
              ['fullRollsRemaining', 'Full Rolls Remaining'],
              ['totalGoodBagsProduced', 'Total Good Bags Produced'],
            ].map(([field, label]) => (
              <div key={field}>
                <label style={styles.label}>{label}</label>

                <input
                  type="number"
                  value={plasticData[field]}
                  onChange={(e) => updateField(field, e.target.value)}
                  placeholder="0"
                  style={styles.input}
                />
              </div>
            ))}
          </div>

          <div style={styles.lineGrid}>
            {results.map((item) => (
              <div key={item.line} style={styles.lineCard}>
                <div style={styles.lineHeader}>{item.line}</div>

                <div style={styles.lineBody}>
                  <label style={styles.label}>Starting Roll QTY</label>

                  <input
                    type="number"
                    value={plasticData.lines[item.line].startingRollQty}
                    onChange={(e) =>
                      updateLine(item.line, 'startingRollQty', e.target.value)
                    }
                    placeholder="0"
                    style={styles.input}
                  />

                  <label style={{ ...styles.label, marginTop: '14px' }}>
                    Batch Count
                  </label>

                  <input
                    type="number"
                    value={plasticData.lines[item.line].batchCount}
                    onChange={(e) =>
                      updateLine(item.line, 'batchCount', e.target.value)
                    }
                    placeholder="0"
                    style={styles.input}
                  />

                  <div style={styles.resultBox}>
                    <div style={styles.resultRow}>
                      <span>Start</span>
                      <b>{format(item.start)}</b>
                    </div>

                    <div style={styles.resultRow}>
                      <span>Printed</span>
                      <b>{format(item.printed)}</b>
                    </div>

                    <div style={styles.resultRowLast}>
                      <span>L/O</span>
                      <b>{format(item.leftOver)}</b>
                    </div>
                  </div>

                  {item.warning && (
                    <div style={styles.lineWarning}>{item.warning}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <h3 style={styles.physicalTitle}>PHYSICAL COUNT</h3>

          <div style={styles.summaryGrid}>
            <div style={styles.summaryCard}>
              <span style={styles.summaryLabel}>Full Rolls Total</span>
              <b style={styles.summaryValue}>{format(fullRollsTotal)}</b>
            </div>

            <div style={styles.summaryCard}>
              <span style={styles.summaryLabel}>L1-L2-L3 L/O</span>
              <b style={styles.summaryValue}>{format(linesLOTotal)}</b>
            </div>

            <div style={styles.summaryCard}>
              <span style={styles.summaryLabel}>Total L/O</span>
              <b style={styles.summaryValue}>{format(totalLO)}</b>
            </div>
          </div>

          <div style={styles.finalGrid}>
            <div style={styles.usedCard}>
              <span style={styles.summaryLabel}>Used QTY</span>
              <b style={{ ...styles.summaryValue, color: '#1d4ed8' }}>
                {format(usedQty)}
              </b>
            </div>

            <div
              style={{
                ...styles.rejectCard,
                backgroundColor: countWarning ? '#fef2f2' : '#f0fdf4',
                borderColor: countWarning ? '#fecaca' : '#bbf7d0',
              }}
            >
              <span style={styles.summaryLabel}>Rejects</span>
              <b
                style={{
                  ...styles.summaryValue,
                  color: countWarning ? '#dc2626' : '#15803d',
                }}
              >
                {format(rejects)}
              </b>
            </div>
          </div>

          {countWarning && (
            <div style={styles.countWarning}>
              Something is wrong with the count. Please review it again.
            </div>
          )}

          <div style={styles.resetRow}>
            <button onClick={reset} disabled={saving} style={styles.resetButton}>
              {saving ? 'Saving...' : 'Reset'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  loadingBox: {
    padding: '24px',
    textAlign: 'center',
    fontWeight: '900',
    color: '#475569',
  },
  wrapper: {
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    backgroundColor: '#fff',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
  },
  header: {
    padding: '22px 24px',
    borderBottom: '1px solid #e2e8f0',
    textAlign: 'center',
    backgroundColor: '#f8fafc',
  },
  title: {
    margin: 0,
    fontSize: '1.45rem',
    fontWeight: '900',
    color: '#1e293b',
  },
  body: {
    padding: '24px',
  },
  topGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '14px',
    marginBottom: '24px',
  },
  lineGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '18px',
    marginBottom: '28px',
  },
  lineCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    overflow: 'hidden',
    backgroundColor: '#fff',
    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.05)',
  },
  lineHeader: {
    backgroundColor: '#dc2626',
    color: '#fff',
    padding: '12px',
    textAlign: 'center',
    fontSize: '1.1rem',
    fontWeight: '900',
  },
  lineBody: {
    padding: '16px',
  },
  label: {
    display: 'block',
    fontSize: '0.78rem',
    fontWeight: '800',
    color: '#475569',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '11px',
    fontSize: '1rem',
    fontWeight: '800',
    color: '#0f172a',
    outline: 'none',
    boxSizing: 'border-box',
    textAlign: 'center',
  },
  resultBox: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    overflow: 'hidden',
    marginTop: '16px',
  },
  resultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '0.9rem',
    color: '#334155',
    fontWeight: '700',
  },
  resultRowLast: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    fontSize: '0.9rem',
    color: '#334155',
    fontWeight: '700',
  },
  lineWarning: {
    marginTop: '12px',
    backgroundColor: '#fef3c7',
    border: '1px solid #f59e0b',
    color: '#92400e',
    borderRadius: '8px',
    padding: '10px',
    fontSize: '0.8rem',
    fontWeight: '800',
    lineHeight: '1.4',
  },
  physicalTitle: {
    textAlign: 'center',
    fontSize: '1.4rem',
    fontWeight: '900',
    color: '#0f172a',
    margin: '6px 0 18px 0',
    letterSpacing: '0.04em',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  summaryCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    textAlign: 'center',
  },
  finalGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '16px',
    marginBottom: '18px',
  },
  usedCard: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    textAlign: 'center',
  },
  rejectCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    textAlign: 'center',
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: '0.85rem',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#0f172a',
    fontSize: '1.65rem',
    fontWeight: '900',
  },
  countWarning: {
    backgroundColor: '#7f1d1d',
    border: '1px solid #ef4444',
    color: '#fee2e2',
    borderRadius: '10px',
    padding: '14px',
    fontSize: '0.95rem',
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: '18px',
  },
  resetRow: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  resetButton: {
    backgroundColor: '#fff',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '10px 16px',
    fontWeight: '900',
    cursor: 'pointer',
  },
};