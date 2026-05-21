require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MODEL = 'claude-sonnet-4-6';
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Retry helper with exponential backoff ──
async function callWithRetry(fn, retries = 3, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const isRetryable = err.status === 529 || err.status === 503 || err.status === 429;
      if (isRetryable && i < retries - 1) {
        const wait = delayMs * Math.pow(2, i);
        console.log(`Claude overloaded (${err.status}), retrying in ${wait}ms...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      console.error(`[AI] Claude API error: status=${err.status} message=${err.message}`);
      throw err;
    }
  }
}

// ── JSON extractor ──
function extractJSON(text) {
  try { return JSON.parse(text.trim()); } catch (_) {}
  const stripped = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try { return JSON.parse(stripped); } catch (_) {}
  const match = stripped.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (match) try { return JSON.parse(match[0]); } catch (_) {}
  throw new Error('No valid JSON in AI response');
}

// ── Fallback crop data when AI is unavailable ──
const CROP_FALLBACK = {
  Wheat:     { currentPrice: '₹2,275/quintal', predictedPrice: '₹2,450/quintal', trend: 'bullish', confidence: 72, factors: ['Government MSP increase', 'Export demand rising', 'Lower acreage this season'], advice: 'Hold stock till November for better prices.', bestMonthToSell: 'November', riskLevel: 'low' },
  Paddy:     { currentPrice: '₹2,183/quintal', predictedPrice: '₹2,100/quintal', trend: 'bearish', confidence: 68, factors: ['Surplus production in Punjab', 'Export restrictions', 'High moisture content in current crop'], advice: 'Sell at MSP immediately after harvest to avoid losses.', bestMonthToSell: 'October', riskLevel: 'medium' },
  Sugarcane: { currentPrice: '₹350/quintal', predictedPrice: '₹370/quintal', trend: 'bullish', confidence: 75, factors: ['Mill demand increasing', 'State SAP raised by ₹20', 'Crushing season starting'], advice: 'Deliver directly to mills to get full SAP price.', bestMonthToSell: 'December', riskLevel: 'low' },
  Cotton:    { currentPrice: '₹6,500/quintal', predictedPrice: '₹7,200/quintal', trend: 'bullish', confidence: 70, factors: ['Global cotton demand up', 'Pink bollworm under control this year', 'MSP raised to ₹6,620'], advice: 'Store till January for 10-15% higher prices.', bestMonthToSell: 'January', riskLevel: 'medium' },
  Mustard:   { currentPrice: '₹5,650/quintal', predictedPrice: '₹5,900/quintal', trend: 'bullish', confidence: 74, factors: ['Edible oil demand rising', 'Lower imports due to rupee depreciation', 'Rabi acreage normal'], advice: 'Sell 50% at harvest, hold rest for March rally.', bestMonthToSell: 'March', riskLevel: 'low' },
  Maize:     { currentPrice: '₹2,090/quintal', predictedPrice: '₹2,250/quintal', trend: 'bullish', confidence: 65, factors: ['Poultry feed demand strong', 'Ethanol blending program boost', 'Below normal kharif output'], advice: 'Sell in February when starch factories have peak demand.', bestMonthToSell: 'February', riskLevel: 'medium' },
  Barley:    { currentPrice: '₹1,780/quintal', predictedPrice: '₹1,850/quintal', trend: 'bullish', confidence: 62, factors: ['Brewery demand steady', 'Malt exports increasing', 'Normal rabi sowing expected'], advice: 'Sell directly to malteries for 8-10% premium.', bestMonthToSell: 'April', riskLevel: 'low' },
  Soybean:   { currentPrice: '₹4,200/quintal', predictedPrice: '₹4,500/quintal', trend: 'bullish', confidence: 69, factors: ['Protein meal export demand', 'Monsoon impact on yield', 'Edible oil import reduction'], advice: 'Crush locally if possible for better margin.', bestMonthToSell: 'January', riskLevel: 'medium' },
};

// ────────────────────────────────────────────────────────────
// CROP PRICE PREDICTION
// ────────────────────────────────────────────────────────────
exports.cropPrediction = async (req, res) => {
  const { crop, district, season } = req.body;
  if (!crop) return res.status(400).json({ error: 'Crop name is required' });

  try {
    const json = await callWithRetry(async () => {
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Agricultural market analyst for Punjab/Haryana India. Give price prediction for ${crop} in ${district || 'Punjab'} for ${season || 'current season 2024'}.
Return ONLY valid JSON, no markdown:
{"crop":"${crop}","currentPrice":"₹XXXX/quintal","predictedPrice":"₹XXXX/quintal","trend":"bullish","confidence":75,"factors":["factor1","factor2","factor3"],"advice":"One sentence advice","bestMonthToSell":"MonthName","riskLevel":"low"}`
        }]
      });
      return extractJSON(message.content[0].text);
    });
    res.json({ ...json, source: 'ai' });
  } catch (err) {
    console.error('Crop prediction AI error:', err.status, err.message);
    // Return fallback data with a flag so frontend can show it gracefully
    const fallback = CROP_FALLBACK[crop];
    if (fallback) {
      return res.json({ ...fallback, crop, source: 'fallback', note: 'AI temporarily unavailable — showing estimated market data.' });
    }
    res.status(500).json({ error: 'AI service temporarily overloaded. Please try again in a moment.' });
  }
};

