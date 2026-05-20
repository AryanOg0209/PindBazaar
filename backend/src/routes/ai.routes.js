const express = require('express');
const router = express.Router();
const ai = require('../controllers/ai.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.post('/crop-prediction', ai.cropPrediction);
router.get('/job-match', ai.jobMatch);
router.post('/advisor', ai.cropAdvisor);
router.get('/earnings-summary', ai.earningsSummary);
router.get('/market-insights', ai.marketInsights);
router.post('/diagnose-disease', ai.diagnoseCropDisease);
router.post('/generate-listing', ai.generateListing);
router.post('/negotiation-advice', ai.negotiationAdvice);
router.post('/route-planner', ai.routePlanner);
router.post('/harvest-window', ai.harvestWindow);
router.post('/procurement-forecast', ai.procurementForecast);

module.exports = router;
