import { useState } from 'react';
import api from '../../../api/axios';

const TEMPLATES = [
  { title:'Heat advisory', message:'Extreme heat expected today. Schedule field work early morning or late evening.', type:'alert' },
  { title:'New market demand', message:'New buyer demand is available in your district. Check marketplace for matching jobs.', type:'info' },
  { title:'Document reminder', message:'Please upload missing documents to keep your account fully verified.', type:'warning' },
];

export default function NotificationsSection({ showToast }) {
  const [form, setForm] = useState({
    role: 'all',
    status: 'approved',
    type: 'info',
    title: '',
    message: '',
  });
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState(null);

  const send = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      showToast?.('Title and message are required', 'error');
      return;
    }
    setSending(true);
    try {
      const res = await api.post('/admin/notifications', form);
      setLastSent({ ...form, count: res.data.count, at: new Date() });
      showToast?.(`Notification queued for ${res.data.count} users`);
      setForm(f => ({ ...f, title:'', message:'' }));
    } catch (err) {
      showToast?.(err.response?.data?.error || 'Failed to send notification', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div>
        <h2 style={{ fontSize:24, fontWeight:800, color:'#0D1F12', margin:'0 0 4px' }}>Notification Center</h2>
        <div style={{ fontSize:13, color:'#6B7280' }}>Send targeted in-app alerts to farmers, balers, movers, and industry users.</div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.15fr .85fr', gap:24 }}>
        <form onSubmit={send} style={{ background:'white', borderRadius:16, padding:30, border:'1px solid #E8ECF0', boxShadow:'0 1px 4px rgba(0,0,0,.04)', display:'flex', flexDirection:'column', gap:16 }}>
          <h3 style={{ fontSize:18, fontWeight:800, color:'#111827', margin:0 }}>Send Global Alert</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            <Field label="Audience">
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role:e.target.value }))} style={INPUT}>
                <option value="all">All Roles</option>
                <option value="farmer">Farmers</option>
                <option value="baler">Balers</option>
                <option value="mover">Movers</option>
                <option value="industry">Industry</option>
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status:e.target.value }))} style={INPUT}>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
                <option value="all">All Statuses</option>
              </select>
            </Field>
            <Field label="Type">
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type:e.target.value }))} style={INPUT}>
                <option value="info">Info</option>
                <option value="alert">Alert</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
              </select>
            </Field>
          </div>
          <Field label="Title">
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title:e.target.value }))} placeholder="e.g. Heat advisory for Sangrur" style={INPUT} />
          </Field>
          <Field label="Message">
            <textarea rows={5} value={form.message} onChange={e => setForm(f => ({ ...f, message:e.target.value }))} placeholder="Type alert message here..." style={{ ...INPUT, resize:'vertical' }} />
          </Field>
          <button type="submit" disabled={sending} style={{ padding:'12px', background:'#d97706', color:'white', border:'none', borderRadius:8, fontWeight:800, fontSize:14, cursor:sending ? 'not-allowed' : 'pointer', opacity:sending ? .7 : 1 }}>
            {sending ? 'Sending...' : 'Send Alert Now'}
          </button>
        </form>

        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ background:'white', borderRadius:16, padding:24, border:'1px solid #E8ECF0' }}>
            <h3 style={{ fontSize:16, fontWeight:800, color:'#111827', margin:'0 0 14px' }}>Quick Templates</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {TEMPLATES.map(template => (
                <button key={template.title} onClick={() => setForm(f => ({ ...f, ...template }))}
                  style={{ textAlign:'left', padding:14, background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:10, cursor:'pointer' }}>
                  <div style={{ fontSize:14, fontWeight:800, color:'#111827' }}>{template.title}</div>
                  <div style={{ fontSize:12, color:'#6B7280', marginTop:4 }}>{template.message}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ background:'linear-gradient(135deg,#1B4332,#2D6A4F)', borderRadius:16, padding:24, color:'white' }}>
            <div style={{ fontSize:28, marginBottom:10 }}>💬</div>
            <h3 style={{ fontSize:18, fontWeight:800, margin:'0 0 8px' }}>Delivery Status</h3>
            {lastSent ? (
              <div style={{ fontSize:14, lineHeight:1.6, color:'rgba(255,255,255,.82)' }}>
                Last sent to <strong>{lastSent.count}</strong> users: {lastSent.title}
              </div>
            ) : (
              <div style={{ fontSize:14, lineHeight:1.6, color:'rgba(255,255,255,.82)' }}>
                In-app notifications are ready. SMS and WhatsApp can be added later through provider credentials.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display:'flex', flexDirection:'column', gap:6, fontSize:13, fontWeight:800, color:'#374151' }}>
      {label}
      {children}
    </label>
  );
}

const INPUT = { width:'100%', padding:'10px 14px', borderRadius:8, border:'1px solid #D1D5DB', fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box', background:'white' };
