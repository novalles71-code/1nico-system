import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from '../lib/supabase';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const ORDERED_EMPLOYEES = [
  'JOAN ENMANUEL DE LA CRUZ YNOA',
  'SUZAN I NAYOAN',
  'RANDY DE JESUS MIRABAK SANTOS',
  'ODALIS DE LEON',
  'ESMERALDA EAGLE JIMENEZ',
  'IRMA PINEDA',
  'JORDY VALENZUELA SMITH',
  'TIFFANY GARCIA',
  'JAVIER ADOLFO MOREIRA GARCES',
  'MARIA MATOS',
  '',
  'OPERATORS',
  'ALEJANDRA RANGEL',
  'CARMEN ESPINAL RODRIGUEZ',
  'CESAR O MOLINA MORALES',
  'ROBELINA JIMENEZ JIMENEZ',
  'RADHAMELIS PEREZ',
  'YENY M SOSA',
  'NICOL ROSARIO DE LEON',
  'SAUDIK P FERREIRA MEDRANO',
  '',
  'SUPPORT TEAM',
  'MANUEL DOLORES VILLA GONZALEZ',
  'EFRAIN RIVERA FIGUEROA',
  '',
  'JOSE RAMON MARTE PENA',
  'JERSON JOSUE HEERRERA VASQUEZ',
  'MIGUEL CEDENO AQUINO',
  'BRUNO GABRIEL OLIVO SUNTAXI',
  'MARTIN PEREZ OSVALDO',
  'VICTOR GRACIANO',
  'ALBERTO HERNANDEZ',
  'ROMALDO PAGUAY',
  'ARMANDO RAFAEL SIERRA MORENO',
  'LUIS A DE LA ROSA',
  'RAMON ANTONIO BRETON LARA',
  'JONATHAN HERNANDEZ ANGELES',
  'DARLYN DE JESUS ALMANZAR ANGELES',
  'ALBERTO RODRIGUEZ GONZALEZ',
  'MARVIN MALDONADO',
  'LUIS ARAMIS LOPEZ GARICA',
  'ANGEL RAFAEL NIEVES VASQUEZ',
  'BRYAN JOSE MARTE BATISTA',
  'ELIE FELIZ',
  '',
  'ALBA LUZ ROMERO LAINEZ',
  'FILOMENA POMAQUISA',
  'LIGIA ELANA CHILLAGANA',
  'LILIANA PATRICIA TAVAREZ',
  'MIRLANDE NOZIL',
  'ROSSY VALERIO CONTRERAS',
  'PATRICIA HUARI AMAO',
  'SANDRA JANETH OZORIO',
  'VINELLA LAURA',
  'YENNY ROCIO SILVA',
  'SURIEL AMAYA',
  'DOMINGA ALTAGRACIA JAQUEZ',
  'JESSICA TORRES MILLA',
  'MARIA J CONTRERAS RODRIGUEZ',
  'YOLANDA AYALA GARCIA',
  'ANASTACIA SAVEDRA',
  'JENNY MINE',
  'EVA DOMINGUEZ',
  'JOSIANE ST. FLEUR',
  'SARA POLANCO',
  'DELFINA RODRIGUEZ CISNEROS',
  'MARIA ORTEGA O.',
  'MARIELA FRANCO',
  'JESSICA LIZETTE SARAVIA',
  'LUZ ALCANTARA',
  'VIVIANA GABRIUS',
  'MARCIA M. LOPEZ',
  '',
  'BUILDING 8',
  '',
  'NOEL OVALLES YNOA',
  '',
  'SYSTEM 1',
  'JOHAN STIVEN GUZMAN OVALLES',
  'LOURDES ESTEFANIA ORTIZ',
  'ROCIO BEATRIZ VACACELA ORTIZ',
  'ELIDA VENTURA',
  'LESBY PAOLA DIAZ CASTILLO',
  'VIVICA GARCIA',
  'ALEXANDRO MEJIA',
  'CARLOS GUZMAN',
  '',
  'SYSTEM 4',
  'DIEGO FERNANDO ASMEL MATUTE',
  'AUSTRIA ALVAREZ',
  'OLGA RODRIGUEZ',
  'DORIS RAMOS',
  'RENE DAVID TERRON PADILLA',
  'YOAN RODRIGUEZ',
  'ERNSO JACQUES',
  'LOREN FELIZ',
  '',
  'DRIVERS',
  'EDGAR DIAZ',
  'JESUS DONALDO RAMOS DIAZ',
  'ELVIS MINIER FLETE',
  'LETICIA ESMERALDA (SCANNER)',
  'WILREDO HERRERA PINEDA',
  'JOSE FERNANDO RAMOS',
  'BRIAN PINEDA',
  'STALIN TOAPANTA',
  'CARLOS DIAZ',
];

