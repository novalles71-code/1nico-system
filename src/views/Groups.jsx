import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ArrowLeft } from 'lucide-react';

export default function Groups() {
  const navigate = useNavigate();

  // Cargamos los datos compartidos. Si están vacíos inicializamos una matriz limpia.
  const [groupsData, setGroupsData] = useState(() => {
    const saved = localStorage.getItem('workgroups_systems_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Nos aseguramos de que cada sistema tenga al menos un campo de texto inicializable
      return {
        system1: parsed.system1 && parsed.system1.length ? parsed.system1 : [''],
        system2: parsed.system2 && parsed.system2.length ? parsed.system2 : [''],
        system3: parsed.system3 && parsed.system3.length ? parsed.system3 : [''],
        system4: parsed.system4 && parsed.system4.length ? parsed.system4 : [''],
      };
    }
    return {
      system1: [''],
      system2: [''],
      system3: [''],
      system4: ['']
    };
  });

  // Guardar automáticamente en el LocalStorage compartido cada vez que cambie la matriz
  useEffect(() => {
    localStorage.setItem('workgroups_systems_data', JSON.stringify(groupsData));
  }, [groupsData]);

  // Manejador del cambio de texto por celda individual
  const handleCellChange = (systemKey, index, value) => {
    setGroupsData(prev => ({
      ...prev,
      [systemKey]: prev[systemKey].map((member, i) => i === index ? value.toUpperCase() : member)
    }));
  };

  // Lógica de navegación y auto-expansión al presionar Enter
  const handleKeyDown = (e, systemKey, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentSystemMembers = groupsData[systemKey];

      // Si presionas enter en la última celda y no está vacía, añadimos una nueva fila al final de esa columna
      if (index === currentSystemMembers.length - 1 && currentSystemMembers[index].trim() !== '') {
        setGroupsData(prev => ({
          ...prev,
          [systemKey]: [...prev[systemKey], '']
        }));

        // Hacemos focus automático al nuevo input creado abajo
        setTimeout(() => {
          const nextInput = document.getElementById(`input-${systemKey}-${index + 1}`);
          if (nextInput) nextInput.focus();
        }, 30);
      } else {
        // Si no es la última, simplemente saltamos el foco a la celda de abajo
        const nextInput = document.getElementById(`input-${systemKey}-${index + 1}`);
        if (nextInput) nextInput.focus();
      }
    }
  };

  const systems = [
    { key: 'system1', label: 'SYSTEM 1' },
    { key: 'system2', label: 'SYSTEM 2' },
    { key: 'system3', label: 'SYSTEM 3' },
    { key: 'system4', label: 'SYSTEM 4' }
  ];

  // Calculamos dinámicamente cuál de las columnas es la más larga para renderizar las filas necesarias
  const maxRows = Math.max(
    groupsData.system1.length,
    groupsData.system2.length,
    groupsData.system3.length,
    groupsData.system4.length,
    12 // Mínimo de filas base para que parezca una hoja de cálculo real desde el inicio
  );

  return (
    <div style={{ backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', padding: '40px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Botón de regreso */}
        <button 
          onClick={() => navigate('/home')} 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', marginBottom: '24px', fontWeight: '500' }}
        >
          <ArrowLeft size={18} /> Back to Dashboard
        </button>

        {/* Bloque del Panel */}
        <section style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
            <Users size={28} color="#38bdf8" />
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '700', margin: 0, color: '#38bdf8' }}>Master Group Worksheet</h2>
              <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>Escribe los nombres directamente sobre la celda. Presiona <kbd style={{ background: '#0f172a', padding: '2px 4px', borderRadius: '4px', border: '1px solid #475569' }}>Enter</kbd> para avanzar o agregar más filas.</p>
            </div>
          </div>

          {/* CUADRÍCULA ESTILO EXCEL / GOOGLE SHEETS */}
          <div style={{ overflowX: 'auto', borderRadius: '6px', border: '1px solid #334155' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '900px', backgroundColor: '#1e293b', fontSize: '10pt' }}>
              
              {/* Cabecera de Letras de Columnas */}
              <thead>
                <tr style={{ backgroundColor: '#0f172a' }}>
                  <th style={{ width: '45px', height: '28px', border: '1px solid #334155' }}></th>
                  <th style={{ border: '1px solid #334155', color: '#38bdf8', fontWeight: '600', textAlign: 'center', letterSpacing: '0.5px' }}>A</th>
                  <th style={{ border: '1px solid #334155', color: '#38bdf8', fontWeight: '600', textAlign: 'center', letterSpacing: '0.5px' }}>B</th>
                  <th style={{ border: '1px solid #334155', color: '#38bdf8', fontWeight: '600', textAlign: 'center', letterSpacing: '0.5px' }}>C</th>
                  <th style={{ border: '1px solid #334155', color: '#38bdf8', fontWeight: '600', textAlign: 'center', letterSpacing: '0.5px' }}>D</th>
                </tr>
              </thead>

              <tbody>
                {/* FILA 1: Títulos de los Sistemas */}
                <tr style={{ backgroundColor: '#111827' }}>
                  <td style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#64748b', textAlign: 'center', fontWeight: 'bold', fontSize: '9pt' }}>1</td>
                  {systems.map((sys) => (
                    <td key={sys.key} style={{ border: '1px solid #334155', padding: '8px', fontWeight: 'bold', color: '#fff', fontSize: '9.5pt' }}>
                      {sys.label}
                    </td>
                  ))}
                </tr>

                {/* FILA 2: Separador en blanco */}
                <tr>
                  <td style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#64748b', textAlign: 'center', fontSize: '9pt' }}>2</td>
                  <td style={{ border: '1px solid #334155', backgroundColor: '#1e293b' }}></td>
                  <td style={{ border: '1px solid #334155', backgroundColor: '#1e293b' }}></td>
                  <td style={{ border: '1px solid #334155', backgroundColor: '#1e293b' }}></td>
                  <td style={{ border: '1px solid #334155', backgroundColor: '#1e293b' }}></td>
                </tr>

                {/* FILAS SIGUIENTES: Cuerpo de entradas dinámicas */}
                {Array.from({ length: maxRows }).map((_, rowIndex) => {
                  const excelRowNumber = rowIndex + 3; // Mapeo de la numeración de filas virtuales

                  return (
                    <tr key={rowIndex}>
                      {/* Indicador de número de fila izquierdo gris oscuro */}
                      <td style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#64748b', textAlign: 'center', fontWeight: '500', fontSize: '9pt', userSelect: 'none' }}>
                        {excelRowNumber}
                      </td>

                      {/* Mapeo de inputs por columnas */}
                      {systems.map((sys) => {
                        const memberValue = groupsData[sys.key][rowIndex] ?? "";
                        const isCellAvailable = rowIndex < groupsData[sys.key].length;

                        return (
                          <td key={sys.key} style={{ border: '1px solid #334155', padding: 0, backgroundColor: isCellAvailable ? '#0f172a' : '#1e293b' }}>
                            {isCellAvailable ? (
                              <input
                                id={`input-${sys.key}-${rowIndex}`}
                                type="text"
                                value={memberValue}
                                placeholder="..."
                                onChange={(e) => handleCellChange(sys.key, rowIndex, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, sys.key, rowIndex)}
                                style={{
                                  width: '100%',
                                  boxSizing: 'border-box',
                                  backgroundColor: 'transparent',
                                  color: '#fff',
                                  border: 'none',
                                  padding: '8px 12px',
                                  fontSize: '10pt',
                                  outline: 'none',
                                  fontFamily: 'monospace',
                                  textTransform: 'uppercase'
                                }}
                              />
                            ) : (
                              // Si esta columna es más corta, renderizamos la celda de la rejilla vacía bloqueada
                              <div style={{ height: '33px' }} />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </section>
      </div>
    </div>
  );
}