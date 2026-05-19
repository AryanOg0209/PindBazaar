import { useState, useEffect, useCallback } from 'react';
import api from '../../../api/axios';

const ROLE_EMOJI  = { farmer: '🌾', industry: '🏭', baler: '🔧', mover: '🚛' };
const ROLE_COLOR  = { farmer: '#166534', industry: '#1e40af', baler: '#92400e', mover: '#6b21a8' };
const ROLE_BG     = { farmer: '#dcfce7', industry: '#dbeafe', baler: '#fef3c7', mover: '#f3e8ff' };

export default function VerificationsSection({ status, showToast, fetchStats }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [acting, setActing] = useState({});
  const [noteMap, setNoteMap] = useState({});
  const [expandedId, setExpandedId] = useState(null); // For detailed view

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/admin/applications?status=${status}&limit=50`);
      setUsers(r.data.users || []);
    } catch (e) {
      showToast('Failed to load applications', 'error');
    } finally { setLoading(false); }
  }, [status, showToast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const act = async (userId, action) => {
    setActing(a => ({ ...a, [userId]: action }));
    try {
      await api.put(`/admin/applications/${userId}/${action}`, { notes: noteMap[userId] || '' });
      showToast(`User ${action}d successfully`, 'success');
      setUsers(u => u.filter(x => x.id !== userId));
      fetchStats();
      if (expandedId === userId) setExpandedId(null);
    } catch (e) {
      showToast(e.response?.data?.error || 'Action failed', 'error');
    } finally {
      setActing(a => { const n = { ...a }; delete n[userId]; return n; });
    }
  };

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    const p = u.farmerProfile || u.industryProfile || u.balerProfile || u.moverProfile;
    return u.phone?.includes(q) || u.name?.toLowerCase().includes(q) || p?.fullName?.toLowerCase().includes(q) || p?.companyName?.toLowerCase().includes(q);
  });

  const getProfile = (u) => u.farmerProfile || u.industryProfile || u.balerProfile || u.moverProfile;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0D1F12' }}>
          {status === 'pending' ? 'Pending Verifications' : status === 'approved' ? 'Approved Users' : 'Rejected Applications'}
          <span style={{ marginLeft: 12, fontSize: 14, background: '#E8ECF0', padding: '4px 10px', borderRadius: 100, color: '#6B7280' }}>{filtered.length}</span>
        </h2>
        <input
          placeholder="Search phone or name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #E8ECF0', width: 280, outline: 'none', fontFamily: 'var(--font-sans)', fontSize: 14, boxShadow: 'inset 0 1px 3px rgba(0,0,0,.03)' }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'white', borderRadius: 16, border: '1px dashed #D1D5DB', color: '#6B7280' }}>
          No {status} applications found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map(u => {
            const profile = getProfile(u);
            const isActing = !!acting[u.id];
            const isExpanded = expandedId === u.id;
            const name = u.name || profile?.fullName || profile?.companyName || 'Unknown';

            return (
              <div key={u.id} style={{ background: 'white', borderRadius: 14, border: '1px solid #E8ECF0', boxShadow: '0 2px 8px rgba(0,0,0,.04)', overflow: 'hidden', transition: 'all .2s' }}>
                {/* Header / Summary */}
                <div style={{ padding: '20px 24px', display: 'flex', gap: 20, alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : u.id)}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: ROLE_BG[u.role], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                    {ROLE_EMOJI[u.role]}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>{name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, background: ROLE_BG[u.role], color: ROLE_COLOR[u.role], padding: '2px 8px', borderRadius: 100, textTransform: 'uppercase' }}>{u.role}</span>
                      <span style={{ fontSize: 13, color: '#6B7280' }}>+91 {u.phone}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4, display: 'flex', gap: 16 }}>
                      {profile?.district && <span>📍 {profile.district}, {profile.state}</span>}
                      {profile?.village && <span>🏡 {profile.village}</span>}
                      <span>🗓 {new Date(u.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }} onClick={e => e.stopPropagation()}>
                    {status === 'pending' && (
                      <>
                        <button disabled={isActing} onClick={() => act(u.id, 'approve')} style={{ padding: '8px 16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', opacity: isActing ? 0.6 : 1 }}>
                           ✅ Approve
                        </button>
                        <button disabled={isActing} onClick={() => act(u.id, 'reject')} style={{ padding: '8px 16px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', opacity: isActing ? 0.6 : 1 }}>
                           ❌ Reject
                        </button>
                      </>
                    )}
                    {status === 'approved' && (
                       <button disabled={isActing} onClick={() => act(u.id, 'reject')} style={{ padding: '8px 16px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', opacity: isActing ? 0.6 : 1 }}>
                         Revoke Access
                       </button>
                    )}
                    {status === 'rejected' && (
                       <button disabled={isActing} onClick={() => act(u.id, 'approve')} style={{ padding: '8px 16px', background: '#dcfce7', color: '#166534', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', opacity: isActing ? 0.6 : 1 }}>
                         Re-Approve
                       </button>
                    )}
                  </div>
                  <div style={{ color: '#9CA3AF', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▼</div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div style={{ padding: '20px 24px', borderTop: '1px solid #E8ECF0', background: '#FAFAFA' }}>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Profile Details</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                       {Object.entries(profile || {}).map(([k, v]) => {
                         if (['id', 'userId', 'createdAt', 'updatedAt'].includes(k)) return null;
                         if (typeof v === 'object') return null; // skip arrays for now
                         return (
                           <div key={k}>
                             <div style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase' }}>{k.replace(/([A-Z])/g, ' $1').trim()}</div>
                             <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginTop: 2 }}>{v || '—'}</div>
                           </div>
                         )
                       })}
                    </div>

                    <h4 style={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Documents</h4>
                    {u.documents?.length > 0 ? (
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {u.documents.map(d => (
                          <a key={d.id} href={d.fileUrl?.startsWith('/') ? d.fileUrl : `/${d.fileUrl}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'white', border: '1px solid #D1D5DB', borderRadius: 8, textDecoration: 'none', color: '#374151', fontSize: 13, fontWeight: 500 }}>
                            📄 {(d.docType || 'document').replace(/_/g, ' ')}
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: '#6B7280' }}>No documents uploaded.</div>
                    )}

                    {status === 'pending' && (
                      <div style={{ marginTop: 20 }}>
                        <input 
                          placeholder="Internal admin notes / reason for rejection (optional)..."
                          value={noteMap[u.id] || ''}
                          onChange={e => setNoteMap(m => ({ ...m, [u.id]: e.target.value }))}
                          style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13, fontFamily: 'var(--font-sans)', outline: 'none' }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
