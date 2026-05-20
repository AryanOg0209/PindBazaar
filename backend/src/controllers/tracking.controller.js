// In-memory tracking store: orderId -> { lat, lng, accuracy, timestamp, moverName, isActive }
const store = new Map();

exports.startTracking = (req, res) => {
  const { orderId } = req.params;
  const { lat, lng, accuracy } = req.body;
  store.set(orderId, { lat, lng, accuracy: accuracy||0, timestamp: Date.now(), moverName: req.user.name || 'Mover', isActive: true });
  res.json({ success: true, message: 'Tracking started' });
};

exports.pingLocation = (req, res) => {
  const { orderId } = req.params;
  const { lat, lng, accuracy } = req.body;
  const existing = store.get(orderId) || {};
  store.set(orderId, { ...existing, lat, lng, accuracy: accuracy||0, timestamp: Date.now(), isActive: true });
  res.json({ success: true });
};

exports.getLocation = (req, res) => {
  const { orderId } = req.params;
  const data = store.get(orderId);
  if (!data || !data.isActive) return res.json({ isActive: false });
  const ageSeconds = Math.round((Date.now() - data.timestamp) / 1000);
  res.json({ ...data, ageSeconds });
};

exports.stopTracking = (req, res) => {
  const { orderId } = req.params;
  const existing = store.get(orderId);
  if (existing) store.set(orderId, { ...existing, isActive: false });
  res.json({ success: true });
};
