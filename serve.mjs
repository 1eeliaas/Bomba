import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── STRIPE CONFIG ────────────────────────────────────────────────────────────
import { readFileSync } from 'fs';
function loadEnv() {
  try {
    readFileSync('.env', 'utf8').split('\n').forEach(line => {
      const [k, ...v] = line.split('=');
      if (k && v.length) process.env[k.trim()] = v.join('=').trim();
    });
  } catch {}
}
loadEnv();
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const PORT = 3000;
// ─────────────────────────────────────────────────────────────────────────────

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'text/javascript',
  '.mjs':  'text/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',  
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
};

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

async function createCheckoutSession(body) {
  const items = JSON.parse(body);

  const params = new URLSearchParams();
  params.append('mode', 'payment');
  params.append('success_url', `http://localhost:${PORT}/success`);
  params.append('cancel_url', `http://localhost:${PORT}/cancel`);

  items.forEach((item, i) => {
    params.append(`line_items[${i}][price_data][currency]`, 'eur');
    params.append(`line_items[${i}][price_data][product_data][name]`, item.name);
    params.append(`line_items[${i}][price_data][unit_amount]`, String(Math.round(item.price * 100)));
    params.append(`line_items[${i}][quantity]`, String(item.quantity));
  });

  const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  return resp.json();
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Stripe checkout endpoint
  if (req.method === 'POST' && req.url === '/create-checkout-session') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const session = await createCheckoutSession(body);
        if (session.url) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ url: session.url }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: session.error?.message || 'Stripe error' }));
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Static file serving
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  if (urlPath === '/success') urlPath = '/success.html';
  if (urlPath === '/cancel') urlPath = '/cancel.html';

  const filePath = path.join(__dirname, urlPath);
  serveFile(res, filePath);
});

server.listen(PORT, () => {
  console.log(`\n✦ Bomba Cakes — http://localhost:${PORT}\n`);
  console.log(`  ⚠️  Pour activer le paiement Stripe :`);
  console.log(`     Remplacez STRIPE_SECRET_KEY dans serve.mjs\n`);
});
