import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Employees() {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState(() => {
    const saved = localStorage.getItem('employees_list');
    return saved ? JSON.parse(saved) : [];
  });

  const [name, setName] = useState('');

  const saveEmployees = (newList) => {
    setEmployees(newList);
    localStorage.setItem('employees_list', JSON.stringify(newList));
  };

  const addEmployee = () => {
    const cleanName = name.trim().toUpperCase();

    if (!cleanName) return;

    const exists = employees.some(
      (employee) => employee.name === cleanName
    );

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
        <button
          onClick={() => navigate('/home')}
          style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            color: '#fff',
            padding: '10px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            marginBottom: '24px',
            fontWeight: '600',
          }}
        >
          ← Back to Dashboard
        </button>

        <div
          style={{
            borderBottom: '1px solid #334155',
            paddingBottom: '20px',
            marginBottom: '24px',
          }}
        >
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#38bdf8',
              margin: 0,
            }}
          >
            Employees
          </h1>

          <p
            style={{
              color: '#94a3b8',
              fontSize: '0.95rem',
              marginTop: '6px',
            }}
          >
            Register employees used by attendance and system modules.
          </p>
        </div>

        <div
          style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
          }}
        >
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              color: '#cbd5e1',
              fontWeight: '700',
            }}
          >
            Employee Name
          </label>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addEmployee();
              }}
              placeholder="TYPE EMPLOYEE NAME..."
              style={{
                flex: '1',
                minWidth: '260px',
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '1rem',
                outline: 'none',
              }}
            />

            <button
              onClick={addEmployee}
              style={{
                backgroundColor: '#38bdf8',
                color: '#0f172a',
                border: 'none',
                padding: '12px 18px',
                borderRadius: '8px',
                fontWeight: '800',
                cursor: 'pointer',
              }}
            >
              Add Employee
            </button>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #334155',
              fontWeight: '800',
              color: '#f8fafc',
            }}
          >
            Employee List ({employees.length})
          </div>

          {employees.length === 0 ? (
            <div
              style={{
                padding: '30px',
                color: '#94a3b8',
                textAlign: 'center',
              }}
            >
              No employees registered yet.
            </div>
          ) : (
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#0f172a' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Employee</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>

              <tbody>
                {employees.map((employee, index) => (
                  <tr key={employee.id}>
                    <td style={tdStyle}>{index + 1}</td>

                    <td style={{ ...tdStyle, fontWeight: '800' }}>
                      {employee.name}
                    </td>

                    <td style={tdStyle}>
                      <span
                        style={{
                          padding: '6px 12px',
                          borderRadius: '999px',
                          fontWeight: '800',
                          fontSize: '0.8rem',
                          backgroundColor: employee.active
                            ? '#dcfce7'
                            : '#fee2e2',
                          color: employee.active ? '#166534' : '#991b1b',
                        }}
                      >
                        {employee.active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>

                    <td style={tdStyle}>
                      <button
                        onClick={() => toggleEmployee(employee.id)}
                        style={{
                          backgroundColor: employee.active
                            ? '#facc15'
                            : '#22c55e',
                          color: '#0f172a',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '7px 10px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          marginRight: '8px',
                        }}
                      >
                        {employee.active ? 'Disable' : 'Enable'}
                      </button>

                      <button
                        onClick={() => deleteEmployee(employee.id)}
                        style={{
                          backgroundColor: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '7px 10px',
                          fontWeight: '800',
                          cursor: 'pointer',
                        }}
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