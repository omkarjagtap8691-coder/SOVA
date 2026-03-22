const API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000/api/products'
  : '/api/products';

window.addEventListener('DOMContentLoaded', async () => {
  // Load filters
  try {
    const [cats, sites] = await Promise.all([
      fetch(`${API}/categories`).then(r => r.json()),
      fetch(`${API}/sites`).then(r => r.json())
    ]);
    const catSel = document.getElementById('categoryFilter');
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c; opt.textContent = c;
      catSel.appendChild(opt);
    });
    const siteSel = document.getElementById('siteFilter');
    sites.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s; opt.textContent = s;
      siteSel.appendChild(opt);
    });
  } catch (e) {
    console.error('Failed to load filters', e);
  }

  // Search input keyboard & suggestions
  const input = document.getElementById('searchInput');
  input.addEventListener('keydown', e => {
    const active = document.querySelector('.suggestion-item.active');
    const items  = document.querySelectorAll('.suggestion-item');
    if (e.key === 'Enter') {
      if (active) active.click();
      else { hideSuggestions(); searchProducts(); }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!active && items.length) items[0].classList.add('active');
      else if (active) { active.classList.remove('active'); active.nextElementSibling?.classList.add('active'); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (active) { active.classList.remove('active'); active.previousElementSibling?.classList.add('active'); }
    } else if (e.key === 'Escape') {
      hideSuggestions();
    }
  });

  let debounceTimer;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fetchSuggestions(input.value), 200);
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrapper')) hideSuggestions();
  });

  // Load all products on startup
  showLoading();
  document.getElementById('filtersSection').style.display = 'block';
  try {
    const res  = await fetch(`${API}?sort=price_asc`);
    const data = await res.json();
    renderResults(data);
    const stat = document.getElementById('statProducts');
    if (stat && data.total) stat.textContent = '500+';
  } catch (e) {
    showError();
  }
});

async function fetchSuggestions(query) {
  if (!query || query.trim().length < 2) { hideSuggestions(); return; }
  try {
    const res  = await fetch(`${API}/suggestions?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    renderSuggestions(data);
  } catch (e) { hideSuggestions(); }
}

function renderSuggestions(items) {
  const box = document.getElementById('suggestions');
  if (!items.length) { hideSuggestions(); return; }
  box.innerHTML = items.map(s => `
    <div class="suggestion-item" onclick="selectSuggestion('${s.name.replace(/'/g, "\\'")}')">
      <img class="suggestion-img" src="${proxyImg(s.image)}" alt="${s.name}"
        onerror="this.onerror=null;this.src='${FALLBACK_IMAGES[s.category] || 'https://cdn-icons-png.flaticon.com/256/3659/3659899.png'}'" />
      <div class="suggestion-text">
        <div class="suggestion-name">${s.name}</div>
        <div class="suggestion-meta">${s.brand}</div>
      </div>
      <span class="suggestion-category">${s.category}</span>
    </div>`).join('');
  box.style.display = 'block';
}

function selectSuggestion(name) {
  document.getElementById('searchInput').value = name;
  hideSuggestions();
  searchProducts();
}

function hideSuggestions() {
  const box = document.getElementById('suggestions');
  box.style.display = 'none';
  box.innerHTML = '';
}

async function searchProducts() {
  const query    = document.getElementById('searchInput').value.trim();
  const category = document.getElementById('categoryFilter').value;
  const site     = document.getElementById('siteFilter').value;
  const sort     = document.getElementById('sortFilter').value;
  const maxPrice = document.getElementById('maxPrice').value;

// searchProducts should also work when only maxPrice is set
  if (!query && !category && !site && !maxPrice) {
    showEmpty(); return;
  }

  hideSuggestions();
  showLoading();

  const params = new URLSearchParams();
  if (query)    params.set('q', query);
  if (category) params.set('category', category);
  if (site)     params.set('site', site);
  if (sort)     params.set('sort', sort);
  if (maxPrice) params.set('maxPrice', maxPrice);

  try {
    const res  = await fetch(`${API}?${params}`);
    const data = await res.json();
    renderResults(data);
  } catch (err) {
    console.error(err);
    showError();
  }
}

function renderResults({ total, products, lastUpdated, liveData }) {
  const grid    = document.getElementById('results');
  const info    = document.getElementById('resultsInfo');
  const liveBar = document.getElementById('liveBar');
  const empty   = document.getElementById('emptyState');
  const loading = document.getElementById('loadingState');

  loading.style.display = 'none';

  if (!products || products.length === 0) {
    grid.innerHTML = '';
    info.style.display  = 'none';
    liveBar.style.display = 'none';
    empty.style.display = 'block';
    empty.innerHTML = `
      <i class="fa-solid fa-face-frown"></i>
      <h2>No products found</h2>
      <p>Try a different search term or remove some filters</p>`;
    return;
  }

  empty.style.display = 'none';
  info.style.display  = 'block';
  info.textContent    = `Found ${total} product${total !== 1 ? 's' : ''}`;

  // Live data bar
  if (lastUpdated) {
    const time = new Date(lastUpdated).toLocaleTimeString();
    liveBar.style.display = 'flex';
    liveBar.innerHTML = `
      <span class="live-dot"></span>
      Prices updated live &nbsp;·&nbsp; Last updated: ${time}
      &nbsp;·&nbsp; Auto-refresh every 5 minutes`;
  }

  grid.innerHTML = products.map(p => buildCard(p)).join('');
  document.getElementById('filtersSection').style.display = 'block';
}

// Generate affiliate buy URL for each platform
const ASSOCIATE_TAG = 'sovapricecomp-21';
function getBuyUrl(site, productName) {
  const q = encodeURIComponent(productName);
  const urls = {
    'Amazon':    `https://www.amazon.in/s?k=${q}&tag=${ASSOCIATE_TAG}`,
    'Flipkart':  `https://www.flipkart.com/search?q=${q}`,
    'Myntra':    `https://www.myntra.com/${q}`,
    'Meesho':    `https://www.meesho.com/search?q=${q}`,
    'Snapdeal':  `https://www.snapdeal.com/search?keyword=${q}`,
    'Ajio':      `https://www.ajio.com/search/?text=${q}`,
    'Tata Cliq': `https://www.tatacliq.com/search/?searchCategory=all&text=${q}`,
    'ShopClues': `https://www.shopclues.com/search?q=${q}`,
    'Nykaa':     `https://www.nykaa.com/search/result/?q=${q}`,
    'BigBasket': `https://www.bigbasket.com/ps/?q=${q}`,
  };
  return urls[site] || `https://www.amazon.in/s?k=${q}&tag=${ASSOCIATE_TAG}`;
}


