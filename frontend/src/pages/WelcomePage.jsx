import { useNavigate } from 'react-router-dom';

const LOGO = '/logo.png';

export default function WelcomePage() {
  const navigate = useNavigate();
  return (
    <div className="page">
      <div className="page-content" style={{ justifyContent: 'center', flex: 1 }}>
        {/* Logo chip top-left */}
        <div style={{ position: 'absolute', top: 20, left: 20 }}>
          <div className="logo-chip">
            <img src={LOGO} alt="PindBazaar" />
            Pind<strong>Bazaar</strong>
          </div>
        </div>

        {/* Language select */}
        <div style={{ marginTop: 60 }}>
          <h1>Select Language</h1>
          <p className="subtitle">Choose your preferred language to continue</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          {[
            { label: 'English', sub: 'English', selected: true },
            { label: 'Hindi', sub: 'हिंदी' },
            { label: 'Punjabi', sub: 'ਪੰਜਾਬੀ' },
          ].map((lang) => (
            <div
              key={lang.label}
              className={`option-card${lang.selected ? ' selected' : ''}`}
              style={{ padding: '16px 18px' }}
            >
              <div className="card-text">
                <h3>{lang.label}</h3>
                <p>{lang.sub}</p>
              </div>
              {lang.selected && (
                <div className="check" style={{ opacity: 1, transform: 'scale(1)' }}>✓</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="page-footer">
        <button className="btn-primary" onClick={() => navigate('/why')}>
          Continue
        </button>
      </div>
    </div>
  );
}
