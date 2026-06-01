import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DEFAULT_EMPLOYEES = [
  { id: 1, name: 'JOAN ENMANUEL DE LA CRUZ YNOA', active: true },
  { id: 2, name: 'SUZAN I NAYOAN', active: true },
  { id: 3, name: 'RANDY DE JESUS MIRABAK SANTOS', active: true },
  { id: 4, name: 'ODALIS DE LEON', active: true },
  { id: 5, name: 'ESMERALDA EAGLE JIMENEZ', active: true },
  { id: 6, name: 'IRMA PINEDA', active: true },
  { id: 7, name: 'JORDY VALENZUELA SMITH', active: true },
  { id: 8, name: 'TIFFANY GARCIA', active: true },
  { id: 9, name: 'JAVIER ADOLFO MOREIRA GARCES', active: true },
  { id: 10, name: 'MARIA MATOS', active: true },
  { id: 11, name: 'ALEJANDRA RANGEL', active: true },
  { id: 12, name: 'CARMEN ESPINAL RODRIGUEZ', active: true },
  { id: 13, name: 'CESAR O MOLINA MORALES', active: true },
  { id: 14, name: 'ROBELINA JIMENEZ JIMENEZ', active: true },
  { id: 15, name: 'RADHAMELIS PEREZ', active: true },
  { id: 16, name: 'YENY M SOSA', active: true },
  { id: 17, name: 'NICOL ROSARIO DE LEON', active: true },
  { id: 18, name: 'SAUDIK P FERREIRA MEDRANO', active: true },
  { id: 19, name: 'MANUEL DOLORES VILLA GONZALEZ', active: true },
  { id: 20, name: 'EFRAIN RIVERA FIGUEROA', active: true },
  { id: 21, name: 'JOSE RAMON MARTE PENA', active: true },
  { id: 22, name: 'JERSON JOSUE HEERRERA VASQUEZ', active: true },
  { id: 23, name: 'MIGUEL CEDENO AQUINO', active: true },
  { id: 24, name: 'BRUNO GABRIEL OLIVO SUNTAXI', active: true },
  { id: 25, name: 'MARTIN PEREZ OSVALDO', active: true },
  { id: 26, name: 'VICTOR GRACIANO', active: true },
  { id: 27, name: 'ALBERTO HERNANDEZ', active: true },
  { id: 28, name: 'ROMALDO PAGUAY', active: true },
  { id: 29, name: 'ARMANDO RAFAEL SIERRA MORENO', active: true },
  { id: 30, name: 'LUIS A DE LA ROSA', active: true },
  { id: 31, name: 'RAMON ANTONIO BRETON LARA', active: true },
  { id: 32, name: 'JONATHAN HERNANDEZ ANGELES', active: true },
  { id: 33, name: 'DARLYN DE JESUS ALMANZAR ANGELES', active: true },
  { id: 34, name: 'ALBERTO RODRIGUEZ GONZALEZ', active: true },
  { id: 35, name: 'MARVIN MALDONADO', active: true },
  { id: 36, name: 'LUIS ARAMIS LOPEZ GARICA', active: true },
  { id: 37, name: 'ANGEL RAFAEL NIEVES VASQUEZ', active: true },
  { id: 38, name: 'BRYAN JOSE MARTE BATISTA', active: true },
  { id: 39, name: 'ELIE FELIZ', active: true },
  { id: 40, name: 'ALBA LUZ ROMERO LAINEZ', active: true },
  { id: 41, name: 'FILOMENA POMAQUISA', active: true },
  { id: 42, name: 'LIGIA ELANA CHILLAGANA', active: true },
  { id: 43, name: 'LILIANA PATRICIA TAVAREZ', active: true },
  { id: 44, name: 'MIRLANDE NOZIL', active: true },
  { id: 45, name: 'ROSSY VALERIO CONTRERAS', active: true },
  { id: 46, name: 'PATRICIA HUARI AMAO', active: true },
  { id: 47, name: 'SANDRA JANETH OZORIO', active: true },
  { id: 48, name: 'VINELLA LAURA', active: true },
  { id: 49, name: 'YENNY ROCIO SILVA', active: true },
  { id: 50, name: 'SURIEL AMAYA', active: true },
  { id: 51, name: 'DOMINGA ALTAGRACIA JAQUEZ', active: true },
  { id: 52, name: 'JESSICA TORRES MILLA', active: true },
  { id: 53, name: 'MARIA J CONTRERAS RODRIGUEZ', active: true },
  { id: 54, name: 'YOLANDA AYALA GARCIA', active: true },
  { id: 55, name: 'ANASTACIA SAVEDRA', active: true },
  { id: 56, name: 'JENNY MINE', active: true },
  { id: 57, name: 'EVA DOMINGUEZ', active: true },
  { id: 58, name: 'JOSIANE ST. FLEUR', active: true },
  { id: 59, name: 'SARA POLANCO', active: true },
  { id: 60, name: 'DELFINA RODRIGUEZ CISNEROS', active: true },
  { id: 61, name: 'MARIA ORTEGA O.', active: true },
  { id: 62, name: 'MARIELA FRANCO', active: true },
  { id: 63, name: 'JESSICA LIZETTE SARAVIA', active: true },
  { id: 64, name: 'LUZ ALCANTARA', active: true },
  { id: 65, name: 'VIVIANA GABRIUS', active: true },
  { id: 66, name: 'MARCIA M. LOPEZ', active: true },
  { id: 67, name: 'NOEL OVALLES YNOA', active: true },
  { id: 68, name: 'JOHAN STIVEN GUZMAN OVALLES', active: true },
  { id: 69, name: 'LOURDES ESTEFANIA ORTIZ', active: true },
  { id: 70, name: 'ROCIO BEATRIZ VACACELA ORTIZ', active: true },
  { id: 71, name: 'ELIDA VENTURA', active: true },
  { id: 72, name: 'LESBY PAOLA DIAZ CASTILLO', active: true },
  { id: 73, name: 'VIVICA GARCIA', active: true },
  { id: 74, name: 'ALEXANDRO MEJIA', active: true },
  { id: 75, name: 'CARLOS GUZMAN', active: true },
  { id: 76, name: 'DIEGO FERNANDO ASMEL MATUTE', active: true },
  { id: 77, name: 'AUSTRIA ALVAREZ', active: true },
  { id: 78, name: 'OLGA RODRIGUEZ', active: true },
  { id: 79, name: 'DORIS RAMOS', active: true },
  { id: 80, name: 'RENE DAVID TERRON PADILLA', active: true },
  { id: 81, name: 'YOAN RODRIGUEZ', active: true },
  { id: 82, name: 'ERNSO JACQUES', active: true },
  { id: 83, name: 'LOREN FELIZ', active: true },
  { id: 84, name: 'EDGAR DIAZ', active: true },
  { id: 85, name: 'JESUS DONALDO RAMOS DIAZ', active: true },
  { id: 86, name: 'ELVIS MINIER FLETE', active: true },
  { id: 87, name: 'LETICIA ESMERALDA (SCANNER)', active: true },
  { id: 88, name: 'WILREDO HERRERA PINEDA', active: true },
  { id: 89, name: 'JOSE FERNANDO RAMOS', active: true },
  { id: 90, name: 'BRIAN PINEDA', active: true },
  { id: 91, name: 'STALIN TOAPANTA', active: true },
  { id: 92, name: 'CARLOS DIAZ', active: true },
];

