import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coffee, ArrowLeft } from 'lucide-react';

export default function BreakControl() {
  const navigate = useNavigate();

  // Cargamos los valores guardados en localStorage, o dejamos 1 por defecto
  const [systems, setSystems] = useState(() => {
    const saved = localStorage.getItem('break_systems_config');
    return saved ? JSON.parse(saved) : {
      system1: 1,
      system2: 1,
      system3: 1,
      system4: 1,
    };
  });

  // Cada vez que un número cambie, lo guardamos automáticamente en el navegador
  useEffect(() => {
    localStorage.setItem('break_systems_config', JSON.stringify(systems));
  }, [systems]);

  // Manejador para el cambio de cada menú desplegable
  const handleChange = (sysKey, value) => {
    setSystems((prev) => ({
      ...prev,
      [sysKey]: parseInt(value, 10),
    }));
  };

  return (
    <div style={{ 
      backgroundColor: '#0f172a', 
      color: '#f8fafc', 
      minHeight: '100vh', 
      fontFamily: 'system-ui, sans-serif',
      padding: '40px'
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Encabezado */}
        <header style={{ marginBottom: '40px', borderBottom: '1px solid #334155', paddingBottom: '20px' }}>
          <button 
            onClick={() => navigate('/home')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '0.95rem',
              marginBottom: '16px',
              padding: '0'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#38bdf8'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ color: '#38bdf8' }}><Coffee size={32} /></div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>Break Control Panel</h1>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '6px', margin: 0 }}>
            Select the shift break setting for each system. Changes apply immediately.
          </p>
        </header>

        {/* Grid de Sistemas con Menús Desplegables */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
          gap: '24px' 
        }}>
          {Object.keys(systems).map((sysKey, index) => {
            const sysName = `System ${index + 1}`;
            return (
              <div
                key={sysKey}
                style={{ 
                  backgroundColor: '#1e293b', 
                  padding: '32px 24px', 
                  borderRadius: '16px', 
                  border: '1px solid #334155',
                  textAlign: 'center',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              >
                <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', fontWeight: '600', color: '#f1f5f9' }}>
                  {sysName}
                </h3>
                
                {/* Menú Desplegable Estilizado */}
                <select
                  value={systems[sysKey]}
                  onChange={(e) => handleChange(sysKey, e.target.value)}
                  style={{
                    width: '100%',
                    maxWidth: '120px',
                    height: '42px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#38bdf8',
                    fontSize: '1.15rem',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    outline: 'none',
                    cursor: 'pointer',
                    padding: '0 10px'
                  }}
                >
                  <option value="1" style={{ backgroundColor: '#1e293b', color: '#fff' }}>1</option>
                  <option value="2" style={{ backgroundColor: '#1e293b', color: '#fff' }}>2</option>
                  <option value="3" style={{ backgroundColor: '#1e293b', color: '#fff' }}>3</option>
                  <option value="4" style={{ backgroundColor: '#1e293b', color: '#fff' }}>4</option>
                </select>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}