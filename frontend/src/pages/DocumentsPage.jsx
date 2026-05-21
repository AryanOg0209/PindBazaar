import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const LOGO = '/logo.png';

const DOC_CONFIG = {
  farmer:   [
    { field: 'aadhaar', label: 'Aadhaar Card', subtitle: 'Front & back of Aadhaar', icon: '🪪', required: true, aiVerified: true },
    { field: 'land_record', label: 'Land Record / Khasra', subtitle: 'Jamabandi or Khasra Girdawari', icon: '📜', required: false },
  ],
  industry: [
    { field: 'aadhaar', label: 'Aadhaar Card', subtitle: 'Contact person\'s Aadhaar', icon: '🪪', required: true, aiVerified: true },
    { field: 'gst_certificate', label: 'GST Certificate', subtitle: 'GST registration document', icon: '📋', required: false },
  ],
  baler: [
    { field: 'aadhaar', label: 'Aadhaar Card', subtitle: 'Your personal Aadhaar', icon: '🪪', required: true, aiVerified: true },
    { field: 'machine_photo', label: 'Machine Photo', subtitle: 'Clear photo of your baler machine', icon: '📸', required: true },
  ],
  mover: [
    { field: 'aadhaar', label: 'Aadhaar Card', subtitle: 'Your personal Aadhaar', icon: '🪪', required: true, aiVerified: true },
    { field: 'vehicle_rc', label: 'Vehicle RC', subtitle: 'Registration certificate of vehicle', icon: '📄', required: true },
  ],
};

function UploadZone({ doc, file, onChange }) {
  const hasFile = !!file;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{doc.icon}</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>
              {doc.label}
              {doc.required && <span style={{ color: '#E53E3E', marginLeft: 3 }}>*</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-4)', fontWeight: 500 }}>{doc.subtitle}</div>
          </div>
        </div>
        {doc.aiVerified && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'linear-gradient(135deg, #7C3AED22, #7C3AED11)',
            border: '1px solid #7C3AED44',
            borderRadius: 8, padding: '3px 8px',
            fontSize: 10, fontWeight: 800, color: '#7C3AED', letterSpacing: '.3px',
          }}>
            ✦ AI Verified
          </div>
        )}
      </div>

      <label
        htmlFor={`file-${doc.field}`}
        style={{
          background: hasFile ? 'var(--green-50)' : 'white',
          border: `2.5px dashed ${hasFile ? 'var(--green-600)' : 'var(--sand-dark)'}`,
          borderStyle: hasFile ? 'solid' : 'dashed',
          borderRadius: 16, padding: hasFile ? '16px 20px' : '28px 20px',
          display: 'flex', alignItems: 'center', gap: 14,
          cursor: 'pointer', transition: 'all .2s',
        }}
      >
        <input id={`file-${doc.field}`} type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display: 'none' }}
          onChange={e => onChange(e.target.files[0])} />

        {hasFile ? (
          <>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'var(--green-600)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 22, flexShrink: 0,
            }}>✅</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--green-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                {(file.size / 1024).toFixed(0)} KB · Ready to upload
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--green-600)', fontWeight: 800, flexShrink: 0 }}>Change</div>
          </>
        ) : (
          <>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'var(--sand)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 24, flexShrink: 0,
            }}>📁</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2)' }}>
                Tap to upload
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 2 }}>
                JPG, PNG or PDF · Max 5MB
              </div>
            </div>
          </>
        )}
      </label>
    </div>
  );
}

