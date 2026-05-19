import { useEffect, useState } from 'react';
import api from '../../../api/axios';

const TYPE_COLOR = {
  success:'#10b981',
  error:'#ef4444',
  warning:'#f59e0b',
  info:'#3b82f6',
};

export default function ActivitySection({ showToast }) {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const loadActivity = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/activity?limit=50');
      setActivity(res.data.activity || []);
    } catch (e) {
      showToast?.('Failed to load activity', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadActivity(); }, []);

  const filtered = filter === 'all' ? activity : activity.filter(item => item.type === filter);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h2 style={{ fontSize:24, fontWeight:800, color:'#0D1F12', margin:'0 0 4px' }}>System Activity Log</h2>
          <div style={{ fontSize:13, color:'#6B7280' }}>Recent account, listing, and order activity across the platform.</div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding:'10px 14px', borderRadius:10, border:'1px solid #D1D5DB', background:'white', fontSize:13 }}>
            <option value="all">All Events</option>
            <option value="success">Success</option>
            <option value="warning">Attention</option>
            <option value="error">Errors</option>
            <option value="info">Info</option>
          </select>
          <button onClick={loadActivity} style={{ padding:'10px 16px', border:'none', borderRadius:10, background:'#1B4332', color:'white', fontWeight:800, cursor:'pointer' }}>Refresh</button>
        </div>
      </div>

      <div style={{ background:'white', borderRadius:16, border:'1px solid #E8ECF0', overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1.3fr 2fr 1fr 1fr', gap:12, padding:'16px 24px', background:'#F9FAFB', fontSize:12, fontWeight:800, color:'#6B7280', textTransform:'uppercase' }}>
          <span>Action</span><span>Target</span><span>Source</span><span>Time</span>
        </div>
        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:'#9CA3AF' }}>Loading activity...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:40, textAlign:'center', color:'#9CA3AF' }}>No activity for this filter.</div>
        ) : filtered.map(item => (
          <div key={item.id} style={{ display:'grid', gridTemplateColumns:'1.3fr 2fr 1fr 1fr', gap:12, alignItems:'center', padding:'16px 24px', borderTop:'1px solid #F3F4F6' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:9, height:9, borderRadius:'50%', background:TYPE_COLOR[item.type] || TYPE_COLOR.info }} />
              <span style={{ fontSize:14, fontWeight:700, color:'#111827' }}>{item.icon} {item.action}</span>
            </div>
            <span style={{ fontSize:14, color:'#374151', fontWeight:600 }}>{item.target}</span>
            <span style={{ fontSize:13, color:'#6B7280' }}>{item.admin}</span>
            <span style={{ fontSize:13, color:'#9CA3AF' }}>{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