// ────────────────────────────────────────────────────────────
// SMART JOB MATCHING
// ────────────────────────────────────────────────────────────
exports.jobMatch = async (req, res) => {
  const userId = req.user.id;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { farmerProfile: true, balerProfile: true, moverProfile: true, industryProfile: true }
    });

    const pastOrders = await prisma.order.findMany({
      where: { workerId: userId, status: 'completed' },
      include: { listing: { select: { type: true, cropType: true, location: true, price: true } } },
      orderBy: { completedAt: 'desc' },
      take: 10
    });

    const activeListings = await prisma.listing.findMany({
      where: { status: 'active', userId: { not: userId } },
      include: { user: { select: { name: true, role: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
      take: 30
    });

    if (activeListings.length === 0) {
      return res.json({ matches: [], reason: 'No active listings in the marketplace right now.' });
    }

    // ── Algorithmic pre-scoring ──
    const profile = user.balerProfile || user.moverProfile || user.farmerProfile || user.industryProfile;
    const userDistrict = (profile?.district || '').toLowerCase();
    const userCrops    = user.farmerProfile?.cropTypes?.map(c => c.toLowerCase()) || [];
    const userRole     = user.role;

    const roleCompatibility = {
      baler:    ['demand', 'job'],
      mover:    ['demand', 'job'],
      farmer:   ['supply', 'demand'],
      industry: ['supply', 'demand'],
    };
    const compatibleTypes = roleCompatibility[userRole] || ['demand','supply','job'];

    const pastCrops     = pastOrders.map(o => o.listing?.cropType?.toLowerCase()).filter(Boolean);
    const pastLocations = pastOrders.map(o => o.listing?.location?.toLowerCase()).filter(Boolean);
    const avgPastPrice  = pastOrders.length > 0
      ? pastOrders.reduce((s, o) => s + Number(o.listing?.price || 0), 0) / pastOrders.length : 0;

    const scored = activeListings.map(l => {
      let score = 0;
      const loc  = l.location?.toLowerCase() || '';
      const crop = l.cropType?.toLowerCase() || '';
      const price = Number(l.price || 0);

      if (compatibleTypes.includes(l.type))                                    score += 40;
      if (userDistrict && loc.includes(userDistrict))                          score += 25;
      if (pastLocations.some(pl => loc.includes(pl.split(',')[0])))            score += 10;
      if (userCrops.some(c => crop.includes(c) || c.includes(crop)))           score += 15;
      if (pastCrops.includes(crop))                                             score += 10;
      if (avgPastPrice > 0 && price > 0) {
        const ratio = price / avgPastPrice;
        if (ratio >= 0.5 && ratio <= 2.0)                                       score += 10;
      }
      return { listing: l, algoScore: Math.min(100, score) };
    });

    const topCandidates = scored.sort((a, b) => b.algoScore - a.algoScore).slice(0, 8);

    // ── AI re-ranking (with retry + fallback) ──
    try {
      const profile = user.balerProfile || user.moverProfile || user.farmerProfile || user.industryProfile;
      const profileDesc = [
        `Role: ${userRole}`,
        user.balerProfile  ? `Baler: ${user.balerProfile.machineCount}x ${user.balerProfile.machineType}, district: ${user.balerProfile.district}` : '',
        user.moverProfile  ? `Mover: ${user.moverProfile.vehicleCount}x ${user.moverProfile.vehicleType}, district: ${user.moverProfile.district}` : '',
        user.farmerProfile ? `Farmer: ${user.farmerProfile.landAcres} acres in ${user.farmerProfile.district}, crops: ${user.farmerProfile.cropTypes?.join(', ')}` : '',
        user.industryProfile ? `Industry: ${user.industryProfile.companyName}, ${user.industryProfile.industryType}, ${user.industryProfile.district}` : '',
        `Completed jobs: ${pastOrders.length}`,
        pastCrops.length ? `Past crops: ${[...new Set(pastCrops)].join(', ')}` : '',
      ].filter(Boolean).join('\n');

      const candidatesText = topCandidates.map((c, i) =>
        `${i}|${c.listing.type}|"${c.listing.title}"|${c.listing.cropType||'N/A'}|${c.listing.location}|₹${c.listing.price||'neg'}|${c.listing.user.role}|algo:${c.algoScore}%`
      ).join('\n');

      const parsed = await callWithRetry(async () => {
        const msg = await client.messages.create({
          model: MODEL,
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: `Job matching AI for PindBazaar. User: ${profileDesc}\nCandidates (index|type|title|crop|loc|price|role|score):\n${candidatesText}\nPick best 4, give personalized 1-sentence reason each.\nReturn ONLY JSON: {"matches":[{"index":0,"matchScore":90,"reason":"..."}]}`
          }]
        });
        return extractJSON(msg.content[0].text);
      });

      const result = parsed.matches
        .map(m => {
          const c = topCandidates[m.index];
          return c ? { ...c.listing, matchScore: m.matchScore, matchReason: m.reason, algoScore: c.algoScore } : null;
        })
        .filter(Boolean);

      return res.json({ matches: result, source: 'ai' });
    } catch (aiErr) {
      console.error('AI re-rank failed, using algo scores:', aiErr.status);
      // Fallback: just return top 4 by algo score with generic reasons
      const fallbackReasons = {
        baler:    'Good match based on your baling equipment and location.',
        mover:    'Your transport capacity fits this job perfectly.',
        farmer:   'This listing matches your crop and land profile.',
        industry: 'Suitable supply for your industry requirements.',
      };
      const result = topCandidates.slice(0, 4).map(c => ({
        ...c.listing,
        matchScore: c.algoScore,
        matchReason: fallbackReasons[userRole] || 'Compatible with your profile.',
        algoScore: c.algoScore
      }));
      return res.json({ matches: result, source: 'algo', note: 'AI temporarily unavailable — showing algorithm-matched results.' });
    }
  } catch (err) {
    console.error('Job match error:', err.message);
    res.status(500).json({ error: 'Job matching failed: ' + err.message });
  }
};

// ────────────────────────────────────────────────────────────
// CROP ADVISOR CHAT
// ────────────────────────────────────────────────────────────
exports.cropAdvisor = async (req, res) => {
  const { message: userMessage, history = [] } = req.body;
  if (!userMessage) return res.status(400).json({ error: 'Message is required' });
  try {
    const response = await callWithRetry(async () => client.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: `You are "Kisan AI", a friendly agricultural advisor for Punjab and Haryana farmers. Help with crops, pest control, fertiliser, market timing, government schemes (PM-Kisan, MSP, eNAM). Reply in Hinglish if user writes Hinglish. Be concise and practical. Use • for bullet points.`,
      messages: [...history.slice(-6), { role: 'user', content: userMessage }]
    }));
    res.json({ reply: response.content[0].text });
  } catch (err) {
    console.error('Advisor error:', err.status, err.message);
    res.status(503).json({ error: 'AI advisor is temporarily busy. Please try again in a moment.' });
  }
};

