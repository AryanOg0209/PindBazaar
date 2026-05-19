export default function MapWidget() {
  return (
    <div className="dash-card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      
      {/* Map Background Placeholder */}
      <div style={{ flex: 1, background: 'url(/map-bg.png) center/cover no-repeat', position: 'relative' }}>
        
        {/* Map Pins */}
        <div style={{ position: 'absolute', top: '40%', left: '30%', background: '#166534', color: 'white', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,.2)' }}>✓</div>
        <div style={{ position: 'absolute', top: '60%', left: '50%', background: '#3B82F6', color: 'white', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,.2)' }}>📍</div>
        <div style={{ position: 'absolute', top: '30%', left: '70%', background: '#166534', color: 'white', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,.2)' }}>✓</div>
        
        {/* Top Left Labels */}
        <div style={{ position: 'absolute', top: 16, left: 16, background: 'white', padding: '12px 16px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 2px 8px rgba(0,0,0,.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, color: '#0F172A' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#166534' }} /> Completed Jobs
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, color: '#0F172A' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3B82F6' }} /> Upcoming Jobs
          </div>
        </div>

        {/* Map Controls */}
        <div style={{ position: 'absolute', top: 16, right: 16, background: 'white', borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.15)' }}>
          <button style={{ padding: '8px 12px', background: 'transparent', border: 'none', borderBottom: '1px solid #E2E8F0', cursor: 'pointer', fontSize: 16 }}>+</button>
          <button style={{ padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16 }}>-</button>
        </div>
      </div>
    </div>
  );
}
