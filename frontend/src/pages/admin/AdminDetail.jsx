import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';

export default function AdminDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes]     = useState('');
  const [acting, setActing]   = useState(false);
  const [msg, setMsg]         = useState('');

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

  if (loading) return <div className="spinner" style={{ marginTop: 80 }} />;
  if (!data)   return <div style={{ padding: 40 }}>Not found</div>;

  const profile = data.farmerProfile || data.industryProfile || data.balerProfile || data.moverProfile;
  const ROLE_EMOJI = { farmer:'🌾', industry:'🏭', baler:'🔧', mover:'🚛' };

  const InfoRow = ({ label, value }) => value ? (
    <tr>
      <td style={{ padding:'8px 0', color:'var(--text-muted)', fontSize:13, width:140 }}>{label}</td>
      <td style={{ padding:'8px 0', fontWeight:500 }}>{value}</td>
    </tr>
  ) : null;

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-logo">Pind<span style={{color:'var(--gold-light)'}}>Bazaar</span></div>
        <nav className="sidebar-nav">
          <button className="nav-item" onClick={() => navigate('/admin')}>📊 Dashboard</button>
          <button className="nav-item active" onClick={() => navigate('/admin')}>📋 Applications</button>
        </nav>
      </aside>

      <main className="admin-main">
        <button onClick={() => navigate('/admin')} style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, padding:'6px 14px', cursor:'pointer', marginBottom:24, fontSize:13 }}>
          ← Back
        </button>

        <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:24 }}>
          <h1 style={{ margin:0 }}>{data.name || profile?.fullName || profile?.companyName || 'Applicant'}</h1>
          <span className={`badge badge-${data.status}`}>{data.status}</span>
          <span className="badge" style={{ background:'var(--green-pale)', color:'var(--green-dark)' }}>
            {ROLE_EMOJI[data.role]} {data.role}
          </span>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, maxWidth:860 }}>
          {/* User Info */}
          <div className="table-card" style={{ padding:24 }}>
            <p className="section-title" style={{ marginBottom:12 }}>Contact Info</p>
            <table style={{ width:'100%' }}>
              <tbody>
                <InfoRow label="Phone" value={`+91 ${data.phone}`} />
                <InfoRow label="Email" value={data.email} />
                <InfoRow label="Registered" value={new Date(data.createdAt).toLocaleDateString('en-IN')} />
              </tbody>
            </table>
          </div>

          {/* Profile */}
          <div className="table-card" style={{ padding:24 }}>
            <p className="section-title" style={{ marginBottom:12 }}>Profile Details</p>
            <table style={{ width:'100%' }}>
              <tbody>
                {profile && <>
                  <InfoRow label="Village"   value={profile.village} />
                  <InfoRow label="District"  value={profile.district} />
                  <InfoRow label="State"     value={profile.state} />
                  <InfoRow label="Pincode"   value={profile.pincode} />
                  {/* Role-specific */}
                  {data.role==='farmer'   && <><InfoRow label="Land (acres)" value={profile.landAcres} /><InfoRow label="Crops" value={profile.cropTypes?.join(', ')} /></>}
                  {data.role==='industry' && <><InfoRow label="Type" value={profile.industryType} /><InfoRow label="GST" value={profile.gstNumber} /></>}
                  {data.role==='baler'    && <><InfoRow label="Machine" value={profile.machineType} /><InfoRow label="Count" value={profile.machineCount} /><InfoRow label="₹/Bale" value={profile.pricePerBale} /></>}
                  {data.role==='mover'    && <><InfoRow label="Vehicle" value={profile.vehicleType} /><InfoRow label="Count" value={profile.vehicleCount} /><InfoRow label="License" value={profile.licenseNo} /></>}
                </>}
              </tbody>
            </table>
          </div>

          {/* Documents */}
          <div className="table-card" style={{ padding:24 }}>
            <p className="section-title" style={{ marginBottom:12 }}>Documents ({data.documents?.length || 0})</p>
            {data.documents?.length === 0 && <p style={{ color:'var(--text-muted)', fontSize:13 }}>No documents uploaded</p>}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {data.documents?.map(doc => (
                <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noreferrer"
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'var(--bg-input)', borderRadius:8, textDecoration:'none', color:'var(--green-dark)', fontSize:13, fontWeight:500 }}>
                  📄 {doc.docType.replace(/_/g,' ').toUpperCase()}
                  <span style={{ marginLeft:'auto', fontSize:11, color:'var(--text-muted)' }}>View →</span>
                </a>
              ))}
            </div>
          </div>

          {/* Action panel */}
          <div className="table-card" style={{ padding:24 }}>
            <p className="section-title" style={{ marginBottom:12 }}>Admin Action</p>
            <div className="input-group" style={{ marginBottom:16 }}>
              <label>Notes / Reason</label>
              <textarea className="input-field" rows={4} style={{ resize:'vertical' }}
                placeholder="Add notes or rejection reason…"
                value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            {msg && <div className={msg.startsWith('✅') ? 'info-box' : 'error-box'} style={{ marginBottom:12 }}>{msg}</div>}
            {data.status !== 'approved' && (
              <button className="btn-primary" onClick={() => act('approve')} disabled={acting} style={{ marginBottom:10 }}>
                ✅ Approve Application
              </button>
            )}
            {data.status !== 'rejected' && (
              <button onClick={() => act('reject')} disabled={acting}
                style={{ width:'100%', padding:'14px', background:'#FEE2E2', color:'#991B1B', border:'1.5px solid #F5C6C6', borderRadius:'var(--radius-md)', fontWeight:600, cursor:'pointer', fontSize:15 }}>
                ❌ Reject Application
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
