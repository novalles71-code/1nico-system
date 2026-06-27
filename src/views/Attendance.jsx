import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from '../lib/supabase';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const ENTRY_ROLES = ['AST', 'QC', 'OP', 'S1', 'S2', 'S3', 'S4'];
const SHIFT_PRESETS = {
  Day: { timeIn: '6:00', timeOut: '18:00' },
  Night: { timeIn: '18:00', timeOut: '6:00' },
};

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

function getWeekInfo(date = new Date()) {
  const monday = getMonday(date);
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
  return `${monday.getMonth() + 1}.${monday.getDate()} - ${sunday.getMonth() + 1}.${sunday.getDate()}`;
}

function normalizeTimeValue(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (raw.includes(':')) {
    const [hourPart, minutePart = '00'] = raw.split(':');
    const hour = parseInt(hourPart.replace(/\D/g, ''), 10);
    const minute = parseInt(minutePart.replace(/\D/g, ''), 10);
    if (Number.isNaN(hour)) return raw;
    const safeHour = Math.max(0, Math.min(hour, 23));
    const safeMinute = Number.isNaN(minute) ? 0 : Math.max(0, Math.min(minute, 59));
    return `${safeHour}:${String(safeMinute).padStart(2, '0')}`;
  }

  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.length <= 2) {
    const hour = parseInt(digits, 10);
    if (Number.isNaN(hour)) return raw;
    return `${Math.max(0, Math.min(hour, 23))}:00`;
  }

  const hour = parseInt(digits.slice(0, -2), 10);
  const minute = parseInt(digits.slice(-2), 10);
  if (Number.isNaN(hour)) return raw;
  return `${Math.max(0, Math.min(hour, 23))}:${String(Number.isNaN(minute) ? 0 : Math.max(0, Math.min(minute, 59))).padStart(2, '0')}`;
}

