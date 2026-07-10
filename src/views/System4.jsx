import { useState, useEffect } from 'react';
import { BarChart3, CalendarClock, PackageOpen, ClipboardCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import System4Inventory from '../components/System4Inventory';

import LabelModule from '../components/labels/LabelModule';
const SYSTEM_NAME = 'system4';
const SYSTEM_LABEL = 'System 4';
const SYSTEM_CODE = 'S4';

export default function System4() {
  const [activeTab, setActiveTab] = useState('Home');

  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentDateTime.toLocaleDateString('en-US');
  const formattedTime = currentDateTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
});

  // DEVICE AUTHORIZATION
  const [deviceToken, setDeviceToken] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authPin, setAuthPin] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const verifyDevice = async () => {
      try {
        let token = localStorage.getItem(`${SYSTEM_NAME}_device_token`);

        if (!token) {
          token = crypto.randomUUID();
          localStorage.setItem(`${SYSTEM_NAME}_device_token`, token);
        }

        setDeviceToken(token);

        const { data, error } = await supabase
          .from('device_authorizations')
          .select('id, system_name, device_token, is_active')
          .eq('system_name', SYSTEM_NAME)
          .eq('device_token', token)
          .eq('is_active', true)
          .maybeSingle();

        if (error) {
          console.error('Device verification error:', error);
          setIsAuthorized(false);
          return;
        }

        setIsAuthorized(Boolean(data));
      } catch (error) {
        console.error('Unexpected authorization error:', error);
        setIsAuthorized(false);
      } finally {
        setAuthLoading(false);
      }
    };

    verifyDevice();
  }, []);

  const authorizeThisDevice = async (e) => {
    e.preventDefault();
    setAuthError('');

    const enteredPin = authPin.trim().toUpperCase();

    if (!enteredPin) {
      setAuthError('Enter authorization PIN.');
      return;
    }

    try {
      let localDeviceToken =
        deviceToken || localStorage.getItem(`${SYSTEM_NAME}_device_token`);

      if (!localDeviceToken) {
        localDeviceToken = crypto.randomUUID();
        localStorage.setItem(`${SYSTEM_NAME}_device_token`, localDeviceToken);
        setDeviceToken(localDeviceToken);
      }

      const { data, error } = await supabase
        .from('device_authorizations')
        .select('*')
        .eq('system_name', SYSTEM_NAME)
        .eq('device_token', enteredPin)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Authorization check error:', error);
        setAuthError('Unable to verify authorization PIN.');
        return;
      }

      if (!data) {
        setAuthError('Invalid authorization PIN.');
        return;
      }

      const { error: updateError } = await supabase
        .from('device_authorizations')
        .update({
          device_token: localDeviceToken,
          device_label: data.device_label || `${SYSTEM_LABEL} Authorized PC`,
          is_active: true
})
        .eq('id', data.id);

      if (updateError) {
        console.error('Device lock error:', updateError);
        setAuthError('Unable to lock this PC.');
        return;
      }

      setIsAuthorized(true);
      setAuthPin('');
    } catch (error) {
      console.error('Unexpected authorization error:', error);
      setAuthError('Unexpected error while authorizing this device.');
    }
  };

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
  };

  // RUN TOTAL
  const [tableData, setTableData] = useState(() => {
    const saved = localStorage.getItem(`${SYSTEM_NAME}_run_total_single_state`);

    if (saved) return JSON.parse(saved);

    return {
      productName: 'PRODUCT 1',
      productNumber: '1042',
      weeklyTarget: '',
      mondayDate: '',
      productionValues: {
        DAYS: Array(7).fill(''),
        NIGHTS: Array(7).fill('')
}
};
  });

  useEffect(() => {
    localStorage.setItem(
      `${SYSTEM_NAME}_run_total_single_state`,
      JSON.stringify(tableData)
    );
  }, [tableData]);

  const handleFieldChange = (field, value) => {
    setTableData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCellChange = (shift, dayIndex, value) => {
    setTableData((prev) => {
      const updatedValues = { ...prev.productionValues };
      updatedValues[shift] = [...updatedValues[shift]];
      updatedValues[shift][dayIndex] = value;

      return { ...prev, productionValues: updatedValues };
    });
  };

  const handleKeyDown = (e, shift, dayIndex) => {
    if (e.key !== 'Enter') return;

    e.preventDefault();

    if (shift === 'DAYS') {
      document.getElementById(`input-single-${SYSTEM_CODE}-NIGHTS-${dayIndex}`)?.focus();
    } else {
      const nextIndex = dayIndex + 1;

      if (nextIndex < 7) {
        document.getElementById(`input-single-${SYSTEM_CODE}-DAYS-${nextIndex}`)?.focus();
      }
    }
  };

  const getCalculatedDates = (baseDateStr) => {
    if (!baseDateStr) return Array(7).fill('----');

    const dates = [];
    const [year, month, day] = baseDateStr.split('-').map(Number);

    for (let i = 0; i < 7; i++) {
      const current = new Date(year, month - 1, day + i);
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      const yy = String(current.getFullYear()).slice(-2);

      dates.push(`${mm}/${dd}/${yy}`);
    }

    return dates;
  };

  const calculateTotalProduced = () => {
    let total = 0;

    ['DAYS', 'NIGHTS'].forEach((shift) => {
      tableData.productionValues[shift].forEach((val) => {
        const num = parseFloat(val);
        if (!isNaN(num)) total += num;
      });
    });

    return total;
  };

  const calculatedDaysDates = getCalculatedDates(tableData.mondayDate);
  const totalProduced = calculateTotalProduced();
  const targetAmount = parseFloat(tableData.weeklyTarget) || 0;
  const totalRemaining = targetAmount - totalProduced;
  const currentBgColor =
    totalRemaining <= 0 && targetAmount > 0 ? '#fee2e2' : '#dcfce7';

    // EXP CALC
const [inputDate, setInputDate] = useState('');
const [result, setResult] = useState(null);

const calculateExpiration = (e) => {
  e.preventDefault();

  if (!inputDate) return;

  const manufactureDate = new Date(inputDate);
  const today = new Date();

  manufactureDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const daysElapsed = Math.floor(
    (today.getTime() - manufactureDate.getTime()) / (1000 * 3600 * 24)
  );

  if (daysElapsed < 0) {
    setResult({
      type: 'error',
      message: 'The manufacture date cannot be in the future!'
});
    return;
  }

  if (daysElapsed <= 80) {
    setResult({
      type: 'success',
      message: `The product is ${daysElapsed} days old, you can use it.`
});
  } else if (daysElapsed <= 89) {
    setResult({
      type: 'warning',
      message: `The product is ${daysElapsed} days old. It is good, you can use it but notify your supervisor, it is close to expiring.`
});
  } else {
    setResult({
      type: 'danger',
      message: `STOP THE MACHINES AND CALL YOUR SUPERVISOR! THE PRODUCT IS ${daysElapsed} DAYS OLD. THE CANDY IS NOT GOOD.`
});
  }
};

const homeModulesInfo = [
    {
      title: 'Labels',
      desc: 'Auto and manual pallet labels.',
      icon: <ClipboardCheck size={24} />
    },
    {
      title: 'Inventory',
      desc: 'Plastic and zipper inventory count.',
      icon: <PackageOpen size={24} />
},
    {
    title: 'Exp. Calc',
    desc: 'Check if the product is within the 90-day limit from the manufacture date.',
    icon: <CalendarClock size={24} />
},
    {
      title: 'Run Total',
      desc: 'Weekly production tracking, active weeks, totals, and weekly progress.',
      icon: <BarChart3 size={24} />
},
  ];

  const tabs = [
    'Home',
    'Labels',
    'Inventory',
    'Exp. Calc',
    'Run Total',
    ];

  if (authLoading) {
    return (
      <div
        style={{
          backgroundColor: '#0f172a',
          color: '#fff',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '1.1rem',
          fontWeight: '700'
}}
      >
        Verifying authorized device...
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div
        style={{
          backgroundColor: '#0f172a',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          padding: '24px'
}}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '430px',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '14px',
            padding: '32px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
            color: '#f8fafc'
}}
        >
          <div style={{ textAlign: 'center', marginBottom: '26px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '54px',
                height: '54px',
                borderRadius: '12px',
                backgroundColor: '#dc2626',
                color: '#fff',
                fontWeight: '900',
                fontSize: '1.4rem',
                marginBottom: '14px'
}}
            >
              4
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: '1.45rem',
                fontWeight: '900'
}}
            >
              System 4 Authorization
            </h1>

            <p
              style={{
                margin: '8px 0 0 0',
                color: '#94a3b8',
                fontSize: '0.9rem',
                lineHeight: '1.5'
}}
            >
              This PC is not authorized yet. Enter the System 4 PIN once to lock this workstation to this device.
            </p>
          </div>

          <form onSubmit={authorizeThisDevice}>
            <label
              style={{
                display: 'block',
                color: '#cbd5e1',
                fontSize: '0.85rem',
                fontWeight: '700',
                marginBottom: '8px'
}}
            >
              Authorization PIN
            </label>

            <input
              type="password"
              value={authPin}
              onChange={(e) => setAuthPin(e.target.value)}
              placeholder="Enter System 4 PIN"
              autoFocus
              style={{
                width: '100%',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '12px',
                color: '#f8fafc',
                fontSize: '1rem',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '14px'
}}
            />

            {authError && (
              <div
                style={{
                  backgroundColor: '#7f1d1d',
                  border: '1px solid #ef4444',
                  color: '#fee2e2',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  marginBottom: '14px',
                  fontSize: '0.86rem',
                  fontWeight: '700'
}}
              >
                {authError}
              </div>
            )}

            <button
              type="submit"
              style={{
                width: '100%',
                backgroundColor: '#dc2626',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                fontWeight: '900',
                fontSize: '0.95rem',
                cursor: 'pointer'
}}
            >
              Authorize This PC
            </button>
          </form>

          <div
            style={{
              marginTop: '18px',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              color: '#94a3b8',
              fontSize: '0.75rem',
              lineHeight: '1.5',
              wordBreak: 'break-all'
}}
          >
            Device Token: {deviceToken || 'Generating...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: '#f1f5f9',
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif',
        margin: 0
}}
    >
      <div
        style={{
          backgroundColor: '#dc2626',
          color: '#fff',
          padding: '14px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
}}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              backgroundColor: '#fff',
              color: '#dc2626',
              fontWeight: '900',
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '0.9rem'
}}
          >
            1NICO
          </span>

          <span style={{ fontWeight: '500', fontSize: '0.95rem', opacity: 0.9 }}>
            Workstation
          </span>
        </div>

        <div style={{ textAlign: 'right', lineHeight: '1.3' }}>
          <div style={{ fontWeight: '800', fontSize: '1.05rem' }}>System 4</div>
          <div style={{ fontSize: '0.78rem', opacity: 0.95 }}>
            {formattedDate} • {formattedTime}
          </div>
        </div>
      </div>

      <div style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #cbd5e1',
            marginBottom: '24px',
            gap: '4px',
            flexWrap: 'wrap'
}}
        >
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              style={{
                padding: '12px 20px',
                border: '1px solid transparent',
                borderBottom: 'none',
                backgroundColor: activeTab === tab ? '#fff' : 'transparent',
                borderTopLeftRadius: '8px',
                borderTopRightRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: activeTab === tab ? '700' : '500',
                color: activeTab === tab ? '#0f172a' : '#64748b',
                borderColor:
                  activeTab === tab
                    ? '#cbd5e1 #cbd5e1 transparent'
                    : 'transparent',
                position: 'relative',
                top: '1px',
                whiteSpace: 'nowrap'
}}
            >
              {tab}
            </button>
          ))}
        </div>

        <div
          style={{
            backgroundColor: '#fff',
            padding: '32px',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
}}
        >
          {activeTab === 'Home' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '24px'
}}
            >
              {homeModulesInfo.map((mod, i) => (
                <div
                  key={i}
                  onClick={() => handleTabChange(mod.title)}
                  style={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    padding: '24px',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    cursor: 'pointer'
}}
                >
                  <div style={{ color: '#dc2626', marginBottom: '12px' }}>
                    {mod.icon}
                  </div>

                  <h3
                    style={{
                      fontSize: '1.2rem',
                      fontWeight: '700',
                      margin: '0 0 8px 0',
                      color: '#0f172a'
}}
                  >
                    {mod.title}
                  </h3>

                  <p
                    style={{
                      color: '#64748b',
                      fontSize: '0.9rem',
                      margin: 0,
                      lineHeight: '1.5'
}}
                  >
                    {mod.desc}
                  </p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'Inventory' && <System4Inventory />}

          {/* EXP. CALC */}
          {activeTab === 'Exp. Calc' && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px 0' }}>
              <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', width: '100%', maxWidth: '500px', overflow: 'hidden' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', color: '#1e3a8a' }}>
                    Expiration Date Calculator
                  </h3>
                </div>

                <form onSubmit={calculateExpiration} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                    <label style={{ fontWeight: '700', fontSize: '0.95rem', color: '#334155', whiteSpace: 'nowrap' }}>
                      Date of Manufacture:
                    </label>

                    <input
                      type="date"
                      value={inputDate}
                      onChange={(e) => setInputDate(e.target.value)}
                      required
                      style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 12px', fontSize: '1rem', color: '#334155', outline: 'none', backgroundColor: '#f8fafc', width: '100%', maxWidth: '200px' }}
                    />
                  </div>

                  <button type="submit" style={{ backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 16px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', width: '100%' }}>
                    Enter
                  </button>
                </form>

                <div style={{ padding: '0 24px 24px 24px' }}>
                  {!result ? (
                    <div style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '0.95rem', fontWeight: '500' }}>
                      Enter the manufacture date and press Enter.
                    </div>
                  ) : (
                    <div
                      style={{
                        backgroundColor:
                          result.type === 'success'
                            ? '#dcfce7'
                            : result.type === 'warning'
                            ? '#fef9c3'
                            : result.type === 'danger'
                            ? '#fee2e2'
                            : '#f1f5f9',
                        border: `1px solid ${
                          result.type === 'success'
                            ? '#22c55e'
                            : result.type === 'warning'
                            ? '#eab308'
                            : result.type === 'danger'
                            ? '#ef4444'
                            : '#cbd5e1'
                        }`,
                        color:
                          result.type === 'success'
                            ? '#14532d'
                            : result.type === 'warning'
                            ? '#713f12'
                            : result.type === 'danger'
                            ? '#742020'
                            : '#475569',
                        borderRadius: '6px',
                        padding: '16px',
                        fontSize: '1rem',
                        fontWeight: result.type === 'danger' ? '800' : '600',
                        lineHeight: '1.5',
                        textAlign: 'center'
}}
                    >
                      {result.message}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Run Total' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <style>{`
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
                input[type=number] { -moz-appearance: textfield; }
              `}</style>

              <div style={{ border: '1px solid #cbd5e1', padding: '16px', borderRadius: '6px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#374151', fontWeight: '700' }}>
                  Production Tracking — System 4
                </h3>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '15px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>
                      Monday Date:
                    </label>

                    <input
                      type="date"
                      value={tableData.mondayDate}
                      onChange={(e) => handleFieldChange('mondayDate', e.target.value)}
                      style={{ border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>
                      Weekly Target:
                    </label>

                    <input
                      type="number"
                      placeholder="Target amount"
                      value={tableData.weeklyTarget}
                      onChange={(e) => handleFieldChange('weeklyTarget', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                      }}
                      style={{ border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', width: '130px' }}
                    />
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Arial, sans-serif', fontSize: '11px', minWidth: '950px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f3f4', color: '#000' }}>
                        <th style={{ border: '1px solid #cbd5e1', padding: '10px', textAlign: 'center', width: '220px' }}>Product Specs</th>
                        <th style={{ border: '1px solid #cbd5e1', padding: '10px', textAlign: 'center', width: '100px' }}>Weekly Target</th>
                        <th style={{ border: '1px solid #cbd5e1', padding: '10px', textAlign: 'center', width: '80px' }}>Shifts</th>

                        {calculatedDaysDates.map((dateStr, idx) => (
                          <th key={idx} style={{ border: '1px solid #cbd5e1', padding: '10px', textAlign: 'center', fontWeight: '700', width: '95px' }}>
                            {dateStr}
                          </th>
                        ))}

                        <th style={{ border: '1px solid #cbd5e1', padding: '10px', textAlign: 'center', width: '110px', fontWeight: 'bold' }}>Total Produced</th>
                        <th style={{ border: '1px solid #cbd5e1', padding: '10px', textAlign: 'center', width: '110px', fontWeight: 'bold' }}>Total Remaining</th>
                      </tr>
                    </thead>

                    <tbody>
                      <tr style={{ backgroundColor: currentBgColor }}>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px', backgroundColor: '#fff', textAlign: 'center' }}>
                          <input
                            type="text"
                            value={tableData.productName}
                            onChange={(e) => handleFieldChange('productName', e.target.value.toUpperCase())}
                            style={{ border: 'none', padding: '4px', fontWeight: 'bold', fontSize: '12px', textAlign: 'center', width: '95%', outline: 'none', textTransform: 'uppercase', backgroundColor: 'transparent' }}
                            placeholder="PRODUCT NAME"
                          />
                        </td>

                        <td rowSpan={2} style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center', fontWeight: '600', fontSize: '13px', color: '#000', backgroundColor: '#f8fafc' }}>
                          {tableData.weeklyTarget || '0'}
                        </td>

                        <td style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.03)', color: '#000', textAlign: 'center' }}>
                          DAYS
                        </td>

                        {tableData.productionValues.DAYS.map((val, idx) => (
                          <td key={idx} style={{ border: '1px solid #cbd5e1', padding: '4px', backgroundColor: '#fff' }}>
                            <input
                              id={`input-single-${SYSTEM_CODE}-DAYS-${idx}`}
                              type="number"
                              value={val}
                              onChange={(e) => handleCellChange('DAYS', idx, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, 'DAYS', idx)}
                              style={{ width: '100%', border: 'none', textAlign: 'center', padding: '4px 0', fontSize: '12px', outline: 'none', backgroundColor: 'transparent' }}
                              placeholder="0"
                            />
                          </td>
                        ))}

                        <td rowSpan={2} style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center', fontSize: '15px', fontWeight: '900', color: '#000' }}>
                          {totalProduced}
                        </td>

                        <td rowSpan={2} style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center', fontSize: '15px', fontWeight: '900', color: '#000' }}>
                          {totalRemaining}
                        </td>
                      </tr>

                      <tr style={{ backgroundColor: currentBgColor }}>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px', backgroundColor: '#fff', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'bold' }}>#</span>

                            <input
                              type="text"
                              value={tableData.productNumber}
                              onChange={(e) => handleFieldChange('productNumber', e.target.value)}
                              style={{ border: 'none', padding: '4px', fontSize: '12px', textAlign: 'center', width: '80%', outline: 'none', fontWeight: '600', backgroundColor: 'transparent' }}
                              placeholder="Number"
                            />
                          </div>
                        </td>

                        <td style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.03)', color: '#000', textAlign: 'center' }}>
                          NIGHTS
                        </td>

                        {tableData.productionValues.NIGHTS.map((val, idx) => (
                          <td key={idx} style={{ border: '1px solid #cbd5e1', padding: '4px', backgroundColor: '#fff' }}>
                            <input
                              id={`input-single-${SYSTEM_CODE}-NIGHTS-${idx}`}
                              type="number"
                              value={val}
                              onChange={(e) => handleCellChange('NIGHTS', idx, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, 'NIGHTS', idx)}
                              style={{ width: '100%', border: 'none', textAlign: 'center', padding: '4px 0', fontSize: '12px', outline: 'none', backgroundColor: 'transparent' }}
                              placeholder="0"
                            />
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* LABELS */}
          {activeTab === 'Labels' && (
            <LabelModule
              systemCode="S4"
              printer="system234"
              productNumber={tableData.productNumber || ''}
            />
          )}

        </div>
      </div>
    </div>
  );
}

const attendanceThLeft = {
  padding: '12px',
  border: '1px solid #cbd5e1',
  color: '#0f172a',
  textAlign: 'left',
  width: '60px'
};

const attendanceTh = {
  padding: '12px',
  border: '1px solid #cbd5e1',
  color: '#0f172a',
  textAlign: 'center'
};

const attendanceThTime = {
  ...attendanceTh,
  width: '150px'
};

const attendanceThAction = {
  ...attendanceTh,
  width: '120px'
};

const attendanceTdNumber = {
  padding: '10px',
  border: '1px solid #e2e8f0',
  textAlign: 'center',
  color: '#334155',
  fontWeight: '700'
};

const attendanceTdName = {
  padding: '10px',
  border: '1px solid #e2e8f0',
  color: '#334155',
  fontWeight: '700'
};

const attendanceTdInput = {
  padding: '6px',
  border: '1px solid #e2e8f0',
  textAlign: 'center'
};

const attendanceTdAction = {
  padding: '8px',
  border: '1px solid #e2e8f0',
  textAlign: 'center'
};

const attendanceTimeInput = {
  width: '100%',
  border: '1px solid #cbd5e1',
  borderRadius: '6px',
  padding: '7px',
  textAlign: 'center',
  outline: 'none',
  boxSizing: 'border-box',
  color: '#334155'
};
