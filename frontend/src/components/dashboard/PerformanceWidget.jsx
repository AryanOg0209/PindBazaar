import { useState, useEffect } from 'react';
import { getDashboardStats } from '../../services/dashboardApi';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const PIE_COLORS = ['#166534','#D97706','#1D4ED8','#DC2626'];

export default function PerformanceWidget({ onStatsLoaded, refreshKey = 0 }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week'); // week | month

  useEffect(() => {
    let active = true;
    if (!stats) setLoading(true);

    getDashboardStats()
      .then(s => {
        if (!active) return;
        setStats(s);
        onStatsLoaded?.(s);
      })
      .catch(console.error)
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [refreshKey]);

  const chartData = stats
    ? (period === 'week' ? stats.weekData : stats.monthlyBreakdown?.map(m => ({ ...m, day: m.month })))
    : [];

  const pieData = stats?.workBreakdown
    ? stats.workBreakdown.filter(d => d.value > 0)
    : [];

  const maxVal = chartData?.reduce((m, d) => Math.max(m, d.baling || 0, d.transport || 0, d.buying || 0), 0) || 0;

  return (
    <div className="dash-card" style={{ display: 'flex', padding: 0, overflow: 'hidden' }}>
      {/* Chart Area */}
      <div style={{ flex: 1, padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: 0 }}>Performance Dashboard</h3>
          <div style={{ display: 'flex', gap: 4, background: '#F8FAFC', padding: 3, borderRadius: 8 }}>
            {[['week','Week'],['month','Month']].map(([v,l]) => (
              <button key={v} onClick={() => setPeriod(v)}
                style={{ padding:'5px 14px', border:'none', borderRadius:6, fontSize:12, fontWeight:700, cursor:'pointer',
                  background: period===v ? '#1B4332' : 'transparent',
                  color: period===v ? 'white' : '#64748B' }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display:'flex', gap:16, marginBottom:12 }}>
          {[['#166534','Baling'],['#D97706','Transport'],['#1D4ED8','Buying']].map(([c,n]) => (
            <div key={n} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:600, color:'#475569' }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:c, display:'inline-block' }} />
              {n}
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ height:220, display:'flex', alignItems:'center', justifyContent:'center', color:'#94A3B8', fontSize:13 }}>
            Loading performance data...
          </div>
        ) : (chartData?.length === 0 || maxVal === 0) ? (
          <div style={{ height:220, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#94A3B8' }}>
            <div style={{ fontSize:36, marginBottom:8 }}>📊</div>
            <div style={{ fontSize:13, fontWeight:600 }}>No orders yet — chart updates as you complete jobs</div>
          </div>
        ) : (
          <div style={{ height: 220, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top:10, right:0, left:-20, bottom:0 }}>
                <defs>
                  <linearGradient id="gBaling" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#166534" stopOpacity={0.2}/><stop offset="95%" stopColor="#166534" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gTransport" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#D97706" stopOpacity={0.2}/><stop offset="95%" stopColor="#D97706" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gBuying" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1D4ED8" stopOpacity={0.1}/><stop offset="95%" stopColor="#1D4ED8" stopOpacity={0}/></linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize:11, fill:'#94A3B8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize:11, fill:'#94A3B8' }} tickFormatter={v => v===0 ? '0' : `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius:8, border:'none', boxShadow:'0 4px 12px rgba(0,0,0,.1)', fontSize:12 }}
                  formatter={(v, n) => [`₹${Number(v).toLocaleString()}`, n.charAt(0).toUpperCase()+n.slice(1)]}
                />
                <Area type="monotone" dataKey="baling"    stroke="#166534" strokeWidth={2} fill="url(#gBaling)" />
                <Area type="monotone" dataKey="transport" stroke="#D97706" strokeWidth={2} fill="url(#gTransport)" />
                <Area type="monotone" dataKey="buying"    stroke="#1D4ED8" strokeWidth={2} fill="url(#gBuying)" />
              </AreaChart>
            </ResponsiveContainer>
            {/* Peak label */}
            {maxVal > 0 && (
              <div style={{ position:'absolute', right:16, top:32, background:'#111827', color:'white', fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:5 }}>
                ₹{maxVal.toLocaleString()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Side */}
      <div style={{ width:220, padding:'24px 20px', display:'flex', flexDirection:'column', gap:20, borderLeft:'1px solid #F1F5F9' }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'#475569', marginBottom:4, textTransform:'uppercase' }}>Avg. Earning per Job</div>
          <div style={{ fontSize:26, fontWeight:800, color:'#0F172A' }}>
            {stats ? `₹${stats.avgPerJob.toLocaleString()}` : <span style={{ fontSize:16, color:'#94A3B8' }}>—</span>}
          </div>
        </div>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'#475569', marginBottom:4, textTransform:'uppercase' }}>Total Revenue</div>
          <div style={{ fontSize:26, fontWeight:800, color:'#059669' }}>
            {stats ? `₹${stats.totalRevenue >= 1000 ? (stats.totalRevenue/1000).toFixed(1)+'K' : stats.totalRevenue}` : <span style={{ fontSize:16, color:'#94A3B8' }}>—</span>}
          </div>
        </div>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'#475569', marginBottom:10, textTransform:'uppercase' }}>Work Breakdown</div>
            <div style={{ height:90, position:'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData.length > 0 ? pieData : [{ name:'None', value:1 }]} innerRadius={26} outerRadius={40} dataKey="value" paddingAngle={2}>
                  {(pieData.length > 0 ? pieData : [{ name:'None', value:1 }]).map((_, i) => (
                    <Cell key={i} fill={pieData.length > 0 ? PIE_COLORS[i % PIE_COLORS.length] : '#E2E8F0'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v,n) => [pieData.length > 0 ? `₹${Number(v).toLocaleString()}` : v, n]} contentStyle={{ fontSize:11, borderRadius:6 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {pieData.map((d, i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:11, fontWeight:600, color:'#475569', marginTop:4 }}>
              <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:PIE_COLORS[i], display:'inline-block' }} />{d.name}
              </span>
              <span style={{ fontWeight:800, color:'#0F172A' }}>₹{Number(d.value).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
