import { useState, useEffect, useCallback } from 'react';
import { fetchListings, createListing } from '../services/marketApi';
import { createOrder } from '../services/orderApi';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import DesktopTopNav from '../components/dashboard/DesktopTopNav';
import Loader from '../components/dashboard/Loader';
import api from '../api/axios';

const WORK_TYPES = ['demand', 'supply', 'job'];
const CROP_TYPES = ['Wheat', 'Paddy', 'Sugarcane', 'Cotton', 'Mustard', 'Soybean', 'Maize', 'Barley'];
const TYPE_META = {
  demand: { bg: '#FEF3C7', color: '#92400E', emoji: '🔥', label: 'Demand' },
  supply: { bg: '#DCFCE7', color: '#166534', emoji: '🌾', label: 'Supply' },
  job:    { bg: '#E0E7FF', color: '#3730A3', emoji: '🚛', label: 'Job' },
};

export default function MarketPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [listings, setListings]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [search, setSearch]             = useState('');
  const [filters, setFilters]           = useState({ type: '', cropType: '', minPrice: '', maxPrice: '' });
  const [sort, setSort]                 = useState('newest');
  const [showModal, setShowModal]       = useState(false);
  const [acceptModal, setAcceptModal]   = useState(null); // { listing }
  const [accepting, setAccepting]       = useState(false);
  const [agreedPrice, setAgreedPrice]   = useState('');
  const [creating, setCreating]         = useState(false);
  const [aiPrompt, setAiPrompt]         = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGenError, setAiGenError]     = useState('');
  const [negoAdvice, setNegoAdvice]     = useState(null);
  const [negoLoading, setNegoLoading]   = useState(false);

  // Crop photo scanner
  const [aiTab, setAiTab]               = useState('text'); // 'text' | 'photo'
  const [cropPhoto, setCropPhoto]       = useState(null);
  const [photoAnalyzing, setPhotoAnalyzing] = useState(false);
  const [photoResult, setPhotoResult]   = useState(null);
  const [photoError, setPhotoError]     = useState('');

  const [formData, setFormData] = useState({
    type: 'demand', title: '', description: '', cropType: '', quantity: '', price: '', location: ''
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Build active filters (skip empty values)
      const activeFilters = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '')
      );
      const data = await fetchListings(activeFilters);
      setListings(data);
    } catch (e) {
      setError('Failed to load marketplace listings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Client-side search + sort ──
  const displayedListings = listings
    .filter(l => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        l.title?.toLowerCase().includes(q) ||
        l.location?.toLowerCase().includes(q) ||
        l.cropType?.toLowerCase().includes(q) ||
        l.user?.name?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sort === 'price_asc')  return (a.price || 0) - (b.price || 0);
      if (sort === 'price_desc') return (b.price || 0) - (a.price || 0);
      return new Date(b.createdAt) - new Date(a.createdAt); // newest
    });

  // ── Create Listing ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createListing(formData);
      setShowModal(false);
      setFormData({ type: 'demand', title: '', description: '', cropType: '', quantity: '', price: '', location: '' });
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create listing');
    } finally { setCreating(false); }
  };

  // ── Accept Job ──
  const handleAcceptJob = async () => {
    if (!acceptModal) return;
    if (!agreedPrice || isNaN(agreedPrice) || Number(agreedPrice) <= 0) {
      alert('Please enter a valid agreed price');
      return;
    }
    setAccepting(true);
    try {
      await createOrder({ listingId: acceptModal.id, agreedPrice: Number(agreedPrice) });
      setAcceptModal(null);
      setAgreedPrice('');
      navigate('/orders');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to accept job');
    } finally { setAccepting(false); }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true); setAiGenError('');
    try {
      const res = await api.post('/ai/generate-listing', {
        description: aiPrompt,
        role: user?.role,
        district: user?.district,
      });
      const d = res.data;
      setFormData(f => ({
        ...f,
        type: d.type || f.type,
        title: d.title || f.title,
        description: d.description || f.description,
        cropType: d.cropType || f.cropType,
        quantity: d.quantity ? String(d.quantity) : f.quantity,
        price: d.price ? String(d.price) : f.price,
        location: d.location || f.location,
      }));
      setAiGenError(d.priceReasoning ? `💡 ${d.priceReasoning}` : '');
    } catch (e) {
      setAiGenError(e.response?.data?.error || 'AI generation failed.');
    } finally { setAiGenerating(false); }
  };

  const handlePhotoScan = async (file) => {
    if (!file) return;
    setCropPhoto(file);
    setPhotoAnalyzing(true); setPhotoError(''); setPhotoResult(null);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = e.target.result.split(',')[1];
          const res = await api.post('/ai/analyze-crop-photo', {
            imageBase64: base64,
            mediaType: file.type || 'image/jpeg',
            userRole: user?.role,
            district: user?.district,
          });
          const d = res.data;
          setPhotoResult(d);
          // Auto-fill form from photo result
          if (d.confidence > 30) {
            setFormData(f => ({
              ...f,
              type: d.listingType || 'supply',
              title: d.title || f.title,
              description: d.description || f.description,
              cropType: d.cropType || f.cropType,
              quantity: d.quantity ? String(d.quantity) : f.quantity,
              price: d.suggestedPricePerQuintal ? String(d.suggestedPricePerQuintal) : f.price,
            }));
          }
        } catch (err) {
          setPhotoError(err.response?.data?.error || 'Photo analysis failed. Fill details manually.');
        } finally { setPhotoAnalyzing(false); }
      };
      reader.onerror = () => { setPhotoError('Could not read file.'); setPhotoAnalyzing(false); };
      reader.readAsDataURL(file);
    } catch { setPhotoAnalyzing(false); }
  };

  const openAccept = (listing) => {
    setAgreedPrice(listing.price ? String(listing.price) : '');
    setAcceptModal(listing);
    setNegoAdvice(null);
    setNegoLoading(true);
    api.post('/ai/negotiation-advice', {
      listingTitle: listing.title,
      listingPrice: listing.price,
      cropType: listing.cropType,
      location: listing.location,
      listingType: listing.type,
      userRole: user?.role,
    }).then(r => setNegoAdvice(r.data)).catch(() => {}).finally(() => setNegoLoading(false));
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#F0F4F8' }}>
      <DesktopTopNav user={user} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', gap: 24 }}>

          {/* ── SIDEBAR FILTERS ── */}
          <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,.06)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 16px', color: '#0F172A' }}>🔍 Filter Listings</h3>

              <FilterGroup label="Type of Work">
                <select value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))} style={SEL_STYLE}>
                  <option value="">All Types</option>
                  {WORK_TYPES.map(t => <option key={t} value={t}>{TYPE_META[t].emoji} {TYPE_META[t].label}</option>)}
                </select>
              </FilterGroup>

              <FilterGroup label="Crop / Material">
                <select value={filters.cropType} onChange={e => setFilters(f => ({ ...f, cropType: e.target.value }))} style={SEL_STYLE}>
                  <option value="">All Crops</option>
                  {CROP_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </FilterGroup>

              <FilterGroup label={`Min Price: ${filters.minPrice ? '₹' + filters.minPrice : 'Any'}`}>
                <input type="range" min="0" max="10000" step="500" value={filters.minPrice || 0}
                  onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value === '0' ? '' : e.target.value }))}
                  style={{ width: '100%', accentColor: '#1B4332' }} />
              </FilterGroup>

              <FilterGroup label={`Max Price: ${filters.maxPrice ? '₹' + filters.maxPrice : 'Any'}`}>
                <input type="range" min="1000" max="50000" step="500" value={filters.maxPrice || 50000}
                  onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value === '50000' ? '' : e.target.value }))}
                  style={{ width: '100%', accentColor: '#1B4332' }} />
              </FilterGroup>

              <button onClick={() => setFilters({ type: '', cropType: '', minPrice: '', maxPrice: '' })}
                style={{ width: '100%', marginTop: 8, padding: '10px', background: '#F1F5F9', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', color: '#475569', fontSize: 13 }}>
                Reset Filters
              </button>
            </div>

            {/* Stats Box */}
            <div style={{ background: '#1B4332', borderRadius: 16, padding: 20, color: 'white' }}>
              <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7, marginBottom: 12 }}>MARKET STATS</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{listings.length}</div>
              <div style={{ fontSize: 13, opacity: 0.8 }}>Active Listings</div>
              <div style={{ marginTop: 12, fontSize: 13, opacity: 0.7 }}>
                🔥 {listings.filter(l => l.type === 'demand').length} Demands<br />
                🌾 {listings.filter(l => l.type === 'supply').length} Supplies<br />
                🚛 {listings.filter(l => l.type === 'job').length} Jobs
              </div>
            </div>
          </div>

          {/* ── MAIN CONTENT ── */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Top Bar */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                <input
                  placeholder="Search listings, crops, locations..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px 12px 44px', borderRadius: 10, border: '1px solid #E2E8F0', background: 'white', fontSize: 14, boxSizing: 'border-box', boxShadow: '0 2px 4px rgba(0,0,0,.04)' }}
                />
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18 }}>🔍</span>
              </div>
              <select value={sort} onChange={e => setSort(e.target.value)} style={{ ...SEL_STYLE, width: 160 }}>
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
              </select>
              <button onClick={() => setShowModal(true)}
                style={{ padding: '12px 24px', background: '#1B4332', color: 'white', border: 'none', borderRadius: 10, fontWeight: 800, cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(27,67,50,.2)' }}>
                + Create Listing
              </button>
            </div>

            {/* Results */}
            {loading ? <Loader /> : error ? (
              <div style={{ padding: 32, textAlign: 'center', background: '#FEF2F2', borderRadius: 12, color: '#B91C1C', fontWeight: 600 }}>{error}</div>
            ) : displayedListings.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', background: 'white', borderRadius: 16, color: '#64748B' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No listings found</div>
                <div style={{ fontSize: 13 }}>Try adjusting your filters or create the first listing!</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {displayedListings.map(l => {
                  const meta = TYPE_META[l.type] || TYPE_META.job;
                  const isOwner = l.userId === user?.id;
                  return (
                    <div key={l.id} style={{ background: 'white', borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,.06)', border: '1px solid #E2E8F0', overflow: 'hidden', transition: 'transform .15s, box-shadow .15s' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.06)'; }}>

                      {/* Card Header */}
                      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 20, background: meta.bg, color: meta.color, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                          {meta.emoji} {meta.label}
                        </span>
                        {isOwner && <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', background: '#F8FAFC', padding: '4px 8px', borderRadius: 6 }}>Your Listing</span>}
                      </div>

                      {/* Card Body */}
                      <div style={{ padding: '16px 20px' }}>
                        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>{l.title}</h3>
                        {l.description && <p style={{ margin: '0 0 10px', fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>{l.description}</p>}

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                          <InfoBadge icon="📍" text={l.location} />
                          {l.cropType && <InfoBadge icon="🌿" text={l.cropType} />}
                          {l.quantity && <InfoBadge icon="⚖️" text={`${l.quantity} tons`} />}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                          <div style={{ fontSize: 13, color: '#475569' }}>
                            👤 <strong>{l.user?.name || 'Unknown'}</strong>
                            <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 6 }}>({l.user?.role})</span>
                          </div>
                          {l.price && <div style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>₹{Number(l.price).toLocaleString()}</div>}
                        </div>

                        {/* Action Button */}
                        {isOwner ? (
                          <button style={{ width: '100%', padding: '10px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 8, fontWeight: 700, color: '#64748B', cursor: 'default', fontSize: 13 }}>
                            ✓ Your Listing
                          </button>
                        ) : (
                          <button onClick={() => openAccept(l)}
                            style={{ width: '100%', padding: '11px', background: '#1B4332', border: 'none', borderRadius: 8, fontWeight: 800, color: 'white', cursor: 'pointer', fontSize: 13, transition: 'background .15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#166534'}
                            onMouseLeave={e => e.currentTarget.style.background = '#1B4332'}>
                            ✅ Accept Job / Contact
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CREATE LISTING MODAL ── */}
      {showModal && (
        <Modal title="📋 Create New Listing" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* AI Generator — tab switcher */}
            <div style={{ background: 'linear-gradient(135deg,#EEF2FF,#E0E7FF)', borderRadius: 12, padding: 16, border: '1px solid #C7D2FE' }}>
              {/* Tab toggle */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 12, background: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: 3, width: 'fit-content' }}>
                <button type="button" onClick={() => setAiTab('text')}
                  style={{ padding: '5px 14px', borderRadius: 6, border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', background: aiTab === 'text' ? '#3730A3' : 'transparent', color: aiTab === 'text' ? 'white' : '#4338CA' }}>
                  ✦ Describe
                </button>
                <button type="button" onClick={() => setAiTab('photo')}
                  style={{ padding: '5px 14px', borderRadius: 6, border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', background: aiTab === 'photo' ? '#3730A3' : 'transparent', color: aiTab === 'photo' ? 'white' : '#4338CA' }}>
                  📸 Crop Photo
                </button>
              </div>

              {aiTab === 'text' ? (
                <>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#3730A3', marginBottom: 6 }}>Describe your crop or service</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      placeholder='e.g. "Want to sell 50 quintals of wheat from Ludhiana"'
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAIGenerate())}
                      style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #C7D2FE', fontSize: 13, fontFamily: 'inherit', background: 'white' }}
                    />
                    <button type="button" onClick={handleAIGenerate} disabled={aiGenerating || !aiPrompt.trim()}
                      style={{ padding: '9px 16px', background: '#3730A3', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>
                      {aiGenerating ? '...' : '✦ Fill'}
                    </button>
                  </div>
                  {aiGenError && <div style={{ marginTop: 8, fontSize: 12, color: aiGenError.startsWith('💡') ? '#1e40af' : '#DC2626', fontWeight: 600 }}>{aiGenError}</div>}
                </>
              ) : (
                <>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#3730A3', marginBottom: 6 }}>Upload a photo of your crop — AI fills the listing</div>
                  <label style={{ display: 'block', cursor: 'pointer' }}>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && handlePhotoScan(e.target.files[0])} />
                    <div style={{ border: '2px dashed #C7D2FE', borderRadius: 8, padding: '14px', textAlign: 'center', background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      {cropPhoto ? (
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#3730A3' }}>📷 {cropPhoto.name}</span>
                      ) : (
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#6366F1' }}>📸 Tap to select crop photo</span>
                      )}
                    </div>
                  </label>

                  {photoAnalyzing && (
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#4338CA', fontWeight: 600 }}>
                      <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Claude is analyzing your crop photo…
                    </div>
                  )}

                  {photoError && <div style={{ marginTop: 8, fontSize: 12, color: '#DC2626', fontWeight: 600 }}>{photoError}</div>}

                  {photoResult && !photoAnalyzing && (
                    <div style={{ marginTop: 10, background: 'white', borderRadius: 10, padding: '10px 14px', border: '1px solid #C7D2FE' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
                          {photoResult.cropType} · Grade {photoResult.qualityGrade}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 10,
                          background: photoResult.confidence > 70 ? '#DCFCE7' : '#FEF3C7',
                          color: photoResult.confidence > 70 ? '#166534' : '#92400E' }}>
                          {photoResult.confidence}% confidence
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: '#475569', marginBottom: 6 }}>{photoResult.qualityNotes}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>Suggested: ₹{photoResult.suggestedPricePerQuintal}/quintal</div>
                      {photoResult.sellingTips?.length > 0 && (
                        <div style={{ marginTop: 6, fontSize: 11, color: '#1E40AF', fontWeight: 600 }}>
                          💡 {photoResult.sellingTips[0]}
                        </div>
                      )}
                      <div style={{ marginTop: 8, fontSize: 11, color: '#16A34A', fontWeight: 700 }}>✅ Form auto-filled from photo analysis</div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={LABEL_STYLE}>Type of Listing</label>
                <select value={formData.type} onChange={e => setFormData(f => ({ ...f, type: e.target.value }))} style={{ ...SEL_STYLE, width: '100%' }}>
                  <option value="demand">🔥 Demand — Request Work or Material</option>
                  <option value="supply">🌾 Supply — Offer Material or Crop</option>
                  <option value="job">🚛 Job — Offer a Service</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={LABEL_STYLE}>Listing Title *</label>
                <input required placeholder="e.g. Need Baling Service — 20 Acres" value={formData.title} onChange={e => setFormData(f => ({ ...f, title: e.target.value }))} style={INPUT_STYLE} />
              </div>
              <div>
                <label style={LABEL_STYLE}>Crop / Material Type</label>
                <select value={formData.cropType} onChange={e => setFormData(f => ({ ...f, cropType: e.target.value }))} style={{ ...SEL_STYLE, width: '100%' }}>
                  <option value="">Select crop...</option>
                  {CROP_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={LABEL_STYLE}>Quantity (tons/acres)</label>
                <input type="number" placeholder="e.g. 15" value={formData.quantity} onChange={e => setFormData(f => ({ ...f, quantity: e.target.value }))} style={INPUT_STYLE} />
              </div>
              <div>
                <label style={LABEL_STYLE}>Location *</label>
                <input required placeholder="Village, District" value={formData.location} onChange={e => setFormData(f => ({ ...f, location: e.target.value }))} style={INPUT_STYLE} />
              </div>
              <div>
                <label style={LABEL_STYLE}>Price (₹)</label>
                <input type="number" placeholder="e.g. 5000" value={formData.price} onChange={e => setFormData(f => ({ ...f, price: e.target.value }))} style={INPUT_STYLE} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={LABEL_STYLE}>Description</label>
                <textarea placeholder="Additional details, requirements, or notes..." value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                  rows={3} style={{ ...INPUT_STYLE, resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: 12, border: '1px solid #E2E8F0', background: 'white', borderRadius: 8, fontWeight: 700, cursor: 'pointer', color: '#475569' }}>Cancel</button>
              <button type="submit" disabled={creating} style={{ flex: 1, padding: 12, border: 'none', background: '#1B4332', color: 'white', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>
                {creating ? 'Publishing...' : '🚀 Publish Listing'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── ACCEPT JOB MODAL ── */}
      {acceptModal && (
        <Modal title="✅ Accept This Job" onClose={() => { setAcceptModal(null); setAgreedPrice(''); }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#F0FDF4', borderRadius: 12, padding: 16, border: '1px solid #BBF7D0' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>{acceptModal.title}</div>
              <div style={{ fontSize: 13, color: '#475569' }}>📍 {acceptModal.location}</div>
              <div style={{ fontSize: 13, color: '#475569' }}>👤 {acceptModal.user?.name} ({acceptModal.user?.role})</div>
              {acceptModal.price && <div style={{ fontSize: 18, fontWeight: 800, color: '#059669', marginTop: 8 }}>Listed Price: ₹{Number(acceptModal.price).toLocaleString()}</div>}
            </div>

            {/* AI Negotiation Advice */}
            {negoLoading && (
              <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '12px 16px', border: '1px solid #E2E8F0', fontSize: 13, color: '#64748B', display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Claude is analyzing this deal…
              </div>
            )}
            {negoAdvice && !negoLoading && (
              <div style={{
                borderRadius: 12, padding: 16, border: '1.5px solid',
                background: negoAdvice.verdict === 'accept' ? '#F0FDF4' : negoAdvice.verdict === 'counter' ? '#FFFBEB' : '#FEF2F2',
                borderColor: negoAdvice.verdict === 'accept' ? '#BBF7D0' : negoAdvice.verdict === 'counter' ? '#FDE68A' : '#FECACA',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 18 }}>{negoAdvice.verdict === 'accept' ? '✅' : negoAdvice.verdict === 'counter' ? '🤝' : '⚠️'}</span>
                    <span style={{ fontWeight: 800, fontSize: 14, color: negoAdvice.verdict === 'accept' ? '#166534' : negoAdvice.verdict === 'counter' ? '#92400E' : '#991B1B' }}>
                      {negoAdvice.verdict === 'accept' ? 'Good Deal — Accept' : negoAdvice.verdict === 'counter' ? 'Counter-Offer Advised' : 'Think Before Accepting'}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8' }}>{negoAdvice.confidence}% confidence</span>
                </div>
                <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>Fair Price</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>₹{Number(negoAdvice.fairPrice || 0).toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>Market Range</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>₹{Number(negoAdvice.marketMin || 0).toLocaleString()} – ₹{Number(negoAdvice.marketMax || 0).toLocaleString()}</div>
                  </div>
                  {negoAdvice.counterOffer && negoAdvice.verdict === 'counter' && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>Suggest</div>
                      <button onClick={() => setAgreedPrice(String(negoAdvice.counterOffer))}
                        style={{ fontSize: 14, fontWeight: 800, color: '#D97706', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 6, padding: '2px 10px', cursor: 'pointer' }}>
                        ₹{Number(negoAdvice.counterOffer).toLocaleString()} ↑
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, marginBottom: 6 }}>{negoAdvice.reasoning}</div>
                {negoAdvice.tip && <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', fontStyle: 'italic' }}>💡 {negoAdvice.tip}</div>}
              </div>
            )}
            <div>
              <label style={{ ...LABEL_STYLE, display: 'block', marginBottom: 6 }}>Your Agreed Price (₹) *</label>
              <input type="number" placeholder="Enter the price you agree to work for"
                value={agreedPrice} onChange={e => setAgreedPrice(e.target.value)}
                style={{ ...INPUT_STYLE, fontSize: 18, fontWeight: 700, color: '#059669' }} autoFocus />
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>💡 This can match the listed price or be negotiated. The client will be notified.</div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => { setAcceptModal(null); setAgreedPrice(''); }} style={{ flex: 1, padding: 12, border: '1px solid #E2E8F0', background: 'white', borderRadius: 8, fontWeight: 700, cursor: 'pointer', color: '#475569' }}>Cancel</button>
              <button onClick={handleAcceptJob} disabled={accepting}
                style={{ flex: 2, padding: 12, border: 'none', background: '#059669', color: 'white', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}>
                {accepting ? 'Accepting...' : '✅ Confirm & Accept Job'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Small helpers ──
function FilterGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>{label}</label>
      {children}
    </div>
  );
}

function InfoBadge({ icon, text }) {
  return (
    <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, padding: '3px 8px' }}>
      {icon} {text}
    </span>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #F1F5F9' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94A3B8', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

const SEL_STYLE = { padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, background: 'white' };
const INPUT_STYLE = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' };
const LABEL_STYLE = { fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.3px' };
