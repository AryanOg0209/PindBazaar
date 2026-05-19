import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

const TYPE_COLORS = { Demands:'#F59E0B', Supplies:'#10B981', Jobs:'#6366F1' };

const formatMoney = (value = 0) => {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
};

const Card = ({ children, style = {} }) => (
  <div style={{ background:'white', borderRadius:16, padding:24, border:'1px solid #E8ECF0', boxShadow:'0 1px 4px rgba(0,0,0,.05)', ...style }}>
    {children}
  </div>
);

export default function AnalyticsSection({ stats }) {
  const listingMix = [
    { name:'Demands', value:stats?.demandCount || 0, color:TYPE_COLORS.Demands },
    { name:'Supplies', value:stats?.supplyCount || 0, color:TYPE_COLORS.Supplies },
    { name:'Jobs', value:stats?.jobCount || 0, color:TYPE_COLORS.Jobs },
  ].filter(item => item.value > 0);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div>
        <h2 style={{ fontSize:24, fontWeight:800, color:'#0D1F12', margin:'0 0 4px' }}>Analytics & Reports</h2>
        <div style={{ fontSize:13, color:'#6B7280' }}>Operational health across users, marketplace listings, and completed work.</div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:16 }}>
        {[
          ['Revenue', formatMoney(stats?.revenue), '#DBEAFE', '#1D4ED8'],
          ['Completed Orders', stats?.completedOrders || 0, '#DCFCE7', '#166534'],
          ['Active Listings', stats?.activeListings || 0, '#FEF3C7', '#92400E'],
          ['Avg Order Value', formatMoney(stats?.avgOrderValue), '#EDE9FE', '#6D28D9'],
        ].map(([label, value, bg, color]) => (
          <Card key={label}>
            <div style={{ fontSize:26, fontWeight:800, color }}>{value}</div>
            <div style={{ fontSize:12, color:'#6B7280', textTransform:'uppercase', fontWeight:800, marginTop:4 }}>{label}</div>
            <div style={{ height:8, background:'#F3F4F6', borderRadius:8, overflow:'hidden', marginTop:14 }}>
              <div style={{ width:'72%', height:'100%', background:color }} />
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.2fr .8fr', gap:20 }}>
        <Card>
          <h3 style={{ fontSize:16, fontWeight:800, margin:'0 0 20px', color:'#111827' }}>User Growth</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={stats?.growth || []}>
              <defs><linearGradient id="analyticsGrowth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1B4332" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#1B4332" stopOpacity={0}/>
              </linearGradient></defs>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize:12, fill:'#6B7280' }} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize:12, fill:'#6B7280' }} />
              <Tooltip contentStyle={{ borderRadius:8, border:'none', boxShadow:'0 4px 12px rgba(0,0,0,.1)' }} />
              <Area type="monotone" dataKey="users" stroke="#1B4332" strokeWidth={3} fill="url(#analyticsGrowth)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 style={{ fontSize:16, fontWeight:800, margin:'0 0 20px', color:'#111827' }}>Marketplace Mix</h3>
          {listingMix.length === 0 ? (
            <div style={{ padding:40, color:'#9CA3AF', textAlign:'center' }}>No active listings yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={listingMix} dataKey="value" nameKey="name" innerRadius={58} outerRadius={90} paddingAngle={3}>
                  {listingMix.map(item => <Cell key={item.name} fill={item.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <Card>
          <h3 style={{ fontSize:16, fontWeight:800, margin:'0 0 20px', color:'#111827' }}>Top Crops</h3>
          {(stats?.topCrops || []).length === 0 ? (
            <div style={{ padding:40, color:'#9CA3AF', textAlign:'center' }}>No crop data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.topCrops} margin={{ left:-20 }}>
                <XAxis dataKey="crop" axisLine={false} tickLine={false} tick={{ fontSize:12, fill:'#6B7280' }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize:12, fill:'#6B7280' }} />
                <Tooltip contentStyle={{ borderRadius:8, border:'none' }} />
                <Bar dataKey="count" fill="#2D6A4F" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <h3 style={{ fontSize:16, fontWeight:800, margin:'0 0 20px', color:'#111827' }}>District Activity</h3>
          {(stats?.districtActivity || []).length === 0 ? (
            <div style={{ padding:40, color:'#9CA3AF', textAlign:'center' }}>No district data yet.</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {stats.districtActivity.map((row, i) => {
                const max = stats.districtActivity[0]?.count || 1;
                return (
                  <div key={row.district}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, fontWeight:700, color:'#374151', marginBottom:5 }}>
                      <span>{i + 1}. {row.district}</span><span>{row.count}</span>
                    </div>
                    <div style={{ height:9, background:'#F3F4F6', borderRadius:10, overflow:'hidden' }}>
                      <div style={{ width:`${Math.max(8, Math.round((row.count / max) * 100))}%`, height:'100%', background:i === 0 ? '#1B4332' : '#40916C' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
