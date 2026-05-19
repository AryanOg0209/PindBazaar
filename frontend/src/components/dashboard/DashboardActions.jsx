import { useNavigate } from 'react-router-dom';

export default function DashboardActions({ role }) {
  const navigate = useNavigate();

  const getPrimaryAction = () => {
    switch (role) {
      case 'industry': return { label: 'Create Buy Order', icon: '🛒', path: '/orders/new' };
      case 'baler': return { label: 'Find Work', icon: '🔍', path: '/market' };
      case 'mover': return { label: 'Find Transport Jobs', icon: '🚛', path: '/market' };
      default: return { label: 'Create Listing', icon: '📦', path: '/market/new' };
    }
  };

  const primary = getPrimaryAction();

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>Quick Actions</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        
        <button 
          onClick={() => navigate(primary.path)}
          style={{ background: 'linear-gradient(135deg, #1B4332, #2D6A4F)', color: 'white', padding: '16px', borderRadius: 16, border: 'none', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start', boxShadow: '0 8px 16px rgba(27,67,50,.15)', cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'transform 0.2s' }}
          onActive={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
        >
          <span style={{ fontSize: 24 }}>{primary.icon}</span>
          <span style={{ fontSize: 14, fontWeight: 700, textAlign: 'left', lineHeight: 1.2 }}>{primary.label}</span>
        </button>

        <button 
          onClick={() => navigate('/market')}
          style={{ background: 'white', color: '#0F172A', padding: '16px', borderRadius: 16, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start', boxShadow: '0 4px 12px rgba(0,0,0,.03)', cursor: 'pointer', fontFamily: 'var(--font-sans)', transition: 'background 0.2s' }}
        >
          <span style={{ fontSize: 24 }}>🧭</span>
          <span style={{ fontSize: 14, fontWeight: 700, textAlign: 'left', lineHeight: 1.2 }}>Browse Market</span>
        </button>

      </div>
    </div>
  );
}
