import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchDashboardData } from '../services/mockDashboard';
import { onAppDataChanged } from '../services/realtimeEvents';

import DesktopTopNav     from '../components/dashboard/DesktopTopNav';
import { WeatherWidget, MetricsWidget } from '../components/dashboard/TopWidgets';
import PerformanceWidget from '../components/dashboard/PerformanceWidget';
import OperationsWidget  from '../components/dashboard/OperationsWidget';
import MapWidget         from '../components/dashboard/MapWidget';
import LogisticsWidget   from '../components/dashboard/LogisticsWidget';
import Loader            from '../components/dashboard/Loader';

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role || 'farmer';

  const [feed, setFeed]       = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [filters, setFilters] = useState({ type: '', cropType: '', minPrice: '', maxPrice: '' });

  // Live stats passed up from PerformanceWidget (avoids double-fetch)
  const [liveStats, setLiveStats] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshKey(key => key + 1), []);

  // Fetch market feed only (stats/weather/equipment fetched inside their own widgets)
  const loadFeed = useCallback(() => {
    setFeedLoading(true);
    fetchDashboardData(role, filters)
      .then(res => setFeed(res.feed || []))
      .catch(console.error)
      .finally(() => setFeedLoading(false));
  }, [role, filters, refreshKey]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  useEffect(() => {
    const offDataChanged = onAppDataChanged(triggerRefresh);
    const onFocus = () => triggerRefresh();
    const timer = window.setInterval(triggerRefresh, 30000);

    window.addEventListener('focus', onFocus);
    return () => {
      offDataChanged();
      window.removeEventListener('focus', onFocus);
      window.clearInterval(timer);
    };
  }, [triggerRefresh]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'url(/hero.png) center/cover no-repeat', overflow: 'hidden' }}>

      {/* Background Overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(27,67,50,0.6)', pointerEvents: 'none' }} />

      {/* Top Nav */}
      <DesktopTopNav user={user} />

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', position: 'relative', zIndex: 10 }}>
        {feedLoading && !feed.length ? (
          <div style={{ background: 'rgba(255,255,255,0.9)', borderRadius: 24, padding: 40, height: 300 }}>
            <Loader />
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 20, maxWidth: 1600, margin: '0 auto' }}>

            {/* ── LEFT COLUMN ── */}
            <div style={{ flex: '1 1 65%', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Row 1: Weather + Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 20 }}>
                <WeatherWidget role={role} refreshKey={refreshKey} />
                <MetricsWidget stats={liveStats} />
              </div>

              {/* Row 2: Performance Chart (live — passes stats up) */}
              <PerformanceWidget onStatsLoaded={setLiveStats} refreshKey={refreshKey} />

              {/* Row 3: Operations Hub (market feed) */}
              <OperationsWidget feed={feed} filters={filters} setFilters={setFilters} />
            </div>

            {/* ── RIGHT COLUMN ── */}
            <div style={{ flex: '0 0 34%', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Map */}
              <div style={{ height: 240 }}>
                <MapWidget />
              </div>

              {/* Field Assets & Logistics (live equipment) */}
              <div style={{ flex: 1 }}>
                <LogisticsWidget refreshKey={refreshKey} />
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .dash-card { background: white; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); overflow: hidden; display: flex; flex-direction: column; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.1); border-radius: 8px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.4); border-radius: 8px; }
      `}</style>
    </div>
  );
}
