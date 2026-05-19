import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LOGO = '/logo.png';

export default function SplashPage() {
  const navigate = useNavigate();
  const [dot, setDot] = useState(0);

  useEffect(() => {
    const d = setInterval(() => setDot(v => (v + 1) % 3), 420);
    return () => clearInterval(d);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => navigate('/auth'), 2600);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--cream)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 18,
      fontFamily: 'var(--font-sans)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle background field illustration */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'url(/hero.png) center/cover no-repeat',
        opacity: .06,
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <img src={LOGO} alt="PindBazaar" style={{
        width: 110, height: 110, objectFit: 'contain',
        animation: 'splashPop .55s cubic-bezier(.34,1.56,.64,1)',
        filter: 'drop-shadow(0 8px 24px rgba(27,67,50,.25))',
        position: 'relative',
      }} />

      {/* Brand */}
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 36, color: 'var(--green-800)',
        animation: 'splashFade .7s ease-out .25s both',
        position: 'relative',
      }}>
        Pind<span style={{ color: 'var(--gold-600)' }}>Bazaar</span>
      </div>

      {/* Tagline */}
      <p style={{
        fontSize: 16, color: 'var(--text-3)', fontWeight: 500,
        animation: 'splashFade .7s ease-out .45s both',
        position: 'relative',
      }}>
        Connecting Rural India
      </p>

      {/* Dots */}
      <div style={{
        display: 'flex', gap: 8, marginTop: 12,
        animation: 'splashFade .7s ease-out .65s both',
        position: 'relative',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: dot === i ? 24 : 8,
            height: 8, borderRadius: 4,
            background: dot === i ? 'var(--green-700)' : 'var(--border)',
            transition: 'all .35s cubic-bezier(.4,0,.2,1)',
          }} />
        ))}
      </div>

      <style>{`
        @keyframes splashPop  { from{transform:scale(.5);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes splashFade { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}
