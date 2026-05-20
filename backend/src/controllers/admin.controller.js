const prisma = require('../utils/prisma');

const ADMIN_TIME_ZONE = process.env.DASHBOARD_TIME_ZONE || 'Asia/Kolkata';

const PROFILE_INCLUDE = {
  farmerProfile: true,
  industryProfile: true,
  balerProfile: true,
  moverProfile: true,
  documents: true,
};

function getDateParts(date, timeZone = ADMIN_TIME_ZONE) {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-IN', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(date)).map(part => [part.type, part.value])
  );
}

function dateKey(date, timeZone = ADMIN_TIME_ZONE) {
  const parts = getDateParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function dayLabel(date, timeZone = ADMIN_TIME_ZONE) {
  return new Intl.DateTimeFormat('en-IN', { timeZone, weekday: 'short' }).format(new Date(date));
}

function makeLastSevenDays() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { key: dateKey(d), day: dayLabel(d) };
  });
}

function getProfile(user) {
  return user.farmerProfile || user.industryProfile || user.balerProfile || user.moverProfile || null;
}

function displayName(user) {
  const profile = getProfile(user);
  return user.name || profile?.fullName || profile?.companyName || profile?.contactPerson || user.phone;
}

function publicUser(user) {
  const { otpCodes, ...safe } = user;
  return safe;
}

function money(order) {
  return Math.max(0, Number(order.agreedPrice || 0));
}

