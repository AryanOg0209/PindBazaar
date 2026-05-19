import { useNavigate } from 'react-router-dom';

export default function AuthGatePage() {
  const navigate = useNavigate();
  return (
    <div className="page">
      <div className="page-content" style={{ justifyContent: 'center', gap: 28 }}>
        {/* Small label */}
        <div>
          <p className="subtitle" style={{ fontSize: 15 }}>Login or create a new account</p>
          <h1>Welcome Back</h1>
        </div>

        {/* Hero image card with farm aerial + branding */}
        <div className="hero-card">
          <div className="hero-card-content">
            <div className="brand">Pind<span>Bazaar</span></div>
            <p>Connecting Punjab &amp; Haryana's Agri Chain</p>
          </div>
        </div>
      </div>

      <div className="page-footer">
        <button className="btn-primary" onClick={() => navigate('/login/phone')}>
          Login
        </button>
        <button className="btn-secondary" onClick={() => navigate('/signup/type')}>
          Sign Up
        </button>
        <p className="terms-text">
          By continuing, you agree to our <a href="#">Terms &amp; Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
