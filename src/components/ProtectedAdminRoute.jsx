import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

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

export default function ProtectedAdminRoute({ children }) {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const verifyAccess = async () => {
    const isLoggedIn = localStorage.getItem('isAdminLoggedIn') === 'true';
    const deviceId = localStorage.getItem(HOME_DEVICE_KEY);
    const fingerprint = await getDeviceFingerprint();

    if (!isLoggedIn) {
      setAllowed(false);
      setChecking(false);
      return;
    }

    let query = supabase
      .from('device_authorizations')
      .select('*')
      .eq('system_name', HOME_SYSTEM_NAME)
      .eq('is_active', true);

    if (deviceId) {
      query = query.eq('device_token', deviceId);
    } else {
      query = query.eq('device_fingerprint', fingerprint);
    }

    const { data } = await query.maybeSingle();

    if (!data) {
      localStorage.removeItem('isAdminLoggedIn');
      setAllowed(false);
    } else {
      localStorage.setItem(HOME_DEVICE_KEY, data.device_token);

      await supabase
        .from('device_authorizations')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', data.id);

      setAllowed(true);
    }

    setChecking(false);
  };

  useEffect(() => {
    verifyAccess();

    const interval = setInterval(() => {
      verifyAccess();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (checking) {
    return (
      <div style={{
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}>
        Checking access...
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return children;
}