import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';

function TrustGauge({ score, level }) {
  const color = score >= 90 ? '#059669' : score >= 70 ? '#2D6A4F' : score >= 40 ? '#D97706' : '#DC2626';
  const r = 40, circ = 2 * Math.PI * r;
  const offset = circ * (1 - (score ?? 0) / 100);
  const levelBg = { low: '#FEE2E2', medium: '#FEF3C7', high: '#DCFCE7', verified: '#D1FAE5' };
  const levelColor = { low: '#991B1B', medium: '#92400E', high: '#065F46', verified: '#064E3B' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: 100, height: 100 }}>
        <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r={r} fill="none" stroke="#E2E8F0" strokeWidth="10" />
          <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset .6s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 24, fontWeight: 900, color }}>{score ?? '—'}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B' }}>/ 100</span>
        </div>
      </div>
      {level && (
        <span style={{ fontSize: 12, fontWeight: 800, padding: '4px 12px', borderRadius: 20, background: levelBg[level] || '#F1F5F9', color: levelColor[level] || '#475569', textTransform: 'uppercase', letterSpacing: '.5px' }}>
          {level === 'verified' ? '✓ Verified' : level === 'high' ? '↑ High Trust' : level === 'medium' ? '~ Medium' : '⚠ Low Trust'}
        </span>
      )}
    </div>
  );
}

function ScoreBar({ label, score }) {
  if (score == null) return null;
  const c = score >= 80 ? '#059669' : score >= 50 ? '#D97706' : '#DC2626';
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13, fontWeight: 600 }}>
        <span style={{ color: '#475569' }}>{label}</span>
        <span style={{ color: c, fontWeight: 800 }}>{score}%</span>
      </div>
      <div style={{ height: 8, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: c, borderRadius: 4, transition: 'width .6s ease' }} />
      </div>
    </div>
  );
}

function CompareRow({ label, claimed, parsed, highlight }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 12, padding: '10px 0', borderBottom: '1px solid #F1F5F9', alignItems: 'start' }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#475569' }}>{claimed || '—'}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: highlight ? '#059669' : '#0F172A' }}>{parsed || '—'}</span>
    </div>
  );
}