// ────────────────────────────────────────────────────────────
// EARNINGS SUMMARY
// ────────────────────────────────────────────────────────────
exports.earningsSummary = async (req, res) => {
  const userId = req.user.id;
  try {
    const orders = await prisma.order.findMany({
      where: { workerId: userId, status: 'completed' },
      include: { listing: { select: { title: true, type: true, cropType: true } } },
      orderBy: { completedAt: 'desc' }
    });

    const total = orders.reduce((s, o) => s + Number(o.agreedPrice), 0);
    const avg   = orders.length > 0 ? Math.round(total / orders.length) : 0;

    const monthly = {};
    orders.forEach(o => {
      const month = new Date(o.completedAt || o.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      monthly[month] = (monthly[month] || 0) + Number(o.agreedPrice);
    });

    const monthlyArr = Object.entries(monthly).map(([month, amount]) => ({ month, amount }));
    const bestMonth  = monthlyArr.reduce((a, b) => a.amount > b.amount ? a : b, { month: null, amount: 0 });

    let aiInsight = null;
    if (orders.length > 0) {
      try {
        const msg = await callWithRetry(async () => client.messages.create({
          model: MODEL,
          max_tokens: 150,
          messages: [{ role: 'user', content: `Worker: ${orders.length} jobs, ₹${total} total, ₹${avg} avg. Write 2 short, actionable business insights. Plain text.` }]
        }));
        aiInsight = msg.content[0].text;
      } catch (_) {
        aiInsight = `You've completed ${orders.length} job${orders.length > 1 ? 's' : ''} earning ₹${total.toLocaleString()} total. Your average of ₹${avg.toLocaleString()} per job is strong — keep accepting regular work to grow your income.`;
      }
    }

    res.json({ totalEarnings: total, ordersCount: orders.length, avgOrderValue: avg, bestMonth: bestMonth.month, monthlyBreakdown: monthlyArr, aiInsight });
  } catch (err) {
    console.error('Earnings error:', err.message);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

// ────────────────────────────────────────────────────────────
// MARKET INSIGHTS
// ────────────────────────────────────────────────────────────
exports.marketInsights = async (req, res) => {
  try {
    const [totalListings, demandCount, supplyCount, jobCount, recentListings, recentOrders] = await Promise.all([
      prisma.listing.count({ where: { status: 'active' } }),
      prisma.listing.count({ where: { status: 'active', type: 'demand' } }),
      prisma.listing.count({ where: { status: 'active', type: 'supply' } }),
      prisma.listing.count({ where: { status: 'active', type: 'job' } }),
      prisma.listing.findMany({ where: { status: 'active' }, take: 20, include: { user: { select: { role: true, name: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.order.findMany({ where: { status: 'completed' }, take: 20, orderBy: { completedAt: 'desc' } }),
    ]);

    const cropCounts = {};
    recentListings.forEach(l => { if (l.cropType) cropCounts[l.cropType] = (cropCounts[l.cropType] || 0) + 1; });
    const topCrops = Object.entries(cropCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([crop, count]) => ({ crop, count }));

    const avgOrderVal = recentOrders.length > 0
      ? Math.round(recentOrders.reduce((s, o) => s + Number(o.agreedPrice), 0) / recentOrders.length) : 0;

    let aiAnalysis = '';
    try {
      const context = `Punjab/Haryana market: ${totalListings} active listings (${demandCount} demands, ${supplyCount} supplies, ${jobCount} jobs). Top crops: ${topCrops.map(c => c.crop).join(', ')}. Avg job: ₹${avgOrderVal}.`;
      const msg = await callWithRetry(async () => client.messages.create({
        model: MODEL,
        max_tokens: 250,
        messages: [{ role: 'user', content: `Agricultural marketplace analyst. Context: ${context}\nWrite 3 short bullet-point market insights for farmers and service providers. Use • for bullets.` }]
      }));
      aiAnalysis = msg.content[0].text;
    } catch (_) {
      aiAnalysis = `• Demand for baling services is highest in October-November post-harvest season.\n• Wheat and paddy dominate Punjab listings — diversifying to mustard can yield better margins.\n• Job values are rising as MSP rates increase annually — good time for service providers.`;
    }

    res.json({ totalListings, demandCount, supplyCount, jobCount, topCrops, avgOrderValue: avgOrderVal, aiAnalysis, completedDeals: recentOrders.length });
  } catch (err) {
    console.error('Market insights error:', err.message);
    res.status(500).json({ error: 'Failed to load market insights' });
  }
};

// ────────────────────────────────────────────────────────────
// CROP DISEASE SCANNER
// ────────────────────────────────────────────────────────────
exports.diagnoseCropDisease = async (req, res) => {
  const { imageBase64, mediaType } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'No image data provided' });

  try {
    const response = await callWithRetry(async () => client.messages.create({
      model: MODEL,
      max_tokens: 900,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageBase64 }
          },
          {
            type: 'text',
            text: `You are an expert agricultural disease diagnostician for Punjab and Haryana, India. Carefully analyze this crop image.

Return ONLY valid JSON, no markdown:
{
  "cropType": "wheat/rice/cotton/mustard/sugarcane/maize/other/unknown",
  "disease": "Exact disease name, or 'Healthy' if no disease detected",
  "severity": "none/mild/moderate/severe",
  "confidence": 85,
  "symptoms": ["visible symptom 1", "visible symptom 2"],
  "treatment": ["Immediate step 1", "Step 2", "Step 3"],
  "prevention": ["Prevention tip 1", "Prevention tip 2"],
  "urgency": "low/medium/high",
  "summary": "2-sentence plain-language summary for a Punjab farmer"
}

If image is not a crop or is unclear: set disease="Unable to analyze", confidence=0, urgency="low".`
          }
        ]
      }]
    }));

    const text = response.content[0].text.trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in Claude response');
    res.json({ ...JSON.parse(match[0]), source: 'ai' });
  } catch (err) {
    console.error('[AI] Disease diagnosis error:', err.status, err.message);
    res.status(500).json({ error: 'Diagnosis failed. Please try again.' });
  }
};

// ────────────────────────────────────────────────────────────
// AI LISTING GENERATOR
// ────────────────────────────────────────────────────────────
exports.generateListing = async (req, res) => {
  const { description, role, district } = req.body;
  if (!description) return res.status(400).json({ error: 'Description is required' });

  try {
    const json = await callWithRetry(async () => {
      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `You are a marketplace listing expert for PindBazaar, an agricultural marketplace in Punjab/Haryana India.

User (${role || 'farmer'} from ${district || 'Punjab'}) described: "${description}"

Generate a professional marketplace listing. Return ONLY valid JSON:
{
  "type": "demand or supply or job",
  "title": "Clear, specific listing title (max 60 chars)",
  "description": "Professional 2-3 sentence description with key details",
  "cropType": "Wheat/Paddy/Cotton/Mustard/Sugarcane/Maize/Barley/Soybean or empty string if not applicable",
  "quantity": 50,
  "price": 2500,
  "location": "Village/Area, District name",
  "priceReasoning": "One sentence explaining why this price is fair for current market"
}

Rules:
- type=supply if selling/offering, type=demand if buying/requesting, type=job if offering a service
- price should be realistic for Punjab/Haryana market rates in ₹
- quantity in metric tons for crops, acres for land work, count for vehicles
- location based on district: ${district || 'Punjab'}`
        }]
      });
      return extractJSON(msg.content[0].text);
    });
    res.json({ ...json, source: 'ai' });
  } catch (err) {
    console.error('[AI] Listing generator error:', err.status, err.message);
    res.status(500).json({ error: 'Listing generation failed. Please try again.' });
  }
};

