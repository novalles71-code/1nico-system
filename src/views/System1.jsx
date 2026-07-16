import { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  BarChart3,
  CalendarClock,
  PackageOpen
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import PlasticInventory from '../components/PlasticInventory';

import LabelModule from '../components/labels/LabelModule';
import BoxesCode from '../components/coreflex/BoxesCode';
const SYSTEM_NAME = 'system1';
const SYSTEM_LABEL = 'System 1';
const SYSTEM_CODE = 'S1';

export default function System1() {
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
    const saved = localStorage.getItem('system1_run_total_single_state');

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
      'system1_run_total_single_state',
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
      document.getElementById(`input-single-NIGHTS-${dayIndex}`)?.focus();
    } else {
      const nextIndex = dayIndex + 1;

      if (nextIndex < 7) {
        document.getElementById(`input-single-DAYS-${nextIndex}`)?.focus();
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

  // QC
  const [expandedQcCard, setExpandedQcCard] = useState(null);
  const [qcLanguage, setQcLanguage] = useState('en');

  const homeModulesInfo = [
    {
      title: 'QC',
      desc: 'Quality checks, inspections, weight verification, and compliance tracking.',
      icon: <ClipboardCheck size={24} />
},
    {
      title: 'Run Total',
      desc: 'Weekly production tracking, active weeks, totals, and weekly progress.',
      icon: <BarChart3 size={24} />
},
    {
      title: 'Plastic Inventory',
      desc: 'Calculate plastic physical count, used qty, and rejects.',
      icon: <PackageOpen size={24} />
},

    {
      title: 'Exp. Calc',
      desc: 'Check if the product is within the 90-day limit from the manufacture date.',
      icon: <CalendarClock size={24} />
},
    {
      title: 'Labels',
      desc: 'Label Format. White Label',
      icon: <ClipboardCheck size={24} />
},
    {
      title: 'Boxes Code',
      desc: 'Generate and preview the CoreFlex box message.',
      icon: <ClipboardCheck size={24} />
    },

  ];

  const tabs = [
    'Home',
    'Labels',
    'Boxes Code',
    'Plastic Inventory',
    'Exp. Calc',
    'Run Total',
    'QC',
    
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
              1
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: '1.45rem',
                fontWeight: '900'
}}
            >
              System 1 Authorization
            </h1>

            <p
              style={{
                margin: '8px 0 0 0',
                color: '#94a3b8',
                fontSize: '0.9rem',
                lineHeight: '1.5'
}}
            >
              This PC is not authorized yet. Enter the System 1 PIN once to lock this workstation to this device.
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
              placeholder="Enter System 1 PIN"
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
      {/* Barra Superior */}
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
          <div style={{ fontWeight: '800', fontSize: '1.05rem' }}>System 1</div>
          <div style={{ fontSize: '0.78rem', opacity: 0.95 }}>
            {formattedDate} • {formattedTime}
          </div>
        </div>
      </div>

      <div style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Pestañas */}
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
          {/* HOME */}
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

          {/* QC */}
{activeTab === 'QC' && (() => {

  const qcPosts = [
    {
      id: 1,

      titleEN: 'How to Run System 1 as QC',
      titleES: 'Cómo Operar el System 1 como QC',

      previewEN:
        'Step-by-step process for preparing and operating the S1 production line as Quality Control.',

      previewES:
        'Proceso paso a paso para preparar y operar la línea S1 como Control de Calidad.',

      contentEN: `
1. Start of Shift

When arriving at the production line in the morning, the first thing you must do is verify that the entire line is clean and free of any unnecessary materials or items unrelated to the product being produced.

Once the area is organized and only the correct materials are present, take the BOM (Bill of Materials) and, before the production line starts running, verify the following:

A) Confirm that the BOM is correct.
If you have any doubts, immediately ask your supervisor.

B) Verify that all product components are on the floor and match the BOM.

C) Verify that the box code, bag code, and label code all match correctly.
If any code does not match, contact your supervisor immediately.
If everything matches correctly, notify the operators that they may begin coding the bags and boxes.

D) After the operators place the codes on the bags and boxes, take the first bag from each machine and the first box produced to confirm once again that all codes are correct.

2. Metal Detector Check

Once the machines begin running and the codes have been verified, the next step is ensuring that the metal detector is functioning properly.

Perform the metal detector verification on every machine according to QC procedures.

3. Pallet Sheet Delivery

Provide the pallet operator with the corresponding People Placement sheet so pallet production can be tracked correctly throughout the shift.

4. QC Paperwork Preparation

After confirming:

• Correct product on the floor  
• Correct codes  
• Proper metal detector operation  
• Pallet operator has their paperwork  

You may then begin preparing and completing all QC documentation and production paperwork.
      `,

      contentES: `
1. Inicio del Turno

Al llegar a la línea de producción en la mañana, lo primero que debes hacer es verificar que toda la línea esté limpia y libre de materiales innecesarios o artículos que no correspondan al producto que se va a correr.

Cuando el área esté organizada y solamente estén presentes los materiales correctos, debes tomar el BOM (Bill of Materials) y, antes de que la línea comience a correr, verificar lo siguiente:

A) Confirmar que el BOM sea el correcto.
Si tienes alguna duda, consulta inmediatamente con tu supervisor.

B) Verificar que todos los componentes del producto estén en el piso y coincidan con el BOM.

C) Verificar que el código de la caja, el código de la bolsa y el código del label coincidan correctamente.
Si algún código no coincide, llama inmediatamente a tu supervisor.
Si todo coincide correctamente, notifica a las operadoras que pueden comenzar a codificar las bolsas y cajas.

D) Después de que las operadoras coloquen los códigos en las bolsas y cajas, debes tomar la primera bolsa de cada máquina y la primera caja producida para confirmar nuevamente que todos los códigos son correctos.

2. Chequeo del Detector de Metal

Una vez que las máquinas comiencen a correr y los códigos hayan sido verificados, el siguiente paso es asegurarte de que el detector de metales esté funcionando correctamente.

Realiza el chequeo del detector de metales en cada máquina de acuerdo con los procedimientos de QC.

3. Entrega de Hoja al Operador de Paletas

Entrega al operador de paletas la hoja correspondiente de People Placement para que pueda llevar el control correcto de las paletas producidas durante el turno.

4. Preparación de Papelería QC

Después de confirmar:

• Producto correcto en el piso  
• Códigos correctos  
• Correcto funcionamiento del detector de metal  
• El operador de paletas tiene su hoja de trabajo  

Entonces puedes comenzar a preparar y completar toda la documentación y papelería de QC.
      `
},
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '22px'
}}
    >

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
}}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '1.8rem',
              fontWeight: '800',
              color: '#0f172a'
}}
          >
            Quality Control
          </h2>

          <p
            style={{
              marginTop: '6px',
              color: '#64748b',
              fontSize: '0.95rem'
}}
          >
            QC procedures, operational guidance, and production standards.
          </p>
        </div>

        {/* Selector idioma */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#fff',
            border: '1px solid #e2e8f0',
            padding: '10px 14px',
            borderRadius: '10px'
}}
        >
          <button
            onClick={() => setQcLanguage('en')}
            style={{
              border: qcLanguage === 'en'
                ? '2px solid #dc2626'
                : '1px solid #cbd5e1',
              backgroundColor: '#fff',
              borderRadius: '8px',
              cursor: 'pointer',
              padding: '6px 10px',
              fontSize: '1.2rem'
}}
          >
            🇺🇸
          </button>

          <button
            onClick={() => setQcLanguage('es')}
            style={{
              border: qcLanguage === 'es'
                ? '2px solid #dc2626'
                : '1px solid #cbd5e1',
              backgroundColor: '#fff',
              borderRadius: '8px',
              cursor: 'pointer',
              padding: '6px 10px',
              fontSize: '1.2rem'
}}
          >
            🇪🇸
          </button>
        </div>
      </div>

      {/* POSTS */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
}}
      >
        {qcPosts.map((post) => {

          const expanded = expandedQcCard === post.id;

          return (
            <div
              key={post.id}
              style={{
                backgroundColor: '#fff',
                border: expanded
                  ? '2px solid #dc2626'
                  : '1px solid #e2e8f0',
                borderRadius: '14px',
                overflow: 'hidden',
                boxShadow: expanded
                  ? '0 10px 30px rgba(220,38,38,0.12)'
                  : '0 2px 6px rgba(0,0,0,0.05)',
                transition: 'all 0.25s ease'
}}
            >

              {/* HEADER */}
              <div
                onClick={() =>
                  setExpandedQcCard(expanded ? null : post.id)
                }
                style={{
                  padding: '24px',
                  cursor: 'pointer',
                  backgroundColor: expanded
                    ? '#fef2f2'
                    : '#fff'
}}
              >

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '20px'
}}
                >
                  <div>

                    <h3
                      style={{
                        margin: 0,
                        fontSize: '1.35rem',
                        fontWeight: '800',
                        color: '#0f172a',
                        marginBottom: '10px'
}}
                    >
                      {qcLanguage === 'en'
                        ? post.titleEN
                        : post.titleES}
                    </h3>

                    <p
                      style={{
                        margin: 0,
                        color: '#64748b',
                        lineHeight: '1.6',
                        fontSize: '0.95rem',
                        maxWidth: '850px'
}}
                    >
                      {qcLanguage === 'en'
                        ? post.previewEN
                        : post.previewES}
                    </p>

                  </div>

                  <div
                    style={{
                      fontSize: '1.5rem',
                      color: '#dc2626',
                      fontWeight: '900'
}}
                  >
                    {expanded ? '−' : '+'}
                  </div>

                </div>
              </div>

              {/* CONTENT */}
              {expanded && (
                <div
                  style={{
                    padding: '28px',
                    borderTop: '1px solid #fee2e2',
                    backgroundColor: '#fff',
                    whiteSpace: 'pre-line',
                    lineHeight: '1.9',
                    color: '#334155',
                    fontSize: '0.97rem',
                    fontWeight: '500'
}}
                >
                  {qcLanguage === 'en'
                    ? post.contentEN
                    : post.contentES}
                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
})()}

          {/* RUN TOTAL */}
          {activeTab === 'Run Total' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <style>{`
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
                input[type=number] { -moz-appearance: textfield; }
              `}</style>

              <div style={{ border: '1px solid #cbd5e1', padding: '16px', borderRadius: '6px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#374151', fontWeight: '700' }}>
                  Production Tracking — System 1
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
                              id={`input-single-DAYS-${idx}`}
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
                              id={`input-single-NIGHTS-${idx}`}
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

          {/* PLASTIC INVENTORY */}
          {activeTab === 'Plastic Inventory' && <PlasticInventory />}

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




          {/* LABELS */}
          {activeTab === 'Labels' && (
            <LabelModule
              systemCode="S1"
              printer="system1"
              productNumber={tableData.productNumber || ''}
            />
          )}

          {/* BOXES CODE */}
          {activeTab === 'Boxes Code' && (
            <BoxesCode systemCode="S1" />
          )}

        </div>
      </div>
    </div>
  );
}

