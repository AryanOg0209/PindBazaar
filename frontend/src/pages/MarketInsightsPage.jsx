import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DesktopTopNav from '../components/dashboard/DesktopTopNav';
import Loader from '../components/dashboard/Loader';
import { getMarketInsights } from '../services/aiApi';
import { fetchListings } from '../services/marketApi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ResponsiveContainer, PieChart, Pie, Legend } from 'recharts';

const TYPE_COLORS = { demand: '#F59E0B', supply: '#10B981', job: '#6366F1' };

export default function MarketInsightsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState(null);
  const [listings, setListings] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getMarketInsights(), fetchListings()])
      .then(([ins, lst]) => { setInsights(ins); setListings(lst); })
      .catch(e => setError(e.response?.data?.error || 'Failed to load market insights'))
      .finally(() => setLoading(false));
  }, []);

  const pieData = insights ? [
    { name: 'Demands', value: insights.demandCount, color: TYPE_COLORS.demand },
    { name: 'Supplies', value: insights.supplyCount, color: TYPE_COLORS.supply },
    { name: 'Jobs',    value: insights.jobCount,    color: TYPE_COLORS.job },
  ].filter(d => d.value > 0) : [];

  const aiPoints = insights?.aiAnalysis
    ? insights.aiAnalysis.split('\n').filter(l => l.trim()).slice(0, 5)
    : [];

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#F0F4F8' }}>
      <DesktopTopNav user={user} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', margin: 0 }}>🔍 Market Insights</h1>
            <p style={{ color: '#64748B', margin: '4px 0 0', fontSize: 14 }}>AI-powered analysis of the live PindBazaar marketplace</p>
          </div>

          {loading ? <Loader /> : error ? (
            <div style={{ padding: 32, background: '#FEF2F2', borderRadius: 12, color: '#B91C1C', fontWeight: 600, textAlign: 'center' }}>
              {error}
            </div>
          ) : (
            <>
              {/* Stats Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                {[
                  { icon: '📋', label: 'Active Listings', value: insights.totalListings, bg: '#DBEAFE', c: '#1D4ED8' },
                  { icon: '🔥', label: 'Demands', value: insights.demandCount, bg: '#FEF3C7', c: '#D97706' },
                  { icon: '🌾', label: 'Supplies', value: insights.supplyCount, bg: '#DCFCE7', c: '#059669' },
                  { icon: '💰', label: 'Avg. Job Value', value: insights.avgOrderValue > 0 ? `₹${insights.avgOrderValue.toLocaleString()}` : 'N/A', bg: '#EDE9FE', c: '#7C3AED' },
                ].map((s, i) => (
                  <div key={i} style={{ background: 'white', borderRadius: 14, padding: '18px 20px', boxShadow: '0 4px 12px rgba(0,0,0,.06)', display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{s.icon}</div>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>{s.value}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                {/* Pie Chart */}
                <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,.06)' }}>
                  <h3 style={{ margin: '0 0 16px', fontWeight: 800 }}>Listing Type Breakdown</h3>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                          {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                        <Legend />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 40, color: '#64748B' }}>No listings yet</div>
                  )}
                </div>

                {/* Top Crops */}
                <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,.06)' }}>
                  <h3 style={{ margin: '0 0 16px', fontWeight: 800 }}>Top Crops in Marketplace</h3>
                  {(insights.topCrops || []).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#64748B' }}>No crop data yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={insights.topCrops} margin={{ left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                        <XAxis dataKey="crop" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                        <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,.1)' }} />
                        <Bar dataKey="count" radius={[6,6,0,0]}>
                          {(insights.topCrops || []).map((_, i) => <Cell key={i} fill={['#1B4332','#2D6A4F','#40916C','#52B788','#74C69D'][i%5]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* AI Analysis */}
              {aiPoints.length > 0 && (
                <div style={{ background: 'linear-gradient(135deg,#1B4332,#2D6A4F)', borderRadius: 16, padding: '22px 28px', marginBottom: 20, color: 'white' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 28 }}>🤖</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.7, textTransform: 'uppercase', marginBottom: 10 }}>AI Market Analysis</div>
                      {aiPoints.map((pt, i) => (
                        <div key={i} style={{ fontSize: 14, lineHeight: 1.7, opacity: 0.92 }}>{pt}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Live Listings */}
              <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,.06)' }}>
                <h3 style={{ margin: '0 0 16px', fontWeight: 800 }}>All Active Listings</h3>
                {listings.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#64748B' }}>No listings available yet.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                    {listings.map(l => {
                      const color = TYPE_COLORS[l.type] || '#64748B';
                      return (
                        <div key={l.id} style={{ background: '#F8FAFC', borderRadius: 12, padding: 16, border: '1px solid #E2E8F0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 10, background: color + '20', color, textTransform: 'uppercase' }}>{l.type}</span>
                            {l.price && <span style={{ fontWeight: 800, color: '#059669' }}>₹{Number(l.price).toLocaleString()}</span>}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>{l.title}</div>
                          <div style={{ fontSize: 12, color: '#64748B' }}>📍 {l.location} • 👤 {l.user?.name}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
