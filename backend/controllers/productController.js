const { getProducts, getLastUpdated, isLiveLoaded } = require('../services/dataService');

const getProductsHandler = (req, res) => {
  const products = getProducts();
  const query    = (req.query.q || "").toLowerCase().trim();
  const category = (req.query.category || "").toLowerCase().trim();
  const site     = (req.query.site || "").toLowerCase().trim();
  const sort     = req.query.sort || "price_asc";
  const maxPrice = req.query.maxPrice ? parseInt(req.query.maxPrice) : null;

  let filtered = products.filter(p => {
    const matchQuery    = !query    || p.name.toLowerCase().includes(query) || p.brand.toLowerCase().includes(query);
    const matchCategory = !category || p.category.toLowerCase() === category;
    const matchSite     = !site     || p.site.toLowerCase() === site;
    const matchPrice    = !maxPrice || p.price <= maxPrice;
    return matchQuery && matchCategory && matchSite && matchPrice;
  });

  const grouped = {};
  filtered.forEach(p => {
    const key = p.name;
    if (!grouped[key]) grouped[key] = { name: p.name, brand: p.brand, category: p.category, image: p.image, listings: [] };
    grouped[key].listings.push({ site: p.site, price: p.price, originalPrice: p.originalPrice, rating: p.rating, url: p.url || '#', inStock: p.inStock });
  });

  let result = Object.values(grouped).map(g => {
    g.listings.sort((a, b) => a.price - b.price);
    g.bestPrice = g.listings[0]?.price || 0;
    g.bestSite  = g.listings[0]?.site  || "";
    g.savings   = (g.listings[0]?.originalPrice || 0) - (g.listings[0]?.price || 0);
    return g;
  });

  if (sort === "price_asc")       result.sort((a, b) => a.bestPrice - b.bestPrice);
  else if (sort === "price_desc") result.sort((a, b) => b.bestPrice - a.bestPrice);
  else if (sort === "rating")     result.sort((a, b) => (b.listings[0]?.rating || 0) - (a.listings[0]?.rating || 0));

  res.json({
    total: result.length,
    products: result,
    lastUpdated: getLastUpdated(),
    liveData: isLiveLoaded()
  });
};

const getCategories = (req, res) => {
  const products = getProducts();
  res.json([...new Set(products.map(p => p.category))].sort());
};

const getSites = (req, res) => {
  const products = getProducts();
  res.json([...new Set(products.map(p => p.site))].sort());
};

const getSuggestions = (req, res) => {
  const products = getProducts();
  const q = (req.query.q || "").toLowerCase().trim();
  if (!q || q.length < 2) return res.json([]);
  const seen = new Set();
  const suggestions = [];
  products.forEach(p => {
    const key = p.name;
    if (!seen.has(key) && (p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q))) {
      seen.add(key);
      suggestions.push({ name: p.name, brand: p.brand, category: p.category, image: p.image });
    }
  });
  res.json(suggestions.slice(0, 6));
};

const getStatus = (req, res) => {
  const products = getProducts();
  res.json({
    totalProducts: products.length,
    lastUpdated: getLastUpdated(),
    liveData: isLiveLoaded(),
    nextPriceUpdate: "Every 2 hours",
    nextApiRefresh: "Every 6 hours"
  });
};

module.exports = { getProducts: getProductsHandler, getCategories, getSites, getSuggestions, getStatus };
