const fetch = require('node-fetch');
const cron  = require('node-cron');
const baseProducts = require('../data/products');

// Live product cache — starts with our base data
let liveProducts = JSON.parse(JSON.stringify(baseProducts));
let lastUpdated  = new Date();
let fakeStoreLoaded = false;

// ── Map Fake Store categories to our categories ──────────────────
const categoryMap = {
  "electronics":        "Electronics",
  "jewelery":           "Fashion",
  "men's clothing":     "Fashion",
  "women's clothing":   "Fashion",
};

// ── Fetch from Fake Store API and merge into our catalog ─────────
async function fetchFakeStoreProducts() {
  try {
    console.log("[SOVA] Fetching live products from Fake Store API...");
    const res  = await fetch("https://fakestoreapi.com/products");
    const data = await res.json();

    const platforms = ["Amazon", "Flipkart", "Myntra", "Meesho", "Snapdeal", "Ajio", "Tata Cliq", "Nykaa"];

    const fetched = [];
    let idCounter = 5000;

    data.forEach(item => {
      const category = categoryMap[item.category] || "Electronics";
      const basePrice = Math.round(item.price * 83); // USD to INR

      // Create 2-4 platform listings per product with slight price variation
      const numPlatforms = 2 + Math.floor(Math.random() * 3);
      const shuffled = [...platforms].sort(() => Math.random() - 0.5).slice(0, numPlatforms);

      shuffled.forEach((site, i) => {
        const variation = 1 + (Math.random() * 0.1 - 0.05); // ±5%
        fetched.push({
          id: idCounter++,
          name: item.title.length > 60 ? item.title.slice(0, 60) + "..." : item.title,
          brand: item.category.charAt(0).toUpperCase() + item.category.slice(1),
          category,
          price: Math.round(basePrice * variation),
          originalPrice: Math.round(basePrice * 1.2),
          rating: parseFloat((item.rating?.rate || 4.0).toFixed(1)),
          image: item.image,
          site,
          inStock: Math.random() > 0.1, // 90% in stock
        });
      });
    });

    // Merge: keep our base products + add fetched ones (avoid duplicates by name)
    const existingNames = new Set(baseProducts.map(p => p.name.toLowerCase()));
    const newOnes = fetched.filter(p => !existingNames.has(p.name.toLowerCase()));

    liveProducts = [...JSON.parse(JSON.stringify(baseProducts)), ...newOnes];
    fakeStoreLoaded = true;
    lastUpdated = new Date();
    console.log(`[SOVA] Catalog updated: ${liveProducts.length} products (${newOnes.length} from Fake Store API)`);
  } catch (err) {
    console.error("[SOVA] Fake Store API fetch failed, using local data:", err.message);
  }
}

// ── Price fluctuation: shift prices ±5% every 2 hours ───────────
function fluctuatePrices() {
  liveProducts = liveProducts.map(p => {
    const shift = 1 + (Math.random() * 0.1 - 0.05); // ±5%
    return {
      ...p,
      price: Math.round(p.price * shift),
    };
  });
  lastUpdated = new Date();
  console.log(`[SOVA] Prices refreshed at ${lastUpdated.toLocaleTimeString()}`);
}

// ── Start scheduler ──────────────────────────────────────────────
function startScheduler() {
  // Fetch live data immediately on startup
  fetchFakeStoreProducts();

  // Re-fetch from Fake Store API every 6 hours
  cron.schedule('0 */6 * * *', () => {
    fetchFakeStoreProducts();
  });

  // Fluctuate prices every 2 hours
  cron.schedule('0 */2 * * *', () => {
    fluctuatePrices();
  });

  console.log("[SOVA] Auto-update scheduler started (API refresh: 6h, price update: 2h)");
}

// ── Getters ──────────────────────────────────────────────────────
function getProducts()   { return liveProducts; }
function getLastUpdated(){ return lastUpdated; }
function isLiveLoaded()  { return fakeStoreLoaded; }

module.exports = { startScheduler, getProducts, getLastUpdated, isLiveLoaded };
