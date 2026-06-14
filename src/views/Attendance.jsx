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


function formatWeekSheetName(monday) {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const start = `${monday.getMonth() + 1}.${monday.getDate()}`;
  const end = `${sunday.getMonth() + 1}.${sunday.getDate()}`;

  return `${start} - ${end}`;
}

export default function Attendance() {
  const navigate = useNavigate();
  const currentWeek = getWeekInfo();
  const [selectedWeekKey, setSelectedWeekKey] = useState(currentWeek.weekKey);
  const selectedWeek = getWeekInfoFromKey(selectedWeekKey);
  const { monday, weekKey, weekLabel } = selectedWeek;
  const [availableWeeks, setAvailableWeeks] = useState([currentWeek.weekKey]);
  const [weeklyData, setWeeklyData] = useState({});
  const [employeeGenderMap, setEmployeeGenderMap] = useState({});
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [activeCell, setActiveCell] = useState(null);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [isSelectingCells, setIsSelectingCells] = useState(false);

  useEffect(() => {
    const stopSelection = () => {
      setIsSelectingCells(false);
    };

    window.addEventListener('mouseup', stopSelection);

    return () => {
      window.removeEventListener('mouseup', stopSelection);
    };
  }, []);


  useEffect(() => {
    let isMounted = true;

    const loadEmployeeGenders = async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('name, gender');

      if (error) {
        console.error('Load employee genders error:', error);
        return;
      }

      if (!isMounted) return;

      const nextGenderMap = {};

      (data || []).forEach((employee) => {
        nextGenderMap[normalizeName(employee.name)] = String(employee.gender || '')
          .trim()
          .toUpperCase();
      });

      setEmployeeGenderMap(nextGenderMap);
    };

    loadEmployeeGenders();

    const channel = supabase
      .channel('employee-genders-attendance')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'employees' },
        () => {
          loadEmployeeGenders();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

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
          timeIn: normalizeTimeValue(record.time_in || ''),
          timeOut: normalizeTimeValue(record.time_out || ''),
          role: record.role || '',
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
            area: record.role || '',
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

  const normalizeTimeValue = (value) => {
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

  const normalizeCellValue = (field, value) => {
    if (field === 'timeIn' || field === 'timeOut') {
      return normalizeTimeValue(value);
    }

    return String(value || '').trim().toUpperCase();
  };

  const getSafeCellKey = (personName, day, field) =>
    `${personName}-${day}-${field}`.replace(/[^a-zA-Z0-9_-]/g, '_');

  const getEditableCellId = (personName, day, field) =>
    `attendance-cell-${getSafeCellKey(personName, day, field)}`;

  const getEditableGroupValues = (person, day) => {
    const timeInInput = document.getElementById(
      getEditableCellId(person.name, day, 'timeIn')
    );
    const timeOutInput = document.getElementById(
      getEditableCellId(person.name, day, 'timeOut')
    );
    const areaInput = document.getElementById(
      getEditableCellId(person.name, day, 'area')
    );

    const values = {
      timeIn: normalizeCellValue('timeIn', timeInInput?.value || ''),
      timeOut: normalizeCellValue('timeOut', timeOutInput?.value || ''),
      area: normalizeCellValue('area', areaInput?.value || ''),
    };

    if (timeInInput) timeInInput.value = values.timeIn;
    if (timeOutInput) timeOutInput.value = values.timeOut;
    if (areaInput) areaInput.value = values.area;

    return values;
  };

  const getSystemFromValue = (valueToCheck) => {
    const normalized = String(valueToCheck || '').trim().toUpperCase();
    return ['S1', 'S2', 'S3', 'S4'].includes(normalized) ? normalized : '';
  };

  const getFallbackSystemForPerson = (person, record, areaValue) => {
    const systemFromArea = getSystemFromValue(areaValue);
    if (systemFromArea) return systemFromArea;
    if (record?.system) return record.system;

    for (const dayName of DAYS) {
      const existingSystem = person.days?.[dayName]?.system;
      if (existingSystem) return existingSystem;
    }

    return 'S1';
  };

  const updateLocalAttendanceRecord = (day, recordId, values, systemValue) => {
    setWeeklyData((prev) => {
      const dayRecords = prev[day] || [];

      const updatedDayRecords = dayRecords.map((record) => {
        if (record.id !== recordId) return record;

        return {
          ...record,
          timeIn: values.timeIn,
          timeOut: values.timeOut,
          role: values.area,
          system: systemValue || record.system || 'S1',
        };
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

  const saveAttendanceGroupEdit = async (person, day) => {
    if (!person?.name || person.type !== 'employee') return;

    const record = person.days?.[day];
    const values = getEditableGroupValues(person, day);
    const shouldDelete =
      !values.timeIn.trim() && !values.timeOut.trim() && !values.area.trim();

    if (shouldDelete) {
      if (!record?.id) return;

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

    const systemValue = getFallbackSystemForPerson(person, record, values.area);

    if (!record?.id) {
      const { data, error } = await supabase
        .from('attendance_records')
        .insert({
          week_key: weekKey,
          day_name: day,
          employee_name: person.name,
          time_in: values.timeIn || null,
          time_out: values.timeOut || null,
          role: values.area || null,
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
            timeIn: normalizeTimeValue(data.time_in || ''),
            timeOut: normalizeTimeValue(data.time_out || ''),
            role: data.role || '',
            system: data.system || systemValue,
          },
        ],
      }));

      return;
    }

    const { error } = await supabase
      .from('attendance_records')
      .update({
        time_in: values.timeIn || null,
        time_out: values.timeOut || null,
        role: values.area || null,
        system: systemValue,
      })
      .eq('id', record.id);

    if (error) {
      console.error('Update attendance record error:', error);
      alert('Unable to update attendance record.');
      return;
    }

    updateLocalAttendanceRecord(day, record.id, values, systemValue);
  };

  const focusEditableCell = (rowIndex, dayIndex, field) => {
    setTimeout(() => {
      for (let nextRowIndex = rowIndex; nextRowIndex < employeeRows.length; nextRowIndex += 1) {
        const nextInput = document.querySelector(
          `input[data-attendance-cell="true"][data-row-index="${nextRowIndex}"][data-day-index="${dayIndex}"][data-field="${field}"]`
        );

        if (nextInput) {
          nextInput.focus();
          nextInput.select();
          return;
        }
      }
    }, 30);
  };

  const focusCellToRight = (currentInput) => {
    const rowIndex = Number(currentInput.dataset.rowIndex);
    const dayIndex = Number(currentInput.dataset.dayIndex);
    const field = currentInput.dataset.field;
    const fieldOrder = ['timeIn', 'timeOut', 'area'];
    const fieldIndex = fieldOrder.indexOf(field);

    if (Number.isNaN(rowIndex) || Number.isNaN(dayIndex) || fieldIndex === -1) return;

    let nextDayIndex = dayIndex;
    let nextField = fieldOrder[fieldIndex + 1];

    if (!nextField) {
      nextField = fieldOrder[0];
      nextDayIndex = dayIndex + 1;
    }

    setTimeout(() => {
      const nextInput = document.querySelector(
        `input[data-attendance-cell="true"][data-row-index="${rowIndex}"][data-day-index="${nextDayIndex}"][data-field="${nextField}"]`
      );

      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }, 30);
  };

  const handleEditableCellKeyDown = async (event, person, day) => {
    if (event.key !== 'Enter' && event.key !== 'Tab') return;

    const input = event.currentTarget;

    if (event.key === 'Enter') {
      event.preventDefault();
      input.dataset.dirty = 'false';
      await saveAttendanceGroupEdit(person, day);

      const rowIndex = Number(input.dataset.rowIndex);
      const dayIndex = Number(input.dataset.dayIndex);
      const field = input.dataset.field;

      if (!Number.isNaN(rowIndex) && !Number.isNaN(dayIndex) && field) {
        focusEditableCell(rowIndex + 1, dayIndex, field);
      }

      return;
    }

    if (event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault();
      input.dataset.dirty = 'false';
      await saveAttendanceGroupEdit(person, day);
      focusCellToRight(input);
    }
  };

  const handleEditableCellBlur = async (event, person, day) => {
    if (event.currentTarget.dataset.dirty !== 'true') return;

    event.currentTarget.dataset.dirty = 'false';
    await saveAttendanceGroupEdit(person, day);
  };



  const editableFieldOrder = ['timeIn', 'timeOut', 'area'];

  const getColumnIndex = (dayIndex, field) => {
    const fieldIndex = editableFieldOrder.indexOf(field);
    if (fieldIndex === -1) return -1;
    return dayIndex * 3 + fieldIndex;
  };

  const getDayFieldFromColumnIndex = (columnIndex) => {
    const safeColumn = Math.max(0, Number(columnIndex) || 0);
    const dayIndex = Math.floor(safeColumn / 3);
    const field = editableFieldOrder[safeColumn % 3];

    return {
      dayIndex,
      field,
    };
  };

  const getInputByPosition = (rowIndex, columnIndex) => {
    const { dayIndex, field } = getDayFieldFromColumnIndex(columnIndex);

    return document.querySelector(
      `input[data-attendance-cell="true"][data-row-index="${rowIndex}"][data-day-index="${dayIndex}"][data-field="${field}"]`
    );
  };

  const getSelectionRange = () => {
    const start = selectionStart || activeCell;
    const end = selectionEnd || selectionStart || activeCell;

    if (!start || !end) return null;

    return {
      rowStart: Math.min(start.rowIndex, end.rowIndex),
      rowEnd: Math.max(start.rowIndex, end.rowIndex),
      colStart: Math.min(start.columnIndex, end.columnIndex),
      colEnd: Math.max(start.columnIndex, end.columnIndex),
    };
  };

  const isCellSelected = (rowIndex, dayIndex, field) => {
    const columnIndex = getColumnIndex(dayIndex, field);
    const range = getSelectionRange();

    if (!range) return false;

    return (
      rowIndex >= range.rowStart &&
      rowIndex <= range.rowEnd &&
      columnIndex >= range.colStart &&
      columnIndex <= range.colEnd
    );
  };

  const handleCellMouseDown = (event) => {
    const input = event.currentTarget;
    const rowIndex = Number(input.dataset.rowIndex);
    const dayIndex = Number(input.dataset.dayIndex);
    const field = input.dataset.field;
    const columnIndex = getColumnIndex(dayIndex, field);

    if (Number.isNaN(rowIndex) || columnIndex === -1) return;

    const nextCell = {
      rowIndex,
      dayIndex,
      field,
      columnIndex,
    };

    setActiveCell(nextCell);
    setSelectionStart(nextCell);
    setSelectionEnd(nextCell);
    setIsSelectingCells(true);

    input.dataset.clickCount = String(event.detail);
  };

  const handleCellMouseEnter = (event) => {
    if (!isSelectingCells || !selectionStart) return;

    const input = event.currentTarget;
    const rowIndex = Number(input.dataset.rowIndex);
    const dayIndex = Number(input.dataset.dayIndex);
    const field = input.dataset.field;
    const columnIndex = getColumnIndex(dayIndex, field);

    if (Number.isNaN(rowIndex) || columnIndex === -1) return;

    setSelectionEnd({
      rowIndex,
      dayIndex,
      field,
      columnIndex,
    });
  };

  const handleCellFocus = (event) => {
    const input = event.currentTarget;
    const rowIndex = Number(input.dataset.rowIndex);
    const dayIndex = Number(input.dataset.dayIndex);
    const field = input.dataset.field;
    const columnIndex = getColumnIndex(dayIndex, field);

    if (!Number.isNaN(rowIndex) && columnIndex !== -1) {
      const nextCell = {
        rowIndex,
        dayIndex,
        field,
        columnIndex,
      };

      setActiveCell(nextCell);

      if (!isSelectingCells) {
        setSelectionStart(nextCell);
        setSelectionEnd(nextCell);
      }
    }

    if (input.dataset.clickCount !== '2') {
      input.select();
    }
  };

  const getClipboardTextFromSelection = () => {
    const range = getSelectionRange();

    if (!range) return '';

    const lines = [];

    for (let rowIndex = range.rowStart; rowIndex <= range.rowEnd; rowIndex += 1) {
      const values = [];

      for (let columnIndex = range.colStart; columnIndex <= range.colEnd; columnIndex += 1) {
        const input = getInputByPosition(rowIndex, columnIndex);
        values.push(input ? input.value : '');
      }

      lines.push(values.join('\t'));
    }

    return lines.join('\n');
  };

  const handleAttendanceCopy = (event) => {
    const textToCopy = getClipboardTextFromSelection();

    if (!textToCopy) return;

    event.preventDefault();
    event.clipboardData.setData('text/plain', textToCopy);
  };

  const pasteValuesFromCell = async (startInput, pastedText) => {
    const startRowIndex = Number(startInput.dataset.rowIndex);
    const startDayIndex = Number(startInput.dataset.dayIndex);
    const startField = startInput.dataset.field;
    const startColumnIndex = getColumnIndex(startDayIndex, startField);

    if (Number.isNaN(startRowIndex) || startColumnIndex === -1) return;

    const pastedRows = String(pastedText || '')
      .replace(/\r/g, '')
      .split('\n')
      .filter((line, index, array) => !(index === array.length - 1 && line === ''));

    const touchedGroups = new Map();

    pastedRows.forEach((line, rowOffset) => {
      const values = line.split('\t');

      values.forEach((value, colOffset) => {
        const targetRowIndex = startRowIndex + rowOffset;
        const targetColumnIndex = startColumnIndex + colOffset;
        const targetInput = getInputByPosition(targetRowIndex, targetColumnIndex);

        if (!targetInput) return;

        const targetDayIndex = Number(targetInput.dataset.dayIndex);
        const targetField = targetInput.dataset.field;
        const targetDay = DAYS[targetDayIndex];
        const normalizedValue = normalizeCellValue(targetField, value);

        targetInput.value = normalizedValue;
        targetInput.dataset.dirty = 'false';

        if (targetDay) {
          touchedGroups.set(`${targetRowIndex}-${targetDay}`, {
            rowIndex: targetRowIndex,
            day: targetDay,
          });
        }
      });
    });

    for (const group of touchedGroups.values()) {
      const person = employeeRows[group.rowIndex];
      if (person?.type === 'employee') {
        await saveAttendanceGroupEdit(person, group.day);
      }
    }

    setSelectionStart({
      rowIndex: startRowIndex,
      dayIndex: startDayIndex,
      field: startField,
      columnIndex: startColumnIndex,
    });

    const lastRowIndex = startRowIndex + Math.max(pastedRows.length - 1, 0);
    const lastColumnOffset = pastedRows.reduce((max, line) => {
      return Math.max(max, line.split('\t').length - 1);
    }, 0);
    const lastColumnIndex = startColumnIndex + lastColumnOffset;
    const lastCell = getDayFieldFromColumnIndex(lastColumnIndex);

    setSelectionEnd({
      rowIndex: lastRowIndex,
      dayIndex: lastCell.dayIndex,
      field: lastCell.field,
      columnIndex: lastColumnIndex,
    });
  };

  const handleAttendancePaste = async (event) => {
    const pastedText = event.clipboardData.getData('text/plain');

    if (!pastedText) return;

    event.preventDefault();
    event.currentTarget.dataset.dirty = 'false';
    await pasteValuesFromCell(event.currentTarget, pastedText);
  };

  const parseTimeToMinutes = (value) => {
    const normalized = normalizeTimeValue(value);
    if (!normalized || !normalized.includes(':')) return null;

    const [hourPart, minutePart = '00'] = normalized.split(':');
    const hour = parseInt(hourPart, 10);
    const minute = parseInt(minutePart, 10);

    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

    return hour * 60 + minute;
  };

  const calculateRecordHours = (record) => {
    const startMinutes = parseTimeToMinutes(record?.timeIn);
    const endMinutes = parseTimeToMinutes(record?.timeOut);

    if (startMinutes === null || endMinutes === null) return 0;

    let totalMinutes = endMinutes - startMinutes;

    if (totalMinutes < 0) {
      totalMinutes += 24 * 60;
    }

    return totalMinutes / 60;
  };

  const roundHours = (value) => Math.round((Number(value) || 0) * 100) / 100;

  const getPersonTotalHours = (person) => {
    const total = DAYS.reduce((sum, day) => {
      const record = person.days?.[day];
      return sum + calculateRecordHours(record);
    }, 0);

    return roundHours(total);
  };


  const getPersonGender = (person) => {
    const gender = employeeGenderMap[normalizeName(person?.name)] || '';

    if (gender === 'F' || gender === 'FEMALE' || gender === 'WOMAN' || gender === 'MUJER') {
      return 'FEMALE';
    }

    if (gender === 'M' || gender === 'MALE' || gender === 'MAN' || gender === 'HOMBRE') {
      return 'MALE';
    }

    return '';
  };

  const normalizeRoleForExport = (roleValue, systemValue) => {
    const role = String(roleValue || '').trim().toUpperCase();
    const system = String(systemValue || '').trim().toUpperCase();
    const value = role || system;

    if (value === 'AST') return 'AST';
    if (value === 'QC' || value === 'QCS') return 'QCS';
    if (value === 'OP' || value === 'OPS') return 'OPS';

    if (
      value === 'S1' ||
      value === 'S2' ||
      value === 'S3' ||
      value === 'S4' ||
      value === 'LW'
    ) {
      return 'LW';
    }

    return 'LW';
  };

  const getPersonMainRole = (person) => {
    const mondayRecord = person.days?.Monday;

    if (mondayRecord?.area || mondayRecord?.system) {
      return normalizeRoleForExport(mondayRecord.area, mondayRecord.system);
    }

    for (const day of DAYS) {
      const record = person.days?.[day];

      if (record?.area || record?.system) {
        return normalizeRoleForExport(record.area, record.system);
      }
    }

    return 'LW';
  };

  const getDownloadGroupKey = (person) => {
    const role = getPersonMainRole(person);

    if (role === 'AST') return 'AST';
    if (role === 'QCS') return 'QCS';
    if (role === 'OPS') return 'OPS';

    const gender = getPersonGender(person);

    if (gender === 'FEMALE') return 'LW_FEMALE';
    if (gender === 'MALE') return 'LW_MALE';

    return 'LW_UNKNOWN';
  };

  const getDownloadGroupOrder = (groupKey) => {
    const order = {
      AST: 1,
      QCS: 2,
      OPS: 3,
      LW_FEMALE: 4,
      LW_MALE: 5,
      LW_UNKNOWN: 6,
    };

    return order[groupKey] || 99;
  };


  const addTotalHoursSheet = (workbook, rows, borderStyle, center) => {
    const sheet = workbook.addWorksheet('Total Hours', {
      pageSetup: {
        paperSize: 9,
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.25,
          right: 0.25,
          top: 0.35,
          bottom: 0.35,
          header: 0.1,
          footer: 0.1,
        },
      },
    });

    sheet.columns = [
      { key: 'name', width: 38 },
      { key: 'hours', width: 14 },
      { key: 'regular', width: 14 },
      { key: 'extra', width: 14 },
    ];

    sheet.mergeCells('A1:D1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'TOTAL HOURS';
    titleCell.font = { name: 'Calibri', size: 14, bold: true };
    titleCell.alignment = center;
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF92D050' },
    };
    titleCell.border = borderStyle;

    const headerRow = sheet.getRow(3);
    ['NAMES', 'HOURS', 'REGULAR', 'OT'].forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { name: 'Calibri', size: 11, bold: true };
      cell.alignment = index === 0 ? { vertical: 'middle', horizontal: 'left' } : center;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDDEBF7' },
      };
      cell.border = borderStyle;
    });

    let currentRow = 4;
    let totalHours = 0;
    let totalRegular = 0;
    let totalExtra = 0;

    rows.forEach((person) => {
      const hours = getPersonTotalHours(person);
      if (hours <= 0) return;

      const regular = Math.min(hours, 40);
      const extra = hours > 40 ? roundHours(hours - 40) : '';

      totalHours += hours;
      totalRegular += regular;
      totalExtra += typeof extra === 'number' ? extra : 0;

      const row = sheet.getRow(currentRow);
      row.getCell(1).value = person.name;
      row.getCell(2).value = hours;
      row.getCell(3).value = roundHours(regular);
      row.getCell(4).value = extra;

      for (let col = 1; col <= 4; col += 1) {
        const cell = row.getCell(col);
        cell.font = { name: 'Calibri', size: 11, bold: true };
        cell.alignment = col === 1 ? { vertical: 'middle', horizontal: 'left' } : center;
        cell.border = borderStyle;
      }

      currentRow += 1;
    });

    currentRow += 1;
    const totalRow = sheet.getRow(currentRow);
    totalRow.getCell(1).value = 'TOTALS';
    totalRow.getCell(2).value = roundHours(totalHours);
    totalRow.getCell(3).value = roundHours(totalRegular);
    totalRow.getCell(4).value = totalExtra > 0 ? roundHours(totalExtra) : '';

    for (let col = 1; col <= 4; col += 1) {
      const cell = totalRow.getCell(col);
      cell.font = { name: 'Calibri', size: 11, bold: true };
      cell.alignment = col === 1 ? { vertical: 'middle', horizontal: 'left' } : center;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF92D050' },
      };
      cell.border = borderStyle;
    }

    sheet.eachRow((row) => {
      row.height = 20;
    });
  };

  const addRoleSummarySheet = (workbook, rows, borderStyle, center) => {
    const sheet = workbook.addWorksheet('Role Summary', {
      pageSetup: {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.25,
          right: 0.25,
          top: 0.35,
          bottom: 0.35,
          header: 0.1,
          footer: 0.1,
        },
      },
    });

    const workedDayIndexes = DAYS
      .map((day, index) => ({ day, index }))
      .filter(({ day }) =>
        rows.some((person) => {
          const record = person.days?.[day];
          return Boolean(record?.timeIn || record?.timeOut || record?.area);
        })
      )
      .map(({ index }) => index);

    const visibleDayIndexes = workedDayIndexes.length > 0
      ? workedDayIndexes
      : DAYS.map((_, index) => index);

    sheet.getColumn(1).width = 16;

    visibleDayIndexes.forEach((_, index) => {
      sheet.getColumn(index + 2).width = 14;
    });

    sheet.mergeCells(1, 1, 1, visibleDayIndexes.length + 1);
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'ROLE SUMMARY';
    titleCell.font = { name: 'Calibri', size: 14, bold: true };
    titleCell.alignment = center;
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF92D050' },
    };
    titleCell.border = borderStyle;

    const headerRow = sheet.getRow(3);
    const roleHeader = headerRow.getCell(1);
    roleHeader.value = 'ROLE';
    roleHeader.font = { name: 'Calibri', size: 11, bold: true };
    roleHeader.alignment = center;
    roleHeader.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDDEBF7' },
    };
    roleHeader.border = borderStyle;

    visibleDayIndexes.forEach((dayIndex, index) => {
      const cell = headerRow.getCell(index + 2);
      cell.value = getDayDate(dayIndex);
      cell.font = { name: 'Calibri', size: 11, bold: true };
      cell.alignment = center;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDDEBF7' },
      };
      cell.border = borderStyle;
    });

    const normalizeRoleForSummary = (roleValue) => {
      const role = String(roleValue || '').trim().toUpperCase();

      if (role === 'QC' || role === 'QCS') return 'QCS';
      if (role === 'OP' || role === 'OPS') return 'OPS';
      if (role === 'AST') return 'AST';

      if (
        role === 'S1' ||
        role === 'S2' ||
        role === 'S3' ||
        role === 'S4' ||
        role === 'LW'
      ) {
        return 'LW';
      }

      return '';
    };

    const roleCountsByDay = {};

    visibleDayIndexes.forEach((dayIndex) => {
      roleCountsByDay[dayIndex] = {
        AST: 0,
        QCS: 0,
        OPS: 0,
        LW: 0,
      };
    });

    rows.forEach((person) => {
      visibleDayIndexes.forEach((dayIndex) => {
        const day = DAYS[dayIndex];
        const record = person.days?.[day];
        const mappedRole = normalizeRoleForSummary(record?.area);

        if (mappedRole && roleCountsByDay[dayIndex][mappedRole] !== undefined) {
          roleCountsByDay[dayIndex][mappedRole] += 1;
        }
      });
    });

    const roleLabels = ['AST', 'QCS', 'OPS', 'LW', 'FRKL', '', 'TOTAL'];
    let currentRow = 4;

    roleLabels.forEach((label) => {
      const row = sheet.getRow(currentRow);
      row.getCell(1).value = label;

      visibleDayIndexes.forEach((dayIndex, index) => {
        const cell = row.getCell(index + 2);

        if (label === 'FRKL' || label === '') {
  cell.value = '';
} else if (label === 'TOTAL') {
  const columnLetter = sheet.getColumn(index + 2).letter;
  cell.value = {
    formula: `SUM(${columnLetter}4:${columnLetter}8)`,
  };
} else {
  cell.value = roleCountsByDay[dayIndex][label] || '';
}
      });

      for (let col = 1; col <= visibleDayIndexes.length + 1; col += 1) {
        const cell = row.getCell(col);
        cell.font = { name: 'Calibri', size: 11, bold: true };
        cell.alignment = col === 1 ? { vertical: 'middle', horizontal: 'left' } : center;
        cell.border = borderStyle;
      }

      if (label === 'TOTAL') {
        for (let col = 1; col <= visibleDayIndexes.length + 1; col += 1) {
          row.getCell(col).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF92D050' },
          };
        }
      }

      currentRow += 1;
    });

    sheet.eachRow((row) => {
      row.height = 20;
    });
  };

  const downloadExcel = async () => {
    const workedRows = employeeRows.filter(hasWorked);

    if (workedRows.length === 0) {
      alert('No attendance records to download.');
      return;
    }

    const orderedWorkedRows = [...workedRows].sort((a, b) => {
      const aGroup = getDownloadGroupKey(a);
      const bGroup = getDownloadGroupKey(b);
      const aGroupOrder = getDownloadGroupOrder(aGroup);
      const bGroupOrder = getDownloadGroupOrder(bGroup);

      if (aGroupOrder !== bGroupOrder) return aGroupOrder - bGroupOrder;

      return String(a.name || '').localeCompare(String(b.name || ''));
    });

    const workbook = new ExcelJS.Workbook();

    const worksheet = workbook.addWorksheet(formatWeekSheetName(monday), {
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

    const center = {
      vertical: 'middle',
      horizontal: 'center',
    };

    worksheet.getCell('A1').value = 'BUILDING 8';
    worksheet.getCell('A1').font = { name: 'Calibri', size: 14, bold: true };
    worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };
    worksheet.getCell('A1').border = borderStyle;

    worksheet.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDDEBF7' }
  };

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
    let previousDownloadGroup = null;
    const spacerRows = new Set();

    orderedWorkedRows.forEach((person) => {
      const currentDownloadGroup = getDownloadGroupKey(person);

      if (previousDownloadGroup && previousDownloadGroup !== currentDownloadGroup) {
        const spacerStartRow = currentRow;

        spacerRows.add(spacerStartRow);

        worksheet.mergeCells(spacerStartRow, 1, spacerStartRow, 22);

        const spacerRow = worksheet.getRow(spacerStartRow);

        for (let col = 1; col <= 22; col += 1) {
          const cell = spacerRow.getCell(col);
          cell.value = '';
          cell.border = {};
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFFF' },
          };
        }

        spacerRow.height = 20;

        currentRow += 1;
      }

      previousDownloadGroup = currentDownloadGroup;

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

        const timeOutMinutes = parseTimeToMinutes(record?.timeOut);

        if (timeOutMinutes !== null && timeOutMinutes < 18 * 60) {
          row.getCell(startCol + 1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFF00' },
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

    worksheet.eachRow((row, rowNumber) => {
      if (spacerRows.has(rowNumber)) return;

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

    addTotalHoursSheet(workbook, orderedWorkedRows, borderStyle, center);
    addRoleSummarySheet(workbook, orderedWorkedRows, borderStyle, center);

    const buffer = await workbook.xlsx.writeBuffer();

    saveAs(
      new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      `WEEKLY ATTENDANCE B8 ${weekKey}.xlsx`
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

                      {DAYS.map((day, dayIndex) => {
                        const record = person.days?.[day];

                        return (
                          <React.Fragment key={`${person.name}-${day}`}>
                            <td style={tdSmall}>
                              <input
                                id={getEditableCellId(person.name, day, 'timeIn')}
                                data-attendance-cell="true"
                                data-row-index={index}
                                data-day-index={dayIndex}
                                data-field="timeIn"
                                defaultValue={record?.timeIn || ''}
                                onChange={(event) => {
                                  event.currentTarget.dataset.dirty = 'true';
                                }}
                                onBlur={(event) =>
                                  handleEditableCellBlur(event, person, day)
                                }
                                onKeyDown={(event) =>
                                  handleEditableCellKeyDown(event, person, day)
                                }
                                onMouseDown={handleCellMouseDown}
                                onMouseEnter={handleCellMouseEnter}
                                onFocus={handleCellFocus}
                                onCopy={handleAttendanceCopy}
                                onPaste={handleAttendancePaste}
                                style={{
                                  ...editableCellInput,
                                  ...(isCellSelected(index, dayIndex, 'timeIn') ? selectedEditableCellInput : {}),
                                }}
                              />
                            </td>

                            <td style={tdSmall}>
                              <input
                                id={getEditableCellId(person.name, day, 'timeOut')}
                                data-attendance-cell="true"
                                data-row-index={index}
                                data-day-index={dayIndex}
                                data-field="timeOut"
                                defaultValue={record?.timeOut || ''}
                                onChange={(event) => {
                                  event.currentTarget.dataset.dirty = 'true';
                                }}
                                onBlur={(event) =>
                                  handleEditableCellBlur(event, person, day)
                                }
                                onKeyDown={(event) =>
                                  handleEditableCellKeyDown(event, person, day)
                                }
                                onMouseDown={handleCellMouseDown}
                                onMouseEnter={handleCellMouseEnter}
                                onFocus={handleCellFocus}
                                onCopy={handleAttendanceCopy}
                                onPaste={handleAttendancePaste}
                                style={{
                                  ...editableCellInput,
                                  ...(isCellSelected(index, dayIndex, 'timeOut') ? selectedEditableCellInput : {}),
                                }}
                              />
                            </td>

                            <td style={tdSmall}>
                              <input
                                id={getEditableCellId(person.name, day, 'area')}
                                data-attendance-cell="true"
                                data-row-index={index}
                                data-day-index={dayIndex}
                                data-field="area"
                                defaultValue={record?.area || ''}
                                onChange={(event) => {
                                  event.currentTarget.dataset.dirty = 'true';
                                }}
                                onBlur={(event) =>
                                  handleEditableCellBlur(event, person, day)
                                }
                                onKeyDown={(event) =>
                                  handleEditableCellKeyDown(event, person, day)
                                }
                                onMouseDown={handleCellMouseDown}
                                onMouseEnter={handleCellMouseEnter}
                                onFocus={handleCellFocus}
                                onCopy={handleAttendanceCopy}
                                onPaste={handleAttendancePaste}
                                style={{
                                  ...editableCellInput,
                                  ...(isCellSelected(index, dayIndex, 'area') ? selectedEditableCellInput : {}),
                                }}
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
  cursor: 'text',
};

const selectedEditableCellInput = {
  backgroundColor: '#bfdbfe',
  boxShadow: 'inset 0 0 0 2px #2563eb',
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