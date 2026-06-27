import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const defaultData = {
  plastic: {
    pcsPerFullRoll: '',
    fullRollsRemaining: '',
    startingRollQty: '',
    batchCount: '',
  },
  zipper: {
    startingTodayQty: '',
    ftPerFullRoll: '',
    ftPerFgBox: '',
    fullRollsRemaining: '',
  },
};

export default function System4Inventory() {
  const [data, setData] = useState(defaultData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const num = (value) => {
    const n = Number(String(value || '').replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  };

  const format = (value) => Number(value || 0).toLocaleString('en-US');

  const updatePlastic = (field, value) => {
    setData((prev) => ({
      ...prev,
      plastic: { ...prev.plastic, [field]: value },
    }));
  };

  const updateZipper = (field, value) => {
    setData((prev) => ({
      ...prev,
      zipper: { ...prev.zipper, [field]: value },
    }));
  };

  const loadLastState = async () => {
    setLoading(true);

    const { data: rows, error } = await supabase
      .from('material_inventory_state')
      .select('material_type, last_left_over')
      .eq('system_name', 'system4')
      .eq('line_name', 'MAIN');

    if (error) {
      console.error('Load S4 inventory error:', error);
      alert('Unable to load System 4 inventory.');
      setLoading(false);
      return;
    }

    const plasticRow = rows?.find((r) => r.material_type === 'plastic');
    const zipperRow = rows?.find((r) => r.material_type === 'zipper');

    setData((prev) => ({
      ...prev,
      plastic: {
        ...prev.plastic,
        startingRollQty: plasticRow ? String(plasticRow.last_left_over || '') : '',
      },
      zipper: {
        ...prev.zipper,
        startingTodayQty: zipperRow ? String(zipperRow.last_left_over || '') : '',
      },
    }));

    setLoading(false);
  };

  useEffect(() => {
    loadLastState();
  }, []);

  const pStart = num(data.plastic.startingRollQty);
  const pBatch = num(data.plastic.batchCount);
  const pcsPerRoll = num(data.plastic.pcsPerFullRoll);

  let plasticLO = pStart - pBatch;
  let plasticWarning = '';

  if (pBatch > pStart && pcsPerRoll > 0) {
    const extraUsed = pBatch - pStart;
    const usedOnCurrentRoll = extraUsed % pcsPerRoll;
    plasticLO = usedOnCurrentRoll === 0 ? 0 : pcsPerRoll - usedOnCurrentRoll;
    plasticWarning =
      'Batch count is higher than starting roll qty. Possible counter was not reset. System adjusted automatically.';
  }

  if (pBatch > pStart && pcsPerRoll <= 0) {
    plasticLO = 0;
    plasticWarning = 'Batch count is higher than starting roll qty.';
  }

  const plasticFullRollsTotal =
    num(data.plastic.fullRollsRemaining) * num(data.plastic.pcsPerFullRoll);

  const totalPlasticLO = plasticFullRollsTotal + plasticLO;
  const usedPlastic = pBatch;

  const ftPerFgBox = num(data.zipper.ftPerFgBox);

  const zipperFullRollsTotal =
    num(data.zipper.fullRollsRemaining) * num(data.zipper.ftPerFullRoll);

  const usedZipper = usedPlastic * ftPerFgBox;

  const zipperPhysicalLO =
    num(data.zipper.startingTodayQty) + zipperFullRollsTotal - usedZipper;

  const saveMaterialState = async (materialType, leftOver, unit) => {
    const { error } = await supabase.from('material_inventory_state').upsert(
      {
        system_name: 'system4',
        material_type: materialType,
        line_name: 'MAIN',
        last_left_over: leftOver,
        unit,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'system_name,material_type,line_name',
      }
    );

    if (error) {
      console.error(`Save ${materialType} error:`, error);
      return false;
    }

    return true;
  };

  const reset = async () => {
    if (!confirm('Save current L/O and reset this shift?')) return;

    setSaving(true);

    const plasticOk = await saveMaterialState('plastic', plasticLO, 'pcs');
    const zipperOk = await saveMaterialState('zipper', zipperPhysicalLO, 'ft');

    if (!plasticOk || !zipperOk) {
      alert('Unable to save System 4 inventory.');
      setSaving(false);
      return;
    }

    setData({
      ...defaultData,
      plastic: {
        ...defaultData.plastic,
        startingRollQty: String(plasticLO),
      },
      zipper: {
        ...defaultData.zipper,
        startingTodayQty: String(zipperPhysicalLO),
      },
    });

    alert('System 4 inventory reset. Last L/O saved for next shift.');
    setSaving(false);
  };

  if (loading) {
    return <div style={styles.loadingBox}>Loading System 4 Inventory...</div>;
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <h3 style={styles.title}>System 4 Inventory</h3>
      </div>

      <div style={styles.body}>
        <SectionTitle title="PLASTIC INVENTORY" />

        <div style={styles.topGrid}>
          {[
            ['pcsPerFullRoll', 'PCS per Full Roll'],
            ['fullRollsRemaining', 'Full Rolls Remaining'],
          ].map(([field, label]) => (
            <Field
              key={field}
              label={label}
              value={data.plastic[field]}
              onChange={(value) => updatePlastic(field, value)}
            />
          ))}
        </div>

        <div style={styles.singleCardWrap}>
          <div style={styles.lineCard}>
            <div style={styles.lineHeader}>SYSTEM 4 PLASTIC</div>

            <div style={styles.lineBody}>
              <Field
                label="Starting Roll QTY"
                value={data.plastic.startingRollQty}
                onChange={(value) => updatePlastic('startingRollQty', value)}
              />

              <div style={{ height: '14px' }} />

              <Field
                label="Batch Count"
                value={data.plastic.batchCount}
                onChange={(value) => updatePlastic('batchCount', value)}
              />

              <ResultBox
                rows={[
                  ['Roll Plastic L/O', format(plasticLO)],
                ]}
              />

              {plasticWarning && (
                <div style={styles.lineWarning}>{plasticWarning}</div>
              )}
            </div>
          </div>
        </div>

        <div style={styles.summaryGrid}>
          <Summary label="Full Rolls Total" value={format(plasticFullRollsTotal)} />
          <Summary label="Plastic L/O" value={format(plasticLO)} />
          <Summary label="Total Plastic L/O" value={format(totalPlasticLO)} />
        </div>

        <SectionTitle title="ZIPPER INVENTORY" />

        <div style={styles.topGrid}>
          {[
            ['startingTodayQty', "Starting Today's QTY FT"],
            ['ftPerFullRoll', 'FT per Full Roll'],
            ['ftPerFgBox', 'FT per FG Box'],
            ['fullRollsRemaining', 'Full Rolls Remaining'],
          ].map(([field, label]) => (
            <Field
              key={field}
              label={label}
              value={data.zipper[field]}
              onChange={(value) => updateZipper(field, value)}
            />
          ))}
        </div>

        <div style={styles.summaryGrid}>
          <Summary label="Zipper Full Rolls FT" value={format(zipperFullRollsTotal)} />
          <Summary label="Physical Zipper L/O" value={format(zipperPhysicalLO)} />
        </div>

        <div style={styles.resetRow}>
          <button onClick={reset} disabled={saving} style={styles.resetButton}>
            {saving ? 'Saving...' : 'Reset'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label style={styles.label}>{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        style={styles.input}
      />
    </div>
  );
}

function SectionTitle({ title }) {
  return <h3 style={styles.physicalTitle}>{title}</h3>;
}

function Summary({ label, value, blue, danger }) {
  return (
    <div
      style={{
        ...styles.summaryCard,
        backgroundColor: danger ? '#fef2f2' : blue ? '#eff6ff' : '#f8fafc',
        borderColor: danger ? '#fecaca' : blue ? '#bfdbfe' : '#e2e8f0',
      }}
    >
      <span style={styles.summaryLabel}>{label}</span>
      <b
        style={{
          ...styles.summaryValue,
          color: danger ? '#dc2626' : blue ? '#1d4ed8' : '#0f172a',
        }}
      >
        {value}
      </b>
    </div>
  );
}

function ResultBox({ rows }) {
  return (
    <div style={styles.resultBox}>
      {rows.map(([label, value], index) => (
        <div
          key={label}
          style={index === rows.length - 1 ? styles.resultRowLast : styles.resultRow}
        >
          <span>{label}</span>
          <b>{value}</b>
        </div>
      ))}
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
    margin: '10px 0 18px 0',
    letterSpacing: '0.04em',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '26px',
  },
  summaryCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '18px',
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
    fontSize: '1.45rem',
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