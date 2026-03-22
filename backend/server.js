const express = require('express');
const cors    = require('cors');
const path    = require('path');

const { startScheduler } = require('./services/dataService');
const { imageProxy }     = require('./services/imageProxy');
const productRoutes      = require('./routes/productRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/products', productRoutes);
app.get('/api/image', imageProxy);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

startScheduler();

// ── Keep-alive ping (prevents Render free tier from sleeping) ────
const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_URL) {
  setInterval(() => {
    fetch(`${RENDER_URL}/api/products/status`)
      .then(() => console.log('[SOVA] Keep-alive ping sent'))
      .catch(() => {});
  }, 10 * 60 * 1000); // every 10 minutes
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SOVA server running on port ${PORT}`);
});
