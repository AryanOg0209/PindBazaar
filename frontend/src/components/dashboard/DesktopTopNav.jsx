import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
const LOGO = '/logo.png';

export default function DesktopTopNav({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const NAV_LINKS = [
    { label: 'Home',     icon: '🏠', path: '/dashboard' },
    { label: 'Market',   icon: '🛒', path: '/market' },
    { label: 'Orders',   icon: '📦', path: '/orders' },
    { label: 'Reports',  icon: '📄', path: '/reports' },
    { label: 'Profiles', icon: '👤', path: '/profile' },
    { label: 'Settings', icon: '⚙️', path: '/settings' },
  ];

  return (
    <div style={{
      height: 70,
      background: '#1B4332',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      color: 'white',
      fontFamily: 'var(--font-sans)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      position: 'relative',
      zIndex: 100
    }}>
      {/* Brand & User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={LOGO} alt="" style={{ width: 28, height: 28 }} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Good Morning
          </div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>
            {user?.name?.split(' ')[0] || 'User'}
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <div style={{ display: 'flex', height: '100%' }}>
        {NAV_LINKS.map(nav => {
          const isActive = location.pathname === nav.path || (nav.path === '/dashboard' && location.pathname === '/');
          return (
            <button key={nav.label} onClick={() => navigate(nav.path)} style={{
              height: '100%',
              padding: '0 24px',
              background: 'transparent',
              border: 'none',
              borderBottom: isActive ? '4px solid #F4A938' : '4px solid transparent',
              color: isActive ? 'white' : 'rgba(255,255,255,0.6)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
              <span style={{ fontSize: 18, filter: isActive ? 'none' : 'grayscale(100%)', opacity: isActive ? 1 : 0.7 }}>{nav.icon}</span>
              <span style={{ fontSize: 13, fontWeight: isActive ? 800 : 600 }}>{nav.label}</span>
            </button>
          )
        })}
      </div>

      {/* Actions */}
      <button onClick={logout} style={{
        padding: '8px 20px',
        background: 'rgba(239, 68, 68, 0.15)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: 8,
        color: '#fca5a5',
        fontWeight: 700,
        fontSize: 14,
        cursor: 'pointer',
        transition: 'background 0.2s'
      }}>
        Logout
      </button>
    </div>
  );
}
