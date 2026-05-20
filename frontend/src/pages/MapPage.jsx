import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import DesktopTopNav from '../components/dashboard/DesktopTopNav';
import api from '../api/axios';

// Role colors
const ROLE_COLOR = {
  farmer:   '#16A34A',
  baler:    '#D97706',
  mover:    '#7C3AED',
  industry: '#1D4ED8',
};
const ROLE_ICON = { farmer: '🌾', baler: '📦', mover: '🚚', industry: '🏭' };
const TYPE_LABEL = { supply: 'Selling', demand: 'Buying', job: 'Job Offer', provider: 'Service' };

export default function MapPage() {
  const { user } = useAuth();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  // Load Leaflet if not already loaded
  useEffect(() => {
    if (window.L) { setMapReady(true); return; }
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setMapReady(true);
    document.head.appendChild(script);
  }, []);

  // Fetch services
  useEffect(() => {
    api.get('/map/services').then(r => setPins(r.data.pins || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Init map
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current) return;
    const map = window.L.map(mapRef.current, { zoomControl: true }).setView([30.9, 75.85], 8);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 18
    }).addTo(map);
    mapInstanceRef.current = map;
  }, [mapReady]);

  // Render markers
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return;
    // Clear existing
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const filtered = filter === 'all' ? pins : pins.filter(p => {
      if (filter === 'farmers') return p.role === 'farmer';
      if (filter === 'balers')  return p.role === 'baler';
      if (filter === 'movers')  return p.role === 'mover';
      if (filter === 'industry') return p.role === 'industry';
      return true;
    });

    filtered.forEach(pin => {
      const color = ROLE_COLOR[pin.role] || '#475569';
      const icon = window.L.divIcon({
        html: `<div style="background:${color};color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,.3);border:2px solid white;">${ROLE_ICON[pin.role]||'📍'}</div>`,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const marker = window.L.marker([pin.lat, pin.lng], { icon })
        .addTo(mapInstanceRef.current)
        .on('click', () => setSelected(pin));
      markersRef.current.push(marker);
    });
  }, [pins, filter, mapReady]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
    };
  }, []);

  const FILTERS = [
    { key: 'all', label: '🗺️ All', count: pins.length },
    { key: 'farmers', label: '🌾 Farmers', count: pins.filter(p=>p.role==='farmer').length },
    { key: 'balers', label: '📦 Balers', count: pins.filter(p=>p.role==='baler').length },
    { key: 'movers', label: '🚚 Movers', count: pins.filter(p=>p.role==='mover').length },
    { key: 'industry', label: '🏭 Industry', count: pins.filter(p=>p.role==='industry').length },
  ];

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#F0F4F8' }}>
      <DesktopTopNav user={user} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ background: 'white', padding: '14px 28px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 20, zIndex: 10, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0F172A' }}>🗺️ Nearby Services</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B' }}>
              {loading ? 'Loading...' : `${pins.length} active services across Punjab & Haryana`}
            </p>
          </div>
          
          {/* Filters */}
          <div style={{ display: 'flex', gap: 6 }}>
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                style={{ padding: '7px 14px', border: 'none', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all .15s',
                  background: filter === f.key ? '#1B4332' : '#F1F5F9',
                  color: filter === f.key ? 'white' : '#475569' }}>
                {f.label} {f.count > 0 && <span style={{ opacity: 0.8, fontSize: 11 }}>({f.count})</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Map + Side Panel */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Map */}
          <div ref={mapRef} style={{ flex: 1, height: '100%' }} />

          {/* Selected Pin Panel */}
          {selected && (
            <div style={{ width: 320, background: 'white', borderLeft: '1px solid #E2E8F0', overflowY: 'auto', flexShrink: 0 }}>
              <div style={{ background: ROLE_COLOR[selected.role] || '#1B4332', color: 'white', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>
                    {ROLE_ICON[selected.role]} {selected.role} • {TYPE_LABEL[selected.listingType] || TYPE_LABEL[selected.type] || 'Service'}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.3 }}>{selected.title}</div>
                </div>
                <button onClick={() => setSelected(null)}
                  style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 14, fontWeight: 800, flexShrink: 0, marginLeft: 8 }}>✕</button>
              </div>
              <div style={{ padding: '16px 20px' }}>
                {selected.price && (
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#059669', marginBottom: 8 }}>
                    ₹{Number(selected.price).toLocaleString()}
                  </div>
                )}
                {selected.description && (
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginBottom: 12 }}>{selected.description}</p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selected.cropType && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <span style={{ fontSize: 16 }}>🌾</span>
                      <span style={{ color: '#475569' }}>{selected.cropType}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <span style={{ fontSize: 16 }}>📍</span>
                    <span style={{ color: '#475569' }}>{selected.location}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <span style={{ fontSize: 16 }}>👤</span>
                    <span style={{ color: '#475569' }}>{selected.userName}</span>
                  </div>
                </div>
                <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                  <a href="/market"
                    style={{ flex: 1, padding: '10px 16px', background: '#1B4332', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', textAlign: 'center', textDecoration: 'none' }}>
                    View on Market →
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div style={{ background: 'white', borderTop: '1px solid #E2E8F0', padding: '8px 28px', display: 'flex', gap: 20, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>Legend:</span>
          {Object.entries(ROLE_COLOR).map(([role, color]) => (
            <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#475569' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: color }} />
              {ROLE_ICON[role]} {role.charAt(0).toUpperCase() + role.slice(1)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
