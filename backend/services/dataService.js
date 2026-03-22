const fetch = require('node-fetch');
const cron  = require('node-cron');
const baseProducts = require('../data/products');

// Live product cache — starts with our base data
let liveProducts = JSON.parse(JSON.stringify(baseProducts));
let lastUpdated  = new Date();
let apiLoaded    = false;
let autoAddedCount = 0;

const PLATFORMS = ["Amazon", "Flipkart", "Myntra", "Meesho", "Snapdeal", "Ajio", "Tata Cliq", "Nykaa", "BigBasket", "ShopClues"];

// ── Category maps ────────────────────────────────────────────────
const fakeStoreCategoryMap = {
  "electronics":      "Electronics",
  "jewelery":         "Fashion",
  "men's clothing":   "Fashion",
  "women's clothing": "Fashion",
};

const dummyJsonCategoryMap = {
  "smartphones":        "Smartphones",
  "laptops":            "Laptops",
  "fragrances":         "Beauty",
  "skincare":           "Beauty",
  "groceries":          "Groceries",
  "home-decoration":    "Home",
  "furniture":          "Home",
  "tops":               "Fashion",
  "womens-dresses":     "Fashion",
  "womens-shoes":       "Fashion",
  "mens-shirts":        "Fashion",
  "mens-shoes":         "Fashion",
  "mens-watches":       "Electronics",
  "womens-watches":     "Fashion",
  "womens-bags":        "Fashion",
  "womens-jewellery":   "Fashion",
  "sunglasses":         "Fashion",
  "automotive":         "Electronics",
  "motorcycle":         "Electronics",
  "lighting":           "Appliances",
};

// ── Helper: make platform listings from a single product ─────────
function makeListings(idStart, item, category, basePrice, image) {
  const listings = [];
  const numPlatforms = 2 + Math.floor(Math.random() * 4); // 2–5 platforms
  const shuffled = [...PLATFORMS].sort(() => Math.random() - 0.5).slice(0, numPlatforms);
  let id = idStart;

  shuffled.forEach(site => {
    const variation = 1 + (Math.random() * 0.12 - 0.06); // ±6%
    listings.push({
      id: id++,
      name:          item.name,
      brand:         item.brand,
      category,
      price:         Math.round(basePrice * variation),
      originalPrice: Math.round(basePrice * (1.15 + Math.random() * 0.15)),
      rating:        parseFloat((item.rating || 4.0).toFixed(1)),
      image,
      site,
      inStock:       Math.random() > 0.08,
    });
  });
  return listings;
}

// ── SOURCE 1: Fake Store API (20 products) ───────────────────────
async function fetchFakeStore(idStart) {
  const res  = await fetch("https://fakestoreapi.com/products", { timeout: 8000 });
  const data = await res.json();
  const results = [];
  let id = idStart;

  data.forEach(item => {
    const category  = fakeStoreCategoryMap[item.category] || "Electronics";
    const basePrice = Math.round(item.price * 83);
    const name      = item.title.length > 60 ? item.title.slice(0, 60) + "..." : item.title;
    const brand     = item.category.split("'")[0].trim();
    brand[0]?.toUpperCase();

    const numPlatforms = 2 + Math.floor(Math.random() * 4);
    const shuffled = [...PLATFORMS].sort(() => Math.random() - 0.5).slice(0, numPlatforms);

    shuffled.forEach(site => {
      const variation = 1 + (Math.random() * 0.1 - 0.05);
      results.push({
        id: id++,
        name,
        brand: brand.charAt(0).toUpperCase() + brand.slice(1),
        category,
        price:         Math.round(basePrice * variation),
        originalPrice: Math.round(basePrice * 1.2),
        rating:        parseFloat((item.rating?.rate || 4.0).toFixed(1)),
        image:         item.image,
        site,
        inStock:       Math.random() > 0.1,
      });
    });
  });

  console.log(`[SOVA] Fake Store: fetched ${data.length} products → ${results.length} listings`);
  return results;
}

// ── SOURCE 2: DummyJSON API (100+ products) ──────────────────────
async function fetchDummyJSON(idStart) {
  const res  = await fetch("https://dummyjson.com/products?limit=100&skip=0", { timeout: 8000 });
  const data = await res.json();
  const results = [];
  let id = idStart;

  (data.products || []).forEach(item => {
    const rawCat   = (item.category || "").toLowerCase();
    const category = dummyJsonCategoryMap[rawCat] || "Electronics";
    const basePrice = Math.round(item.price * 83);
    const name      = item.title.length > 60 ? item.title.slice(0, 60) + "..." : item.title;

    const numPlatforms = 2 + Math.floor(Math.random() * 4);
    const shuffled = [...PLATFORMS].sort(() => Math.random() - 0.5).slice(0, numPlatforms);

    shuffled.forEach(site => {
      const variation = 1 + (Math.random() * 0.12 - 0.06);
      results.push({
        id: id++,
        name,
        brand:         item.brand || "Generic",
        category,
        price:         Math.round(basePrice * variation),
        originalPrice: Math.round(basePrice * (1.15 + Math.random() * 0.1)),
        rating:        parseFloat((item.rating || 4.0).toFixed(1)),
        image:         item.thumbnail || item.images?.[0] || "",
        site,
        inStock:       (item.stock || 10) > 0,
      });
    });
  });

  console.log(`[SOVA] DummyJSON: fetched ${data.products?.length} products → ${results.length} listings`);
  return results;
}

