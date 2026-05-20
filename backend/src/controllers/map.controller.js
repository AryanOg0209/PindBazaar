const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Punjab/Haryana district coordinates
const DISTRICT_COORDS = {
  'Amritsar':        [31.6340, 74.8723], 'Ludhiana':        [30.9010, 75.8573],
  'Jalandhar':       [31.3260, 75.5762], 'Patiala':         [30.3398, 76.3869],
  'Bathinda':        [30.2110, 74.9455], 'Mohali':          [30.7046, 76.7179],
  'Gurdaspur':       [32.0396, 75.4066], 'Hoshiarpur':      [31.5143, 75.9115],
  'Firozpur':        [30.9253, 74.6037], 'Faridkot':        [30.6744, 74.7584],
  'Moga':            [30.8182, 75.1683], 'Muktsar':         [30.4742, 74.5176],
  'Sangrur':         [30.2455, 75.8375], 'Barnala':         [30.3783, 75.5451],
  'Fatehgarh Sahib': [30.6489, 76.3906], 'Kapurthala':      [31.3809, 75.3800],
  'Nawanshahr':      [31.1234, 76.1179], 'Mansa':           [29.9877, 75.3961],
  'Pathankot':       [32.2643, 75.6421], 'Rupnagar':        [30.9747, 76.5249],
  'Tarn Taran':      [31.4519, 74.9271], 'Fazilka':         [30.4012, 74.0224],
  'SAS Nagar':       [30.7046, 76.7179], 'Sri Muktsar Sahib': [30.4742, 74.5176],
  // Haryana
  'Ambala':          [30.3782, 76.7767], 'Kurukshetra':     [29.9695, 76.8783],
  'Karnal':          [29.6857, 76.9905], 'Panipat':         [29.3909, 76.9635],
  'Hisar':           [29.1492, 75.7217], 'Rohtak':          [28.8955, 76.6066],
  'Sirsa':           [29.5344, 75.0280], 'Fatehabad':       [29.5157, 75.4518],
  'Kaithal':         [29.8014, 76.3998], 'Jind':            [29.3159, 76.3145],
  'Sonipat':         [28.9931, 77.0151], 'Yamunanagar':     [30.1290, 77.2674],
  'Bhiwani':         [28.7975, 76.1322], 'Rewari':          [28.1977, 76.6183],
  'Mahendragarh':    [28.2690, 76.1511], 'Jhajjar':         [28.6080, 76.6560],
};

function getCoords(locationStr) {
  if (!locationStr) return null;
  const loc = locationStr.toLowerCase();
  for (const [district, coords] of Object.entries(DISTRICT_COORDS)) {
    if (loc.includes(district.toLowerCase())) return coords;
  }
  return null;
}

exports.getServices = async (req, res) => {
  try {
    const [listings, balerProfiles, moverProfiles] = await Promise.all([
      prisma.listing.findMany({
        where: { status: 'active' },
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        take: 120,
      }),
      prisma.balerProfile.findMany({
        include: { user: { select: { id: true, name: true, status: true } } },
      }),
      prisma.moverProfile.findMany({
        include: { user: { select: { id: true, name: true, status: true } } },
      }),
    ]);

    const pins = [];
    const jitter = () => (Math.random() - 0.5) * 0.05;

    listings.forEach(l => {
      const coords = getCoords(l.location);
      if (!coords) return;
      pins.push({
        id: l.id,
        type: 'listing',
        listingType: l.type,
        role: l.user.role,
        title: l.title,
        description: (l.description || '').slice(0, 120),
        price: l.price,
        cropType: l.cropType,
        location: l.location,
        userName: l.user.name,
        lat: coords[0] + jitter(),
        lng: coords[1] + jitter(),
      });
    });

    balerProfiles.forEach(b => {
      if (b.user.status !== 'approved') return;
      const coords = getCoords(b.district);
      if (!coords) return;
      pins.push({
        id: `baler-${b.id}`,
        type: 'provider',
        role: 'baler',
        title: `${b.machineCount}x ${b.machineType} Available`,
        description: `₹${b.pricePerBale}/bale • ${b.district}`,
        location: b.district,
        userName: b.user.name,
        lat: coords[0] + jitter(),
        lng: coords[1] + jitter(),
      });
    });

    moverProfiles.forEach(m => {
      if (m.user.status !== 'approved') return;
      const coords = getCoords(m.district);
      if (!coords) return;
      pins.push({
        id: `mover-${m.id}`,
        type: 'provider',
        role: 'mover',
        title: `${m.vehicleCount}x ${m.vehicleType} Available`,
        description: m.district,
        location: m.district,
        userName: m.user.name,
        lat: coords[0] + jitter(),
        lng: coords[1] + jitter(),
      });
    });

    res.json({ pins, total: pins.length });
  } catch (err) {
    console.error('Map services error:', err.message);
    res.status(500).json({ error: 'Failed to load map data' });
  }
};
