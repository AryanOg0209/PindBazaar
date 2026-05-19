import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function PendingPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState(user?.status || 'pending');
  const [notes, setNotes]   = useState(user?.adminNotes || '');

  // Poll status every 10 seconds
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await api.get('/user/status');
        setStatus(res.data.status);
        setNotes(res.data.adminNotes || '');
        if (res.data.status === 'approved') navigate('/dashboard');
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, []);

  const config = {
    pending: {
      icon: '⏳',
      title: 'Application Submitted!',
      subtitle: 'Our team will verify your details within 24–48 hours',
      color: '#856404',
      bg: '#FFF3CD',
    },
    rejected: {
      icon: '❌',
      title: 'Application Rejected',
      subtitle: 'Unfortunately your application was not approved',
      color: '#991B1B',
      bg: '#FEE2E2',
    },
  }[status] || { icon: '⏳', title: 'Pending…', subtitle: '', color: '#856404', bg: '#FFF3CD' };

  return (
    <div className="pending-screen">
      <div className="pending-icon">{config.icon}</div>

      <div>
        <h2 style={{ textAlign: 'center' }}>{config.title}</h2>
        <p className="subtitle" style={{ textAlign: 'center', marginTop: 6 }}>{config.subtitle}</p>
      </div>

      {notes && (
        <div className="error-box" style={{ width: '100%', textAlign: 'left' }}>
          <strong>Admin note:</strong> {notes}
        </div>
      )}

      <div style={{ width: '100%', background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p className="section-title">What happens next?</p>
        {[
          { num: '1', text: 'Our team reviews your documents' },
          { num: '2', text: 'Verification call may be made' },
          { num: '3', text: 'Account activated on approval' },
        ].map(s => (
          <div key={s.num} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--green-pale)', color: 'var(--green-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{s.num}</div>
            <p style={{ fontSize: 14, paddingTop: 4 }}>{s.text}</p>
          </div>
        ))}
      </div>

      {status === 'rejected' && (
        <button className="btn-primary" style={{ width: '100%' }} onClick={() => navigate('/setup/profile')}>
          Resubmit Application
        </button>
      )}

      <button className="btn-ghost" onClick={logout}>Log out</button>
    </div>
  );
}
