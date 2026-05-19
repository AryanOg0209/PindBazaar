// Simulated backend delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const FEED_DATA = {
  farmer: [
    { id: 1, type: 'demand', title: 'Wheat stubble needed', loc: 'Ludhiana, 12km', price: '₹2,500/ton', tag: 'High Demand', time: '10m ago' },
    { id: 2, type: 'match', title: 'Square Baler available', loc: 'Sangrur, 5km', name: 'Harjinder Singh', rating: '4.8 ⭐', time: '1h ago' },
    { id: 3, type: 'demand', title: 'Paddy straw buying', loc: 'Moga, 20km', price: '₹3,000/ton', time: '3h ago' }
  ],
  baler: [
    { id: 1, type: 'request', title: 'Baling needed - 15 acres', loc: 'Moga, 8km', date: 'Tomorrow, 9 AM', crop: 'Paddy', time: '5m ago' },
    { id: 2, type: 'demand', title: 'Biomass plant buying', loc: 'Bathinda, 45km', price: '₹3,200/ton', tag: 'Premium Rate', time: '2h ago' },
  ],
  industry: [
    { id: 1, type: 'supply', title: 'Ready Paddy Bales (50t)', loc: 'Faridkot, 22km', quality: 'Grade A', seller: 'Gurpreet S.', time: 'Just now' },
    { id: 2, type: 'transit', title: 'Truck PB10-XY-1234', loc: 'En route to plant', status: 'Arriving in 45 mins', time: 'Update' },
  ],
  mover: [
    { id: 1, type: 'job', title: 'Transport 20t bales', loc: 'Mansa → Bathinda', distance: '65km', pay: '₹4,500', time: '12m ago' },
    { id: 2, type: 'job', title: 'Transport 12t loose biomass', loc: 'Barnala → Sangrur', distance: '32km', pay: '₹2,100', time: '1h ago' },
  ]
};

const STATS_DATA = {
  farmer:   [{ l: 'Active Listings', v: '2' }, { l: 'Pending Orders', v: '1' }, { l: 'Total Earned', v: '₹42K' }],
  baler:    [{ l: 'Jobs Done', v: '18' }, { l: 'Upcoming Jobs', v: '4' }, { l: 'Revenue', v: '₹84K' }],
  industry: [{ l: 'Active Contracts', v: '5' }, { l: 'Pending Delivery', v: '120t' }, { l: 'Spent', v: '₹3.2L' }],
  mover:    [{ l: 'Trips Completed', v: '32' }, { l: 'Active Jobs', v: '1' }, { l: 'Earnings', v: '₹68K' }],
};

const CHART_DATA = {
  weekly: [
    { day: 'Mon', value: 800 }, { day: 'Tue', value: 1200 }, { day: 'Wed', value: 800 },
    { day: 'Thu', value: 2500 }, { day: 'Fri', value: 1800 }, { day: 'Sat', value: 3400 }, { day: 'Sun', value: 4100 }
  ],
  monthly: [
    { day: 'W1', value: 12000 }, { day: 'W2', value: 15400 }, { day: 'W3', value: 9800 }, { day: 'W4', value: 18200 }
  ]
};

import { fetchListings } from './marketApi';

export const fetchDashboardData = async (role = 'farmer', filters = {}) => {
  await delay(800); // Simulate network latency for chart

  let realFeed = [];
  try {
    const data = await fetchListings(filters);
    realFeed = data.map(item => ({
      id: item.id,
      type: item.type,
      title: item.title,
      loc: item.location,
      price: item.price ? `₹${item.price}` : null,
      rawPrice: item.price ? Number(item.price) : null,
      name: item.user?.name,
      userId: item.userId,
      rating: '4.8 ⭐',
      time: 'Just now'
    }));
  } catch (e) {
    console.error('Failed to fetch real market feed', e);
  }

  return {
    metrics: STATS_DATA[role] || STATS_DATA.farmer,
    feed: realFeed.length > 0 ? realFeed : (FEED_DATA[role] || FEED_DATA.farmer),
    earnings: {
      totalWeekly: '₹14,600',
      totalMonthly: '₹55,400',
      weeklyTrend: '+14%',
      monthlyTrend: '+8%',
      chart: CHART_DATA
    },
    trust: {
      score: 98,
      rating: 4.8,
      reviews: 24
    }
  };
};
