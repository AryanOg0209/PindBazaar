import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DesktopTopNav from '../components/dashboard/DesktopTopNav';
import api from '../api/axios';

const STAGE_META = {
  pending:            { label: 'Awaiting Baler',     color: '#92400E', bg: '#FEF3C7', icon: '⏳', step: 0 },
  baler_assigned:     { label: 'Baling in Progress', color: '#1E40AF', bg: '#DBEAFE', icon: '📦', step: 1 },
  baling_done:        { label: 'Ready for Transport', color: '#6D28D9', bg: '#EDE9FE', icon: '✅', step: 2 },
  transport_assigned: { label: 'Transport Assigned',  color: '#0E7490', bg: '#CFFAFE', icon: '🚚', step: 3 },
  in_transit:         { label: 'In Transit',          color: '#C2410C', bg: '#FFEDD5', icon: '🛣️', step: 4 },
  at_storage:         { label: 'At Storage',          color: '#475569', bg: '#F1F5F9', icon: '🏠', step: 4 },
  delivered:          { label: 'Delivered',           color: '#166534', bg: '#DCFCE7', icon: '🎉', step: 5 },
  completed:          { label: 'Completed',           color: '#166534', bg: '#DCFCE7', icon: '✅', step: 5 },
  cancelled:          { label: 'Cancelled',           color: '#991B1B', bg: '#FEE2E2', icon: '❌', step: -1 },
};

const PIPELINE_STEPS = [
  { key: 'farmer',    label: 'Farmer',    icon: '🌾', stage: 'pending' },
  { key: 'baler',     label: 'Baler',     icon: '📦', stage: 'baler_assigned' },
  { key: 'transport', label: 'Transport', icon: '🚚', stage: 'transport_assigned' },
  { key: 'industry',  label: 'Industry',  icon: '🏭', stage: 'delivered' },
];

