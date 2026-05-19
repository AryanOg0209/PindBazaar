import { useNavigate, useLocation } from 'react-router-dom';

export default function BottomNav({ role }) {
  const navigate = useNavigate();
  const location = useLocation();

  const NAV_ITEMS = [
    { id: 'home', label: 'Home', icon: '🏠', path: '/dashboard' },
    { id: 'market', label: 'Market', icon: '🛒', path: '/market' },
    { id: 'orders', label: 'Orders', icon: '📦', path: '/orders' },
    { id: 'profile', label: 'Profile', icon: '👤', path: '/profile' },
  ];

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 70,
      background: 'white',
      borderTop: '1px solid #E2E8F0',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 50,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.03)'
    }}>
      {NAV_ITEMS.map(item => {
        const isActive = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/');
        
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: isActive ? '#1B4332' : '#94A3B8',
              fontFamily: 'var(--font-sans)',
              width: 70,
              height: '100%',
              transition: 'color 0.2s'
            }}
          >
            <span style={{ fontSize: 22, filter: isActive ? 'none' : 'grayscale(100%)', opacity: isActive ? 1 : 0.6 }}>
              {item.icon}
            </span>
            <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 600 }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
