require('dotenv').config();
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const Anthropic = require('@anthropic-ai/sdk');
const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;
const MODEL = 'claude-haiku-4-5';

const WORK_KEYS = ['baling', 'transport', 'buying'];
const DASHBOARD_TIME_ZONE = process.env.DASHBOARD_TIME_ZONE || 'Asia/Kolkata';

function classifyOrderWork(order, userRole) {
  const listing = order.listing || {};
  const text = `${listing.type || ''} ${listing.title || ''} ${listing.description || ''} ${listing.cropType || ''}`.toLowerCase();

  if (/\b(transport|truck|trucking|vehicle|delivery|deliver|mover|trolley|trip|haul|freight)\b/.test(text)) {
    return 'transport';
  }
  if (/\b(bal|bale|baler|baling|bundle|bundling|stubble|straw)\b/.test(text)) {
    return 'baling';
  }
  if (userRole === 'mover') return 'transport';
  if (userRole === 'baler') return 'baling';
  if (listing.type === 'job') return 'baling';
  return 'buying';
}

function getDateParts(date, timeZone = DASHBOARD_TIME_ZONE) {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-IN', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(date)).map(part => [part.type, part.value])
  );
}

function dateKey(date, timeZone = DASHBOARD_TIME_ZONE) {
  const parts = getDateParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function monthKey(date, timeZone = DASHBOARD_TIME_ZONE) {
  const parts = getDateParts(date, timeZone);
  return `${parts.year}-${parts.month}`;
}

function weekdayLabel(date, timeZone = DASHBOARD_TIME_ZONE) {
  return new Intl.DateTimeFormat('en-IN', { timeZone, weekday: 'short' }).format(new Date(date));
}

function monthLabel(date, timeZone = DASHBOARD_TIME_ZONE) {
  return new Intl.DateTimeFormat('en-IN', { timeZone, month: 'short', year: '2-digit' }).format(new Date(date));
}

function money(order) {
  return Math.max(0, Number(order.agreedPrice || 0));
}

function buildSevenDaySeries(completedOrders, userRole) {
  const rows = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      key: dateKey(d),
      day: weekdayLabel(d),
      baling: 0,
      transport: 0,
      buying: 0,
      total: 0,
    };
  });

  const byKey = new Map(rows.map(row => [row.key, row]));
  completedOrders.forEach(order => {
    const key = dateKey(order.completedAt || order.updatedAt || order.createdAt);
    const row = byKey.get(key);
    if (!row) return;
    const workKey = classifyOrderWork(order, userRole);
    const amount = money(order);
    row[workKey] += amount;
    row.total += amount;
  });

  return rows.map(({ key, ...row }) => row);
}

function buildMonthlySeries(completedOrders, userRole) {
  const rows = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    rows.push({
      key: monthKey(d),
      month: monthLabel(d),
      baling: 0,
      transport: 0,
      buying: 0,
      amount: 0,
    });
  }

  const byKey = new Map(rows.map(row => [row.key, row]));
  completedOrders.forEach(order => {
    const key = monthKey(order.completedAt || order.updatedAt || order.createdAt);
    const row = byKey.get(key);
    if (!row) return;
    const workKey = classifyOrderWork(order, userRole);
    const amount = money(order);
    row[workKey] += amount;
    row.amount += amount;
  });

  return rows.map(({ key, ...row }) => row);
}

function buildFallbackMaintenanceTip(equipment, activeJobs) {
  const maintenanceDue = equipment.filter(eq => eq.status === 'maintenance').length;
  if (maintenanceDue > 0) return `${maintenanceDue} asset needs service before taking heavy field work.`;
  if (activeJobs > 0) return `${activeJobs} active job${activeJobs > 1 ? 's' : ''}: inspect fuel, belts, tyres, and lights today.`;
  return 'All assets look ready. Do a quick pre-job inspection before dispatch.';
}

function makeAsset({ id, type, subtype, location, icon, index, activeOrder, completedJobs }) {
  const baseHealth = 9.4 - (completedJobs * 0.12) - (index * 0.18) - (activeOrder ? 0.15 : 0);
  const condition = Math.max(5.4, Math.min(9.8, baseHealth));
  const status = condition < 6.6 ? 'maintenance' : activeOrder ? 'working' : 'operational';
  const nextService = status === 'maintenance'
    ? 'Due now'
    : activeOrder
      ? 'After current job'
      : `${Math.max(1, Math.ceil((condition - 5.8) * 3))} jobs`;

  return {
    id,
    type,
    subtype,
    location,
    status,
    condition: Number(condition.toFixed(1)),
    nextService,
    icon,
    activeJobTitle: activeOrder?.listing?.title || null,
    activeJobLocation: activeOrder?.listing?.location || null,
  };
}

