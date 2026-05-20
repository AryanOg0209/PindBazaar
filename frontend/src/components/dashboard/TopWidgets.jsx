import { useState, useEffect } from 'react';
import { getDashboardWeather } from '../../services/dashboardApi';

const WEATHER_ICONS = {
  Clear: '☀️', Clouds: '⛅', Rain: '🌧', Drizzle: '🌦', Thunderstorm: '⛈',
  Snow: '❄️', Mist: '🌫', Fog: '🌫', Haze: '🌫',
};

const DEFAULT_COORDS = { lat: 30.9, lon: 75.85 };

export function WeatherWidget({ role, refreshKey = 0 }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState(DEFAULT_COORDS);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      p => setCoords({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => setCoords(DEFAULT_COORDS),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => {
    let active = true;
    if (!weather) setLoading(true);

    getDashboardWeather(coords.lat, coords.lon)
      .then(data => { if (active) setWeather(data); })
      .catch(console.error)
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [coords.lat, coords.lon, refreshKey]);

  const icon = weather ? (WEATHER_ICONS[weather.main] || '🌤') : '🌤';
  const updatedAt = weather?.lastUpdated
    ? new Date(weather.lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="dash-card" style={{ display: 'flex', flexDirection: 'column', padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>
          Field Weather {weather?.city ? `— ${weather.city}` : ''}
        </span>
        <span style={{ fontSize: 10, fontWeight: 800, background: '#166534', color: 'white', padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
          {updatedAt ? `${role} • ${updatedAt}` : `${role} ✓`}
        </span>
      </div>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 13 }}>
          Loading weather...
        </div>
      ) : weather ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
            {/* Current */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F0FDF4', padding: '10px 12px', borderRadius: 10 }}>
              {weather.iconUrl ? (
                <img src={weather.iconUrl} alt={weather.main} style={{ width: 36, height: 36 }} />
              ) : (
                <span style={{ fontSize: 28 }}>{icon}</span>
              )}
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>{weather.temp}°C</div>
                <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600, textTransform: 'capitalize' }}>{weather.description}</div>
              </div>
            </div>
            {/* Humidity */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#F8FAFC', padding: '10px 8px', borderRadius: 10 }}>
              <span style={{ fontSize: 18 }}>💧</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>{weather.humidity}%</span>
              <span style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>Humidity</span>
            </div>
            {/* Wind */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#F8FAFC', padding: '10px 8px', borderRadius: 10 }}>
              <span style={{ fontSize: 18 }}>🌬</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>{weather.windSpeed}</span>
              <span style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>km/h Wind</span>
            </div>
          </div>

          {/* 5-day forecast */}
          {weather.forecast?.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(weather.forecast.length, 5)}, 1fr)`, gap: 5, marginBottom: 8 }}>
              {weather.forecast.slice(0,5).map((d, i) => (
                <div key={i} style={{ background: d.rain > 2 ? '#EFF6FF' : '#F8FAFC', borderRadius: 8, padding: '6px 3px', textAlign: 'center', border: d.rain > 2 ? '1px solid #BFDBFE' : '1px solid transparent' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#64748B' }}>{d.date}</div>
                  <div style={{ fontSize: 18 }}>{d.icon || '🌤'}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#0F172A' }}>{d.tempMax ?? d.temp}°</div>
                  {d.rain > 0 && <div style={{ fontSize: 9, color: '#1D4ED8', fontWeight: 700 }}>💧{d.rain}mm</div>}
                </div>
              ))}
            </div>
          )}

          {/* AI Farming tip */}
          {weather.advisory && (
            <div style={{ background: 'linear-gradient(135deg,#1B4332,#2D6A4F)', borderRadius: 8, padding: '7px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 14 }}>🤖</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>{weather.advisory}</span>
            </div>
          )}
          {weather.rainDaysAhead > 0 && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#1E40AF', fontWeight: 700, background: '#EFF6FF', padding: '4px 10px', borderRadius: 6 }}>
              🌧 Rain expected {weather.rainDaysAhead} day{weather.rainDaysAhead > 1 ? 's' : ''} ahead — plan accordingly
            </div>
          )}
        </>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 13 }}>
          Weather unavailable
        </div>
      )}
    </div>
  );
}

export function MetricsWidget({ stats }) {
  if (!stats) return (
    <div className="dash-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: 0 }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ padding: '20px 24px', borderRight: i < 2 ? '1px solid #F1F5F9' : 'none' }}>
          <div style={{ height: 14, background: '#F1F5F9', borderRadius: 4, marginBottom: 12, width: '60%' }} />
          <div style={{ height: 32, background: '#F1F5F9', borderRadius: 6, width: '80%' }} />
        </div>
      ))}
    </div>
  );

  const items = [
    { l: 'Jobs Done',     v: stats.jobsDone,    icon: '💼', bg: '#DCFCE7' },
    { l: 'Active Jobs',   v: stats.activeJobs ?? stats.upcoming, icon: '🗓', bg: '#E0E7FF' },
    { l: 'Revenue',       v: stats.totalRevenue >= 1000 ? `₹${Math.round(stats.totalRevenue/1000)}K` : `₹${stats.totalRevenue}`, icon: '💰', bg: '#FFEDD5' },
  ];

  return (
    <div className="dash-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: 0, overflow: 'hidden' }}>
      {items.map((m, i) => (
        <div key={i} style={{ padding: '20px 24px', borderRight: i < 2 ? '1px solid #F1F5F9' : 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginBottom: 12 }}>{m.l}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              {m.icon}
            </div>
            <span style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', letterSpacing: '-1px' }}>{m.v}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