export default function AdminDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes]     = useState('');
  const [acting, setActing]   = useState(false);
  const [msg, setMsg]         = useState('');
  const [reanalyzing, setReanalyzing] = useState(false);

  useEffect(() => {
    api.get(`/admin/applications/${id}`)
      .then(r => { setData(r.data.user); setNotes(r.data.user.adminNotes || ''); })
      .finally(() => setLoading(false));
  }, [id]);

  const act = async (action) => {
    if (action === 'reject' && !notes.trim()) { setMsg('Please enter a rejection reason'); return; }
    setActing(true); setMsg('');
    try {
      await api.put(`/admin/applications/${id}/${action}`, { notes });
      setMsg(action === 'approve' ? '✅ Approved!' : '❌ Rejected.');
      setTimeout(() => navigate('/admin?tab=applications'), 1500);
    } catch (e) { setMsg(e.response?.data?.error || 'Action failed'); }
    finally { setActing(false); }
  };

  const triggerReanalysis = async () => {
    setReanalyzing(true);
    try {
      await api.post(`/verification/reanalyze/${id}`);
      setMsg('🔄 Re-analysis triggered. Refresh in ~15 seconds.');
    } catch (e) { setMsg('Re-analysis failed: ' + (e.response?.data?.error || e.message)); }
    finally { setReanalyzing(false); }
  };

  if (loading) return <div className="spinner" style={{ marginTop: 80 }} />;
  if (!data)   return <div style={{ padding: 40 }}>Not found</div>;

  const profile = data.farmerProfile || data.industryProfile || data.balerProfile || data.moverProfile;
  const av = data.aadhaarVerification;
  const ROLE_EMOJI = { farmer: '🌾', industry: '🏭', baler: '🔧', mover: '🚛' };

  const InfoRow = ({ label, value }) => value ? (
    <tr>
      <td style={{ padding: '8px 0', color: 'var(--text-muted)', fontSize: 13, width: 140 }}>{label}</td>
      <td style={{ padding: '8px 0', fontWeight: 500 }}>{value}</td>
    </tr>
  ) : null;

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-logo">Pind<span style={{ color: 'var(--gold-light)' }}>Bazaar</span></div>
        <nav className="sidebar-nav">
          <button className="nav-item" onClick={() => navigate('/admin')}>📊 Dashboard</button>
          <button className="nav-item active" onClick={() => navigate('/admin')}>📋 Applications</button>
        </nav>
      </aside>

      <main className="admin-main">
        <button onClick={() => navigate('/admin')} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', marginBottom: 24, fontSize: 13 }}>
          ← Back
        </button>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ margin: 0 }}>{data.name || profile?.fullName || profile?.companyName || 'Applicant'}</h1>
          <span className={`badge badge-${data.status}`}>{data.status}</span>
          <span className="badge" style={{ background: 'var(--green-pale)', color: 'var(--green-dark)' }}>
            {ROLE_EMOJI[data.role]} {data.role}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900 }}>

          {/* Contact + Profile */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="table-card" style={{ padding: 24 }}>
              <p className="section-title" style={{ marginBottom: 12 }}>Contact Info</p>
              <table style={{ width: '100%' }}><tbody>
                <InfoRow label="Phone" value={`+91 ${data.phone}`} />
                <InfoRow label="Email" value={data.email} />
                <InfoRow label="Registered" value={new Date(data.createdAt).toLocaleDateString('en-IN')} />
              </tbody></table>
            </div>
            <div className="table-card" style={{ padding: 24 }}>
              <p className="section-title" style={{ marginBottom: 12 }}>Profile Details</p>
              <table style={{ width: '100%' }}><tbody>
                {profile && <>
                  <InfoRow label="Village"   value={profile.village} />
                  <InfoRow label="District"  value={profile.district} />
                  <InfoRow label="State"     value={profile.state} />
                  <InfoRow label="Pincode"   value={profile.pincode} />
                  {data.role === 'farmer'   && <><InfoRow label="Land (acres)" value={profile.landAcres} /><InfoRow label="Crops" value={profile.cropTypes?.join(', ')} /></>}
                  {data.role === 'industry' && <><InfoRow label="Type" value={profile.industryType} /><InfoRow label="GST" value={profile.gstNumber} /></>}
                  {data.role === 'baler'    && <><InfoRow label="Machine" value={profile.machineType} /><InfoRow label="Count" value={profile.machineCount} /><InfoRow label="₹/Bale" value={profile.pricePerBale} /></>}
                  {data.role === 'mover'    && <><InfoRow label="Vehicle" value={profile.vehicleType} /><InfoRow label="Count" value={profile.vehicleCount} /><InfoRow label="License" value={profile.licenseNo} /></>}
                </>}
              </tbody></table>
            </div>
          </div>

          {/* Documents */}
          <div className="table-card" style={{ padding: 24 }}>
            <p className="section-title" style={{ marginBottom: 12 }}>Documents ({data.documents?.length || 0})</p>
            {data.documents?.length === 0
              ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No documents uploaded</p>
              : <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {data.documents?.map(doc => (
                  <a key={doc.id} href={`http://localhost:5000${doc.fileUrl}`} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--bg-input)', borderRadius: 8, textDecoration: 'none', color: 'var(--green-dark)', fontSize: 13, fontWeight: 500, border: '1px solid var(--border)' }}>
                    📄 {doc.docType.replace(/_/g, ' ').toUpperCase()}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>View →</span>
                  </a>
                ))}
              </div>
            }
          </div>

          {/* ── AI AADHAAR VERIFICATION PANEL ── */}
          <div className="table-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#3730a3)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>✦ AI Aadhaar Verification</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', marginTop: 3 }}>Powered by Claude AI</div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {av && (
                  <span style={{
                    fontSize: 12, padding: '4px 12px', borderRadius: 20, fontWeight: 800,
                    background: av.status === 'completed' ? 'rgba(74,222,128,.2)' : av.status === 'failed' ? 'rgba(248,113,113,.2)' : 'rgba(251,191,36,.2)',
                    color: av.status === 'completed' ? '#4ade80' : av.status === 'failed' ? '#f87171' : '#fbbf24',
                    border: `1px solid ${av.status === 'completed' ? 'rgba(74,222,128,.4)' : av.status === 'failed' ? 'rgba(248,113,113,.4)' : 'rgba(251,191,36,.4)'}`,
                  }}>
                    {av.status === 'completed' ? '✓ Complete' : av.status === 'failed' ? '✗ Failed' : '⏳ Pending'}
                  </span>
                )}
                <button onClick={triggerReanalysis} disabled={reanalyzing}
                  style={{ padding: '6px 14px', background: 'rgba(255,255,255,.15)', color: 'white', border: '1px solid rgba(255,255,255,.3)', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                  {reanalyzing ? 'Triggering...' : '↻ Re-analyze'}
                </button>
              </div>
            </div>

            {!av ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#64748B' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>No Aadhaar document uploaded yet</div>
                <div style={{ fontSize: 13 }}>Verification runs automatically when the user uploads their Aadhaar.</div>
              </div>
            ) : av.status === 'pending' ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#64748B' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>⏳</div>
                <div style={{ fontWeight: 700 }}>Analysis in progress…</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Claude is analyzing the document. Refresh in a few seconds.</div>
              </div>
            ) : (
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* Trust gauge + match scores */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 32, alignItems: 'start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <TrustGauge score={av.trustScore} level={av.trustLevel} />
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.5px' }}>Trust Score</div>
                    <div style={{ padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: av.isDocumentGenuine ? '#DCFCE7' : '#FEE2E2', color: av.isDocumentGenuine ? '#166534' : '#991B1B', border: `1px solid ${av.isDocumentGenuine ? '#BBF7D0' : '#FECACA'}` }}>
                      {av.isDocumentGenuine ? '✓ Document Genuine' : '⚠ Possibly Altered'}
                    </div>
                  </div>
                  <div>
                    <ScoreBar label="Name Match" score={av.nameMatchScore} />
                    <ScoreBar label="Address Match" score={av.addressMatchScore} />
                    {av.fraudFlags?.length > 0 ? (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', marginBottom: 8 }}>⚠ Fraud Flags</div>
                        {av.fraudFlags.map((f, i) => (
                          <div key={i} style={{ padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 13, color: '#B91C1C', fontWeight: 600, marginBottom: 6 }}>
                            ⚠ {f}
                          </div>
                        ))}
                      </div>
                    ) : av.status === 'completed' && (
                      <div style={{ marginTop: 8, padding: '8px 12px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, fontSize: 13, color: '#166534', fontWeight: 600 }}>
                        ✓ No fraud flags detected
                      </div>
                    )}
                  </div>
                </div>

                {/* Claimed vs Parsed */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>Claimed vs Aadhaar Data</div>
                  <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '0 16px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 12, padding: '8px 0', borderBottom: '2px solid #E2E8F0' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8' }}>FIELD</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8' }}>CLAIMED (PROFILE)</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#3730a3' }}>PARSED FROM AADHAAR</span>
                    </div>
                    <CompareRow label="Name" claimed={data.name || profile?.fullName || profile?.companyName} parsed={av.parsedName} highlight={av.nameMatchScore >= 80} />
                    <CompareRow label="Address" claimed={[profile?.village, profile?.district, profile?.state].filter(Boolean).join(', ')} parsed={av.parsedAddress} highlight={av.addressMatchScore >= 80} />
                    <CompareRow label="DOB" claimed="—" parsed={av.parsedDob} />
                    <CompareRow label="Gender" claimed="—" parsed={av.parsedGender} />
                    <CompareRow label="UID Last 4" claimed="—" parsed={av.parsedUidLast4 ? `****${av.parsedUidLast4}` : null} />
                  </div>
                </div>

                {/* AI Summary */}
                {av.aiSummary && (
                  <div style={{ background: 'linear-gradient(135deg,#EEF2FF,#E0E7FF)', border: '1px solid #C7D2FE', borderRadius: 12, padding: 16, display: 'flex', gap: 12 }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>🤖</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#4338CA', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Claude AI Summary</div>
                      <div style={{ fontSize: 14, color: '#1e1b4b', lineHeight: 1.6 }}>{av.aiSummary}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Admin Action */}
          <div className="table-card" style={{ padding: 24 }}>
            <p className="section-title" style={{ marginBottom: 12 }}>Admin Action</p>
            <div className="input-group" style={{ marginBottom: 16 }}>
              <label>Notes / Reason</label>
              <textarea className="input-field" rows={4} style={{ resize: 'vertical' }}
                placeholder="Add notes or rejection reason…"
                value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            {msg && <div className={msg.startsWith('✅') || msg.startsWith('🔄') ? 'info-box' : 'error-box'} style={{ marginBottom: 12 }}>{msg}</div>}
            {data.status !== 'approved' && (
              <button className="btn-primary" onClick={() => act('approve')} disabled={acting} style={{ marginBottom: 10 }}>
                ✅ Approve Application
              </button>
            )}
            {data.status !== 'rejected' && (
              <button onClick={() => act('reject')} disabled={acting}
                style={{ width: '100%', padding: '14px', background: '#FEE2E2', color: '#991B1B', border: '1.5px solid #F5C6C6', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
                ❌ Reject Application
              </button>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
