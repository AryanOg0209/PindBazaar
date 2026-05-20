import { useState, useEffect } from 'react';
import { fetchOrders, updateOrderStatus } from '../services/orderApi';
import { useAuth } from '../context/AuthContext';
import DesktopTopNav from '../components/dashboard/DesktopTopNav';
import Loader from '../components/dashboard/Loader';
import TrackingMap from '../components/TrackingMap';

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     color: '#92400E', bg: '#FEF3C7', icon: '⏳' },
  accepted:    { label: 'Accepted',    color: '#1E40AF', bg: '#DBEAFE', icon: '✅' },
  in_progress: { label: 'In Progress', color: '#C2410C', bg: '#FFEDD5', icon: '🔄' },
  completed:   { label: 'Completed',   color: '#166534', bg: '#DCFCE7', icon: '🎉' },
  cancelled:   { label: 'Cancelled',   color: '#991B1B', bg: '#FEE2E2', icon: '❌' },
};

const TIMELINE_STEPS = ['accepted', 'in_progress', 'completed'];

function TimelineBar({ currentStatus }) {
  const stepIndex = TIMELINE_STEPS.indexOf(currentStatus);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, margin: '16px 0 8px' }}>
      {TIMELINE_STEPS.map((step, i) => {
        const cfg = STATUS_CONFIG[step];
        const done = stepIndex >= i;
        const active = stepIndex === i;
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: done ? '#1B4332' : '#E2E8F0', border: active ? '3px solid #F59E0B' : '2px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: done ? 'white' : '#94A3B8', fontSize: 14, transition: 'all .3s' }}>
                {done ? '✓' : String(i + 1)}
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: done ? '#1B4332' : '#94A3B8', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>{cfg.label}</span>
            </div>
            {i < 2 && <div style={{ flex: 1, height: 3, background: stepIndex > i ? '#1B4332' : '#E2E8F0', margin: '0 4px', marginBottom: 16, transition: 'background .3s' }} />}
          </div>
        );
      })}
    </div>
  );
}

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // active | completed | all
  const [updating, setUpdating]     = useState(null); // orderId being updated
  const [trackingOrder, setTrackingOrder] = useState(null);

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchOrders();
      setOrders(data);
    } catch (e) {
      setError('Failed to load orders. Please try again.');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadOrders(); }, []);

  const handleStatusUpdate = async (id, status) => {
    setUpdating(id);
    try {
      await updateOrderStatus(id, status);
      await loadOrders();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to update status');
    } finally { setUpdating(null); }
  };

  // Filter
  const filtered = orders.filter(o => {
    if (statusFilter === 'active')    return ['pending', 'accepted', 'in_progress'].includes(o.status);
    if (statusFilter === 'completed') return ['completed', 'cancelled'].includes(o.status);
    return true;
  });

  // Stats
  const activeCount    = orders.filter(o => ['pending', 'accepted', 'in_progress'].includes(o.status)).length;
  const completedCount = orders.filter(o => o.status === 'completed').length;
  const totalEarnings  = orders.filter(o => o.status === 'completed').reduce((s, o) => s + Number(o.agreedPrice), 0);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#F0F4F8' }}>
      <DesktopTopNav user={user} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>

          {/* ── Header ── */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', margin: 0 }}>📦 Jobs & Orders</h1>
            <p style={{ color: '#64748B', margin: '4px 0 0', fontSize: 14 }}>Track all your accepted jobs and delivery statuses</p>
          </div>

          {/* ── Stats Row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
            <StatCard icon="🔄" label="Active Jobs"     value={activeCount}    color="#1E40AF" bg="#DBEAFE" />
            <StatCard icon="🎉" label="Completed"        value={completedCount} color="#166534" bg="#DCFCE7" />
            <StatCard icon="💰" label="Total Earnings"   value={`₹${totalEarnings.toLocaleString()}`} color="#92400E" bg="#FEF3C7" />
          </div>

          {/* ── Tab Filter ── */}
          <div style={{ display: 'flex', gap: 4, background: 'white', padding: 4, borderRadius: 12, marginBottom: 20, width: 'fit-content', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
            {[['active', '🔄 Active'], ['completed', '✅ History'], ['all', '📋 All']].map(([val, lbl]) => (
              <button key={val} onClick={() => setStatusFilter(val)}
                style={{ padding: '8px 20px', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all .15s',
                  background: statusFilter === val ? '#1B4332' : 'transparent',
                  color: statusFilter === val ? 'white' : '#64748B' }}>
                {lbl}
              </button>
            ))}
          </div>

          {/* ── Order Cards ── */}
          {loading ? <Loader /> : error ? (
            <div style={{ padding: 32, textAlign: 'center', background: '#FEF2F2', borderRadius: 12, color: '#B91C1C', fontWeight: 600 }}>{error}</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', background: 'white', borderRadius: 16, color: '#64748B' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No orders here yet</div>
              <div style={{ fontSize: 13, marginBottom: 20 }}>
                {statusFilter === 'active' ? 'Go to the Market tab and accept a job to get started!' : 'Completed orders will appear here.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {filtered.map(order => {
                const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                const isWorker = order.workerId === user?.id;
                const partner  = isWorker ? order.client : order.worker;
                const myRole   = isWorker ? 'You are: Worker' : 'You are: Client';
                const isActive = ['accepted', 'in_progress'].includes(order.status);

                return (
                  <div key={order.id} style={{ background: 'white', borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,.06)', overflow: 'hidden', border: '1px solid #E2E8F0' }}>

                    {/* Top color bar */}
                    <div style={{ height: 4, background: cfg.color }} />

                    <div style={{ padding: '20px 24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                        {/* Left: Job Info */}
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color, textTransform: 'uppercase' }}>
                              {cfg.icon} {cfg.label}
                            </span>
                            <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>{myRole}</span>
                          </div>
                          <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800, color: '#0F172A' }}>
                            {order.listing?.title || 'Job Details'}
                          </h3>
                          <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#475569', flexWrap: 'wrap' }}>
                            {order.listing?.location && <span>📍 {order.listing.location}</span>}
                            <span>👤 {partner?.name || 'Unknown'} ({partner?.phone})</span>
                          </div>
                        </div>

                        {/* Right: Price & Actions */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 24, fontWeight: 800, color: '#059669', marginBottom: 12 }}>
                            ₹{Number(order.agreedPrice).toLocaleString()}
                          </div>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            {order.status === 'accepted' && isWorker && (
                              <ActionBtn
                                label="▶ Start Job"
                                loading={updating === order.id}
                                onClick={() => handleStatusUpdate(order.id, 'in_progress')}
                                color="#F59E0B"
                              />
                            )}
                            {order.status === 'in_progress' && isWorker && (
                              <ActionBtn
                                label="🎉 Mark Complete"
                                loading={updating === order.id}
                                onClick={() => handleStatusUpdate(order.id, 'completed')}
                                color="#10B981"
                              />
                            )}
                            {isActive && (
                              <ActionBtn
                                label="✕ Cancel"
                                loading={updating === order.id}
                                onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                                color="#EF4444"
                                outline
                              />
                            )}
                            {order.status === 'in_progress' && (
                              <button onClick={() => setTrackingOrder(order)}
                                style={{ padding: '8px 16px', background: '#7C3AED', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                {user?.role === 'mover' ? '📡 Share Location' : '🗺️ Track Live'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Timeline Bar (only for non-cancelled) */}
                      {order.status !== 'cancelled' && order.status !== 'pending' && (
                        <TimelineBar currentStatus={order.status} />
                      )}

                      {/* Footer metadata */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid #F1F5F9', fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>
                        <span>Order #{order.id.slice(0, 8).toUpperCase()}</span>
                        <span>Created: {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        {order.completedAt && <span>Completed: {new Date(order.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {trackingOrder && (
        <TrackingMap
          orderId={trackingOrder.id}
          userRole={user?.role}
          orderTitle={trackingOrder.listing?.title || 'Delivery'}
          onClose={() => setTrackingOrder(null)}
        />
      )}
    </div>
  );
}

// ── Helpers ──
function StatCard({ icon, label, value, color, bg }) {
  return (
    <div style={{ background: 'white', borderRadius: 14, padding: '18px 22px', boxShadow: '0 4px 12px rgba(0,0,0,.06)', display: 'flex', gap: 14, alignItems: 'center' }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>{value}</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.3px' }}>{label}</div>
      </div>
    </div>
  );
}

function ActionBtn({ label, onClick, loading, color, outline }) {
  return (
    <button onClick={onClick} disabled={loading}
      style={{ padding: '8px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', transition: 'opacity .15s', opacity: loading ? 0.6 : 1,
        background: outline ? 'transparent' : color,
        border: outline ? `2px solid ${color}` : 'none',
        color: outline ? color : 'white' }}>
      {loading ? '...' : label}
    </button>
  );
}
