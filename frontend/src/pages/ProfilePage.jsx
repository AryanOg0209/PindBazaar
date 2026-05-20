import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const LOGO = '/logo.png';

const DISTRICTS = {
  Punjab: ['Amritsar','Barnala','Bathinda','Faridkot','Fatehgarh Sahib','Fazilka','Ferozepur','Gurdaspur','Hoshiarpur','Jalandhar','Kapurthala','Ludhiana','Mansa','Moga','Mohali (SAS Nagar)','Muktsar','Nawanshahr','Pathankot','Patiala','Rupnagar','Sangrur','Tarn Taran'],
  Haryana: ['Ambala','Bhiwani','Charkhi Dadri','Faridabad','Fatehabad','Gurugram','Hisar','Jhajjar','Jind','Kaithal','Karnal','Kurukshetra','Mahendragarh','Nuh (Mewat)','Palwal','Panchkula','Panipat','Rewari','Rohtak','Sirsa','Sonipat','Yamunanagar'],
};

const ROLE_META = {
  farmer:   { emoji: '🌾', color: '#2D6A4F', bg: '#D8F3DC', label: 'Farmer' },
  industry: { emoji: '🏭', color: '#1B5E9E', bg: '#DBEAFE', label: 'Industry' },
  baler:    { emoji: '⚙️', color: '#92400E', bg: '#FEF3C7', label: 'Baler' },
  mover:    { emoji: '🚛', color: '#7C3AED', bg: '#EDE9FE', label: 'Mover' },
};