// ────────────────────────────────────────────────────────────
// NEGOTIATION ADVISOR
// ────────────────────────────────────────────────────────────
exports.negotiationAdvice = async (req, res) => {
  const { listingTitle, listingPrice, cropType, location, listingType, userRole } = req.body;
  if (!listingTitle) return res.status(400).json({ error: 'Listing details required' });

  try {
    const json = await callWithRetry(async () => {
      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `You are a market negotiation advisor for PindBazaar, Punjab/Haryana agricultural marketplace.

Listing: "${listingTitle}"
Listed Price: ₹${listingPrice || 'Not specified'}
Crop/Material: ${cropType || 'General'}
Location: ${location || 'Punjab'}
Listing Type: ${listingType || 'demand'}
User Role: ${userRole || 'farmer'}

Analyze this deal and advise whether to accept, counter-offer, or skip.
Return ONLY valid JSON:
{
  "verdict": "accept or counter or skip",
  "fairPrice": 4500,
  "marketMin": 3800,
  "marketMax": 5200,
  "counterOffer": 4200,
  "confidence": 80,
  "reasoning": "2-3 sentence explanation of why this price is good/bad and what to do",
  "tip": "One practical negotiation tip for this specific deal"
}

verdict rules:
- "accept" if price is at or above fair market value
- "counter" if price is within 20% below fair value (negotiate up)
- "skip" if price is unrealistically low or deal looks unfavorable`
        }]
      });
      return extractJSON(msg.content[0].text);
    });
    res.json({ ...json, source: 'ai' });
  } catch (err) {
    console.error('[AI] Negotiation advice error:', err.status, err.message);
    res.status(500).json({ error: 'Could not get negotiation advice.' });
  }
};

// ────────────────────────────────────────────────────────────
// SMART ROUTE PLANNER (MOVER)
// ────────────────────────────────────────────────────────────
exports.routePlanner = async (req, res) => {
  const { stops, vehicleType, cargoType } = req.body;
  if (!stops || stops.length < 2) return res.status(400).json({ error: 'At least 2 stops required' });

  // Build a realistic fallback based on stop count and vehicle
  const buildRouteFallback = () => {
    const mileage = (vehicleType || '').includes('truck') ? 12 : 8;
    const estKm = stops.length * 28;
    const fuelCost = Math.round((estKm / mileage) * 90);
    const tollCost = stops.length > 2 ? 80 : 0;
    const earnings = Math.round(estKm * 55);
    return {
      optimizedOrder: stops.map(s => s.location),
      totalDistanceKm: estKm,
      estimatedHours: +(estKm / 45).toFixed(1),
      fuelCostRs: fuelCost,
      tollCostRs: tollCost,
      estimatedEarningsRs: earnings,
      profitRs: earnings - fuelCost - tollCost,
      routePlan: `Start from ${stops[0].location}, proceed via intermediate stops, deliver to ${stops[stops.length - 1].location}. Follow NH highways for best road conditions.`,
      driverTips: [
        'Depart early morning to avoid peak traffic and heat.',
        'Carry a spare tyre and basic toolkit for long routes.',
        'Check weight limits at each mandi entry point.',
      ],
      bestDepartureTime: '5:30 AM',
      warnings: ['Verify mandi timings before departure — some open only 7AM-2PM.'],
      source: 'fallback',
      note: 'AI temporarily busy — showing estimated route data.',
    };
  };

  try {
    const json = await callWithRetry(async () => {
      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 900,
        messages: [{
          role: 'user',
          content: `You are a route optimization expert for Punjab/Haryana agricultural logistics.

Vehicle: ${vehicleType || 'Tractor-Trolley'}
Cargo: ${cargoType || 'Agricultural goods'}
Stops in order: ${stops.map((s, i) => `${i + 1}. ${s.location} (${s.type})`).join(', ')}

Plan the optimal route and return ONLY valid JSON (no markdown):
{"optimizedOrder":["Location1","Location2"],"totalDistanceKm":85,"estimatedHours":3.5,"fuelCostRs":650,"tollCostRs":120,"estimatedEarningsRs":4500,"profitRs":3730,"routePlan":"Brief narrative of the route","driverTips":["Tip 1","Tip 2"],"bestDepartureTime":"6:00 AM","warnings":["Warning if any"]}

Use realistic Punjab/Haryana road distances, diesel ~₹90/L, mileage ~8km/L for tractor-trolley or ~12km/L for truck.`
        }]
      });
      return extractJSON(msg.content[0].text);
    });
    res.json({ ...json, source: 'ai' });
  } catch (err) {
    console.error('[AI] Route planner error:', err.status, err.message);
    return res.json(buildRouteFallback());
  }
};

