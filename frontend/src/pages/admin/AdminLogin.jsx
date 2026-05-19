import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const LOGO = '/logo.png';

export default function AdminLogin() {
  const navigate  = useNavigate();
  const { login } = useAuth();
  const [step, setStep]       = useState('phone'); // phone | otp
  const [phone, setPhone]     = useState('');
  const [otp, setOtp]         = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSendOtp = async () => {
    if (!/^\d{10}$/.test(phone)) { setError('Enter valid 10-digit number'); return; }
    setError(''); setLoading(true);
    try {
      await api.post('/auth/send-otp', { phone });
      setStep('otp');
    } catch (e) { setError(e.response?.data?.error || 'Failed to send OTP'); }
    finally { setLoading(false); }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) { setError('Enter 6-digit OTP'); return; }
    setError(''); setLoading(true);
    try {
      const res = await api.post('/auth/login', { phone, code: otp });
      if (res.data.user.role !== 'admin') { setError('Not an admin account'); return; }
      login(res.data.token, res.data.user);
      navigate('/admin');
    } catch (e) { setError(e.response?.data?.error || 'Verification failed'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--green-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: 36, width: '100%', maxWidth: 420, boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src={LOGO} alt="" style={{ width: 64, height: 64 }} />
          <h2 style={{ marginTop: 8 }}>Admin Portal</h2>
          <p className="subtitle">PindBazaar Control Panel</p>
        </div>

        {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}

        {step === 'phone' ? (
          <>
            <div className="input-group" style={{ marginBottom: 16 }}>
              <label>Admin Phone Number</label>
              <div className="input-phone">
                <span className="prefix">+91</span>
                <input type="tel" inputMode="numeric" maxLength={10} placeholder="10-digit number"
                  value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,''))} />
              </div>
            </div>
            <button className="btn-primary" onClick={handleSendOtp} disabled={loading || phone.length !== 10}>
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
              OTP sent to +91 {phone}. Check server console in dev mode.
            </p>
            <div className="input-group" style={{ marginBottom: 16 }}>
              <label>6-Digit OTP</label>
              <input className="input-field" type="text" inputMode="numeric" maxLength={6}
                placeholder="Enter OTP" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,''))} />
            </div>
            <button className="btn-primary" onClick={handleVerify} disabled={loading || otp.length !== 6}>
              {loading ? 'Verifying…' : 'Login as Admin'}
            </button>
            <button className="btn-ghost" style={{ marginTop: 12, display: 'block' }} onClick={() => setStep('phone')}>← Change number</button>
          </>
        )}
      </div>
    </div>
  );
}
