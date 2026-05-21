import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import DesktopTopNav from '../components/dashboard/DesktopTopNav';
import api from '../api/axios';

/* ──────────────────────────────────────────────────────────
   STAGE METADATA
────────────────────────────────────────────────────────── */
const STAGE_META = {
  pending:            { label: 'Awaiting Baler Bids', color: '#92400E', bg: '#FEF3C7', icon: '⏳', step: 0 },
  baler_assigned:     { label: 'Baling in Progress',  color: '#1E40AF', bg: '#DBEAFE', icon: '📦', step: 1 },
  baling_done:        { label: 'Baled — Seeking Buyer',color: '#6D28D9', bg: '#EDE9FE', icon: '✅', step: 2 },
  industry_linked:    { label: 'Buyer Found — Need Transport', color: '#0E7490', bg: '#CFFAFE', icon: '🏭', step: 3 },
  transport_assigned: { label: 'Transport Booked',    color: '#065F46', bg: '#D1FAE5', icon: '🚚', step: 4 },
  in_transit:         { label: 'In Transit',           color: '#C2410C', bg: '#FFEDD5', icon: '🛣️', step: 5 },
  at_storage:         { label: 'At Storage',           color: '#475569', bg: '#F1F5F9', icon: '🏠', step: 5 },
  delivered:          { label: 'Delivered ✓',          color: '#166534', bg: '#DCFCE7', icon: '🎉', step: 6 },
  completed:          { label: 'Completed',            color: '#166534', bg: '#DCFCE7', icon: '✅', step: 6 },
  cancelled:          { label: 'Cancelled',            color: '#991B1B', bg: '#FEE2E2', icon: '❌', step: -1 },
};

const PIPELINE_STEPS = [
  { label: 'Request',   icon: '🌾' },
  { label: 'Baling',    icon: '📦' },
  { label: 'Buyer',     icon: '🏭' },
  { label: 'Transport', icon: '🚚' },
  { label: 'Delivered', icon: '🎉' },
];

/* ──────────────────────────────────────────────────────────
   SHARED COMPONENTS
────────────────────────────────────────────────────────── */
function PipelineBar({ stage }) {
  const currentStep = STAGE_META[stage]?.step ?? 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0 4px', gap: 0 }}>
      {PIPELINE_STEPS.map((step, i) => {
        const done   = currentStep > i;
        const active = currentStep === i;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < 4 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 44 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: done ? '#1B4332' : active ? '#F59E0B' : '#E2E8F0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: done || active ? 'white' : '#94A3B8',
                transition: 'all .3s'
              }}>
                {done ? '✓' : step.icon}
              </div>
              <span style={{ fontSize: 8, fontWeight: 700, color: done || active ? '#1B4332' : '#94A3B8', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.2 }}>
                {step.label}
              </span>
            </div>
            {i < 4 && <div style={{ flex: 1, height: 2.5, background: done ? '#1B4332' : '#E2E8F0', margin: '0 2px', marginBottom: 16, transition: 'background .3s' }} />}
          </div>
        );
      })}
    </div>
  );
}

function StageBadge({ stage }) {
  const m = STAGE_META[stage] || {};
  return (
    <span style={{ background: m.bg, color: m.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
      {m.icon} {m.label}
    </span>
  );
}

function Btn({ children, onClick, color = '#1B4332', disabled, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 16px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13,
        background: disabled ? '#CBD5E1' : color, color: disabled ? '#94A3B8' : 'white',
        cursor: disabled ? 'not-allowed' : 'pointer', transition: 'opacity .2s', ...style,
      }}
    >
      {children}
    </button>
  );
}

function Input({ label, value, onChange, type = 'text', placeholder, min }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 3 }}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        min={min}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #D1D5DB', fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
      />
    </div>
  );
}

