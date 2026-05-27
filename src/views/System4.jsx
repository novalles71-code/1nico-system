import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, BarChart3, CalendarClock, Coffee, Users, Newspaper } from 'lucide-react';

export default function System4() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Home');

  const savedConfig = localStorage.getItem('break_systems_config');
  const config = savedConfig ? JSON.parse(savedConfig) : { system4: 1 };
  const currentBreakOption = config.system4 || 1;

  const breakSchedules = {
    1: { shift: 'Shift 4 - Early', time: '10:30 AM - 10:45 AM', duration: '15 Minutes' },
    2: { shift: 'Shift 4 - Midday', time: '02:00 PM - 02:30 PM', duration: '30 Minutes' },
    3: { shift: 'Shift 4 - Afternoon', time: '05:00 PM - 05:15 PM', duration: '15 Minutes' },
    4: { shift: 'Shift 4 - Special', time: '09:00 PM - 09:30 PM', duration: '30 Minutes' },
  };
  const activeBreak = breakSchedules[currentBreakOption];

  const homeModulesInfo = [
    { title: 'QC', desc: 'Quality checks, inspections, weight verification, and compliance tracking.', icon: <ClipboardCheck size={24} /> },
    { title: 'Run Total', desc: 'Weekly production tracking, active weeks, totals, and weekly progress.', icon: <BarChart3 size={24} /> },
    { title: 'Exp. Calc', desc: 'Check if the product is within the 90-day limit from the manufacture date. This must be verified daily before using any product.', icon: <CalendarClock size={24} /> },
    { title: 'Breaks', desc: 'View current active break schedules assigned remotely by the supervisor control panel.', icon: <Coffee size={24} /> },
    { title: 'Groups', desc: 'Information about operational workgroups, shift assignments, and roles.', icon: <Users size={24} /> },
    { title: 'News', desc: 'Internal announcements, alerts, updates, and general station notifications.', icon: <Newspaper size={24} /> },
  ];

  const tabs = ['Home', 'QC', 'Run Total', 'Exp. Calc', 'Breaks', 'Groups', 'News'];

  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', margin: 0 }}>
      <div style={{ backgroundColor: '#dc2626', color: '#fff', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ backgroundColor: '#fff', color: '#dc2626', fontWeight: '900', padding: '3px 8px', borderRadius: '4px', fontSize: '0.9rem' }}>1NICO</span>
          <span style={{ fontWeight: '500', fontSize: '0.95rem', opacity: 0.9 }}>Workstation</span>
        </div>
        <span style={{ fontWeight: '700', fontSize: '1.05rem' }}>System 4</span>
      </div>

      <div style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }}>
        <button onClick={() => navigate('/home')} style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', marginBottom: '24px', fontSize: '0.9rem', fontWeight: '500', color: '#334155' }}>
          ← Back to Dashboard
        </button>

        <div style={{ display: 'flex', borderBottom: '1px solid #cbd5e1', marginBottom: '24px', overflowX: 'auto', gap: '4px' }}>
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '12px 20px', border: '1px solid transparent', borderBottom: 'none', backgroundColor: activeTab === tab ? '#fff' : 'transparent', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: activeTab === tab ? '600' : '500', color: activeTab === tab ? '#0f172a' : '#64748b', borderColor: activeTab === tab ? '#cbd5e1 #cbd5e1 transparent' : 'transparent', position: 'relative', top: '1px', whiteSpace: 'nowrap' }}>
              {tab}
            </button>
          ))}
        </div>

        <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {activeTab === 'Home' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
              {homeModulesInfo.map((mod, i) => (
                <div key={i} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ color: '#dc2626', marginBottom: '12px' }}>{mod.icon}</div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: '0 0 8px 0', color: '#0f172a' }}>{mod.title}</h3>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: '1.5' }}>{mod.desc}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'QC' && (<div><h2 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>QC</h2><p style={{ color: '#64748b' }}>QC Workstation module setup.</p></div>)}
          {activeTab === 'Run Total' && (<div><h2 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>Run Total</h2><p style={{ color: '#64748b' }}>Production tracker logs.</p></div>)}
          {activeTab === 'Exp. Calc' && (<div><h2 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>Exp. Calc</h2><p style={{ color: '#64748b' }}>Date limitation controls.</p></div>)}

          {activeTab === 'Breaks' && (
            <div>
              <h2 style={{ margin: '0 0 8px 0', color: '#dc2626', fontSize: '1.5rem', fontWeight: '700' }}>Active Break Schedule</h2>
              <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '24px', borderRadius: '12px', maxWidth: '450px', marginTop: '16px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', marginBottom: '8px' }}>LIVE PROFILE CONFIGURATION: MODE {currentBreakOption}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>{activeBreak.shift}</div>
                <div style={{ fontSize: '1.15rem', color: '#2563eb', fontWeight: '700', marginBottom: '6px' }}>Time Slot: {activeBreak.time}</div>
                <div style={{ fontSize: '1rem', color: '#475569', fontWeight: '500' }}>Total Duration: {activeBreak.duration}</div>
              </div>
            </div>
          )}

          {activeTab === 'Groups' && (<div><h2 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>Groups</h2><p style={{ color: '#64748b' }}>Active workgroups configuration.</p></div>)}
          {activeTab === 'News' && (<div><h2 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>News</h2><p style={{ color: '#64748b' }}>Announcements and communications layout.</p></div>)}
        </div>
      </div>
    </div>
  );
}