import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import OverviewSection      from './sections/OverviewSection';
import VerificationsSection from './sections/VerificationsSection';
import UsersSection         from './sections/UsersSection';
import AnalyticsSection     from './sections/AnalyticsSection';
import ActivitySection      from './sections/ActivitySection';
import NotificationsSection from './sections/NotificationsSection';
import SettingsSection      from './sections/SettingsSection';
import api from '../../api/axios';

const LOGO = '/logo.png';

const NAV = [
  { id: 'overview',       icon: '⬡',  label: 'Overview',            group: 'main' },
  { id: 'pending',        icon: '⏳',  label: 'Pending Verifications', group: 'main', badge: 'pending' },
  { id: 'approved',       icon: '✅',  label: 'Approved Users',       group: 'main', badge: 'approved' },
  { id: 'rejected',       icon: '🚫',  label: 'Rejected',             group: 'main', badge: 'rejected' },
  { id: 'users',          icon: '👥',  label: 'User Management',      group: 'manage' },
  { id: 'analytics',      icon: '📊',  label: 'Analytics',            group: 'manage' },
  { id: 'activity',       icon: '🕐',  label: 'Activity Logs',        group: 'manage' },
  { id: 'notifications',  icon: '🔔',  label: 'Notifications',        group: 'system' },
  { id: 'settings',       icon: '⚙️',  label: 'Settings',             group: 'system' },
];

const GROUPS = { main: 'CORE', manage: 'MANAGEMENT', system: 'SYSTEM' };