// ── SOURCE 3: DummyJSON page 2 (next 100 products) ───────────────
async function fetchDummyJSONPage2(idStart) {
  const res  = await fetch("https://dummyjson.com/products?limit=100&skip=100", { timeout: 8000 });
  const data = await res.json();
  const results = [];
  let id = idStart;

  (data.products || []).forEach(item => {
    const rawCat   = (item.category || "").toLowerCase();
    const category = dummyJsonCategoryMap[rawCat] || "Electronics";
    const basePrice = Math.round(item.price * 83);
    const name      = item.title.length > 60 ? item.title.slice(0, 60) + "..." : item.title;

    const numPlatforms = 2 + Math.floor(Math.random() * 4);
    const shuffled = [...PLATFORMS].sort(() => Math.random() - 0.5).slice(0, numPlatforms);

    shuffled.forEach(site => {
      const variation = 1 + (Math.random() * 0.12 - 0.06);
      results.push({
        id: id++,
        name,
        brand:         item.brand || "Generic",
        category,
        price:         Math.round(basePrice * variation),
        originalPrice: Math.round(basePrice * (1.15 + Math.random() * 0.1)),
        rating:        parseFloat((item.rating || 4.0).toFixed(1)),
        image:         item.thumbnail || item.images?.[0] || "",
        site,
        inStock:       (item.stock || 10) > 0,
      });
    });
  });

  console.log(`[SOVA] DummyJSON p2: fetched ${data.products?.length} products → ${results.length} listings`);
  return results;
}

// ── MAIN: fetch all APIs and merge ───────────────────────────────
async function fetchAllAPIs() {
  console.log("[SOVA] Auto-fetching products from all APIs...");

  const existingNames = new Set(baseProducts.map(p => p.name.toLowerCase()));
  let allFetched = [];

  // Run all fetches in parallel
  const [fakeStore, dummyP1, dummyP2] = await Promise.allSettled([
    fetchFakeStore(5000),
    fetchDummyJSON(6000),
    fetchDummyJSONPage2(8000),
  ]);

  if (fakeStore.status === 'fulfilled') allFetched.push(...fakeStore.value);
  else console.error("[SOVA] Fake Store failed:", fakeStore.reason?.message);

  if (dummyP1.status === 'fulfilled') allFetched.push(...dummyP1.value);
  else console.error("[SOVA] DummyJSON p1 failed:", dummyP1.reason?.message);

  if (dummyP2.status === 'fulfilled') allFetched.push(...dummyP2.value);
  else console.error("[SOVA] DummyJSON p2 failed:", dummyP2.reason?.message);

  // Deduplicate against base products
  const newOnes = allFetched.filter(p => !existingNames.has(p.name.toLowerCase()));

  liveProducts   = [...JSON.parse(JSON.stringify(baseProducts)), ...newOnes];
  apiLoaded      = true;
  autoAddedCount = newOnes.length;
  lastUpdated    = new Date();

  const uniqueNames = new Set(liveProducts.map(p => p.name.toLowerCase())).size;
  console.log(`[SOVA] Catalog ready: ${liveProducts.length} listings | ${uniqueNames} unique products | ${newOnes.length} auto-added from APIs`);
}

// ── Price fluctuation ±5% every 2 hours ─────────────────────────
function fluctuatePrices() {
  liveProducts = liveProducts.map(p => ({
    ...p,
    price: Math.round(p.price * (1 + (Math.random() * 0.1 - 0.05))),
  }));
  lastUpdated = new Date();
  console.log(`[SOVA] Prices refreshed at ${lastUpdated.toLocaleTimeString()}`);
}

// ── Scheduler ────────────────────────────────────────────────────
function startScheduler() {
  fetchAllAPIs();

  // Re-fetch from all APIs every 6 hours
  cron.schedule('0 */6 * * *', fetchAllAPIs);

  // Fluctuate prices every 5 minutes
  cron.schedule('*/5 * * * *', fluctuatePrices);

  console.log("[SOVA] Scheduler started — API refresh: 6h | Price update: 2h");
}

// ── Getters ──────────────────────────────────────────────────────
function getProducts()    { return liveProducts; }
function getLastUpdated() { return lastUpdated; }
function isLiveLoaded()   { return apiLoaded; }
function getAutoAdded()   { return autoAddedCount; }

module.exports = { startScheduler, getProducts, getLastUpdated, isLiveLoaded, getAutoAdded };
