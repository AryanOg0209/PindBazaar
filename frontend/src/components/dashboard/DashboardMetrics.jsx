export default function DashboardMetrics({ metrics }) {
  if (!metrics || metrics.length === 0) return null;
  
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
      {metrics.map((m, i) => (
        <div key={i} style={{ 
          background: 'white', 
          padding: '16px 12px', 
          borderRadius: 16, 
          boxShadow: '0 4px 20px rgba(0,0,0,.04)', 
          border: '1px solid #F1F5F9', 
          textAlign: 'center' 
        }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', letterSpacing: '-.5px' }}>{m.v}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginTop: 4, lineHeight: 1.2 }}>{m.l}</div>
        </div>
      ))}
    </div>
  );
}