export default function AdminDashboard() {
  const { logout } = useAuth();
  const navigate   = useNavigate();
  const [tab, setTab]   = useState('overview');
  const [stats, setStats] = useState(null);
  const [toast, setToast] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const fetchStats = useCallback(async () => {
    try { const r = await api.get('/admin/stats'); setStats(r.data); } catch {}
  }, []);

  useEffect(() => {
    fetchStats();
    const timer = window.setInterval(fetchStats, 30000);
    return () => window.clearInterval(timer);
  }, [fetchStats]);

  const renderSection = () => {
    const props = { stats, showToast, fetchStats, setTab };
    switch (tab) {
      case 'overview':       return <OverviewSection {...props} />;
      case 'pending':        return <VerificationsSection status="pending"  {...props} />;
      case 'approved':       return <VerificationsSection status="approved" {...props} />;
      case 'rejected':       return <VerificationsSection status="rejected" {...props} />;
      case 'users':          return <UsersSection         {...props} />;
      case 'analytics':      return <AnalyticsSection     {...props} />;
      case 'activity':       return <ActivitySection      {...props} />;
      case 'notifications':  return <NotificationsSection {...props} />;
      case 'settings':       return <SettingsSection      {...props} />;
      default:               return <OverviewSection      {...props} />;
    }
  };

  const w = collapsed ? 72 : 240;

  return (
    <div style={{ display:'flex', minHeight:'100vh', fontFamily:'var(--font-sans)', background:'#F4F6F9' }}>

      {/* ═══ SIDEBAR ═══ */}
      <aside style={{
        width: w, background:'#0A1F14', display:'flex', flexDirection:'column',
        flexShrink:0, transition:'width .2s ease', overflow:'hidden',
        boxShadow:'4px 0 24px rgba(0,0,0,.18)',
      }}>
        {/* Logo */}
        <div style={{ padding:'22px 16px 18px', borderBottom:'1px solid rgba(255,255,255,.07)', display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}
             onClick={() => setCollapsed(c => !c)}>
          <img src={LOGO} alt="" style={{ width:34, height:34, flexShrink:0 }} />
          {!collapsed && (
            <div>
              <div style={{ fontWeight:800, fontSize:17, color:'white', letterSpacing:'-.4px', lineHeight:1 }}>
                Pind<span style={{ color:'#F4A938' }}>Bazaar</span>
              </div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', fontWeight:600, letterSpacing:'1.2px', textTransform:'uppercase', marginTop:2 }}>
                Control Center
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'12px 0', overflowY:'auto' }}>
          {Object.entries(GROUPS).map(([gKey, gLabel]) => {
            const items = NAV.filter(n => n.group === gKey);
            return (
              <div key={gKey}>
                {!collapsed && (
                  <div style={{ padding:'14px 16px 6px', fontSize:10, fontWeight:700, color:'rgba(255,255,255,.28)', letterSpacing:'1.5px', textTransform:'uppercase' }}>
                    {gLabel}
                  </div>
                )}
                {items.map(n => {
                  const isActive = tab === n.id;
                  const badgeCount = n.badge ? stats?.[n.badge] : null;
                  return (
                    <button key={n.id} onClick={() => setTab(n.id)} title={collapsed ? n.label : ''} style={{
                      display:'flex', alignItems:'center', gap:12,
                      width:'100%', padding: collapsed ? '13px 0' : '12px 16px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      border:'none', borderLeft: isActive ? '3px solid #4ade80' : '3px solid transparent',
                      background: isActive ? 'rgba(74,222,128,.1)' : 'none',
                      color: isActive ? '#4ade80' : 'rgba(255,255,255,.55)',
                      fontSize:14, fontWeight: isActive ? 700 : 500, cursor:'pointer', fontFamily:'var(--font-sans)',
                      transition:'all .15s', position:'relative',
                    }}>
                      <span style={{ fontSize:16, flexShrink:0 }}>{n.icon}</span>
                      {!collapsed && <span style={{ flex:1, textAlign:'left' }}>{n.label}</span>}
                      {!collapsed && badgeCount > 0 && (
                        <span style={{
                          background: n.id==='pending' ? '#ef4444' : '#40916C',
                          color:'white', borderRadius:100, fontSize:11, fontWeight:800,
                          padding:'1px 7px', minWidth:20, textAlign:'center',
                        }}>{badgeCount}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding:'12px 10px', borderTop:'1px solid rgba(255,255,255,.07)' }}>
          <button onClick={logout} style={{
            width:'100%', padding:'11px', background:'rgba(255,255,255,.05)',
            border:'1px solid rgba(255,255,255,.08)', borderRadius:10,
            color:'rgba(255,255,255,.5)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font-sans)',
            display:'flex', alignItems:'center', justifyContent: collapsed ? 'center' : 'flex-start', gap:8,
          }}>
            <span>🚪</span>{!collapsed && 'Logout'}
          </button>
        </div>
      </aside>

      {/* ═══ MAIN ═══ */}
      <main style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Top bar */}
        <div style={{
          height:60, background:'white', borderBottom:'1px solid #E8ECF0',
          display:'flex', alignItems:'center', padding:'0 32px',
          justifyContent:'space-between', flexShrink:0,
          boxShadow:'0 1px 4px rgba(0,0,0,.05)',
        }}>
          <div style={{ fontWeight:800, fontSize:18, color:'#0D1F12', letterSpacing:'-.3px' }}>
            {NAV.find(n => n.id === tab)?.label || 'Overview'}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ fontSize:13, color:'#6B7280', fontWeight:500 }}>
              {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
            </div>
            <div style={{
              width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#2d6a4f,#1b4332)',
              display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:800, fontSize:14,
            }}>A</div>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex:1, overflow:'auto', padding:'28px 32px' }}>
          {renderSection()}
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', bottom:28, right:28, zIndex:9999,
          background: toast.type==='success' ? '#166534' : '#991b1b',
          color:'white', padding:'14px 22px', borderRadius:14,
          fontWeight:700, fontSize:15, boxShadow:'0 8px 32px rgba(0,0,0,.25)',
          display:'flex', alignItems:'center', gap:10,
          animation:'slideUp .25s ease',
        }}>
          {toast.type==='success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
