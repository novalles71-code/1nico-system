import { useState, useEffect } from 'react';
import JsBarcode from 'jsbarcode';
import {
  ClipboardCheck,
  BarChart3,
  CalendarClock,
  Coffee,
  Newspaper,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const SYSTEM_NAME = 'system1';
const SYSTEM_LABEL = 'System 1';

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
    second: '2-digit',
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
          .eq('system_name', 'system1')
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
          is_active: true,
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
        NIGHTS: Array(7).fill(''),
      },
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

  // BREAKS
  const [config, setConfig] = useState(() => {
    const savedConfig = localStorage.getItem('break_systems_config');
    return savedConfig ? JSON.parse(savedConfig) : { system1: 1 };
  });

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'break_systems_config' && e.newValue) {
        setConfig(JSON.parse(e.newValue));
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const currentBreakOption = config.system1 || 1;

  const breakSchedules = {
    1: {
      first: '8:30 - 8:45',
      second: '12:00 - 12:30',
      third: '4:00 - 4:15',
    },
    2: {
      first: '8:50 - 9:05',
      second: '12:35 - 13:05',
      third: '4:20 - 4:35',
    },
    3: {
      first: '9:10 - 9:25',
      second: '13:10 - 13:40',
      third: '4:40 - 4:55',
    },
  };

  const activeSchedules =
    breakSchedules[currentBreakOption] || breakSchedules[1];

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
        message: 'The manufacture date cannot be in the future!',
      });
      return;
    }

    if (daysElapsed <= 80) {
      setResult({
        type: 'success',
        message: `The product is ${daysElapsed} days old, you can use it.`,
      });
    } else if (daysElapsed <= 89) {
      setResult({
        type: 'warning',
        message: `The product is ${daysElapsed} days old. It is good, you can use it but notify your supervisor, it is close to expiring.`,
      });
    } else {
      setResult({
        type: 'danger',
        message: `STOP THE MACHINES AND CALL YOUR SUPERVISOR! THE PRODUCT IS ${daysElapsed} DAYS OLD. THE CANDY IS NOT GOOD.`,
      });
    }
  };

  // ATTENDANCE
  const [attendanceRows, setAttendanceRows] = useState(() => {
    const saved = localStorage.getItem('system1_attendance_rows');
    return saved ? JSON.parse(saved) : [];
  });

  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [tempTimeIn, setTempTimeIn] = useState('');
  const [tempTimeOut, setTempTimeOut] = useState('');

  const employeesList = (() => {
    const saved = localStorage.getItem('employees_list');
    return saved ? JSON.parse(saved).filter((emp) => emp.active) : [];
  })();

  const filteredEmployees = employeeSearch.trim()
    ? employeesList.filter((emp) =>
        emp.name.toLowerCase().includes(employeeSearch.toLowerCase())
      )
    : [];

  useEffect(() => {
    localStorage.setItem(
      'system1_attendance_rows',
      JSON.stringify(attendanceRows)
    );
  }, [attendanceRows]);

  const addAttendanceRow = () => {
    if (!selectedEmployee) return;

    setAttendanceRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: selectedEmployee,
        timeIn: tempTimeIn,
        timeOut: '',
      },
    ]);

    setEmployeeSearch('');
    setSelectedEmployee('');
    setTempTimeIn('');
    setTempTimeOut('');

    setTimeout(() => {
      document.getElementById('attendance-search-input')?.focus();
    }, 50);
  };

  const handleAttendanceKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addAttendanceRow();
    }
  };

  const handleAttendanceTimeChange = (id, field, value) => {
    setAttendanceRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  const deleteAttendanceRow = (id) => {
    setAttendanceRows((prev) => prev.filter((row) => row.id !== id));
  };

  // QC
  const [expandedQcCard, setExpandedQcCard] = useState(null);
  const [qcLanguage, setQcLanguage] = useState('en');


  // LABELS
  const [labelData, setLabelData] = useState({
    shift: '1',
    job: 'A',
    qty: '',
    dateCode: '',
    labelQty: '1',
    palletQty: '1',
    startingPallet: '1',
    misc: '',
  });

  const [labelsCreated, setLabelsCreated] = useState(false);

  const shift1Jobs = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M'];
  const shift2Jobs = ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y'];

  const jobCodeMap = {
    A: '1', B: '4', C: '7', D: 'A', E: 'D', F: 'G',
    G: 'J', H: 'M', J: 'P', K: 'S', L: 'V', M: 'Y',
    N: '2', O: '5', P: '8', Q: 'B', R: 'E', S: 'H',
    T: 'K', U: 'N', V: 'Q', W: 'T', X: 'W', Y: 'Z',
  };

  const availableLabelJobs = labelData.shift === '1' ? shift1Jobs : shift2Jobs;

  const getJulianDay = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = today - start;
    return String(Math.floor(diff / 86400000)).padStart(3, '0');
  };

  const getDateParts = () => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const yy = String(today.getFullYear()).slice(-2);
    return { mm, dd, yy };
  };

  const normalizeDatePart = (part) => {
    const cleaned = String(part || '').replace(/\D/g, '');
    if (!cleaned) return '';
    return String(parseInt(cleaned, 10));
  };

  const formatDateCodeInput = (value) => {
    const raw = String(value || '').trim();
    const digits = raw.replace(/\D/g, '');

    if (!digits) return '';

    let mm = '';
    let dd = '';
    let yyyy = '';

    if (digits.length === 6) {
      mm = digits.slice(0, 2);
      dd = digits.slice(2, 4);
      yyyy = `20${digits.slice(4, 6)}`;
    } else if (digits.length === 8) {
      mm = digits.slice(0, 2);
      dd = digits.slice(2, 4);
      yyyy = digits.slice(4, 8);
    } else {
      const parts = raw.split('/').filter(Boolean);

      if (parts.length === 3) {
        mm = parts[0];
        dd = parts[1];
        yyyy = parts[2];
        if (yyyy.length === 2) yyyy = `20${yyyy}`;
      } else {
        return raw;
      }
    }

    const month = normalizeDatePart(mm);
    const day = normalizeDatePart(dd);

    if (!month || !day || yyyy.length !== 4) return raw;

    return `${month}/${day}/${yyyy}`;
  };

  const formatDateCodeTyping = (value, inputType = '') => {
    const raw = String(value || '').replace(/[^\d/]/g, '').slice(0, 10);

    // Let Backspace/Delete behave like a normal text field.
    if (String(inputType || '').startsWith('delete')) return raw;

    const digits = raw.replace(/\D/g, '').slice(0, 8);

    if (!digits) return '';
    if (digits.length < 2) return digits;
    if (digits.length === 2) return `${digits}/`;
    if (digits.length < 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    if (digits.length === 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/`;
    if (digits.length === 6) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/20${digits.slice(4, 6)}`;

    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  };

  const labelYear = getDateParts().yy;
  const labelJulian = getJulianDay();
  const labelJobCode = jobCodeMap[labelData.job] || '';
  const labelItemNumber = tableData.productNumber || '';
  const generatedLot = `MX${labelJulian}${labelYear}01${labelJobCode}`;
  const generatedSite = 'MDLZ8';
  const generatedWorkOrder = `MDLZFG${getDateParts().mm}${getDateParts().dd}${getDateParts().yy}`;
  const generatedLicBase = `${labelYear}${labelJulian}S1${labelData.shift}${labelData.job}`;

  const safeLabelQty = Math.max(parseInt(labelData.labelQty, 10) || 1, 1);
  const safePalletQty = Math.max(parseInt(labelData.palletQty, 10) || 1, 1);
  const safeStartingPallet = Math.max(parseInt(labelData.startingPallet, 10) || 1, 1);

  const generatedLabels = [];

  for (let palletIndex = 0; palletIndex < safePalletQty; palletIndex += 1) {
    const palletNumber = safeStartingPallet + palletIndex;
    const licNumber = String(palletNumber).padStart(2, '0');
    const lic = `${generatedLicBase}-${licNumber}`;

    for (let copyIndex = 0; copyIndex < safeLabelQty; copyIndex += 1) {
      generatedLabels.push({
        id: `${palletNumber}-${copyIndex + 1}`,
        palletNumber,
        copyNumber: copyIndex + 1,
        lic,
        item: labelItemNumber,
        qty: labelData.qty,
        lot: generatedLot,
        dateCode: labelData.dateCode,
        site: generatedSite,
        workOrder: generatedWorkOrder,
        misc: labelData.misc,
      });
    }
  }

  const previewLabel = generatedLabels[0];

  useEffect(() => {
    setLabelData((prev) => {
      const validJobs = prev.shift === '1' ? shift1Jobs : shift2Jobs;

      if (validJobs.includes(prev.job)) return prev;

      return {
        ...prev,
        job: prev.shift === '1' ? 'A' : 'N',
      };
    });
  }, [labelData.shift]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      document.querySelectorAll('svg[data-barcode-value]').forEach((el) => {
        const value = el.getAttribute('data-barcode-value');
        if (!value) return;

        try {
          JsBarcode(el, value, {
            format: 'CODE128',
            displayValue: false,
            height: 42,
            width: 1.45,
            margin: 0,
            marginLeft: 0,
            marginRight: 0,
          });
        } catch (error) {
          console.error('Barcode render error:', error);
        }
      });
    }, 50);

    return () => clearTimeout(timeout);
  }, [
    activeTab,
    labelItemNumber,
    labelData.qty,
    labelData.dateCode,
    labelData.labelQty,
    labelData.palletQty,
    labelData.startingPallet,
    labelData.misc,
    labelData.shift,
    labelData.job,
    generatedLot,
    generatedWorkOrder,
  ]);

  const handleLabelChange = (field, value) => {
    setLabelsCreated(false);
    setLabelData((prev) => ({ ...prev, [field]: value }));
  };

  const validateLabelData = () => {
    if (!labelItemNumber) {
      alert('Item# is empty. Enter the product number in Run Total first.');
      return null;
    }

    if (!labelData.qty.trim()) {
      alert('Enter Qty before printing labels.');
      return null;
    }

    const finalDateCode = formatDateCodeInput(labelData.dateCode);

    if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(finalDateCode)) {
      alert('Date Code must use M/D/YYYY format.');
      return null;
    }

    return finalDateCode;
  };

  const cleanZplValue = (value) =>
    String(value || '')
      .replace(/[\^~]/g, ' ')
      .trim();

  const buildZebraLabelZpl = (label) => {
    const item = cleanZplValue(label.item);
    const qty = cleanZplValue(label.qty);
    const lot = cleanZplValue(label.lot);
    const dateCode = cleanZplValue(label.dateCode);
    const lic = cleanZplValue(label.lic);
    const site = cleanZplValue(label.site);
    const workOrder = cleanZplValue(label.workOrder);

    return `^XA
^CI28
^PW812
^LL1624
^LH0,0
^MD18
^PR4
^FO70,70^A0N,30,30^FDITEM#:^FS
^FO230,45^BY2,2,70^BCN,70,N,N,N^FD${item}^FS
^FO230,122^A0N,44,44^FD${item}^FS
^FO70,250^A0N,30,30^FDQTY:^FS
^FO230,220^BY2,2,60^BCN,60,N,N,N^FD${qty}^FS
^FO230,292^A0N,44,44^FD${qty}^FS
^FO70,420^A0N,30,30^FDLOT:^FS
^FO230,390^BY2,2,70^BCN,70,N,N,N^FD${lot}^FS
^FO230,468^A0N,44,44^FD${lot}^FS
^FO70,600^A0N,28,28^FDDATE^FS
^FO70,630^A0N,28,28^FDCODE:^FS
^FO230,585^BY2,2,70^BCN,70,N,N,N^FD${dateCode}^FS
^FO230,665^A0N,44,44^FD${dateCode}^FS
^FO70,820^A0N,30,30^FDLIC#:^FS
^FO230,790^BY2,2,75^BCN,75,N,N,N^FD${lic}^FS
^FO230,875^A0N,42,42^FD${lic}^FS
^FO70,1020^A0N,30,30^FDSITE:^FS
^FO230,990^BY2,2,65^BCN,65,N,N,N^FD${site}^FS
^FO230,1065^A0N,38,38^FD${site}^FS
^FO70,1200^A0N,30,30^FDWO:^FS
^FO230,1170^BY2,2,70^BCN,70,N,N,N^FD${workOrder}^FS
^FO230,1250^A0N,38,38^FD${workOrder}^FS
^XZ`;
  };

  const printLabels = async () => {
    const finalDateCode = validateLabelData();
    if (!finalDateCode) return;

    const labelsToPrint = generatedLabels.map((label) => ({
      ...label,
      dateCode: finalDateCode,
    }));

    const zpl = labelsToPrint.map(buildZebraLabelZpl).join('\n');

    try {
      const response = await fetch('http://localhost:5050/print', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: zpl,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Unable to print labels.');
      }

      setLabelData((prev) => ({
        ...prev,
        qty: '',
        dateCode: '',
      }));

      setLabelsCreated(false);
    } catch (error) {
      console.error('Label print error:', error);
      alert(`Unable to print labels: ${error.message}`);
    }
  };

  const homeModulesInfo = [
    {
      title: 'Attendance',
      desc: 'Daily operator attendance status.',
      icon: <UserCheck size={24} />,
    },
    {
      title: 'QC',
      desc: 'Quality checks, inspections, weight verification, and compliance tracking.',
      icon: <ClipboardCheck size={24} />,
    },
    {
      title: 'Run Total',
      desc: 'Weekly production tracking, active weeks, totals, and weekly progress.',
      icon: <BarChart3 size={24} />,
    },
    {
      title: 'Exp. Calc',
      desc: 'Check if the product is within the 90-day limit from the manufacture date.',
      icon: <CalendarClock size={24} />,
    },
    {
      title: 'Breaks',
      desc: 'View current active break schedules assigned remotely.',
      icon: <Coffee size={24} />,
    },
    {
      title: 'Labels',
      desc: 'Label Format.',
      icon: <ClipboardCheck size={24} />,
    },

    {
      title: 'News',
      desc: 'Internal announcements, alerts, updates, and notifications.',
      icon: <Newspaper size={24} />,
    },
    {
      title: 'Rules',
      desc: 'Operational rules and workstation requirements.',
      icon: <ShieldCheck size={24} />,
    },
  ];

