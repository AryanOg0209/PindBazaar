import { useNavigate } from 'react-router-dom';

const LOGO = '/logo.png';

const FEATURES = [
  { icon: '🤝', title: 'Direct Connections', desc: 'Farmers connect directly with industries — no middlemen, better prices.' },
  { icon: '✅', title: 'Verified Network', desc: 'Every user is verified. Trade with confidence across the supply chain.' },
  { icon: '📍', title: 'Haryana & Punjab First', desc: 'Built specifically for the agricultural heartland of India.' },
  { icon: '₹', title: 'Transparent Pricing', desc: 'Real-time market rates. No hidden costs. Fair trade for everyone.' },
];

export default function WhyPage() {
  const navigate = useNavigate();
  return (
    <div className="page">
      <div className="page-content">
        <div className="logo-chip" style={{ width: 'fit-content' }}>
          <img src={LOGO} alt="PindBazaar" />
          Pind<strong>Bazaar</strong>
        </div>

        <div>
          <h1>Why PindBazaar?</h1>
          <p className="subtitle">A trusted platform built for rural India's agricultural chain</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="feature-card">
              <div className="feat-icon">{f.icon}</div>
              <div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="page-footer">
        <button className="btn-primary" onClick={() => navigate('/auth')}>
          → Get Started
        </button>
      </div>
    </div>
  );
}