// ── Retry helper ──
async function withRetry(fn, retries = 2, delay = 800) {
  for (let i = 0; i <= retries; i++) {
    try { return await fn(); }
    catch (e) {
      if ((e.status === 529 || e.status === 503 || e.status === 429) && i < retries) {
        await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
      } else throw e;
    }
  }
}

// ────────────────────────────────────────────────────────
// GET /api/dashboard/stats  – live metrics for the logged-in user
// ────────────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  const userId = req.user.id;
  try {
    const userOrderWhere = { OR: [{ workerId: userId }, { clientId: userId }] };
    const [completedOrders, activeOrders, pendingOrders, activeListings, demandCount, supplyCount, jobCount, completedDeals] = await Promise.all([
      prisma.order.findMany({
        where: { ...userOrderWhere, status: 'completed' },
        include: {
          listing: {
            select: { type: true, title: true, description: true, cropType: true, location: true }
          }
        },
        orderBy: { completedAt: 'asc' }
      }),
      prisma.order.count({ where: { ...userOrderWhere, status: { in: ['accepted', 'in_progress'] } } }),
      prisma.order.count({ where: { ...userOrderWhere, status: 'pending' } }),
      prisma.listing.count({ where: { userId, status: 'active' } }),
      prisma.listing.count({ where: { status: 'active', type: 'demand' } }),
      prisma.listing.count({ where: { status: 'active', type: 'supply' } }),
      prisma.listing.count({ where: { status: 'active', type: 'job' } }),
      prisma.order.count({ where: { status: 'completed' } }),
    ]);

    const totalRevenue = completedOrders.reduce((s, o) => s + money(o), 0);
    const jobsDone = completedOrders.length;
    const upcoming = activeOrders + pendingOrders;
    const weekData = buildSevenDaySeries(completedOrders, req.user.role);
    const monthlyBreakdown = buildMonthlySeries(completedOrders, req.user.role);
    const workBreakdown = WORK_KEYS.map(key => ({
      key,
      name: key === 'baling' ? 'Baling' : key === 'transport' ? 'Transport' : 'Buying',
      value: completedOrders
        .filter(order => classifyOrderWork(order, req.user.role) === key)
        .reduce((s, order) => s + money(order), 0),
    }));

    const avgPerJob = jobsDone > 0 ? Math.round(totalRevenue / jobsDone) : 0;

    res.json({
      jobsDone,
      upcoming,
      activeJobs: activeOrders,
      pendingJobs: pendingOrders,
      totalRevenue,
      activeListings,
      weekData,
      monthlyBreakdown,
      workBreakdown,
      avgPerJob,
      marketSnapshot: {
        activeListings: demandCount + supplyCount + jobCount,
        demandCount,
        supplyCount,
        jobCount,
        completedDeals,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ error: 'Failed to load stats' });
  }
};

