import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const LOGO = '/logo.png';

function UploadBox({ label, fieldName, required, files, setFiles }) {
  const file = files[fieldName];
  return (
    <div className="input-group">
      <label>{label}{required && <span className="required"> *</span>}</label>
      <label className={`upload-area${file ? ' has-file' : ''}`} htmlFor={`file-${fieldName}`}>
        <input
          id={`file-${fieldName}`}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={(e) => setFiles(f => ({ ...f, [fieldName]: e.target.files[0] }))}
        />
        {file ? (
          <>
            <div className="upload-icon">✅</div>
            <div className="file-name">{file.name}</div>
          </>
        ) : (
          <>
            <div className="upload-icon">🖼️</div>
            <div className="upload-label">Tap to take photo or choose from gallery</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>JPG, PNG or PDF · Max 5MB</div>
          </>
        )}
      </label>
    </div>
  );
}

const DOC_CONFIG = {
  farmer:   [{ field: 'aadhaar', label: 'Aadhaar Card', required: true }, { field: 'land_record', label: 'Land Record / Khasra', required: false }],
  industry: [{ field: 'aadhaar', label: 'Aadhaar (Contact Person)', required: true }, { field: 'gst_certificate', label: 'GST Certificate', required: false }],
  baler:    [{ field: 'aadhaar', label: 'Aadhaar Card', required: true }, { field: 'machine_photo', label: 'Machine Photo', required: true }],
  mover:    [{ field: 'aadhaar', label: 'Aadhaar Card', required: true }, { field: 'vehicle_rc', label: 'Vehicle RC', required: true }],
};

export default function DocumentsPage() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const [files, setFiles]     = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const role    = user?.role || 'farmer';
  const docList = DOC_CONFIG[role] || DOC_CONFIG.farmer;

  const handleSubmit = async () => {
    const requiredMissing = docList.filter(d => d.required && !files[d.field]);
    if (requiredMissing.length > 0) {
      setError(`Please upload: ${requiredMissing.map(d => d.label).join(', ')}`);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(files).forEach(([k, v]) => { if (v) formData.append(k, v); });
      await api.post('/user/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      navigate('/pending');
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="header-bar">
        <button className="back-btn" onClick={() => navigate('/setup/profile')}>←</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span className="label-tag">{role.charAt(0).toUpperCase() + role.slice(1)}</span>
        </div>
      </div>

      <div className="page-content">
        <div>
          <h2>Upload Documents</h2>
          <p className="subtitle">Required for account verification</p>
        </div>

        {docList.map(doc => (
          <UploadBox
            key={doc.field}
            label={doc.label}
            fieldName={doc.field}
            required={doc.required}
            files={files}
            setFiles={setFiles}
          />
        ))}

        {error && <div className="error-box">{error}</div>}

        <div className="info-box">
          🔒 Your documents are encrypted and shared only with our verification team
        </div>
      </div>

      <div className="page-footer">
        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Uploading…' : 'Submit Application'}
        </button>
        <button className="btn-ghost" style={{ marginTop: 12, display: 'block', width: '100%', textAlign: 'center' }} onClick={() => navigate('/pending')}>
          Skip for now
        </button>
      </div>
    </div>
  );
}
