import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';

export default function TrackingMap({ orderId, userRole, orderTitle, onClose }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);

  const [isTracking, setIsTracking] = useState(false);
  const [trackData, setTrackData] = useState(null);
  const [status, setStatus] = useState('');
  const isMover = userRole === 'mover';

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    if (typeof window.L === 'undefined') { setStatus('Map loading...'); return; }

    const map = window.L.map(mapRef.current).setView([30.9, 75.85], 10);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    mapInstanceRef.current = map;
  }, []);

  // Mover: start sharing location
  const startSharing = () => {
    if (!navigator.geolocation) { setStatus('GPS not supported on this device.'); return; }
    setIsTracking(true);
    setStatus('📡 Sharing your live location...');

    const sendLocation = (pos) => {
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      api.post(`/tracking/${orderId}/start`, { lat, lng, accuracy }).catch(() => {});

      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([lat, lng], 14);
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          const icon = window.L.divIcon({ html: '<div style="background:#1B4332;color:white;padding:4px 8px;border-radius:20px;font-size:11px;font-weight:800;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.3)">🚚 You</div>', className: '', iconAnchor: [20, 12] });
          markerRef.current = window.L.marker([lat, lng], { icon }).addTo(mapInstanceRef.current);
        }
      }
    };

    watchIdRef.current = navigator.geolocation.watchPosition(sendLocation,
      () => setStatus('⚠️ GPS signal weak. Move to open area.'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(pos => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        api.put(`/tracking/${orderId}/ping`, { lat, lng, accuracy }).catch(() => {});
      }, () => {}, { enableHighAccuracy: true, timeout: 10000 });
    }, 10000);
  };

  const stopSharing = () => {
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    api.delete(`/tracking/${orderId}/stop`).catch(() => {});
    setIsTracking(false);
    setStatus('Location sharing stopped.');
  };

  // Client: poll for mover location
  useEffect(() => {
    if (isMover) return;
    const poll = async () => {
      try {
        const res = await api.get(`/tracking/${orderId}`);
        setTrackData(res.data);
        if (res.data.isActive && mapInstanceRef.current) {
          const { lat, lng, moverName, ageSeconds } = res.data;
          mapInstanceRef.current.setView([lat, lng], 13);
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
            markerRef.current.getPopup()?.setContent(`🚚 ${moverName || 'Mover'}<br/><small>Updated ${ageSeconds}s ago</small>`);
          } else {
            const icon = window.L.divIcon({ html: `<div style="background:#1B4332;color:white;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:800;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.3)">🚚 ${moverName||'Mover'}</div>`, className: '', iconAnchor: [24, 12] });
            markerRef.current = window.L.marker([lat, lng], { icon }).addTo(mapInstanceRef.current).bindPopup(`🚚 ${moverName}<br/><small>Updated ${ageSeconds}s ago</small>`).openPopup();
          }
          setStatus(`📍 ${moverName || 'Mover'} last updated ${ageSeconds}s ago`);
        } else if (!res.data.isActive) {
          setStatus('Mover has not started sharing location yet. Ask them to click "Share Live Location".');
        }
      } catch (e) { setStatus('Could not fetch location.'); }
    };
    poll();
    const id = setInterval(poll, 8000);
    return () => clearInterval(id);
  }, [orderId, isMover]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
      markerRef.current = null;
    };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 20, overflow: 'hidden', width: '100%', maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.4)' }}>
        {/* Header */}
        <div style={{ background: '#1B4332', color: 'white', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>📍 Live Delivery Tracker</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{orderTitle}</div>
          </div>
          <button onClick={() => { if (isTracking) stopSharing(); onClose(); }}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontWeight: 700 }}>✕ Close</button>
        </div>

        {/* Map */}
        <div ref={mapRef} style={{ height: 380, width: '100%' }} />

        {/* Controls */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #F1F5F9' }}>
          {status && (
            <div style={{ marginBottom: 12, padding: '8px 14px', background: isTracking ? '#DCFCE7' : '#F8FAFC', border: `1px solid ${isTracking ? '#BBF7D0' : '#E2E8F0'}`, borderRadius: 8, fontSize: 13, color: isTracking ? '#166534' : '#475569', fontWeight: 600 }}>
              {status}
            </div>
          )}
          {isMover ? (
            <div style={{ display: 'flex', gap: 12 }}>
              {!isTracking ? (
                <button onClick={startSharing}
                  style={{ flex: 1, padding: '12px 24px', background: '#1B4332', color: 'white', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                  📡 Start Sharing Live Location
                </button>
              ) : (
                <button onClick={stopSharing}
                  style={{ flex: 1, padding: '12px 24px', background: '#DC2626', color: 'white', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                  ⏹ Stop Sharing
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: trackData?.isActive ? '#22C55E' : '#94A3B8', animation: trackData?.isActive ? 'pulse 2s infinite' : 'none' }} />
              <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>
                {trackData?.isActive ? 'Live tracking active — map updates every 8s' : 'Waiting for mover to share location...'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
