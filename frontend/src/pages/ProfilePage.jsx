import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const LOGO = '/logo.png';

const DISTRICTS = {
  Punjab: ['Amritsar','Barnala','Bathinda','Faridkot','Fatehgarh Sahib','Fazilka','Ferozepur','Gurdaspur','Hoshiarpur','Jalandhar','Kapurthala','Ludhiana','Mansa','Moga','Mohali (SAS Nagar)','Muktsar','Nawanshahr','Pathankot','Patiala','Rupnagar','Sangrur','Tarn Taran'],
  Haryana: ['Ambala','Bhiwani','Charkhi Dadri','Faridabad','Fatehabad','Gurugram','Hisar','Jhajjar','Jind','Kaithal','Karnal','Kurukshetra','Mahendragarh','Nuh (Mewat)','Palwal','Panchkula','Panipat','Rewari','Rohtak','Sirsa','Sonipat','Yamunanagar'],
};

const STEPS = ['Profile', 'Details', 'Review'];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [step, setStep]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const role = user?.role || '';

  // Common fields
  const [form, setForm] = useState({
    fullName: '', companyName: '', contactPerson: '', village: '',
    state: '', district: '', pincode: '',
    // Farmer extras
    landAcres: '', cropTypes: '',
    // Industry extras
    industryType: '', gstNumber: '',
    // Baler extras
    machineType: '', machineCount: '1', pricePerBale: '',
    // Mover extras
    vehicleType: '', vehicleCount: '1', licenseNo: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        cropTypes: form.cropTypes ? form.cropTypes.split(',').map(s => s.trim()) : [],
      };
      await api.put('/user/profile', payload);
      navigate('/setup/documents');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const stepCount = role === 'farmer' || role === 'industry' ? 2 : 3;

  return (
    <div className="page">
      <div className="header-bar">
        <button className="back-btn" onClick={() => step === 0 ? navigate('/pending') : setStep(s => s - 1)}>←</button>
        <div className="logo-center" style={{ flex: 1, margin: 0 }}>
          <img src={LOGO} alt="" style={{ width: 32, height: 32 }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--green-dark)' }}>
            Pind<span style={{ color: 'var(--gold)' }}>Bazaar</span>
          </div>
        </div>
      </div>

      {/* Role tag + progress */}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <span className="label-tag">{role.charAt(0).toUpperCase() + role.slice(1)}</span>
        <div className="progress-dots">
          {[...Array(3)].map((_, i) => (
            <span key={i} className={i < step ? 'done' : i === step ? 'active' : ''} />
          ))}
        </div>
      </div>

      <div className="page-content">
        <div style={{ textAlign: 'center' }}>
          <h2>Complete your profile</h2>
          <p className="subtitle">
            {role === 'baler' ? 'This helps farmers and industries find your baling services'
             : role === 'mover' ? 'This helps others find your transport services'
             : 'Help buyers and sellers find you'}
          </p>
        </div>

        {error && <div className="error-box">{error}</div>}

        {/* STEP 0 – Basic info */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {role === 'industry' ? (
              <>
                <div className="input-group">
                  <label>Company Name <span className="required">*</span></label>
                  <input className="input-field" placeholder="Enter company name" value={form.companyName} onChange={e => set('companyName', e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Contact Person <span className="required">*</span></label>
                  <input className="input-field" placeholder="Enter contact person name" value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)} />
                </div>
              </>
            ) : (
              <div className="input-group">
                <label>Full Name <span className="required">*</span></label>
                <input className="input-field" placeholder="Enter your full name" value={form.fullName} onChange={e => set('fullName', e.target.value)} />
              </div>
            )}
            <div className="input-group">
              <label>Village <span className="required">*</span></label>
              <input className="input-field" placeholder="Enter village name" value={form.village} onChange={e => set('village', e.target.value)} />
            </div>
            <div className="input-group">
              <label>State <span className="required">*</span></label>
              <select className="input-field" value={form.state} onChange={e => { set('state', e.target.value); set('district', ''); }}>
                <option value="">Select state</option>
                <option value="Punjab">Punjab</option>
                <option value="Haryana">Haryana</option>
              </select>
            </div>
            <div className="input-group">
              <label>District <span className="required">*</span></label>
              <select className="input-field" value={form.district} onChange={e => set('district', e.target.value)} disabled={!form.state}>
                <option value="">Select district</option>
                {(DISTRICTS[form.state] || []).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Pincode <span className="required">*</span></label>
              <input className="input-field" placeholder="Enter 6-digit pincode" maxLength={6} inputMode="numeric" value={form.pincode} onChange={e => set('pincode', e.target.value.replace(/\D/g, ''))} />
            </div>
          </div>
        )}

        {/* STEP 1 – Role-specific */}
        {step === 1 && role === 'farmer' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p className="section-title">Farm Details</p>
            <div className="input-group">
              <label>Land (Acres)</label>
              <input className="input-field" type="number" placeholder="e.g. 5" value={form.landAcres} onChange={e => set('landAcres', e.target.value)} />
            </div>
            <div className="input-group">
              <label>Crop Types</label>
              <input className="input-field" placeholder="Wheat, Rice, Maize (comma separated)" value={form.cropTypes} onChange={e => set('cropTypes', e.target.value)} />
            </div>
          </div>
        )}

        {step === 1 && role === 'industry' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p className="section-title">Industry Details</p>
            <div className="input-group">
              <label>Industry Type <span className="required">*</span></label>
              <select className="input-field" value={form.industryType} onChange={e => set('industryType', e.target.value)}>
                <option value="">Select type</option>
                <option value="Rice Mill">Rice Mill</option>
                <option value="Flour Mill">Flour Mill</option>
                <option value="Biomass Plant">Biomass Plant</option>
                <option value="Paper Mill">Paper Mill</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="input-group">
              <label>GST Number</label>
              <input className="input-field" placeholder="Enter GST number (optional)" value={form.gstNumber} onChange={e => set('gstNumber', e.target.value)} />
            </div>
          </div>
        )}

        {step === 1 && role === 'baler' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p className="section-title">Baler Machine Details</p>
            <div className="input-group">
              <label>Machine Type <span className="required">*</span></label>
              <div className="machine-grid">
                {[{ key:'square', icon:'⬜', label:'Square Baler' }, { key:'round', icon:'⭕', label:'Round Baler' }].map(m => (
                  <div key={m.key} className={`machine-card${form.machineType === m.key ? ' selected' : ''}`} onClick={() => set('machineType', m.key)}>
                    <div className="mc-icon">{m.icon}</div>
                    <div className="mc-label">{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="input-group">
              <label>Number of Machines</label>
              <input className="input-field" type="number" min="1" value={form.machineCount} onChange={e => set('machineCount', e.target.value)} />
            </div>
            <div className="input-group">
              <label>Price per Bale (₹)</label>
              <input className="input-field" type="number" placeholder="e.g. 25" value={form.pricePerBale} onChange={e => set('pricePerBale', e.target.value)} />
            </div>
          </div>
        )}

        {step === 1 && role === 'mover' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p className="section-title">Vehicle Details</p>
            <div className="input-group">
              <label>Vehicle Type <span className="required">*</span></label>
              <select className="input-field" value={form.vehicleType} onChange={e => set('vehicleType', e.target.value)}>
                <option value="">Select vehicle</option>
                <option value="Tractor-Trolley">Tractor-Trolley</option>
                <option value="Mini Truck">Mini Truck</option>
                <option value="Large Truck">Large Truck</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="input-group">
              <label>Number of Vehicles</label>
              <input className="input-field" type="number" min="1" value={form.vehicleCount} onChange={e => set('vehicleCount', e.target.value)} />
            </div>
            <div className="input-group">
              <label>License Number</label>
              <input className="input-field" placeholder="Enter driving license number" value={form.licenseNo} onChange={e => set('licenseNo', e.target.value)} />
            </div>
          </div>
        )}

        {/* STEP 2 – Review */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="info-box">
              <strong>📋 Profile Summary</strong><br /><br />
              <strong>Name:</strong> {form.fullName || form.companyName}<br />
              <strong>Village:</strong> {form.village}<br />
              <strong>State:</strong> {form.state}<br />
              <strong>District:</strong> {form.district}<br />
              <strong>Pincode:</strong> {form.pincode}<br />
              {role === 'baler' && <><strong>Machine:</strong> {form.machineType} × {form.machineCount}<br /></>}
              {role === 'mover' && <><strong>Vehicle:</strong> {form.vehicleType} × {form.vehicleCount}<br /></>}
            </div>
          </div>
        )}
      </div>

      <div className="page-footer">
        {step < 2 ? (
          <button
            className="btn-primary"
            onClick={() => setStep(s => s + 1)}
            disabled={
              step === 0 && (!form.village || !form.state || !form.district || !form.pincode ||
                (role !== 'industry' ? !form.fullName : (!form.companyName || !form.contactPerson)))
            }
          >
            Continue
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