// ────────────────────────────────────────────────────────────
// HARVEST & BALING WINDOW PREDICTOR (FARMER + BALER)
// ────────────────────────────────────────────────────────────
const HARVEST_FALLBACK = {
  Wheat:     { harvestWindowStart:'10 April', harvestWindowEnd:'30 April', peakHarvestDays:'15-25 April', balingWindowStart:'16 April', balingWindowEnd:'5 May', rainRisk:'low', expectedYieldTons:22, expectedResidueValueRs:14000, urgency:'medium', bestTimeToSellResidue:'Immediately after baling in April', harvestRecommendations:['Harvest when grain moisture is below 14%','Use combine harvester for best efficiency','Avoid harvesting during afternoon heat above 40°C'], balingRecommendations:['Bale within 24 hours of harvest for best quality residue','Target 18-20% moisture in straw for baling','Arrange baler booking at least 3 days in advance'] },
  Paddy:     { harvestWindowStart:'1 October', harvestWindowEnd:'20 October', peakHarvestDays:'5-15 October', balingWindowStart:'7 October', balingWindowEnd:'25 October', rainRisk:'medium', expectedYieldTons:18, expectedResidueValueRs:9000, urgency:'high', bestTimeToSellResidue:'October, before winter fog sets in', harvestRecommendations:['Drain field 10 days before harvest','Harvest at 20-22% grain moisture to prevent shattering','Check mandi procurement schedule before harvesting'], balingRecommendations:['Paddy straw dries slower — allow 2 extra days','Do not bale wet straw — risk of mold and fire','High demand from biogas plants in October-November'] },
  Sugarcane: { harvestWindowStart:'15 November', harvestWindowEnd:'28 February', peakHarvestDays:'December-January', balingWindowStart:'16 November', balingWindowEnd:'1 March', rainRisk:'low', expectedYieldTons:45, expectedResidueValueRs:8000, urgency:'low', bestTimeToSellResidue:'January-February when demand peaks', harvestRecommendations:['Harvest in cool morning hours for better sucrose content','Deliver to mill within 24 hours of cutting','Coordinate with mill for crushing slot booking'], balingRecommendations:['Trash/tops can be baled for cattle feed','Dry trash for 3-4 days before baling','Mills often buy back trash — check your nearest mill'] },
  Cotton:    { harvestWindowStart:'20 September', harvestWindowEnd:'30 November', peakHarvestDays:'October', balingWindowStart:'21 September', balingWindowEnd:'5 December', rainRisk:'medium', expectedYieldTons:8, expectedResidueValueRs:5000, urgency:'medium', bestTimeToSellResidue:'October-November', harvestRecommendations:['Pick when 60% bolls are open','Multiple picking rounds — 3-4 pickings typically','Store picked cotton away from moisture'], balingRecommendations:['Cotton stalks are valuable for paper mills','Chop and bale stalks after final picking','Book baler 1 week in advance — high demand in cotton belt'] },
  Mustard:   { harvestWindowStart:'1 March', harvestWindowEnd:'20 March', peakHarvestDays:'5-15 March', balingWindowStart:'3 March', balingWindowEnd:'25 March', rainRisk:'low', expectedYieldTons:6, expectedResidueValueRs:4000, urgency:'medium', bestTimeToSellResidue:'March, before wheat harvest rush starts', harvestRecommendations:['Harvest when 75% siliques turn golden','Cut in cool morning to reduce shattering losses','Thresh within 2 days of cutting'], balingRecommendations:['Mustard straw is excellent cattle fodder','Bale immediately — mustard straw dries fast','Price: ₹150-200/quintal at local cattle markets'] },
  Maize:     { harvestWindowStart:'15 September', harvestWindowEnd:'5 October', peakHarvestDays:'20-30 September', balingWindowStart:'17 September', balingWindowEnd:'10 October', rainRisk:'medium', expectedYieldTons:12, expectedResidueValueRs:7000, urgency:'medium', bestTimeToSellResidue:'September-October', harvestRecommendations:['Harvest when husk turns brown and grain is hard','Dry grain to below 13% before storage','Watch for fall armyworm damage before harvest'], balingRecommendations:['Maize stalks are high-value silage material','Chop and ensile immediately for dairy farms','Bale dried stalks for industrial biomass buyers'] },
  Barley:    { harvestWindowStart:'20 March', harvestWindowEnd:'5 April', peakHarvestDays:'25-31 March', balingWindowStart:'22 March', balingWindowEnd:'8 April', rainRisk:'low', expectedYieldTons:14, expectedResidueValueRs:6000, urgency:'low', bestTimeToSellResidue:'March-April', harvestRecommendations:['Harvest at dough stage for malting barley','Avoid lodging losses by harvesting early morning','Check brewery/malteries for contract rates'], balingRecommendations:['Barley straw is softest cattle bedding material','Premium pricing: ₹180-220/quintal','Export quality straw for mushroom cultivation'] },
  Soybean:   { harvestWindowStart:'1 October', harvestWindowEnd:'20 October', peakHarvestDays:'5-15 October', balingWindowStart:'3 October', balingWindowEnd:'22 October', rainRisk:'medium', expectedYieldTons:7, expectedResidueValueRs:4500, urgency:'medium', bestTimeToSellResidue:'October', harvestRecommendations:['Harvest when pods are brown and leaves fallen','Check for pod shatter — harvest in cool morning','Moisture should be 13-15% at harvest'], balingRecommendations:['Soybean stover has moderate biomass value','Disc stalks and windrow for easier baling','Demand from paper mills and biomass plants'] },
};

exports.harvestWindow = async (req, res) => {
  const { cropType, district, state, landAcres } = req.body;
  if (!cropType) return res.status(400).json({ error: 'Crop type is required' });

  const acres = parseFloat(landAcres) || 5;
  const currentMonth = new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  const buildFallback = () => {
    const base = HARVEST_FALLBACK[cropType] || HARVEST_FALLBACK['Wheat'];
    const yieldTons = +(base.expectedYieldTons * (acres / 5)).toFixed(1);
    const residueVal = Math.round(base.expectedResidueValueRs * (acres / 5));
    return { ...base, cropType, district: district || 'Punjab', expectedYieldTons: yieldTons, expectedResidueValueRs: residueVal, source: 'fallback', note: 'AI temporarily busy — showing seasonal estimates for your region.' };
  };

  try {
    const json = await callWithRetry(async () => {
      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `Agricultural timing expert for Punjab/Haryana. Current: ${currentMonth}. Crop: ${cropType}, District: ${district || 'Punjab'}, Land: ${acres} acres.

Return ONLY valid JSON (no markdown):
{"cropType":"${cropType}","harvestWindowStart":"DD Month YYYY","harvestWindowEnd":"DD Month YYYY","peakHarvestDays":"DD-DD Month","balingWindowStart":"DD Month YYYY","balingWindowEnd":"DD Month YYYY","rainRisk":"low","expectedYieldTons":${Math.round(acres*4)},"expectedResidueValueRs":${Math.round(acres*2800)},"harvestRecommendations":["tip1","tip2","tip3"],"balingRecommendations":["tip1","tip2"],"urgency":"medium","bestTimeToSellResidue":"Month period"}`
        }]
      });
      return extractJSON(msg.content[0].text);
    });
    res.json({ ...json, source: 'ai' });
  } catch (err) {
    console.error('[AI] Harvest window error:', err.status, err.message);
    return res.json(buildFallback());
  }
};

