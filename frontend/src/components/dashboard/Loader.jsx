export default function Loader() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100%', 
      width: '100%', 
      minHeight: 300,
      gap: 16 
    }}>
      <div className="spinner" style={{ 
        width: 40, 
        height: 40, 
        border: '3px solid rgba(27, 67, 50, 0.1)', 
        borderTopColor: '#1B4332', 
        borderRadius: '50%',
        animation: 'spin 1s linear infinite' 
      }} />
      <div style={{ color: '#64748B', fontSize: 14, fontWeight: 600 }}>Loading data...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
