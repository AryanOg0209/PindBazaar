import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DesktopTopNav from '../components/dashboard/DesktopTopNav';
import api from '../api/axios';

const CATEGORY_META = {
  income_support:  { label: 'Income Support', color: '#166534', bg: '#DCFCE7', icon: '💰' },
  crop_insurance:  { label: 'Crop Insurance', color: '#1E40AF', bg: '#DBEAFE', icon: '🛡️' },
  credit:          { label: 'Credit / Loan',  color: '#92400E', bg: '#FEF3C7', icon: '🏦' },
  subsidy:         { label: 'Subsidy',        color: '#6D28D9', bg: '#EDE9FE', icon: '🎁' },
  incentive:       { label: 'Incentive',      color: '#0E7490', bg: '#CFFAFE', icon: '⭐' },
  price_support:   { label: 'Price Support',  color: '#B45309', bg: '#FEF3C7', icon: '📈' },
};

function SchemeCard({ scheme, isPriority }) {
  const [expanded, setExpanded] = useState(false);
  const meta = CATEGORY_META[scheme.category] || CATEGORY_META.incentive;

  return (
    <div style={{
      background: 'white', borderRadius: 16,
      boxShadow: isPriority ? '0 8px 24px rgba(27,67,50,.15)' : '0 4px 12px rgba(0,0,0,.06)',
      border: isPriority ? '2px solid #1B4332' : '1px solid #E2E8F0',
      overflow: 'hidden', transition: 'box-shadow .15s',
    }}>
      {isPriority && (
        <div style={{ background: '#1B4332', color: 'white', padding: '6px 16px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.5px' }}>
          ⭐ Top Recommended for You
        </div>
      )}
      <div style={{ padding: '18px 20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#0F172A' }}>{scheme.name}</h3>
            <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: meta.bg, color: meta.color }}>
              {meta.icon} {meta.label}
            </span>
          </div>
        </div>

        {/* Benefit */}
        <div style={{ background: '#F0FDF4', borderRadius: 10, padding: '10px 14px', marginBottom: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 18 }}>💸</span>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: 2 }}>Benefit</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{scheme.benefit}</div>
          </div>
        </div>

        {/* Why you qualify */}
        {scheme.matchReason && (
          <div style={{ fontSize: 12, color: '#475569', marginBottom: 10, display: 'flex', gap: 6 }}>
            <span>✅</span>
            <span style={{ fontWeight: 600 }}>{scheme.matchReason}</span>
          </div>
        )}

        {/* Eligibility */}
        <div style={{ fontSize: 12, color: '#64748B', marginBottom: 10 }}>
          <span style={{ fontWeight: 700, color: '#374151' }}>Eligible: </span>{scheme.eligibility}
        </div>

        {/* Deadline */}
        {scheme.deadline && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#92400E', background: '#FEF3C7', padding: '4px 10px', borderRadius: 6, marginBottom: 10 }}>
            ⏰ {scheme.deadline}
          </div>
        )}

        {/* How to Apply — expandable */}
        <button onClick={() => setExpanded(!expanded)}
          style={{ width: '100%', padding: '10px 14px', background: expanded ? '#1B4332' : '#F1F5F9', color: expanded ? 'white' : '#374151', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: expanded ? 10 : 0, transition: 'all .15s' }}>
          <span>📋 How to Apply</span>
          <span style={{ fontSize: 16 }}>{expanded ? '▲' : '▼'}</span>
        </button>

        {expanded && (
          <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '12px 16px', border: '1px solid #E2E8F0' }}>
            {scheme.howToApply?.split('\n').map((step, i) => (
              <div key={i} style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, paddingBottom: 4 }}>
                {step}
              </div>
            ))}
            {scheme.officialLink && (
              <a href={scheme.officialLink} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-block', marginTop: 10, padding: '8px 14px', background: '#1B4332', color: 'white', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                🌐 Visit Official Portal →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: 20, border: '1px solid #E2E8F0' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ height: 16, background: '#F1F5F9', borderRadius: 4, marginBottom: 12, width: i === 1 ? '60%' : i === 2 ? '90%' : '45%' }} />
      ))}
    </div>
  );
}

export default function SchemesPage() {
  const { user } = useAuth();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [catFilter, setCatFilter] = useState('all');

  useEffect(() => {
    api.get('/ai/schemes')
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || 'Failed to load schemes'))
      .finally(() => setLoading(false));
  }, []);

  const categories = data ? [...new Set(data.schemes.map(s => s.category))].filter(Boolean) : [];

  const filtered = data?.schemes?.filter(s => catFilter === 'all' || s.category === catFilter) || [];

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#F0F4F8' }}>
      <DesktopTopNav user={user} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>🏛️ Government Schemes for You</h1>
            <p style={{ color: '#64748B', margin: 0, fontSize: 14 }}>
              {loading ? 'Finding schemes that match your profile…' :
               data ? `${data.schemes?.length || 0} schemes found based on your ${user?.role} profile in Punjab/Haryana` : 'Personalized scheme recommendations powered by AI'}
            </p>
          </div>

          {/* AI Summary */}
          {data?.summary && (
            <div style={{ background: 'linear-gradient(135deg,#1B4332,#2D6A4F)', borderRadius: 14, padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>🤖</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 4 }}>AI Summary</div>
                <div style={{ fontSize: 14, color: 'white', fontWeight: 600, lineHeight: 1.6 }}>{data.summary}</div>
                {data.note && <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>{data.note}</div>}
              </div>
            </div>
          )}

          {/* Category filter pills */}
          {!loading && data && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
              <button onClick={() => setCatFilter('all')}
                style={{ padding: '6px 16px', borderRadius: 20, border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', background: catFilter === 'all' ? '#1B4332' : '#E2E8F0', color: catFilter === 'all' ? 'white' : '#475569' }}>
                All ({data.schemes?.length || 0})
              </button>
              {categories.map(cat => {
                const m = CATEGORY_META[cat] || CATEGORY_META.incentive;
                const count = data.schemes.filter(s => s.category === cat).length;
                return (
                  <button key={cat} onClick={() => setCatFilter(cat)}
                    style={{ padding: '6px 16px', borderRadius: 20, border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                      background: catFilter === cat ? m.color : m.bg,
                      color: catFilter === cat ? 'white' : m.color }}>
                    {m.icon} {m.label} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : error ? (
            <div style={{ padding: 32, textAlign: 'center', background: '#FEF2F2', borderRadius: 16, color: '#B91C1C', fontWeight: 600 }}>
              {error}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {filtered.map((scheme, i) => (
                <SchemeCard
                  key={i}
                  scheme={scheme}
                  isPriority={scheme.name === data?.priorityScheme}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