// ────────────────────────────────────────────────────────────
// PROCUREMENT FORECAST (INDUSTRY)
// ────────────────────────────────────────────────────────────
const PROCUREMENT_FALLBACK = {
  'Flour Mill':       { needs:[{material:'Wheat',estimatedQuantityTons:500,urgency:'high'},{material:'Wheat Bran',estimatedQuantityTons:50,urgency:'medium'}], districts:[{district:'Ludhiana',reason:'Largest wheat trading hub in Punjab'},{district:'Sangrur',reason:'High surplus wheat with competitive farm-gate prices'},{district:'Patiala',reason:'Good road connectivity to mills'}], priceOutlook:'stable', orderTiming:'Order now', budgetEstimateRs:1250000, tips:['Buy directly from Arhtiyas at APMC mandi to save 3-5%','Lock in forward contracts for April-May delivery during harvest season','Blend hard and soft wheat varieties for optimal flour quality'], risks:['Late monsoon can affect wheat quality','Export demand spikes may raise prices in Nov-Dec'] },
  'Rice Mill':        { needs:[{material:'Paddy (PR-126)',estimatedQuantityTons:300,urgency:'high'},{material:'Paddy (Basmati)',estimatedQuantityTons:100,urgency:'medium'}], districts:[{district:'Amritsar',reason:'Largest Basmati growing district'},{district:'Gurdaspur',reason:'High paddy yield this season'},{district:'Kapurthala',reason:'PR-126 surplus, competitive pricing'}], priceOutlook:'bullish', orderTiming:'Order now — procurement season ending', budgetEstimateRs:750000, tips:['Buy PR-126 at MSP during October procurement drives','Maintain 25% Basmati mix for premium export margin','Inspect moisture content below 17% before purchase'], risks:['Paddy procurement windows are short (Oct-Nov only)','Export regulations can affect Basmati price'] },
  'Cotton Gin':       { needs:[{material:'Raw Cotton (Desi)',estimatedQuantityTons:150,urgency:'high'},{material:'Raw Cotton (BT)',estimatedQuantityTons:300,urgency:'high'}], districts:[{district:'Bathinda',reason:'Largest cotton belt in Punjab'},{district:'Mansa',reason:'BT cotton surplus, quality lint'},{district:'Muktsar',reason:'Competitive farm-gate prices'}], priceOutlook:'bullish', orderTiming:'Order immediately — peak season Oct-Nov', budgetEstimateRs:2250000, tips:['Book truck fleet in advance for cotton season','Inspect staple length and moisture before purchase','Set up direct farmer procurement to bypass mandi fees'], risks:['Pink bollworm attack can reduce quality','Weather delays can compress procurement window'] },
  'Sugar Mill':       { needs:[{material:'Sugarcane',estimatedQuantityTons:5000,urgency:'high'},{material:'Sugarcane Tops/Trash',estimatedQuantityTons:500,urgency:'low'}], districts:[{district:'Jalandhar',reason:'Large sugarcane acreage, SAP-compliant farmers'},{district:'Hoshiarpur',reason:'High Brix content cane this season'},{district:'Nawanshahr',reason:'Good infrastructure for cane transport'}], priceOutlook:'stable', orderTiming:'Plan for Nov-Feb crushing season', budgetEstimateRs:6250000, tips:['Issue cane slips to farmers 3 weeks before crushing','Stagger zone-wise arrivals to avoid yard congestion','Coordinate with transport unions for fixed rate contracts'], risks:['Delayed monsoon withdrawal may push start date','Farmer agitation over SAP payments can disrupt supply'] },
  'Biogas Plant':     { needs:[{material:'Paddy Straw',estimatedQuantityTons:200,urgency:'high'},{material:'Cattle Dung (linked farms)',estimatedQuantityTons:100,urgency:'medium'}], districts:[{district:'Patiala',reason:'High paddy straw surplus, burning restrictions create seller urgency'},{district:'Ludhiana',reason:'Good baler network available'},{district:'Fatehgarh Sahib',reason:'Active FPOs for straw aggregation'}], priceOutlook:'bearish', orderTiming:'October — right after paddy harvest', budgetEstimateRs:350000, tips:['Partner with balers directly for regular supply at ₹150-180/quintal','Leverage government anti-stubble burning incentives','Ensure moisture <20% for optimal biogas yield'], risks:['Weather delays in paddy harvest reduce availability window','Competition from paper mills and biomass plants'] },
};

// ────────────────────────────────────────────────────────────
// AADHAAR / DOCUMENT OCR PARSER  (Claude Vision)
// ────────────────────────────────────────────────────────────
exports.parseDocument = async (req, res) => {
  const { imageBase64, mediaType, documentType } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'No image data provided' });

  try {
    const response = await callWithRetry(async () => client.messages.create({
      model: MODEL,
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageBase64 } },
          { type: 'text', text: `This is an Indian ${documentType || 'Aadhaar card'} document image. Extract ONLY clearly visible printed text — never guess or hallucinate.
Return ONLY valid JSON:
{"name":"Full name as printed on card or empty","dob":"DD/MM/YYYY or empty","gender":"Male or Female or empty","address":"Complete address from card or empty","district":"District name only or empty","state":"State name or empty","pinCode":"6-digit PIN or empty","documentType":"aadhaar","confidence":85}
Set confidence 0-100 based on image clarity. Use empty strings for unreadable fields.` }
        ]
      }]
    }));
    const text = response.content[0].text.trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in response');
    res.json({ ...JSON.parse(match[0]), source: 'ai' });
  } catch (err) {
    console.error('[AI] Document parse error:', err.status, err.message);
    res.status(500).json({ error: 'Could not read document. Please enter details manually.' });
  }
};

// ────────────────────────────────────────────────────────────
// CROP PHOTO ANALYZER → AUTO-GENERATE LISTING  (Claude Vision)
// ────────────────────────────────────────────────────────────
exports.analyzeCropPhoto = async (req, res) => {
  const { imageBase64, mediaType, userRole, district } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'No image data provided' });

  try {
    const response = await callWithRetry(async () => client.messages.create({
      model: MODEL,
      max_tokens: 700,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageBase64 } },
          { type: 'text', text: `You are an expert agri-analyst for Punjab/Haryana India. Analyze this crop/produce photo. User role: ${userRole||'farmer'}, Location: ${district||'Punjab'}.
Generate a complete marketplace listing. Return ONLY valid JSON:
{"cropType":"Wheat/Paddy/Cotton/Mustard/Sugarcane/Maize/Cotton Bales/Paddy Straw/Other","qualityGrade":"A+/A/B/C","qualityNotes":"Brief quality observation in 1 sentence","listingType":"supply","title":"Specific listing title max 60 chars","description":"2-sentence professional description","suggestedPricePerQuintal":2100,"quantity":50,"unit":"quintal","confidence":85,"sellingTips":["Tip to maximize price","Second practical tip"]}
If not an agricultural product: set confidence=0, title="Unknown item", describe issue in description.` }
        ]
      }]
    }));
    const text = response.content[0].text.trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in response');
    res.json({ ...JSON.parse(match[0]), source: 'ai' });
  } catch (err) {
    console.error('[AI] Crop photo analyze error:', err.status, err.message);
    res.status(500).json({ error: 'Could not analyze photo. Please fill details manually.' });
  }
};