function LabelPreviewShell({ children }) {
  return (
    <div
      style={{
        backgroundColor: '#e2e8f0',
        border: '1px solid #cbd5e1',
        borderRadius: '18px',
        padding: '18px',
        boxShadow: '0 12px 30px rgba(15,23,42,0.14)'
}}
    >
      <div
        style={{
          backgroundColor: '#cbd5e1',
          color: '#111827',
          padding: '12px 16px',
          fontSize: '1.35rem',
          fontWeight: '900',
          textAlign: 'center',
          borderRadius: '12px 12px 0 0',
          border: '1px solid #94a3b8',
          borderBottom: 'none'
}}
      >
        1NICO Pallet Label
      </div>

      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #94a3b8',
          borderRadius: '0 0 12px 12px',
          padding: '18px'
}}
      >
        {children[0]}
      </div>

      {children[1]}
    </div>
  );
}

function ManualPalletPreviewLabel({
  label,
  handleChange,
  formatDateCodeInput,
  formatDateCodeTyping
}) {
  const previewSuffix = 'manual-preview-label';

  return (
    <div
      style={{
        width: '4in',
        minHeight: '8in',
        backgroundColor: '#fff',
        color: '#000',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '0.28in 0.28in',
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        overflow: 'hidden'
}}
    >
      <PreviewBarcodeRow
        label="ITEM#"
        value={label.item}
        barcodeId={`barcode-item-${previewSuffix}`}
        editable
        onChange={(value) => handleChange('item', value)}
        placeholder="Item#"
        big
      />

      <PreviewBarcodeRow
        label="QTY"
        value={label.qty}
        barcodeId={`barcode-qty-${previewSuffix}`}
        editable
        onChange={(value) => handleChange('qty', value)}
        placeholder="Qty"
      />

      <PreviewBarcodeRow
        label="LOT"
        value={label.lot}
        barcodeId={`barcode-lot-${previewSuffix}`}
        editable
        onChange={(value) => handleChange('lot', value)}
        placeholder="Lot"
        big
      />

      <PreviewBarcodeRow
        label="DATE CODE"
        value={label.dateCode}
        barcodeId={`barcode-date-${previewSuffix}`}
        editable
        onChange={(value, event) =>
          handleChange(
            'dateCode',
            formatDateCodeTyping(value, event?.nativeEvent?.inputType)
          )
        }
        onBlur={(value) => handleChange('dateCode', formatDateCodeInput(value))}
        placeholder="M/D/YYYY"
      />

      <PreviewBarcodeRow
        label="LIC#"
        value={label.lic}
        barcodeId={`barcode-lic-${previewSuffix}`}
        editable
        onChange={(value) => handleChange('lic', value)}
        placeholder="LIC#"
      />

      <PreviewBarcodeRow
        label="SITE"
        value={label.site}
        barcodeId={`barcode-site-${previewSuffix}`}
        editable
        onChange={(value) => handleChange('site', value)}
        placeholder="Site"
        small
      />

      <PreviewBarcodeRow
        label="WO"
        value={label.workOrder}
        barcodeId={`barcode-wo-${previewSuffix}`}
        editable
        onChange={(value) => handleChange('workOrder', value)}
        placeholder="Work Order"
      />
    </div>
  );
}

