const express = require('express');
const router  = express.Router();
const wf      = require('../controllers/workflow.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/open',          wf.listOpenWorkflows);   // browse open jobs
router.get('/',              wf.listWorkflows);        // my workflows
router.post('/',             wf.createWorkflow);       // farmer creates
router.get('/:id',           wf.getWorkflow);          // full detail

router.post('/:id/accept-baling',    wf.acceptBaling);
router.put('/:id/baling-done',       wf.balingDone);
router.post('/:id/accept-transport', wf.acceptTransport);
router.put('/:id/pickup-done',       wf.pickupDone);
router.post('/:id/link-industry',    wf.linkIndustry);
router.put('/:id/delivered',         wf.markDelivered);
router.put('/:id/cancel',            wf.cancelWorkflow);

module.exports = router;