function proxyImg(url) {
  if (!url) return '';
  // Only proxy known blocked domains, let open CDNs load directly
  const blocked = ['media-amazon.com', 'flipkart.com', 'myntra.com', 'static-assets'];
  if (blocked.some(d => url.includes(d))) {
    return `/api/image?url=${encodeURIComponent(url)}`;
  }
  return url;
}

// Category fallback images (always work)
const FALLBACK_IMAGES = {
  'Smartphones':  'https://cdn-icons-png.flaticon.com/256/0/191.png',
  'Laptops':      'https://cdn-icons-png.flaticon.com/256/689/689396.png',
  'Audio':        'https://cdn-icons-png.flaticon.com/256/3659/3659784.png',
  'TVs':          'https://cdn-icons-png.flaticon.com/256/1042/1042339.png',
  'Fashion':      'https://cdn-icons-png.flaticon.com/256/2589/2589175.png',
  'Beauty':       'https://cdn-icons-png.flaticon.com/256/3081/3081986.png',
  'Books':        'https://cdn-icons-png.flaticon.com/256/2702/2702154.png',
  'Groceries':    'https://cdn-icons-png.flaticon.com/256/3724/3724788.png',
  'Appliances':   'https://cdn-icons-png.flaticon.com/256/2553/2553642.png',
  'Sports':       'https://cdn-icons-png.flaticon.com/256/857/857401.png',
  'Toys':         'https://cdn-icons-png.flaticon.com/256/3082/3082048.png',
  'Electronics':  'https://cdn-icons-png.flaticon.com/256/3659/3659899.png',
};

function getImgSrc(p) {
  return FALLBACK_IMAGES[p.category] || 'https://cdn-icons-png.flaticon.com/256/3659/3659899.png';
}

function buildCard(p) {
  const listingsHTML = p.listings.map((l, i) => {
    const siteClass = l.site.toLowerCase().replace(/\s+/g, '');
    const isBest    = i === 0;
    const discount  = l.originalPrice > l.price
      ? Math.round((1 - l.price / l.originalPrice) * 100) : 0;

    return `
      <div class="listing-row ${isBest ? 'best' : ''} ${!l.inStock ? 'out-of-stock' : ''}">
        <span class="site-name ${siteClass}">${l.site}${isBest ? ' 🏆' : ''}</span>
        <span class="listing-rating">${'★'.repeat(Math.round(l.rating))} ${l.rating}</span>
        <span>
          <span class="listing-price">₹${l.price.toLocaleString('en-IN')}</span>
          ${l.originalPrice > l.price ? `<span class="listing-original">₹${l.originalPrice.toLocaleString('en-IN')}</span>` : ''}
          ${discount > 0 ? `<span style="font-size:0.72rem;color:#16a34a;margin-left:4px">-${discount}%</span>` : ''}
        </span>
        ${l.inStock
          ? `<a href="${getBuyUrl(l.site, p.name)}" class="buy-btn" target="_blank" rel="noopener">Buy</a>`
          : `<span class="out-of-stock-tag">Out of Stock</span>`}
      </div>`;
  }).join('');

  const savings = p.savings > 0
    ? `<span class="savings-badge">Save ₹${p.savings.toLocaleString('en-IN')}</span>` : '';

  return `
    <div class="product-card">
      <div class="card-header">
        <img class="card-img" src="${proxyImg(p.image)}" alt="${p.name}"
          onerror="this.onerror=null;this.src='${getImgSrc(p)}'"/>
        <div class="card-info">
          <div class="card-category">${p.category}</div>
          <div class="card-name">${p.name}</div>
          <div class="card-brand">${p.brand}</div>
        </div>
      </div>
      <div class="best-price-row">
        <div>
          <div class="best-label">Best Price on ${p.bestSite}</div>
          <div class="best-price">₹${p.bestPrice.toLocaleString('en-IN')}</div>
        </div>
        ${savings}
      </div>
      <div class="listings">
        <div class="listings-title">Compare across platforms (${p.listings.length})</div>
        ${listingsHTML}
      </div>
    </div>`;
}

function showLoading() {
  document.getElementById('results').innerHTML = '';
  document.getElementById('resultsInfo').style.display = 'none';
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('loadingState').style.display = 'block';
}

function showEmpty() {
  document.getElementById('results').innerHTML = '';
  document.getElementById('resultsInfo').style.display = 'none';
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('emptyState').style.display = 'block';
  document.getElementById('emptyState').innerHTML = `
    <i class="fa-solid fa-magnifying-glass-dollar"></i>
    <h2>Search for any product</h2>
    <p>Compare prices across 10 major Indian shopping platforms instantly</p>`;
}

function showError() {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('results').innerHTML = `
    <div class="empty-state">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <h2>Something went wrong</h2>
      <p>Please refresh the page and try again</p>
    </div>`;
}
