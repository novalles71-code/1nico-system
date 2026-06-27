import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const defaultPlasticData = {
  pcsPerFullRoll: '',
  fullRollsRemaining: '',
  batchCount: '',
};

export default function PlasticInventorySingleLine({
  system = 'system2',
  title = 'SYSTEM 2',
}) {
  const [plasticData, setPlasticData] = useState(defaultPlasticData);
  const [startingRollQty, setStartingRollQty] = useState('');
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

  const loadLastLeftOver = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('material_inventory_state')
      .select('last_left_over')
      .eq('system_name', system)
      .eq('material_type', 'plastic')
      .eq('line_name', 'MAIN')
      .maybeSingle();

    if (error) {
      console.error('Load plastic L/O error:', error);
      alert('Unable to load last plastic L/O.');
      setLoading(false);
      return;
    }

    setStartingRollQty(String(data?.last_left_over || ''));
    setLoading(false);
  };

  useEffect(() => {
    loadLastLeftOver();
  }, [system]);

  const start = num(startingRollQty);
  const batch = num(plasticData.batchCount);
  const pcsPerRoll = num(plasticData.pcsPerFullRoll);

  let rollPlasticLO = start - batch;
  let rollWarning = '';

  if (batch > start && pcsPerRoll > 0) {
    const extraUsed = batch - start;
    const usedOnCurrentRoll = extraUsed % pcsPerRoll;

    rollPlasticLO =
      usedOnCurrentRoll === 0 ? 0 : pcsPerRoll - usedOnCurrentRoll;

    rollWarning =
      'Batch count is higher than starting roll qty. Possible counter was not reset. System adjusted automatically.';
  }

  if (batch > start && pcsPerRoll <= 0) {
    rollPlasticLO = 0;
    rollWarning = 'Batch count is higher than starting roll qty.';
  }

  const fullRollsTotal =
    num(plasticData.fullRollsRemaining) * num(plasticData.pcsPerFullRoll);

  const totalLO = fullRollsTotal + rollPlasticLO;

  const saveState = async (newLeftOver) => {
    const { error } = await supabase.from('material_inventory_state').upsert(
      {
        system_name: system,
        material_type: 'plastic',
        line_name: 'MAIN',
        last_left_over: newLeftOver,
        unit: 'pcs',
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'system_name,material_type,line_name',
      }
    );

    if (error) {
      console.error('Save plastic L/O error:', error);
      alert('Unable to save plastic L/O.');
      return false;
    }

    return true;
  };

  const reset = async () => {
    if (!confirm('Save current L/O and reset this shift?')) return;

    setSaving(true);

    const ok = await saveState(rollPlasticLO);

    if (ok) {
      setStartingRollQty(String(rollPlasticLO));
      setPlasticData(defaultPlasticData);
      alert('Shift reset. Last L/O saved for next shift.');
    }

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
              ['pcsPerFullRoll', 'Pcs per Full Roll'],
              ['fullRollsRemaining', 'Full Rolls Remaining'],
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

          <div style={styles.singleCardWrap}>
            <div style={styles.lineCard}>
              <div style={styles.lineHeader}>{title}</div>

              <div style={styles.lineBody}>
                <label style={styles.label}>Starting Roll QTY</label>

                <input
                  type="number"
                  value={startingRollQty}
                  onChange={(e) => setStartingRollQty(e.target.value)}
                  placeholder="0"
                  style={styles.input}
                />

                <label style={{ ...styles.label, marginTop: '14px' }}>
                  Batch Count
                </label>

                <input
                  type="number"
                  value={plasticData.batchCount}
                  onChange={(e) => updateField('batchCount', e.target.value)}
                  placeholder="0"
                  style={styles.input}
                />

                <div style={styles.resultBox}>
                  <div style={styles.resultRowLast}>
                    <span>Roll Plastic L/O</span>
                    <b>{format(rollPlasticLO)}</b>
                  </div>
                </div>

                {rollWarning && (
                  <div style={styles.lineWarning}>{rollWarning}</div>
                )}
              </div>
            </div>
          </div>

          <h3 style={styles.physicalTitle}>PHYSICAL COUNT</h3>

          <div style={styles.summaryGrid}>
            <div style={styles.summaryCard}>
              <span style={styles.summaryLabel}>Full Rolls Total</span>
              <b style={styles.summaryValue}>{format(fullRollsTotal)}</b>
            </div>

            <div style={styles.summaryCard}>
              <span style={styles.summaryLabel}>Roll Plastic L/O</span>
              <b style={styles.summaryValue}>{format(rollPlasticLO)}</b>
            </div>

            <div style={styles.summaryCard}>
              <span style={styles.summaryLabel}>Total L/O</span>
              <b style={styles.summaryValue}>{format(totalLO)}</b>
            </div>
          </div>

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
  subtitle: {
    margin: '6px 0 0 0',
    color: '#64748b',
    fontSize: '0.9rem',
    fontWeight: '500',
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
  singleCardWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '28px',
  },
  lineCard: {
    width: '100%',
    maxWidth: '430px',
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