function parseTimeToMinutes(value) {
  const normalized = normalizeTimeValue(value);
  if (!normalized || !normalized.includes(':')) return null;
  const [hourPart, minutePart = '00'] = normalized.split(':');
  const hour = parseInt(hourPart, 10);
  const minute = parseInt(minutePart, 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

function roundHours(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function calculateRecordHours(record) {
  const startMinutes = parseTimeToMinutes(record?.timeIn);
  const endMinutes = parseTimeToMinutes(record?.timeOut);
  if (startMinutes === null || endMinutes === null) return 0;
  let totalMinutes = endMinutes - startMinutes;
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  return totalMinutes / 60;
}

function normalizeGender(gender) {
  const value = String(gender || '').trim().toUpperCase();
  if (['F', 'FEMALE', 'WOMAN', 'MUJER'].includes(value)) return 'F';
  if (['M', 'MALE', 'MAN', 'HOMBRE'].includes(value)) return 'M';
  return '';
}

function normalizeRole(role) {
  const value = String(role || '').trim().toUpperCase();
  if (value === 'QCS') return 'QC';
  if (value === 'OPS') return 'OP';
  if (value === 'SUPPORT TEAM') return 'SUPPORT';
  return value;
}

function isLineWorkerRole(role) {
  return ['S1', 'S2', 'S3', 'S4', 'LW'].includes(normalizeRole(role));
}

export default function Attendance() {
  const navigate = useNavigate();
  const currentWeek = getWeekInfo();
  const [selectedWeekKey, setSelectedWeekKey] = useState(currentWeek.weekKey);
  const selectedWeek = getWeekInfoFromKey(selectedWeekKey);
  const { monday, weekKey, weekLabel } = selectedWeek;

  const [activeView, setActiveView] = useState('daily');
  const [availableWeeks, setAvailableWeeks] = useState([currentWeek.weekKey]);
  const [employees, setEmployees] = useState([]);
  const [weeklyData, setWeeklyData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedNames, setSelectedNames] = useState([]);

  const todayName = DAYS[Math.max(0, (new Date().getDay() || 7) - 1)] || 'Monday';
  const [entryDay, setEntryDay] = useState(todayName);
  const [entryShift, setEntryShift] = useState('Day');
  const [entryRole, setEntryRole] = useState('S1');
  const [timeIn, setTimeIn] = useState(SHIFT_PRESETS.Day.timeIn);
  const [timeOut, setTimeOut] = useState(SHIFT_PRESETS.Day.timeOut);

  const getDayDate = (index) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + index);
    return formatDate(d);
  };

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('id, name, active, gender, role')
      .eq('active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Load employees error:', error);
      alert('Unable to load employees. Check that employees has gender and role columns.');
      return;
    }

    setEmployees((data || []).map((item) => ({
      ...item,
      name: normalizeName(item.name),
      gender: normalizeGender(item.gender),
      role: normalizeRole(item.role),
    })));
  };

  const loadAvailableWeeks = async () => {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('week_key')
      .order('week_key', { ascending: false });

    if (error) {
      console.error('Load weeks error:', error);
      return;
    }

    const uniqueWeeks = Array.from(
      new Set([currentWeek.weekKey, ...(data || []).map((record) => record.week_key).filter(Boolean)])
    );

    setAvailableWeeks(uniqueWeeks);
    if (!uniqueWeeks.includes(selectedWeekKey)) {
      setSelectedWeekKey(uniqueWeeks[0] || currentWeek.weekKey);
    }
  };

  const loadWeeklyAttendance = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('week_key', weekKey)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Load attendance error:', error);
      alert('Unable to load attendance.');
      setLoading(false);
      return;
    }

    const nextWeeklyData = {};
    (data || []).forEach((record) => {
      const dayName = record.day_name;
      if (!nextWeeklyData[dayName]) nextWeeklyData[dayName] = [];
      nextWeeklyData[dayName].push({
        id: record.id,
        name: normalizeName(record.employee_name),
        timeIn: normalizeTimeValue(record.time_in || ''),
        timeOut: normalizeTimeValue(record.time_out || ''),
        role: normalizeRole(record.role || ''),
        system: record.system || 'S1',
      });
    });

    setWeeklyData(nextWeeklyData);
    setLoading(false);
  };

  useEffect(() => {
    loadEmployees();
    loadAvailableWeeks();
  }, []);

  useEffect(() => {
    loadWeeklyAttendance();
    loadAvailableWeeks();
  }, [weekKey]);

  useEffect(() => {
    const preset = SHIFT_PRESETS[entryShift];
    if (!preset) return;
    setTimeIn(preset.timeIn);
    setTimeOut(preset.timeOut);
  }, [entryShift]);

  const employeeMap = useMemo(() => {
    const map = {};
    employees.forEach((employee) => {
      map[normalizeName(employee.name)] = employee;
    });
    return map;
  }, [employees]);

  const rows = useMemo(() => {
    const names = new Set();
    Object.values(weeklyData).flat().forEach((record) => names.add(normalizeName(record.name)));

    return Array.from(names).map((name) => {
      const employee = employeeMap[name] || {};
      const days = {};
      DAYS.forEach((day) => {
        const record = [...(weeklyData[day] || [])]
          .reverse()
          .find((item) => normalizeName(item.name) === name);
        if (record) days[day] = record;
      });
      return {
        name,
        gender: normalizeGender(employee.gender),
        employeeRole: normalizeRole(employee.role),
        days,
      };
    });
  }, [weeklyData, employeeMap]);

  const filteredEmployees = employees.filter((employee) =>
    normalizeName(employee.name).includes(normalizeName(search))
  );

  const selectedEmployees = selectedNames.map((name) => employeeMap[name]).filter(Boolean);
  const savedForSelectedDay = weeklyData[entryDay] || [];

  const toggleSelectedEmployee = (employeeName) => {
    const cleanName = normalizeName(employeeName);
    setSelectedNames((prev) => (
      prev.includes(cleanName)
        ? prev.filter((name) => name !== cleanName)
        : [...prev, cleanName]
    ));
  };

  const clearSelected = () => setSelectedNames([]);

  const saveDailyEntry = async () => {
    if (selectedNames.length === 0) {
      alert('Select at least one employee.');
      return;
    }

    const finalTimeIn = normalizeTimeValue(timeIn);
    const finalTimeOut = normalizeTimeValue(timeOut);
    const finalRole = normalizeRole(entryRole);

    if (!finalTimeIn || !finalTimeOut || !finalRole) {
      alert('Day, time, and role are required.');
      return;
    }

    setSaving(true);

    const { error: deleteError } = await supabase
      .from('attendance_records')
      .delete()
      .eq('week_key', weekKey)
      .eq('day_name', entryDay)
      .in('employee_name', selectedNames);

    if (deleteError) {
      console.error('Replace attendance error:', deleteError);
      alert('Unable to replace existing attendance for selected employees.');
      setSaving(false);
      return;
    }

    const records = selectedNames.map((name) => ({
      week_key: weekKey,
      day_name: entryDay,
      employee_name: name,
      time_in: finalTimeIn,
      time_out: finalTimeOut,
      role: finalRole,
      system: 'S1',
    }));

    const { error: insertError } = await supabase
      .from('attendance_records')
      .insert(records);

    if (insertError) {
      console.error('Save attendance error:', insertError);
      alert('Unable to save attendance.');
      setSaving(false);
      return;
    }

    await loadWeeklyAttendance();
    await loadAvailableWeeks();
    clearSelected();
    setSearch('');
    setSaving(false);
    alert('Attendance saved.');
  };

  const deleteRecord = async (id) => {
    if (!confirm('Remove this attendance record?')) return;

    const { error } = await supabase
      .from('attendance_records')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete record error:', error);
      alert('Unable to remove record.');
      return;
    }

    await loadWeeklyAttendance();
    await loadAvailableWeeks();
  };

  const resetWeek = async () => {
    if (!confirm('Download the Excel file before resetting. Reset this weekly attendance?')) return;

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
    await loadAvailableWeeks();
  };

  const getPersonTotalHours = (person) => {
    const total = DAYS.reduce((sum, day) => sum + calculateRecordHours(person.days?.[day]), 0);
    return roundHours(total);
  };

  const getPersonMainRole = (person) => {
    for (const day of DAYS) {
      const role = normalizeRole(person.days?.[day]?.role);
      if (role) return role;
    }
    return normalizeRole(person.employeeRole) || 'SUPPORT';
  };

  const getGroupKey = (person) => {
    const role = getPersonMainRole(person);

    if (role === 'AST') return 'AST';
    if (role === 'QC') return 'QC';
    if (role === 'OP') return 'OP';

    if (isLineWorkerRole(role)) {
      if (person.gender === 'M') return 'LW_MALE';
      if (person.gender === 'F') return 'LW_FEMALE';
      return 'LW_UNKNOWN';
    }

    return 'SUPPORT';
  };

  const groupLabels = {
    AST: 'AST',
    QC: 'QC',
    OP: 'OP',
    LW_MALE: 'LW - MEN',
    LW_FEMALE: 'LW - GIRLS',
    LW_UNKNOWN: 'LW - NO GENDER',
    SUPPORT: 'SUPPORT TEAM',
  };

  const groupOrder = ['AST', 'QC', 'OP', 'LW_MALE', 'LW_FEMALE', 'LW_UNKNOWN', 'SUPPORT'];

  const getOrderedRows = () => {
    return rows
      .filter((person) => getPersonTotalHours(person) > 0)
      .sort((a, b) => {
        const aOrder = groupOrder.indexOf(getGroupKey(a));
        const bOrder = groupOrder.indexOf(getGroupKey(b));
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.name.localeCompare(b.name);
      });
  };

  const addTotalHoursSheet = (workbook, orderedRows, borderStyle, center) => {
    const sheet = workbook.addWorksheet('Total Hours', {
      pageSetup: {
        paperSize: 9,
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.1, footer: 0.1 },
      },
    });

    sheet.columns = [
      { key: 'name', width: 38 },
      { key: 'hours', width: 14 },
      { key: 'regular', width: 14 },
      { key: 'ot', width: 14 },
    ];

    sheet.mergeCells('A1:D1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'TOTAL HOURS';
    titleCell.font = { name: 'Calibri', size: 14, bold: true };
    titleCell.alignment = center;
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
    titleCell.border = borderStyle;

    const headerRow = sheet.getRow(3);
    ['NAMES', 'HOURS', 'REGULAR', 'OT'].forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { name: 'Calibri', size: 11, bold: true };
      cell.alignment = index === 0 ? { vertical: 'middle', horizontal: 'left' } : center;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } };
      cell.border = borderStyle;
    });

    let currentRow = 4;
    let totalHours = 0;
    let totalRegular = 0;
    let totalOT = 0;

    orderedRows.forEach((person) => {
      const hours = getPersonTotalHours(person);
      if (hours <= 0) return;
      const regular = Math.min(hours, 40);
      const ot = hours > 40 ? roundHours(hours - 40) : '';
      totalHours += hours;
      totalRegular += regular;
      totalOT += typeof ot === 'number' ? ot : 0;

      const row = sheet.getRow(currentRow);
      row.getCell(1).value = person.name;
      row.getCell(2).value = hours;
      row.getCell(3).value = roundHours(regular);
      row.getCell(4).value = ot;

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
    totalRow.getCell(4).value = totalOT > 0 ? roundHours(totalOT) : '';

    for (let col = 1; col <= 4; col += 1) {
      const cell = totalRow.getCell(col);
      cell.font = { name: 'Calibri', size: 11, bold: true };
      cell.alignment = col === 1 ? { vertical: 'middle', horizontal: 'left' } : center;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
      cell.border = borderStyle;
    }

    sheet.eachRow((row) => { row.height = 20; });
  };

  const addRoleSummarySheet = (workbook, orderedRows, borderStyle, center) => {
    const sheet = workbook.addWorksheet('Role Summary', {
      pageSetup: {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.1, footer: 0.1 },
      },
    });

    const workedDayIndexes = DAYS
      .map((day, index) => ({ day, index }))
      .filter(({ day }) => orderedRows.some((person) => {
        const record = person.days?.[day];
        return Boolean(record?.timeIn || record?.timeOut || record?.role);
      }))
      .map(({ index }) => index);

    const visibleDayIndexes = workedDayIndexes.length > 0 ? workedDayIndexes : DAYS.map((_, index) => index);
    sheet.getColumn(1).width = 16;
    visibleDayIndexes.forEach((_, index) => { sheet.getColumn(index + 2).width = 14; });

    sheet.mergeCells(1, 1, 1, visibleDayIndexes.length + 1);
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'ROLE SUMMARY';
    titleCell.font = { name: 'Calibri', size: 14, bold: true };
    titleCell.alignment = center;
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
    titleCell.border = borderStyle;

    const headerRow = sheet.getRow(3);
    const roleHeader = headerRow.getCell(1);
    roleHeader.value = 'ROLE';
    roleHeader.font = { name: 'Calibri', size: 11, bold: true };
    roleHeader.alignment = center;
    roleHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } };
    roleHeader.border = borderStyle;

    visibleDayIndexes.forEach((dayIndex, index) => {
      const cell = headerRow.getCell(index + 2);
      cell.value = getDayDate(dayIndex);
      cell.font = { name: 'Calibri', size: 11, bold: true };
      cell.alignment = center;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } };
      cell.border = borderStyle;
    });

    const roleCountsByDay = {};
    visibleDayIndexes.forEach((dayIndex) => {
      roleCountsByDay[dayIndex] = { AST: 0, QC: 0, OP: 0, LW: 0, SUPPORT: 0 };
    });

    orderedRows.forEach((person) => {
      visibleDayIndexes.forEach((dayIndex) => {
        const day = DAYS[dayIndex];
        const role = normalizeRole(person.days?.[day]?.role);
        if (!role) return;
        if (role === 'AST') roleCountsByDay[dayIndex].AST += 1;
        else if (role === 'QC') roleCountsByDay[dayIndex].QC += 1;
        else if (role === 'OP') roleCountsByDay[dayIndex].OP += 1;
        else if (isLineWorkerRole(role)) roleCountsByDay[dayIndex].LW += 1;
        else roleCountsByDay[dayIndex].SUPPORT += 1;
      });
    });

    const roleLabels = ['AST', 'QC', 'OP', 'LW', 'SUPPORT', 'FRKL', '', 'TOTAL'];
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
          cell.value = { formula: `SUM(${columnLetter}4:${columnLetter}9)` };
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
          row.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
        }
      }
      currentRow += 1;
    });

    sheet.eachRow((row) => { row.height = 20; });
  };

  const downloadExcel = async () => {
    const orderedRows = getOrderedRows();
    if (orderedRows.length === 0) {
      alert('No attendance records to download.');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(formatWeekSheetName(monday), {
      pageSetup: {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.2, right: 0.2, top: 0.25, bottom: 0.25, header: 0.1, footer: 0.1 },
      },
    });

    worksheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 2 }];
    worksheet.getColumn(1).width = 34;
    for (let col = 2; col <= 22; col += 1) worksheet.getColumn(col).width = 7.5;

    const borderStyle = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'medium', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'medium', color: { argb: 'FF000000' } },
    };
    const center = { vertical: 'middle', horizontal: 'center' };

    worksheet.getRow(1).height = 30;
    worksheet.getCell('A1').value = 'BUILDING 8';
    worksheet.getCell('A1').font = { name: 'Calibri', size: 14, bold: true };
    worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };
    worksheet.getCell('A1').border = borderStyle;
    worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } };
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
      dayCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };

      const dateCell = worksheet.getCell(2, startCol);
      dateCell.value = getDayDate(index);
      dateCell.font = { name: 'Calibri', size: 11, bold: true, italic: true };
      dateCell.alignment = center;
      dateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };

      for (let col = startCol; col <= endCol; col += 1) {
        worksheet.getCell(1, col).border = borderStyle;
        worksheet.getCell(2, col).border = borderStyle;
        worksheet.getCell(1, col).alignment = center;
        worksheet.getCell(2, col).alignment = center;
      }
    });

    let currentRow = 3;
    let currentGroup = '';

    orderedRows.forEach((person) => {
      const groupKey = getGroupKey(person);
      if (groupKey !== currentGroup) {
        if (currentGroup) currentRow += 1;
        currentGroup = groupKey;

        worksheet.mergeCells(currentRow, 1, currentRow, 22);
        const groupCell = worksheet.getCell(currentRow, 1);
        groupCell.value = groupLabels[groupKey] || groupKey;
        groupCell.font = { name: 'Calibri', size: 12, bold: true };
        groupCell.alignment = { vertical: 'middle', horizontal: 'left' };
        groupCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } };
        for (let col = 1; col <= 22; col += 1) worksheet.getRow(currentRow).getCell(col).border = borderStyle;
        worksheet.getRow(currentRow).height = 20;
        currentRow += 1;
      }

      const row = worksheet.getRow(currentRow);
      row.getCell(1).value = person.name;
      row.getCell(1).font = { name: 'Calibri', size: 11, bold: true };
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

      DAYS.forEach((day, dayIndex) => {
        const record = person.days?.[day];
        const startCol = 2 + dayIndex * 3;
        row.getCell(startCol).value = record?.timeIn || '';
        row.getCell(startCol + 1).value = record?.timeOut || '';
        row.getCell(startCol + 2).value = record?.role || '';

        if (record?.timeIn || record?.timeOut || record?.role) {
          for (let offset = 0; offset <= 2; offset += 1) {
            row.getCell(startCol + offset).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } };
          }
        }

        const timeOutMinutes = parseTimeToMinutes(record?.timeOut);
        if (timeOutMinutes !== null && timeOutMinutes < 18 * 60) {
          row.getCell(startCol + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
        }

        for (let offset = 0; offset <= 2; offset += 1) {
          row.getCell(startCol + offset).alignment = center;
          row.getCell(startCol + offset).font = { name: 'Calibri', size: 11, bold: true };
        }
      });

      for (let col = 1; col <= 22; col += 1) row.getCell(col).border = borderStyle;
      row.height = 20;
      currentRow += 1;
    });

    worksheet.eachRow((row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: cell.font?.name || 'Calibri', size: cell.font?.size || 11, bold: true, italic: cell.font?.italic || false };
      });
    });

    addTotalHoursSheet(workbook, orderedRows, borderStyle, center);
    addRoleSummarySheet(workbook, orderedRows, borderStyle, center);

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
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
    await loadAvailableWeeks();
    if (weekKey !== currentWeek.weekKey) setSelectedWeekKey(currentWeek.weekKey);
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <button onClick={() => navigate('/home')} style={styles.backButton}>← Back to Dashboard</button>

        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Attendance</h1>
            <p style={styles.subtitle}>Daily mobile entry and weekly Excel report.</p>
          </div>
          <div style={styles.weekBox}>{weekLabel}</div>
        </div>

        <div style={styles.tabs}>
          <button
            onClick={() => setActiveView('daily')}
            style={activeView === 'daily' ? styles.activeTab : styles.tab}
          >
            Daily Entry
          </button>
          <button
            onClick={() => setActiveView('report')}
            style={activeView === 'report' ? styles.activeTab : styles.tab}
          >
            Weekly Report
          </button>
        </div>

        {activeView === 'daily' && (
          <div style={styles.grid}>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Daily Entry</h2>

              <div style={styles.formGrid}>
                <Field label="Day">
                  <select value={entryDay} onChange={(e) => setEntryDay(e.target.value)} style={styles.input}>
                    {DAYS.map((day) => <option key={day} value={day}>{day}</option>)}
                  </select>
                </Field>

                <Field label="Shift">
                  <select value={entryShift} onChange={(e) => setEntryShift(e.target.value)} style={styles.input}>
                    <option value="Day">Day</option>
                    <option value="Night">Night</option>
                  </select>
                </Field>

                <Field label="Time In">
                  <input value={timeIn} onChange={(e) => setTimeIn(e.target.value)} onBlur={() => setTimeIn(normalizeTimeValue(timeIn))} style={styles.input} />
                </Field>

                <Field label="Time Out">
                  <input value={timeOut} onChange={(e) => setTimeOut(e.target.value)} onBlur={() => setTimeOut(normalizeTimeValue(timeOut))} style={styles.input} />
                </Field>

                <Field label="Role">
                  <select value={entryRole} onChange={(e) => setEntryRole(e.target.value)} style={styles.input}>
                    {ENTRY_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                </Field>
              </div>

              <div style={styles.searchRow}>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search employee..."
                  style={{ ...styles.input, width: '100%' }}
                />
                <button onClick={clearSelected} style={styles.secondaryButton}>Clear</button>
              </div>

              <div style={styles.employeeList}>
                {filteredEmployees.map((employee) => {
                  const cleanName = normalizeName(employee.name);
                  const selected = selectedNames.includes(cleanName);
                  return (
                    <button
                      key={employee.id || cleanName}
                      onClick={() => toggleSelectedEmployee(cleanName)}
                      style={selected ? styles.employeeChipSelected : styles.employeeChip}
                    >
                      {employee.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Selected ({selectedEmployees.length})</h2>

              <div style={styles.selectedList}>
                {selectedEmployees.length === 0 ? (
                  <div style={styles.empty}>Select employees from the list.</div>
                ) : selectedEmployees.map((employee) => (
                  <div key={employee.id || employee.name} style={styles.selectedItem}>
                    <span>{employee.name}</span>
                    <button onClick={() => toggleSelectedEmployee(employee.name)} style={styles.removeButton}>Remove</button>
                  </div>
                ))}
              </div>

              <button onClick={saveDailyEntry} disabled={saving || selectedEmployees.length === 0} style={styles.saveButton}>
                {saving ? 'Saving...' : `Save ${selectedEmployees.length} Employees`}
              </button>

              <h3 style={styles.sectionTitle}>{entryDay} Saved</h3>
              <div style={styles.savedList}>
                {savedForSelectedDay.length === 0 ? (
                  <div style={styles.empty}>No records saved for this day.</div>
                ) : savedForSelectedDay.map((record) => (
                  <div key={record.id} style={styles.savedItem}>
                    <div>
                      <b>{record.name}</b>
                      <div style={styles.savedMeta}>{record.timeIn} - {record.timeOut} | {record.role}</div>
                    </div>
                    <button onClick={() => deleteRecord(record.id)} style={styles.removeButton}>Delete</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView === 'report' && (
          <div style={styles.card}>
            <div style={styles.reportHeader}>
              <div>
                <h2 style={styles.cardTitle}>Weekly Report</h2>
                <p style={styles.subtitle}>Download keeps Total Hours, Regular, OT and Role Summary.</p>
              </div>

              <select value={selectedWeekKey} onChange={(e) => setSelectedWeekKey(e.target.value)} style={styles.weekSelect}>
                {availableWeeks.map((key) => (
                  <option key={key} value={key}>{getWeekInfoFromKey(key).weekLabel}</option>
                ))}
              </select>
            </div>

            <div style={styles.reportActions}>
              <button onClick={downloadExcel} style={styles.downloadButton}>Download Excel</button>
              <button onClick={resetWeek} style={styles.dangerButton}>Reset Week</button>
            </div>

            {loading ? <div style={styles.empty}>Loading attendance...</div> : (
              <div style={styles.previewTableWrap}>
                <table style={styles.previewTable}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Employee</th>
                      <th style={styles.th}>Group</th>
                      <th style={styles.th}>Total Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getOrderedRows().map((person) => (
                      <tr key={person.name}>
                        <td style={styles.td}>{person.name}</td>
                        <td style={styles.td}>{groupLabels[getGroupKey(person)]}</td>
                        <td style={styles.tdCenter}>{getPersonTotalHours(person)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    fontFamily: 'system-ui, sans-serif',
    padding: '28px',
  },
  container: {
    maxWidth: '1120px',
    margin: '0 auto',
  },
  backButton: {
    backgroundColor: '#1e293b',
    color: '#fff',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '10px 14px',
    fontWeight: '800',
    cursor: 'pointer',
    marginBottom: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    borderBottom: '1px solid #334155',
    paddingBottom: '18px',
    marginBottom: '18px',
    flexWrap: 'wrap',
  },
  title: {
    margin: 0,
    color: '#38bdf8',
    fontSize: '2rem',
    fontWeight: '900',
  },
  subtitle: {
    margin: '6px 0 0',
    color: '#94a3b8',
  },
  weekBox: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '999px',
    padding: '8px 12px',
    color: '#cbd5e1',
    fontWeight: '800',
  },
  tabs: {
    display: 'flex',
    gap: '10px',
    marginBottom: '18px',
  },
  tab: {
    backgroundColor: '#1e293b',
    color: '#cbd5e1',
    border: '1px solid #334155',
    borderRadius: '10px',
    padding: '11px 16px',
    fontWeight: '900',
    cursor: 'pointer',
  },
  activeTab: {
    backgroundColor: '#38bdf8',
    color: '#0f172a',
    border: '1px solid #38bdf8',
    borderRadius: '10px',
    padding: '11px 16px',
    fontWeight: '900',
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 0.8fr)',
    gap: '18px',
  },
  card: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '14px',
    padding: '18px',
    boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
  },
  cardTitle: {
    margin: '0 0 14px',
    color: '#f8fafc',
    fontSize: '1.25rem',
    fontWeight: '900',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '12px',
    marginBottom: '14px',
  },
  label: {
    display: 'block',
    fontSize: '0.78rem',
    fontWeight: '900',
    color: '#cbd5e1',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    border: '1px solid #334155',
    borderRadius: '9px',
    padding: '11px',
    outline: 'none',
    fontWeight: '800',
  },
  searchRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '14px',
  },
  secondaryButton: {
    backgroundColor: '#334155',
    color: '#f8fafc',
    border: 'none',
    borderRadius: '9px',
    padding: '0 14px',
    fontWeight: '900',
    cursor: 'pointer',
  },
  employeeList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    maxHeight: '460px',
    overflow: 'auto',
    paddingRight: '4px',
  },
  employeeChip: {
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    border: '1px solid #334155',
    borderRadius: '999px',
    padding: '9px 12px',
    fontWeight: '800',
    cursor: 'pointer',
  },
  employeeChipSelected: {
    backgroundColor: '#38bdf8',
    color: '#0f172a',
    border: '1px solid #38bdf8',
    borderRadius: '999px',
    padding: '9px 12px',
    fontWeight: '900',
    cursor: 'pointer',
  },
  selectedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '260px',
    overflow: 'auto',
    marginBottom: '14px',
  },
  selectedItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '10px',
    padding: '10px',
    fontWeight: '800',
  },
  saveButton: {
    width: '100%',
    backgroundColor: '#22c55e',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '13px',
    fontWeight: '900',
    cursor: 'pointer',
    marginBottom: '18px',
  },
  removeButton: {
    backgroundColor: 'transparent',
    color: '#fca5a5',
    border: '1px solid #fca5a5',
    borderRadius: '8px',
    padding: '6px 8px',
    fontWeight: '800',
    cursor: 'pointer',
  },
  sectionTitle: {
    color: '#38bdf8',
    margin: '8px 0 10px',
  },
  savedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '320px',
    overflow: 'auto',
  },
  savedItem: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '10px',
    padding: '10px',
  },
  savedMeta: {
    color: '#94a3b8',
    marginTop: '4px',
    fontSize: '0.84rem',
    fontWeight: '800',
  },
  empty: {
    color: '#94a3b8',
    padding: '12px',
    textAlign: 'center',
    fontWeight: '800',
  },
  reportHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '14px',
    flexWrap: 'wrap',
    marginBottom: '14px',
  },
  weekSelect: {
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    border: '1px solid #334155',
    borderRadius: '9px',
    padding: '11px',
    fontWeight: '800',
  },
  reportActions: {
    display: 'flex',
    gap: '10px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  downloadButton: {
    backgroundColor: '#22c55e',
    color: '#fff',
    border: 'none',
    borderRadius: '9px',
    padding: '12px 16px',
    fontWeight: '900',
    cursor: 'pointer',
  },
  dangerButton: {
    backgroundColor: '#7f1d1d',
    color: '#fee2e2',
    border: '1px solid #ef4444',
    borderRadius: '9px',
    padding: '12px 16px',
    fontWeight: '900',
    cursor: 'pointer',
  },
  previewTableWrap: {
    overflowX: 'auto',
    border: '1px solid #334155',
    borderRadius: '10px',
  },
  previewTable: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    backgroundColor: '#0f172a',
    color: '#38bdf8',
    textAlign: 'left',
    padding: '10px',
    borderBottom: '1px solid #334155',
  },
  td: {
    padding: '10px',
    borderBottom: '1px solid #334155',
    color: '#f8fafc',
    fontWeight: '700',
  },
  tdCenter: {
    padding: '10px',
    borderBottom: '1px solid #334155',
    color: '#f8fafc',
    fontWeight: '900',
    textAlign: 'center',
  },
};
