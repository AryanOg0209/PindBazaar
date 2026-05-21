import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import DesktopTopNav from '../components/dashboard/DesktopTopNav';
import api from '../api/axios';

/* ─────────────────────────────────────────────
   STAGE CONFIG  (no pipeline bar — just chips)
───────────────────────────────────────────── */
const S = {
  pending:            { label: 'Seeking Baler',       color: '#92400E', bg: '#FEF3C7', border: '#F59E0B', dot: '#F59E0B',  icon: '⏳' },
  baler_assigned:     { label: 'Baling Underway',     color: '#1E40AF', bg: '#EFF6FF', border: '#3B82F6', dot: '#3B82F6',  icon: '📦' },
  baling_done:        { label: 'Baled · Seeking Buyer', color: '#6D28D9', bg: '#F5F3FF', border: '#8B5CF6', dot: '#8B5CF6', icon: '✅' },
  industry_linked:    { label: 'Buyer Confirmed',     color: '#0E7490', bg: '#ECFEFF', border: '#06B6D4', dot: '#06B6D4',  icon: '🏭' },
  transport_assigned: { label: 'Transport Booked',    color: '#065F46', bg: '#ECFDF5', border: '#10B981', dot: '#10B981',  icon: '🚚' },
  in_transit:         { label: 'In Transit',          color: '#C2410C', bg: '#FFF7ED', border: '#F97316', dot: '#F97316',  icon: '🛣️' },
  at_storage:         { label: 'At Micro-Storage',   color: '#374151', bg: '#F9FAFB', border: '#9CA3AF', dot: '#9CA3AF',  icon: '🏠' },
  delivered:          { label: 'Delivered ✓',        color: '#166534', bg: '#F0FDF4', border: '#22C55E', dot: '#22C55E',  icon: '🎉' },
  completed:          { label: 'Completed ✓',        color: '#166534', bg: '#F0FDF4', border: '#22C55E', dot: '#22C55E',  icon: '✅' },
  cancelled:          { label: 'Cancelled',           color: '#991B1B', bg: '#FEF2F2', border: '#EF4444', dot: '#EF4444',  icon: '❌' },
};

function stageMeta(stage) { return S[stage] || S.pending; }

/* ─────────────────────────────────────────────
   SHARED TINY COMPONENTS
───────────────────────────────────────────── */
function Chip({ stage }) {
  const m = stageMeta(stage);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, background: m.bg, color: m.color, fontWeight: 700, fontSize: 11, border: `1px solid ${m.border}` }}>
      <span>{m.icon}</span> {m.label}
    </span>
  );
}

function StatBox({ label, value, color = '#1B4332', sub }) {
  return (
    <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '10px 14px', minWidth: 100, flex: 1 }}>
      <div style={{ fontSize: 10, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 900, color, marginTop: 2 }}>{value || '—'}</div>
      {sub && <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function Btn({ children, onClick, color = '#1B4332', disabled, small, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: small ? '6px 12px' : '9px 18px',
      borderRadius: 8, border: 'none', fontWeight: 700,
      fontSize: small ? 12 : 13,
      background: disabled ? '#E2E8F0' : color,
      color: disabled ? '#94A3B8' : 'white',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'opacity .15s', ...style,
    }}>{children}</button>
  );
}