function PipelineBar({ stage }) {
  const currentStep = STAGE_META[stage]?.step ?? 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, margin: '12px 0 4px' }}>
      {PIPELINE_STEPS.map((step, i) => {
        const done = currentStep > i;
        const active = currentStep === i || (i === 1 && ['baler_assigned','baling_done'].includes(stage)) || (i === 2 && ['transport_assigned','in_transit'].includes(stage));
        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: i < 3 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 52 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: done || active ? (done ? '#1B4332' : '#F59E0B') : '#E2E8F0',
                border: active && !done ? '3px solid #F59E0B' : '2px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, transition: 'all .3s'
              }}>
                {done ? '✓' : step.icon}
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: done || active ? '#1B4332' : '#94A3B8', textTransform: 'uppercase', textAlign: 'center' }}>
                {step.label}
              </span>
            </div>
            {i < 3 && (
              <div style={{ flex: 1, height: 3, background: done ? '#1B4332' : '#E2E8F0', margin: '0 2px', marginBottom: 16, transition: 'background .3s' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function WorkflowCard({ wf, userRole, onAction, loading }) {
  const [expanded, setExpanded] = useState(false);
  const [actionData, setActionData] = useState({});
  const meta = STAGE_META[wf.stage] || STAGE_META.pending;

  const canAcceptBaling   = userRole === 'baler'    && wf.stage === 'pending'       && !wf.balerId;
  const canMarkBalingDone = userRole === 'baler'    && wf.stage === 'baler_assigned';
  const canAcceptTransport = userRole === 'mover'   && wf.stage === 'baling_done'   && !wf.moverId;
  const canMarkPickup     = userRole === 'mover'    && wf.stage === 'transport_assigned';
  const canMarkDelivered  = (userRole === 'mover' || userRole === 'industry') && wf.stage === 'in_transit';
  const canLinkIndustry   = userRole === 'industry' && ['baling_done','transport_assigned','in_transit'].includes(wf.stage) && !wf.industryId;

  return (
    <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,.07)', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
      {/* Stage color bar */}
      <div style={{ height: 4, background: meta.color }} />

      <div style={{ padding: '18px 22px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: meta.bg, color: meta.color }}>
                {meta.icon} {meta.label}
              </span>
              <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>#{wf.id.slice(0,8).toUpperCase()}</span>
            </div>
            <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 800, color: '#0F172A' }}>
              {wf.cropType} · {wf.quantityTons} tons
            </h3>
            <div style={{ fontSize: 13, color: '#475569', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span>📍 {wf.location}, {wf.district}</span>
              {wf.acresCount && <span>🌾 {wf.acresCount} acres</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            {wf.finalPriceRs && <div style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>₹{Number(wf.finalPriceRs).toLocaleString()}</div>}
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{new Date(wf.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
          </div>
        </div>

        {/* Pipeline visual */}
        <PipelineBar stage={wf.stage} />

        {/* Participants row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0', fontSize: 12 }}>
          <ParticipantBadge icon="🌾" label="Farmer"    name={wf.farmer?.name}   filled />
          <ParticipantBadge icon="📦" label="Baler"     name={wf.baler?.name}    filled={!!wf.baler} />
          <ParticipantBadge icon="🚚" label="Mover"     name={wf.mover?.name}    filled={!!wf.mover} />
          <ParticipantBadge icon="🏭" label="Industry"  name={wf.industry?.name} filled={!!wf.industry} />
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {canAcceptBaling && (
            <ActionPanel title="Accept Baling Job">
              <input type="number" placeholder="Your price (₹)" style={INP}
                onChange={e => setActionData(d => ({ ...d, balerPriceRs: e.target.value }))} />
              <Btn label="📦 Accept Baling" color="#1B4332" loading={loading}
                onClick={() => onAction(wf.id, 'accept-baling', actionData)} />
            </ActionPanel>
          )}
          {canMarkBalingDone && (
            <ActionPanel title="Mark Baling Complete">
              <input type="number" placeholder="Number of bales produced" style={INP}
                onChange={e => setActionData(d => ({ ...d, balesCount: e.target.value }))} />
              <Btn label="✅ Baling Done" color="#059669" loading={loading}
                onClick={() => onAction(wf.id, 'baling-done', actionData)} />
            </ActionPanel>
          )}
          {canAcceptTransport && (
            <ActionPanel title="Accept Transport Job">
              <input type="text"   placeholder="Delivery address / industry location" style={INP}
                onChange={e => setActionData(d => ({ ...d, deliveryAddress: e.target.value }))} />
              <input type="number" placeholder="Your transport price (₹)" style={INP}
                onChange={e => setActionData(d => ({ ...d, moverPriceRs: e.target.value }))} />
              <Btn label="🚚 Accept Transport" color="#7C3AED" loading={loading}
                onClick={() => onAction(wf.id, 'accept-transport', actionData)} />
            </ActionPanel>
          )}
          {canMarkPickup && (
            <Btn label="📦 Picked Up — In Transit" color="#C2410C" loading={loading}
              onClick={() => onAction(wf.id, 'pickup-done', {})} />
          )}
          {canMarkDelivered && (
            <ActionPanel title="Confirm Delivery">
              <input type="number" placeholder="Quantity delivered (tons)" style={INP}
                onChange={e => setActionData(d => ({ ...d, deliveredQtyTons: e.target.value }))} />
              <Btn label="🎉 Mark Delivered" color="#166534" loading={loading}
                onClick={() => onAction(wf.id, 'delivered', actionData)} />
            </ActionPanel>
          )}
          {canLinkIndustry && (
            <ActionPanel title="Link as Delivery Destination">
              <input type="number" placeholder="Your offered price (₹)" style={INP}
                onChange={e => setActionData(d => ({ ...d, finalPriceRs: e.target.value }))} />
              <Btn label="🏭 Link My Industry" color="#0E7490" loading={loading}
                onClick={() => onAction(wf.id, 'link-industry', actionData)} />
            </ActionPanel>
          )}

          <button onClick={() => setExpanded(!expanded)}
            style={{ padding: '8px 14px', border: '1px solid #E2E8F0', background: 'white', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#475569' }}>
            {expanded ? '▲ Hide Timeline' : '▼ View Timeline'}
          </button>
        </div>

        {/* Timeline */}
        {expanded && wf.events?.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F1F5F9' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 10 }}>Timeline</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {wf.events.map((ev, i) => {
                const m = STAGE_META[ev.stage] || { icon: '•', color: '#64748B' };
                return (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: m.bg || '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>{m.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{ev.note}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>
                        {ev.actorRole} · {new Date(ev.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ParticipantBadge({ icon, label, name, filled }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      background: filled ? '#F0FDF4' : '#F8FAFC',
      border: `1px solid ${filled ? '#BBF7D0' : '#E2E8F0'}`,
      borderRadius: 8, padding: '4px 10px', fontSize: 12,
    }}>
      <span>{icon}</span>
      <span style={{ fontWeight: 700, color: filled ? '#166534' : '#94A3B8' }}>
        {name || label}
      </span>
      {!filled && <span style={{ color: '#CBD5E1', fontSize: 11 }}>needed</span>}
    </div>
  );
}

function ActionPanel({ title, children }) {
  return (
    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>{title}</div>
      {children}
    </div>
  );
}

function Btn({ label, onClick, color, loading }) {
  return (
    <button onClick={onClick} disabled={loading}
      style={{ padding: '9px 18px', background: color, color: 'white', border: 'none', borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1, whiteSpace: 'nowrap' }}>
      {loading ? '...' : label}
    </button>
  );
}

// ── Create Biomass Request Form (farmer only) ──
function CreateRequestForm({ onCreated }) {
  const [form, setForm] = useState({ cropType: 'Paddy', quantityTons: '', location: '', district: '', acresCount: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const CROPS = ['Paddy', 'Wheat', 'Cotton', 'Sugarcane', 'Mustard', 'Maize', 'Barley', 'Soybean'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.quantityTons || !form.location || !form.district) { setError('Fill all required fields'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/workflow', form);
      onCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create request');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: 'white', borderRadius: 16, padding: 24, border: '2px solid #1B4332', boxShadow: '0 8px 24px rgba(27,67,50,.12)' }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#1B4332', marginBottom: 16 }}>🌾 Create Biomass Request</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={LBL}>Crop Type *</label>
          <select value={form.cropType} onChange={e => setForm(f => ({ ...f, cropType: e.target.value }))} style={SEL}>
            {CROPS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={LBL}>Quantity (tons) *</label>
          <input type="number" required placeholder="e.g. 25" value={form.quantityTons} onChange={e => setForm(f => ({ ...f, quantityTons: e.target.value }))} style={INP} />
        </div>
        <div>
          <label style={LBL}>Village / Location *</label>
          <input required placeholder="e.g. Machhiwara" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} style={INP} />
        </div>
        <div>
          <label style={LBL}>District *</label>
          <input required placeholder="e.g. Ludhiana" value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} style={INP} />
        </div>
        <div>
          <label style={LBL}>Acreage (optional)</label>
          <input type="number" placeholder="Acres of land" value={form.acresCount} onChange={e => setForm(f => ({ ...f, acresCount: e.target.value }))} style={INP} />
        </div>
        <div>
          <label style={LBL}>Notes (optional)</label>
          <input placeholder="Any special instructions" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={INP} />
        </div>
      </div>
      {error && <div style={{ marginTop: 10, fontSize: 13, color: '#B91C1C', fontWeight: 600 }}>{error}</div>}
      <button type="submit" disabled={loading}
        style={{ marginTop: 16, width: '100%', padding: '12px', background: '#1B4332', color: 'white', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
        {loading ? 'Creating...' : '🚀 Launch Biomass Workflow'}
      </button>
    </form>
  );
}

export default function WorkflowPage() {
  const { user } = useAuth();
  const [myWorkflows,   setMyWorkflows]   = useState([]);
  const [openWorkflows, setOpenWorkflows] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [tab, setTab]           = useState('mine'); // 'mine' | 'open' | 'create'
  const [error, setError]       = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [mine, open] = await Promise.all([
        api.get('/workflow').then(r => r.data),
        api.get('/workflow/open').then(r => r.data).catch(() => []),
      ]);
      setMyWorkflows(mine);
      setOpenWorkflows(open);
    } catch (e) {
      setError('Failed to load workflows');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAction = async (workflowId, action, data) => {
    setActionLoading(true);
    try {
      const method = ['accept-baling', 'accept-transport', 'link-industry'].includes(action) ? 'post' : 'put';
      await api[method](`/workflow/${workflowId}/${action}`, data);
      await load();
      setTab('mine');
    } catch (e) {
      alert(e.response?.data?.error || 'Action failed');
    } finally { setActionLoading(false); }
  };

  const roleTabs = [];
  if (user?.role === 'farmer') roleTabs.push({ key: 'create', label: '+ New Request', icon: '🌾' });
  roleTabs.push({ key: 'mine', label: 'My Workflows', icon: '📋' });
  if (['baler', 'mover', 'industry'].includes(user?.role)) roleTabs.push({ key: 'open', label: 'Open Jobs', icon: '🔍' });

  const STAGE_LABELS = {
    farmer:   'Track your biomass requests through the full pipeline',
    baler:    'Accept baling jobs, then mark complete when done',
    mover:    'Accept transport jobs, then mark pickup and delivery',
    industry: 'Link to incoming deliveries and confirm receipt',
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#F0F4F8' }}>
      <DesktopTopNav user={user} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
              ♻️ Biomass Pipeline
            </h1>
            <p style={{ color: '#64748B', margin: 0, fontSize: 14 }}>
              {STAGE_LABELS[user?.role] || 'Connected biomass supply chain from farm to industry'}
            </p>
          </div>

          {/* Pipeline legend */}
          <div style={{ background: 'white', borderRadius: 14, padding: '14px 20px', marginBottom: 20, border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
            <span style={{ fontWeight: 800, color: '#0F172A', marginRight: 6 }}>Pipeline:</span>
            {['🌾 Farmer creates request', '→', '📦 Baler accepts & bales', '→', '🚚 Mover transports', '→', '🏭 Industry receives'].map((s, i) => (
              <span key={i} style={{ color: s === '→' ? '#CBD5E1' : '#374151', fontWeight: s === '→' ? 400 : 600 }}>{s}</span>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'white', padding: 4, borderRadius: 12, marginBottom: 20, width: 'fit-content', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
            {roleTabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ padding: '8px 20px', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  background: tab === t.key ? '#1B4332' : 'transparent',
                  color: tab === t.key ? 'white' : '#64748B' }}>
                {t.icon} {t.label}
                {t.key === 'open' && openWorkflows.length > 0 && (
                  <span style={{ marginLeft: 6, background: '#F59E0B', color: 'white', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 800 }}>
                    {openWorkflows.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Create tab */}
          {tab === 'create' && (
            <CreateRequestForm onCreated={(wf) => { setMyWorkflows(m => [wf, ...m]); setTab('mine'); }} />
          )}

          {/* My Workflows tab */}
          {tab === 'mine' && (
            loading ? <LoadingSkeleton /> : myWorkflows.length === 0 ? (
              <EmptyState role={user?.role} onNew={() => setTab(user?.role === 'farmer' ? 'create' : 'open')} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {myWorkflows.map(wf => (
                  <WorkflowCard key={wf.id} wf={wf} userRole={user?.role} onAction={handleAction} loading={actionLoading} />
                ))}
              </div>
            )
          )}

          {/* Open Jobs tab */}
          {tab === 'open' && (
            loading ? <LoadingSkeleton /> : openWorkflows.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', background: 'white', borderRadius: 16, color: '#64748B' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>No open jobs right now</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>Check back soon — farmers post new requests regularly</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {openWorkflows.map(wf => (
                  <WorkflowCard key={wf.id} wf={wf} userRole={user?.role} onAction={handleAction} loading={actionLoading} />
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[1,2].map(i => (
        <div key={i} style={{ background: 'white', borderRadius: 16, padding: 24, border: '1px solid #E2E8F0' }}>
          {[1,2,3].map(j => <div key={j} style={{ height: 14, background: '#F1F5F9', borderRadius: 4, marginBottom: 12, width: j===1?'50%':j===2?'80%':'35%' }} />)}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ role, onNew }) {
  const msgs = {
    farmer:   { title: 'No biomass requests yet', sub: 'Create your first request to start the pipeline', btn: '🌾 Create Biomass Request' },
    baler:    { title: 'No active baling jobs', sub: 'Browse open jobs to accept your first assignment', btn: '🔍 Browse Open Jobs' },
    mover:    { title: 'No transport assignments', sub: 'Browse open transport jobs once baling is done', btn: '🔍 Browse Open Jobs' },
    industry: { title: 'No incoming deliveries', sub: 'Link to active workflows to receive biomass', btn: '🔍 Browse Deliveries' },
  };
  const m = msgs[role] || msgs.farmer;
  return (
    <div style={{ padding: 48, textAlign: 'center', background: 'white', borderRadius: 16, color: '#64748B' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, color: '#0F172A' }}>{m.title}</div>
      <div style={{ fontSize: 13, marginBottom: 20 }}>{m.sub}</div>
      <button onClick={onNew}
        style={{ padding: '10px 24px', background: '#1B4332', color: 'white', border: 'none', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>
        {m.btn}
      </button>
    </div>
  );
}

const INP = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' };
const SEL = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: 'white' };
const LBL = { display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 5 };
