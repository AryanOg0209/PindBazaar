import { useEffect, useMemo, useState } from 'react';
import api from '../../../api/axios';

const ROLE_META = {
  farmer: { icon:'🌾', bg:'#DCFCE7', color:'#166534' },
  industry: { icon:'🏭', bg:'#DBEAFE', color:'#1D4ED8' },
  baler: { icon:'🚜', bg:'#FEF3C7', color:'#92400E' },
  mover: { icon:'🚛', bg:'#EDE9FE', color:'#6D28D9' },
};

const STATUS_META = {
  pending: { label:'Pending', bg:'#FEF3C7', color:'#92400E' },
  approved: { label:'Approved', bg:'#DCFCE7', color:'#166534' },
  rejected: { label:'Rejected', bg:'#FEE2E2', color:'#991B1B' },
};

function nameFor(user) {
  const profile = user.farmerProfile || user.industryProfile || user.balerProfile || user.moverProfile;
  return user.name || profile?.fullName || profile?.companyName || profile?.contactPerson || user.phone;
}

function placeFor(user) {
  const profile = user.farmerProfile || user.industryProfile || user.balerProfile || user.moverProfile;
  return [profile?.village, profile?.district].filter(Boolean).join(', ') || 'Location not set';
}

export default function UsersSection({ showToast, fetchStats }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [acting, setActing] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (query.trim()) params.q = query.trim();
      if (role !== 'all') params.role = role;
      if (status !== 'all') params.status = status;
      const res = await api.get('/admin/users', { params });
      setUsers(res.data.users || []);
    } catch (e) {
      showToast?.('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, [role, status]);

  const totals = useMemo(() => ({
    approved: users.filter(u => u.status === 'approved').length,
    pending: users.filter(u => u.status === 'pending').length,
    rejected: users.filter(u => u.status === 'rejected').length,
  }), [users]);

  const changeStatus = async (user, action) => {
    setActing(`${user.id}-${action}`);
    try {
      await api.put(`/admin/applications/${user.id}/${action}`, {
        notes: action === 'reject' ? 'Access revoked from User Management' : 'Approved from User Management',
      });
      showToast?.(`${nameFor(user)} ${action === 'approve' ? 'approved' : 'rejected'}`);
      await loadUsers();
      fetchStats?.();
    } catch (e) {
      showToast?.(e.response?.data?.error || 'Action failed', 'error');
    } finally {
      setActing(null);
    }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16 }}>
        <div>
          <h2 style={{ fontSize:24, fontWeight:800, color:'#0D1F12', margin:'0 0 4px' }}>User Management</h2>
          <div style={{ fontSize:13, color:'#6B7280' }}>Search, audit, approve, revoke, and track marketplace participants.</div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') loadUsers(); }}
            placeholder="Search name, phone, email..."
            style={{ width:280, padding:'10px 14px', borderRadius:10, border:'1px solid #D1D5DB', fontSize:14, fontFamily:'inherit' }} />
          <button onClick={loadUsers} style={{ padding:'10px 18px', border:'none', borderRadius:10, background:'#1B4332', color:'white', fontWeight:800, cursor:'pointer' }}>Search</button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14 }}>
        {[
          ['Approved', totals.approved, '#DCFCE7', '#166534'],
          ['Pending', totals.pending, '#FEF3C7', '#92400E'],
          ['Rejected', totals.rejected, '#FEE2E2', '#991B1B'],
        ].map(([label, value, bg, color]) => (
          <div key={label} style={{ background:'white', border:'1px solid #E8ECF0', borderRadius:14, padding:'16px 18px' }}>
            <div style={{ fontSize:24, fontWeight:800, color }}>{value}</div>
            <div style={{ fontSize:12, fontWeight:700, color:'#6B7280', textTransform:'uppercase' }}>{label}</div>
            <div style={{ marginTop:10, height:6, background:'#F3F4F6', borderRadius:6, overflow:'hidden' }}>
              <div style={{ width:`${users.length ? Math.round((value/users.length)*100) : 0}%`, height:'100%', background:color }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:10, background:'white', border:'1px solid #E8ECF0', borderRadius:14, padding:12 }}>
        <select value={role} onChange={e => setRole(e.target.value)} style={SELECT}>
          <option value="all">All Roles</option>
          <option value="farmer">Farmers</option>
          <option value="industry">Industry</option>
          <option value="baler">Balers</option>
          <option value="mover">Movers</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} style={SELECT}>
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div style={{ background:'white', borderRadius:16, border:'1px solid #E8ECF0', overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'2.2fr 1fr 1fr 1fr 1.3fr', gap:12, padding:'14px 20px', background:'#F9FAFB', fontSize:11, fontWeight:800, color:'#6B7280', textTransform:'uppercase' }}>
          <span>User</span><span>Role</span><span>Status</span><span>Activity</span><span>Actions</span>
        </div>
        {loading ? (
          <div style={{ padding:36, textAlign:'center', color:'#9CA3AF' }}>Loading users...</div>
        ) : users.length === 0 ? (
          <div style={{ padding:36, textAlign:'center', color:'#9CA3AF' }}>No users match these filters.</div>
        ) : users.map(user => {
          const rm = ROLE_META[user.role] || ROLE_META.farmer;
          const sm = STATUS_META[user.status] || STATUS_META.pending;
          const orderCount = (user._count?.ordersAsClient || 0) + (user._count?.ordersAsWorker || 0);
          return (
            <div key={user.id} style={{ display:'grid', gridTemplateColumns:'2.2fr 1fr 1fr 1fr 1.3fr', gap:12, alignItems:'center', padding:'16px 20px', borderTop:'1px solid #F3F4F6' }}>
              <div>
                <div style={{ fontSize:15, fontWeight:800, color:'#111827' }}>{nameFor(user)}</div>
                <div style={{ fontSize:12, color:'#6B7280', marginTop:3 }}>+91 {user.phone} · {placeFor(user)}</div>
              </div>
              <span style={{ width:'fit-content', fontSize:12, fontWeight:800, padding:'4px 9px', borderRadius:100, background:rm.bg, color:rm.color, textTransform:'capitalize' }}>{rm.icon} {user.role}</span>
              <span style={{ width:'fit-content', fontSize:12, fontWeight:800, padding:'4px 9px', borderRadius:100, background:sm.bg, color:sm.color }}>{sm.label}</span>
              <div style={{ fontSize:12, color:'#4B5563', lineHeight:1.6 }}>
                {user._count?.listings || 0} listings<br />{orderCount} orders
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {user.status !== 'approved' && (
                  <button disabled={acting === `${user.id}-approve`} onClick={() => changeStatus(user, 'approve')} style={BTN_GREEN}>Approve</button>
                )}
                {user.status !== 'rejected' && (
                  <button disabled={acting === `${user.id}-reject`} onClick={() => changeStatus(user, 'reject')} style={BTN_RED}>{user.status === 'approved' ? 'Revoke' : 'Reject'}</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const SELECT = { padding:'10px 14px', borderRadius:10, border:'1px solid #D1D5DB', background:'white', fontSize:13, fontFamily:'inherit', color:'#111827' };
const BTN_GREEN = { padding:'7px 12px', border:'none', borderRadius:8, background:'#DCFCE7', color:'#166534', fontWeight:800, cursor:'pointer' };
const BTN_RED = { padding:'7px 12px', border:'none', borderRadius:8, background:'#FEE2E2', color:'#991B1B', fontWeight:800, cursor:'pointer' };
