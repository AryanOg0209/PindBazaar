import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DesktopTopNav from '../components/dashboard/DesktopTopNav';
import Loader from '../components/dashboard/Loader';
import api from '../api/axios';
import { getCropPrediction, getJobMatches } from '../services/aiApi';

const CROPS = ['Wheat','Paddy','Sugarcane','Cotton','Mustard','Maize','Barley','Soybean'];
const ROLE_FIELDS = {
  farmer:   ['fullName','village','district','state','pincode','landAcres'],
  baler:    ['fullName','village','district','state','pincode','machineType','machineCount','pricePerBale'],
  mover:    ['fullName','village','district','state','pincode','vehicleType','vehicleCount','licenseNo'],
  industry: ['companyName','contactPerson','village','district','state','pincode','industryType','gstNumber'],
};
const FIELD_LABELS = {
  fullName:'Full Name', companyName:'Company Name', contactPerson:'Contact Person',
  village:'Village', district:'District', state:'State', pincode:'Pincode',
  landAcres:'Land (Acres)', machineType:'Machine Type', machineCount:'Machine Count',
  pricePerBale:'Price Per Bale (₹)', vehicleType:'Vehicle Type', vehicleCount:'Vehicle Count',
  licenseNo:'License Number', industryType:'Industry Type', gstNumber:'GST Number',
};