// ────────────────────────────────────────────────────────────
// GOVERNMENT SCHEME ADVISOR
// ────────────────────────────────────────────────────────────
const SCHEME_FALLBACKS = {
  farmer: [
    { name: 'PM-KISAN', benefit: '₹6,000/year direct to bank (3 installments of ₹2,000)', eligibility: 'All small & marginal farmers owning cultivable land', howToApply: '1. Visit pmkisan.gov.in or nearest CSC\n2. Bring Aadhaar + bank passbook + land records\n3. Register under farmer name matching land records', deadline: 'Ongoing — apply anytime', category: 'income_support', officialLink: 'https://pmkisan.gov.in', matchReason: 'All registered farmers with land are eligible' },
    { name: 'PM Fasal Bima Yojana (PMFBY)', benefit: 'Full crop insurance — premium only 1.5-2% for rabi/kharif crops', eligibility: 'All farmers growing notified crops in Punjab/Haryana', howToApply: '1. Apply at nearest bank/CSC before sowing cutoff\n2. Bring land records + Aadhaar + bank account\n3. Claim online or at bank on crop damage', deadline: 'Before sowing (Oct rabi, Jun kharif)', category: 'crop_insurance', officialLink: 'https://pmfby.gov.in', matchReason: 'Farmers growing wheat, paddy, cotton all qualify' },
    { name: 'Kisan Credit Card (KCC)', benefit: 'Crop loan up to ₹3 lakh at 4% interest (2% with repayment bonus)', eligibility: 'All farmers, tenant farmers, oral lessees', howToApply: '1. Visit SBI/PNB/Union Bank near you\n2. Fill KCC application + land records + Aadhaar + photos\n3. Disbursed within 15 working days', deadline: 'Ongoing', category: 'credit', officialLink: 'https://www.nabard.org', matchReason: 'Farmers with land or tenancy get crop loans at only 4% rate' },
    { name: 'PM-KUSUM Solar Pump Subsidy', benefit: '60% subsidy on solar irrigation pumps up to 7.5 HP', eligibility: 'Farmers with irrigation land in Punjab/Haryana', howToApply: '1. Apply at state DISCOM or agriculture portal\n2. Submit land records + electricity bill + Aadhaar\n3. Pay only 30% of pump cost after subsidy approval', deadline: 'Limited slots — apply early on state portal', category: 'subsidy', officialLink: 'https://mnre.gov.in/pm-kusum', matchReason: 'Reduces irrigation electricity cost by 70% for Punjab farmers' },
    { name: 'MSP Direct Procurement', benefit: 'Wheat ₹2,275/quintal, Paddy ₹2,183/quintal — guaranteed government price', eligibility: 'Registered farmers in Punjab/Haryana with land records', howToApply: '1. Register on Meri Fasal Mera Byora (Punjab) or Haryana portal\n2. Get token for procurement centre\n3. Bring crop to designated mandi on token date', deadline: 'Rabi: April-June | Kharif: Oct-Dec', category: 'price_support', officialLink: 'https://anaajkharid.in', matchReason: 'Punjab/Haryana farmers are top beneficiaries of MSP procurement' },
  ],
  mover: [
    { name: 'PMEGP Business Loan + Subsidy', benefit: 'Loan up to ₹25 lakh with 15-35% subsidy for transport business', eligibility: 'Age 18+, transport/logistics business owners', howToApply: '1. Apply at kvic.gov.in\n2. Prepare business plan for agricultural transport\n3. Submit Aadhaar + vehicle docs + bank statement', deadline: 'Ongoing', category: 'credit', officialLink: 'https://www.kviconline.gov.in/pmegp', matchReason: 'Agricultural transport qualifies as agri-allied business' },
    { name: 'MUDRA Loan (Tarun)', benefit: 'Business loan ₹5-10 lakh, no collateral needed', eligibility: 'Small transport businesses, vehicle owners expanding fleet', howToApply: '1. Apply at any bank or NBFC\n2. Submit: vehicle RC + Aadhaar + 6-month bank statement\n3. Disbursed in 7-10 working days', deadline: 'Ongoing', category: 'credit', officialLink: 'https://mudra.org.in', matchReason: 'Movers use MUDRA Tarun to buy new vehicle or expand fleet' },
    { name: 'Udyam MSME Registration', benefit: 'Priority lending, government tender preference, technology subsidy access', eligibility: 'Any transport business with turnover < ₹250 crore', howToApply: '1. Free registration at udyamregistration.gov.in\n2. Use Aadhaar + GST number\n3. Certificate issued instantly', deadline: 'Ongoing — free and instant', category: 'incentive', officialLink: 'https://udyamregistration.gov.in', matchReason: 'Unlocks 20+ government schemes for transport businesses' },
  ],
  baler: [
    { name: 'SMAM Farm Machinery Subsidy', benefit: '40-50% subsidy on balers and straw management equipment', eligibility: 'Registered farmers and custom hiring entrepreneurs', howToApply: '1. Apply at agrimachinery.dac.gov.in BEFORE purchase\n2. Submit Aadhaar + bank details + landholding proof\n3. State agriculture dept processes within 30 days', deadline: 'Apply before equipment purchase', category: 'subsidy', officialLink: 'https://agrimachinery.dac.gov.in', matchReason: 'Balers specifically covered under SMAM straw management scheme' },
    { name: 'MUDRA Loan (Kishor)', benefit: 'Business loan ₹50,000–₹5 lakh for machinery purchase', eligibility: 'Baling service entrepreneurs, small machinery owners', howToApply: '1. Apply at bank with machine quotation + business plan\n2. Submit Aadhaar + 2 photos + 6-month bank statement\n3. Approval in 7-15 days', deadline: 'Ongoing', category: 'credit', officialLink: 'https://mudra.org.in', matchReason: 'Ideal for expanding baling capacity by buying additional machine' },
    { name: 'Punjab Anti-Stubble Burning Incentive (Indirect)', benefit: '₹2,500/acre incentive drives farmer demand for baling services', eligibility: 'Farmers hiring balers for paddy straw — creates your customer base', howToApply: '1. Farmers register on Punjab Agriculture portal\n2. Baler provides geo-tagged service photo for verification\n3. Incentive goes to farmer, but high demand generated for you', deadline: 'September-November (kharif season)', category: 'subsidy', officialLink: 'https://agripb.gov.in', matchReason: 'Government scheme that directly increases demand for baling services' },
  ],
  industry: [
    { name: 'PLI Scheme — Food Processing', benefit: 'Up to 10% production-linked incentive on incremental sales for 6 years', eligibility: 'Food processing units — minimum investment ₹10 crore', howToApply: '1. Apply at mofpi.gov.in\n2. Submit CA-certified financials + project DPR\n3. MOFPI evaluates in 60 days', deadline: 'Check MOFPI for active rounds', category: 'incentive', officialLink: 'https://mofpi.gov.in/pli-scheme', matchReason: 'Rice mills, flour mills, cotton processors claim production incentives' },
    { name: 'PM Kisan SAMPADA Yojana', benefit: 'Grant up to ₹50 lakh for cold storage and processing infrastructure', eligibility: 'Food processing businesses, FPOs near farm clusters', howToApply: '1. Apply at mofpi.gov.in/sampada\n2. Submit project DPR + financials + land records\n3. State-level committee approves in 90 days', deadline: 'Quarterly windows — check portal', category: 'subsidy', officialLink: 'https://mofpi.gov.in/sampada', matchReason: 'Industries near Punjab/Haryana agri-clusters qualify for infra grants' },
    { name: 'Udyam MSME Registration', benefit: 'Priority credit, technology upgrade subsidy, government tender preference', eligibility: 'Processing industries with turnover < ₹250 crore', howToApply: 'Free instant registration at udyamregistration.gov.in with Aadhaar + GST', deadline: 'Ongoing', category: 'incentive', officialLink: 'https://udyamregistration.gov.in', matchReason: 'Unlocks 20+ government schemes for industrial processing units' },
  ],
};