const SECTION_NAMES = [
  'OPERATORS',
  'SUPPORT TEAM',
  'BUILDING 8',
  'SYSTEM 1',
  'SYSTEM 4',
  'DRIVERS',
];

function normalizeName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').toUpperCase();
}

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
    weekKey: monday.toISOString().split('T')[0],
    weekLabel: `${formatDate(monday)} to ${formatDate(sunday)}`,
  };
}

function getWeekInfoFromKey(key) {
  const [year, month, day] = String(key || '').split('-').map(Number);
  const monday = new Date(year, month - 1, day);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    monday,
    weekKey: key,
    weekLabel: `${formatDate(monday)} to ${formatDate(sunday)}`,
  };
}

export default function Attendance() {
  const navigate = useNavigate();
  const currentWeek = getWeekInfo();
  const [selectedWeekKey, setSelectedWeekKey] = useState(currentWeek.weekKey);
  const selectedWeek = getWeekInfoFromKey(selectedWeekKey);
  const { monday, weekKey, weekLabel } = selectedWeek;
  const [availableWeeks, setAvailableWeeks] = useState([currentWeek.weekKey]);
  const [weeklyData, setWeeklyData] = useState({});
  const [loadingAttendance, setLoadingAttendance] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadAvailableWeeks = async () => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('week_key')
        .order('week_key', { ascending: false });

      if (error) {
        console.error('Load available weeks error:', error);
        return;
      }

      if (!isMounted) return;

      const uniqueWeeks = Array.from(
        new Set([currentWeek.weekKey, ...(data || []).map((record) => record.week_key).filter(Boolean)])
      );

      setAvailableWeeks(uniqueWeeks);

      if (!uniqueWeeks.includes(selectedWeekKey)) {
        setSelectedWeekKey(uniqueWeeks[0] || currentWeek.weekKey);
      }
    };

    loadAvailableWeeks();

    const channel = supabase
      .channel('attendance-weeks-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_records' },
        () => {
          loadAvailableWeeks();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [currentWeek.weekKey, selectedWeekKey]);

  useEffect(() => {
    let isMounted = true;

    const loadWeeklyAttendance = async () => {
      setLoadingAttendance(true);

      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('week_key', weekKey)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Load weekly attendance error:', error);
        alert('Unable to load weekly attendance.');
        setLoadingAttendance(false);
        return;
      }

      if (!isMounted) return;

      const nextWeeklyData = {};

      (data || []).forEach((record) => {
        const dayName = record.day_name;

        if (!nextWeeklyData[dayName]) {
          nextWeeklyData[dayName] = [];
        }

        nextWeeklyData[dayName].push({
          id: record.id,
          name: record.employee_name,
          timeIn: record.time_in || '',
          timeOut: record.time_out || '',
          role: record.role || record.system || '',
          system: record.system || 'S1',
        });
      });

      setWeeklyData(nextWeeklyData);
      setLoadingAttendance(false);
    };

    loadWeeklyAttendance();

    const channel = supabase
      .channel(`attendance-records-${weekKey}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_records' },
        () => {
          loadWeeklyAttendance();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [weekKey]);

  const getDayDate = (index) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + index);
    return formatDate(d);
  };

  const employeeRows = useMemo(() => {
    const submittedNames = Object.values(weeklyData)
      .flat()
      .map((record) => record?.name)
      .filter(Boolean);

    const orderedNames = [...ORDERED_EMPLOYEES];

    submittedNames.forEach((name) => {
      const normalized = normalizeName(name);
      const alreadyExists = orderedNames.some(
        (orderedName) => normalizeName(orderedName) === normalized
      );

      if (!alreadyExists) {
        orderedNames.push(name);
      }
    });

    return orderedNames.map((name) => {
      if (!name) return { type: 'space' };

      const isSection = SECTION_NAMES.includes(name);
      const days = {};

      DAYS.forEach((day) => {
        const records = weeklyData[day] || [];

        const record = [...records]
          .reverse()
          .find((r) => normalizeName(r.name) === normalizeName(name));

        if (record) {
          days[day] = {
            id: record.id,
            timeIn: record.timeIn || '',
            timeOut: record.timeOut || '',
            area: record.role || record.system || '',
            system: record.system || '',
          };
        }
      });

      return {
        type: isSection ? 'section' : 'employee',
        name,
        days,
      };
    });
  }, [weeklyData]);

  const hasWorked = (person) => {
    if (person.type !== 'employee') return false;

    return DAYS.some((day) => {
      const record = person.days?.[day];
      return Boolean(record?.timeIn || record?.timeOut || record?.area);
    });
  };

  const updateLocalAttendanceCell = (day, recordId, field, value) => {
    setWeeklyData((prev) => {
      const dayRecords = prev[day] || [];

      const updatedDayRecords = dayRecords.map((record) => {
        if (record.id !== recordId) return record;

        if (field === 'timeIn') {
          return { ...record, timeIn: value };
        }

        if (field === 'timeOut') {
          return { ...record, timeOut: value };
        }

        return { ...record, role: value };
      });

      return {
        ...prev,
        [day]: updatedDayRecords,
      };
    });
  };

  const removeLocalAttendanceRecord = (day, recordId) => {
    setWeeklyData((prev) => {
      const dayRecords = prev[day] || [];

      return {
        ...prev,
        [day]: dayRecords.filter((record) => record.id !== recordId),
      };
    });
  };

  const saveAttendanceCellEdit = async (person, day, field, value) => {
    const record = person.days?.[day];
    const cleanValue = String(value || '').trim().toUpperCase();

    const getSystemFromValue = (valueToCheck) => {
      const normalized = String(valueToCheck || '').trim().toUpperCase();
      return ['S1', 'S2', 'S3', 'S4'].includes(normalized) ? normalized : '';
    };

    const getFallbackSystem = () => {
      if (field === 'area') {
        const systemFromArea = getSystemFromValue(cleanValue);
        if (systemFromArea) return systemFromArea;
      }

      if (record?.system) return record.system;

      for (const dayName of DAYS) {
        const existingSystem = person.days?.[dayName]?.system;
        if (existingSystem) return existingSystem;
      }

      return 'S1';
    };

    const fallbackSystem = getFallbackSystem();

    const nextRecord = {
      id: record?.id || null,
      timeIn: record?.timeIn || '',
      timeOut: record?.timeOut || '',
      area: record?.area || '',
      system: record?.system || fallbackSystem,
      [field]: cleanValue,
    };

    const shouldDelete =
      record?.id &&
      !String(nextRecord.timeIn || '').trim() &&
      !String(nextRecord.timeOut || '').trim() &&
      !String(nextRecord.area || '').trim();

    if (shouldDelete) {
      const { error } = await supabase
        .from('attendance_records')
        .delete()
        .eq('id', record.id);

      if (error) {
        console.error('Delete attendance record error:', error);
        alert('Unable to delete attendance record.');
        return;
      }

      removeLocalAttendanceRecord(day, record.id);
      return;
    }

    if (!record?.id) {
      const roleValue = field === 'area' ? cleanValue || fallbackSystem : fallbackSystem;
      const systemValue = getSystemFromValue(roleValue) || fallbackSystem;

      const { data, error } = await supabase
        .from('attendance_records')
        .insert({
          week_key: weekKey,
          day_name: day,
          employee_name: person.name,
          time_in: field === 'timeIn' ? cleanValue || null : null,
          time_out: field === 'timeOut' ? cleanValue || null : null,
          role: roleValue,
          system: systemValue,
        })
        .select()
        .single();

      if (error) {
        console.error('Create attendance record error:', error);
        alert('Unable to create attendance record.');
        return;
      }

      setWeeklyData((prev) => ({
        ...prev,
        [day]: [
          ...(prev[day] || []),
          {
            id: data.id,
            name: data.employee_name,
            timeIn: data.time_in || '',
            timeOut: data.time_out || '',
            role: data.role || data.system || '',
            system: data.system || systemValue,
          },
        ],
      }));

      return;
    }

    const updatePayload = {};

    if (field === 'timeIn') {
      updatePayload.time_in = cleanValue || null;
    } else if (field === 'timeOut') {
      updatePayload.time_out = cleanValue || null;
    } else {
      const systemValue = getSystemFromValue(cleanValue) || record.system || fallbackSystem;
      updatePayload.role = cleanValue || null;
      updatePayload.system = systemValue;
    }

    const { error } = await supabase
      .from('attendance_records')
      .update(updatePayload)
      .eq('id', record.id);

    if (error) {
      console.error('Update attendance record error:', error);
      alert('Unable to update attendance record.');
      return;
    }

    updateLocalAttendanceCell(day, record.id, field, cleanValue);
  };

  const handleEditableCellKeyDown = (event, person, day, field) => {
    if (event.key !== 'Enter') return;

    event.preventDefault();
    event.currentTarget.blur();
    saveAttendanceCellEdit(person, day, field, event.currentTarget.value);
  };

  const downloadExcel = async () => {
    const workedRows = employeeRows.filter(hasWorked);

    if (workedRows.length === 0) {
      alert('No attendance records to download.');
      return;
    }

    const systemOrder = ['S1', 'S2', 'S3', 'S4'];

    const getBaseSystem = (person) => {
      const mondayRecord = person.days?.Monday;

      if (mondayRecord?.system) {
        return mondayRecord.system;
      }

      for (const day of DAYS) {
        const record = person.days?.[day];

        if (record?.system) {
          return record.system;
        }
      }

      return 'S4';
    };

    const orderedWorkedRows = [...workedRows].sort((a, b) => {
      const aSystemIndex = systemOrder.indexOf(getBaseSystem(a));
      const bSystemIndex = systemOrder.indexOf(getBaseSystem(b));

      const safeAIndex = aSystemIndex === -1 ? 99 : aSystemIndex;
      const safeBIndex = bSystemIndex === -1 ? 99 : bSystemIndex;

      if (safeAIndex !== safeBIndex) return safeAIndex - safeBIndex;

      return String(a.name || '').localeCompare(String(b.name || ''));
    });

    const workbook = new ExcelJS.Workbook();

    const worksheet = workbook.addWorksheet('Attendance', {
      pageSetup: {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.2,
          right: 0.2,
          top: 0.25,
          bottom: 0.25,
          header: 0.1,
          footer: 0.1,
        },
      },
    });

    worksheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 2 }];

    worksheet.getColumn(1).width = 34;

    for (let col = 2; col <= 22; col += 1) {
      worksheet.getColumn(col).width = 7.5;
    }

    const borderStyle = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'medium', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'medium', color: { argb: 'FF000000' } },
    };

    const thinBorderStyle = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };

    const center = {
      vertical: 'middle',
      horizontal: 'center',
    };

    worksheet.getCell('A1').value = 'Employee';
    worksheet.getCell('A1').font = { name: 'Calibri', size: 11, bold: true };
    worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };
    worksheet.getCell('A1').border = borderStyle;

    worksheet.getCell('A2').value = '';
    worksheet.getCell('A2').border = borderStyle;

    DAYS.forEach((day, index) => {
      const startCol = 2 + index * 3;
      const endCol = startCol + 2;

      worksheet.mergeCells(1, startCol, 1, endCol);
      worksheet.mergeCells(2, startCol, 2, endCol);

      const dayCell = worksheet.getCell(1, startCol);
      dayCell.value = day;
      dayCell.font = { name: 'Calibri', size: 11, bold: true };
      dayCell.alignment = center;
      dayCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF92D050' },
      };

      const dateCell = worksheet.getCell(2, startCol);
      dateCell.value = getDayDate(index);
      dateCell.font = { name: 'Calibri', size: 11, bold: true, italic: true };
      dateCell.alignment = center;
      dateCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF92D050' },
      };

      for (let col = startCol; col <= endCol; col += 1) {
        worksheet.getCell(1, col).border = borderStyle;
        worksheet.getCell(2, col).border = borderStyle;
        worksheet.getCell(1, col).alignment = center;
        worksheet.getCell(2, col).alignment = center;
      }
    });

    let currentRow = 3;
    let previousSystem = null;

    orderedWorkedRows.forEach((person) => {
      const currentSystem = getBaseSystem(person);

      if (previousSystem && previousSystem !== currentSystem) {
        const spacerRow = worksheet.getRow(currentRow);

        for (let col = 1; col <= 22; col += 1) {
          const cell = spacerRow.getCell(col);
          cell.value = '';
          cell.border = thinBorderStyle;
        }

        spacerRow.height = 12;
        currentRow += 1;
      }

      previousSystem = currentSystem;

      const row = worksheet.getRow(currentRow);

      row.getCell(1).value = person.name;
      row.getCell(1).font = { name: 'Calibri', size: 11, bold: true };
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

      DAYS.forEach((day, dayIndex) => {
        const record = person.days?.[day];
        const startCol = 2 + dayIndex * 3;

        row.getCell(startCol).value = record?.timeIn || '';
        row.getCell(startCol + 1).value = record?.timeOut || '';
        row.getCell(startCol + 2).value = record?.area || '';

        if (record?.timeIn || record?.timeOut || record?.area) {
          row.getCell(startCol).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFDDEBF7' },
          };

          row.getCell(startCol + 1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFDDEBF7' },
          };

          row.getCell(startCol + 2).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFDDEBF7' },
          };
        }

        row.getCell(startCol).alignment = center;
        row.getCell(startCol + 1).alignment = center;
        row.getCell(startCol + 2).alignment = center;

        row.getCell(startCol).font = { name: 'Calibri', size: 11, bold: true };
        row.getCell(startCol + 1).font = { name: 'Calibri', size: 11, bold: true };
        row.getCell(startCol + 2).font = { name: 'Calibri', size: 11, bold: true };
      });

      for (let col = 1; col <= 22; col += 1) {
        row.getCell(col).border = borderStyle;
      }

      row.height = 20;
      currentRow += 1;
    });

    worksheet.eachRow((row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = cell.border || borderStyle;
        cell.font = {
          name: cell.font?.name || 'Calibri',
          size: cell.font?.size || 11,
          bold: true,
          italic: cell.font?.italic || false,
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    saveAs(
      new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      `weekly-attendance-${weekKey}.xlsx`
    );

    const { error: deleteError } = await supabase
      .from('attendance_records')
      .delete()
      .eq('week_key', weekKey);

    if (deleteError) {
      console.error('Unable to clear weekly attendance:', deleteError);
      alert('Excel downloaded, but weekly attendance was not cleared.');
      return;
    }

    setWeeklyData({});
    setAvailableWeeks((prev) => {
      const nextWeeks = prev.filter((key) => key !== weekKey);
      return nextWeeks.length > 0 ? nextWeeks : [currentWeek.weekKey];
    });
    if (weekKey !== currentWeek.weekKey) {
      setSelectedWeekKey(currentWeek.weekKey);
    }
  };
  const resetWeek = async () => {
    const confirmReset = confirm(
      'Download the Excel file before resetting. Reset this weekly attendance?'
    );

    if (!confirmReset) return;

    const { error } = await supabase
      .from('attendance_records')
      .delete()
      .eq('week_key', weekKey);

    if (error) {
      console.error('Reset weekly attendance error:', error);
      alert('Unable to reset weekly attendance.');
      return;
    }

    setWeeklyData({});
    setAvailableWeeks((prev) => {
      const nextWeeks = prev.filter((key) => key !== weekKey);
      return nextWeeks.length > 0 ? nextWeeks : [currentWeek.weekKey];
    });
    if (weekKey !== currentWeek.weekKey) {
      setSelectedWeekKey(currentWeek.weekKey);
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#0f172a',
        height: '100vh',
        padding: '18px',
        color: '#f8fafc',
        fontFamily: 'system-ui, sans-serif',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          maxWidth: '1900px',
          width: '100%',
          margin: '0 auto',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            gap: '12px',
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => navigate('/home')}
            style={{
              backgroundColor: '#1e293b',
              color: '#fff',
              border: '1px solid #334155',
              padding: '9px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '800',
            }}
          >
            ← Back to Dashboard
          </button>

          <div
            style={{
              color: '#94a3b8',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <span>Week:</span>

            <select
              value={selectedWeekKey}
              onChange={(e) => setSelectedWeekKey(e.target.value)}
              style={{
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '8px 10px',
                fontWeight: '800',
                outline: 'none',
              }}
            >
              {availableWeeks.map((availableWeekKey) => {
                const availableWeek = getWeekInfoFromKey(availableWeekKey);

                return (
                  <option key={availableWeekKey} value={availableWeekKey}>
                    {availableWeek.weekLabel}
                  </option>
                );
              })}
            </select>

            <span>{loadingAttendance ? ' • Loading...' : ''}</span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={downloadExcel}
              style={{
                backgroundColor: '#22c55e',
                color: '#fff',
                border: 'none',
                padding: '11px 16px',
                borderRadius: '8px',
                fontWeight: '900',
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
                padding: '11px 16px',
                borderRadius: '8px',
                fontWeight: '900',
                cursor: 'pointer',
              }}
            >
              Reset Week
            </button>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#fff',
            color: '#111827',
            border: '2px solid #000',
            overflow: 'hidden',
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              overflow: 'auto',
              flex: 1,
              minHeight: 0,
              width: '100%',
            }}
          >
            <table
              style={{
                width: '100%',
                minWidth: '1500px',
                borderCollapse: 'collapse',
                fontSize: '0.78rem',
                tableLayout: 'fixed',
              }}
            >
              <thead>
                <tr>
                  <th rowSpan={2} style={{ ...th, width: '240px', textAlign: 'left' }}>
                    Employee
                  </th>

                  {DAYS.map((day) => (
                    <th key={day} colSpan={3} style={thDay}>
                      {day}
                    </th>
                  ))}
                </tr>

                <tr>
                  {DAYS.map((day, index) => (
                    <th key={`${day}-date`} colSpan={3} style={thDate}>
                      {getDayDate(index)}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {employeeRows.map((person, index) => {
                  if (person.type === 'space') {
                    return (
                      <tr key={`space-${index}`}>
                        <td style={spaceTd} colSpan={22}></td>
                      </tr>
                    );
                  }

                  if (person.type === 'section') {
                    return (
                      <tr key={person.name}>
                        <td style={sectionTd}>{person.name}</td>

                        {DAYS.map((day) => (
                          <React.Fragment key={`${person.name}-${day}`}>
                            <td style={sectionEmptyTd}></td>
                            <td style={sectionEmptyTd}></td>
                            <td style={sectionEmptyTd}></td>
                          </React.Fragment>
                        ))}
                      </tr>
                    );
                  }

                  return (
                    <tr key={person.name}>
                      <td style={tdName}>{person.name}</td>

                      {DAYS.map((day) => {
                        const record = person.days?.[day];

                        return (
                          <React.Fragment key={`${person.name}-${day}`}>
                            <td style={tdSmall}>
                              <input
                                defaultValue={record?.timeIn || ''}
                                onKeyDown={(event) =>
                                  handleEditableCellKeyDown(event, person, day, 'timeIn')
                                }
                                style={editableCellInput}
                              />
                            </td>

                            <td style={tdSmall}>
                              <input
                                defaultValue={record?.timeOut || ''}
                                onKeyDown={(event) =>
                                  handleEditableCellKeyDown(event, person, day, 'timeOut')
                                }
                                style={editableCellInput}
                              />
                            </td>

                            <td style={tdSmall}>
                              <input
                                defaultValue={record?.area || ''}
                                onKeyDown={(event) =>
                                  handleEditableCellKeyDown(event, person, day, 'area')
                                }
                                style={editableCellInput}
                              />
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const blackBorder = '1px solid #000';

const th = {
  border: blackBorder,
  padding: '6px 5px',
  backgroundColor: '#f8fafc',
  color: '#111827',
  fontWeight: '800',
  textAlign: 'center',
  whiteSpace: 'nowrap',
};

const thDay = {
  ...th,
  backgroundColor: '#92d050',
  fontSize: '0.8rem',
};

const thDate = {
  ...th,
  backgroundColor: '#92d050',
  fontSize: '0.72rem',
  fontStyle: 'italic',
};

const tdName = {
  border: blackBorder,
  padding: '5px 7px',
  color: '#111827',
  fontWeight: '700',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const tdSmall = {
  border: blackBorder,
  padding: '5px',
  textAlign: 'center',
  color: '#111827',
  fontWeight: '600',
  height: '26px',
};

const editableCellInput = {
  width: '100%',
  border: 'none',
  outline: 'none',
  backgroundColor: 'transparent',
  color: '#111827',
  fontWeight: '700',
  textAlign: 'center',
  fontSize: '0.78rem',
  fontFamily: 'system-ui, sans-serif',
  padding: 0,
};

const sectionTd = {
  border: blackBorder,
  padding: '5px 7px',
  color: '#111827',
  fontWeight: '900',
  backgroundColor: '#f3f4f6',
};

const sectionEmptyTd = {
  border: blackBorder,
  backgroundColor: '#f3f4f6',
};

const spaceTd = {
  border: blackBorder,
  height: '14px',
  backgroundColor: '#fff',
};