const express = require('express');
const router = express.Router();
const DISTRICTS = require('../utils/districts');

// GET /api/districts  → { Punjab: [...], Haryana: [...] }
router.get('/', (req, res) => {
  res.json(DISTRICTS);
});

// GET /api/districts/:state
router.get('/:state', (req, res) => {
  const state = req.params.state;
  const districts = DISTRICTS[state];
  if (!districts) return res.status(404).json({ error: 'State not found' });
  res.json({ state, districts });
});

module.exports = router;
