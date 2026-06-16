import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { readEmployeesFromExcel, cleanEmployeeName } from '../utils/excelEmployees';

const DEFAULT_EMPLOYEES = [];

export default function Employees() {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncPreview, setSyncPreview] = useState(null);

  const totalEmployees = employees.length;
  const enabledEmployees = employees.filter((employee) => employee.active).length;
  const disabledEmployees = employees.filter((employee) => !employee.active).length;

  const loadEmployees = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Load employees error:', error);
      alert('Unable to load employees.');
      setLoading(false);
      return;
    }

    if ((!data || data.length === 0) && DEFAULT_EMPLOYEES.length > 0) {
      const { error: insertError } = await supabase
        .from('employees')
        .insert(DEFAULT_EMPLOYEES);

      if (insertError) {
        console.error('Default employees insert error:', insertError);
        alert('Unable to create default employees.');
        setLoading(false);
        return;
      }

      await loadEmployees();
      return;
    }

    setEmployees(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleExcelUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    setSyncing(true);

    try {
      const excelEmployees = await readEmployeesFromExcel(file);

      if (excelEmployees.length === 0) {
        alert('No employee names found in this Excel.');
        setSyncing(false);
        return;
      }

      const { data: currentEmployees, error } = await supabase
        .from('employees')
        .select('*');

      if (error) {
        console.error('Read employees error:', error);
        alert('Unable to read employees from Supabase.');
        setSyncing(false);
        return;
      }

      const currentList = currentEmployees || [];

      const excelNameSet = new Set(
        excelEmployees.map((employee) => employee.name)
      );

      const currentNameSet = new Set(
        currentList.map((employee) => cleanEmployeeName(employee.name))
      );

      const toAdd = excelEmployees.filter(
        (employee) => !currentNameSet.has(employee.name)
      );

      const toDelete = currentList.filter(
        (employee) => !excelNameSet.has(cleanEmployeeName(employee.name))
      );

      const toUpdateGender = currentList.filter((employee) => {
        const cleanName = cleanEmployeeName(employee.name);
        const match = excelEmployees.find((item) => item.name === cleanName);

        return match && match.gender && !employee.gender;
      });

      setSyncPreview({
        fileName: file.name,
        excelEmployees,
        toAdd,
        toDelete,
        toUpdateGender,
      });
    } catch (error) {
      console.error('Excel read error:', error);
      alert('Unable to read Excel file.');
    }

    setSyncing(false);
  };

  const confirmExcelSync = async () => {
    if (!syncPreview) return;

    const confirmSync = confirm(
      `Confirm Excel Sync?\n\n` +
      `File: ${syncPreview.fileName}\n` +
      `Add: ${syncPreview.toAdd.length}\n` +
      `Delete: ${syncPreview.toDelete.length}\n` +
      `Gender update: ${syncPreview.toUpdateGender.length}\n\n` +
      `Continue?`
    );

    if (!confirmSync) return;

    setSyncing(true);

    if (syncPreview.toAdd.length > 0) {
      const { error } = await supabase.from('employees').insert(
        syncPreview.toAdd.map((employee) => ({
          name: employee.name,
          active: true,
          gender: employee.gender || null,
        }))
      );

      if (error) {
        console.error('Insert sync error:', error);
        alert('Unable to add employees.');
        setSyncing(false);
        return;
      }
    }

    if (syncPreview.toDelete.length > 0) {
      const ids = syncPreview.toDelete.map((employee) => employee.id);

      const { error } = await supabase
        .from('employees')
        .delete()
        .in('id', ids);

      if (error) {
        console.error('Delete sync error:', error);
        alert('Unable to delete employees.');
        setSyncing(false);
        return;
      }
    }

    for (const employee of syncPreview.toUpdateGender) {
      const cleanName = cleanEmployeeName(employee.name);
      const match = syncPreview.excelEmployees.find(
        (item) => item.name === cleanName
      );

      if (match?.gender) {
        await supabase
          .from('employees')
          .update({ gender: match.gender })
          .eq('id', employee.id);
      }
    }

    setSyncPreview(null);
    await loadEmployees();
    setSyncing(false);

    alert('Employee sync complete.');
  };

  const addEmployee = async () => {
    const cleanName = cleanEmployeeName(name);

    if (!cleanName) return;

    const exists = employees.some(
      (employee) => cleanEmployeeName(employee.name) === cleanName
    );

    if (exists) {
      alert('This employee already exists.');
      return;
    }

    const { error } = await supabase.from('employees').insert({
      name: cleanName,
      active: true,
      gender: gender || null,
    });

    if (error) {
      console.error('Add employee error:', error);
      alert('Unable to add employee.');
      return;
    }

    setName('');
    setGender('');
    await loadEmployees();
  };

  const deleteEmployee = async (id) => {
    const confirmDelete = confirm('Delete this employee?');
    if (!confirmDelete) return;

    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete employee error:', error);
      alert('Unable to delete employee.');
      return;
    }

    await loadEmployees();
  };

  const toggleEmployee = async (id, currentActive) => {
    const { error } = await supabase
      .from('employees')
      .update({ active: !currentActive })
      .eq('id', id);

    if (error) {
      console.error('Toggle employee error:', error);
      alert('Unable to update employee.');
      return;
    }

    await loadEmployees();
  };

  const updateEmployeeGender = async (id, nextGender) => {
    const { error } = await supabase
      .from('employees')
      .update({ gender: nextGender || null })
      .eq('id', id);

    if (error) {
      console.error('Update employee gender error:', error);
      alert('Unable to update employee gender.');
      return;
    }

    await loadEmployees();
  };

  const filteredEmployees = employees.filter((employee) =>
    employee.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <button onClick={() => navigate('/home')} style={backButtonStyle}>
          ← Back to Dashboard
        </button>

        <div style={headerStyle}>
          <div>
            <h1 style={titleStyle}>Employees</h1>

            <p style={subtitleStyle}>
              Employee list connected to Supabase.
            </p>

            <div style={counterStyle}>
              <span style={counterItemStyle}>
                Total: <strong>{totalEmployees}</strong>
              </span>

              <span style={{ ...counterItemStyle, color: '#86efac' }}>
                Enable: <strong>{enabledEmployees}</strong>
              </span>

              <span style={{ ...counterItemStyle, color: '#fca5a5' }}>
                Disable: <strong>{disabledEmployees}</strong>
              </span>
            </div>
          </div>

          <div>
            <input
              id="employee-excel-upload"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleExcelUpload}
              style={{ display: 'none' }}
            />

            <button
              onClick={() => document.getElementById('employee-excel-upload')?.click()}
              disabled={syncing}
              style={{
                ...syncButtonStyle,
                opacity: syncing ? 0.6 : 1,
                cursor: syncing ? 'not-allowed' : 'pointer',
              }}
            >
              {syncing ? 'Reading Excel...' : 'Upload & Sync Excel'}
            </button>
          </div>
        </div>

        {syncPreview && (
          <div style={previewCardStyle}>
            <div style={previewHeaderStyle}>
              <div>
                <h2 style={{ margin: 0, color: '#f8fafc' }}>Excel Sync Preview</h2>
                <p style={{ margin: '6px 0 0', color: '#94a3b8' }}>
                  File: {syncPreview.fileName}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setSyncPreview(null)} style={cancelButtonStyle}>
                  Cancel
                </button>

                <button onClick={confirmExcelSync} style={confirmButtonStyle}>
                  Confirm Sync
                </button>
              </div>
            </div>

            <div style={previewGridStyle}>
              <div style={previewBoxStyle}>
                <strong style={{ color: '#86efac' }}>
                  Add: {syncPreview.toAdd.length}
                </strong>

                <div style={previewListStyle}>
                  {syncPreview.toAdd.slice(0, 8).map((item) => (
                    <div key={item.name}>{item.name}</div>
                  ))}
                  {syncPreview.toAdd.length > 8 && <div>...</div>}
                </div>
              </div>

              <div style={previewBoxStyle}>
                <strong style={{ color: '#fca5a5' }}>
                  Delete: {syncPreview.toDelete.length}
                </strong>

                <div style={previewListStyle}>
                  {syncPreview.toDelete.slice(0, 8).map((item) => (
                    <div key={item.id}>{item.name}</div>
                  ))}
                  {syncPreview.toDelete.length > 8 && <div>...</div>}
                </div>
              </div>

              <div style={previewBoxStyle}>
                <strong style={{ color: '#38bdf8' }}>
                  Gender Update: {syncPreview.toUpdateGender.length}
                </strong>

                <div style={previewListStyle}>
                  {syncPreview.toUpdateGender.slice(0, 8).map((item) => (
                    <div key={item.id}>{item.name}</div>
                  ))}
                  {syncPreview.toUpdateGender.length > 8 && <div>...</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={cardStyle}>
          <label style={labelStyle}>Employee Name</label>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addEmployee();
              }}
              placeholder="TYPE EMPLOYEE NAME..."
              style={inputStyle}
            />

            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              style={{ ...inputStyle, flex: '0 0 170px', minWidth: '170px' }}
            >
              <option value="">Gender...</option>
              <option value="F">Female</option>
              <option value="M">Male</option>
            </select>

            <button onClick={addEmployee} style={addButtonStyle}>
              + Add
            </button>
          </div>
        </div>

        <div style={cardStyle}>
          <label style={labelStyle}>Search</label>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="SEARCH EMPLOYEE..."
            style={{ ...inputStyle, width: '100%' }}
          />
        </div>

        <div style={tableContainerStyle}>
          <div style={tableHeaderStyle}>
            <span>
              Employee List ({loading ? 'Loading...' : filteredEmployees.length})
            </span>

            <button onClick={loadEmployees} style={refreshButtonStyle}>
              Refresh
            </button>
          </div>

          {loading ? (
            <div style={emptyStyle}>Loading employees...</div>
          ) : filteredEmployees.length === 0 ? (
            <div style={emptyStyle}>No employees found.</div>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Employee</th>
                  <th style={thStyle}>Gender</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredEmployees.map((employee, index) => (
                  <tr key={employee.id}>
                    <td style={tdStyle}>{index + 1}</td>

                    <td style={{
                      ...tdStyle,
                      fontWeight: '800',
                      opacity: employee.active ? 1 : 0.45,
                    }}>
                      {employee.name}
                    </td>

                    <td style={tdStyle}>
                      <select
                        value={employee.gender || ''}
                        onChange={(e) => updateEmployeeGender(employee.id, e.target.value)}
                        style={genderSelectStyle}
                      >
                        <option value="">--</option>
                        <option value="F">Female</option>
                        <option value="M">Male</option>
                      </select>
                    </td>

                    <td style={tdStyle}>
                      <span style={{
                        padding: '5px 10px',
                        borderRadius: '999px',
                        fontWeight: '800',
                        fontSize: '0.75rem',
                        backgroundColor: employee.active
                          ? 'rgba(34, 197, 94, 0.12)'
                          : 'rgba(239, 68, 68, 0.12)',
                        color: employee.active ? '#86efac' : '#fca5a5',
                        border: employee.active
                          ? '1px solid rgba(34, 197, 94, 0.35)'
                          : '1px solid rgba(239, 68, 68, 0.35)',
                      }}>
                        {employee.active ? 'Enable' : 'Disable'}
                      </span>
                    </td>

                    <td style={tdStyle}>
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                      }}>
                        <button
                          onClick={() => toggleEmployee(employee.id, employee.active)}
                          style={{
                            ...smallButtonStyle,
                            color: employee.active ? '#fbbf24' : '#86efac',
                            borderColor: employee.active ? '#fbbf24' : '#86efac',
                          }}
                        >
                          {employee.active ? 'Disable' : 'Enable'}
                        </button>

                        <button
                          onClick={() => deleteEmployee(employee.id)}
                          style={{
                            ...smallButtonStyle,
                            color: '#fca5a5',
                            borderColor: '#fca5a5',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

const pageStyle = {
  backgroundColor: '#0f172a',
  color: '#f8fafc',
  minHeight: '100vh',
  fontFamily: 'system-ui, sans-serif',
  padding: '40px',
};

const backButtonStyle = {
  backgroundColor: '#1e293b',
  color: '#fff',
  border: '1px solid #334155',
  padding: '10px 16px',
  borderRadius: '8px',
  cursor: 'pointer',
  marginBottom: '28px',
  fontWeight: '800',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '24px',
  borderBottom: '1px solid #334155',
  paddingBottom: '20px',
  gap: '16px',
};

const titleStyle = {
  margin: 0,
  color: '#38bdf8',
  fontSize: '2rem',
};

const subtitleStyle = {
  color: '#94a3b8',
  marginTop: '6px',
};

const counterStyle = {
  display: 'flex',
  gap: '12px',
  marginTop: '12px',
  flexWrap: 'wrap',
};

const counterItemStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  color: '#cbd5e1',
  padding: '6px 10px',
  borderRadius: '999px',
  fontSize: '0.78rem',
  fontWeight: '800',
};

const syncButtonStyle = {
  backgroundColor: '#38bdf8',
  color: '#0f172a',
  border: 'none',
  borderRadius: '8px',
  padding: '12px 16px',
  fontWeight: '900',
};

const previewCardStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid #38bdf8',
  borderRadius: '14px',
  padding: '18px',
  marginBottom: '18px',
};

const previewHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '14px',
  marginBottom: '16px',
};

const previewGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '12px',
};

const previewBoxStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '10px',
  padding: '12px',
};

const previewListStyle = {
  color: '#cbd5e1',
  fontSize: '0.78rem',
  marginTop: '8px',
  lineHeight: 1.6,
  maxHeight: '150px',
  overflow: 'auto',
};

const cancelButtonStyle = {
  backgroundColor: '#334155',
  color: '#f8fafc',
  border: 'none',
  borderRadius: '8px',
  padding: '10px 12px',
  fontWeight: '900',
  cursor: 'pointer',
};

const confirmButtonStyle = {
  backgroundColor: '#22c55e',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  padding: '10px 12px',
  fontWeight: '900',
  cursor: 'pointer',
};

const cardStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '14px',
  padding: '18px',
  marginBottom: '18px',
};

const labelStyle = {
  display: 'block',
  color: '#cbd5e1',
  fontSize: '0.85rem',
  fontWeight: '800',
  marginBottom: '8px',
};

const inputStyle = {
  flex: 1,
  minWidth: '260px',
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  color: '#f8fafc',
  padding: '12px',
  borderRadius: '8px',
  outline: 'none',
  fontWeight: '700',
};

const addButtonStyle = {
  backgroundColor: '#22c55e',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  padding: '12px 18px',
  fontWeight: '900',
  cursor: 'pointer',
};