// ────────────────────────────────────────────────────────
// GET /api/dashboard/weather?lat=X&lon=Y — uses Open-Meteo (free, no API key)
// ────────────────────────────────────────────────────────
exports.getWeather = async (req, res) => {
  const lat = parseFloat(req.query.lat) || 30.9;
  const lon = parseFloat(req.query.lon) || 75.85;
  try {
    // Reverse geocode district name via Nominatim
    let city = 'Punjab';
    try {
      const geoRes = await axios.get(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, { headers: { 'User-Agent': 'PindBazaar/1.0' }, timeout: 5000 });
      city = geoRes.data?.address?.county || geoRes.data?.address?.city || geoRes.data?.address?.state_district || 'Punjab';
    } catch (_) {}

    // Open-Meteo free weather API
    const weatherRes = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat, longitude: lon,
        current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,apparent_temperature',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max',
        timezone: 'Asia/Kolkata',
        forecast_days: 5
      },
      timeout: 8000
    });

    const cur = weatherRes.data.current;
    const daily = weatherRes.data.daily;

    // WMO weather code → description
    const WMO = { 0:'Clear sky', 1:'Mainly clear', 2:'Partly cloudy', 3:'Overcast', 45:'Foggy', 48:'Icy fog', 51:'Light drizzle', 53:'Moderate drizzle', 55:'Dense drizzle', 61:'Slight rain', 63:'Moderate rain', 65:'Heavy rain', 71:'Slight snow', 73:'Moderate snow', 75:'Heavy snow', 80:'Rain showers', 81:'Moderate showers', 82:'Violent showers', 95:'Thunderstorm', 99:'Thunderstorm w/ hail' };
    const WMO_MAIN = { 0:'Clear', 1:'Clear', 2:'Clouds', 3:'Clouds', 45:'Mist', 48:'Mist', 51:'Drizzle', 53:'Drizzle', 55:'Drizzle', 61:'Rain', 63:'Rain', 65:'Rain', 71:'Snow', 73:'Snow', 75:'Snow', 80:'Rain', 81:'Rain', 82:'Thunderstorm', 95:'Thunderstorm', 99:'Thunderstorm' };
    const WMO_ICON = { 0:'☀️', 1:'🌤', 2:'⛅', 3:'☁️', 45:'🌫', 48:'🌫', 51:'🌦', 53:'🌦', 55:'🌧', 61:'🌧', 63:'🌧', 65:'🌧', 71:'❄️', 73:'❄️', 75:'❄️', 80:'🌦', 81:'🌧', 82:'⛈', 95:'⛈', 99:'⛈' };

    const code = cur.weather_code;
    const description = WMO[code] || 'Variable';
    const main = WMO_MAIN[code] || 'Clear';

    // 5-day forecast
    const forecast = (daily.time || []).slice(0, 5).map((date, i) => ({
      date: new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
      tempMax: Math.round(daily.temperature_2m_max[i]),
      tempMin: Math.round(daily.temperature_2m_min[i]),
      temp: Math.round(daily.temperature_2m_max[i]),
      rain: Math.round(daily.precipitation_sum[i] || 0),
      icon: WMO_ICON[daily.weather_code[i]] || '🌤',
      desc: WMO[daily.weather_code[i]] || 'Variable',
      code: daily.weather_code[i],
    }));

    // AI farming advisory
    let advisory = '';
    const rainDays = forecast.filter(d => d.rain > 1).length;
    const maxTemp = Math.max(...forecast.map(d => d.tempMax));
    try {
      if (client) {
        const forecastSummary = forecast.slice(0, 3).map(d => `${d.date}: ${d.desc}, max ${d.tempMax}°C, rain ${d.rain}mm`).join('; ');
        const msg = await client.messages.create({
          model: 'claude-sonnet-4-6', max_tokens: 80,
          messages: [{ role: 'user', content: `Punjab/Haryana farmer. Weather: ${Math.round(cur.temperature_2m)}°C, ${description}, humidity ${cur.relative_humidity_2m}%. 3-day: ${forecastSummary}. Give ONE specific farming action tip in max 18 words. Plain text only.` }]
        });
        advisory = msg.content[0].text.trim().replace(/^["']|["']$/g, '');
      }
    } catch (_) {}
    if (!advisory) {
      advisory = rainDays >= 2 ? 'Rain expected — delay harvesting and field operations for 2-3 days.' :
        maxTemp > 38 ? 'Extreme heat — irrigate early morning, avoid spraying pesticides.' :
        cur.relative_humidity_2m > 80 ? 'High humidity — watch for fungal disease, ensure field drainage.' :
        'Good conditions — ideal for field operations and transport.';
    }

    res.json({
      temp: Math.round(cur.temperature_2m),
      feelsLike: Math.round(cur.apparent_temperature),
      humidity: cur.relative_humidity_2m,
      windSpeed: Math.round(cur.wind_speed_10m),
      description, main, city,
      forecast,
      advisory,
      rainDaysAhead: rainDays,
      source: 'open-meteo',
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Weather error:', err.message);
    res.json({
      temp: 32, feelsLike: 35, humidity: 58, windSpeed: 12,
      description: 'Partly cloudy', main: 'Clouds', city: 'Punjab',
      forecast: [], advisory: 'Check local weather before farm operations.',
      source: 'fallback', lastUpdated: new Date().toISOString(),
    });
  }
};

// ────────────────────────────────────────────────────────
// GET /api/dashboard/equipment  – user's equipment with AI health check
// ────────────────────────────────────────────────────────
exports.getEquipment = async (req, res) => {
  const userId = req.user.id;
  try {
    const userOrderWhere = { OR: [{ workerId: userId }, { clientId: userId }] };
    const [user, activeOrders, completedJobs] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: { balerProfile: true, moverProfile: true, farmerProfile: true }
      }),
      prisma.order.findMany({
        where: { ...userOrderWhere, status: { in: ['accepted', 'in_progress'] } },
        include: { listing: { select: { title: true, location: true, type: true } } },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.order.count({ where: { ...userOrderWhere, status: 'completed' } }),
    ]);

    const equipment = [];
    const nextActiveOrder = (index) => activeOrders[index % Math.max(1, activeOrders.length)] || null;

    if (user.balerProfile) {
      const bp = user.balerProfile;
      const count = bp.machineCount || 1;
      for (let i = 0; i < Math.min(count, 4); i++) {
        equipment.push(makeAsset({
          id: `baler-${i}`,
          type: 'Baler',
          subtype: bp.machineType || 'Square Baler',
          location: bp.district || 'Field',
          icon: '🚜',
          index: i,
          activeOrder: i < activeOrders.length ? nextActiveOrder(i) : null,
          completedJobs,
        }));
      }
    }

    if (user.moverProfile) {
      const mp = user.moverProfile;
      const count = mp.vehicleCount || 1;
      for (let i = 0; i < Math.min(count, 4); i++) {
        equipment.push(makeAsset({
          id: `vehicle-${i}`,
          type: mp.vehicleType || 'Truck',
          subtype: 'Transport Vehicle',
          location: mp.district || 'Field',
          icon: '🚛',
          index: i + equipment.length,
          activeOrder: i < activeOrders.length ? nextActiveOrder(i) : null,
          completedJobs,
        }));
      }
    }

    if (user.farmerProfile) {
      equipment.push(makeAsset({
        id: 'farm-tractor',
        type: 'Tractor',
        subtype: 'Farm Equipment',
        location: user.farmerProfile.village || user.farmerProfile.district || 'Farm',
        icon: '🚜',
        index: equipment.length,
        activeOrder: activeOrders[0] || null,
        completedJobs,
      }));
    }

    // Default if no profile yet
    if (equipment.length === 0) {
      equipment.push(makeAsset({
        id: 'eq1',
        type: 'Baler',
        subtype: 'Square Baler',
        location: 'Punjab',
        icon: '🚜',
        index: 0,
        activeOrder: activeOrders[0] || null,
        completedJobs,
      }));
      equipment.push(makeAsset({
        id: 'eq2',
        type: 'Tractor',
        subtype: 'Farm Tractor',
        location: 'Punjab',
        icon: '🚜',
        index: 1,
        activeOrder: activeOrders[1] || null,
        completedJobs,
      }));
    }

    const workingCount = equipment.filter(eq => eq.status === 'working').length;
    const maintenanceCount = equipment.filter(eq => eq.status === 'maintenance').length;
    const utilization = equipment.length > 0 ? Math.round((workingCount / equipment.length) * 100) : 0;

    // AI health assessment
    let aiSummary = '';
    try {
      if (!client) throw new Error('AI key not configured');
      const eqDesc = equipment.map(e => `${e.type} ${e.status} (condition ${e.condition.toFixed(1)}/10${e.activeJobTitle ? `, assigned to ${e.activeJobTitle}` : ''})`).join(', ');
      const msg = await withRetry(() => client.messages.create({
        model: MODEL, max_tokens: 80,
        messages: [{ role: 'user', content: `Agricultural equipment in Punjab: ${eqDesc}. Active jobs: ${activeOrders.length}. Give ONE short maintenance/logistics tip in plain English. No markdown, no headers, no asterisks. Max 14 words.` }]
      }));
      aiSummary = msg.content[0].text.trim();
    } catch (_) {
      aiSummary = buildFallbackMaintenanceTip(equipment, activeOrders.length);
    }

    res.json({
      equipment,
      aiSummary,
      logistics: {
        activeJobs: activeOrders.length,
        completedJobs,
        workingCount,
        maintenanceCount,
        utilization,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Equipment error:', err.message);
    res.status(500).json({ error: 'Failed to load equipment data' });
  }
};
