import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
const LOGO = '/logo.png';

export default function DashboardHeader({ user, role }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <div style={{ background: 'linear-gradient(135deg, #1B4332 0%, #0D2B1C 100%)', padding: '32px 24px 60px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={LOGO} alt="Logo" style={{ width: 24, height: 24 }} />
          </div>
          <div>
            <div style={{ color: 'rgba(255,255,255,.8)', fontSize: 12, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
              Good Morning
            </div>
            <div style={{ color: 'white', fontSize: 18, fontWeight: 800 }}>
              {user?.name?.split(' ')[0] || 'User'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={() => navigate('/notifications')}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.1)', border: 'none', color: 'white', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', transition: 'background 0.2s' }}
          >
            🔔
            <span style={{ position: 'absolute', top: 6, right: 8, width: 8, height: 8, background: '#ef4444', borderRadius: '50%', border: '2px solid #1B4332' }} />
          </button>
          <button 
            onClick={logout}
            style={{ width: 'auto', padding: '0 12px', height: 36, borderRadius: 18, background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Weather / Status Strip */}
      <div style={{ background: 'rgba(255,255,255,.1)', backdropFilter: 'blur(10px)', borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white', border: '1px solid rgba(255,255,255,.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>⛅</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>24°C · Punjab</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>Clear skies, perfect for field work</div>
          </div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 800, background: 'rgba(255,255,255,.2)', padding: '4px 10px', borderRadius: 100, textTransform: 'uppercase' }}>
          {role} ✓
        </div>
      </div>
    </div>
  );
}
