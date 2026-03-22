const fetch = require('node-fetch');
const cron  = require('node-cron');
const baseProducts = require('../data/products');

let liveProducts   = JSON.parse(JSON.stringify(baseProducts));
let lastUpdated    = new Date();
let apiLoaded      = false;
let autoAddedCount = 0;

const PLATFORMS = ["Amazon","Flipkart","Myntra","Meesho","Snapdeal","Ajio","Tata Cliq","Nykaa","BigBasket","ShopClues"];

const dummyJsonCategoryMap = {
  "smartphones":"Smartphones","laptops":"Laptops","fragrances":"Beauty",
  "skincare":"Beauty","groceries":"Groceries","home-decoration":"Home",
  "furniture":"Home","tops":"Fashion","womens-dresses":"Fashion",
  "womens-shoes":"Fashion","mens-shirts":"Fashion","mens-shoes":"Fashion",
  "mens-watches":"Electronics","womens-watches":"Fashion","womens-bags":"Fashion",
  "womens-jewellery":"Fashion","sunglasses":"Fashion","automotive":"Electronics",
  "motorcycle":"Electronics","lighting":"Appliances","sports-accessories":"Sports",
  "tablets":"Electronics","vehicle":"Electronics",
};

// ── Helper: create multi-platform listings ───────────────────────
function makeListings(idStart, name, brand, category, basePrice, image) {
  const num = 2 + Math.floor(Math.random() * 4);
  const platforms = [...PLATFORMS].sort(() => Math.random() - 0.5).slice(0, num);
  let id = idStart;
  return platforms.map(site => ({
    id: id++,
    name: name.length > 65 ? name.slice(0, 65) + "..." : name,
    brand,
    category,
    price:         Math.round(basePrice * (1 + (Math.random() * 0.12 - 0.06))),
    originalPrice: Math.round(basePrice * (1.15 + Math.random() * 0.15)),
    rating:        parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
    image,
    site,
    inStock: Math.random() > 0.08,
  }));
}

// ── SOURCE 1: Fake Store API ─────────────────────────────────────
async function fetchFakeStore(idStart) {
  const res  = await fetch("https://fakestoreapi.com/products", { timeout: 8000 });
  const data = await res.json();
  const catMap = { "electronics":"Electronics","jewelery":"Fashion","men's clothing":"Fashion","women's clothing":"Fashion" };
  let id = idStart, results = [];
  data.forEach(item => {
    const cat   = catMap[item.category] || "Electronics";
    const price = Math.round(item.price * 83);
    const listings = makeListings(id, item.title, item.category, cat, price, item.image);
    id += listings.length;
    results.push(...listings);
  });
  console.log(`[SOVA] FakeStore: ${data.length} products → ${results.length} listings`);
  return results;
}

// ── SOURCE 2 & 3: DummyJSON pages ───────────────────────────────
async function fetchDummyJSON(skip, idStart) {
  const res  = await fetch(`https://dummyjson.com/products?limit=100&skip=${skip}`, { timeout: 8000 });
  const data = await res.json();
  let id = idStart, results = [];
  (data.products || []).forEach(item => {
    const cat   = dummyJsonCategoryMap[(item.category||"").toLowerCase()] || "Electronics";
    const price = Math.round(item.price * 83);
    const img   = item.thumbnail || item.images?.[0] || "";
    const listings = makeListings(id, item.title, item.brand || "Generic", cat, price, img);
    id += listings.length;
    results.push(...listings);
  });
  console.log(`[SOVA] DummyJSON skip=${skip}: ${data.products?.length} products → ${results.length} listings`);
  return results;
}

// ── SOURCE 4: Open Library Books API ────────────────────────────
async function fetchOpenLibraryBooks(idStart) {
  const subjects = ["fiction","science","history","technology","cooking","sports","art","music","travel","business"];
  let id = idStart, results = [];
  for (const subject of subjects) {
    try {
      const res  = await fetch(`https://openlibrary.org/subjects/${subject}.json?limit=10`, { timeout: 8000 });
      const data = await res.json();
      (data.works || []).forEach(book => {
        const name  = book.title;
        const brand = book.authors?.[0]?.name || "Unknown Author";
        const cover = book.cover_id ? `https://covers.openlibrary.org/b/id/${book.cover_id}-M.jpg` : "";
        const price = 150 + Math.floor(Math.random() * 500);
        const listings = makeListings(id, name, brand, "Books", price, cover);
        id += listings.length;
        results.push(...listings);
      });
    } catch(e) {}
  }
  console.log(`[SOVA] OpenLibrary: ${results.length} book listings`);
  return results;
}

