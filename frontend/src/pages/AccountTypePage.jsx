import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LOGO = '/logo.png';

const ACCOUNT_TYPES = [
  { key: 'farmer',   icon: '🌾', label: 'Farmer',   desc: 'Sell produce or biomass' },
  { key: 'industry', icon: '🏭', label: 'Industry',  desc: 'Buy biomass or agri inputs' },
  { key: 'baler',    icon: '🔧', label: 'Baler',     desc: 'Process and bundle biomass' },
  { key: 'mover',    icon: '🚛', label: 'Mover',     desc: 'Transport goods' },
];

export default function AccountTypePage() {
  const navigate  = useNavigate();
  const [selected, setSelected] = useState(null);

  // Tap a card → save role → immediately go to phone page
  const handleSelect = (key) => {
    setSelected(key);
    sessionStorage.setItem('pb_role', key);
    // Small delay so user sees the selection highlight before navigating
    setTimeout(() => navigate('/signup/phone'), 180);
  };

  return (
    <div className="page">
      <div className="header-bar">
        <button className="back-btn" onClick={() => navigate('/auth')}>←</button>
      </div>

      <div className="page-content">
        <div className="logo-center">
          <img src={LOGO} alt="PindBazaar" />
          <div className="logo-name">Pind<span>Bazaar</span></div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <h2>Choose Account Type</h2>
          <p className="subtitle">How will you use PindBazaar?</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
          {ACCOUNT_TYPES.map((type) => (
            <div
              key={type.key}
              className={`option-card${selected === type.key ? ' selected' : ''}`}
              onClick={() => handleSelect(type.key)}
              style={{ cursor: 'pointer' }}
            >
              <div className="card-icon">{type.icon}</div>
              <div className="card-text">
                <h3>{type.label}</h3>
                <p>{type.desc}</p>
              </div>
              <div className="check">✓</div>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Tap any option to continue →
        </p>
      </div>
    </div>
  );
}
