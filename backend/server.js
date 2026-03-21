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

app.listen(3000, () => {
  console.log("SOVA server running on http://localhost:3000");
});