export default function Employees() {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState(() => {
    const saved = localStorage.getItem('employees_list');
    return saved ? JSON.parse(saved) : DEFAULT_EMPLOYEES;
  });

  const [name, setName] = useState('');
  const [search, setSearch] = useState('');

  const totalEmployees = employees.length;
  const enabledEmployees = employees.filter((employee) => employee.active).length;
  const disabledEmployees = employees.filter((employee) => !employee.active).length;

  const saveEmployees = (newList) => {
    setEmployees(newList);
    localStorage.setItem('employees_list', JSON.stringify(newList));
  };

  const addEmployee = () => {
    const cleanName = name.trim().replace(/\s+/g, ' ').toUpperCase();

    if (!cleanName) return;

    const exists = employees.some((employee) => employee.name === cleanName);

    if (exists) {
      alert('This employee already exists.');
      return;
    }

    saveEmployees([
      ...employees,
      {
        id: Date.now(),
        name: cleanName,
        active: true,
      },
    ]);

    setName('');
  };

  const deleteEmployee = (id) => {
    const confirmDelete = confirm('Delete this employee?');
    if (!confirmDelete) return;

    saveEmployees(employees.filter((employee) => employee.id !== id));
  };

  const toggleEmployee = (id) => {
    saveEmployees(
      employees.map((employee) =>
        employee.id === id
          ? { ...employee, active: !employee.active }
          : employee
      )
    );
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
              Simple employee list for attendance and system modules.
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
            <span>Employee List ({filteredEmployees.length})</span>

            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
              Showing results
            </span>
          </div>

          {filteredEmployees.length === 0 ? (
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
                        {employee.active ? 'ENABLE' : 'DISABLE'}
                      </span>
                    </td>

                    <td style={tdStyle}>
                      <button
                        onClick={() => toggleEmployee(employee.id)}
                        style={softButtonStyle}
                      >
                        {employee.active ? 'Disable' : 'Enable'}
                      </button>

                      <button
                        onClick={() => deleteEmployee(employee.id)}
                        style={dangerButtonStyle}
                      >
                        Delete
                      </button>
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
  border: '1px solid #334155',
  color: '#fff',
  padding: '10px 16px',
  borderRadius: '8px',
  cursor: 'pointer',
  marginBottom: '24px',
  fontWeight: '600',
};

const headerStyle = {
  borderBottom: '1px solid #334155',
  paddingBottom: '20px',
  marginBottom: '24px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '16px',
  flexWrap: 'wrap',
};

const titleStyle = {
  fontSize: '2rem',
  fontWeight: 'bold',
  color: '#38bdf8',
  margin: 0,
};

const subtitleStyle = {
  color: '#94a3b8',
  fontSize: '0.95rem',
  marginTop: '6px',
};

const counterStyle = {
  display: 'flex',
  gap: '14px',
  flexWrap: 'wrap',
  marginTop: '10px',
  fontSize: '0.82rem',
  fontWeight: '600',
};

const counterItemStyle = {
  color: '#cbd5e1',
  backgroundColor: 'rgba(148, 163, 184, 0.08)',
  border: '1px solid rgba(148, 163, 184, 0.18)',
  padding: '5px 9px',
  borderRadius: '999px',
};

const cardStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '14px',
  padding: '22px',
  marginBottom: '20px',
};

const labelStyle = {
  display: 'block',
  marginBottom: '8px',
  color: '#cbd5e1',
  fontWeight: '700',
};

const inputStyle = {
  flex: '1',
  minWidth: '260px',
  boxSizing: 'border-box',
  backgroundColor: '#0f172a',
  color: '#f8fafc',
  border: '1px solid #334155',
  borderRadius: '10px',
  padding: '12px',
  fontSize: '1rem',
  outline: 'none',
};

const addButtonStyle = {
  backgroundColor: 'rgba(56, 189, 248, 0.14)',
  color: '#7dd3fc',
  border: '1px solid rgba(56, 189, 248, 0.35)',
  padding: '10px 16px',
  borderRadius: '10px',
  fontWeight: '800',
  cursor: 'pointer',
};


const tableContainerStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '14px',
  overflow: 'auto',
};

const tableHeaderStyle = {
  padding: '16px 20px',
  borderBottom: '1px solid #334155',
  fontWeight: '800',
  color: '#f8fafc',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '12px',
};

const emptyStyle = {
  padding: '30px',
  color: '#94a3b8',
  textAlign: 'center',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  minWidth: '720px',
};

const thStyle = {
  padding: '12px',
  color: '#cbd5e1',
  textAlign: 'left',
  borderBottom: '1px solid #334155',
};

const tdStyle = {
  padding: '12px',
  color: '#f8fafc',
  borderBottom: '1px solid #334155',
};

const softButtonStyle = {
  backgroundColor: 'rgba(148, 163, 184, 0.12)',
  color: '#cbd5e1',
  border: '1px solid rgba(148, 163, 184, 0.25)',
  borderRadius: '8px',
  padding: '7px 10px',
  fontWeight: '700',
  cursor: 'pointer',
  marginRight: '8px',
};

const dangerButtonStyle = {
  backgroundColor: 'rgba(239, 68, 68, 0.12)',
  color: '#fca5a5',
  border: '1px solid rgba(239, 68, 68, 0.35)',
  borderRadius: '8px',
  padding: '7px 10px',
  fontWeight: '700',
  cursor: 'pointer',
};