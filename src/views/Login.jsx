import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

const VALID_USERNAME = 'noy';
const VALID_PASSWORD = 'noelik05';

const HOME_SYSTEM_NAME = 'home';
const HOME_DEVICE_KEY = 'home_device_id';

const getDeviceFingerprint = async () => {
  const raw = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    screen.width,
    screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join('|');

  const encoded = new TextEncoder().encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

export default function Login() {
  const navigate = useNavigate();

  const [checkingDevice, setCheckingDevice] = useState(true);
  const [deviceAuthorized, setDeviceAuthorized] = useState(false);
  const [accessToken, setAccessToken] = useState('');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    checkSavedDevice();
  }, []);

  const checkSavedDevice = async () => {
    const savedDeviceId = localStorage.getItem(HOME_DEVICE_KEY);
    const fingerprint = await getDeviceFingerprint();

    let query = supabase
      .from('device_authorizations')
      .select('*')
      .eq('system_name', HOME_SYSTEM_NAME)
      .eq('is_active', true);

    if (savedDeviceId) {
      query = query.eq('device_token', savedDeviceId);
    } else {
      query = query.eq('device_fingerprint', fingerprint);
    }

    const { data } = await query.maybeSingle();

    if (data) {
      localStorage.setItem(HOME_DEVICE_KEY, data.device_token);

      await supabase
        .from('device_authorizations')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', data.id);

      setDeviceAuthorized(true);
    } else {
      localStorage.removeItem('isAdminLoggedIn');
      setDeviceAuthorized(false);
    }

    setCheckingDevice(false);
  };

  const handleDeviceAccess = async (e) => {
    e.preventDefault();

    const token = accessToken.trim().toUpperCase();
    const fingerprint = await getDeviceFingerprint();

    if (!token) {
      alert('Enter access token');
      return;
    }

    const { data, error } = await supabase
      .from('device_authorizations')
      .select('*')
      .eq('system_name', HOME_SYSTEM_NAME)
      .eq('device_token', token)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      alert('Invalid or already used access token');
      return;
    }

    const newDeviceId = crypto.randomUUID();

    const { error: updateError } = await supabase
      .from('device_authorizations')
      .update({
        device_token: newDeviceId,
        device_fingerprint: fingerprint,
        last_seen: new Date().toISOString(),
      })
      .eq('id', data.id);

    if (updateError) {
      alert('Could not authorize this device');
      return;
    }

    localStorage.setItem(HOME_DEVICE_KEY, newDeviceId);
    setDeviceAuthorized(true);
    setAccessToken('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      localStorage.setItem('isAdminLoggedIn', 'true');
      navigate('/home');
    } else {
      alert('Invalid username or password');
    }
  };

  if (checkingDevice) {
    return (
      <PageWrapper>
        <Card>
          <h2 style={titleStyle}>Checking Device...</h2>
          <p style={subtitleStyle}>Please wait.</p>
        </Card>
      </PageWrapper>
    );
  }

  if (!deviceAuthorized) {
    return (
      <PageWrapper>
        <Card>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={logoStyle}>1NICO</div>
            <h2 style={titleStyle}>Device Access Required</h2>
            <p style={subtitleStyle}>
              Enter the access token to authorize this device.
            </p>
          </div>

          <form onSubmit={handleDeviceAccess} style={formStyle}>
            <div>
              <label style={labelStyle}>Access Token</label>

              <div style={{ position: 'relative' }}>
                <span style={iconStyle}>
                  <ShieldCheck size={18} />
                </span>

                <input
                  type="text"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value.toUpperCase())}
                  placeholder="HOME-XXXXXX"
                  required
                  style={inputStyle}
                />
              </div>
            </div>

            <button type="submit" style={buttonStyle}>
              Authorize Device
            </button>
          </form>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <Card>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={logoStyle}>1NICO</div>
          <h2 style={titleStyle}>Internal System</h2>
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>
          <div>
            <label style={labelStyle}>Username</label>

            <div style={{ position: 'relative' }}>
              <span style={iconStyle}>
                <User size={18} />
              </span>

              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
                required
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Password</label>

            <div style={{ position: 'relative' }}>
              <span style={iconStyle}>
                <Lock size={18} />
              </span>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={inputStyle}
              />
            </div>
          </div>

          <button type="submit" style={buttonStyle}>
            Sign In
          </button>
        </form>
      </Card>
    </PageWrapper>
  );
}

function PageWrapper({ children }) {
  return (
    <div style={{
      backgroundColor: '#0f172a',
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {children}
    </div>
  );
}

function Card({ children }) {
  return (
    <div style={{
      backgroundColor: '#1e293b',
      padding: '40px',
      borderRadius: '12px',
      border: '1px solid #334155',
      width: '100%',
      maxWidth: '400px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
    }}>
      {children}
    </div>
  );
}

const logoStyle = {
  fontSize: '2rem',
  fontWeight: '800',
  color: '#ffffff',
  letterSpacing: '-1px',
  marginBottom: '4px',
};

const titleStyle = {
  fontSize: '1.25rem',
  color: '#f8fafc',
  margin: 0,
  fontWeight: '600',
};

const subtitleStyle = {
  color: '#94a3b8',
  fontSize: '0.9rem',
  marginTop: '10px',
};

const formStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
};

const labelStyle = {
  display: 'block',
  color: '#94a3b8',
  fontSize: '0.85rem',
  marginBottom: '6px',
};

const iconStyle = {
  position: 'absolute',
  left: '12px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#64748b',
  display: 'flex',
};

const inputStyle = {
  width: '100%',
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '6px',
  padding: '10px 12px 10px 40px',
  color: '#f8fafc',
  fontSize: '0.95rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const buttonStyle = {
  backgroundColor: '#38bdf8',
  color: '#0f172a',
  border: 'none',
  padding: '12px',
  borderRadius: '6px',
  fontWeight: 'bold',
  fontSize: '0.95rem',
  cursor: 'pointer',
  marginTop: '10px',
};