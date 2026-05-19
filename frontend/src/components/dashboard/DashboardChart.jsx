import { useState } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

export default function DashboardChart({ earnings }) {
  const [period, setPeriod] = useState('weekly'); // 'weekly' or 'monthly'

  if (!earnings) return null;

  const data = earnings.chart[period];
  const total = period === 'weekly' ? earnings.totalWeekly : earnings.totalMonthly;
  const trend = period === 'weekly' ? earnings.weeklyTrend : earnings.monthlyTrend;
  const isPositive = trend.startsWith('+');

  return (
    <div style={{ background: 'white', borderRadius: 20, padding: '20px 20px 16px', boxShadow: '0 4px 20px rgba(0,0,0,.04)', border: '1px solid #F1F5F9' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {period === 'weekly' ? 'This Week' : 'This Month'}
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>{total}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          {/* Toggle */}
          <div style={{ background: '#F1F5F9', borderRadius: 100, padding: 2, display: 'flex' }}>
            <button 
              onClick={() => setPeriod('weekly')}
              style={{ padding: '4px 10px', borderRadius: 100, border: 'none', background: period === 'weekly' ? 'white' : 'transparent', color: period === 'weekly' ? '#0F172A' : '#64748B', fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: period === 'weekly' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}
            >
              1W
            </button>
            <button 
              onClick={() => setPeriod('monthly')}
              style={{ padding: '4px 10px', borderRadius: 100, border: 'none', background: period === 'monthly' ? 'white' : 'transparent', color: period === 'monthly' ? '#0F172A' : '#64748B', fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: period === 'monthly' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}
            >
              1M
            </button>
          </div>
          
          <div style={{ fontSize: 12, fontWeight: 700, color: isPositive ? '#10B981' : '#EF4444', background: isPositive ? '#D1FAE5' : '#FEE2E2', padding: '4px 10px', borderRadius: 100, display: 'flex', alignItems: 'center', gap: 4 }}>
            {trend} {isPositive ? '📈' : '📉'}
          </div>
        </div>
      </div>
      
      <div style={{ height: 100, margin: '0 -10px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1B4332" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#1B4332" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip 
              contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,.1)', fontSize: 12, fontWeight: 600 }}
              labelStyle={{ display: 'none' }}
              itemStyle={{ color: '#1B4332' }}
              formatter={(val) => [`₹${val}`, 'Earned']}
            />
            <Area type="monotone" dataKey="value" stroke="#1B4332" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
