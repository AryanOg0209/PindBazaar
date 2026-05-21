const express = require('express');
const router  = express.Router();
const wf      = require('../controllers/workflow.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/open',          wf.listOpenWorkflows);   // browse open jobs
router.get('/',              wf.listWorkflows);        // my workflows
router.post('/',             wf.createWorkflow);       // farmer creates
router.get('/:id',           wf.getWorkflow);          // full detail

// ── Baler bidding ──────────────────────────────────────
router.post('/:id/bid',                         wf.submitBid);          // baler places bid
router.post('/:id/accept-bid/:bidId',           wf.acceptBid);          // farmer accepts bid

// ── Baling progress ─────────────────────────────────────
router.put('/:id/baling-done',                  wf.balingDone);         // baler marks done

// ── Industry offers ──────────────────────────────────────
router.post('/:id/offer',                       wf.submitOffer);        // industry submits offer
router.post('/:id/accept-offer/:offerId',       wf.acceptOffer);        // farmer accepts offer

// ── Transport bidding ────────────────────────────────────
router.post('/:id/transport-bid',               wf.submitTransportBid);             // mover bids
router.post('/:id/accept-transport-bid/:bidId', wf.acceptTransportBid);             // farmer accepts

// ── Transit & delivery ───────────────────────────────────
router.put('/:id/pickup-done',                  wf.pickupDone);         // mover marks pickup
router.put('/:id/delivered',                    wf.markDelivered);      // mover/industry confirms
router.put('/:id/cancel',                       wf.cancelWorkflow);     // farmer/admin cancels

module.exports = router;