const refreshButtonStyle = {
  backgroundColor: '#0f172a',
  color: '#38bdf8',
  border: '1px solid #334155',
  borderRadius: '8px',
  padding: '8px 12px',
  fontWeight: '900',
  cursor: 'pointer',
};

const tableContainerStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '14px',
  overflow: 'hidden',
};

const tableHeaderStyle = {
  padding: '16px 18px',
  borderBottom: '1px solid #334155',
  fontWeight: '900',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '12px',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
};

const thStyle = {
  padding: '13px',
  color: '#cbd5e1',
  fontSize: '0.82rem',
  textAlign: 'center',
};

const tdStyle = {
  padding: '13px',
  borderTop: '1px solid #334155',
  color: '#f8fafc',
  textAlign: 'center',
};

const smallButtonStyle = {
  backgroundColor: 'transparent',
  border: '1px solid',
  borderRadius: '8px',
  padding: '7px 10px',
  fontWeight: '900',
  cursor: 'pointer',
};

const genderSelectStyle = {
  backgroundColor: '#0f172a',
  color: '#f8fafc',
  border: '1px solid #334155',
  borderRadius: '8px',
  padding: '7px 10px',
  fontWeight: '800',
  outline: 'none',
};

const emptyStyle = {
  padding: '28px',
  textAlign: 'center',
  color: '#94a3b8',
  fontWeight: '700',
};