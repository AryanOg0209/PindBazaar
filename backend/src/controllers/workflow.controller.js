const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const INCLUDE_ALL = {
  farmer:   { select: { name: true, phone: true } },
  baler:    { select: { name: true, phone: true } },
  mover:    { select: { name: true, phone: true } },
  industry: { select: { name: true, phone: true } },
  events:   { orderBy: { createdAt: 'asc' } },
  balerBids:      { include: { baler: { select: { name: true, phone: true } } }, orderBy: { createdAt: 'asc' } },
  industryOffers: { include: { industry: { select: { name: true, phone: true } } }, orderBy: { createdAt: 'asc' } },
  transportBids:  { include: { mover: { select: { name: true, phone: true } } }, orderBy: { createdAt: 'asc' } },
};

async function addEvent(workflowId, stage, actorRole, actorId, note) {
  return prisma.workflowEvent.create({
    data: { workflowId, stage, actorRole, actorId: actorId || null, note: note || null }
  });
}

// ── POST /api/workflow  — Farmer creates biomass request
exports.createWorkflow = async (req, res) => {
  if (req.user.role !== 'farmer') return res.status(403).json({ error: 'Only farmers can create biomass requests' });
  const { cropType, quantityTons, location, district, acresCount, notes } = req.body;
  if (!cropType || !quantityTons || !location || !district)
    return res.status(400).json({ error: 'cropType, quantityTons, location, district are required' });
  try {
    const workflow = await prisma.biomassWorkflow.create({
      data: {
        farmerId: req.user.id, cropType,
        quantityTons: parseFloat(quantityTons), location, district,
        acresCount: acresCount ? parseFloat(acresCount) : null,
        notes: notes || null, stage: 'pending',
      },
      include: INCLUDE_ALL,
    });
    await addEvent(workflow.id, 'pending', 'farmer', req.user.id,
      `Biomass request created: ${quantityTons} tons of ${cropType} at ${location}`);
    res.status(201).json(workflow);
  } catch (err) {
    console.error('createWorkflow error:', err);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
};

// ── GET /api/workflow  — Role-aware list (my workflows)
exports.listWorkflows = async (req, res) => {
  const { id: userId, role } = req.user;
  try {
    let where = {};
    if (role === 'farmer')   where.farmerId  = userId;
    if (role === 'baler')    where.balerId   = userId;
    if (role === 'mover')    where.moverId   = userId;
    if (role === 'industry') where.industryId = userId;

    // Balers also see workflows where they placed bids
    if (role === 'baler') {
      where = { OR: [{ balerId: userId }, { balerBids: { some: { balerId: userId } } }] };
    }
    if (role === 'industry') {
      where = { OR: [{ industryId: userId }, { industryOffers: { some: { industryId: userId } } }] };
    }
    if (role === 'mover') {
      where = { OR: [{ moverId: userId }, { transportBids: { some: { moverId: userId } } }] };
    }

    const workflows = await prisma.biomassWorkflow.findMany({
      where,
      include: INCLUDE_ALL,
      orderBy: { createdAt: 'desc' },
    });
    res.json(workflows);
  } catch (err) {
    console.error('listWorkflows error:', err);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
};

// ── GET /api/workflow/open  — Open jobs to bid on
exports.listOpenWorkflows = async (req, res) => {
  const { role, id: userId } = req.user;
  try {
    let where = {};
    if (role === 'baler')    where = { stage: 'pending',      balerBids: { none: { balerId: userId } } };
    if (role === 'mover')    where = { stage: 'industry_linked', transportBids: { none: { moverId: userId } } };
    if (role === 'industry') where = { stage: 'baling_done',  industryOffers: { none: { industryId: userId } } };

    const workflows = await prisma.biomassWorkflow.findMany({
      where,
      include: INCLUDE_ALL,
      orderBy: { createdAt: 'desc' },
    });
    res.json(workflows);
  } catch (err) {
    console.error('listOpenWorkflows error:', err);
    res.status(500).json({ error: 'Failed to fetch open workflows' });
  }
};

// ── GET /api/workflow/:id
exports.getWorkflow = async (req, res) => {
  try {
    const workflow = await prisma.biomassWorkflow.findUnique({
      where: { id: req.params.id },
      include: INCLUDE_ALL,
    });
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    res.json(workflow);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
};

// ────────────────────────────────────────────────────────────
// BALER BIDDING
// ────────────────────────────────────────────────────────────

// POST /api/workflow/:id/bid  — Baler submits a bid
exports.submitBid = async (req, res) => {
  if (req.user.role !== 'baler') return res.status(403).json({ error: 'Only balers can submit bids' });
  const { pricePerTon, quantityTons, estimatedDays, message } = req.body;
  if (!pricePerTon || !quantityTons) return res.status(400).json({ error: 'pricePerTon and quantityTons are required' });

  try {
    const wf = await prisma.biomassWorkflow.findUnique({ where: { id: req.params.id } });
    if (!wf) return res.status(404).json({ error: 'Workflow not found' });
    if (wf.stage !== 'pending') return res.status(400).json({ error: 'This request is no longer accepting bids' });

    // Check if this baler already bid
    const existing = await prisma.workflowBid.findFirst({
      where: { workflowId: req.params.id, balerId: req.user.id, status: 'pending' }
    });
    if (existing) return res.status(400).json({ error: 'You already submitted a bid for this request' });

    const bid = await prisma.workflowBid.create({
      data: {
        workflowId: req.params.id,
        balerId: req.user.id,
        pricePerTon: parseFloat(pricePerTon),
        quantityTons: parseFloat(quantityTons),
        estimatedDays: estimatedDays ? parseInt(estimatedDays) : 3,
        message: message || null,
        status: 'pending',
      },
      include: { baler: { select: { name: true, phone: true } } },
    });
    await addEvent(req.params.id, 'pending', 'baler', req.user.id,
      `Baler bid submitted: ₹${pricePerTon}/ton for ${quantityTons} tons in ${estimatedDays || 3} days`);
    res.status(201).json(bid);
  } catch (err) {
    console.error('submitBid error:', err);
    res.status(500).json({ error: 'Failed to submit bid' });
  }
};

// POST /api/workflow/:id/accept-bid/:bidId  — Farmer accepts a baler bid
exports.acceptBid = async (req, res) => {
  if (req.user.role !== 'farmer') return res.status(403).json({ error: 'Only farmers can accept bids' });
  try {
    const wf = await prisma.biomassWorkflow.findUnique({ where: { id: req.params.id } });
    if (!wf || wf.farmerId !== req.user.id) return res.status(403).json({ error: 'Not your workflow' });
    if (wf.stage !== 'pending') return res.status(400).json({ error: 'Cannot accept bid at this stage' });

    const bid = await prisma.workflowBid.findUnique({ where: { id: req.params.bidId } });
    if (!bid || bid.workflowId !== req.params.id) return res.status(404).json({ error: 'Bid not found' });

    // Accept this bid, reject all others
    await prisma.workflowBid.updateMany({
      where: { workflowId: req.params.id, id: { not: req.params.bidId } },
      data: { status: 'rejected' },
    });
    await prisma.workflowBid.update({ where: { id: req.params.bidId }, data: { status: 'accepted' } });

    // Assign baler to workflow
    const updated = await prisma.biomassWorkflow.update({
      where: { id: req.params.id },
      data: {
        balerId: bid.balerId,
        stage: 'baler_assigned',
        balerAcceptedAt: new Date(),
        balerPriceRs: bid.pricePerTon * bid.quantityTons,
      },
      include: INCLUDE_ALL,
    });
    await addEvent(req.params.id, 'baler_assigned', 'farmer', req.user.id,
      `Baler bid accepted — ₹${bid.pricePerTon}/ton × ${bid.quantityTons} tons = ₹${bid.pricePerTon * bid.quantityTons}`);
    res.json(updated);
  } catch (err) {
    console.error('acceptBid error:', err);
    res.status(500).json({ error: 'Failed to accept bid' });
  }
};

// PUT /api/workflow/:id/baling-done  — Baler marks baling complete
exports.balingDone = async (req, res) => {
  if (req.user.role !== 'baler') return res.status(403).json({ error: 'Only balers can mark baling complete' });
  try {
    const wf = await prisma.biomassWorkflow.findUnique({ where: { id: req.params.id } });
    if (!wf || wf.balerId !== req.user.id) return res.status(403).json({ error: 'Not your assignment' });
    if (wf.stage !== 'baler_assigned') return res.status(400).json({ error: 'Not in correct stage' });

    const { balesCount } = req.body;
    const updated = await prisma.biomassWorkflow.update({
      where: { id: req.params.id },
      data: { stage: 'baling_done', balingDoneAt: new Date(), balesCount: balesCount ? parseInt(balesCount) : null },
      include: INCLUDE_ALL,
    });
    await addEvent(req.params.id, 'baling_done', 'baler', req.user.id,
      `Baling complete — ${balesCount || '?'} bales produced. Now accepting industry offers.`);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark baling done' });
  }
};

// ────────────────────────────────────────────────────────────
// INDUSTRY OFFERS
// ────────────────────────────────────────────────────────────

// POST /api/workflow/:id/offer  — Industry submits purchase offer
exports.submitOffer = async (req, res) => {
  if (req.user.role !== 'industry') return res.status(403).json({ error: 'Only industry can submit offers' });
  const { pricePerTon, quantityTons, message } = req.body;
  if (!pricePerTon || !quantityTons) return res.status(400).json({ error: 'pricePerTon and quantityTons are required' });

  try {
    const wf = await prisma.biomassWorkflow.findUnique({ where: { id: req.params.id } });
    if (!wf) return res.status(404).json({ error: 'Workflow not found' });
    if (wf.stage !== 'baling_done') return res.status(400).json({ error: 'This biomass is not available for offers yet' });

    const existing = await prisma.industryOffer.findFirst({
      where: { workflowId: req.params.id, industryId: req.user.id, status: 'pending' }
    });
    if (existing) return res.status(400).json({ error: 'You already submitted an offer' });

    const offer = await prisma.industryOffer.create({
      data: {
        workflowId: req.params.id,
        industryId: req.user.id,
        pricePerTon: parseFloat(pricePerTon),
        quantityTons: parseFloat(quantityTons),
        message: message || null,
        status: 'pending',
      },
      include: { industry: { select: { name: true, phone: true } } },
    });
    await addEvent(req.params.id, 'baling_done', 'industry', req.user.id,
      `Industry offer: ₹${pricePerTon}/ton for ${quantityTons} tons = ₹${pricePerTon * quantityTons}`);
    res.status(201).json(offer);
  } catch (err) {
    console.error('submitOffer error:', err);
    res.status(500).json({ error: 'Failed to submit offer' });
  }
};

// POST /api/workflow/:id/accept-offer/:offerId  — Farmer accepts an industry offer
exports.acceptOffer = async (req, res) => {
  if (req.user.role !== 'farmer') return res.status(403).json({ error: 'Only farmers can accept industry offers' });
  try {
    const wf = await prisma.biomassWorkflow.findUnique({ where: { id: req.params.id } });
    if (!wf || wf.farmerId !== req.user.id) return res.status(403).json({ error: 'Not your workflow' });
    if (wf.stage !== 'baling_done') return res.status(400).json({ error: 'Cannot accept offer at this stage' });

    const offer = await prisma.industryOffer.findUnique({ where: { id: req.params.offerId } });
    if (!offer || offer.workflowId !== req.params.id) return res.status(404).json({ error: 'Offer not found' });

    // Accept this offer, reject others
    await prisma.industryOffer.updateMany({
      where: { workflowId: req.params.id, id: { not: req.params.offerId } },
      data: { status: 'rejected' },
    });
    await prisma.industryOffer.update({ where: { id: req.params.offerId }, data: { status: 'accepted' } });

    const total = offer.pricePerTon * offer.quantityTons;
    const updated = await prisma.biomassWorkflow.update({
      where: { id: req.params.id },
      data: {
        industryId: offer.industryId,
        industryLinkedAt: new Date(),
        finalPriceRs: total,
        stage: 'industry_linked',
      },
      include: INCLUDE_ALL,
    });
    await addEvent(req.params.id, 'industry_linked', 'farmer', req.user.id,
      `Industry offer accepted — ₹${offer.pricePerTon}/ton × ${offer.quantityTons} tons = ₹${total}. Now accepting transport bids.`);
    res.json(updated);
  } catch (err) {
    console.error('acceptOffer error:', err);
    res.status(500).json({ error: 'Failed to accept offer' });
  }
};

// ────────────────────────────────────────────────────────────
// TRANSPORT BIDS
// ────────────────────────────────────────────────────────────

// POST /api/workflow/:id/transport-bid  — Mover submits transport bid
exports.submitTransportBid = async (req, res) => {
  if (req.user.role !== 'mover') return res.status(403).json({ error: 'Only movers can submit transport bids' });
  const { priceTotal, estimatedDays, message } = req.body;
  if (!priceTotal) return res.status(400).json({ error: 'priceTotal is required' });

  try {
    const wf = await prisma.biomassWorkflow.findUnique({ where: { id: req.params.id } });
    if (!wf) return res.status(404).json({ error: 'Workflow not found' });
    if (wf.stage !== 'industry_linked') return res.status(400).json({ error: 'Not accepting transport bids yet' });

    const existing = await prisma.transportBid.findFirst({
      where: { workflowId: req.params.id, moverId: req.user.id, status: 'pending' }
    });
    if (existing) return res.status(400).json({ error: 'You already submitted a transport bid' });

    const bid = await prisma.transportBid.create({
      data: {
        workflowId: req.params.id,
        moverId: req.user.id,
        priceTotal: parseFloat(priceTotal),
        estimatedDays: estimatedDays ? parseInt(estimatedDays) : 2,
        message: message || null,
        status: 'pending',
      },
      include: { mover: { select: { name: true, phone: true } } },
    });
    await addEvent(req.params.id, 'industry_linked', 'mover', req.user.id,
      `Transport bid: ₹${priceTotal} total, ${estimatedDays || 2} days`);
    res.status(201).json(bid);
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit transport bid' });
  }
};

// POST /api/workflow/:id/accept-transport-bid/:bidId  — Farmer accepts transport bid
exports.acceptTransportBid = async (req, res) => {
  if (req.user.role !== 'farmer') return res.status(403).json({ error: 'Only farmers can accept transport bids' });
  try {
    const wf = await prisma.biomassWorkflow.findUnique({ where: { id: req.params.id } });
    if (!wf || wf.farmerId !== req.user.id) return res.status(403).json({ error: 'Not your workflow' });

    const bid = await prisma.transportBid.findUnique({ where: { id: req.params.bidId } });
    if (!bid || bid.workflowId !== req.params.id) return res.status(404).json({ error: 'Bid not found' });

    await prisma.transportBid.updateMany({
      where: { workflowId: req.params.id, id: { not: req.params.bidId } },
      data: { status: 'rejected' },
    });
    await prisma.transportBid.update({ where: { id: req.params.bidId }, data: { status: 'accepted' } });

    const updated = await prisma.biomassWorkflow.update({
      where: { id: req.params.id },
      data: { moverId: bid.moverId, stage: 'transport_assigned', moverAcceptedAt: new Date(), moverPriceRs: bid.priceTotal },
      include: INCLUDE_ALL,
    });
    await addEvent(req.params.id, 'transport_assigned', 'farmer', req.user.id,
      `Transport accepted — ₹${bid.priceTotal}, ${bid.estimatedDays} day(s)`);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept transport bid' });
  }
};

// ────────────────────────────────────────────────────────────
// TRANSIT & DELIVERY
// ────────────────────────────────────────────────────────────

exports.pickupDone = async (req, res) => {
  if (req.user.role !== 'mover') return res.status(403).json({ error: 'Only movers can mark pickup' });
  try {
    const wf = await prisma.biomassWorkflow.findUnique({ where: { id: req.params.id } });
    if (!wf || wf.moverId !== req.user.id) return res.status(403).json({ error: 'Not your assignment' });
    if (wf.stage !== 'transport_assigned') return res.status(400).json({ error: 'Not in correct stage' });

    const updated = await prisma.biomassWorkflow.update({
      where: { id: req.params.id },
      data: { stage: 'in_transit', pickupDoneAt: new Date() },
      include: INCLUDE_ALL,
    });
    await addEvent(req.params.id, 'in_transit', 'mover', req.user.id, 'Bales picked up — now in transit');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark pickup' });
  }
};

exports.markDelivered = async (req, res) => {
  const { role, id: userId } = req.user;
  if (!['mover', 'industry'].includes(role)) return res.status(403).json({ error: 'Only mover or industry can confirm delivery' });
  try {
    const wf = await prisma.biomassWorkflow.findUnique({ where: { id: req.params.id } });
    if (!wf) return res.status(404).json({ error: 'Workflow not found' });
    const { deliveredQtyTons } = req.body;
    const updated = await prisma.biomassWorkflow.update({
      where: { id: req.params.id },
      data: { stage: 'delivered', deliveredAt: new Date(), deliveredQtyTons: deliveredQtyTons ? parseFloat(deliveredQtyTons) : wf.quantityTons },
      include: INCLUDE_ALL,
    });
    await addEvent(req.params.id, 'delivered', role, userId,
      `Delivered — ${deliveredQtyTons || wf.quantityTons} tons received by industry. Pipeline complete.`);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark delivered' });
  }
};

exports.cancelWorkflow = async (req, res) => {
  const { id: userId, role } = req.user;
  try {
    const wf = await prisma.biomassWorkflow.findUnique({ where: { id: req.params.id } });
    if (!wf) return res.status(404).json({ error: 'Workflow not found' });
    if (wf.farmerId !== userId && role !== 'admin')
      return res.status(403).json({ error: 'Only the farmer or admin can cancel' });
    if (['delivered', 'completed'].includes(wf.stage))
      return res.status(400).json({ error: 'Cannot cancel a completed workflow' });

    await prisma.biomassWorkflow.update({ where: { id: req.params.id }, data: { stage: 'cancelled' } });
    await addEvent(req.params.id, 'cancelled', role, userId, 'Workflow cancelled by farmer');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel workflow' });
  }
};
