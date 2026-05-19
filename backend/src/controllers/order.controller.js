const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Accept a job/listing (Create Order)
exports.createOrder = async (req, res) => {
  try {
    const workerId = req.user.id;
    const { listingId, agreedPrice } = req.body;

    if (!listingId || !agreedPrice) {
      return res.status(400).json({ error: 'Missing listingId or agreedPrice' });
    }

    // Fetch listing to verify it exists and is active
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.status !== 'active') return res.status(400).json({ error: 'Listing is no longer active' });
    if (listing.userId === workerId) return res.status(400).json({ error: 'Cannot accept your own listing' });

    // Create the order
    const order = await prisma.$transaction([
      prisma.order.create({
        data: {
          listingId,
          clientId: listing.userId,
          workerId,
          agreedPrice: parseFloat(agreedPrice),
          status: 'accepted'
        }
      }),
      // Mark listing as fulfilled
      prisma.listing.update({
        where: { id: listingId },
        data: { status: 'fulfilled' }
      })
    ]);

    res.status(201).json({ message: 'Job accepted successfully', order: order[0] });
  } catch (error) {
    console.error('Accept job error:', error);
    res.status(500).json({ error: 'Failed to accept job' });
  }
};

// Get user's orders (both as client and worker)
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { clientId: userId },
          { workerId: userId }
        ]
      },
      include: {
        listing: true,
        client: { select: { name: true, phone: true } },
        worker: { select: { name: true, phone: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(orders);
  } catch (error) {
    console.error('Fetch orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// Update order status (e.g. mark as completed)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    if (!['in_progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Ensure only participants can update
    if (order.clientId !== userId && order.workerId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to update this order' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { 
        status,
        ...(status === 'completed' ? { completedAt: new Date() } : {})
      }
    });

    res.json({ message: 'Order updated successfully', order: updatedOrder });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
};