function WorkflowCard({ wf, children, accent }) {
  return (
    <div style={{
      background: 'white', borderRadius: 14, padding: 18, marginBottom: 16,
      border: `2px solid ${accent || '#E2E8F0'}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#1B4332' }}>{wf.cropType} — {wf.quantityTons} tons</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{wf.location}, {wf.district} · #{wf.id.slice(0, 8)}</div>
        </div>
        <StageBadge stage={wf.stage} />
      </div>
      <PipelineBar stage={wf.stage} />
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   FARMER VIEW
────────────────────────────────────────────────────────── */
function FarmerView({ user }) {
  const [myWorkflows, setMyWorkflows]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showCreate, setShowCreate]     = useState(false);
  const [creating, setCreating]         = useState(false);
  const [form, setForm]                 = useState({ cropType: '', quantityTons: '', location: '', district: '', acresCount: '', notes: '' });
  const [actionLoading, setActionLoading] = useState('');
  const [msg, setMsg]                   = useState('');

  const CROPS = ['Paddy', 'Wheat', 'Cotton', 'Sugarcane', 'Mustard', 'Maize', 'Barley', 'Soybean'];

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/workflow');
      setMyWorkflows(data);
    } catch {
      setMsg('Could not load your requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createWorkflow = async () => {
    if (!form.cropType || !form.quantityTons || !form.location || !form.district) {
      return setMsg('Fill in all required fields');
    }
    setCreating(true);
    try {
      await api.post('/workflow', form);
      setShowCreate(false);
      setForm({ cropType: '', quantityTons: '', location: '', district: '', acresCount: '', notes: '' });
      setMsg('✅ Biomass request posted! Balers will start bidding shortly.');
      await load();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to create request');
    } finally {
      setCreating(false);
    }
  };

  const acceptBid = async (wfId, bidId) => {
    setActionLoading(`bid-${bidId}`);
    try {
      await api.post(`/workflow/${wfId}/accept-bid/${bidId}`);
      setMsg('✅ Baler assigned! They will start baling your crop.');
      await load();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to accept bid');
    } finally {
      setActionLoading('');
    }
  };

  const acceptOffer = async (wfId, offerId) => {
    setActionLoading(`offer-${offerId}`);
    try {
      await api.post(`/workflow/${wfId}/accept-offer/${offerId}`);
      setMsg('✅ Industry buyer locked in! Now accepting transport bids.');
      await load();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to accept offer');
    } finally {
      setActionLoading('');
    }
  };

  const cancelWorkflow = async (wfId) => {
    if (!window.confirm('Cancel this request?')) return;
    setActionLoading(`cancel-${wfId}`);
    try {
      await api.put(`/workflow/${wfId}/cancel`);
      setMsg('Request cancelled.');
      await load();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to cancel');
    } finally {
      setActionLoading('');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#6B7280' }}>Loading your requests…</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1B4332' }}>🌾 My Biomass Requests</div>
          <div style={{ fontSize: 13, color: '#6B7280' }}>Post crop residue → get baler bids → sell to industry</div>
        </div>
        <Btn onClick={() => setShowCreate(true)}>+ New Request</Btn>
      </div>

      {msg && (
        <div style={{ background: msg.startsWith('✅') ? '#DCFCE7' : '#FEE2E2', color: msg.startsWith('✅') ? '#166534' : '#991B1B', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
          {msg} <button onClick={() => setMsg('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div style={{ background: 'white', borderRadius: 14, padding: 24, border: '2px solid #1B4332', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#1B4332', marginBottom: 16 }}>📋 New Biomass Request</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Crop Type *</label>
              <select value={form.cropType} onChange={e => setForm(f => ({ ...f, cropType: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #D1D5DB', fontSize: 13 }}>
                <option value="">Select crop</option>
                {CROPS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <Input label="Quantity (tons) *" type="number" value={form.quantityTons} onChange={v => setForm(f => ({ ...f, quantityTons: v }))} placeholder="e.g. 12" min="1" />
            <Input label="Village / Location *" value={form.location} onChange={v => setForm(f => ({ ...f, location: v }))} placeholder="Village name" />
            <Input label="District *" value={form.district} onChange={v => setForm(f => ({ ...f, district: v }))} placeholder="e.g. Ludhiana" />
            <Input label="Land Acres (optional)" type="number" value={form.acresCount} onChange={v => setForm(f => ({ ...f, acresCount: v }))} placeholder="e.g. 5" />
            <Input label="Notes (optional)" value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} placeholder="Any special instructions" />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Btn onClick={createWorkflow} disabled={creating}>{creating ? 'Posting…' : 'Post Request'}</Btn>
            <Btn onClick={() => setShowCreate(false)} color="#6B7280">Cancel</Btn>
          </div>
        </div>
      )}

      {/* Workflow list */}
      {myWorkflows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'white', borderRadius: 14 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌾</div>
          <div style={{ fontWeight: 700, color: '#374151', marginBottom: 6 }}>No requests yet</div>
          <div style={{ color: '#6B7280', fontSize: 13 }}>Post your first biomass request to get baler bids</div>
        </div>
      ) : (
        myWorkflows.map(wf => (
          <WorkflowCard key={wf.id} wf={wf} accent={wf.stage === 'pending' && wf.balerBids?.length > 0 ? '#F59E0B' : undefined}>

            {/* ── Pending: show baler bids to accept ── */}
            {wf.stage === 'pending' && (
              <div style={{ marginTop: 12 }}>
                {wf.balerBids?.length === 0 ? (
                  <div style={{ padding: '12px 0', color: '#6B7280', fontSize: 13 }}>⏳ Waiting for balers to place bids…</div>
                ) : (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1B4332', marginBottom: 8 }}>
                      🔨 {wf.balerBids.length} Baler Bid{wf.balerBids.length > 1 ? 's' : ''} — Pick the best:
                    </div>
                    {wf.balerBids.filter(b => b.status !== 'rejected').map(bid => (
                      <div key={bid.id} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{bid.baler?.name || 'Baler'}</div>
                          <div style={{ fontSize: 12, color: '#6B7280' }}>
                            ₹{bid.pricePerTon}/ton × {bid.quantityTons} tons = <strong>₹{(bid.pricePerTon * bid.quantityTons).toLocaleString()}</strong>
                            {' '}· {bid.estimatedDays} days
                          </div>
                          {bid.message && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, fontStyle: 'italic' }}>"{bid.message}"</div>}
                        </div>
                        <Btn
                          onClick={() => acceptBid(wf.id, bid.id)}
                          disabled={actionLoading === `bid-${bid.id}`}
                          color="#1B4332"
                        >
                          {actionLoading === `bid-${bid.id}` ? 'Accepting…' : '✓ Accept'}
                        </Btn>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* ── Baler assigned: show who's baling ── */}
            {wf.stage === 'baler_assigned' && (
              <div style={{ marginTop: 10, background: '#DBEAFE', borderRadius: 8, padding: 10, fontSize: 13 }}>
                📦 <strong>{wf.baler?.name}</strong> is baling your crop. Estimated cost: ₹{wf.balerPriceRs?.toLocaleString()}
              </div>
            )}

            {/* ── Baling done: show industry offers ── */}
            {wf.stage === 'baling_done' && (
              <div style={{ marginTop: 12 }}>
                {wf.industryOffers?.length === 0 ? (
                  <div style={{ padding: '10px 0', color: '#6B7280', fontSize: 13 }}>⏳ Waiting for industry buyers to submit offers…</div>
                ) : (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#6D28D9', marginBottom: 8 }}>
                      🏭 {wf.industryOffers.length} Industry Offer{wf.industryOffers.length > 1 ? 's' : ''} — Choose a buyer:
                    </div>
                    {wf.industryOffers.filter(o => o.status !== 'rejected').map(offer => (
                      <div key={offer.id} style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 10, padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{offer.industry?.name || 'Industry Buyer'}</div>
                          <div style={{ fontSize: 12, color: '#6B7280' }}>
                            ₹{offer.pricePerTon}/ton × {offer.quantityTons} tons = <strong>₹{(offer.pricePerTon * offer.quantityTons).toLocaleString()}</strong>
                          </div>
                          {offer.message && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, fontStyle: 'italic' }}>"{offer.message}"</div>}
                        </div>
                        <Btn
                          onClick={() => acceptOffer(wf.id, offer.id)}
                          disabled={actionLoading === `offer-${offer.id}`}
                          color="#6D28D9"
                        >
                          {actionLoading === `offer-${offer.id}` ? 'Accepting…' : '✓ Accept Offer'}
                        </Btn>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* ── Industry linked: baler arranges transport (farmer just watches) ── */}
            {wf.stage === 'industry_linked' && (
              <div style={{ marginTop: 10, background: '#ECFEFF', borderRadius: 8, padding: 12, fontSize: 13 }}>
                <div>🏭 Buyer confirmed: <strong>{wf.industry?.name}</strong> · Deal: ₹{wf.finalPriceRs?.toLocaleString()}</div>
                <div style={{ marginTop: 4, color: '#0E7490' }}>
                  📦 Your baler (<strong>{wf.baler?.name}</strong>) is now arranging transport to the buyer.
                </div>
                {wf.transportBids?.length > 0 && (
                  <div style={{ marginTop: 4, color: '#6B7280' }}>
                    🚚 {wf.transportBids.length} transport bid{wf.transportBids.length > 1 ? 's' : ''} received — baler is reviewing
                  </div>
                )}
              </div>
            )}

            {/* ── Transport booked / in transit / delivered ── */}
            {wf.stage === 'transport_assigned' && (
              <div style={{ marginTop: 10, background: '#D1FAE5', borderRadius: 8, padding: 10, fontSize: 13 }}>
                🚚 <strong>{wf.mover?.name}</strong> is picking up your bales → delivering to <strong>{wf.industry?.name}</strong>
              </div>
            )}
            {wf.stage === 'in_transit' && (
              <div style={{ marginTop: 10, background: '#FFEDD5', borderRadius: 8, padding: 10, fontSize: 13 }}>
                🛣️ Your bales are on the way to <strong>{wf.industry?.name}</strong>
              </div>
            )}
            {['delivered', 'completed'].includes(wf.stage) && (
              <div style={{ marginTop: 10, background: '#DCFCE7', borderRadius: 8, padding: 10, fontSize: 13 }}>
                🎉 Delivered! {wf.deliveredQtyTons || wf.quantityTons} tons received. Total earnings: ₹{((wf.finalPriceRs || 0) - (wf.balerPriceRs || 0) - (wf.moverPriceRs || 0)).toLocaleString()}
              </div>
            )}

            {/* Cancel button */}
            {!['delivered', 'completed', 'cancelled'].includes(wf.stage) && (
              <div style={{ marginTop: 10, textAlign: 'right' }}>
                <button
                  onClick={() => cancelWorkflow(wf.id)}
                  disabled={actionLoading === `cancel-${wf.id}`}
                  style={{ fontSize: 11, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel Request
                </button>
              </div>
            )}
          </WorkflowCard>
        ))
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   BALER VIEW
────────────────────────────────────────────────────────── */
function BalerView({ user }) {
  const [openJobs, setOpenJobs]   = useState([]);
  const [myJobs, setMyJobs]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [bidForms, setBidForms]   = useState({});
  const [submitting, setSubmitting] = useState('');
  const [msg, setMsg]             = useState('');

  const load = useCallback(async () => {
    try {
      const [open, mine] = await Promise.all([
        api.get('/workflow/open'),
        api.get('/workflow'),
      ]);
      setOpenJobs(open.data);
      setMyJobs(mine.data);
    } catch {
      setMsg('Could not load jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submitBid = async (wfId) => {
    const form = bidForms[wfId] || {};
    if (!form.pricePerTon || !form.quantityTons) return setMsg('Enter price and quantity');
    setSubmitting(wfId);
    try {
      await api.post(`/workflow/${wfId}/bid`, {
        pricePerTon: parseFloat(form.pricePerTon),
        quantityTons: parseFloat(form.quantityTons),
        estimatedDays: parseInt(form.estimatedDays || 3),
        message: form.message || '',
      });
      setMsg('✅ Bid submitted! The farmer will review your offer.');
      setBidForms(f => ({ ...f, [wfId]: undefined }));
      await load();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to submit bid');
    } finally {
      setSubmitting('');
    }
  };

  const markBalingDone = async (wfId) => {
    const balesCount = window.prompt('How many bales did you produce?', '0');
    if (balesCount === null) return;
    try {
      await api.put(`/workflow/${wfId}/baling-done`, { balesCount: parseInt(balesCount) });
      setMsg('✅ Baling marked complete! Industry can now submit purchase offers.');
      await load();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to update');
    }
  };

  const setField = (wfId, key, val) => setBidForms(f => ({ ...f, [wfId]: { ...f[wfId], [key]: val } }));

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#6B7280' }}>Loading jobs…</div>;

  return (
    <div>
      {msg && (
        <div style={{ background: msg.startsWith('✅') ? '#DCFCE7' : '#FEE2E2', color: msg.startsWith('✅') ? '#166534' : '#991B1B', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
          {msg} <button onClick={() => setMsg('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* Open Jobs to Bid On */}
      <div style={{ fontSize: 18, fontWeight: 800, color: '#1B4332', marginBottom: 4 }}>📋 Open Farmer Requests</div>
      <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>Submit competitive bids to win baling contracts</div>

      {openJobs.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 14, padding: 40, textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <div style={{ color: '#6B7280', fontSize: 13 }}>No open requests right now — check back after harvest season</div>
        </div>
      ) : (
        openJobs.map(wf => {
          const form = bidForms[wf.id] || {};
          const isExpanded = form.expanded;
          return (
            <div key={wf.id} style={{ background: 'white', borderRadius: 14, padding: 18, marginBottom: 14, border: '2px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: '#1B4332' }}>{wf.cropType} — {wf.quantityTons} tons</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>📍 {wf.location}, {wf.district} · by {wf.farmer?.name}</div>
                  {wf.notes && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, fontStyle: 'italic' }}>"{wf.notes}"</div>}
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                    {wf.balerBids?.length || 0} bid{(wf.balerBids?.length || 0) !== 1 ? 's' : ''} so far
                    {wf.acresCount ? ` · ${wf.acresCount} acres` : ''}
                  </div>
                </div>
                <Btn onClick={() => setField(wf.id, 'expanded', !isExpanded)} color={isExpanded ? '#6B7280' : '#1B4332'}>
                  {isExpanded ? 'Hide Form' : '💰 Place Bid'}
                </Btn>
              </div>

              {isExpanded && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Your Price (₹/ton) *</label>
                      <input type="number" value={form.pricePerTon || ''} onChange={e => setField(wf.id, 'pricePerTon', e.target.value)}
                        placeholder="e.g. 1200" min="1"
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #D1D5DB', fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Quantity you can take (tons) *</label>
                      <input type="number" value={form.quantityTons || ''} onChange={e => setField(wf.id, 'quantityTons', e.target.value)}
                        placeholder={`max ${wf.quantityTons}`} min="1" max={wf.quantityTons}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #D1D5DB', fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Days to complete</label>
                      <input type="number" value={form.estimatedDays || ''} onChange={e => setField(wf.id, 'estimatedDays', e.target.value)}
                        placeholder="3" min="1"
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #D1D5DB', fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Message to farmer (optional)</label>
                      <input type="text" value={form.message || ''} onChange={e => setField(wf.id, 'message', e.target.value)}
                        placeholder="e.g. Available immediately"
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #D1D5DB', fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  {form.pricePerTon && form.quantityTons && (
                    <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '8px 12px', marginTop: 10, fontSize: 13, fontWeight: 700, color: '#166534' }}>
                      💰 Your total bid: ₹{(parseFloat(form.pricePerTon) * parseFloat(form.quantityTons)).toLocaleString()}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <Btn onClick={() => submitBid(wf.id)} disabled={submitting === wf.id}>
                      {submitting === wf.id ? 'Submitting…' : '✓ Submit Bid'}
                    </Btn>
                    <Btn onClick={() => setField(wf.id, 'expanded', false)} color="#6B7280">Cancel</Btn>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* My Active Jobs */}
      {myJobs.length > 0 && (
        <>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1B4332', marginTop: 24, marginBottom: 4 }}>⚙️ My Assigned Jobs</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>Active baling contracts</div>
          {myJobs.filter(wf => ['baler_assigned'].includes(wf.stage) && wf.balerId === user.id).map(wf => (
            <WorkflowCard key={wf.id} wf={wf} accent="#1E40AF">
              <div style={{ marginTop: 12, background: '#DBEAFE', borderRadius: 8, padding: 12, fontSize: 13 }}>
                <div>👨‍🌾 Farmer: <strong>{wf.farmer?.name}</strong> · {wf.location}</div>
                <div style={{ marginTop: 4 }}>Your earnings: <strong>₹{wf.balerPriceRs?.toLocaleString()}</strong></div>
              </div>
              <div style={{ marginTop: 10 }}>
                <Btn onClick={() => markBalingDone(wf.id)} color="#1E40AF">✅ Mark Baling Complete</Btn>
              </div>
            </WorkflowCard>
          ))}

          {/* Pending Bid Status */}
          {myJobs.filter(wf => wf.stage === 'pending').map(wf => {
            const myBid = wf.balerBids?.find(b => b.balerId === user.id);
            return (
              <WorkflowCard key={wf.id} wf={wf}>
                <div style={{ marginTop: 10, background: '#FEF3C7', borderRadius: 8, padding: 10, fontSize: 13 }}>
                  ⏳ Your bid: ₹{myBid?.pricePerTon}/ton × {myBid?.quantityTons} tons = ₹{((myBid?.pricePerTon || 0) * (myBid?.quantityTons || 0)).toLocaleString()} — waiting for farmer decision
                </div>
              </WorkflowCard>
            );
          })}

          {/* Industry linked: baler picks a mover */}
          {myJobs.filter(wf => wf.stage === 'industry_linked' && wf.balerId === user.id).map(wf => (
            <WorkflowCard key={wf.id} wf={wf} accent="#0E7490">
              <div style={{ marginTop: 10, background: '#ECFEFF', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 8 }}>
                🏭 Buyer: <strong>{wf.industry?.name}</strong> · Deal value: ₹{wf.finalPriceRs?.toLocaleString()}
                <div style={{ marginTop: 4, color: '#0E7490', fontWeight: 600 }}>
                  📦 You need to arrange transport to the buyer. Pick the best mover below.
                </div>
              </div>
              {!wf.transportBids?.length ? (
                <div style={{ color: '#6B7280', fontSize: 13, padding: '6px 0' }}>⏳ Waiting for movers to bid on transport…</div>
              ) : (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0E7490', marginBottom: 8 }}>
                    🚚 {wf.transportBids.length} Transport Bid{wf.transportBids.length > 1 ? 's' : ''} — Choose a mover:
                  </div>
                  {wf.transportBids.filter(b => b.status !== 'rejected').map(bid => (
                    <div key={bid.id} style={{ background: '#F0FDFF', border: '1px solid #A5F3FC', borderRadius: 10, padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{bid.mover?.name || 'Mover'}</div>
                        <div style={{ fontSize: 12, color: '#6B7280' }}>₹{bid.priceTotal?.toLocaleString()} total · {bid.estimatedDays} days</div>
                        {bid.message && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, fontStyle: 'italic' }}>"{bid.message}"</div>}
                      </div>
                      <Btn
                        onClick={async () => {
                          try {
                            await api.post(`/workflow/${wf.id}/accept-transport-bid/${bid.id}`);
                            setMsg('✅ Transport booked! Mover will pick up bales.');
                            await load();
                          } catch (err) {
                            setMsg(err.response?.data?.error || 'Failed to book transport');
                          }
                        }}
                        color="#0E7490"
                      >
                        ✓ Book This Mover
                      </Btn>
                    </div>
                  ))}
                </>
              )}
            </WorkflowCard>
          ))}
        </>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   INDUSTRY VIEW
────────────────────────────────────────────────────────── */
function IndustryView({ user }) {
  const [available, setAvailable] = useState([]);
  const [myDeals, setMyDeals]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [offerForms, setOfferForms] = useState({});
  const [submitting, setSubmitting] = useState('');
  const [msg, setMsg]             = useState('');

  const load = useCallback(async () => {
    try {
      const [open, mine] = await Promise.all([
        api.get('/workflow/open'),
        api.get('/workflow'),
      ]);
      setAvailable(open.data);
      setMyDeals(mine.data);
    } catch {
      setMsg('Could not load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submitOffer = async (wfId) => {
    const form = offerForms[wfId] || {};
    if (!form.pricePerTon || !form.quantityTons) return setMsg('Enter price and quantity');
    setSubmitting(wfId);
    try {
      await api.post(`/workflow/${wfId}/offer`, {
        pricePerTon: parseFloat(form.pricePerTon),
        quantityTons: parseFloat(form.quantityTons),
        message: form.message || '',
      });
      setMsg('✅ Offer submitted! The farmer will review your purchase offer.');
      setOfferForms(f => ({ ...f, [wfId]: undefined }));
      await load();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to submit offer');
    } finally {
      setSubmitting('');
    }
  };

  const confirmDelivery = async (wfId, quantityTons) => {
    const qty = window.prompt('Confirm delivered quantity (tons):', String(quantityTons));
    if (!qty) return;
    try {
      await api.put(`/workflow/${wfId}/delivered`, { deliveredQtyTons: parseFloat(qty) });
      setMsg('✅ Delivery confirmed! Pipeline complete.');
      await load();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to confirm delivery');
    }
  };

  const setField = (wfId, key, val) => setOfferForms(f => ({ ...f, [wfId]: { ...f[wfId], [key]: val } }));

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#6B7280' }}>Loading…</div>;

  return (
    <div>
      {msg && (
        <div style={{ background: msg.startsWith('✅') ? '#DCFCE7' : '#FEE2E2', color: msg.startsWith('✅') ? '#166534' : '#991B1B', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
          {msg} <button onClick={() => setMsg('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* Available Biomass */}
      <div style={{ fontSize: 18, fontWeight: 800, color: '#1B4332', marginBottom: 4 }}>🏭 Available Baled Biomass</div>
      <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>Submit purchase offers on baled and ready crop residue</div>

      {available.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 14, padding: 40, textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <div style={{ color: '#6B7280', fontSize: 13 }}>No baled biomass available right now. Check back after harvest season.</div>
        </div>
      ) : (
        available.map(wf => {
          const form = offerForms[wf.id] || {};
          const isExpanded = form.expanded;
          return (
            <div key={wf.id} style={{ background: 'white', borderRadius: 14, padding: 18, marginBottom: 14, border: '2px solid #EDE9FE', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: '#1B4332' }}>{wf.cropType} — {wf.quantityTons} tons baled</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>📍 {wf.location}, {wf.district}</div>
                  {wf.balesCount && <div style={{ fontSize: 12, color: '#6B7280' }}>🗂 {wf.balesCount} bales produced</div>}
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                    {wf.industryOffers?.length || 0} offer{(wf.industryOffers?.length || 0) !== 1 ? 's' : ''} submitted
                  </div>
                </div>
                <Btn onClick={() => setField(wf.id, 'expanded', !isExpanded)} color={isExpanded ? '#6B7280' : '#6D28D9'}>
                  {isExpanded ? 'Hide Form' : '💰 Make Offer'}
                </Btn>
              </div>

              {isExpanded && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Your Price (₹/ton) *</label>
                      <input type="number" value={form.pricePerTon || ''} onChange={e => setField(wf.id, 'pricePerTon', e.target.value)}
                        placeholder="e.g. 3500" min="1"
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #D1D5DB', fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Quantity you want (tons) *</label>
                      <input type="number" value={form.quantityTons || ''} onChange={e => setField(wf.id, 'quantityTons', e.target.value)}
                        placeholder={`max ${wf.quantityTons}`} min="1" max={wf.quantityTons}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #D1D5DB', fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Message to farmer (optional)</label>
                      <input type="text" value={form.message || ''} onChange={e => setField(wf.id, 'message', e.target.value)}
                        placeholder="e.g. Can take delivery within 7 days"
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #D1D5DB', fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  {form.pricePerTon && form.quantityTons && (
                    <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 8, padding: '8px 12px', marginTop: 10, fontSize: 13, fontWeight: 700, color: '#6D28D9' }}>
                      💼 Your total offer: ₹{(parseFloat(form.pricePerTon) * parseFloat(form.quantityTons)).toLocaleString()}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <Btn onClick={() => submitOffer(wf.id)} disabled={submitting === wf.id} color="#6D28D9">
                      {submitting === wf.id ? 'Submitting…' : '✓ Submit Offer'}
                    </Btn>
                    <Btn onClick={() => setField(wf.id, 'expanded', false)} color="#6B7280">Cancel</Btn>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* My Active Deals */}
      {myDeals.length > 0 && (
        <>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1B4332', marginTop: 24, marginBottom: 4 }}>📦 My Procurement Deals</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>Active and pending biomass purchases</div>
          {myDeals.map(wf => {
            const myOffer = wf.industryOffers?.find(o => o.industryId === user.id);
            return (
              <WorkflowCard key={wf.id} wf={wf} accent="#6D28D9">
                {myOffer && (
                  <div style={{ marginTop: 10, fontSize: 13, background: '#F5F3FF', borderRadius: 8, padding: 10 }}>
                    Your offer: ₹{myOffer.pricePerTon}/ton × {myOffer.quantityTons} tons = <strong>₹{(myOffer.pricePerTon * myOffer.quantityTons).toLocaleString()}</strong>
                    {' '}— <span style={{ color: myOffer.status === 'accepted' ? '#166534' : myOffer.status === 'rejected' ? '#991B1B' : '#92400E', fontWeight: 700 }}>{myOffer.status}</span>
                  </div>
                )}
                {wf.stage === 'in_transit' && wf.industryId === user.id && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ background: '#FFEDD5', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 8 }}>
                      🚚 Bales are in transit to your location
                    </div>
                    <Btn onClick={() => confirmDelivery(wf.id, wf.quantityTons)} color="#166534">
                      ✅ Confirm Delivery Received
                    </Btn>
                  </div>
                )}
                {['delivered', 'completed'].includes(wf.stage) && (
                  <div style={{ marginTop: 10, background: '#DCFCE7', borderRadius: 8, padding: 10, fontSize: 13 }}>
                    🎉 {wf.deliveredQtyTons || wf.quantityTons} tons received. Deal complete!
                  </div>
                )}
              </WorkflowCard>
            );
          })}
        </>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   MOVER VIEW
────────────────────────────────────────────────────────── */
function MoverView({ user }) {
  const [openJobs, setOpenJobs]   = useState([]);
  const [myJobs, setMyJobs]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [bidForms, setBidForms]   = useState({});
  const [submitting, setSubmitting] = useState('');
  const [msg, setMsg]             = useState('');

  const load = useCallback(async () => {
    try {
      const [open, mine] = await Promise.all([
        api.get('/workflow/open'),
        api.get('/workflow'),
      ]);
      setOpenJobs(open.data);
      setMyJobs(mine.data);
    } catch {
      setMsg('Could not load jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submitTransportBid = async (wfId) => {
    const form = bidForms[wfId] || {};
    if (!form.priceTotal) return setMsg('Enter your total price');
    setSubmitting(wfId);
    try {
      await api.post(`/workflow/${wfId}/transport-bid`, {
        priceTotal: parseFloat(form.priceTotal),
        estimatedDays: parseInt(form.estimatedDays || 2),
        message: form.message || '',
      });
      setMsg('✅ Bid submitted! Farmer will review your transport offer.');
      setBidForms(f => ({ ...f, [wfId]: undefined }));
      await load();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to submit bid');
    } finally {
      setSubmitting('');
    }
  };

  const markPickup = async (wfId) => {
    try {
      await api.put(`/workflow/${wfId}/pickup-done`);
      setMsg('✅ Pickup confirmed! Bales are in transit.');
      await load();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to mark pickup');
    }
  };

  const markDelivered = async (wfId, quantityTons) => {
    const qty = window.prompt('Confirm delivered quantity (tons):', String(quantityTons));
    if (!qty) return;
    try {
      await api.put(`/workflow/${wfId}/delivered`, { deliveredQtyTons: parseFloat(qty) });
      setMsg('✅ Delivery confirmed! Job complete.');
      await load();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to confirm delivery');
    }
  };

  const setField = (wfId, key, val) => setBidForms(f => ({ ...f, [wfId]: { ...f[wfId], [key]: val } }));

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#6B7280' }}>Loading jobs…</div>;

  return (
    <div>
      {msg && (
        <div style={{ background: msg.startsWith('✅') ? '#DCFCE7' : '#FEE2E2', color: msg.startsWith('✅') ? '#166534' : '#991B1B', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
          {msg} <button onClick={() => setMsg('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* Open Transport Jobs */}
      <div style={{ fontSize: 18, fontWeight: 800, color: '#1B4332', marginBottom: 4 }}>🚚 Open Transport Jobs</div>
      <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>Bid on biomass transport from farm to industry</div>

      {openJobs.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 14, padding: 40, textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <div style={{ color: '#6B7280', fontSize: 13 }}>No transport jobs right now. They appear after industry buyers confirm purchases.</div>
        </div>
      ) : (
        openJobs.map(wf => {
          const form = bidForms[wf.id] || {};
          const isExpanded = form.expanded;
          return (
            <div key={wf.id} style={{ background: 'white', borderRadius: 14, padding: 18, marginBottom: 14, border: '2px solid #CFFAFE', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: '#1B4332' }}>{wf.cropType} — {wf.quantityTons} tons</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                    📍 From: {wf.location}, {wf.district}
                    {wf.industry?.name ? ` → 🏭 ${wf.industry.name}` : ''}
                  </div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                    {wf.transportBids?.length || 0} bid{(wf.transportBids?.length || 0) !== 1 ? 's' : ''} submitted
                  </div>
                </div>
                <Btn onClick={() => setField(wf.id, 'expanded', !isExpanded)} color={isExpanded ? '#6B7280' : '#0E7490'}>
                  {isExpanded ? 'Hide Form' : '🚚 Place Bid'}
                </Btn>
              </div>

              {isExpanded && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Total Transport Price (₹) *</label>
                      <input type="number" value={form.priceTotal || ''} onChange={e => setField(wf.id, 'priceTotal', e.target.value)}
                        placeholder="e.g. 8000" min="1"
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #D1D5DB', fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Days to deliver</label>
                      <input type="number" value={form.estimatedDays || ''} onChange={e => setField(wf.id, 'estimatedDays', e.target.value)}
                        placeholder="2" min="1"
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #D1D5DB', fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Message (optional)</label>
                      <input type="text" value={form.message || ''} onChange={e => setField(wf.id, 'message', e.target.value)}
                        placeholder="e.g. Have 2 trucks available"
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #D1D5DB', fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <Btn onClick={() => submitTransportBid(wf.id)} disabled={submitting === wf.id} color="#0E7490">
                      {submitting === wf.id ? 'Submitting…' : '✓ Submit Bid'}
                    </Btn>
                    <Btn onClick={() => setField(wf.id, 'expanded', false)} color="#6B7280">Cancel</Btn>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* My Active Jobs */}
      {myJobs.length > 0 && (
        <>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1B4332', marginTop: 24, marginBottom: 4 }}>⚙️ My Transport Jobs</div>
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>Assigned and in-progress routes</div>
          {myJobs.map(wf => {
            const myBid = wf.transportBids?.find(b => b.moverId === user.id);
            return (
              <WorkflowCard key={wf.id} wf={wf} accent="#0E7490">
                {myBid && wf.stage !== 'industry_linked' && (
                  <div style={{ marginTop: 10, fontSize: 13, background: '#ECFEFF', borderRadius: 8, padding: 10 }}>
                    Your bid: <strong>₹{myBid.priceTotal?.toLocaleString()}</strong> · {myBid.estimatedDays} days
                    {' '}— <span style={{ color: myBid.status === 'accepted' ? '#166534' : myBid.status === 'rejected' ? '#991B1B' : '#92400E', fontWeight: 700 }}>{myBid.status}</span>
                  </div>
                )}
                {wf.stage === 'industry_linked' && myBid?.status === 'pending' && (
                  <div style={{ marginTop: 10, background: '#FEF3C7', borderRadius: 8, padding: 10, fontSize: 13 }}>
                    ⏳ Bid pending farmer approval
                  </div>
                )}
                {wf.stage === 'transport_assigned' && wf.moverId === user.id && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ background: '#D1FAE5', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 8 }}>
                      📍 Pickup from: <strong>{wf.location}</strong> · Deliver to: <strong>{wf.industry?.name || 'Industry'}</strong>
                    </div>
                    <Btn onClick={() => markPickup(wf.id)} color="#065F46">🚚 Confirm Pickup</Btn>
                  </div>
                )}
                {wf.stage === 'in_transit' && wf.moverId === user.id && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ background: '#FFEDD5', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 8 }}>
                      🛣️ En route to {wf.industry?.name || 'industry'}
                    </div>
                    <Btn onClick={() => markDelivered(wf.id, wf.quantityTons)} color="#166534">✅ Confirm Delivery</Btn>
                  </div>
                )}
                {['delivered', 'completed'].includes(wf.stage) && (
                  <div style={{ marginTop: 10, background: '#DCFCE7', borderRadius: 8, padding: 10, fontSize: 13 }}>
                    🎉 Delivered {wf.deliveredQtyTons || wf.quantityTons} tons. Earnings: ₹{wf.moverPriceRs?.toLocaleString()}
                  </div>
                )}
              </WorkflowCard>
            );
          })}
        </>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   MAIN PAGE
────────────────────────────────────────────────────────── */
export default function WorkflowPage() {
  const { user } = useAuth();

  const roleConfig = {
    farmer:   { title: '🌾 Biomass Pipeline',       subtitle: 'Post requests · Review bids · Track delivery' },
    baler:    { title: '📦 Baling Jobs',             subtitle: 'Bid on open requests · Mark baling complete' },
    industry: { title: '🏭 Biomass Procurement',    subtitle: 'Browse available biomass · Submit purchase offers' },
    mover:    { title: '🚚 Transport Jobs',          subtitle: 'Bid on transport routes · Confirm pickups & delivery' },
    admin:    { title: '⚙️ All Workflows',           subtitle: 'Full pipeline visibility' },
  };

  const config = roleConfig[user?.role] || roleConfig.farmer;

  const isMobile = window.innerWidth < 768;

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      {!isMobile && <DesktopTopNav user={user} />}

      {/* Page Header */}
      <div style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)', color: 'white', padding: isMobile ? '20px 16px' : '28px 40px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 900 }}>{config.title}</div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>{config.subtitle}</div>

          {/* Pipeline Legend */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            {[
              { label: 'Farmer posts', color: '#FEF3C7', text: '#92400E' },
              { label: 'Baler bids → works', color: '#DBEAFE', text: '#1E40AF' },
              { label: 'Industry offers → buys', color: '#EDE9FE', text: '#6D28D9' },
              { label: 'Mover transports', color: '#CFFAFE', text: '#0E7490' },
              { label: 'Delivered ✓', color: '#DCFCE7', text: '#166534' },
            ].map(step => (
              <span key={step.label} style={{ background: step.color, color: step.text, padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
                {step.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: isMobile ? '16px 12px' : '28px 24px' }}>
        {user?.role === 'farmer'   && <FarmerView   user={user} />}
        {user?.role === 'baler'    && <BalerView    user={user} />}
        {user?.role === 'industry' && <IndustryView user={user} />}
        {user?.role === 'mover'    && <MoverView    user={user} />}
        {user?.role === 'admin'    && <FarmerView   user={user} />}
      </div>

      {/* Mobile Bottom Padding */}
      {isMobile && <div style={{ height: 80 }} />}
    </div>
  );
}
