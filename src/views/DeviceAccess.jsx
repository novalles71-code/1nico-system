import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function DeviceAccess() {
  const [devices, setDevices] = useState([]);
  const [systemName, setSystemName] = useState('system1');
  const [deviceLabel, setDeviceLabel] = useState('');

  const loadDevices = async () => {
    const { data, error } = await supabase
      .from('device_authorizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setDevices(data || []);
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const generateToken = () => {
    const prefix = systemName.toUpperCase().replace('SYSTEM', 'S');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${random}`;
  };

  const createDevice = async () => {
    if (!deviceLabel.trim()) {
      alert('Enter a device name.');
      return;
    }

    const token = generateToken();

    const { error } = await supabase.from('device_authorizations').insert([
      {
        system_name: systemName,
        device_token: token,
        device_label: deviceLabel,
        is_active: true,
      },
    ]);

    if (error) {
      console.error('CREATE DEVICE ERROR:', error);
  alert(error.message);
  return;
    }

    setDeviceLabel('');
    loadDevices();
  };

  const toggleDevice = async (device) => {
    await supabase
      .from('device_authorizations')
      .update({ is_active: !device.is_active })
      .eq('id', device.id);

    loadDevices();
  };

  const deleteDevice = async (id) => {
    if (!confirm('Delete this device access?')) return;

    await supabase
      .from('device_authorizations')
      .delete()
      .eq('id', id);

    loadDevices();
  };

  return (
    <div style={{
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif',
      padding: '40px',
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <h1 style={{ color: '#38bdf8', marginBottom: '8px' }}>
          Device Access
        </h1>

        <p style={{ color: '#94a3b8', marginBottom: '28px' }}>
          Create and manage authorized PCs for each system.
        </p>

        <div style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '28px',
        }}>
          <h2 style={{ marginTop: 0 }}>Create Access</h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '180px 1fr 160px',
            gap: '14px',
          }}>
            <select
              value={systemName}
              onChange={(e) => setSystemName(e.target.value)}
              style={inputStyle}
            >
              <option value="home">Home / Login</option>
              <option value="system1">System 1</option>
              <option value="system2">System 2</option>
              <option value="system3">System 3</option>
              <option value="system4">System 4</option>
            </select>

            <input
              value={deviceLabel}
              onChange={(e) => setDeviceLabel(e.target.value)}
              placeholder="Example: S1 Line PC"
              style={inputStyle}
            />

            <button onClick={createDevice} style={buttonStyle}>
              Create
            </button>
          </div>
        </div>

        <div style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a' }}>
                <th style={thStyle}>System</th>
                <th style={thStyle}>Device</th>
                <th style={thStyle}>PIN / Token</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {devices.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: '#94a3b8',
                  }}>
                    No devices created yet.
                  </td>
                </tr>
              ) : (
                devices.map((device) => (
                  <tr key={device.id}>
                    <td style={tdStyle}>{device.system_name}</td>
                    <td style={tdStyle}>{device.device_label}</td>
                    <td style={tdStyle}>
                      <code>{device.device_token}</code>
                    </td>
                    <td style={tdStyle}>
                      {device.is_active ? 'Active' : 'Disabled'}
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => toggleDevice(device)}
                        style={smallButtonStyle}
                      >
                        {device.is_active ? 'Disable' : 'Enable'}
                      </button>

                      <button
                        onClick={() => deleteDevice(device.id)}
                        style={{
                          ...smallButtonStyle,
                          backgroundColor: '#dc2626',
                          marginLeft: '8px',
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  color: '#f8fafc',
  padding: '10px',
  borderRadius: '8px',
  outline: 'none',
};

const buttonStyle = {
  backgroundColor: '#38bdf8',
  color: '#0f172a',
  border: 'none',
  borderRadius: '8px',
  fontWeight: '900',
  cursor: 'pointer',
};

const thStyle = {
  padding: '14px',
  textAlign: 'left',
  color: '#94a3b8',
  borderBottom: '1px solid #334155',
};

const tdStyle = {
  padding: '14px',
  borderBottom: '1px solid #334155',
  color: '#f8fafc',
};

const smallButtonStyle = {
  backgroundColor: '#334155',
  color: '#f8fafc',
  border: 'none',
  borderRadius: '6px',
  padding: '7px 10px',
  cursor: 'pointer',
  fontWeight: '700',
};