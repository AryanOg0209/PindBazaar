const prisma = require('../utils/prisma');
const path = require('path');

// GET /api/user/profile
async function getProfile(req, res) {
  try {
    const user = req.user;
    let profile = null;

    if (user.role === 'farmer') {
      profile = await prisma.farmerProfile.findUnique({ where: { userId: user.id } });
    } else if (user.role === 'industry') {
      profile = await prisma.industryProfile.findUnique({ where: { userId: user.id } });
    } else if (user.role === 'baler') {
      profile = await prisma.balerProfile.findUnique({ where: { userId: user.id } });
    } else if (user.role === 'mover') {
      profile = await prisma.moverProfile.findUnique({ where: { userId: user.id } });
    }

    const documents = await prisma.document.findMany({ where: { userId: user.id } });

    res.json({ user, profile, documents });
  } catch (err) {
    console.error('getProfile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// PUT /api/user/profile  – upsert role-specific profile
async function updateProfile(req, res) {
  try {
    const user = req.user;
    const data = req.body;

    let profile;

    if (user.role === 'farmer') {
      profile = await prisma.farmerProfile.upsert({
        where: { userId: user.id },
        update: {
          fullName: data.fullName,
          village: data.village,
          state: data.state,
          district: data.district,
          pincode: data.pincode,
          landAcres: data.landAcres ? parseFloat(data.landAcres) : undefined,
          cropTypes: data.cropTypes || [],
        },
        create: {
          userId: user.id,
          fullName: data.fullName,
          village: data.village,
          state: data.state,
          district: data.district,
          pincode: data.pincode,
          landAcres: data.landAcres ? parseFloat(data.landAcres) : null,
          cropTypes: data.cropTypes || [],
        },
      });
    } else if (user.role === 'industry') {
      profile = await prisma.industryProfile.upsert({
        where: { userId: user.id },
        update: {
          companyName: data.companyName,
          contactPerson: data.contactPerson,
          village: data.village,
          state: data.state,
          district: data.district,
          pincode: data.pincode,
          industryType: data.industryType,
          gstNumber: data.gstNumber,
        },
        create: {
          userId: user.id,
          companyName: data.companyName,
          contactPerson: data.contactPerson,
          village: data.village,
          state: data.state,
          district: data.district,
          pincode: data.pincode,
          industryType: data.industryType,
          gstNumber: data.gstNumber,
        },
      });
    } else if (user.role === 'baler') {
      profile = await prisma.balerProfile.upsert({
        where: { userId: user.id },
        update: {
          fullName: data.fullName,
          village: data.village,
          state: data.state,
          district: data.district,
          pincode: data.pincode,
          machineType: data.machineType,
          machineCount: data.machineCount ? parseInt(data.machineCount) : 1,
          pricePerBale: data.pricePerBale ? parseFloat(data.pricePerBale) : null,
        },
        create: {
          userId: user.id,
          fullName: data.fullName,
          village: data.village,
          state: data.state,
          district: data.district,
          pincode: data.pincode,
          machineType: data.machineType,
          machineCount: data.machineCount ? parseInt(data.machineCount) : 1,
          pricePerBale: data.pricePerBale ? parseFloat(data.pricePerBale) : null,
        },
      });
    } else if (user.role === 'mover') {
      profile = await prisma.moverProfile.upsert({
        where: { userId: user.id },
        update: {
          fullName: data.fullName,
          village: data.village,
          state: data.state,
          district: data.district,
          pincode: data.pincode,
          vehicleType: data.vehicleType,
          vehicleCount: data.vehicleCount ? parseInt(data.vehicleCount) : 1,
          licenseNo: data.licenseNo,
        },
        create: {
          userId: user.id,
          fullName: data.fullName,
          village: data.village,
          state: data.state,
          district: data.district,
          pincode: data.pincode,
          vehicleType: data.vehicleType,
          vehicleCount: data.vehicleCount ? parseInt(data.vehicleCount) : 1,
          licenseNo: data.licenseNo,
        },
      });
    }

    // Update user name
    if (data.fullName || data.companyName) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name: data.fullName || data.companyName },
      });
    }

    res.json({ profile });
  } catch (err) {
    console.error('updateProfile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// POST /api/user/documents  – upload documents
async function uploadDocuments(req, res) {
  try {
    const user = req.user;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const docs = await Promise.all(
      files.map((file) =>
        prisma.document.create({
          data: {
            userId: user.id,
            docType: file.fieldname,
            fileUrl: `/uploads/${user.id}/${file.filename}`,
          },
        })
      )
    );

    // Trigger Aadhaar verification asynchronously
    const aadhaarDoc = docs.find(d => d.docType === 'aadhaar');
    if (aadhaarDoc) {
      const { analyzeAadhaarDocument } = require('./verification.controller');
      let profile = null;
      try {
        if (user.role === 'farmer') profile = await prisma.farmerProfile.findUnique({ where: { userId: user.id } });
        else if (user.role === 'industry') profile = await prisma.industryProfile.findUnique({ where: { userId: user.id } });
        else if (user.role === 'baler') profile = await prisma.balerProfile.findUnique({ where: { userId: user.id } });
        else if (user.role === 'mover') profile = await prisma.moverProfile.findUnique({ where: { userId: user.id } });
      } catch {}
      const profileData = {
        name: user.name,
        village: profile?.village,
        district: profile?.district,
        state: profile?.state,
        pincode: profile?.pincode,
        role: user.role,
      };
      analyzeAadhaarDocument(aadhaarDoc.id, user.id, profileData).catch(console.error);
    }

    res.json({ documents: docs });
  } catch (err) {
    console.error('uploadDocuments error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/user/status
async function getStatus(req, res) {
  try {
    res.json({
      status: req.user.status,
      role: req.user.role,
      adminNotes: req.user.adminNotes,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getProfile, updateProfile, uploadDocuments, getStatus };
