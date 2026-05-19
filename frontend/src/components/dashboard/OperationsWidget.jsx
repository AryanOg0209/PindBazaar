import { useNavigate } from 'react-router-dom';
import DashboardFeed from './DashboardFeed';

export default function OperationsWidget({ feed, filters, setFilters }) {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      
      {/* Quick Actions Bar */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={() => navigate('/market')} style={{ flex: 1, background: '#1B4332', color: 'white', border: 'none', borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontFamily: 'var(--font-sans)', boxShadow: '0 4px 12px rgba(27,67,50,.15)' }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Find New Work</span>
          <span style={{ fontSize: 20 }}>›</span>
        </button>
        <button onClick={() => navigate('/market-insights')} style={{ width: 100, background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', color: '#0F172A' }}>
          <span style={{ fontSize: 20 }}>🔍</span>
          <span style={{ fontSize: 11, fontWeight: 700 }}>Market Insights</span>
        </button>
        <button onClick={() => navigate('/equipment')} style={{ width: 100, background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', color: '#0F172A' }}>
          <span style={{ fontSize: 20 }}>⚙️</span>
          <span style={{ fontSize: 11, fontWeight: 700 }}>Manage Equipment</span>
        </button>
      </div>

      {/* Feed & Filters */}
      <div className="dash-card" style={{ display: 'flex', padding: 0 }}>
        {/* Feed List */}
        <div style={{ flex: 1, padding: '24px', borderRight: '1px solid #F1F5F9', maxHeight: 420, overflowY: 'auto' }}>
           <DashboardFeed feed={feed} />
        </div>
        
        {/* Filters */}
        <div style={{ width: 260, padding: '24px', display: 'flex', flexDirection: 'column', gap: 20, background: '#FAFAFA' }}>
          <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: 0 }}>Live Marketplace</h4>
          
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, display: 'block' }}>Type of Work</label>
            <select value={filters?.type || ''} onChange={e => setFilters({ ...filters, type: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }}>
              <option value="">All Types</option>
              <option value="demand">Demand</option>
              <option value="supply">Supply</option>
              <option value="job">Job</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, display: 'block' }}>Distance</label>
            <select style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }}>
              <option value="">All Distances</option>
              <option value="10">Under 10 km</option>
              <option value="25">Under 25 km</option>
              <option value="50">Under 50 km</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
              <span>Max Price</span>
              <span style={{ color: '#0F172A' }}>{filters?.maxPrice ? `₹${filters.maxPrice}` : 'Any'}</span>
            </label>
            <input type="range" min="1000" max="10000" step="500" value={filters?.maxPrice || 10000} onChange={e => setFilters({ ...filters, maxPrice: e.target.value })} style={{ width: '100%', accentColor: '#1B4332' }} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, display: 'block' }}>Crop Type</label>
            <select value={filters?.cropType || ''} onChange={e => setFilters({ ...filters, cropType: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }}>
              <option value="">All Crops</option>
              <option value="Wheat">Wheat</option>
              <option value="Paddy">Paddy</option>
              <option value="Sugarcane">Sugarcane</option>
              <option value="Cotton">Cotton</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
