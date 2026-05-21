const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to add a timeline event
async function addEvent(workflowId, stage, actorRole, actorId, note) {
  return prisma.workflowEvent.create({
    data: { workflowId, stage, actorRole, actorId: actorId || null, note: note || null }
  });
}

// ── POST /api/workflow  — Farmer creates biomass request
exports.createWorkflow = async (req, res) => {
  const farmerId = req.user.id;
  if (req.user.role !== 'farmer') return res.status(403).json({ error: 'Only farmers can create biomass requests' });

  const { cropType, quantityTons, location, district, acresCount, notes } = req.body;
  if (!cropType || !quantityTons || !location || !district)
    return res.status(400).json({ error: 'cropType, quantityTons, location, district are required' });

  try {
    const workflow = await prisma.biomassWorkflow.create({
      data: {
        farmerId,
        cropType,
        quantityTons: parseFloat(quantityTons),
        location,
        district,
        acresCount: acresCount ? parseFloat(acresCount) : null,
        notes: notes || null,
        stage: 'pending',
      },
      include: { farmer: { select: { name: true, phone: true } } }
    });
    await addEvent(workflow.id, 'pending', 'farmer', farmerId, `Biomass request created: ${quantityTons} tons of ${cropType} at ${location}`);
    res.status(201).json(workflow);
  } catch (err) {
    console.error('createWorkflow error:', err);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
};

// ── GET /api/workflow  — Role-aware list
exports.listWorkflows = async (req, res) => {
  const { id: userId, role } = req.user;
  try {
    let where = {};
    if (role === 'farmer')   where.farmerId   = userId;
    if (role === 'baler')    where.balerId     = userId;
    if (role === 'mover')    where.moverId     = userId;
    if (role === 'industry') where.industryId  = userId;

    const workflows = await prisma.biomassWorkflow.findMany({
      where,
      include: {
        farmer:   { select: { name: true, phone: true } },
        baler:    { select: { name: true, phone: true } },
        mover:    { select: { name: true, phone: true } },
        industry: { select: { name: true, phone: true } },
        events:   { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(workflows);
  } catch (err) {
    console.error('listWorkflows error:', err);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
};

// ── GET /api/workflow/open  — Open jobs for balers/movers/industry to browse
exports.listOpenWorkflows = async (req, res) => {
  const { role } = req.user;
  try {
    let where = {};
    if (role === 'baler')    where = { stage: 'pending',           balerId: null };
    if (role === 'mover')    where = { stage: 'baling_done',       moverId: null };
    if (role === 'industry') where = { stage: { in: ['in_transit', 'baling_done'] }, industryId: null };

    const workflows = await prisma.biomassWorkflow.findMany({
      where,
      include: {
        farmer:   { select: { name: true, phone: true } },
        baler:    { select: { name: true, phone: true } },
        mover:    { select: { name: true, phone: true } },
        industry: { select: { name: true, phone: true } },
      },
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
      include: {
        farmer:   { select: { name: true, phone: true, role: true } },
        baler:    { select: { name: true, phone: true, role: true } },
        mover:    { select: { name: true, phone: true, role: true } },
        industry: { select: { name: true, phone: true, role: true } },
        events:   { orderBy: { createdAt: 'asc' } },
      }
    });
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    res.json(workflow);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
};

// ── POST /api/workflow/:id/accept-baling  — Baler accepts
exports.acceptBaling = async (req, res) => {
  const balerId = req.user.id;
  if (req.user.role !== 'baler') return res.status(403).json({ error: 'Only balers can accept baling jobs' });
  try {
    const wf = await prisma.biomassWorkflow.findUnique({ where: { id: req.params.id } });
    if (!wf) return res.status(404).json({ error: 'Workflow not found' });
    if (wf.stage !== 'pending') return res.status(400).json({ error: 'This job is no longer available' });
    if (wf.balerId) return res.status(400).json({ error: 'A baler has already been assigned' });

    const { balerPriceRs } = req.body;
    const updated = await prisma.biomassWorkflow.update({
      where: { id: req.params.id },
      data: { balerId, stage: 'baler_assigned', balerAcceptedAt: new Date(), balerPriceRs: balerPriceRs ? parseFloat(balerPriceRs) : null },
      include: { farmer: { select: { name: true, phone: true } }, baler: { select: { name: true, phone: true } } }
    });
    await addEvent(req.params.id, 'baler_assigned', 'baler', balerId, `Baling job accepted${balerPriceRs ? ` at ₹${balerPriceRs}` : ''}`);
    res.json(updated);
  } catch (err) {
    console.error('acceptBaling error:', err);
    res.status(500).json({ error: 'Failed to accept baling job' });
  }
};

// ── PUT /api/workflow/:id/baling-done  — Baler marks complete
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
      include: { farmer: { select: { name: true, phone: true } }, baler: { select: { name: true, phone: true } } }
    });
    await addEvent(req.params.id, 'baling_done', 'baler', req.user.id, `Baling completed. ${balesCount ? balesCount + ' bales produced.' : ''} Ready for transport.`);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark baling done' });
  }
};

// ── POST /api/workflow/:id/accept-transport  — Mover accepts
exports.acceptTransport = async (req, res) => {
  const moverId = req.user.id;
  if (req.user.role !== 'mover') return res.status(403).json({ error: 'Only movers can accept transport jobs' });
  try {
    const wf = await prisma.biomassWorkflow.findUnique({ where: { id: req.params.id } });
    if (!wf) return res.status(404).json({ error: 'Workflow not found' });
    if (wf.stage !== 'baling_done') return res.status(400).json({ error: 'Baling not yet completed for this job' });
    if (wf.moverId) return res.status(400).json({ error: 'A mover has already been assigned' });

    const { moverPriceRs, deliveryAddress } = req.body;
    const updated = await prisma.biomassWorkflow.update({
      where: { id: req.params.id },
      data: { moverId, stage: 'transport_assigned', moverAcceptedAt: new Date(), moverPriceRs: moverPriceRs ? parseFloat(moverPriceRs) : null, deliveryAddress: deliveryAddress || null },
      include: { farmer: { select: { name: true, phone: true } }, baler: { select: { name: true, phone: true } }, mover: { select: { name: true, phone: true } } }
    });
    await addEvent(req.params.id, 'transport_assigned', 'mover', moverId, `Transport accepted${deliveryAddress ? ` → ${deliveryAddress}` : ''}${moverPriceRs ? ` at ₹${moverPriceRs}` : ''}`);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept transport' });
  }
};

// ── PUT /api/workflow/:id/pickup-done  — Mover marks picked up
exports.pickupDone = async (req, res) => {
  if (req.user.role !== 'mover') return res.status(403).json({ error: 'Only movers can mark pickup' });
  try {
    const wf = await prisma.biomassWorkflow.findUnique({ where: { id: req.params.id } });
    if (!wf || wf.moverId !== req.user.id) return res.status(403).json({ error: 'Not your assignment' });
    if (!['transport_assigned'].includes(wf.stage)) return res.status(400).json({ error: 'Not in correct stage' });

    const updated = await prisma.biomassWorkflow.update({
      where: { id: req.params.id },
      data: { stage: 'in_transit', pickupDoneAt: new Date() },
      include: { farmer: { select: { name: true, phone: true } }, mover: { select: { name: true, phone: true } } }
    });
    await addEvent(req.params.id, 'in_transit', 'mover', req.user.id, 'Bales picked up — now in transit to delivery point');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark pickup' });
  }
};

// ── POST /api/workflow/:id/link-industry  — Industry links to incoming delivery
exports.linkIndustry = async (req, res) => {
  const industryId = req.user.id;
  if (req.user.role !== 'industry') return res.status(403).json({ error: 'Only industry can link to delivery' });
  try {
    const wf = await prisma.biomassWorkflow.findUnique({ where: { id: req.params.id } });
    if (!wf) return res.status(404).json({ error: 'Workflow not found' });
    if (wf.industryId && wf.industryId !== industryId) return res.status(400).json({ error: 'Already linked to another industry' });
    if (!['baling_done', 'transport_assigned', 'in_transit'].includes(wf.stage))
      return res.status(400).json({ error: 'Cannot link at this stage' });

    const { finalPriceRs } = req.body;
    const updated = await prisma.biomassWorkflow.update({
      where: { id: req.params.id },
      data: { industryId, industryLinkedAt: new Date(), finalPriceRs: finalPriceRs ? parseFloat(finalPriceRs) : null },
      include: {
        farmer:   { select: { name: true, phone: true } },
        baler:    { select: { name: true, phone: true } },
        mover:    { select: { name: true, phone: true } },
        industry: { select: { name: true, phone: true } },
      }
    });
    await addEvent(req.params.id, wf.stage, 'industry', industryId, `Industry linked as destination${finalPriceRs ? ` — agreed price ₹${finalPriceRs}` : ''}`);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to link industry' });
  }
};

// ── PUT /api/workflow/:id/delivered  — Mark delivered
exports.markDelivered = async (req, res) => {
  const { role, id: userId } = req.user;
  if (!['mover', 'industry'].includes(role)) return res.status(403).json({ error: 'Only mover or industry can mark delivery' });
  try {
    const wf = await prisma.biomassWorkflow.findUnique({ where: { id: req.params.id } });
    if (!wf) return res.status(404).json({ error: 'Workflow not found' });

    const { deliveredQtyTons } = req.body;
    const updated = await prisma.biomassWorkflow.update({
      where: { id: req.params.id },
      data: { stage: 'delivered', deliveredAt: new Date(), deliveredQtyTons: deliveredQtyTons ? parseFloat(deliveredQtyTons) : wf.quantityTons },
      include: {
        farmer:   { select: { name: true, phone: true } },
        baler:    { select: { name: true, phone: true } },
        mover:    { select: { name: true, phone: true } },
        industry: { select: { name: true, phone: true } },
        events:   { orderBy: { createdAt: 'asc' } },
      }
    });
    await addEvent(req.params.id, 'delivered', role, userId, `Delivered${deliveredQtyTons ? ` — ${deliveredQtyTons} tons received` : ''}. Workflow complete.`);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark delivered' });
  }
};

// ── PUT /api/workflow/:id/cancel
exports.cancelWorkflow = async (req, res) => {
  const { id: userId, role } = req.user;
  try {
    const wf = await prisma.biomassWorkflow.findUnique({ where: { id: req.params.id } });
    if (!wf) return res.status(404).json({ error: 'Workflow not found' });
    if (wf.farmerId !== userId && role !== 'admin')
      return res.status(403).json({ error: 'Only the farmer or admin can cancel' });

    const updated = await prisma.biomassWorkflow.update({
      where: { id: req.params.id },
      data: { stage: 'cancelled' }
    });
    await addEvent(req.params.id, 'cancelled', role, userId, 'Workflow cancelled');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel workflow' });
  }
};
