import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coffee, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function BreakControl() {
  const navigate = useNavigate();

  const [systems, setSystems] = useState({
    system1: 1,
    system2: 1,
    system3: 1,
    system4: 1,
  });

  useEffect(() => {
    const loadConfig = async () => {
      const { data, error } = await supabase
        .from('break_config')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) {
        console.error('Load break config error:', error);
        return;
      }

      setSystems({
        system1: data.system1,
        system2: data.system2,
        system3: data.system3,
        system4: data.system4,
      });
    };

    loadConfig();

    const channel = supabase
      .channel('break-control-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'break_config' },
        loadConfig
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleChange = async (sysKey, value) => {
    const numberValue = parseInt(value, 10);

    setSystems((prev) => ({
      ...prev,
      [sysKey]: numberValue,
    }));

    const { error } = await supabase
      .from('break_config')
      .update({
        [sysKey]: numberValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (error) {
      console.error('Update break config error:', error);
      alert('Unable to update break setting.');
    }
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