function StepBar({ step, role }) {
  const steps = role === 'farmer' || role === 'industry'
    ? ['Basic Info', 'Details', 'Review']
    : ['Basic Info', 'Equipment', 'Review'];
  return (
    <div style={{ padding: '0 24px 4px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {steps.map((label, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              {i > 0 && (
                <div style={{ flex: 1, height: 3, background: i <= step ? 'var(--green-600)' : 'var(--border)', transition: 'background .3s', borderRadius: 2 }} />
              )}
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: i < step ? 'var(--green-600)' : i === step ? 'var(--green-800)' : 'var(--border)',
                color: i <= step ? 'white' : 'var(--text-4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: i < step ? 14 : 13, fontWeight: 900,
                transition: 'all .3s', boxShadow: i === step ? '0 0 0 4px rgba(45,106,79,.2)' : 'none',
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div style={{ flex: 1, height: 3, background: i < step ? 'var(--green-600)' : 'var(--border)', transition: 'background .3s', borderRadius: 2 }} />
              )}
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: i === step ? 'var(--green-800)' : 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '.5px', textAlign: 'center' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div className="input-group">
      <label>{label}{required && <span className="required"> *</span>}</label>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [step, setStep]       = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const role = user?.role || '';
  const meta = ROLE_META[role] || ROLE_META.farmer;

  const [form, setForm] = useState({
    fullName: '', companyName: '', contactPerson: '', village: '',
    state: '', district: '', pincode: '',
    landAcres: '', cropTypes: '',
    industryType: '', gstNumber: '',
    machineType: '', machineCount: '1', pricePerBale: '',
    vehicleType: '', vehicleCount: '1', licenseNo: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setError(''); setLoading(true);
    try {
      const payload = {
        ...form,
        cropTypes: form.cropTypes ? form.cropTypes.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      await api.put('/user/profile', payload);
      navigate('/setup/documents');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save profile');
    } finally { setLoading(false); }
  };

  const displayName = form.fullName || form.companyName || '';

  const DetailRow = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 14, color: 'var(--text-1)', fontWeight: 700 }}>{value}</span>
    </div>
  );

  // Review card section
  const ReviewCard = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Profile header card */}
      <div style={{
        background: `linear-gradient(135deg, ${meta.color}ee, ${meta.color})`,
        borderRadius: 20, padding: '24px 20px',
        display: 'flex', alignItems: 'center', gap: 16,
        boxShadow: `0 8px 32px ${meta.color}44`,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: 'rgba(255,255,255,.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, backdropFilter: 'blur(8px)',
          border: '2px solid rgba(255,255,255,.3)',
        }}>
          {meta.emoji}
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'white', letterSpacing: '-.3px' }}>
            {displayName || 'Your Name'}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,.8)', fontWeight: 600, marginTop: 2 }}>
            {meta.label} · {form.district || 'District'}
          </div>
          <div style={{
            marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(255,255,255,.2)', borderRadius: 8,
            padding: '3px 10px', fontSize: 11, fontWeight: 800, color: 'white', letterSpacing: '.3px',
          }}>
            ⏳ PENDING VERIFICATION
          </div>
        </div>
      </div>

      {/* Location info */}
      <div style={{
        background: 'white', borderRadius: 16, border: '1.5px solid var(--border)',
        overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.06)',
      }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', background: 'var(--sand)' }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            📍 Location
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '16px 18px', gap: 12 }}>
          {[
            { label: 'Village', value: form.village },
            { label: 'Pincode', value: form.pincode },
            { label: 'District', value: form.district },
            { label: 'State', value: form.state },
          ].map(item => item.value ? (
            <div key={item.label}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{item.label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginTop: 2 }}>{item.value}</div>
            </div>
          ) : null)}
        </div>
      </div>

      {/* Role-specific info */}
      {(role === 'baler' || role === 'mover' || role === 'farmer' || role === 'industry') && (
        <div style={{
          background: 'white', borderRadius: 16, border: '1.5px solid var(--border)',
          overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.06)',
        }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', background: 'var(--sand)' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {meta.emoji} {meta.label} Details
            </span>
          </div>
          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {role === 'farmer' && (
              <>
                {form.landAcres && <DetailRow label="Land" value={`${form.landAcres} acres`} />}
                {form.cropTypes && <DetailRow label="Crops" value={form.cropTypes} />}
              </>
            )}
            {role === 'industry' && (
              <>
                {form.industryType && <DetailRow label="Type" value={form.industryType} />}
                {form.gstNumber && <DetailRow label="GST" value={form.gstNumber} />}
                {form.contactPerson && <DetailRow label="Contact" value={form.contactPerson} />}
              </>
            )}
            {role === 'baler' && (
              <>
                {form.machineType && <DetailRow label="Machine" value={`${form.machineType === 'square' ? 'Square Baler' : 'Round Baler'} × ${form.machineCount}`} />}
                {form.pricePerBale && <DetailRow label="Rate" value={`₹${form.pricePerBale}/bale`} />}
              </>
            )}
            {role === 'mover' && (
              <>
                {form.vehicleType && <DetailRow label="Vehicle" value={`${form.vehicleType} × ${form.vehicleCount}`} />}
                {form.licenseNo && <DetailRow label="License" value={form.licenseNo} />}
              </>
            )}
          </div>
        </div>
      )}

      {/* Next step hint */}
      <div style={{
        background: 'var(--green-50)', borderRadius: 14,
        border: '1.5px solid var(--green-400)', padding: '14px 18px',
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 20 }}>📄</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--green-800)' }}>Next: Upload Documents</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2, fontWeight: 500 }}>
            Aadhaar + supporting docs needed for AI-powered verification
          </div>
        </div>
      </div>
    </div>
  );

  const step0Valid = form.village && form.state && form.district && form.pincode &&
    (role !== 'industry' ? form.fullName : (form.companyName && form.contactPerson));

  return (
    <div className="page">
      {/* Header */}
      <div className="header-bar">
        <button className="back-btn" onClick={() => step === 0 ? navigate('/pending') : setStep(s => s - 1)}>←</button>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
          <img src={LOGO} alt="" style={{ width: 28, height: 28 }} />
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--green-800)' }}>
            Pind<span style={{ color: 'var(--gold-600)' }}>Bazaar</span>
          </span>
        </div>
        <span className="label-tag" style={{ fontSize: 12, padding: '4px 12px' }}>{meta.emoji} {meta.label}</span>
      </div>

      <StepBar step={step} role={role} />

      <div className="page-content" style={{ paddingTop: 16 }}>
        <div>
          <h2 style={{ fontSize: 26 }}>
            {step === 0 ? 'Basic Information' : step === 1 ? 'Your Details' : 'Review & Confirm'}
          </h2>
          <p className="subtitle" style={{ fontSize: 15, marginTop: 4 }}>
            {step === 0 ? 'Tell us where you operate'
             : step === 1 ? `Share your ${meta.label.toLowerCase()} details`
             : 'Everything looks right?'}
          </p>
        </div>

        {error && <div className="error-box">{error}</div>}

        {/* STEP 0 – Basic info */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {role === 'industry' ? (
              <>
                <Field label="Company Name" required>
                  <input className="input-field" placeholder="e.g. Punjab Rice Mills Pvt. Ltd." value={form.companyName} onChange={e => set('companyName', e.target.value)} />
                </Field>
                <Field label="Contact Person" required>
                  <input className="input-field" placeholder="Manager or owner's name" value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)} />
                </Field>
              </>
            ) : (
              <Field label="Full Name" required>
                <input className="input-field" placeholder="As on your Aadhaar card" value={form.fullName} onChange={e => set('fullName', e.target.value)} />
              </Field>
            )}
            <Field label="Village" required>
              <input className="input-field" placeholder="Your village or town name" value={form.village} onChange={e => set('village', e.target.value)} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="State" required>
                <select className="input-field" value={form.state} onChange={e => { set('state', e.target.value); set('district', ''); }}>
                  <option value="">State</option>
                  <option value="Punjab">Punjab</option>
                  <option value="Haryana">Haryana</option>
                </select>
              </Field>
              <Field label="District" required>
                <select className="input-field" value={form.district} onChange={e => set('district', e.target.value)} disabled={!form.state}>
                  <option value="">District</option>
                  {(DISTRICTS[form.state] || []).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Pincode" required>
              <input className="input-field" placeholder="6-digit pincode" maxLength={6} inputMode="numeric" value={form.pincode} onChange={e => set('pincode', e.target.value.replace(/\D/g, ''))} />
            </Field>
          </div>
        )}

        {/* STEP 1 – Role-specific */}
        {step === 1 && role === 'farmer' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'var(--green-50)', borderRadius: 12, padding: '12px 16px', border: '1px solid var(--green-400)', fontSize: 13, color: 'var(--green-800)', fontWeight: 500 }}>
              This info helps industries find you and make better offers.
            </div>
            <Field label="Land Holdings (Acres)">
              <input className="input-field" type="number" placeholder="e.g. 5" value={form.landAcres} onChange={e => set('landAcres', e.target.value)} />
            </Field>
            <Field label="Crop Types">
              <input className="input-field" placeholder="Wheat, Rice, Maize (comma separated)" value={form.cropTypes} onChange={e => set('cropTypes', e.target.value)} />
            </Field>
          </div>
        )}

        {step === 1 && role === 'industry' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Industry Type" required>
              <select className="input-field" value={form.industryType} onChange={e => set('industryType', e.target.value)}>
                <option value="">Select industry type</option>
                <option value="Rice Mill">Rice Mill</option>
                <option value="Flour Mill">Flour Mill</option>
                <option value="Biomass Plant">Biomass Plant</option>
                <option value="Paper Mill">Paper Mill</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="GST Number">
              <input className="input-field" placeholder="Optional — enter if registered" value={form.gstNumber} onChange={e => set('gstNumber', e.target.value)} />
            </Field>
          </div>
        )}

        {step === 1 && role === 'baler' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Machine Type" required>
              <div className="machine-grid">
                {[{ key:'square', icon:'⬜', label:'Square Baler' }, { key:'round', icon:'⭕', label:'Round Baler' }].map(m => (
                  <div key={m.key} className={`machine-card${form.machineType === m.key ? ' selected' : ''}`} onClick={() => set('machineType', m.key)}>
                    <div className="mc-icon">{m.icon}</div>
                    <div className="mc-label">{m.label}</div>
                  </div>
                ))}
              </div>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="No. of Machines">
                <input className="input-field" type="number" min="1" value={form.machineCount} onChange={e => set('machineCount', e.target.value)} />
              </Field>
              <Field label="Price per Bale (₹)">
                <input className="input-field" type="number" placeholder="e.g. 25" value={form.pricePerBale} onChange={e => set('pricePerBale', e.target.value)} />
              </Field>
            </div>
          </div>
        )}

        {step === 1 && role === 'mover' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Vehicle Type" required>
              <select className="input-field" value={form.vehicleType} onChange={e => set('vehicleType', e.target.value)}>
                <option value="">Select vehicle type</option>
                <option value="Tractor-Trolley">Tractor-Trolley</option>
                <option value="Mini Truck">Mini Truck</option>
                <option value="Large Truck">Large Truck</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="No. of Vehicles">
                <input className="input-field" type="number" min="1" value={form.vehicleCount} onChange={e => set('vehicleCount', e.target.value)} />
              </Field>
              <Field label="License Number">
                <input className="input-field" placeholder="DL number" value={form.licenseNo} onChange={e => set('licenseNo', e.target.value)} />
              </Field>
            </div>
          </div>
        )}

        {/* STEP 2 – Review */}
        {step === 2 && <ReviewCard />}
      </div>

      <div className="page-footer">
        {step < 2 ? (
          <button className="btn-primary" onClick={() => setStep(s => s + 1)} disabled={step === 0 && !step0Valid}>
            Continue →
          </button>
        ) : (
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving…' : 'Save & Upload Documents →'}
          </button>
        )}
      </div>
    </div>
  );
}
