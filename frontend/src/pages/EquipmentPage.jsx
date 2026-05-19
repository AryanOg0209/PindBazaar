import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DesktopTopNav from '../components/dashboard/DesktopTopNav';
import api from '../api/axios';

const MAINTENANCE_STATUS = ['Good', 'Needs Service', 'Under Repair', 'Out of Service'];
const VEHICLE_TYPES = ['Tractor', 'Truck', 'Mini Truck', 'Tractor-Trolley', 'Combine Harvester', 'Other'];
const MACHINE_TYPES = ['Square Baler', 'Round Baler'];

export default function EquipmentPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    api.get('/user/profile').then(res => {
      setProfile(res.data.profile);
      setForm(res.data.profile || {});
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/user/profile', form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { alert('Failed to save'); }
    finally { setSaving(false); }
  };

  const isBaler = user?.role === 'baler';
  const isMover = user?.role === 'mover';
  const isFarmer = user?.role === 'farmer';

  if (!isBaler && !isMover && !isFarmer) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#F0F4F8' }}>
        <DesktopTopNav user={user} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: '#64748B' }}>
          <div style={{ fontSize: 48 }}>🏭</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Equipment tracking is for Balers, Movers, and Farmers</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#F0F4F8' }}>
      <DesktopTopNav user={user} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', margin: 0 }}>⚙️ Manage Equipment</h1>
            <p style={{ color: '#64748B', margin: '4px 0 0', fontSize: 14 }}>Update your equipment details and availability status</p>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <div style={{ width: 40, height: 40, border: '4px solid #E2E8F0', borderTopColor: '#1B4332', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Equipment Status Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {isBaler && [
                  { icon: '🚜', label: 'Baler Type', value: form.machineType || 'Not set' },
                  { icon: '🔢', label: 'Machine Count', value: form.machineCount || 1 },
                  { icon: '💰', label: 'Price Per Bale', value: form.pricePerBale ? `₹${form.pricePerBale}` : 'Not set' },
                ].map((s, i) => (
                  <div key={i} style={{ background: 'white', borderRadius: 14, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,.06)', display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{s.icon}</div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{s.value}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{s.label}</div>
                    </div>
                  </div>
                ))}
                {isMover && [
                  { icon: '🚛', label: 'Vehicle Type', value: form.vehicleType || 'Not set' },
                  { icon: '🔢', label: 'Vehicle Count', value: form.vehicleCount || 1 },
                  { icon: '🪪', label: 'License No.', value: form.licenseNo || 'Not set' },
                ].map((s, i) => (
                  <div key={i} style={{ background: 'white', borderRadius: 14, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,.06)', display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{s.icon}</div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{s.value}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{s.label}</div>
                    </div>
                  </div>
                ))}
                {isFarmer && [
                  { icon: '🌾', label: 'Land (Acres)', value: form.landAcres || 'Not set' },
                  { icon: '🌿', label: 'Crops', value: (form.cropTypes || []).join(', ') || 'Not set' },
                  { icon: '📍', label: 'Village', value: form.village || 'Not set' },
                ].map((s, i) => (
                  <div key={i} style={{ background: 'white', borderRadius: 14, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,.06)', display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{s.icon}</div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>{s.value}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Edit Form */}
              <form onSubmit={handleSave} style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 4px 12px rgba(0,0,0,.06)' }}>
                <h3 style={{ margin: '0 0 20px', fontWeight: 800 }}>Update Equipment Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                  {isBaler && <>
                    <Field label="Machine Type">
                      <select value={form.machineType || ''} onChange={e => setForm(f => ({...f, machineType: e.target.value}))} style={SEL}>
                        <option value="">Select type...</option>
                        {MACHINE_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </Field>
                    <Field label="Number of Machines">
                      <input type="number" min="1" value={form.machineCount || 1} onChange={e => setForm(f => ({...f, machineCount: e.target.value}))} style={INP} />
                    </Field>
                    <Field label="Price Per Bale (₹)">
                      <input type="number" placeholder="e.g. 35" value={form.pricePerBale || ''} onChange={e => setForm(f => ({...f, pricePerBale: e.target.value}))} style={INP} />
                    </Field>
                  </>}

                  {isMover && <>
                    <Field label="Vehicle Type">
                      <select value={form.vehicleType || ''} onChange={e => setForm(f => ({...f, vehicleType: e.target.value}))} style={SEL}>
                        <option value="">Select type...</option>
                        {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </Field>
                    <Field label="Number of Vehicles">
                      <input type="number" min="1" value={form.vehicleCount || 1} onChange={e => setForm(f => ({...f, vehicleCount: e.target.value}))} style={INP} />
                    </Field>
                    <Field label="License Number">
                      <input placeholder="PB-XX-XXXX-XXXX" value={form.licenseNo || ''} onChange={e => setForm(f => ({...f, licenseNo: e.target.value}))} style={INP} />
                    </Field>
                  </>}

                  {isFarmer && <>
                    <Field label="Land Area (Acres)">
                      <input type="number" min="0" step="0.5" value={form.landAcres || ''} onChange={e => setForm(f => ({...f, landAcres: e.target.value}))} style={INP} />
                    </Field>
                    <Field label="Village">
                      <input value={form.village || ''} onChange={e => setForm(f => ({...f, village: e.target.value}))} style={INP} />
                    </Field>
                  </>}

                  <Field label="District">
                    <input value={form.district || ''} onChange={e => setForm(f => ({...f, district: e.target.value}))} style={INP} />
                  </Field>
                  <Field label="Pincode">
                    <input value={form.pincode || ''} onChange={e => setForm(f => ({...f, pincode: e.target.value}))} style={INP} />
                  </Field>
                </div>

                {/* Maintenance Table */}
                <div style={{ marginTop: 28 }}>
                  <h4 style={{ margin: '0 0 12px', fontWeight: 800, fontSize: 15 }}>Maintenance Checklist</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(isBaler ? ['Engine Oil', 'Knotter Mechanism', 'Belt Drive', 'Pickup Fingers'] :
                      isMover ? ['Engine Oil', 'Tyres', 'Brakes', 'Lights & Indicators'] :
                      ['Irrigation System', 'Soil pH', 'Seeds Stock', 'Fertiliser Stock']).map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{item}</span>
                        <select defaultValue="Good"
                          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, color: '#0F172A', cursor: 'pointer' }}>
                          {MAINTENANCE_STATUS.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button type="submit" disabled={saving}
                    style={{ padding: '12px 32px', background: '#1B4332', color: 'white', border: 'none', borderRadius: 10, fontWeight: 800, cursor: 'pointer' }}>
                    {saving ? 'Saving...' : '💾 Save Equipment Details'}
                  </button>
                  {saved && <span style={{ color: '#059669', fontWeight: 700 }}>✓ Saved successfully!</span>}
                </div>
              </form>

              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.3px' }}>{label}</label>
      {children}
    </div>
  );
}

const INP = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' };
const SEL = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: 'white', boxSizing: 'border-box' };
