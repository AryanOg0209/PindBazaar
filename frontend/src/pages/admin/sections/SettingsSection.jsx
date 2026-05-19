import { useState } from 'react';
import api from '../../../api/axios';

export default function SettingsSection({ stats, showToast }) {
  const [adminForm, setAdminForm] = useState({ name:'', phone:'', email:'' });
  const [saving, setSaving] = useState(false);

  const createAdmin = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/admins', adminForm);
      showToast?.('Admin account created');
      setAdminForm({ name:'', phone:'', email:'' });
    } catch (err) {
      showToast?.(err.response?.data?.error || 'Failed to create admin', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div>
        <h2 style={{ fontSize:24, fontWeight:800, color:'#0D1F12', margin:'0 0 4px' }}>System Settings</h2>
        <div style={{ fontSize:13, color:'#6B7280' }}>Admin roles, platform readiness, and operational controls.</div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
        <form onSubmit={createAdmin} style={CARD}>
          <h3 style={TITLE}>Add Admin</h3>
          <p style={COPY}>Creates or upgrades a phone number into an approved admin account.</p>
          <Field label="Name">
            <input value={adminForm.name} onChange={e => setAdminForm(f => ({ ...f, name:e.target.value }))} placeholder="Admin name" style={INPUT} />
          </Field>
          <Field label="Phone">
            <input required value={adminForm.phone} onChange={e => setAdminForm(f => ({ ...f, phone:e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="10 digit phone" style={INPUT} />
          </Field>
          <Field label="Email">
            <input type="email" value={adminForm.email} onChange={e => setAdminForm(f => ({ ...f, email:e.target.value }))} placeholder="optional@email.com" style={INPUT} />
          </Field>
          <button type="submit" disabled={saving} style={{ marginTop:6, padding:'12px', background:'#6b21a8', color:'white', border:'none', borderRadius:10, fontWeight:800, cursor:saving ? 'not-allowed' : 'pointer', opacity:saving ? .7 : 1 }}>
            {saving ? 'Creating...' : 'Create Admin'}
          </button>
        </form>

        <div style={CARD}>
          <h3 style={TITLE}>Service Readiness</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              ['AI advisory', 'Configured server-side through Anthropic', true],
              ['Weather', 'OpenWeather connected for field forecasts', true],
              ['Notifications', 'In-app notification queue enabled', true],
              ['SMS/WhatsApp', 'Provider integration not connected yet', false],
            ].map(([label, desc, ok]) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:12, padding:12, borderRadius:10, background:'#F9FAFB', border:'1px solid #E5E7EB' }}>
                <span style={{ width:30, height:30, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', background:ok ? '#DCFCE7' : '#FEF3C7', color:ok ? '#166534' : '#92400E', fontWeight:800 }}>{ok ? '✓' : '!'}</span>
                <div>
                  <div style={{ fontSize:14, fontWeight:800, color:'#111827' }}>{label}</div>
                  <div style={{ fontSize:12, color:'#6B7280' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={CARD}>
        <h3 style={TITLE}>Platform Guardrails</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14 }}>
          {[
            ['Pending SLA', `${stats?.pending || 0} waiting`, 'Review pending users within 48 hours.'],
            ['Market Health', `${stats?.activeListings || 0} active`, 'Keep demand, supply, and jobs balanced.'],
            ['Order Revenue', `₹${Number(stats?.revenue || 0).toLocaleString('en-IN')}`, 'Revenue updates when orders are completed.'],
            ['District Coverage', `${stats?.districtActivity?.length || 0} districts`, 'Watch low-coverage regions for outreach.'],
          ].map(([label, value, note]) => (
            <div key={label} style={{ background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:12, padding:16 }}>
              <div style={{ fontSize:20, fontWeight:800, color:'#1B4332' }}>{value}</div>
              <div style={{ fontSize:12, fontWeight:800, color:'#111827', marginTop:4 }}>{label}</div>
              <div style={{ fontSize:12, color:'#6B7280', marginTop:8, lineHeight:1.5 }}>{note}</div>
            </div>
          ))}
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

const CARD = { background:'white', borderRadius:16, padding:26, border:'1px solid #E8ECF0', boxShadow:'0 1px 4px rgba(0,0,0,.04)', display:'flex', flexDirection:'column', gap:14 };
const TITLE = { fontSize:18, fontWeight:800, color:'#111827', margin:0 };
const COPY = { fontSize:13, color:'#6B7280', lineHeight:1.6, margin:0 };
const INPUT = { width:'100%', padding:'10px 14px', borderRadius:9, border:'1px solid #D1D5DB', fontSize:14, fontFamily:'inherit', boxSizing:'border-box' };
