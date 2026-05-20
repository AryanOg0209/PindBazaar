const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const prisma = require('../utils/prisma');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function callClaudeWithRetry(params, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await anthropic.messages.create(params);
    } catch (err) {
      if (attempt < maxRetries && [529, 503, 429].includes(err.status)) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        continue;
      }
      throw err;
    }
  }
}

async function analyzeAadhaarDocument(documentId, userId, profileData) {
  try {
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new Error('Document not found');

    // Build absolute path - fileUrl is like /uploads/userId/filename.jpg
    const filePath = path.join(process.cwd(), doc.fileUrl.startsWith('/') ? doc.fileUrl.slice(1) : doc.fileUrl);
    if (!fs.existsSync(filePath)) throw new Error('File not found: ' + filePath);

    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');
    const ext = path.extname(doc.fileUrl).toLowerCase();

    let contentBlock;
    if (ext === '.pdf') {
      contentBlock = {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: base64Data }
      };
    } else {
      const mediaType = ext === '.png' ? 'image/png' : 'image/jpeg';
      contentBlock = {
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64Data }
      };
    }

    const profileContext = `
Claimed profile details:
- Name: ${profileData.name || 'Not provided'}
- Village: ${profileData.village || 'N/A'}
- District: ${profileData.district || 'N/A'}
- State: ${profileData.state || 'N/A'}
- Pincode: ${profileData.pincode || 'N/A'}
- Role: ${profileData.role || 'N/A'}
`;

    const response = await callClaudeWithRetry({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      messages: [{
        role: 'user',
        content: [
          contentBlock,
          {
            type: 'text',
            text: `You are a KYC verification officer for PindBazaar, an agricultural marketplace in India.

Analyze this Aadhaar card document and extract all visible information. Then compare with the claimed profile.

${profileContext}

Respond with ONLY a valid JSON object - no markdown, no explanation:
{
  "parsedName": "Full name as on Aadhaar or null if unreadable",
  "parsedDob": "DD/MM/YYYY or null",
  "parsedGender": "Male/Female/Other or null",
  "parsedAddress": "Full address string or null",
  "parsedUidLast4": "Last 4 digits only e.g. 1234 or null",
  "nameMatchScore": 85,
  "addressMatchScore": 70,
  "fraudFlags": [],
  "isDocumentGenuine": true,
  "trustScore": 88,
  "trustLevel": "high",
  "aiSummary": "2-3 sentence admin summary of the verification."
}

Scoring rules:
- nameMatchScore 0-100: exact name match=100, similar/nickname=70-85, slightly different=40-70, clearly different=0-30
- addressMatchScore 0-100: district+state match=80+, only state match=50-70, no match=0-30
- fraudFlags: ["Name mismatch", "Address inconsistency", "Document appears edited", "Low quality image"] - add only real concerns, empty array if none
- isDocumentGenuine: false if document looks edited, fake, or is clearly not an Aadhaar
- trustScore: overall 0-100 (nameMatch*0.4 + addressMatch*0.3 + genuineness*0.3, penalize fraud flags heavily)
- trustLevel: "low"(<40), "medium"(40-70), "high"(70-90), "verified"(90+)
- If document is completely unreadable, set all parsed fields to null, trustScore to 20, trustLevel to "low", fraudFlags to ["Document unreadable"]`
          }
        ]
      }]
    });

    const text = response.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in Claude response');

    const analysis = JSON.parse(jsonMatch[0]);

    const verification = await prisma.aadhaarVerification.upsert({
      where: { userId },
      update: {
        documentId,
        parsedName: analysis.parsedName || null,
        parsedDob: analysis.parsedDob || null,
        parsedGender: analysis.parsedGender || null,
        parsedAddress: analysis.parsedAddress || null,
        parsedUidLast4: analysis.parsedUidLast4 || null,
        nameMatchScore: typeof analysis.nameMatchScore === 'number' ? analysis.nameMatchScore : null,
        addressMatchScore: typeof analysis.addressMatchScore === 'number' ? analysis.addressMatchScore : null,
        fraudFlags: Array.isArray(analysis.fraudFlags) ? analysis.fraudFlags : [],
        isDocumentGenuine: typeof analysis.isDocumentGenuine === 'boolean' ? analysis.isDocumentGenuine : true,
        trustScore: typeof analysis.trustScore === 'number' ? analysis.trustScore : null,
        trustLevel: analysis.trustLevel || null,
        aiSummary: analysis.aiSummary || null,
        status: 'completed',
      },
      create: {
        userId,
        documentId,
        parsedName: analysis.parsedName || null,
        parsedDob: analysis.parsedDob || null,
        parsedGender: analysis.parsedGender || null,
        parsedAddress: analysis.parsedAddress || null,
        parsedUidLast4: analysis.parsedUidLast4 || null,
        nameMatchScore: typeof analysis.nameMatchScore === 'number' ? analysis.nameMatchScore : null,
        addressMatchScore: typeof analysis.addressMatchScore === 'number' ? analysis.addressMatchScore : null,
        fraudFlags: Array.isArray(analysis.fraudFlags) ? analysis.fraudFlags : [],
        isDocumentGenuine: typeof analysis.isDocumentGenuine === 'boolean' ? analysis.isDocumentGenuine : true,
        trustScore: typeof analysis.trustScore === 'number' ? analysis.trustScore : null,
        trustLevel: analysis.trustLevel || null,
        aiSummary: analysis.aiSummary || null,
        status: 'completed',
      },
    });

    console.log(`[Verification] userId=${userId} trustScore=${analysis.trustScore} trustLevel=${analysis.trustLevel}`);
    return verification;
  } catch (err) {
    console.error('[Verification] Error:', err.message);
    try {
      await prisma.aadhaarVerification.upsert({
        where: { userId },
        update: { documentId, status: 'failed', fraudFlags: ['Analysis failed: ' + err.message] },
        create: { userId, documentId, status: 'failed', fraudFlags: ['Analysis failed: ' + err.message] },
      });
    } catch (e2) { console.error('[Verification] Failed to save error state:', e2.message); }
    return null;
  }
}

async function getVerificationStatus(req, res) {
  try {
    const verification = await prisma.aadhaarVerification.findUnique({
      where: { userId: req.user.id }
    });
    res.json({ verification });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

async function triggerReanalysis(req, res) {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        farmerProfile: true, industryProfile: true,
        balerProfile: true, moverProfile: true,
        documents: true,
      }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const aadhaarDoc = user.documents.find(d => d.docType === 'aadhaar');
    if (!aadhaarDoc) return res.status(400).json({ error: 'No Aadhaar document found' });

    const profile = user.farmerProfile || user.industryProfile || user.balerProfile || user.moverProfile;
    const profileData = {
      name: user.name,
      village: profile?.village,
      district: profile?.district,
      state: profile?.state,
      pincode: profile?.pincode,
      role: user.role,
    };

    // Run async
    analyzeAadhaarDocument(aadhaarDoc.id, userId, profileData).catch(console.error);

    res.json({ message: 'Verification re-triggered', status: 'processing' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { analyzeAadhaarDocument, getVerificationStatus, triggerReanalysis };
