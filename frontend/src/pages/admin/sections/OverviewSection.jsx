import { useMemo, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../../../api/axios';

const ROLE_COLORS = { farmer:'#16a34a', industry:'#2563eb', baler:'#d97706', mover:'#7c3aed' };

const Card = ({ children, style = {} }) => (
  <div style={{ background:'white', borderRadius:16, padding:'22px 24px', boxShadow:'0 1px 4px rgba(0,0,0,.07)', border:'1px solid #E8ECF0', ...style }}>
    {children}
  </div>
);

const formatMoney = (value = 0) => {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
};

export default function OverviewSection({ stats, setTab, showToast }) {
  const [exporting, setExporting] = useState(false);

  const roleData = useMemo(() => (stats?.byRole || []).map(r => ({
    name: r.role?.charAt(0).toUpperCase() + r.role?.slice(1),
    value: r._count?.id ?? 0,
    color: ROLE_COLORS[r.role] || '#6B7280',
  })), [stats]);

  const activity = stats?.activityFeed || [];

  const exportReport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/admin/users?limit=100');
      const rows = (res.data.users || []).map(user => [
        user.id,
        user.name || '',
        user.phone,
        user.role,
        user.status,
        user.createdAt,
      ]);
      const csv = [['User ID','Name','Phone','Role','Status','Created At'], ...rows]
        .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n');
      const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
        download: `pindbazaar-users-${Date.now()}.csv`,
      });
      a.click();
      showToast?.('User report exported');
    } catch (e) {
      showToast?.('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
      <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
        {[
          { label:'Review Pending', icon:'⏳', bg:'#1B4332', onClick:() => setTab?.('pending') },
          { label: exporting ? 'Exporting...' : 'Export Report', icon:'📥', bg:'#1e40af', onClick:exportReport },
          { label:'Notifications', icon:'🔔', bg:'#d97706', onClick:() => setTab?.('notifications') },
          { label:'Add Admin', icon:'➕', bg:'#6b21a8', onClick:() => setTab?.('settings') },
        ].map(action => (
          <button key={action.label} onClick={action.onClick} style={{
            display:'flex', alignItems:'center', gap:8, padding:'10px 18px',
            border:'none', borderRadius:10, background:action.bg, color:'white',
            fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'var(--font-sans)',
            boxShadow:`0 4px 12px ${action.bg}55`, transition:'transform .15s',
          }}>
            {action.icon} {action.label}
          </button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:18 }}>
        {[
          { icon:'👥', label:'Total Users', value:stats?.total ?? '—', color:'#1B4332', bg:'#F0FAF4' },
          { icon:'⏳', label:'Pending Review', value:stats?.pending ?? '—', color:'#92400e', bg:'#FEF3DC' },
          { icon:'✅', label:'Approved', value:stats?.approved ?? '—', color:'#065f46', bg:'#D1FAE5' },
          { icon:'💰', label:'Revenue', value:formatMoney(stats?.revenue), color:'#1e40af', bg:'#DBEAFE' },
        ].map(card => (
          <Card key={card.label} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:card.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
              {card.icon}
            </div>
            <div>
              <div style={{ fontSize:36, fontWeight:800, color:card.color, lineHeight:1, letterSpacing:'-1px' }}>{card.value}</div>
              <div style={{ fontSize:13, color:'#6B7280', marginTop:5, fontWeight:600 }}>{card.label}</div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ background:'linear-gradient(135deg,#1B4332,#2D6A4F)', borderRadius:14, padding:'16px 22px', display:'flex', alignItems:'center', gap:16 }}>
        <span style={{ fontSize:24 }}>🔔</span>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:15, color:'white' }}>{stats?.pending ?? 0} applications awaiting verification</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,.65)', marginTop:2 }}>
            {stats?.activeListings ?? 0} active listings · {stats?.completedOrders ?? 0} completed orders · Avg order {formatMoney(stats?.avgOrderValue)}
          </div>
        </div>
        <span style={{ background:'#4ade80', color:'#052e16', fontWeight:800, fontSize:12, padding:'5px 14px', borderRadius:100 }}>LIVE</span>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
        <Card>
          <div style={{ fontWeight:800, fontSize:15, color:'#0D1F12', marginBottom:18 }}>User Growth (7 days)</div>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={stats?.growth || []}>
              <defs><linearGradient id="adminUserGrowth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2D6A4F" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#2D6A4F" stopOpacity={0}/>
              </linearGradient></defs>
              <XAxis dataKey="day" tick={{ fontSize:12, fill:'#9CA3AF' }} axisLine={false} tickLine={false}/>
              <YAxis allowDecimals={false} tick={{ fontSize:12, fill:'#9CA3AF' }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ borderRadius:10, border:'none', boxShadow:'0 4px 20px rgba(0,0,0,.12)', fontSize:13 }}/>
              <Area type="monotone" dataKey="users" stroke="#2D6A4F" strokeWidth={2.5} fill="url(#adminUserGrowth)"/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <div style={{ fontWeight:800, fontSize:15, color:'#0D1F12', marginBottom:18 }}>Approvals vs Rejections</div>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={stats?.decisions || []} barGap={2}>
              <XAxis dataKey="day" tick={{ fontSize:12, fill:'#9CA3AF' }} axisLine={false} tickLine={false}/>
              <YAxis allowDecimals={false} tick={{ fontSize:12, fill:'#9CA3AF' }} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{ borderRadius:10, border:'none', fontSize:13 }}/>
              <Bar dataKey="approved" fill="#2D6A4F" radius={[4,4,0,0]}/>
              <Bar dataKey="rejected" fill="#ef4444" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:18 }}>
        <Card style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ fontWeight:800, fontSize:15, color:'#0D1F12' }}>Role Distribution</div>
          {roleData.length > 0 ? <>
            <PieChart width={210} height={140} style={{ margin:'0 auto' }}>
              <Pie data={roleData} cx={105} cy={70} innerRadius={42} outerRadius={64} dataKey="value" paddingAngle={3}>
                {roleData.map((d, i) => <Cell key={i} fill={d.color}/>)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius:10, border:'none', fontSize:13 }}/>
            </PieChart>
            {roleData.map(d => (
              <div key={d.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:10, height:10, borderRadius:3, background:d.color }}/>
                  <span style={{ fontSize:13, fontWeight:600, color:'#374151' }}>{d.name}</span>
                </div>
                <span style={{ fontSize:13, fontWeight:800, color:'#0D1F12' }}>{d.value}</span>
              </div>
            ))}
          </> : <div style={{ textAlign:'center', color:'#9CA3AF', fontSize:14, padding:'20px 0' }}>No data yet</div>}
        </Card>
        <Card>
          <div style={{ fontWeight:800, fontSize:15, color:'#0D1F12', marginBottom:14 }}>Live Activity Feed</div>
          {activity.length === 0 ? (
            <div style={{ color:'#9CA3AF', fontSize:14 }}>No recent activity.</div>
          ) : activity.map((item, i) => (
            <div key={item.id || i} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'11px 0', borderBottom:i < activity.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:'#F0FAF4', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>{item.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:600, color:'#1F2937' }}>{item.action}: {item.target}</div>
                <div style={{ fontSize:12, color:'#9CA3AF', marginTop:2 }}>{item.time}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
