import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function PhonePage({ mode }) {
  const navigate  = useNavigate();
  const { login } = useAuth();
  const [phone, setPhone]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [statusMsg, setStatusMsg] = useState(null); // { type: 'pending'|'rejected', text, notes }

  const role    = sessionStorage.getItem('pb_role') || '';
  const isLogin = mode === 'login';

  /* ── LOGIN: direct sign-in, no OTP ── */
  const handleLogin = async () => {
    setError(''); setStatusMsg(null);
    if (!/^\d{10}$/.test(phone)) { setError('Enter a valid 10-digit mobile number'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/login-direct', { phone });
      login(res.data.token, res.data.user);
      const u = res.data.user;
      if (u.role === 'admin') return navigate('/admin');
      return navigate('/dashboard');
    } catch (err) {
      const d = err.response?.data || {};
      if (d.notFound) {
        setError("No account found. Please Sign Up first.");
      } else if (d.status === 'pending') {
        setStatusMsg({ type: 'pending', text: d.error });
      } else if (d.status === 'rejected') {
        setStatusMsg({ type: 'rejected', text: d.error, notes: d.adminNotes });
      } else {
        setError(d.error || 'Login failed. Try again.');
      }
    } finally { setLoading(false); }
  };

  /* ── SIGNUP: send OTP ── */
  const handleSendOtp = async () => {
    setError(''); setStatusMsg(null);
    if (!/^\d{10}$/.test(phone)) { setError('Enter a valid 10-digit mobile number'); return; }
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { phone });
      sessionStorage.setItem('pb_phone', phone);
      navigate('/signup/otp');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP. Try again.');
    } finally { setLoading(false); }
  };

  const handleAction = isLogin ? handleLogin : handleSendOtp;

  return (
    <div className="page">
      <div className="header-bar">
        <button className="back-btn" onClick={() => navigate(isLogin ? '/auth' : '/signup/type')}>←</button>
      </div>

      <div className="page-content">
        <div>
          <h1 style={{ fontSize: 36 }}>{isLogin ? 'Welcome\nBack' : 'Create\nAccount'}</h1>
          <p className="subtitle">
            {isLogin
              ? 'Enter your registered phone number to sign in instantly'
              : 'Enter your phone number to get started'}
          </p>
          {!isLogin && role && (
            <span className="label-tag" style={{ marginTop: 12, display: 'inline-block' }}>
              {ROLE_EMOJI[role]} {role.charAt(0).toUpperCase() + role.slice(1)}
            </span>
          )}
        </div>

        <div className="input-group">
          <label>Phone Number</label>
          <div className="input-phone">
            <span className="prefix">+91</span>
            <input
              type="tel" inputMode="numeric" maxLength={10}
              placeholder="Enter 10-digit number"
              value={phone}
              onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '')); setError(''); setStatusMsg(null); }}
              onKeyDown={(e) => e.key === 'Enter' && phone.length === 10 && handleAction()}
              autoFocus
            />
          </div>
        </div>

        {/* Standard error */}
        {error && <div className="error-box">{error}</div>}

        {/* Pending gate */}
        {statusMsg?.type === 'pending' && (
          <div style={{ background: '#FEF3DC', border: '2px solid #F4A938', borderRadius: 'var(--r-m)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 32, textAlign: 'center' }}>⏳</div>
            <h3 style={{ color: '#92400e', textAlign: 'center', fontSize: 18 }}>Account Pending Verification</h3>
            <p style={{ fontSize: 15, color: '#78350f', textAlign: 'center', lineHeight: 1.6 }}>
              {statusMsg.text}
            </p>
            <p style={{ fontSize: 13, color: '#92400e', textAlign: 'center', fontWeight: 600 }}>
              Our team verifies accounts within 24–48 hours.
            </p>
          </div>
        )}

        {/* Rejected gate */}
        {statusMsg?.type === 'rejected' && (
          <div style={{ background: '#FEE2E2', border: '2px solid #FCA5A5', borderRadius: 'var(--r-m)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 32, textAlign: 'center' }}>❌</div>
            <h3 style={{ color: '#991b1b', textAlign: 'center', fontSize: 18 }}>Application Rejected</h3>
            <p style={{ fontSize: 15, color: '#7f1d1d', textAlign: 'center', lineHeight: 1.6 }}>
              {statusMsg.text}
            </p>
            {statusMsg.notes && (
              <p style={{ fontSize: 14, background: 'rgba(0,0,0,.06)', borderRadius: 8, padding: '10px 14px', color: '#991b1b', fontWeight: 600 }}>
                Admin note: {statusMsg.notes}
              </p>
            )}
            <button className="btn-secondary" style={{ marginTop: 4 }} onClick={() => navigate('/signup/type')}>
              Resubmit Application
            </button>
          </div>
        )}

        {/* Info hint */}
        {!statusMsg && (
          isLogin ? (
            <div className="info-box">
              ✅ Already have an account? Just enter your number and tap <strong>Login</strong> — no OTP needed!
            </div>
          ) : (
            <div className="info-box">
              📱 A 6-digit OTP will be sent to this number for verification
            </div>
          )
        )}
      </div>

      <div className="page-footer">
        <button
          className="btn-primary"
          onClick={handleAction}
          disabled={loading || phone.length !== 10}
        >
          {loading ? (isLogin ? 'Signing in…' : 'Sending OTP…') : (isLogin ? 'Login →' : 'Send OTP →')}
        </button>

        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-4)', fontWeight: 500 }}>
          {isLogin ? "Don't have an account? " : 'Already registered? '}
          <button className="btn-ghost" onClick={() => navigate(isLogin ? '/signup/type' : '/login/phone')}>
            {isLogin ? 'Sign Up' : 'Login instead'}
          </button>
        </p>
      </div>
    </div>
  );
}

const ROLE_EMOJI = { farmer: '🌾', industry: '🏭', baler: '🔧', mover: '🚛' };