const attendanceThLeft = {
  padding: '12px',
  border: '1px solid #cbd5e1',
  textAlign: 'left',
  width: '70px',
  color: '#0f172a'
};

const attendanceTh = {
  padding: '12px',
  border: '1px solid #cbd5e1',
  textAlign: 'center',
  color: '#0f172a'
};

const attendanceThTime = {
  padding: '12px',
  border: '1px solid #cbd5e1',
  textAlign: 'center',
  width: '150px',
  color: '#0f172a'
};

const attendanceThAction = {
  padding: '12px',
  border: '1px solid #cbd5e1',
  textAlign: 'center',
  width: '100px',
  color: '#0f172a'
};

const attendanceTdNumber = {
  padding: '10px',
  border: '1px solid #e2e8f0',
  fontWeight: '900',
  textAlign: 'left',
  color: '#334155'
};

const attendanceTdName = {
  padding: '10px',
  border: '1px solid #e2e8f0',
  fontWeight: '800',
  color: '#334155'
};

const attendanceTdInput = {
  padding: '8px',
  border: '1px solid #e2e8f0'
};

const attendanceTdAction = {
  padding: '8px',
  border: '1px solid #e2e8f0',
  textAlign: 'center'
};

const attendanceTimeInput = {
  width: '100%',
  padding: '8px',
  textAlign: 'center',
  border: '1px solid #cbd5e1',
  borderRadius: '6px',
  outline: 'none',
  boxSizing: 'border-box'
};