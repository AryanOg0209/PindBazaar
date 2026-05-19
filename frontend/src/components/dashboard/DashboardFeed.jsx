import { useNavigate } from 'react-router-dom';
import { createOrder } from '../../services/orderApi';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';

export default function DashboardFeed({ feed }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [accepting, setAccepting] = useState(null); // listing id being accepted
  const [agreedPrice, setAgreedPrice] = useState('');
  const [modal, setModal] = useState(null); // feed item

  const openAccept = (item) => {
    const parsedPrice = item.rawPrice ?? Number(String(item.price || '').replace(/[^\d.]/g, ''));
    setAgreedPrice(Number.isFinite(parsedPrice) && parsedPrice > 0 ? String(parsedPrice) : '');
    setModal(item);
  };

  const handleAccept = async () => {
    if (!modal) return;
    setAccepting(modal.id);
    try {
      await createOrder({ listingId: modal.id, agreedPrice: Number(agreedPrice) });
      setModal(null);
      navigate('/orders');
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to accept job');
    } finally { setAccepting(null); }
  };

  if (!feed || feed.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '30px 20px', background: 'white', borderRadius: 16, border: '1px dashed #CBD5E1' }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
        <div style={{ color: '#64748B', fontSize: 13, fontWeight: 500 }}>No active market listings in your area.</div>
        <button onClick={() => navigate('/market')} style={{ marginTop: 12, padding: '8px 16px', background: '#1B4332', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
          Browse Marketplace →
        </button>
      </div>
    );
  }

  const TYPE_ICON = { demand: '🔥', supply: '🌾', job: '🚛' };
  const TYPE_COLOR = {
    demand: { bg: '#FEF3C7', color: '#92400E' },
    supply: { bg: '#DCFCE7', color: '#166534' },
    job:    { bg: '#E0E7FF', color: '#3730A3' },
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: 0 }}>Live Market Feed</h3>
        <button onClick={() => navigate('/market')} style={{ fontSize: 12, fontWeight: 700, color: '#1B4332', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          View All →
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {feed.map(item => {
          const tc = TYPE_COLOR[item.type] || TYPE_COLOR.job;
          const isOwner = item.userId === user?.id;
          return (
            <div key={item.id} style={{ background: '#FAFAFA', padding: '14px 16px', borderRadius: 12, border: '1px solid #F1F5F9', display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                {TYPE_ICON[item.type] || '📋'}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>{item.title}</div>
                  {item.price && <span style={{ fontSize: 13, fontWeight: 800, color: '#059669', flexShrink: 0, marginLeft: 8 }}>{item.price}</span>}
                </div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span>📍 {item.loc}</span>
                  {item.name && <span>👤 {item.name}</span>}
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: tc.bg, color: tc.color, textTransform: 'uppercase' }}>{item.type}</span>
                </div>
              </div>

              {!isOwner && (
                <button onClick={() => openAccept(item)}
                  style={{ flexShrink: 0, padding: '6px 12px', background: '#1B4332', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 11 }}>
                  Accept
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Mini accept modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, width: 380, boxShadow: '0 24px 60px rgba(0,0,0,.2)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800 }}>Accept Job</h3>
            <div style={{ background: '#F0FDF4', padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 13, color: '#166534', fontWeight: 700 }}>
              {modal.title} — {modal.loc}
            </div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Your Agreed Price (₹)</label>
            <input type="number" value={agreedPrice} onChange={e => setAgreedPrice(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 16, fontWeight: 700, marginBottom: 16, boxSizing: 'border-box' }} autoFocus />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: 10, background: '#F1F5F9', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', color: '#475569' }}>Cancel</button>
              <button onClick={handleAccept} disabled={!!accepting}
                style={{ flex: 2, padding: 10, background: '#059669', color: 'white', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>
                {accepting ? 'Accepting...' : '✅ Confirm Accept'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