function relativeTime(date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.max(0, Math.round(diffMs / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

// GET /api/admin/applications  – list all pending/all users
async function listApplications(req, res) {
  try {
    const { status, role, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (role && role !== 'admin') where.role = role;
    else where.role = { not: 'admin' };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: PROFILE_INCLUDE,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('listApplications error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/admin/applications/:id
async function getApplication(req, res) {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: { ...PROFILE_INCLUDE, aadhaarVerification: true },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error('getApplication error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// PUT /api/admin/applications/:id/approve
async function approveApplication(req, res) {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: { status: 'approved', adminNotes: notes || null },
    });

    res.json({ message: 'Application approved', user });
  } catch (err) {
    console.error('approveApplication error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// PUT /api/admin/applications/:id/reject
async function rejectApplication(req, res) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    // notes are optional for quick reject from the list view

    const user = await prisma.user.update({
      where: { id },
      data: { status: 'rejected', adminNotes: notes },
    });

    res.json({ message: 'Application rejected', user });
  } catch (err) {
    console.error('rejectApplication error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/admin/stats
async function getStats(req, res) {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);

    const [
      total,
      pending,
      approved,
      rejected,
      byRole,
      users7,
      decided7,
      orders,
      activeListings,
      demandCount,
      supplyCount,
      jobCount,
      topCropsRaw,
      profileRows,
      activityFeed,
    ] = await Promise.all([
      prisma.user.count({ where: { role: { not: 'admin' } } }),
      prisma.user.count({ where: { status: 'pending', role: { not: 'admin' } } }),
      prisma.user.count({ where: { status: 'approved', role: { not: 'admin' } } }),
      prisma.user.count({ where: { status: 'rejected', role: { not: 'admin' } } }),
      prisma.user.groupBy({
        by: ['role'],
        where: { role: { not: 'admin' } },
        _count: { id: true },
      }),
      prisma.user.findMany({
        where: { role: { not: 'admin' }, createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      prisma.user.findMany({
        where: { role: { not: 'admin' }, status: { in: ['approved', 'rejected'] }, updatedAt: { gte: since } },
        select: { status: true, updatedAt: true },
      }),
      prisma.order.findMany({
        where: { status: 'completed' },
        include: { listing: { select: { type: true, cropType: true, title: true } } },
        orderBy: { completedAt: 'desc' },
      }),
      prisma.listing.count({ where: { status: 'active' } }),
      prisma.listing.count({ where: { status: 'active', type: 'demand' } }),
      prisma.listing.count({ where: { status: 'active', type: 'supply' } }),
      prisma.listing.count({ where: { status: 'active', type: 'job' } }),
      prisma.listing.groupBy({
        by: ['cropType'],
        where: { cropType: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
      prisma.user.findMany({
        where: { role: { not: 'admin' } },
        include: {
          farmerProfile: { select: { district: true, state: true } },
          industryProfile: { select: { district: true, state: true } },
          balerProfile: { select: { district: true, state: true } },
          moverProfile: { select: { district: true, state: true } },
        },
      }),
      getActivityItems(8),
    ]);

    const growthMap = new Map(makeLastSevenDays().map(row => [row.key, { ...row, users: 0 }]));
    users7.forEach(user => {
      const key = dateKey(user.createdAt);
      const row = growthMap.get(key);
      if (row) row.users += 1;
    });

    const decisionsMap = new Map(makeLastSevenDays().map(row => [row.key, { ...row, approved: 0, rejected: 0 }]));
    decided7.forEach(user => {
      const key = dateKey(user.updatedAt);
      const row = decisionsMap.get(key);
      if (row && user.status in row) row[user.status] += 1;
    });

    const revenue = orders.reduce((sum, order) => sum + money(order), 0);
    const avgOrderValue = orders.length ? Math.round(revenue / orders.length) : 0;
    const districtCounts = {};
    profileRows.forEach(user => {
      const profile = getProfile(user);
      const district = profile?.district || 'Unassigned';
      districtCounts[district] = (districtCounts[district] || 0) + 1;
    });

    res.json({
      total,
      pending,
      approved,
      rejected,
      byRole,
      revenue,
      totalOrders: orders.length,
      completedOrders: orders.length,
      avgOrderValue,
      activeListings,
      demandCount,
      supplyCount,
      jobCount,
      growth: Array.from(growthMap.values()),
      decisions: Array.from(decisionsMap.values()),
      topCrops: topCropsRaw.map(row => ({ crop: row.cropType, count: row._count.id })),
      districtActivity: Object.entries(districtCounts)
        .map(([district, count]) => ({ district, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      activityFeed,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    console.error('getStats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function listUsers(req, res) {
  try {
    const { status, role, q = '', page = 1, limit = 50 } = req.query;
    const where = { role: { not: 'admin' } };
    if (status) where.status = status;
    if (role && role !== 'all') where.role = role;
    if (q.trim()) {
      where.OR = [
        { name: { contains: q.trim(), mode: 'insensitive' } },
        { phone: { contains: q.trim() } },
        { email: { contains: q.trim(), mode: 'insensitive' } },
      ];
    }

    const take = Math.min(parseInt(limit) || 50, 100);
    const skip = ((parseInt(page) || 1) - 1) * take;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        include: {
          ...PROFILE_INCLUDE,
          _count: {
            select: {
              listings: true,
              ordersAsClient: true,
              ordersAsWorker: true,
              documents: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users: users.map(publicUser), total, page: parseInt(page) || 1, limit: take });
  } catch (err) {
    console.error('listUsers error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function getActivityItems(limit = 20) {
  const [users, orders, listings] = await Promise.all([
    prisma.user.findMany({
      where: { role: { not: 'admin' } },
      include: PROFILE_INCLUDE,
      orderBy: { updatedAt: 'desc' },
      take: limit,
    }),
    prisma.order.findMany({
      include: {
        listing: { select: { title: true, type: true, cropType: true } },
        client: { select: { name: true, phone: true } },
        worker: { select: { name: true, phone: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    }),
    prisma.listing.findMany({
      include: { user: { select: { name: true, phone: true, role: true } } },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    }),
  ]);

  const userEvents = users.map(user => ({
    id: `user-${user.id}`,
    type: user.status === 'approved' ? 'success' : user.status === 'rejected' ? 'error' : 'info',
    icon: user.status === 'approved' ? '✅' : user.status === 'rejected' ? '🚫' : '📝',
    action: user.status === 'pending' ? 'Profile awaiting review' : `User ${user.status}`,
    target: `${displayName(user)} (${user.role})`,
    admin: user.adminNotes ? 'Admin' : 'System',
    at: user.updatedAt,
    time: relativeTime(user.updatedAt),
  }));

  const orderEvents = orders.map(order => ({
    id: `order-${order.id}`,
    type: order.status === 'completed' ? 'success' : order.status === 'cancelled' ? 'error' : 'warning',
    icon: order.status === 'completed' ? '💰' : order.status === 'cancelled' ? '✕' : '📦',
    action: `Order ${order.status.replace('_', ' ')}`,
    target: `${order.listing?.title || 'Order'} · ₹${money(order).toLocaleString('en-IN')}`,
    admin: order.worker?.name || order.client?.name || 'Marketplace',
    at: order.updatedAt,
    time: relativeTime(order.updatedAt),
  }));

  const listingEvents = listings.map(listing => ({
    id: `listing-${listing.id}`,
    type: listing.status === 'active' ? 'info' : 'success',
    icon: listing.type === 'demand' ? '🔥' : listing.type === 'supply' ? '🌾' : '🚛',
    action: `Listing ${listing.status}`,
    target: listing.title,
    admin: listing.user?.name || listing.user?.phone || 'User',
    at: listing.updatedAt,
    time: relativeTime(listing.updatedAt),
  }));

  return [...userEvents, ...orderEvents, ...listingEvents]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, limit);
}

async function getActivity(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 25, 100);
    res.json({ activity: await getActivityItems(limit) });
  } catch (err) {
    console.error('getActivity error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function sendNotification(req, res) {
  try {
    const { title, message, type = 'info', role = 'all', status = 'approved' } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'Title and message are required' });

    const where = { role: { not: 'admin' } };
    if (role && role !== 'all') where.role = role;
    if (status && status !== 'all') where.status = status;

    const users = await prisma.user.findMany({ where, select: { id: true } });
    if (users.length === 0) return res.json({ message: 'No matching users found', count: 0 });

    await prisma.notification.createMany({
      data: users.map(user => ({ userId: user.id, title, message, type })),
    });

    res.status(201).json({ message: 'Notification queued', count: users.length });
  } catch (err) {
    console.error('sendNotification error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function createAdmin(req, res) {
  try {
    const { phone, name, email } = req.body;
    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Valid 10-digit phone number required' });
    }

    const admin = await prisma.user.upsert({
      where: { phone },
      update: { role: 'admin', status: 'approved', name: name || undefined, email: email || undefined },
      create: { phone, name: name || 'Admin User', email: email || null, role: 'admin', status: 'approved' },
    });

    res.status(201).json({ message: 'Admin account ready', admin: publicUser(admin) });
  } catch (err) {
    console.error('createAdmin error:', err);
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email or phone already exists' });
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  listApplications,
  getApplication,
  approveApplication,
  rejectApplication,
  getStats,
  listUsers,
  getActivity,
  sendNotification,
  createAdmin,
};