export default function ProfilesPage() {
  const { user } = useAuth();
  const [loading, setLoading]         = useState(true);
  const [profile, setProfile]         = useState(null);
  const [documents, setDocuments]     = useState([]);
  const [form, setForm]               = useState({});
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [activeTab, setActiveTab]     = useState('profile');
  const [reviews, setReviews]         = useState([]);
  // AI: Crop prediction
  const [selCrop, setSelCrop]         = useState('Wheat');
  const [predLoading, setPredLoading] = useState(false);
  const [prediction, setPrediction]   = useState(null);
  const [predError, setPredError]     = useState('');
  // AI: Job matches
  const [matches, setMatches]         = useState([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError]   = useState('');
  const [matchNote, setMatchNote]     = useState('');

  useEffect(() => {
    api.get('/user/profile').then(res => {
      setProfile(res.data.profile);
      setDocuments(res.data.documents || []);
      setForm(res.data.profile || {});
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/user/profile', form);
      setProfile(res.data.profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { alert('Failed to save profile'); }
    finally { setSaving(false); }
  };

  const handleCropPredict = async () => {
    setPredLoading(true);
    setPrediction(null);
    setPredError('');
    try {
      const data = await getCropPrediction(selCrop, form.district, 'current Kharif 2024');
      setPrediction(data);
      if (data.source === 'fallback') setPredError(data.note || 'Showing estimated market data (AI temporarily busy).');
    } catch (e) {
      setPredError(e.response?.data?.error || 'Prediction failed. Please try again.');
    } finally { setPredLoading(false); }
  };

  const handleJobMatch = async () => {
    setMatchLoading(true);
    setMatches([]);
    setMatchError('');
    setMatchNote('');
    try {
      const data = await getJobMatches();
      setMatches(data.matches || []);
      if (data.note) setMatchNote(data.note);
      if (!data.matches?.length) setMatchError('No compatible listings found for your profile right now.');
    } catch (e) {
      setMatchError(e.response?.data?.error || 'Job matching failed. Please try again.');
    } finally { setMatchLoading(false); }
  };

  const fields = ROLE_FIELDS[user?.role] || [];

  const trustScore = Math.min(100, 60 + (documents.length * 10));

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#F0F4F8' }}>
      <DesktopTopNav user={user} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg,#1B4332,#2D6A4F)', borderRadius: 20, padding: '28px 32px', marginBottom: 24, color: 'white', display: 'flex', gap: 24, alignItems: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, border: '3px solid rgba(255,255,255,0.4)' }}>
              {user?.name ? user.name[0].toUpperCase() : '?'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{user?.name || 'Complete Your Profile'}</div>
              <div style={{ fontSize: 14, opacity: 0.8, textTransform: 'capitalize' }}>{user?.role} • {user?.phone}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 20, background: user?.status === 'approved' ? 'rgba(74,222,128,0.3)' : 'rgba(251,191,36,0.3)', color: user?.status === 'approved' ? '#4ade80' : '#fbbf24', border: user?.status === 'approved' ? '1px solid rgba(74,222,128,0.5)' : '1px solid rgba(251,191,36,0.5)' }}>
                  {user?.status === 'approved' ? '✓ Verified' : '⏳ Pending Verification'}
                </span>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 800 }}>{trustScore}%</div>
              <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 700 }}>Trust Score</div>
              <div style={{ width: 80, height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 3, marginTop: 6, overflow: 'hidden' }}>
                <div style={{ width: `${trustScore}%`, height: '100%', background: '#4ade80', borderRadius: 3 }} />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'white', padding: 4, borderRadius: 12, marginBottom: 20, width: 'fit-content', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
            {[['profile','👤 Profile'],['ai','🤖 AI Tools'],['docs','📄 Documents'],['reviews','⭐ Reviews']].map(([v,l]) => (
              <button key={v} onClick={() => setActiveTab(v)}
                style={{ padding: '8px 18px', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', background: activeTab===v ? '#1B4332' : 'transparent', color: activeTab===v ? 'white' : '#64748B' }}>
                {l}
              </button>
            ))}
          </div>

          {loading ? <Loader /> : <>
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSave} style={{ background: 'white', borderRadius: 16, padding: 28, boxShadow: '0 4px 12px rgba(0,0,0,.06)' }}>
                <h3 style={{ margin: '0 0 20px', fontWeight: 800 }}>Edit Profile Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {fields.map(field => (
                    <div key={field}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase' }}>{FIELD_LABELS[field]}</label>
                      <input value={form[field] || ''} onChange={e => setForm(f => ({...f, [field]: e.target.value}))}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button type="submit" disabled={saving}
                    style={{ padding: '12px 32px', background: '#1B4332', color: 'white', border: 'none', borderRadius: 10, fontWeight: 800, cursor: 'pointer' }}>
                    {saving ? 'Saving...' : '💾 Save Profile'}
                  </button>
                  {saved && <span style={{ color: '#059669', fontWeight: 700, fontSize: 14 }}>✓ Profile saved!</span>}
                </div>
              </form>
            )}

            {/* AI TOOLS TAB */}
            {activeTab === 'ai' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Crop Price Prediction */}
                <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,.06)' }}>
                  <h3 style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 17 }}>🌾 AI Crop Price Prediction</h3>
                  <p style={{ margin: '0 0 16px', color: '#64748B', fontSize: 13 }}>Get Claude AI-powered mandi price forecasts for your crops</p>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                    <select value={selCrop} onChange={e => setSelCrop(e.target.value)}
                      style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14, minWidth: 180 }}>
                      {CROPS.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <button onClick={handleCropPredict} disabled={predLoading}
                      style={{ padding: '10px 24px', background: '#1B4332', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                      {predLoading ? '🤖 Analysing...' : 'Get Prediction'}
                    </button>
                  </div>
                  {predError && (
                    <div style={{ marginBottom: 12, padding: '10px 14px', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 8, fontSize: 13, color: '#92400E', fontWeight: 600 }}>
                      ⚠️ {predError}
                    </div>
                  )}
                  {prediction && (
                    <div style={{ background: '#F0FDF4', borderRadius: 12, padding: 20, border: '1px solid #BBF7D0' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 16 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>CURRENT PRICE</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>{prediction.currentPrice}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>PREDICTED PRICE</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>{prediction.predictedPrice}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 4 }}>CONFIDENCE</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: '#D97706' }}>{prediction.confidence}%</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 20, background: prediction.trend === 'bullish' ? '#DCFCE7' : '#FEE2E2', color: prediction.trend === 'bullish' ? '#166534' : '#991B1B' }}>
                          {prediction.trend === 'bullish' ? '📈 Bullish' : '📉 Bearish'}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: '#FEF3C7', color: '#92400E' }}>
                          Best Month to Sell: {prediction.bestMonthToSell}
                        </span>
                        {prediction.source === 'fallback' && <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 20, background: '#F1F5F9', color: '#94A3B8' }}>📊 Estimated Data</span>}
                        {prediction.source === 'ai'      && <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 20, background: '#DCFCE7', color: '#166534' }}>✨ Live AI Analysis</span>}
                      </div>
                      <div style={{ fontSize: 14, color: '#166534', fontWeight: 600, marginBottom: 10 }}>💡 {prediction.advice}</div>
                      <div style={{ fontSize: 13, color: '#475569' }}>
                        <strong>Key Factors:</strong><br/>
                        {prediction.factors?.map((f,i) => <span key={i}>• {f}<br/></span>)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Smart Job Matching */}
                <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,.06)' }}>
                  <h3 style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 17 }}>🎯 AI Job Matching</h3>
                  <p style={{ margin: '0 0 16px', color: '#64748B', fontSize: 13 }}>Claude AI picks the best marketplace jobs for your profile</p>
                  <button onClick={handleJobMatch} disabled={matchLoading}
                    style={{ padding: '10px 24px', background: '#1D4ED8', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', marginBottom: 16 }}>
                    {matchLoading ? '🤖 Finding Matches...' : '🔍 Find Best Jobs For Me'}
                  </button>
                  {matchNote && (
                    <div style={{ marginBottom: 12, padding: '10px 14px', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 8, fontSize: 13, color: '#92400E', fontWeight: 600 }}>
                      ⚠️ {matchNote}
                    </div>
                  )}
                  {matchError && (
                    <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, fontSize: 13, color: '#B91C1C', fontWeight: 600 }}>
                      ❌ {matchError}
                    </div>
                  )}
                  {matches.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {matches.map(m => (
                        <div key={m.id} style={{ background: '#F0F9FF', borderRadius: 12, padding: 16, border: '1px solid #BAE6FD', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>{m.title}</div>
                            <div style={{ fontSize: 12, color: '#475569', marginBottom: 6 }}>📍 {m.location} • {m.cropType || 'General'}</div>
                            <div style={{ fontSize: 13, color: '#1D4ED8', fontWeight: 600 }}>🤖 {m.matchReason}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>₹{m.price ? Number(m.price).toLocaleString() : 'Neg.'}</div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: m.matchScore >= 85 ? '#166534' : '#92400E', background: m.matchScore >= 85 ? '#DCFCE7' : '#FEF3C7', padding: '3px 8px', borderRadius: 20, marginTop: 4 }}>
                              {m.matchScore}% Match
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {matches.length === 0 && !matchLoading && !matchError && <div style={{ color: '#64748B', fontSize: 13 }}>Click the button above to get your personalized job recommendations!</div>}
                </div>
              </div>
            )}

            {/* DOCUMENTS TAB */}
            {activeTab === 'docs' && (
              <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,.06)' }}>
                <h3 style={{ margin: '0 0 16px', fontWeight: 800 }}>Uploaded Documents</h3>
                {documents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#64748B' }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>📄</div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>No documents uploaded yet</div>
                    <div style={{ fontSize: 13 }}>Uploading documents increases your Trust Score</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 16 }}>
                    {documents.map(doc => (
                      <div key={doc.id} style={{ background: '#F8FAFC', borderRadius: 12, padding: 16, border: '1px solid #E2E8F0', textAlign: 'center' }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', textTransform: 'capitalize' }}>{doc.docType.replace(/_/g,' ')}</div>
                        <a href={doc.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#1D4ED8', textDecoration: 'none', display: 'block', marginTop: 8 }}>View →</a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* REVIEWS TAB */}
            {activeTab === 'reviews' && (
              <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,.06)' }}>
                <h3 style={{ margin: '0 0 16px', fontWeight: 800 }}>Ratings & Reviews</h3>
                <div style={{ textAlign: 'center', padding: 40, color: '#64748B' }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>⭐</div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>No reviews yet</div>
                  <div style={{ fontSize: 13 }}>Complete your first job to start earning reviews!</div>
                </div>
              </div>
            )}
          </>}
        </div>
      </div>
    </div>
  );
}
