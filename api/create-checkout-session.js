export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
  const baseUrl = `https://${req.headers.host}`;

  try {
    const items = req.body;

    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('success_url', `${baseUrl}/success`);
    params.append('cancel_url', `${baseUrl}/cancel`);

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

    const session = await resp.json();

    if (session.url) {
      res.status(200).json({ url: session.url });
    } else {
      res.status(400).json({ error: session.error?.message || 'Stripe error' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