const tabs = [
  'Home',
  'Attendance',
  'QC',
  'Run Total',
  'Exp. Calc',
  'Breaks',
  'Labels',
  'News',
  'Rules',
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
          fontWeight: '700',
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
          padding: '24px',
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
            color: '#f8fafc',
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
                marginBottom: '14px',
              }}
            >
              1
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: '1.45rem',
                fontWeight: '900',
              }}
            >
              System 1 Authorization
            </h1>

            <p
              style={{
                margin: '8px 0 0 0',
                color: '#94a3b8',
                fontSize: '0.9rem',
                lineHeight: '1.5',
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
                marginBottom: '8px',
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
                marginBottom: '14px',
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
                  fontWeight: '700',
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
                cursor: 'pointer',
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
              wordBreak: 'break-all',
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
        margin: 0,
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
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
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
              fontSize: '0.9rem',
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
            flexWrap: 'wrap',
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
                whiteSpace: 'nowrap',
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
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          {/* HOME */}
          {activeTab === 'Home' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '24px',
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
                    cursor: 'pointer',
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
                      color: '#0f172a',
                    }}
                  >
                    {mod.title}
                  </h3>

                  <p
                    style={{
                      color: '#64748b',
                      fontSize: '0.9rem',
                      margin: 0,
                      lineHeight: '1.5',
                    }}
                  >
                    {mod.desc}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ATTENDANCE */}
{activeTab === 'Attendance' && (
  <div
    style={{
      border: '1px solid #cbd5e1',
      borderRadius: '12px',
      backgroundColor: '#fff',
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
    }}
  >
    <div
      style={{
        padding: '22px 24px',
        borderBottom: '1px solid #e2e8f0',
        textAlign: 'center',
        backgroundColor: '#f8fafc',
      }}
    >
      <h3 style={{ margin: 0, fontSize: '1.45rem', fontWeight: '900', color: '#1e293b' }}>
        Attendance Board
      </h3>

      <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '0.9rem', fontWeight: '500' }}>
        Search employee, enter Time In, then press Enter or Add.
      </p>
    </div>

    <div style={{ padding: '24px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 150px 100px',
          gap: '12px',
          marginBottom: '20px',
          position: 'relative',
        }}
      >
        <div style={{ position: 'relative' }}>
          <input
            id="attendance-search-input"
            type="text"
            value={employeeSearch}
            placeholder="Search employee..."
            onChange={(e) => {
              setEmployeeSearch(e.target.value);
              setSelectedEmployee('');
            }}
            onKeyDown={handleAttendanceKeyDown}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              boxSizing: 'border-box',
              fontWeight: '600',
              outline: 'none',
              color: '#334155',
            }}
          />

          {filteredEmployees.length > 0 && !selectedEmployee && (
            <div
              style={{
                position: 'absolute',
                top: '44px',
                left: 0,
                right: 0,
                backgroundColor: '#fff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                zIndex: 10,
                maxHeight: '180px',
                overflowY: 'auto',
                boxShadow: '0 6px 14px rgba(15, 23, 42, 0.12)',
              }}
            >
              {filteredEmployees.map((emp) => (
                <div
                  key={emp.id}
                  onClick={() => {
                    setSelectedEmployee(emp.name);
                    setEmployeeSearch(emp.name);
                  }}
                  style={{
                    padding: '10px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f1f5f9',
                    fontWeight: '700',
                    color: '#334155',
                  }}
                >
                  {emp.name}
                </div>
              ))}
            </div>
          )}
        </div>

        <input
          type="text"
          placeholder="Time In"
          maxLength={5}
          value={tempTimeIn}
          onChange={(e) => setTempTimeIn(e.target.value)}
          onKeyDown={handleAttendanceKeyDown}
          style={{
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            textAlign: 'center',
            outline: 'none',
          }}
        />

        <button
          onClick={addAttendanceRow}
          style={{
            backgroundColor: '#dc2626',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '800',
            cursor: 'pointer',
          }}
        >
          Add
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.95rem',
            border: '1px solid #cbd5e1',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#e2e8f0' }}>
              <th style={attendanceThLeft}>#</th>
              <th style={attendanceTh}>Staffing</th>
              <th style={attendanceThTime}>Time In</th>
              <th style={attendanceThTime}>Time Out</th>
              <th style={attendanceThAction}>Action</th>
            </tr>
          </thead>

          <tbody>
            {attendanceRows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: '#94a3b8',
                    border: '1px solid #e2e8f0',
                    fontWeight: '600',
                  }}
                >
                  No attendance records yet.
                </td>
              </tr>
            ) : (
              attendanceRows.map((row, index) => (
                <tr key={row.id}>
                  <td style={attendanceTdNumber}>{index + 1}</td>
                  <td style={attendanceTdName}>{row.name}</td>

                  <td style={attendanceTdInput}>
                    <input
                      value={row.timeIn}
                      maxLength={5}
                      onChange={(e) =>
                        handleAttendanceTimeChange(
                          row.id,
                          'timeIn',
                          e.target.value
                        )
                      }
                      style={attendanceTimeInput}
                    />
                  </td>

                  <td style={attendanceTdInput}>
                    <input
                      value={row.timeOut}
                      maxLength={5}
                      onChange={(e) =>
                        handleAttendanceTimeChange(
                          row.id,
                          'timeOut',
                          e.target.value
                        )
                      }
                      style={attendanceTimeInput}
                    />
                  </td>

                  <td style={attendanceTdAction}>
                    <button
                      onClick={() => deleteAttendanceRow(row.id)}
                      style={{
                        backgroundColor: '#fff',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        padding: '7px 11px',
                        cursor: 'pointer',
                        fontWeight: '800',
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '18px',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            color: '#64748b',
            fontSize: '0.85rem',
            fontWeight: '500',
          }}
        >
          Names are loaded from the Employees module. Time Out can be entered later in the table.
        </div>

        <button
  onClick={() => {
    if (attendanceRows.length === 0) {
      alert('No attendance records to submit.');
      return;
    }

    const today = new Date();

    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    const currentDay = dayNames[today.getDay()];

    const getMonday = (date = new Date()) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const monday = getMonday(today);
    const weekKey = monday.toISOString().split('T')[0];
    const storageKey = `weekly_attendance_data_${weekKey}`;

    const saved = localStorage.getItem(storageKey);
    const weeklyData = saved ? JSON.parse(saved) : {};

    const formattedRows = attendanceRows.map((row) => ({
      name: row.name,
      timeIn: row.timeIn,
      timeOut: row.timeOut,
      system: 'S1',
    }));

    weeklyData[currentDay] = [
      ...(weeklyData[currentDay] || []),
      ...formattedRows,
    ];

    localStorage.setItem(storageKey, JSON.stringify(weeklyData));

    alert('Attendance submitted to weekly attendance.');

    setAttendanceRows([]);
  }}
  style={{
    backgroundColor: '#22c55e',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '11px 20px',
    fontWeight: '900',
    cursor: 'pointer',
  }}
>
  Submit Attendance
</button>
      </div>
    </div>
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
      `,
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '22px',
      }}
    >

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '1.8rem',
              fontWeight: '800',
              color: '#0f172a',
            }}
          >
            Quality Control
          </h2>

          <p
            style={{
              marginTop: '6px',
              color: '#64748b',
              fontSize: '0.95rem',
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
            borderRadius: '10px',
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
              fontSize: '1.2rem',
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
              fontSize: '1.2rem',
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
          gap: '18px',
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
                transition: 'all 0.25s ease',
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
                    : '#fff',
                }}
              >

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '20px',
                  }}
                >
                  <div>

                    <h3
                      style={{
                        margin: 0,
                        fontSize: '1.35rem',
                        fontWeight: '800',
                        color: '#0f172a',
                        marginBottom: '10px',
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
                        maxWidth: '850px',
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
                      fontWeight: '900',
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
                    fontWeight: '500',
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
                        textAlign: 'center',
                      }}
                    >
                      {result.message}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* BREAKS */}
          {activeTab === 'Breaks' && (
            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: '1', minWidth: '320px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#334155' }}>
                    Break Schedule Card
                  </h3>

                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                    Schedule based on the selected break shift number (Active Shift: {currentBreakOption})
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>
                      1ST
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>
                      {activeSchedules.first}
                    </div>
                  </div>

                  <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>
                      2ND
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>
                      {activeSchedules.second}
                    </div>
                  </div>

                  <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>
                      3RD
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>
                      {activeSchedules.third}
                    </div>
                  </div>
                </div>

                <div style={{ padding: '12px 20px', backgroundColor: '#fef9c3', borderTop: '1px solid #fef08a', color: '#713f12', fontSize: '0.85rem', fontWeight: '500' }}>
                  Break times may change during the day.
                </div>
              </div>
            </div>
          )}

          {/* LABELS */}
          {activeTab === 'Labels' && (
            <div>
              <style>{`
                .labels-screen-wrap {
                  display: grid;
                  grid-template-columns: 1fr;
                  gap: 18px;
                }

                .print-only-labels {
                  display: none;
                }

                @media print {
                  body * {
                    visibility: hidden !important;
                  }

                  #labels-print-area,
                  #labels-print-area * {
                    visibility: visible !important;
                  }

                  #labels-print-area {
                    display: block !important;
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 4in;
                    background: #fff;
                  }

                  .screen-label-workspace {
                    display: none !important;
                  }

                  .label-print-page {
                    width: 4in !important;
                    height: 8in !important;
                    page-break-after: always;
                    break-after: page;
                    border: none !important;
                    border-radius: 0 !important;
                    box-shadow: none !important;
                    margin: 0 !important;
                  }

                  @page {
                    size: 4in 8in;
                    margin: 0;
                  }
                }
              `}</style>

              <div className="screen-label-workspace labels-screen-wrap">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    gap: '24px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div
                    style={{
                      width: '360px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '16px',
                      boxShadow: '0 10px 24px rgba(15,23,42,0.08)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: '#e5e7eb',
                        color: '#111827',
                        padding: '14px 18px',
                        fontSize: '1.05rem',
                        fontWeight: '900',
                        borderBottom: '1px solid #cbd5e1',
                      }}
                    >
                      Label Setup
                    </div>

                    <div style={{ padding: '18px', display: 'grid', gap: '14px' }}>
                      <CompactLabelControl label="Shift">
                        <select
                          value={labelData.shift}
                          onChange={(e) => handleLabelChange('shift', e.target.value)}
                          style={compactLabelInput}
                        >
                          <option value="1">Shift 1</option>
                          <option value="2">Shift 2</option>
                        </select>
                      </CompactLabelControl>

                      <CompactLabelControl label="Job">
                        <select
                          value={labelData.job}
                          onChange={(e) => handleLabelChange('job', e.target.value)}
                          style={compactLabelInput}
                        >
                          {availableLabelJobs.map((job) => (
                            <option key={job} value={job}>Job {job}</option>
                          ))}
                        </select>
                      </CompactLabelControl>

                      <CompactLabelControl label="Label Qty">
                        <input
                          type="number"
                          min="1"
                          value={labelData.labelQty}
                          onChange={(e) => handleLabelChange('labelQty', e.target.value)}
                          style={compactLabelInput}
                        />
                      </CompactLabelControl>

                      <CompactLabelControl label="Pallet Qty">
                        <input
                          type="number"
                          min="1"
                          value={labelData.palletQty}
                          onChange={(e) => handleLabelChange('palletQty', e.target.value)}
                          style={compactLabelInput}
                        />
                      </CompactLabelControl>

                      <CompactLabelControl label="Starting Pallet #">
                        <input
                          type="number"
                          min="1"
                          value={labelData.startingPallet}
                          onChange={(e) => handleLabelChange('startingPallet', e.target.value)}
                          style={compactLabelInput}
                        />
                      </CompactLabelControl>
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: '#e2e8f0',
                      border: '1px solid #cbd5e1',
                      borderRadius: '18px',
                      padding: '18px',
                      boxShadow: '0 12px 30px rgba(15,23,42,0.14)',
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
                        borderBottom: 'none',
                      }}
                    >
                      1NICO Pallet Label
                    </div>

                    <div
                      style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #94a3b8',
                        borderRadius: '0 0 12px 12px',
                        padding: '18px',
                      }}
                    >
                      <EditablePalletPreviewLabel
                        label={previewLabel}
                        labelData={labelData}
                        handleLabelChange={handleLabelChange}
                        formatDateCodeInput={formatDateCodeInput}
                        formatDateCodeTyping={formatDateCodeTyping}
                      />
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        marginTop: '16px',
                      }}
                    >
                      <button onClick={printLabels} style={labelButtonRed}>
                        Print
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div id="labels-print-area" className="print-only-labels">
                {generatedLabels.map((label) => (
                  <PalletPrintLabel key={`${label.palletNumber}-${label.copyNumber}`} label={label} />
                ))}
              </div>
            </div>
          )}

          {/* NEWS */}
          {activeTab === 'News' && (
            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '280px' }}>
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', padding: '16px', backgroundColor: '#fff' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                    LAST UPDATE
                  </div>

                  <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#334155' }}>
                    {localStorage.getItem('global_system_news_time') || '--:--'}
                  </div>
                </div>
              </div>

              <div style={{ flex: '1', minWidth: '320px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#334155' }}>
                    System 1 News
                  </h3>

                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                    Announcements published from the control panel.
                  </p>
                </div>

                <div style={{ padding: '24px', minHeight: '260px', backgroundColor: '#fff' }}>
                  <div
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      backgroundColor: '#f8fafc',
                      padding: '20px',
                      minHeight: '190px',
                      color: '#334155',
                      fontSize: '1rem',
                      lineHeight: '1.7',
                      fontWeight: '500',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {localStorage.getItem('global_system_news')?.trim()
                      ? localStorage.getItem('global_system_news')
                      : 'No announcements available.'}
                  </div>
                </div>

                <div style={{ padding: '12px 20px', backgroundColor: '#fef9c3', borderTop: '1px solid #fef08a', color: '#713f12', fontSize: '0.85rem', fontWeight: '500' }}>
                  News may change during the day. Refresh if the latest update does not appear.
                </div>
              </div>
            </div>
          )}

          {/* RULES */}
          {activeTab === 'Rules' && (
            <div style={{ flex: '1', minWidth: '320px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#334155' }}>
                  System 1 Rules
                </h3>

                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Operational rules and workstation requirements.
                </p>
              </div>

              <div style={{ padding: '24px', backgroundColor: '#fff' }}>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                  {[
                    'Always verify product before use.',
                    'Check expiration dates before production.',
                    'Do not leave the station unattended.',
                    'Notify supervisor about any issue immediately.',
                    'Keep workstation clean during operation.',
                    'Use proper PPE at all times.',
                  ].map((rule, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '18px 20px',
                        borderBottom: index !== 5 ? '1px solid #f1f5f9' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        backgroundColor: '#fff',
                      }}
                    >
                      <div
                        style={{
                          minWidth: '30px',
                          height: '30px',
                          borderRadius: '50%',
                          backgroundColor: '#dc2626',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          fontSize: '0.9rem',
                        }}
                      >
                        {index + 1}
                      </div>

                      <div style={{ color: '#334155', fontSize: '0.97rem', fontWeight: '500' }}>
                        {rule}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding: '12px 20px', backgroundColor: '#fef2f2', borderTop: '1px solid #fecaca', color: '#991b1b', fontSize: '0.85rem', fontWeight: '500' }}>
                Failure to follow these rules may result in production issues.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function CompactLabelControl({ label, children }) {
  return (
    <label style={{ display: 'grid', gap: '6px' }}>
      <span style={{ color: '#334155', fontSize: '0.82rem', fontWeight: '900' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function EditablePalletPreviewLabel({ label, labelData, handleLabelChange, formatDateCodeInput, formatDateCodeTyping }) {
  if (!label) return null;

  const previewSuffix = 'preview-label';

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
        overflow: 'hidden',
      }}
    >
      <PreviewBarcodeRow label="ITEM#" value={label.item} barcodeId={`barcode-item-${previewSuffix}`} big />

      <PreviewBarcodeRow
        label="QTY"
        value={labelData.qty}
        barcodeId={`barcode-qty-${previewSuffix}`}
        editable
        onChange={(value) => handleLabelChange('qty', value)}
        placeholder="Qty"
      />

      <PreviewBarcodeRow label="LOT" value={label.lot} barcodeId={`barcode-lot-${previewSuffix}`} big />

      <PreviewBarcodeRow
        label="DATE CODE"
        value={labelData.dateCode}
        barcodeId={`barcode-date-${previewSuffix}`}
        editable
        onChange={(value, event) =>
          handleLabelChange(
            'dateCode',
            formatDateCodeTyping(value, event?.nativeEvent?.inputType)
          )
        }
        onBlur={(value) => handleLabelChange('dateCode', formatDateCodeInput(value))}
        placeholder="M/D/YYYY"
      />

      <PreviewBarcodeRow label="LIC#" value={label.lic} barcodeId={`barcode-lic-${previewSuffix}`} />
      <PreviewBarcodeRow label="SITE" value={label.site} barcodeId={`barcode-site-${previewSuffix}`} small />
      <PreviewBarcodeRow label="WO" value={label.workOrder} barcodeId={`barcode-wo-${previewSuffix}`} />
    </div>
  );
}

function PreviewBarcodeRow({ label, value, barcodeId, editable, onChange, onBlur, placeholder, big, small }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '0.72in 1fr',
        columnGap: '0.1in',
        alignItems: 'start',
        marginBottom: big ? '0.16in' : '0.13in',
      }}
    >
      <div
        style={{
          textAlign: 'right',
          fontSize: label === 'DATE CODE' ? '0.125in' : '0.14in',
          fontWeight: '700',
          lineHeight: '1.05',
          paddingTop: '0.17in',
        }}
      >
        {label}:
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          textAlign: 'left',
          width: '100%',
          margin: 0,
          padding: 0,
        }}
      >
        <BarcodeSvg value={value} id={barcodeId} />

        {editable ? (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value, e)}
            onBlur={(e) => onBlur?.(e.target.value)}
            placeholder={placeholder}
            style={previewEditableInput}
          />
        ) : (
          <div
            style={{
              display: 'block',
              width: 'auto',
              maxWidth: '100%',
              fontSize: big ? '0.22in' : small ? '0.16in' : '0.18in',
              fontWeight: '900',
              lineHeight: '1.05',
              marginTop: '0.02in',
              textAlign: 'left',
              marginLeft: 0,
              paddingLeft: 0,
              alignSelf: 'flex-start',
            }}
          >
            {value}
          </div>
        )}
      </div>
    </div>
  );
}


function LabelFormText({ label, children }) {
  return (
    <>
      <div
        style={{
          textAlign: 'right',
          color: '#374151',
          fontSize: '1.05rem',
          fontWeight: '800',
        }}
      >
        {label}:
      </div>
      <div>{children}</div>
    </>
  );
}

function BarcodeSvg({ value, id }) {
  return (
    <svg
      data-barcode-value={value || ''}
      id={id}
      style={{
        display: 'block',
        width: 'auto',
        maxWidth: 'none',
        height: '0.46in',
        margin: 0,
        padding: 0,
        marginLeft: 0,
        marginRight: 'auto',
        alignSelf: 'flex-start',
        textAlign: 'left',
        overflow: 'visible',
      }}
    />
  );
}

function PalletPrintLabel({ label, preview }) {
  const barcodeSuffix = `${label.lic}-${label.copyNumber}`.replace(/[^a-zA-Z0-9]/g, '');

  return (
    <div
      className="label-print-page"
      style={{
        width: preview ? '100%' : '4in',
        maxWidth: preview ? '4in' : 'none',
        height: preview ? '8in' : '8in',
        backgroundColor: '#fff',
        color: '#000',
        border: preview ? '1px solid #cbd5e1' : 'none',
        borderRadius: preview ? '14px' : '0',
        padding: '0.28in 0.28in',
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        overflow: 'hidden',
        boxShadow: preview ? '0 10px 24px rgba(15,23,42,0.12)' : 'none',
      }}
    >
      <LabelBarcodeRow label="ITEM#" value={label.item} barcodeId={`barcode-item-${barcodeSuffix}`} big />
      <LabelBarcodeRow label="QTY" value={label.qty} barcodeId={`barcode-qty-${barcodeSuffix}`} />
      <LabelBarcodeRow label="LOT" value={label.lot} barcodeId={`barcode-lot-${barcodeSuffix}`} big />
      <LabelBarcodeRow label="DATE CODE" value={label.dateCode} barcodeId={`barcode-date-${barcodeSuffix}`} />
      <LabelBarcodeRow label="LIC#" value={label.lic} barcodeId={`barcode-lic-${barcodeSuffix}`} />
      <LabelBarcodeRow label="SITE" value={label.site} barcodeId={`barcode-site-${barcodeSuffix}`} small />
      <LabelBarcodeRow label="WO" value={label.workOrder} barcodeId={`barcode-wo-${barcodeSuffix}`} />
    </div>
  );
}

function LabelBarcodeRow({ label, value, barcodeId, big, small }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '0.72in 1fr',
        columnGap: '0.1in',
        alignItems: 'start',
        marginBottom: big ? '0.16in' : '0.13in',
      }}
    >
      <div
        style={{
          textAlign: 'right',
          fontSize: label === 'DATE CODE' ? '0.125in' : '0.14in',
          fontWeight: '700',
          lineHeight: '1.05',
          paddingTop: '0.17in',
        }}
      >
        {label}:
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          textAlign: 'left',
          width: '100%',
          margin: 0,
          padding: 0,
        }}
      >
        <BarcodeSvg value={value} id={barcodeId} />
        <div
          style={{
            display: 'block',
            width: 'auto',
            maxWidth: '100%',
            fontSize: big ? '0.22in' : small ? '0.16in' : '0.18in',
            fontWeight: '900',
            lineHeight: '1.05',
            marginTop: '0.02in',
            textAlign: 'left',
            marginLeft: 0,
            paddingLeft: 0,
            alignSelf: 'flex-start',
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

const compactLabelInput = {
  width: '100%',
  height: '38px',
  border: '1px solid #94a3b8',
  borderRadius: '8px',
  padding: '6px 10px',
  color: '#0f172a',
  backgroundColor: '#fff',
  fontSize: '0.95rem',
  fontWeight: '800',
  outline: 'none',
  boxSizing: 'border-box',
};

const previewEditableInput = {
  width: '2.65in',
  maxWidth: '100%',
  border: '1px solid #9ca3af',
  borderRadius: '4px',
  padding: '0.04in 0.06in',
  boxSizing: 'border-box',
  color: '#000',
  backgroundColor: '#fff',
  fontSize: '0.18in',
  fontWeight: '900',
  outline: 'none',
  textAlign: 'left',
  marginTop: '0.02in',
};

const labelButtonRed = {
  backgroundColor: '#dc2626',
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  padding: '12px 22px',
  fontWeight: '900',
  cursor: 'pointer',
  boxShadow: '0 6px 14px rgba(220,38,38,0.18)',
};

const labelButtonGray = {
  backgroundColor: '#334155',
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  padding: '12px 22px',
  fontWeight: '900',
  cursor: 'pointer',
  boxShadow: '0 6px 14px rgba(51,65,85,0.18)',
};

const palletLabelInput = {
  width: '230px',
  maxWidth: '100%',
  height: '36px',
  border: '2px solid #9ca3af',
  borderRadius: '2px',
  padding: '4px 8px',
  boxSizing: 'border-box',
  color: '#111827',
  backgroundColor: '#fff',
  fontSize: '1rem',
  fontWeight: '700',
  outline: 'none',
};

const palletLabelReadOnlyInput = {
  ...palletLabelInput,
  backgroundColor: '#e5e7eb',
  color: '#374151',
  cursor: 'not-allowed',
};

const labelIconButton = {
  width: '76px',
  height: '58px',
  border: '2px solid #6b7280',
  backgroundColor: '#e5e7eb',
  color: '#111827',
  borderRadius: '4px',
  fontSize: '1.5rem',
  fontWeight: '900',
  cursor: 'pointer',
  boxShadow: 'inset -2px -2px 0 rgba(0,0,0,0.12)',
};

const attendanceThLeft = {
  padding: '12px',
  border: '1px solid #cbd5e1',
  textAlign: 'left',
  width: '70px',
  color: '#0f172a',
};

const attendanceTh = {
  padding: '12px',
  border: '1px solid #cbd5e1',
  textAlign: 'center',
  color: '#0f172a',
};

const attendanceThTime = {
  padding: '12px',
  border: '1px solid #cbd5e1',
  textAlign: 'center',
  width: '150px',
  color: '#0f172a',
};

const attendanceThAction = {
  padding: '12px',
  border: '1px solid #cbd5e1',
  textAlign: 'center',
  width: '100px',
  color: '#0f172a',
};

const attendanceTdNumber = {
  padding: '10px',
  border: '1px solid #e2e8f0',
  fontWeight: '900',
  textAlign: 'left',
  color: '#334155',
};

const attendanceTdName = {
  padding: '10px',
  border: '1px solid #e2e8f0',
  fontWeight: '800',
  color: '#334155',
};

const attendanceTdInput = {
  padding: '8px',
  border: '1px solid #e2e8f0',
};

const attendanceTdAction = {
  padding: '8px',
  border: '1px solid #e2e8f0',
  textAlign: 'center',
};

const attendanceTimeInput = {
  width: '100%',
  padding: '8px',
  textAlign: 'center',
  border: '1px solid #cbd5e1',
  borderRadius: '6px',
  outline: 'none',
  boxSizing: 'border-box',
};