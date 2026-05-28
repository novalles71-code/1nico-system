import { useNavigate } from 'react-router-dom';
import { 
  Monitor, 
  Coffee, 
  Users, 
  Newspaper,
  Database
} from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  const cards = [
    {
      id: 1,
      title: 'SYSTEM 1',
      desc: 'Access station 1 core module.',
      icon: <Monitor size={40} />,
      path: '/system-1'
    },

    {
      id: 2,
      title: 'SYSTEM 2',
      desc: 'Access station 2 core module.',
      icon: <Monitor size={40} />,
      path: '/system-2'
    },

    {
      id: 3,
      title: 'SYSTEM 3',
      desc: 'Access station 3 core module.',
      icon: <Monitor size={40} />,
      path: '/system-3'
    },

    {
      id: 4,
      title: 'SYSTEM 4',
      desc: 'Access station 4 core module.',
      icon: <Monitor size={40} />,
      path: '/system-4'
    },

    {
      id: 5,
      title: 'BREAK CONTROL',
      desc: 'Manage and monitor staff breaks.',
      icon: <Coffee size={40} />,
      path: '/break-control'
    },

    {
      id: 6,
      title: 'GROUPS',
      desc: 'Manage operational workgroups.',
      icon: <Users size={40} />,
      path: '/groups'
    },

    {
      id: 7,
      title: 'NEWS',
      desc: 'Internal announcements and updates.',
      icon: <Newspaper size={40} />,
      path: '/news'
    },

    {
      id: 8,
      title: 'EMPLOYEES',
      desc: 'Register and manage employee names.',
      icon: <Users size={40} />,
      path: '/employees'
    },

    {
      id: 9,
      title: 'ATTENDANCE',
      desc: 'Weekly attendance records and Excel export.',
      icon: <Users size={40} />,
      path: '/attendance'
    },

    {
      id: 10,
      title: 'DEVICE ACCESS',
      desc: 'Manage authorized PCs and system access.',
      icon: <Database size={40} />,
      path: '/device-access'
    },
  ];

  return (
    <div
      style={{
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif',
        padding: '40px'
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        <header
          style={{
            marginBottom: '40px',
            borderBottom: '1px solid #334155',
            paddingBottom: '20px'
          }}
        >
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#38bdf8',
              margin: 0
            }}
          >
            Dashboard
          </h1>

          <p
            style={{
              color: '#94a3b8',
              fontSize: '0.95rem',
              marginTop: '6px'
            }}
          >
            Select a module to continue
          </p>
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px'
          }}
        >
          {cards.map((card) => (
            <div
              key={card.id}
              onClick={() => navigate(card.path)}
              style={{
                backgroundColor: '#1e293b',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid #334155',
                cursor: 'pointer',
                transition: 'transform 0.2s, border-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#38bdf8';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#334155';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div
                style={{
                  color: '#38bdf8',
                  marginBottom: '16px'
                }}
              >
                {card.icon}
              </div>

              <h3
                style={{
                  fontSize: '1.25rem',
                  marginBottom: '8px',
                  fontWeight: '700'
                }}
              >
                {card.title}
              </h3>

              <p
                style={{
                  color: '#94a3b8',
                  fontSize: '0.9rem',
                  lineHeight: '1.4',
                  margin: 0
                }}
              >
                {card.desc}
              </p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}