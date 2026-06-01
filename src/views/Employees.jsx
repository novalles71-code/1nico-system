import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const DEFAULT_EMPLOYEES = [
  { name: 'JOAN ENMANUEL DE LA CRUZ YNOA', active: true },
  { name: 'SUZAN I NAYOAN', active: true },
  { name: 'RANDY DE JESUS MIRABAK SANTOS', active: true },
  { name: 'ODALIS DE LEON', active: true },
  { name: 'ESMERALDA EAGLE JIMENEZ', active: true },
  { name: 'IRMA PINEDA', active: true },
  { name: 'JORDY VALENZUELA SMITH', active: true },
  { name: 'TIFFANY GARCIA', active: true },
  { name: 'JAVIER ADOLFO MOREIRA GARCES', active: true },
  { name: 'MARIA MATOS', active: true },
  { name: 'ALEJANDRA RANGEL', active: true },
  { name: 'CARMEN ESPINAL RODRIGUEZ', active: true },
  { name: 'CESAR O MOLINA MORALES', active: true },
  { name: 'ROBELINA JIMENEZ JIMENEZ', active: true },
  { name: 'RADHAMELIS PEREZ', active: true },
  { name: 'YENY M SOSA', active: true },
  { name: 'NICOL ROSARIO DE LEON', active: true },
  { name: 'SAUDIK P FERREIRA MEDRANO', active: true },
  { name: 'MANUEL DOLORES VILLA GONZALEZ', active: true },
  { name: 'EFRAIN RIVERA FIGUEROA', active: true },
  { name: 'JOSE RAMON MARTE PENA', active: true },
  { name: 'JERSON JOSUE HEERRERA VASQUEZ', active: true },
  { name: 'MIGUEL CEDENO AQUINO', active: true },
  { name: 'BRUNO GABRIEL OLIVO SUNTAXI', active: true },
  { name: 'MARTIN PEREZ OSVALDO', active: true },
  { name: 'VICTOR GRACIANO', active: true },
  { name: 'ALBERTO HERNANDEZ', active: true },
  { name: 'ROMALDO PAGUAY', active: true },
  { name: 'ARMANDO RAFAEL SIERRA MORENO', active: true },
  { name: 'LUIS A DE LA ROSA', active: true },
  { name: 'RAMON ANTONIO BRETON LARA', active: true },
  { name: 'JONATHAN HERNANDEZ ANGELES', active: true },
  { name: 'DARLYN DE JESUS ALMANZAR ANGELES', active: true },
  { name: 'ALBERTO RODRIGUEZ GONZALEZ', active: true },
  { name: 'MARVIN MALDONADO', active: true },
  { name: 'LUIS ARAMIS LOPEZ GARICA', active: true },
  { name: 'ANGEL RAFAEL NIEVES VASQUEZ', active: true },
  { name: 'BRYAN JOSE MARTE BATISTA', active: true },
  { name: 'ELIE FELIZ', active: true },
  { name: 'ALBA LUZ ROMERO LAINEZ', active: true },
  { name: 'FILOMENA POMAQUISA', active: true },
  { name: 'LIGIA ELANA CHILLAGANA', active: true },
  { name: 'LILIANA PATRICIA TAVAREZ', active: true },
  { name: 'MIRLANDE NOZIL', active: true },
  { name: 'ROSSY VALERIO CONTRERAS', active: true },
  { name: 'PATRICIA HUARI AMAO', active: true },
  { name: 'SANDRA JANETH OZORIO', active: true },
  { name: 'VINELLA LAURA', active: true },
  { name: 'YENNY ROCIO SILVA', active: true },
  { name: 'SURIEL AMAYA', active: true },
  { name: 'DOMINGA ALTAGRACIA JAQUEZ', active: true },
  { name: 'JESSICA TORRES MILLA', active: true },
  { name: 'MARIA J CONTRERAS RODRIGUEZ', active: true },
  { name: 'YOLANDA AYALA GARCIA', active: true },
  { name: 'ANASTACIA SAVEDRA', active: true },
  { name: 'JENNY MINE', active: true },
  { name: 'EVA DOMINGUEZ', active: true },
  { name: 'JOSIANE ST. FLEUR', active: true },
  { name: 'SARA POLANCO', active: true },
  { name: 'DELFINA RODRIGUEZ CISNEROS', active: true },
  { name: 'MARIA ORTEGA O.', active: true },
  { name: 'MARIELA FRANCO', active: true },
  { name: 'JESSICA LIZETTE SARAVIA', active: true },
  { name: 'LUZ ALCANTARA', active: true },
  { name: 'VIVIANA GABRIUS', active: true },
  { name: 'MARCIA M. LOPEZ', active: true },
  { name: 'NOEL OVALLES YNOA', active: true },
  { name: 'JOHAN STIVEN GUZMAN OVALLES', active: true },
  { name: 'LOURDES ESTEFANIA ORTIZ', active: true },
  { name: 'ROCIO BEATRIZ VACACELA ORTIZ', active: true },
  { name: 'ELIDA VENTURA', active: true },
  { name: 'LESBY PAOLA DIAZ CASTILLO', active: true },
  { name: 'VIVICA GARCIA', active: true },
  { name: 'ALEXANDRO MEJIA', active: true },
  { name: 'CARLOS GUZMAN', active: true },
  { name: 'DIEGO FERNANDO ASMEL MATUTE', active: true },
  { name: 'AUSTRIA ALVAREZ', active: true },
  { name: 'OLGA RODRIGUEZ', active: true },
  { name: 'DORIS RAMOS', active: true },
  { name: 'RENE DAVID TERRON PADILLA', active: true },
  { name: 'YOAN RODRIGUEZ', active: true },
  { name: 'ERNSO JACQUES', active: true },
  { name: 'LOREN FELIZ', active: true },
  { name: 'EDGAR DIAZ', active: true },
  { name: 'JESUS DONALDO RAMOS DIAZ', active: true },
  { name: 'ELVIS MINIER FLETE', active: true },
  { name: 'LETICIA ESMERALDA (SCANNER)', active: true },
  { name: 'WILREDO HERRERA PINEDA', active: true },
  { name: 'JOSE FERNANDO RAMOS', active: true },
  { name: 'BRIAN PINEDA', active: true },
  { name: 'STALIN TOAPANTA', active: true },
  { name: 'CARLOS DIAZ', active: true },
];

