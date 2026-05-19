import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DesktopTopNav from '../components/dashboard/DesktopTopNav';
import Loader from '../components/dashboard/Loader';
import { getEarningsSummary } from '../services/aiApi';
import { fetchOrders } from '../services/orderApi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ResponsiveContainer } from 'recharts';

export default function ReportsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('earnings');
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    Promise.all([getEarningsSummary(), fetchOrders()])
      .then(([sum, ord]) => { setSummary(sum); setOrders(ord); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleExportCSV = () => {
    setExportLoading(true);
    const rows = orders.filter(o => o.status === 'completed').map(o =>
      [o.id.slice(0,8).toUpperCase(), o.listing?.title || 'N/A', `₹${o.agreedPrice}`,
       new Date(o.completedAt || o.createdAt).toLocaleDateString('en-IN'), o.status]
    );
    const csv = [['Order ID','Job','Amount','Date','Status'], ...rows].map(r => r.join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: `report-${Date.now()}.csv` });
    a.click();
    setExportLoading(false);
  };

  const completedOrders = orders.filter(o => o.status === 'completed');

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#F0F4F8' }}>
      <DesktopTopNav user={user} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', margin: 0 }}>📊 Reports & Analytics</h1>
              <p style={{ color: '#64748B', margin: '4px 0 0', fontSize: 14 }}>AI-powered insights into your business performance</p>
            </div>
            <button onClick={handleExportCSV} disabled={exportLoading}
              style={{ padding: '10px 20px', background: '#1B4332', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
              {exportLoading ? 'Exporting...' : '⬇ Export CSV'}
            </button>
          </div>

          {loading ? <Loader /> : <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
              {[
                { icon: '💰', label: 'Total Earnings', value: `₹${(summary?.totalEarnings||0).toLocaleString()}`, bg: '#DCFCE7', c: '#059669' },
                { icon: '📦', label: 'Jobs Done', value: summary?.ordersCount || 0, bg: '#DBEAFE', c: '#1D4ED8' },
                { icon: '⚡', label: 'Avg Per Job', value: `₹${(summary?.avgOrderValue||0).toLocaleString()}`, bg: '#FEF3C7', c: '#D97706' },
                { icon: '🏆', label: 'Best Month', value: summary?.bestMonth || '—', bg: '#EDE9FE', c: '#7C3AED' },
              ].map((s, i) => (
                <div key={i} style={{ background: 'white', borderRadius: 14, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,.06)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 10 }}>{s.icon}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>{s.value}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {summary?.aiInsight && (
              <div style={{ background: 'linear-gradient(135deg,#1B4332,#2D6A4F)', borderRadius: 16, padding: '20px 24px', marginBottom: 24, color: 'white', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 32 }}>🤖</div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.7, textTransform: 'uppercase', marginBottom: 6 }}>AI Business Insight</div>
                  <div style={{ fontSize: 15, lineHeight: 1.6, opacity: 0.95 }}>{summary.aiInsight}</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 4, background: 'white', padding: 4, borderRadius: 12, marginBottom: 20, width: 'fit-content', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
              {[['earnings','📈 Earnings Chart'],['history','📋 Order History']].map(([v,l]) => (
                <button key={v} onClick={() => setActiveTab(v)}
                  style={{ padding: '8px 20px', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', background: activeTab===v ? '#1B4332' : 'transparent', color: activeTab===v ? 'white' : '#64748B' }}>
                  {l}
                </button>
              ))}
            </div>

            {activeTab === 'earnings' && (
              <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,.06)' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 800 }}>Monthly Earnings</h3>
                {(summary?.monthlyBreakdown||[]).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#64748B' }}>📊 Complete jobs to see your earnings chart.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={summary.monthlyBreakdown} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={v => [`₹${Number(v).toLocaleString()}`, 'Earnings']} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,.1)' }} />
                      <Bar dataKey="amount" radius={[6,6,0,0]}>
                        {(summary.monthlyBreakdown).map((_,i) => <Cell key={i} fill={i%2===0?'#1B4332':'#2D6A4F'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,.06)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 24px', borderBottom: '1px solid #F1F5F9', display: 'grid', gridTemplateColumns: '2fr 3fr 1fr 1fr', gap: 12, fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>
                  {['Order ID','Job Title','Amount','Date'].map(h => <span key={h}>{h}</span>)}
                </div>
                {completedOrders.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>No completed orders yet.</div>
                ) : completedOrders.map(o => (
                  <div key={o.id} style={{ padding: '14px 24px', borderBottom: '1px solid #F8FAFC', display: 'grid', gridTemplateColumns: '2fr 3fr 1fr 1fr', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#64748B' }}>{o.id.slice(0,8).toUpperCase()}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{o.listing?.title || 'N/A'}</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#059669' }}>₹{Number(o.agreedPrice).toLocaleString()}</span>
                    <span style={{ fontSize: 12, color: '#64748B' }}>{new Date(o.completedAt||o.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}</span>
                  </div>
                ))}
              </div>
            )}
          </>}
        </div>
      </div>
    </div>
  );
}