exports.getSchemes = async (req, res) => {
  const userId = req.user.id;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { farmerProfile: true, industryProfile: true, balerProfile: true, moverProfile: true }
    });

    const profileLines = [
      `Role: ${user.role}`, `State: Punjab/Haryana`,
      user.farmerProfile   ? `Land: ${user.farmerProfile.landAcres} acres, Crops: ${user.farmerProfile.cropTypes?.join(', ')}, District: ${user.farmerProfile.district}` : '',
      user.industryProfile ? `Industry: ${user.industryProfile.industryType}, Company: ${user.industryProfile.companyName}, District: ${user.industryProfile.district}` : '',
      user.balerProfile    ? `Equipment: ${user.balerProfile.machineCount} ${user.balerProfile.machineType} balers, District: ${user.balerProfile.district}` : '',
      user.moverProfile    ? `Fleet: ${user.moverProfile.vehicleCount} ${user.moverProfile.vehicleType}, District: ${user.moverProfile.district}` : '',
    ].filter(Boolean).join('\n');

    try {
      const json = await callWithRetry(async () => {
        const msg = await client.messages.create({
          model: MODEL,
          max_tokens: 1500,
          system: 'You are a JSON API. You MUST respond with ONLY a valid JSON object — no explanation, no markdown, no code fences, no extra text. Output the raw JSON starting with { and ending with }.',
          messages: [{
            role: 'user',
            content: `Government scheme advisor for Indian agriculture. User profile:\n${profileLines}\n\nList 4-6 most relevant central + Punjab/Haryana state government schemes.\n\nRespond with this exact JSON structure:\n{"schemes":[{"name":"Scheme Name","benefit":"Specific amount or %","eligibility":"Who qualifies","howToApply":"Step 1. Do this. Step 2. Do that.","deadline":"When to apply","category":"income_support","officialLink":"https://example.gov.in","matchReason":"Why this specific user qualifies"}],"summary":"2-sentence personalized advice","priorityScheme":"Most important scheme name"}\n\ncategory must be one of: income_support, crop_insurance, credit, subsidy, incentive, price_support`
          }]
        });
        return extractJSON(msg.content[0].text);
      });
      return res.json({ ...json, source: 'ai', userRole: user.role });
    } catch (aiErr) {
      console.error('[AI] Schemes fallback used:', aiErr.message);
      const schemes = SCHEME_FALLBACKS[user.role] || SCHEME_FALLBACKS.farmer;
      return res.json({
        schemes,
        summary: `As a ${user.role} in Punjab/Haryana, you qualify for several government schemes. Start with the highest-benefit scheme first for immediate financial support.`,
        priorityScheme: schemes[0]?.name,
        source: 'fallback',
        note: 'AI temporarily busy — showing standard schemes for your role.',
        userRole: user.role,
      });
    }
  } catch (err) {
    console.error('[AI] getSchemes error:', err.message);
    res.status(500).json({ error: 'Failed to load schemes' });
  }
};

exports.procurementForecast = async (req, res) => {
  const { industryType, district, state, monthsAhead = 1 } = req.body;
  if (!industryType) return res.status(400).json({ error: 'Industry type is required' });

  const currentMonth = new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const months = parseInt(monthsAhead) || 1;

  const buildFallback = () => {
    // Match by keyword if exact key not found
    const key = Object.keys(PROCUREMENT_FALLBACK).find(k => industryType.toLowerCase().includes(k.toLowerCase().split(' ')[0])) || 'Flour Mill';
    const base = PROCUREMENT_FALLBACK[key];
    const scale = months;
    return {
      industryType,
      forecastPeriod: `Next ${months} month${months > 1 ? 's' : ''}`,
      procurementNeeds: base.needs.map(n => ({ ...n, estimatedQuantityTons: n.estimatedQuantityTons * scale })),
      recommendedSourceDistricts: base.districts,
      priceOutlook: base.priceOutlook,
      priceOutlookDetails: `Market prices for ${industryType} raw materials are expected to remain ${base.priceOutlook} over the next ${months} months based on current crop cycles in Punjab/Haryana.`,
      orderTiming: base.orderTiming,
      budgetEstimateRs: base.budgetEstimateRs * scale,
      costSavingTips: base.tips,
      supplyRisks: base.risks,
      aiSummary: `Based on current Punjab/Haryana agri-market conditions, your ${industryType} operation should plan procurement for the next ${months} month(s) focusing on key districts. Price trends are ${base.priceOutlook} — act on the timing recommendation above to optimize your input costs. Monitor supply risks listed below and maintain at least 30% buffer stock.`,
      source: 'fallback',
      note: 'AI temporarily busy — showing seasonal estimates for your industry.',
    };
  };

  try {
    const json = await callWithRetry(async () => {
      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 900,
        messages: [{
          role: 'user',
          content: `Procurement expert for Indian agri-industries. Current: ${currentMonth}. Industry: ${industryType}, Location: ${district || 'Punjab'}, ${state || 'Punjab'}, Forecast: next ${months} month(s).

Return ONLY valid JSON (no markdown):
{"industryType":"${industryType}","forecastPeriod":"next ${months} months","procurementNeeds":[{"material":"Material name","estimatedQuantityTons":100,"urgency":"high"},{"material":"Material 2","estimatedQuantityTons":50,"urgency":"medium"}],"recommendedSourceDistricts":[{"district":"District 1","reason":"reason"},{"district":"District 2","reason":"reason"}],"priceOutlook":"stable","priceOutlookDetails":"2-sentence trend","orderTiming":"Order now","budgetEstimateRs":500000,"costSavingTips":["tip1","tip2","tip3"],"supplyRisks":["risk1","risk2"],"aiSummary":"3-sentence executive summary"}`
        }]
      });
      return extractJSON(msg.content[0].text);
    });
    res.json({ ...json, source: 'ai' });
  } catch (err) {
    console.error('[AI] Procurement forecast error:', err.status, err.message);
    return res.json(buildFallback());
  }
};
