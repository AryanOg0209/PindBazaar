import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function OtpPage({ mode }) {
  const navigate  = useNavigate();
  const { login } = useAuth();
  const [otp, setOtp]         = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [resent, setResent]   = useState(false);
  const [countdown, setCountdown] = useState(30);
  const refs = useRef([]);

  const phone   = sessionStorage.getItem('pb_phone') || '';
  const role    = sessionStorage.getItem('pb_role') || '';
  const isLogin = mode === 'login';

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length === 6) {
      setOtp(paste.split(''));
      refs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) { setError('Enter all 6 digits'); return; }
    setError('');
    setLoading(true);
    try {
      let res;
      if (isLogin) {
        res = await api.post('/auth/login', { phone, code });
      } else {
        res = await api.post('/auth/register', { phone, code, role });
      }
      login(res.data.token, res.data.user);
      const user = res.data.user;
      if (user.role === 'admin') navigate('/admin');
      else if (!isLogin) navigate('/setup/profile');
      else if (user.status === 'approved') navigate('/dashboard');
      else navigate('/pending');
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await api.post('/auth/send-otp', { phone });
      setResent(true);
      setCountdown(30);
      setOtp(['', '', '', '', '', '']);
      refs.current[0]?.focus();
    } catch {
      setError('Failed to resend OTP');
    }
  };

  return (
    <div className="page">
      <div className="header-bar">
        <button className="back-btn" onClick={() => navigate(isLogin ? '/login/phone' : '/signup/phone')}>←</button>
      </div>

      <div className="page-content">
        <div>
          <h1>Welcome Back</h1>
          <p className="subtitle">Enter the verification code we sent you</p>
          <p style={{ color: 'var(--green-mid)', fontWeight: 600, fontSize: 14, marginTop: 4 }}>
            +91 {phone}
          </p>
        </div>

        <div className="otp-grid" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (refs.current[i] = el)}
              className={`otp-box${digit ? ' filled' : ''}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
            />
          ))}
        </div>

        {error && <div className="error-box">{error}</div>}
        {resent && <div className="info-box">✅ New OTP sent to +91 {phone}</div>}

        <div style={{ textAlign: 'center' }}>
          {countdown > 0 ? (
            <p className="terms-text">Resend code in {countdown}s</p>
          ) : (
            <span>
              Didn't receive it?{' '}
              <button className="btn-ghost" onClick={handleResend}>Resend Code</button>
            </span>
          )}
        </div>
      </div>

      <div className="page-footer">
        <button
          className="btn-primary"
          onClick={handleVerify}
          disabled={loading || otp.join('').length !== 6}
        >
          {loading ? 'Verifying…' : 'Verify & Continue'}
        </button>
      </div>
    </div>
  );
}
