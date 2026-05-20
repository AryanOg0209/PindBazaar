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

Plan the optimal route and return ONLY valid JSON:
{
  "optimizedOrder": ["Location1", "Location2", "Location3"],
  "totalDistanceKm": 85,
  "estimatedHours": 3.5,
  "fuelCostRs": 650,
  "tollCostRs": 120,
  "estimatedEarningsRs": 4500,
  "profitRs": 3730,
  "routePlan": [
    { "stop": "Location name", "action": "pickup/dropoff/rest", "distanceFromPrevKm": 0, "notes": "Tip for this stop" }
  ],
  "driverTips": ["Tip 1 for safe/efficient driving on this route", "Tip 2"],
  "bestDepartureTime": "6:00 AM",
  "warnings": ["Any road/seasonal warning if applicable"]
}

Use realistic Punjab/Haryana road distances, diesel price ~₹90/L, mileage ~8km/L for tractor-trolley or ~12km/L for truck.`
        }]
      });
      return extractJSON(msg.content[0].text);
    });
    res.json({ ...json, source: 'ai' });
  } catch (err) {
    console.error('[AI] Route planner error:', err.status, err.message);
    res.status(500).json({ error: 'Route planning failed. Please try again.' });
  }
};

// ────────────────────────────────────────────────────────────
// HARVEST & BALING WINDOW PREDICTOR (FARMER + BALER)
// ────────────────────────────────────────────────────────────
exports.harvestWindow = async (req, res) => {
  const { cropType, district, state, landAcres } = req.body;
  if (!cropType) return res.status(400).json({ error: 'Crop type is required' });

  const currentMonth = new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  try {
    const json = await callWithRetry(async () => {
      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `You are an agricultural timing expert for Punjab/Haryana India. Current month: ${currentMonth}.

Crop: ${cropType}
District: ${district || 'Punjab'}
State: ${state || 'Punjab'}
Land: ${landAcres || 'unknown'} acres

Predict the optimal harvest and baling window. Return ONLY valid JSON:
{
  "cropType": "${cropType}",
  "harvestWindowStart": "e.g. 15 April 2026",
  "harvestWindowEnd": "e.g. 30 April 2026",
  "peakHarvestDays": "e.g. 20-25 April",
  "balingWindowStart": "e.g. 21 April 2026",
  "balingWindowEnd": "e.g. 5 May 2026",
  "rainRisk": "low/medium/high",
  "rainRiskDetails": "Brief explanation of rain outlook for this period",
  "expectedYieldTons": 18.5,
  "expectedBiomassResiduePercent": 45,
  "expectedResidueValueRs": 12000,
  "harvestRecommendations": ["Specific tip 1", "Tip 2", "Tip 3"],
  "balingRecommendations": ["Baling tip 1", "Tip 2"],
  "urgency": "low/medium/high",
  "urgencyReason": "Why they should act now or wait",
  "bestTimeToSellResidue": "e.g. Immediately after baling in April"
}

Be specific to ${district}, ${state}. Use real seasonal patterns for this region.`
        }]
      });
      return extractJSON(msg.content[0].text);
    });
    res.json({ ...json, source: 'ai' });
  } catch (err) {
    console.error('[AI] Harvest window error:', err.status, err.message);
    res.status(500).json({ error: 'Harvest window prediction failed. Please try again.' });
  }
};

// ────────────────────────────────────────────────────────────
// PROCUREMENT FORECAST (INDUSTRY)
// ────────────────────────────────────────────────────────────
exports.procurementForecast = async (req, res) => {
  const { industryType, district, state, monthsAhead = 1 } = req.body;
  if (!industryType) return res.status(400).json({ error: 'Industry type is required' });

  const currentMonth = new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  try {
    const json = await callWithRetry(async () => {
      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are a procurement strategy expert for Indian agri-industries. Current: ${currentMonth}.

Industry Type: ${industryType}
Location: ${district || 'Punjab'}, ${state || 'Punjab'}
Forecast for: next ${monthsAhead} month(s)

Generate procurement forecast. Return ONLY valid JSON:
{
  "industryType": "${industryType}",
  "forecastPeriod": "e.g. June 2026",
  "procurementNeeds": [
    { "material": "Wheat straw", "estimatedQuantityTons": 150, "urgency": "high", "reason": "Why this material is needed now" },
    { "material": "Rice husk", "estimatedQuantityTons": 80, "urgency": "medium", "reason": "..." }
  ],
  "recommendedSourceDistricts": [
    { "district": "Ludhiana", "reason": "Surplus wheat this season, competitive pricing" },
    { "district": "Amritsar", "reason": "..." }
  ],
  "priceOutlook": "bullish/stable/bearish",
  "priceOutlookDetails": "2-sentence price trend explanation",
  "orderTiming": "Order now / Wait 2 weeks / Urgent",
  "orderTimingReason": "Why this timing is optimal",
  "budgetEstimateRs": 850000,
  "costSavingTips": ["Tip 1 to reduce procurement cost", "Tip 2", "Tip 3"],
  "supplyRisks": ["Risk 1 to watch out for", "Risk 2"],
  "aiSummary": "3-sentence executive summary for the procurement manager"
}

Base on real Punjab/Haryana seasonal crop cycles and ${industryType} industry needs.`
        }]
      });
      return extractJSON(msg.content[0].text);
    });
    res.json({ ...json, source: 'ai' });
  } catch (err) {
    console.error('[AI] Procurement forecast error:', err.status, err.message);
    res.status(500).json({ error: 'Procurement forecast failed. Please try again.' });
  }
};
