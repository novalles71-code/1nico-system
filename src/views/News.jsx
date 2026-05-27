import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Newspaper } from 'lucide-react';

export default function News() {
  const navigate = useNavigate();

  const [newsMessage, setNewsMessage] = useState(() => {
    return localStorage.getItem('global_system_news') || '';
  });

  const [lastUpdate, setLastUpdate] = useState(() => {
    return (
      localStorage.getItem('global_system_news_date') ||
      'No updates yet'
    );
  });

  // Escucha cambios en tiempo real
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'global_system_news') {
        setNewsMessage(e.newValue || '');
      }

      if (e.key === 'global_system_news_date') {
        setLastUpdate(e.newValue || '');
      }
    };

    window.addEventListener('storage', handleStorage);

    return () =>
      window.removeEventListener(
        'storage',
        handleStorage
      );
  }, []);

  const handleSaveNews = () => {
    const now = new Date().toLocaleString('en-US');

    localStorage.setItem(
      'global_system_news',
      newsMessage
    );
    localStorage.setItem(
  'global_system_news_time',
  new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
);

    localStorage.setItem(
      'global_system_news_date',
      now
    );

    setLastUpdate(now);

    alert('News sent to all systems.');
  };

  const handleClearNews = () => {
    localStorage.removeItem('global_system_news');

    localStorage.removeItem(
      'global_system_news_date'
    );

    setNewsMessage('');
    setLastUpdate('No updates yet');

    alert('News cleared.');
  };

  return (
    <div
      style={{
        backgroundColor: '#0f172a',
        minHeight: '100vh',
        color: '#f8fafc',
        padding: '40px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '1000px',
          margin: '0 auto',
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '30px',
            borderBottom: '1px solid #334155',
            paddingBottom: '20px',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <Newspaper size={32} color="#38bdf8" />

              <h1
                style={{
                  margin: 0,
                  fontSize: '2rem',
                  color: '#38bdf8',
                }}
              >
                Global News Control
              </h1>
            </div>

            <p
              style={{
                color: '#94a3b8',
                marginTop: '8px',
                marginBottom: 0,
              }}
            >
              Send announcements to all systems in
              real time.
            </p>
          </div>

          <button
            onClick={() => navigate('/home')}
            style={{
              backgroundColor: '#1e293b',
              color: '#fff',
              border: '1px solid #334155',
              padding: '10px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            ← Back
          </button>
        </div>

        {/* INFO PANEL */}
        <div
          style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              fontSize: '0.8rem',
              color: '#94a3b8',
              marginBottom: '8px',
              fontWeight: '700',
            }}
          >
            LAST UPDATE
          </div>

          <div
            style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: '#f8fafc',
            }}
          >
            {lastUpdate}
          </div>
        </div>

        {/* TEXT AREA */}
        <div
          style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '10px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              backgroundColor: '#38bdf8',
              color: '#0f172a',
              padding: '14px 18px',
              fontWeight: '800',
              fontSize: '0.95rem',
            }}
          >
            LIVE ANNOUNCEMENT EDITOR
          </div>

          <div style={{ padding: '24px' }}>
            <textarea
              value={newsMessage}
              onChange={(e) =>
                setNewsMessage(e.target.value)
              }
              placeholder="Write announcement here..."
              style={{
                width: '100%',
                minHeight: '300px',
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '18px',
                fontSize: '1rem',
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'system-ui',
                lineHeight: '1.6',
                boxSizing: 'border-box',
              }}
            />

            <div
              style={{
                display: 'flex',
                gap: '12px',
                marginTop: '20px',
              }}
            >
              <button
                onClick={handleSaveNews}
                style={{
                  backgroundColor: '#22c55e',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 18px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                }}
              >
                Send To All Systems
              </button>

              <button
                onClick={handleClearNews}
                style={{
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 18px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                }}
              >
                Clear News
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}