// ── SOURCE 5: Random User Products (Electronics/Gadgets) ─────────
async function fetchMockGadgets(idStart) {
  const gadgets = [
    { name:"Wireless Charging Pad 15W", brand:"Anker", category:"Electronics", price:1499, image:"https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=200&h=200&fit=crop" },
    { name:"USB-C Hub 7-in-1", brand:"Ugreen", category:"Electronics", price:2499, image:"https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=200&h=200&fit=crop" },
    { name:"Portable SSD 500GB", brand:"Samsung", category:"Electronics", price:5999, image:"https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200&h=200&fit=crop" },
    { name:"Smart LED Bulb Pack of 4", brand:"Philips", category:"Appliances", price:999, image:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop" },
    { name:"Fitness Resistance Bands Set", brand:"Boldfit", category:"Sports", price:599, image:"https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop" },
    { name:"Yoga Block Set of 2", brand:"Strauss", category:"Sports", price:449, image:"https://images.unsplash.com/photo-1601925228008-f5e4c5e5e5e5?w=200&h=200&fit=crop" },
    { name:"Stainless Steel Water Bottle 1L", brand:"Milton", category:"Home", price:399, image:"https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=200&h=200&fit=crop" },
    { name:"Bamboo Cutting Board", brand:"Solimo", category:"Home", price:349, image:"https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop" },
    { name:"Face Roller Jade Stone", brand:"Mamaearth", category:"Beauty", price:299, image:"https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=200&h=200&fit=crop" },
    { name:"Vitamin C Face Serum 30ml", brand:"Minimalist", category:"Beauty", price:599, image:"https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=200&h=200&fit=crop" },
    { name:"Whey Protein Chocolate 1kg", brand:"MuscleBlaze", category:"Sports", price:1799, image:"https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop" },
    { name:"Instant Pot 6L Electric Cooker", brand:"Instant Pot", category:"Appliances", price:8999, image:"https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=200&h=200&fit=crop" },
    { name:"Noise Cancelling Earbuds Pro", brand:"Noise", category:"Audio", price:3499, image:"https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200&h=200&fit=crop" },
    { name:"Smart Watch Fitness Tracker", brand:"Fastrack", category:"Electronics", price:2999, image:"https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=200&h=200&fit=crop" },
    { name:"Laptop Stand Adjustable", brand:"AmazonBasics", category:"Electronics", price:1299, image:"https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200&h=200&fit=crop" },
    { name:"Mechanical Keyboard TKL", brand:"Zebronics", category:"Electronics", price:2499, image:"https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=200&h=200&fit=crop" },
    { name:"Gaming Mouse RGB", brand:"Logitech", category:"Electronics", price:1999, image:"https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=200&h=200&fit=crop" },
    { name:"Webcam 1080p HD", brand:"Logitech", category:"Electronics", price:3499, image:"https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=200&h=200&fit=crop" },
    { name:"Desk Lamp LED Touch Control", brand:"Philips", category:"Home", price:899, image:"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&h=200&fit=crop" },
    { name:"Air Purifier HEPA Filter", brand:"Honeywell", category:"Appliances", price:7999, image:"https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=200&h=200&fit=crop" },
    { name:"Electric Toothbrush Sonic", brand:"Oral-B", category:"Beauty", price:2499, image:"https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop" },
    { name:"Sunscreen SPF 50 100ml", brand:"Neutrogena", category:"Beauty", price:449, image:"https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=200&h=200&fit=crop" },
    { name:"Protein Bar Box of 6", brand:"RiteBite", category:"Groceries", price:599, image:"https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=200&h=200&fit=crop" },
    { name:"Green Tea 100 Bags", brand:"Tetley", category:"Groceries", price:299, image:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop" },
    { name:"Badminton Shuttlecocks 6pcs", brand:"Yonex", category:"Sports", price:349, image:"https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=200&h=200&fit=crop" },
  ];
  let id = idStart, results = [];
  gadgets.forEach(g => {
    const listings = makeListings(id, g.name, g.brand, g.category, g.price, g.image);
    id += listings.length;
    results.push(...listings);
  });
  console.log(`[SOVA] MockGadgets: ${gadgets.length} products → ${results.length} listings`);
  return results;
}

// ── MAIN: fetch all APIs and merge ───────────────────────────────
async function fetchAllAPIs() {
  console.log("[SOVA] Auto-fetching products from all APIs...");
  const existingNames = new Set(baseProducts.map(p => p.name.toLowerCase()));
  let allFetched = [];

  const [s1, s2, s3, s4, s5, s6] = await Promise.allSettled([
    fetchFakeStore(5000),
    fetchDummyJSON(0,   6000),
    fetchDummyJSON(100, 8000),
    fetchDummyJSON(200, 10000),
    fetchOpenLibraryBooks(12000),
    fetchMockGadgets(15000),
  ]);

  [s1,s2,s3,s4,s5,s6].forEach((r,i) => {
    if (r.status === 'fulfilled') allFetched.push(...r.value);
    else console.error(`[SOVA] Source ${i+1} failed:`, r.reason?.message);
  });

  const newOnes = allFetched.filter(p => !existingNames.has(p.name.toLowerCase()));
  liveProducts   = [...JSON.parse(JSON.stringify(baseProducts)), ...newOnes];
  apiLoaded      = true;
  autoAddedCount = newOnes.length;
  lastUpdated    = new Date();

  const unique = new Set(liveProducts.map(p => p.name.toLowerCase())).size;
  console.log(`[SOVA] Catalog: ${liveProducts.length} listings | ${unique} unique products | ${newOnes.length} auto-added`);
}

// ── Price fluctuation every 5 minutes ───────────────────────────
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
  cron.schedule('*/30 * * * *', fetchAllAPIs);
  cron.schedule('*/5 * * * *',  fluctuatePrices);
  console.log("[SOVA] Scheduler started — API refresh: 30min | Price update: 5min");
}

function getProducts()    { return liveProducts; }
function getLastUpdated() { return lastUpdated; }
function isLiveLoaded()   { return apiLoaded; }
function getAutoAdded()   { return autoAddedCount; }

module.exports = { startScheduler, getProducts, getLastUpdated, isLiveLoaded, getAutoAdded };