function BidCard({ children, accent = '#E2E8F0' }) {
  return (
    <div style={{ background: 'white', border: `1.5px solid ${accent}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   TIMELINE  (collapsible)
───────────────────────────────────────────── */
function Timeline({ events }) {
  const [open, setOpen] = useState(false);
  if (!events?.length) return null;
  const shown = open ? events : events.slice(-2);
  const fmt = iso => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' · ' +
           d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };
  const roleColor = { farmer: '#166534', baler: '#1E40AF', industry: '#6D28D9', mover: '#C2410C', admin: '#374151' };
  return (
    <div style={{ marginTop: 14, borderTop: '1px solid #F1F5F9', paddingTop: 10 }}>
      <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
        <span>📋</span> Activity log ({events.length} events) <span style={{ fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </button>
      <div style={{ marginTop: 8, paddingLeft: 4 }}>
        {shown.map((ev, i) => (
          <div key={ev.id || i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: roleColor[ev.actorRole] || '#9CA3AF', flexShrink: 0 }} />
              {i < shown.length - 1 && <div style={{ width: 1.5, flex: 1, minHeight: 16, background: '#E2E8F0', margin: '2px 0' }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{ev.note || ev.stage}</div>
              <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>
                <span style={{ color: roleColor[ev.actorRole] || '#9CA3AF', fontWeight: 700, textTransform: 'capitalize' }}>{ev.actorRole}</span>
                {' · '}{fmt(ev.createdAt)}
              </div>
            </div>
          </div>
        ))}
        {!open && events.length > 2 && (
          <button onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#6B7280', padding: 0, textDecoration: 'underline' }}>
            Show all {events.length} events
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   GPS TRACKER
───────────────────────────────────────────── */
function GPSShare({ wfId, onMsg }) {
  const [sharing, setSharing] = useState(false);
  const [lastShared, setLastShared] = useState(null);
  const intervalRef = useRef(null);

  const share = () => {
    if (!navigator.geolocation) return onMsg('GPS not available on this device');
    setSharing(true);
    const push = () => {
      navigator.geolocation.getCurrentPosition(async pos => {
        try {
          await api.put(`/workflow/${wfId}/location`, { lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLastShared(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
        } catch { /* silent */ }
      }, () => { /* silent */ });
    };
    push();
    intervalRef.current = setInterval(push, 30000); // push every 30s
  };

  const stop = () => {
    setSharing(false);
    clearInterval(intervalRef.current);
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  return (
    <div style={{ background: '#FFF7ED', border: '1.5px solid #FED7AA', borderRadius: 10, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#C2410C' }}>📍 Live Location Sharing</div>
        {sharing
          ? <div style={{ fontSize: 11, color: '#6B7280' }}>Broadcasting every 30s · Last: {lastShared || '…'}</div>
          : <div style={{ fontSize: 11, color: '#6B7280' }}>Share your GPS so farmer & industry can track the shipment</div>}
      </div>
      {sharing
        ? <Btn onClick={stop} color="#991B1B" small>⏹ Stop Sharing</Btn>
        : <Btn onClick={share} color="#C2410C" small>📡 Start Sharing</Btn>}
    </div>
  );
}

function GPSTrack({ wfId, moverName }) {
  const [loc, setLoc] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/workflow/${wfId}/location`);
      setLoc(data);
    } catch {
      setLoc(null);
    } finally {
      setLoading(false);
    }
  };

  const mapsUrl = loc ? `https://www.google.com/maps?q=${loc.lat},${loc.lng}` : null;
  const fmt = iso => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ background: '#ECFDF5', border: '1.5px solid #6EE7B7', borderRadius: 10, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#065F46' }}>🗺️ Track Vehicle{moverName ? ` — ${moverName}` : ''}</div>
          {loc
            ? <div style={{ fontSize: 11, color: '#374151' }}>Last update: {fmt(loc.updatedAt)} · {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</div>
            : <div style={{ fontSize: 11, color: '#6B7280' }}>No location yet — mover hasn't started sharing</div>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={fetch} disabled={loading} color="#065F46" small>{loading ? '…' : '🔄 Refresh'}</Btn>
          {mapsUrl && <a href={mapsUrl} target="_blank" rel="noreferrer" style={{ padding: '6px 12px', borderRadius: 8, background: '#166534', color: 'white', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>Open Maps ↗</a>}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   WORKFLOW CARD SHELL
───────────────────────────────────────────── */
function WFCard({ wf, children }) {
  const m = stageMeta(wf.stage);
  const age = (() => {
    const diff = Date.now() - new Date(wf.createdAt).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  })();

  return (
    <div style={{
      background: 'white', borderRadius: 16, marginBottom: 18,
      border: '1.5px solid #E2E8F0',
      borderLeft: `5px solid ${m.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 18px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 900, color: '#111827' }}>
            {wf.cropType} &nbsp;·&nbsp; {wf.quantityTons} tons
          </div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
            📍 {wf.location}, {wf.district} &nbsp;·&nbsp; #{wf.id.slice(0, 8)} &nbsp;·&nbsp; {age}
          </div>
        </div>
        <Chip stage={wf.stage} />
      </div>

      {/* Body */}
      <div style={{ padding: '12px 18px 16px' }}>
        {children}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   INLINE FIELD HELPER
───────────────────────────────────────────── */
function Field({ label, value, onChange, type = 'text', placeholder, min, max, half }) {
  return (
    <div style={{ flex: half ? '0 0 calc(50% - 6px)' : '1 1 100%' }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} min={min} max={max}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1.5px solid #E2E8F0', fontSize: 13, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   BID SUBMISSION FORM  (reusable)
───────────────────────────────────────────── */
function BidForm({ fields, onSubmit, submitting, onCancel, accent = '#1B4332', submitLabel = 'Submit' }) {
  const [vals, setVals] = useState({});
  const set = (k, v) => setVals(p => ({ ...p, [k]: v }));
  return (
    <div style={{ marginTop: 14, background: '#F8FAFC', borderRadius: 10, padding: 14, border: '1.5px solid #E2E8F0' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {fields.map(f => (
          <Field key={f.key} label={f.label} value={vals[f.key] || ''} onChange={v => set(f.key, v)}
            type={f.type || 'text'} placeholder={f.placeholder} min={f.min} max={f.max} half={f.half} />
        ))}
      </div>
      {fields.some(f => f.key === 'pricePerTon') && vals.pricePerTon && vals.quantityTons && (
        <div style={{ marginTop: 10, background: 'white', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 700, color: accent, border: `1px solid ${accent}22` }}>
          💰 Total: ₹{(parseFloat(vals.pricePerTon) * parseFloat(vals.quantityTons)).toLocaleString('en-IN')}
        </div>
      )}
      {fields.some(f => f.key === 'priceTotal') && vals.priceTotal && (
        <div style={{ marginTop: 10, background: 'white', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 700, color: accent, border: `1px solid ${accent}22` }}>
          💰 Transport cost: ₹{parseFloat(vals.priceTotal).toLocaleString('en-IN')}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Btn onClick={() => onSubmit(vals)} disabled={submitting} color={accent}>{submitting ? 'Submitting…' : submitLabel}</Btn>
        <Btn onClick={onCancel} color="#6B7280">Cancel</Btn>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   FARMER VIEW
═══════════════════════════════════════════ */
function FarmerView() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating]  = useState(false);
  const [form, setForm]          = useState({ cropType: 'Paddy', quantityTons: '', location: '', district: '', acresCount: '', notes: '' });
  const [msg, setMsg]            = useState('');
  const [actionLoading, setAL]   = useState('');

  const CROPS = ['Paddy', 'Wheat', 'Cotton', 'Sugarcane', 'Mustard', 'Maize', 'Barley', 'Soybean'];

  const load = useCallback(async () => {
    try { const { data } = await api.get('/workflow'); setWorkflows(data); }
    catch { setMsg('Could not load your requests'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const doCreate = async () => {
    if (!form.quantityTons || !form.location || !form.district) return setMsg('Fill all required fields');
    setCreating(true);
    try {
      await api.post('/workflow', form);
      setShowCreate(false);
      setForm({ cropType: 'Paddy', quantityTons: '', location: '', district: '', acresCount: '', notes: '' });
      setMsg('✅ Biomass request posted! Balers will start bidding shortly.');
      load();
    } catch (err) { setMsg(err.response?.data?.error || 'Failed to post'); }
    finally { setCreating(false); }
  };

  const act = async (label, fn) => {
    setAL(label);
    try { await fn(); await load(); }
    catch (err) { setMsg(err.response?.data?.error || 'Action failed'); }
    finally { setAL(''); }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="My Biomass Requests"
        sub="Post crop residue → get baler bids → sell to industry"
        action={<Btn onClick={() => setShowCreate(true)}>+ New Request</Btn>}
      />

      <MsgBanner msg={msg} onClose={() => setMsg('')} />

      {/* Create form */}
      {showCreate && (
        <div style={{ background: 'white', borderRadius: 16, padding: 22, border: '2px solid #1B4332', marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#1B4332', marginBottom: 14 }}>📋 New Biomass Request</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ flex: '0 0 calc(50% - 6px)' }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 3, textTransform: 'uppercase' }}>Crop Type *</label>
              <select value={form.cropType} onChange={e => setForm(f => ({ ...f, cropType: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1.5px solid #E2E8F0', fontSize: 13 }}>
                {CROPS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <Field label="Quantity (tons) *" type="number" value={form.quantityTons} onChange={v => setForm(f => ({ ...f, quantityTons: v }))} placeholder="e.g. 12" min="1" half />
            <Field label="Village / Location *" value={form.location} onChange={v => setForm(f => ({ ...f, location: v }))} placeholder="Village name" half />
            <Field label="District *" value={form.district} onChange={v => setForm(f => ({ ...f, district: v }))} placeholder="e.g. Ludhiana" half />
            <Field label="Land Acres" type="number" value={form.acresCount} onChange={v => setForm(f => ({ ...f, acresCount: v }))} placeholder="optional" half />
            <Field label="Notes" value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} placeholder="Any special info" half />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <Btn onClick={doCreate} disabled={creating}>{creating ? 'Posting…' : '✓ Post Request'}</Btn>
            <Btn onClick={() => setShowCreate(false)} color="#6B7280">Cancel</Btn>
          </div>
        </div>
      )}

      {workflows.length === 0 && !showCreate && (
        <EmptyState icon="🌾" title="No requests yet" sub="Post your first biomass request to receive baler bids" />
      )}

      {workflows.map(wf => (
        <WFCard key={wf.id} wf={wf}>
          {/* Key stats */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <StatBox label="Deal Value" value={wf.finalPriceRs ? `₹${wf.finalPriceRs.toLocaleString('en-IN')}` : '—'} color="#166534" />
            <StatBox label="Baler Cost" value={wf.balerPriceRs ? `₹${wf.balerPriceRs.toLocaleString('en-IN')}` : '—'} color="#1E40AF" sub={wf.baler?.name} />
            <StatBox label="Transport" value={wf.moverPriceRs ? `₹${wf.moverPriceRs.toLocaleString('en-IN')}` : '—'} color="#C2410C" sub={wf.mover?.name} />
          </div>

          {/* Stage actions */}
          {wf.stage === 'pending' && (
            wf.balerBids?.length === 0
              ? <InfoBox color="#FEF3C7" text="⏳ Waiting for balers to place bids…" />
              : <BidSection
                  title={`🔨 ${wf.balerBids.filter(b => b.status !== 'rejected').length} Baler Bid(s) — Choose the best:`}
                  titleColor="#92400E"
                  bids={wf.balerBids.filter(b => b.status !== 'rejected')}
                  renderBid={bid => (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{bid.baler?.name || 'Baler'}</div>
                        <div style={{ fontSize: 12, color: '#6B7280' }}>₹{bid.pricePerTon}/ton × {bid.quantityTons}t = <strong>₹{(bid.pricePerTon * bid.quantityTons).toLocaleString('en-IN')}</strong> · {bid.estimatedDays} days</div>
                        {bid.message && <div style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>"{bid.message}"</div>}
                      </div>
                      <Btn onClick={() => act(`bid-${bid.id}`, () => api.post(`/workflow/${wf.id}/accept-bid/${bid.id}`))}
                        disabled={actionLoading === `bid-${bid.id}`} color="#1B4332" small>
                        {actionLoading === `bid-${bid.id}` ? '…' : '✓ Accept'}
                      </Btn>
                    </div>
                  )}
                />
          )}

          {wf.stage === 'baler_assigned' && (
            <InfoBox color="#DBEAFE" text={`📦 ${wf.baler?.name} is baling your crop — ${wf.quantityTons} tons`} />
          )}

          {wf.stage === 'baling_done' && (
            wf.industryOffers?.filter(o => o.status !== 'rejected').length === 0
              ? <InfoBox color="#F5F3FF" text="⏳ Waiting for industry buyers to submit purchase offers…" />
              : <BidSection
                  title={`🏭 ${wf.industryOffers.filter(o => o.status !== 'rejected').length} Industry Offer(s) — Choose a buyer:`}
                  titleColor="#6D28D9"
                  bids={wf.industryOffers.filter(o => o.status !== 'rejected')}
                  renderBid={offer => (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{offer.industry?.name || 'Buyer'}</div>
                        <div style={{ fontSize: 12, color: '#6B7280' }}>₹{offer.pricePerTon}/ton × {offer.quantityTons}t = <strong>₹{(offer.pricePerTon * offer.quantityTons).toLocaleString('en-IN')}</strong></div>
                        {offer.message && <div style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>"{offer.message}"</div>}
                      </div>
                      <Btn onClick={() => act(`offer-${offer.id}`, () => api.post(`/workflow/${wf.id}/accept-offer/${offer.id}`))}
                        disabled={actionLoading === `offer-${offer.id}`} color="#6D28D9" small>
                        {actionLoading === `offer-${offer.id}` ? '…' : '✓ Accept Offer'}
                      </Btn>
                    </div>
                  )}
                />
          )}

          {wf.stage === 'industry_linked' && (
            <InfoBox color="#ECFEFF" text={`🏭 Buyer: ${wf.industry?.name} · Deal ₹${wf.finalPriceRs?.toLocaleString('en-IN')} · Your baler ${wf.baler?.name} is arranging transport`} />
          )}

          {wf.stage === 'transport_assigned' && (
            <InfoBox color="#ECFDF5" text={`🚚 ${wf.mover?.name} is picking up your bales → ${wf.industry?.name}`} />
          )}

          {wf.stage === 'in_transit' && (
            <div>
              <InfoBox color="#FFF7ED" text={`🛣️ In transit to ${wf.industry?.name}`} />
              <div style={{ marginTop: 8 }}><GPSTrack wfId={wf.id} moverName={wf.mover?.name} /></div>
            </div>
          )}

          {['delivered', 'completed'].includes(wf.stage) && (
            <div style={{ background: '#F0FDF4', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#166534' }}>🎉 Pipeline Complete!</div>
              <div style={{ fontSize: 13, color: '#374151', marginTop: 4 }}>
                {wf.deliveredQtyTons || wf.quantityTons} tons delivered to {wf.industry?.name}
              </div>
              {wf.finalPriceRs && wf.balerPriceRs && (
                <div style={{ fontSize: 13, color: '#166534', fontWeight: 700, marginTop: 4 }}>
                  Net revenue: ₹{(wf.finalPriceRs - wf.balerPriceRs - (wf.moverPriceRs || 0)).toLocaleString('en-IN')}
                </div>
              )}
            </div>
          )}

          {/* Cancel */}
          {!['delivered', 'completed', 'cancelled'].includes(wf.stage) && (
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <button onClick={() => { if (window.confirm('Cancel this request?')) act(`cancel-${wf.id}`, () => api.put(`/workflow/${wf.id}/cancel`)); }}
                disabled={actionLoading === `cancel-${wf.id}`}
                style={{ fontSize: 11, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Cancel Request
              </button>
            </div>
          )}

          <Timeline events={wf.events} />
        </WFCard>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   BALER VIEW
═══════════════════════════════════════════ */
function BalerView({ user }) {
  const [openJobs, setOpenJobs] = useState([]);
  const [myJobs, setMyJobs]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [forms, setForms]       = useState({});
  const [submitting, setSub]    = useState('');
  const [msg, setMsg]           = useState('');

  const load = useCallback(async () => {
    try {
      const [o, m] = await Promise.all([api.get('/workflow/open'), api.get('/workflow')]);
      setOpenJobs(o.data); setMyJobs(m.data);
    } catch { setMsg('Could not load'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submitBid = async (wfId, vals) => {
    if (!vals.pricePerTon || !vals.quantityTons) return setMsg('Price and quantity are required');
    setSub(wfId);
    try {
      await api.post(`/workflow/${wfId}/bid`, { pricePerTon: +vals.pricePerTon, quantityTons: +vals.quantityTons, estimatedDays: +(vals.estimatedDays || 3), message: vals.message || '' });
      setMsg('✅ Bid submitted!'); setForms(f => ({ ...f, [wfId]: null })); load();
    } catch (err) { setMsg(err.response?.data?.error || 'Failed to bid'); }
    finally { setSub(''); }
  };

  const bookMover = async (wfId, bidId) => {
    try {
      await api.post(`/workflow/${wfId}/accept-transport-bid/${bidId}`);
      setMsg('✅ Mover booked! They will pick up the bales.'); load();
    } catch (err) { setMsg(err.response?.data?.error || 'Failed to book mover'); }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <MsgBanner msg={msg} onClose={() => setMsg('')} />

      {/* Open requests to bid on */}
      <SectionHeader title="Open Farmer Requests" sub="Submit competitive bids to win baling contracts" />
      {openJobs.length === 0
        ? <EmptyState icon="🔍" title="No open requests" sub="New requests appear here when farmers post them" />
        : openJobs.map(wf => (
          <WFCard key={wf.id} wf={wf}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <StatBox label="Crop" value={wf.cropType} />
              <StatBox label="Quantity" value={`${wf.quantityTons}t`} sub={wf.acresCount ? `${wf.acresCount} acres` : undefined} />
              <StatBox label="Bids so far" value={wf.balerBids?.length || 0} color="#6D28D9" />
            </div>
            {wf.notes && <div style={{ fontSize: 12, color: '#6B7280', fontStyle: 'italic', marginBottom: 10 }}>"{wf.notes}"</div>}
            {forms[wf.id]
              ? <BidForm
                  accent="#1B4332"
                  submitLabel="✓ Submit Bid"
                  submitting={submitting === wf.id}
                  onCancel={() => setForms(f => ({ ...f, [wf.id]: null }))}
                  onSubmit={vals => submitBid(wf.id, vals)}
                  fields={[
                    { key: 'pricePerTon', label: 'Your Price (₹/ton) *', type: 'number', placeholder: 'e.g. 1200', min: '1', half: true },
                    { key: 'quantityTons', label: 'Quantity you can take (tons) *', type: 'number', placeholder: `max ${wf.quantityTons}`, max: wf.quantityTons, half: true },
                    { key: 'estimatedDays', label: 'Days to complete', type: 'number', placeholder: '3', min: '1', half: true },
                    { key: 'message', label: 'Message to farmer', placeholder: 'e.g. Available immediately', half: true },
                  ]}
                />
              : <Btn onClick={() => setForms(f => ({ ...f, [wf.id]: true }))}>💰 Place Bid</Btn>
            }
            <Timeline events={wf.events} />
          </WFCard>
        ))
      }

      {/* My active jobs */}
      {myJobs.length > 0 && (
        <>
          <SectionHeader title="My Active Contracts" sub="Assigned and in-progress baling jobs" />
          {myJobs.map(wf => {
            const myBid = wf.balerBids?.find(b => b.balerId === user.id);
            return (
              <WFCard key={wf.id} wf={wf}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <StatBox label="Your Earnings" value={wf.balerPriceRs ? `₹${wf.balerPriceRs.toLocaleString('en-IN')}` : myBid ? `₹${(myBid.pricePerTon * myBid.quantityTons).toLocaleString('en-IN')}` : '—'} color="#1B4332" />
                  <StatBox label="Farmer" value={wf.farmer?.name} />
                  <StatBox label="Location" value={wf.location} />
                </div>

                {/* Bid pending */}
                {wf.stage === 'pending' && myBid && (
                  <InfoBox color="#FEF3C7" text={`⏳ Your bid ₹${myBid.pricePerTon}/ton × ${myBid.quantityTons}t = ₹${(myBid.pricePerTon * myBid.quantityTons).toLocaleString('en-IN')} — waiting for farmer`} />
                )}

                {/* Assigned: mark done */}
                {wf.stage === 'baler_assigned' && wf.balerId === user.id && (
                  <div>
                    <InfoBox color="#DBEAFE" text="📦 You are the assigned baler for this request. Mark done when baling is complete." />
                    <div style={{ marginTop: 10 }}>
                      <Btn color="#1E40AF" onClick={async () => {
                        const c = window.prompt('How many bales produced?', '0');
                        if (!c) return;
                        try { await api.put(`/workflow/${wf.id}/baling-done`, { balesCount: +c }); setMsg('✅ Baling done! Industry can now submit offers.'); load(); }
                        catch (err) { setMsg(err.response?.data?.error || 'Failed'); }
                      }}>✅ Mark Baling Complete</Btn>
                    </div>
                  </div>
                )}

                {/* Industry linked: pick a mover */}
                {wf.stage === 'industry_linked' && wf.balerId === user.id && (
                  <div>
                    <InfoBox color="#ECFEFF" text={`🏭 Buyer confirmed: ${wf.industry?.name} · Deal ₹${wf.finalPriceRs?.toLocaleString('en-IN')} · Now pick a mover to deliver`} />
                    {!wf.transportBids?.length
                      ? <div style={{ marginTop: 8 }}><InfoBox color="#FEF3C7" text="⏳ Waiting for movers to bid on transport…" /></div>
                      : <div style={{ marginTop: 10 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0E7490', marginBottom: 8 }}>
                            🚚 {wf.transportBids.filter(b => b.status !== 'rejected').length} Mover Bid(s) — Pick one:
                          </div>
                          {wf.transportBids.filter(b => b.status !== 'rejected').map(bid => (
                            <BidCard key={bid.id} accent="#A5F3FC">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                <div>
                                  <div style={{ fontWeight: 700 }}>{bid.mover?.name || 'Mover'}</div>
                                  <div style={{ fontSize: 12, color: '#6B7280' }}>₹{bid.priceTotal?.toLocaleString('en-IN')} total · {bid.estimatedDays} days</div>
                                  {bid.message && <div style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>"{bid.message}"</div>}
                                </div>
                                <Btn onClick={() => bookMover(wf.id, bid.id)} color="#0E7490" small>✓ Book Mover</Btn>
                              </div>
                            </BidCard>
                          ))}
                        </div>
                    }
                  </div>
                )}

                {wf.stage === 'transport_assigned' && (
                  <InfoBox color="#ECFDF5" text={`🚚 ${wf.mover?.name} will pick up bales from ${wf.location}`} />
                )}
                {wf.stage === 'in_transit' && (
                  <div>
                    <InfoBox color="#FFF7ED" text={`🛣️ Bales in transit to ${wf.industry?.name}`} />
                    <div style={{ marginTop: 8 }}><GPSTrack wfId={wf.id} moverName={wf.mover?.name} /></div>
                  </div>
                )}
                {['delivered', 'completed'].includes(wf.stage) && (
                  <InfoBox color="#F0FDF4" text={`🎉 Delivered! Earnings: ₹${wf.balerPriceRs?.toLocaleString('en-IN')}`} />
                )}
                <Timeline events={wf.events} />
              </WFCard>
            );
          })}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   INDUSTRY VIEW
═══════════════════════════════════════════ */
function IndustryView({ user }) {
  const [available, setAvailable] = useState([]);
  const [myDeals, setMyDeals]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [forms, setForms]         = useState({});
  const [submitting, setSub]      = useState('');
  const [msg, setMsg]             = useState('');

  const load = useCallback(async () => {
    try {
      const [o, m] = await Promise.all([api.get('/workflow/open'), api.get('/workflow')]);
      setAvailable(o.data); setMyDeals(m.data);
    } catch { setMsg('Could not load'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submitOffer = async (wfId, vals) => {
    if (!vals.pricePerTon || !vals.quantityTons) return setMsg('Price and quantity required');
    setSub(wfId);
    try {
      await api.post(`/workflow/${wfId}/offer`, { pricePerTon: +vals.pricePerTon, quantityTons: +vals.quantityTons, message: vals.message || '' });
      setMsg('✅ Offer submitted! Farmer will review.'); setForms(f => ({ ...f, [wfId]: null })); load();
    } catch (err) { setMsg(err.response?.data?.error || 'Failed'); }
    finally { setSub(''); }
  };

  const confirmDelivery = async (wfId, quantityTons) => {
    const qty = window.prompt('Confirm received quantity (tons):', String(quantityTons));
    if (!qty) return;
    try {
      await api.put(`/workflow/${wfId}/delivered`, { deliveredQtyTons: parseFloat(qty) });
      setMsg('✅ Delivery confirmed! Pipeline complete.'); load();
    } catch (err) { setMsg(err.response?.data?.error || 'Failed'); }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <MsgBanner msg={msg} onClose={() => setMsg('')} />

      {/* Available biomass */}
      <SectionHeader title="Available Baled Biomass" sub="Submit purchase offers on baled and ready crop residue" />
      {available.length === 0
        ? <EmptyState icon="🔍" title="No baled biomass available" sub="Appears here once balers complete their work — check back during harvest season" />
        : available.map(wf => (
          <WFCard key={wf.id} wf={wf}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <StatBox label="Crop" value={wf.cropType} />
              <StatBox label="Quantity" value={`${wf.quantityTons}t`} sub={wf.balesCount ? `${wf.balesCount} bales` : undefined} />
              <StatBox label="Offers" value={wf.industryOffers?.length || 0} color="#6D28D9" />
            </div>
            {forms[wf.id]
              ? <BidForm
                  accent="#6D28D9"
                  submitLabel="✓ Submit Offer"
                  submitting={submitting === wf.id}
                  onCancel={() => setForms(f => ({ ...f, [wf.id]: null }))}
                  onSubmit={vals => submitOffer(wf.id, vals)}
                  fields={[
                    { key: 'pricePerTon', label: 'Your Price (₹/ton) *', type: 'number', placeholder: 'e.g. 3500', min: '1', half: true },
                    { key: 'quantityTons', label: 'Quantity you want (tons) *', type: 'number', placeholder: `max ${wf.quantityTons}`, max: wf.quantityTons, half: true },
                    { key: 'message', label: 'Message to farmer', placeholder: 'e.g. Can take delivery in 7 days', half: false },
                  ]}
                />
              : <Btn onClick={() => setForms(f => ({ ...f, [wf.id]: true }))} color="#6D28D9">💼 Make Purchase Offer</Btn>
            }
            <Timeline events={wf.events} />
          </WFCard>
        ))
      }

      {/* My deals */}
      {myDeals.length > 0 && (
        <>
          <SectionHeader title="My Procurement Deals" sub="Active and completed biomass purchases" />
          {myDeals.map(wf => {
            const myOffer = wf.industryOffers?.find(o => o.industryId === user.id);
            return (
              <WFCard key={wf.id} wf={wf}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <StatBox label="Deal Value" value={myOffer ? `₹${(myOffer.pricePerTon * myOffer.quantityTons).toLocaleString('en-IN')}` : '—'} color="#166534" />
                  <StatBox label="Quantity" value={myOffer ? `${myOffer.quantityTons}t` : '—'} />
                  <StatBox label="Status" value={myOffer?.status} color={myOffer?.status === 'accepted' ? '#166534' : myOffer?.status === 'rejected' ? '#991B1B' : '#92400E'} />
                </div>

                {wf.stage === 'industry_linked' && (
                  <InfoBox color="#ECFEFF" text="🏭 Your offer accepted! The baler is arranging transport to your facility." />
                )}

                {wf.stage === 'transport_assigned' && (
                  <InfoBox color="#ECFDF5" text={`🚚 ${wf.mover?.name} is picking up bales — delivery coming soon`} />
                )}

                {wf.stage === 'in_transit' && wf.industryId === user.id && (
                  <div>
                    <InfoBox color="#FFF7ED" text="🛣️ Bales are in transit to your facility" />
                    <div style={{ marginTop: 8 }}><GPSTrack wfId={wf.id} moverName={wf.mover?.name} /></div>
                    <div style={{ marginTop: 10 }}>
                      <Btn color="#166534" onClick={() => confirmDelivery(wf.id, wf.quantityTons)}>
                        ✅ Confirm Delivery Received
                      </Btn>
                    </div>
                  </div>
                )}

                {/* Also allow confirm if transport_assigned (early confirm) */}
                {wf.stage === 'transport_assigned' && wf.industryId === user.id && (
                  <div style={{ marginTop: 10 }}>
                    <Btn color="#166534" onClick={() => confirmDelivery(wf.id, wf.quantityTons)}>
                      ✅ Confirm Delivery Received
                    </Btn>
                  </div>
                )}

                {['delivered', 'completed'].includes(wf.stage) && (
                  <InfoBox color="#F0FDF4" text={`🎉 ${wf.deliveredQtyTons || wf.quantityTons} tons received. Deal complete!`} />
                )}

                <Timeline events={wf.events} />
              </WFCard>
            );
          })}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MOVER VIEW
═══════════════════════════════════════════ */
function MoverView({ user }) {
  const [openJobs, setOpenJobs] = useState([]);
  const [myJobs, setMyJobs]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [forms, setForms]       = useState({});
  const [submitting, setSub]    = useState('');
  const [msg, setMsg]           = useState('');

  const load = useCallback(async () => {
    try {
      const [o, m] = await Promise.all([api.get('/workflow/open'), api.get('/workflow')]);
      setOpenJobs(o.data); setMyJobs(m.data);
    } catch { setMsg('Could not load'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submitBid = async (wfId, vals) => {
    if (!vals.priceTotal) return setMsg('Total price is required');
    setSub(wfId);
    try {
      await api.post(`/workflow/${wfId}/transport-bid`, { priceTotal: +vals.priceTotal, estimatedDays: +(vals.estimatedDays || 2), message: vals.message || '' });
      setMsg('✅ Bid submitted! Baler will review.'); setForms(f => ({ ...f, [wfId]: null })); load();
    } catch (err) { setMsg(err.response?.data?.error || 'Failed'); }
    finally { setSub(''); }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <MsgBanner msg={msg} onClose={() => setMsg('')} />

      <SectionHeader title="Open Transport Jobs" sub="Bid on biomass transport — baler reviews and books the best mover" />
      {openJobs.length === 0
        ? <EmptyState icon="🔍" title="No transport jobs right now" sub="Jobs appear here after a buyer is confirmed for baled biomass" />
        : openJobs.map(wf => (
          <WFCard key={wf.id} wf={wf}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <StatBox label="Cargo" value={`${wf.cropType}`} />
              <StatBox label="Quantity" value={`${wf.quantityTons}t`} />
              <StatBox label="From" value={wf.location} />
              <StatBox label="Deliver to" value={wf.industry?.name || '—'} />
            </div>
            {forms[wf.id]
              ? <BidForm
                  accent="#0E7490"
                  submitLabel="✓ Submit Transport Bid"
                  submitting={submitting === wf.id}
                  onCancel={() => setForms(f => ({ ...f, [wf.id]: null }))}
                  onSubmit={vals => submitBid(wf.id, vals)}
                  fields={[
                    { key: 'priceTotal', label: 'Total Transport Price (₹) *', type: 'number', placeholder: 'e.g. 8000', min: '1', half: true },
                    { key: 'estimatedDays', label: 'Days to deliver', type: 'number', placeholder: '2', min: '1', half: true },
                    { key: 'message', label: 'Message', placeholder: 'e.g. Have 2 trucks available', half: false },
                  ]}
                />
              : <Btn onClick={() => setForms(f => ({ ...f, [wf.id]: true }))} color="#0E7490">🚚 Submit Transport Bid</Btn>
            }
            <Timeline events={wf.events} />
          </WFCard>
        ))
      }

      {myJobs.length > 0 && (
        <>
          <SectionHeader title="My Transport Jobs" sub="Assigned and in-progress delivery routes" />
          {myJobs.map(wf => {
            const myBid = wf.transportBids?.find(b => b.moverId === user.id);
            return (
              <WFCard key={wf.id} wf={wf}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <StatBox label="Your Earnings" value={wf.moverPriceRs ? `₹${wf.moverPriceRs.toLocaleString('en-IN')}` : myBid ? `₹${myBid.priceTotal?.toLocaleString('en-IN')}` : '—'} color="#0E7490" />
                  <StatBox label="From" value={wf.location} />
                  <StatBox label="Deliver to" value={wf.industry?.name || '—'} />
                </div>

                {wf.stage === 'industry_linked' && myBid?.status === 'pending' && (
                  <InfoBox color="#FEF3C7" text="⏳ Your bid is waiting for baler approval" />
                )}
                {myBid?.status === 'rejected' && (
                  <InfoBox color="#FEF2F2" text="❌ Your bid was not selected for this job" />
                )}

                {wf.stage === 'transport_assigned' && wf.moverId === user.id && (
                  <div>
                    <InfoBox color="#ECFDF5" text={`📍 Pickup: ${wf.location}, ${wf.district} → 🏭 ${wf.industry?.name}`} />
                    <div style={{ marginTop: 10 }}>
                      <Btn color="#065F46" onClick={async () => {
                        try { await api.put(`/workflow/${wf.id}/pickup-done`); setMsg('✅ Pickup confirmed! Bales in transit.'); load(); }
                        catch (err) { setMsg(err.response?.data?.error || 'Failed'); }
                      }}>🚚 Confirm Pickup Done</Btn>
                    </div>
                  </div>
                )}

                {wf.stage === 'in_transit' && wf.moverId === user.id && (
                  <div>
                    <InfoBox color="#FFF7ED" text={`🛣️ En route to ${wf.industry?.name}`} />
                    <div style={{ marginTop: 8 }}><GPSShare wfId={wf.id} onMsg={setMsg} /></div>
                    <div style={{ marginTop: 10 }}>
                      <Btn color="#166534" onClick={async () => {
                        const qty = window.prompt('Delivered quantity (tons):', String(wf.quantityTons));
                        if (!qty) return;
                        try { await api.put(`/workflow/${wf.id}/delivered`, { deliveredQtyTons: +qty }); setMsg('✅ Delivery confirmed! Job done.'); load(); }
                        catch (err) { setMsg(err.response?.data?.error || 'Failed'); }
                      }}>✅ Confirm Delivery</Btn>
                    </div>
                  </div>
                )}

                {['delivered', 'completed'].includes(wf.stage) && (
                  <InfoBox color="#F0FDF4" text={`🎉 Delivered ${wf.deliveredQtyTons || wf.quantityTons}t. Earnings: ₹${wf.moverPriceRs?.toLocaleString('en-IN')}`} />
                )}

                <Timeline events={wf.events} />
              </WFCard>
            );
          })}
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MICRO UTILITIES
───────────────────────────────────────────── */
function Spinner() {
  return <div style={{ textAlign: 'center', padding: 60, color: '#6B7280', fontSize: 14 }}>Loading…</div>;
}
function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: 48, textAlign: 'center', marginBottom: 20, border: '1.5px solid #E2E8F0' }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontWeight: 700, color: '#374151', fontSize: 15 }}>{title}</div>
      <div style={{ color: '#6B7280', fontSize: 13, marginTop: 4 }}>{sub}</div>
    </div>
  );
}
function InfoBox({ color, text }) {
  return <div style={{ background: color, borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#374151', fontWeight: 500 }}>{text}</div>;
}
function MsgBanner({ msg, onClose }) {
  if (!msg) return null;
  const ok = msg.startsWith('✅');
  return (
    <div style={{ background: ok ? '#DCFCE7' : '#FEE2E2', color: ok ? '#166534' : '#991B1B', padding: '10px 16px', borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      {msg}
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 16 }}>✕</button>
    </div>
  );
}
function PageHeader({ title, sub, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#111827' }}>{title}</div>
        <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{sub}</div>
      </div>
      {action}
    </div>
  );
}
function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginTop: 28, marginBottom: 14 }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: '#111827' }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
function BidSection({ title, titleColor, bids, renderBid }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: titleColor, marginBottom: 8 }}>{title}</div>
      {bids.map((bid, i) => <BidCard key={bid.id || i}>{renderBid(bid)}</BidCard>)}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
export default function WorkflowPage() {
  const { user } = useAuth();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const ROLE_META = {
    farmer:   { title: '🌾 Biomass Pipeline',       sub: 'Post requests · Accept bids · Track delivery' },
    baler:    { title: '📦 Baling Jobs',             sub: 'Bid on requests · Mark done · Book transport' },
    industry: { title: '🏭 Biomass Procurement',    sub: 'Browse available biomass · Submit offers · Confirm delivery' },
    mover:    { title: '🚚 Transport Jobs',          sub: 'Bid on routes · Confirm pickup · Share live location' },
    admin:    { title: '⚙️ All Workflows',           sub: 'Full pipeline visibility' },
  };
  const meta = ROLE_META[user?.role] || ROLE_META.farmer;

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      {!isMobile && <DesktopTopNav user={user} />}

      {/* Hero banner */}
      <div style={{ background: 'linear-gradient(135deg, #14532D 0%, #166534 60%, #15803D 100%)', color: 'white', padding: isMobile ? '24px 16px 20px' : '32px 48px 28px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 900, letterSpacing: '-0.5px' }}>{meta.title}</div>
          <div style={{ fontSize: 13, opacity: 0.75, marginTop: 5 }}>{meta.sub}</div>

          {/* Stage legend */}
          <div style={{ display: 'flex', gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
            {['pending','baling_done','industry_linked','in_transit','delivered'].map(st => {
              const m = S[st];
              return (
                <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: '4px 10px' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: m.dot }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '16px 12px' : '28px 24px' }}>
        {user?.role === 'farmer'   && <FarmerView   user={user} />}
        {user?.role === 'baler'    && <BalerView    user={user} />}
        {user?.role === 'industry' && <IndustryView user={user} />}
        {user?.role === 'mover'    && <MoverView    user={user} />}
        {user?.role === 'admin'    && <FarmerView   user={user} />}
      </div>

      {isMobile && <div style={{ height: 80 }} />}
    </div>
  );
}