export default function DocumentsPage() {
  const navigate = useNavigate();
  const { user }  = useAuth();
  const [files, setFiles]         = useState({});
  const [loading, setLoading]     = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError]         = useState('');
  const [uploaded, setUploaded]   = useState(false);

  // OCR state
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult]   = useState(null);
  const [ocrError, setOcrError]     = useState('');

  const role    = user?.role || 'farmer';
  const docList = DOC_CONFIG[role] || DOC_CONFIG.farmer;

  const setFile = (field, file) => {
    setFiles(f => ({ ...f, [field]: file }));
    if (field === 'aadhaar') { setOcrResult(null); setOcrError(''); }
  };

  const scanAadhaar = async () => {
    const file = files['aadhaar'];
    if (!file) return;
    setOcrLoading(true); setOcrError(''); setOcrResult(null);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const dataUrl = e.target.result;
          const base64 = dataUrl.split(',')[1];
          const mediaType = file.type || 'image/jpeg';
          const res = await api.post('/ai/parse-document', { imageBase64: base64, mediaType, documentType: 'Aadhaar card' });
          setOcrResult(res.data);
        } catch (err) {
          setOcrError(err.response?.data?.error || 'Could not read document. Try a clearer photo.');
        } finally { setOcrLoading(false); }
      };
      reader.onerror = () => { setOcrError('Could not read file.'); setOcrLoading(false); };
      reader.readAsDataURL(file);
    } catch { setOcrLoading(false); }
  };
  const uploadedCount = Object.values(files).filter(Boolean).length;
  const requiredList  = docList.filter(d => d.required);
  const allRequired   = requiredList.every(d => files[d.field]);

  const handleSubmit = async () => {
    if (!allRequired) {
      setError(`Please upload: ${requiredList.filter(d => !files[d.field]).map(d => d.label).join(', ')}`);
      return;
    }
    setError(''); setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(files).forEach(([k, v]) => { if (v) formData.append(k, v); });
      await api.post('/user/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUploaded(true);
      setLoading(false);
      // Show analyzing state before navigating
      if (files['aadhaar']) {
        setAnalyzing(true);
        await new Promise(r => setTimeout(r, 2800));
      }
      navigate('/pending');
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
      setLoading(false);
    }
  };

  // Show AI analyzing overlay
  if (analyzing) {
    return (
      <div className="page" style={{ justifyContent: 'center', alignItems: 'center', gap: 24, textAlign: 'center', padding: '0 32px' }}>
        <div style={{ position: 'relative', width: 100, height: 100 }}>
          <div style={{
            width: 100, height: 100, borderRadius: '50%',
            background: 'linear-gradient(135deg, #7C3AED22, #7C3AED44)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 40,
            animation: 'spin 2s linear infinite',
          }}>🔍</div>
        </div>
        <div>
          <h2 style={{ fontSize: 24 }}>AI Analyzing Aadhaar</h2>
          <p className="subtitle" style={{ fontSize: 15 }}>
            Claude is verifying your document, extracting details, and generating your trust score.
          </p>
        </div>
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320,
        }}>
          {['Extracting document data...', 'Cross-checking profile details...', 'Generating trust score...'].map((step, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'white', borderRadius: 12, padding: '12px 16px',
              border: '1.5px solid var(--border)',
              animation: `fadeIn .4s ease ${i * 0.6}s both`,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7C3AED', animation: 'pulse 1s infinite' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)' }}>{step}</span>
            </div>
          ))}
        </div>
        <style>{`
          @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.8)} }
          @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        `}</style>
      </div>
    );
  }

  const ROLE_LABELS = { farmer:'Farmer', industry:'Industry', baler:'Baler', mover:'Mover' };

  return (
    <div className="page">
      <div className="header-bar">
        <button className="back-btn" onClick={() => navigate('/setup/profile')}>←</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span className="label-tag" style={{ fontSize: 12 }}>
            {ROLE_LABELS[role] || role}
          </span>
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div className="page-content" style={{ gap: 20 }}>
        {/* Header */}
        <div>
          <h2 style={{ fontSize: 26 }}>Upload Documents</h2>
          <p className="subtitle" style={{ fontSize: 15 }}>
            Required for account verification
          </p>
        </div>

        {/* Progress indicator */}
        <div style={{
          background: 'white', borderRadius: 14, padding: '14px 18px',
          border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{ position: 'relative', width: 44, height: 44 }}>
            <svg width="44" height="44" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="22" cy="22" r="18" fill="none" stroke="var(--border)" strokeWidth="4" />
              <circle cx="22" cy="22" r="18" fill="none" stroke="var(--green-600)" strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 18}`}
                strokeDashoffset={`${2 * Math.PI * 18 * (1 - uploadedCount / docList.length)}`}
                style={{ transition: 'stroke-dashoffset .5s ease' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: 'var(--green-800)' }}>
              {uploadedCount}/{docList.length}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>
              {uploadedCount === 0 ? 'No documents yet' : uploadedCount === docList.length ? 'All documents ready!' : `${uploadedCount} of ${docList.length} uploaded`}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-4)', fontWeight: 500 }}>
              {requiredList.length} required · {docList.length - requiredList.length} optional
            </div>
          </div>
        </div>

        {/* Upload zones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {docList.map(doc => (
            <UploadZone key={doc.field} doc={doc} file={files[doc.field]} onChange={f => setFile(doc.field, f)} />
          ))}
        </div>

        {/* Aadhaar OCR Section */}
        {files['aadhaar'] && files['aadhaar'].type?.startsWith('image/') && (
          <div style={{ background: 'linear-gradient(135deg,#EDE9FE,#F5F3FF)', border: '1.5px solid #C4B5FD', borderRadius: 16, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: ocrResult ? 12 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>🔍</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#5B21B6' }}>Auto-fill from Aadhaar</div>
                  <div style={{ fontSize: 11, color: '#7C3AED', fontWeight: 500 }}>Claude AI will extract your details</div>
                </div>
              </div>
              {!ocrResult && (
                <button onClick={scanAadhaar} disabled={ocrLoading}
                  style={{ padding: '8px 16px', background: '#7C3AED', color: 'white', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 12, cursor: ocrLoading ? 'wait' : 'pointer', opacity: ocrLoading ? 0.7 : 1, whiteSpace: 'nowrap' }}>
                  {ocrLoading ? '⟳ Scanning...' : '✦ Scan Now'}
                </button>
              )}
            </div>

            {ocrError && <div style={{ marginTop: 8, fontSize: 12, color: '#B91C1C', fontWeight: 600, background: '#FEE2E2', padding: '8px 12px', borderRadius: 8 }}>{ocrError}</div>}

            {ocrResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#5B21B6', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>
                  Extracted Details {ocrResult.confidence > 0 && `· ${ocrResult.confidence}% confidence`}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { label: '👤 Name',     value: ocrResult.name },
                    { label: '📅 DOB',      value: ocrResult.dob },
                    { label: '⚧ Gender',   value: ocrResult.gender },
                    { label: '📍 District', value: ocrResult.district },
                    { label: '📮 PIN Code', value: ocrResult.pinCode },
                    { label: '🏛 State',   value: ocrResult.state },
                  ].filter(f => f.value).map((f, i) => (
                    <div key={i} style={{ background: 'white', borderRadius: 8, padding: '8px 12px', border: '1px solid #DDD6FE' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', marginBottom: 2 }}>{f.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1E1B4B' }}>{f.value}</div>
                    </div>
                  ))}
                </div>
                {ocrResult.address && (
                  <div style={{ background: 'white', borderRadius: 8, padding: '8px 12px', border: '1px solid #DDD6FE' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', marginBottom: 2 }}>📬 Address</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1E1B4B', lineHeight: 1.4 }}>{ocrResult.address}</div>
                  </div>
                )}
                <div style={{ fontSize: 11, color: '#6D28D9', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>✅</span> Details extracted — please verify they match your profile before submitting.
                </div>
              </div>
            )}
          </div>
        )}

        {error && <div className="error-box">{error}</div>}

        {/* AI badge */}
        <div style={{
          background: 'linear-gradient(135deg, #7C3AED11, #7C3AED08)',
          border: '1.5px solid #7C3AED33', borderRadius: 14, padding: '14px 18px',
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 20 }}>🔐</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#7C3AED' }}>AI-Powered Aadhaar Verification</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3, fontWeight: 500 }}>
              Claude AI reads your Aadhaar, generates a trust score, and creates a detailed report for admin review. Your data stays encrypted.
            </div>
          </div>
        </div>
      </div>

      <div className="page-footer">
        <button className="btn-primary" onClick={handleSubmit} disabled={loading || !allRequired}>
          {loading ? 'Uploading…' : uploaded ? 'Redirecting…' : 'Submit Application →'}
        </button>
        <button className="btn-ghost" style={{ textAlign: 'center', display: 'block', width: '100%' }} onClick={() => navigate('/pending')}>
          Skip for now
        </button>
      </div>
    </div>
  );
}
