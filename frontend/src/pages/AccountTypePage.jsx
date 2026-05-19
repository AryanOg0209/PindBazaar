import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LOGO = '/logo.png';

const ACCOUNT_TYPES = [
  {
    key: 'farmer',
    emoji: '🌾',
    label: 'Farmer',
    desc: 'Sell produce & biomass directly to industries',
    stats: '6,200+ farmers',
    color: '#2D6A4F',
    bgColor: '#D8F3DC',
    perks: ['Best market prices', 'Direct buyer access', 'Free listings'],
  },
  {
    key: 'industry',
    emoji: '🏭',
    label: 'Industry',
    desc: 'Source biomass & agri-inputs at scale',
    stats: '850+ industries',
    color: '#1B5E9E',
    bgColor: '#DBEAFE',
    perks: ['Verified suppliers', 'Bulk orders', 'Quality assured'],
  },
  {
    key: 'baler',
    emoji: '⚙️',
    label: 'Baler',
    desc: 'Get hired to process and bundle biomass',
    stats: '1,100+ balers',
    color: '#92400E',
    bgColor: '#FEF3C7',
    perks: ['Job alerts nearby', 'Upfront payments', 'Season-round work'],
  },
  {
    key: 'mover',
    emoji: '🚛',
    label: 'Mover',
    desc: 'Transport agricultural goods across Punjab',
    stats: '3,800+ movers',
    color: '#7C3AED',
    bgColor: '#EDE9FE',
    perks: ['Route matching', 'Instant bookings', 'GPS tracking'],
  },
];

export default function AccountTypePage() {
  const navigate  = useNavigate();
  const [selected, setSelected] = useState(null);

  const handleSelect = (key) => {
    setSelected(key);
    sessionStorage.setItem('pb_role', key);
    setTimeout(() => navigate('/signup/phone'), 200);
  };

  const selectedType = ACCOUNT_TYPES.find(t => t.key === selected);

  return (
    <div className="page" style={{ background: 'var(--cream)' }}>
      {/* Header */}
      <div className="header-bar">
        <button className="back-btn" onClick={() => navigate('/auth')}>←</button>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div className="logo-chip">
            <img src={LOGO} alt="PindBazaar" />
            Pind<span style={{ color: 'var(--gold-600)' }}>Bazaar</span>
          </div>
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div className="page-content" style={{ paddingTop: 8, gap: 16 }}>
        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 26, marginBottom: 6 }}>Choose Your Role</h2>
          <p className="subtitle" style={{ fontSize: 15 }}>
            Join 12,000+ agri professionals across Punjab &amp; Haryana
          </p>
        </div>

        {/* Role Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {ACCOUNT_TYPES.map((type) => (
            <div
              key={type.key}
              onClick={() => handleSelect(type.key)}
              style={{
                background: selected === type.key ? type.bgColor : 'white',
                border: `2.5px solid ${selected === type.key ? type.color : 'var(--border)'}`,
                borderRadius: 20,
                padding: '18px 14px',
                cursor: 'pointer',
                transition: 'all .2s cubic-bezier(.4,0,.2,1)',
                boxShadow: selected === type.key
                  ? `0 0 0 4px ${type.bgColor}, 0 8px 24px rgba(0,0,0,.1)`
                  : '0 2px 8px rgba(0,0,0,.06)',
                transform: selected === type.key ? 'translateY(-3px) scale(1.02)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Selection check */}
              {selected === type.key && (
                <div style={{
                  position: 'absolute', top: 10, right: 10,
                  width: 22, height: 22, borderRadius: '50%',
                  background: type.color, color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 900,
                }}>✓</div>
              )}

              {/* Icon */}
              <div style={{
                width: 50, height: 50, borderRadius: 14,
                background: selected === type.key ? `${type.color}22` : 'var(--sand)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, transition: 'all .2s',
              }}>
                {type.emoji}
              </div>

              {/* Role name */}
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-.2px' }}>
                  {type.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, fontWeight: 500, lineHeight: 1.4 }}>
                  {type.desc}
                </div>
              </div>

              {/* Stats badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center',
                background: selected === type.key ? `${type.color}18` : 'var(--sand)',
                color: selected === type.key ? type.color : 'var(--text-3)',
                fontSize: 11, fontWeight: 800, padding: '4px 8px',
                borderRadius: 8, letterSpacing: '.2px',
                width: 'fit-content',
              }}>
                {type.stats}
              </div>
            </div>
          ))}
        </div>

        {/* Perks for selected */}
        {selectedType && (
          <div style={{
            background: `${selectedType.color}10`,
            border: `1.5px solid ${selectedType.color}40`,
            borderRadius: 16, padding: '14px 18px',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: selectedType.color, textTransform: 'uppercase', letterSpacing: '.8px' }}>
              As a {selectedType.label} you get
            </div>
            {selectedType.perks.map(p => (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-2)', fontWeight: 600 }}>
                <span style={{ color: selectedType.color, fontSize: 12 }}>✦</span> {p}
              </div>
            ))}
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-4)', fontWeight: 500 }}>
          You can switch roles anytime from settings
        </p>
      </div>

      <div className="page-footer">
        <button
          className="btn-primary"
          onClick={() => selected && navigate('/signup/phone')}
          disabled={!selected}
          style={selected && selectedType ? {
            background: `linear-gradient(135deg, ${selectedType.color}, ${selectedType.color}cc)`,
          } : {}}
        >
          {selected ? `Continue as ${selectedType?.label} →` : 'Select a role to continue'}
        </button>
      </div>
    </div>
  );
}
