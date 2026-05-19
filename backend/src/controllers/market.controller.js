const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create a new listing
exports.createListing = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, title, description, cropType, quantity, price, location } = req.body;

    if (!type || !title || !location) {
      return res.status(400).json({ error: 'Missing required fields (type, title, location)' });
    }

    const listing = await prisma.listing.create({
      data: {
        userId,
        type,
        title,
        description,
        cropType,
        quantity: quantity ? parseFloat(quantity) : null,
        price: price ? parseFloat(price) : null,
        location
      }
    });

    res.status(201).json({ message: 'Listing created successfully', listing });
  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({ error: 'Failed to create listing' });
  }
};

// Get all active listings (with optional filters)
exports.getListings = async (req, res) => {
  try {
    const { type, cropType, minPrice, maxPrice, location } = req.query;

    let whereClause = { status: 'active' };

    if (type) whereClause.type = type;
    if (cropType) whereClause.cropType = cropType;
    if (location) whereClause.location = { contains: location, mode: 'insensitive' };
    
    if (minPrice || maxPrice) {
      whereClause.price = {};
      if (minPrice) whereClause.price.gte = parseFloat(minPrice);
      if (maxPrice) whereClause.price.lte = parseFloat(maxPrice);
    }

    const listings = await prisma.listing.findMany({
      where: whereClause,
      include: {
        user: {
          select: { name: true, role: true, phone: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(listings);
  } catch (error) {
    console.error('Fetch listings error:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
};

// Get single listing by ID
exports.getListingById = async (req, res) => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: { name: true, role: true, phone: true }
        }
      }
    });

    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    res.json(listing);
  } catch (error) {
    console.error('Fetch listing error:', error);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
};
