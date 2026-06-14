import { useState, useEffect } from 'react';
import { UserCheck, BarChart3, Coffee } from 'lucide-react';
import { supabase } from '../lib/supabase';

const SYSTEM_NAME = 'system2';
const SYSTEM_LABEL = 'System 2';
const SYSTEM_CODE = 'S2';

export default function System2() {
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
    const saved = localStorage.getItem(`${SYSTEM_NAME}_run_total_single_state`);

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

  // BREAKS
  const [config, setConfig] = useState({
  system1: 1,
  system2: 1,
  system3: 1,
  system4: 1,
});

useEffect(() => {
  const loadBreakConfig = async () => {
    const { data, error } = await supabase
      .from('break_config')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Load break config error:', error);
      return;
    }

    setConfig({
      system1: data.system1,
      system2: data.system2,
      system3: data.system3,
      system4: data.system4,
    });
  };

  loadBreakConfig();

  const channel = supabase
    .channel(`${SYSTEM_NAME}-break-config`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'break_config' },
      loadBreakConfig
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);

  const currentBreakOption = config.system2 || 1;

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

  // ATTENDANCE
  const [attendanceRows, setAttendanceRows] = useState(() => {
    const saved = localStorage.getItem(`${SYSTEM_NAME}_attendance_rows`);
    return saved ? JSON.parse(saved) : [];
  });

  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [tempTimeIn, setTempTimeIn] = useState('');
  const [tempTimeOut, setTempTimeOut] = useState('');
  const [tempRole, setTempRole] = useState(SYSTEM_CODE);
  const [highlightedEmployeeIndex, setHighlightedEmployeeIndex] = useState(0);
  const [employeesList, setEmployeesList] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const normalizeEmployee = (employee) => ({
      id: employee.id || employee.name,
      name: String(employee.name || '')
        .trim()
        .replace(/\s+/g, ' ')
        .toUpperCase(),
      active: employee.active !== false,
    });

    const loadAttendanceEmployees = async () => {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('id, name, active')
          .eq('active', true)
          .order('name', { ascending: true });

        if (error) {
          console.error('Unable to load employees from Supabase:', error);
          return;
        }

        if (!isMounted) return;

        setEmployeesList(
          (data || [])
            .filter((employee) => employee && employee.name)
            .map(normalizeEmployee)
        );
      } catch (error) {
        console.error('Unexpected employee load error:', error);
      }
    };

    loadAttendanceEmployees();

    const channel = supabase
      .channel(`${SYSTEM_NAME}-employees-list`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'employees' },
        () => {
          loadAttendanceEmployees();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredEmployees = employeeSearch.trim()
    ? employeesList.filter((emp) =>
        emp.name.toLowerCase().includes(employeeSearch.toLowerCase())
      )
    : [];

  useEffect(() => {
    setHighlightedEmployeeIndex(0);
  }, [employeeSearch]);

  useEffect(() => {
    localStorage.setItem(
      `${SYSTEM_NAME}_attendance_rows`,
      JSON.stringify(attendanceRows)
    );
  }, [attendanceRows]);

  const normalizeAttendanceTimeValue = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';

    if (raw.includes(':')) {
      const [hourPart, minutePart = '00'] = raw.split(':');
      const hour = parseInt(hourPart.replace(/\D/g, ''), 10);
      const minute = parseInt(minutePart.replace(/\D/g, ''), 10);

      if (Number.isNaN(hour)) return raw;

      const safeHour = Math.max(0, Math.min(hour, 23));
      const safeMinute = Number.isNaN(minute)
        ? 0
        : Math.max(0, Math.min(minute, 59));

      return `${safeHour}:${String(safeMinute).padStart(2, '0')}`;
    }

    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';

    if (digits.length <= 2) {
      const hour = parseInt(digits, 10);
      if (Number.isNaN(hour)) return raw;
      return `${Math.max(0, Math.min(hour, 23))}:00`;
    }

    const hourDigits = digits.slice(0, -2);
    const minuteDigits = digits.slice(-2);
    const hour = parseInt(hourDigits, 10);
    const minute = parseInt(minuteDigits, 10);

    if (Number.isNaN(hour)) return raw;

    const safeHour = Math.max(0, Math.min(hour, 23));
    const safeMinute = Number.isNaN(minute)
      ? 0
      : Math.max(0, Math.min(minute, 59));

    return `${safeHour}:${String(safeMinute).padStart(2, '0')}`;
  };

  const selectFilteredEmployee = (employee) => {
    if (!employee?.name) return;

    setSelectedEmployee(employee.name);
    setEmployeeSearch(employee.name);
    setHighlightedEmployeeIndex(0);
    focusAttendanceField('attendance-time-in');
  };

  const focusAttendanceField = (id) => {
    setTimeout(() => {
      document.getElementById(id)?.focus();
    }, 50);
  };

  const addAttendanceRow = () => {
    if (!selectedEmployee) return;

    const finalTimeIn = normalizeAttendanceTimeValue(tempTimeIn);
    const finalTimeOut = normalizeAttendanceTimeValue(tempTimeOut);

    setAttendanceRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: selectedEmployee,
        timeIn: finalTimeIn,
        timeOut: finalTimeOut,
        role: tempRole || SYSTEM_CODE,
      },
    ]);

    setEmployeeSearch('');
    setSelectedEmployee('');
    setTempTimeIn('');
    setTempTimeOut('');
    setTempRole(SYSTEM_CODE);
    setHighlightedEmployeeIndex(0);

    focusAttendanceField('attendance-search-input');
  };

  const handleAttendanceSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();

      if (filteredEmployees.length === 0) return;

      setHighlightedEmployeeIndex((prev) =>
        prev + 1 >= filteredEmployees.length ? 0 : prev + 1
      );

      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();

      if (filteredEmployees.length === 0) return;

      setHighlightedEmployeeIndex((prev) =>
        prev - 1 < 0 ? filteredEmployees.length - 1 : prev - 1
      );

      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setEmployeeSearch('');
      setSelectedEmployee('');
      setHighlightedEmployeeIndex(0);
      return;
    }

    if (e.key !== 'Enter') return;

    e.preventDefault();

    if (selectedEmployee) {
      focusAttendanceField('attendance-time-in');
      return;
    }

    if (filteredEmployees.length > 0) {
      const match =
        filteredEmployees[highlightedEmployeeIndex] || filteredEmployees[0];

      selectFilteredEmployee(match);
    }
  };

  const moveToNextAttendanceField = (e, nextId) => {
    if (e.key !== 'Enter') return;

    e.preventDefault();

    if (nextId === 'attendance-time-out') {
      setTempTimeIn((prev) => normalizeAttendanceTimeValue(prev));
    }

    if (nextId === 'attendance-role') {
      setTempTimeOut((prev) => normalizeAttendanceTimeValue(prev));
    }

    if (nextId === 'attendance-add-button') {
      setTempTimeIn((prev) => normalizeAttendanceTimeValue(prev));
      setTempTimeOut((prev) => normalizeAttendanceTimeValue(prev));
    }

    if (nextId === 'add') {
      addAttendanceRow();
      return;
    }

    document.getElementById(nextId)?.focus();
  };

  const handleAttendanceTimeChange = (id, field, value) => {
    setAttendanceRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  const normalizeAttendanceRowTime = (id, field) => {
    setAttendanceRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? { ...row, [field]: normalizeAttendanceTimeValue(row[field]) }
          : row
      )
    );
  };

  const handleAttendanceRoleChange = (id, value) => {
    setAttendanceRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, role: value } : row
      )
    );
  };

  const deleteAttendanceRow = (id) => {
    setAttendanceRows((prev) => prev.filter((row) => row.id !== id));
  };

  const submitAttendance = async () => {
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

    const formattedRows = attendanceRows.map((row) => ({
      week_key: weekKey,
      day_name: currentDay,
      employee_name: row.name,
      time_in: normalizeAttendanceTimeValue(row.timeIn),
      time_out: normalizeAttendanceTimeValue(row.timeOut),
      role: row.role || SYSTEM_CODE,
      system: SYSTEM_CODE,
    }));

    const { error } = await supabase
      .from('attendance_records')
      .insert(formattedRows);

    if (error) {
      console.error('Submit attendance error:', error);
      alert('Unable to submit attendance.');
      return;
    }

    alert('Attendance submitted to weekly attendance.');

    setAttendanceRows([]);
    localStorage.removeItem(`${SYSTEM_NAME}_attendance_rows`);
  };

  const homeModulesInfo = [
    {
      title: 'Attendance',
      desc: 'Daily operator attendance status.',
      icon: <UserCheck size={24} />,
    },
    {
      title: 'Run Total',
      desc: 'Weekly production tracking, active weeks, totals, and weekly progress.',
      icon: <BarChart3 size={24} />,
    },
    {
      title: 'Breaks',
      desc: 'View current active break schedules assigned remotely.',
      icon: <Coffee size={24} />,
    },
  ];

  const tabs = [
    'Home',
    'Attendance',
    'Run Total',
    'Breaks',
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
              2
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: '1.45rem',
                fontWeight: '900',
              }}
            >
              System 2 Authorization
            </h1>

            <p
              style={{
                margin: '8px 0 0 0',
                color: '#94a3b8',
                fontSize: '0.9rem',
                lineHeight: '1.5',
              }}
            >
              This PC is not authorized yet. Enter the System 2 PIN once to lock this workstation to this device.
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
              placeholder="Enter System 2 PIN"
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
          <div style={{ fontWeight: '800', fontSize: '1.05rem' }}>System 2</div>
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
                  Search employee, select name, enter Time In, Time Out, Role, then press Enter on Add.
                </p>
              </div>

              <div style={{ padding: '24px' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 130px 130px 120px 100px',
                    gap: '12px',
                    marginBottom: '20px',
                    position: 'relative',
                    alignItems: 'stretch',
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
                        setHighlightedEmployeeIndex(0);
                        setSelectedEmployee('');
                      }}
                      onKeyDown={handleAttendanceSearchKeyDown}
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
                        {filteredEmployees.map((emp, index) => (
                          <div
                            key={emp.id}
                            onMouseEnter={() => setHighlightedEmployeeIndex(index)}
                            onClick={() => selectFilteredEmployee(emp)}
                            style={{
                              padding: '10px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f1f5f9',
                              backgroundColor: index === highlightedEmployeeIndex ? '#dbeafe' : '#fff',
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
                    id="attendance-time-in"
                    type="text"
                    placeholder="Time In"
                    maxLength={5}
                    value={tempTimeIn}
                    onChange={(e) => setTempTimeIn(e.target.value)}
                    onBlur={() => setTempTimeIn((prev) => normalizeAttendanceTimeValue(prev))}
                    onKeyDown={(e) => moveToNextAttendanceField(e, 'attendance-time-out')}
                    style={{
                      padding: '10px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      textAlign: 'center',
                      outline: 'none',
                      fontWeight: '700',
                      color: '#334155',
                    }}
                  />

                  <input
                    id="attendance-time-out"
                    type="text"
                    placeholder="Time Out"
                    maxLength={5}
                    value={tempTimeOut}
                    onChange={(e) => setTempTimeOut(e.target.value)}
                    onBlur={() => setTempTimeOut((prev) => normalizeAttendanceTimeValue(prev))}
                    onKeyDown={(e) => moveToNextAttendanceField(e, 'attendance-role')}
                    style={{
                      padding: '10px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      textAlign: 'center',
                      outline: 'none',
                      fontWeight: '700',
                      color: '#334155',
                    }}
                  />

                  <select
                    id="attendance-role"
                    value={tempRole}
                    onChange={(e) => setTempRole(e.target.value)}
                    onKeyDown={(e) => moveToNextAttendanceField(e, 'attendance-add-button')}
                    style={{
                      padding: '10px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      textAlign: 'center',
                      outline: 'none',
                      fontWeight: '800',
                      backgroundColor: '#fff',
                      color: '#334155',
                    }}
                  >
                    <option value="QC">QC</option>
                    <option value={SYSTEM_CODE}>{SYSTEM_CODE}</option>
                    <option value="OP">OP</option>
                  </select>

                  <button
                    id="attendance-add-button"
                    type="button"
                    onClick={addAttendanceRow}
                    onKeyDown={(e) => moveToNextAttendanceField(e, 'add')}
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
                        <th style={attendanceTh}>Employee</th>
                        <th style={attendanceThTime}>Time In</th>
                        <th style={attendanceThTime}>Time Out</th>
                        <th style={attendanceTh}>Role</th>
                        <th style={attendanceThAction}>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {attendanceRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
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
                                onBlur={() => normalizeAttendanceRowTime(row.id, 'timeIn')}
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
                                onBlur={() => normalizeAttendanceRowTime(row.id, 'timeOut')}
                                style={attendanceTimeInput}
                              />
                            </td>

                            <td style={attendanceTdInput}>
                              <select
                                value={row.role || SYSTEM_CODE}
                                onChange={(e) => handleAttendanceRoleChange(row.id, e.target.value)}
                                style={{
                                  ...attendanceTimeInput,
                                  fontWeight: '800',
                                  backgroundColor: '#fff',
                                }}
                              >
                                <option value="QC">QC</option>
                                <option value={SYSTEM_CODE}>{SYSTEM_CODE}</option>
                                <option value="OP">OP</option>
                              </select>
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
                    Names are loaded from Supabase. Role options: QC, {SYSTEM_CODE}, OP.
                  </div>

                  <button
                    onClick={submitAttendance}
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

          {activeTab === 'Run Total' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <style>{`
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
                input[type=number] { -moz-appearance: textfield; }
              `}</style>

              <div style={{ border: '1px solid #cbd5e1', padding: '16px', borderRadius: '6px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#374151', fontWeight: '700' }}>
                  Production Tracking — System 2
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

                  <div style={{ padding: '20px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>
                      3RD
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>
                      {activeSchedules.third}
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
  width: '60px',
};

const attendanceTh = {
  padding: '12px',
  border: '1px solid #cbd5e1',
  color: '#0f172a',
  textAlign: 'center',
};

const attendanceThTime = {
  ...attendanceTh,
  width: '150px',
};

const attendanceThAction = {
  ...attendanceTh,
  width: '120px',
};

const attendanceTdNumber = {
  padding: '10px',
  border: '1px solid #e2e8f0',
  textAlign: 'center',
  color: '#334155',
  fontWeight: '700',
};

const attendanceTdName = {
  padding: '10px',
  border: '1px solid #e2e8f0',
  color: '#334155',
  fontWeight: '700',
};

const attendanceTdInput = {
  padding: '6px',
  border: '1px solid #e2e8f0',
  textAlign: 'center',
};

const attendanceTdAction = {
  padding: '8px',
  border: '1px solid #e2e8f0',
  textAlign: 'center',
};

const attendanceTimeInput = {
  width: '100%',
  border: '1px solid #cbd5e1',
  borderRadius: '6px',
  padding: '7px',
  textAlign: 'center',
  outline: 'none',
  boxSizing: 'border-box',
  color: '#334155',
};
