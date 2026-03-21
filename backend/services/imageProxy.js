const fetch = require('node-fetch');

// Proxy route: GET /api/image?url=<encoded_url>
// Fetches the image server-side (bypassing browser CORS/hotlink blocks)
async function imageProxy(req, res) {
  const url = req.query.url;
  if (!url) return res.status(400).send('No URL');

  try {
    const response = await fetch(decodeURIComponent(url), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.google.com/',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      }
    });

    if (!response.ok) return res.status(404).send('Image not found');

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // cache 24h
    response.body.pipe(res);
  } catch (err) {
    res.status(500).send('Proxy error');
  }
}

module.exports = { imageProxy };