function cleanEmployeeName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
}

export default function Employees() {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

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

    if (!data || data.length === 0) {
      const { error: insertError } = await supabase
        .from('employees')
        .insert(DEFAULT_EMPLOYEES);

      if (insertError) {
        console.error('Default employees insert error:', insertError);
        alert('Unable to create default employees.');
        setLoading(false);
        return;
      }

      const { data: newData, error: reloadError } = await supabase
        .from('employees')
        .select('*')
        .order('name', { ascending: true });

      if (reloadError) {
        console.error('Reload employees error:', reloadError);
        alert('Unable to reload employees.');
        setLoading(false);
        return;
      }

      setEmployees(newData || []);
      setLoading(false);
      return;
    }

    setEmployees(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const addEmployee = async () => {
    const cleanName = cleanEmployeeName(name);

    if (!cleanName) return;

    const exists = employees.some((employee) => employee.name === cleanName);

    if (exists) {
      alert('This employee already exists.');
      return;
    }

    const { error } = await supabase.from('employees').insert({
      name: cleanName,
      active: true,
    });

    if (error) {
      console.error('Add employee error:', error);
      alert('Unable to add employee.');
      return;
    }

    setName('');
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

  const filteredEmployees = employees.filter((employee) =>
    employee.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      style={{
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif',
        padding: '40px',
      }}
    >
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
        </div>

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
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredEmployees.map((employee, index) => (
                  <tr key={employee.id}>
                    <td style={tdStyle}>{index + 1}</td>

                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: '800',
                        opacity: employee.active ? 1 : 0.45,
                      }}
                    >
                      {employee.name}
                    </td>

                    <td style={tdStyle}>
                      <span
                        style={{
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
                        }}
                      >
                        {employee.active ? 'Enable' : 'Disable'}
                      </span>
                    </td>

                    <td style={tdStyle}>
                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                          justifyContent: 'center',
                          flexWrap: 'wrap',
                        }}
                      >
                        <button
                          onClick={() =>
                            toggleEmployee(employee.id, employee.active)
                          }
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

const emptyStyle = {
  padding: '28px',
  textAlign: 'center',
  color: '#94a3b8',
  fontWeight: '700',
};