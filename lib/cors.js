const allowedOrigins = ['https://agaramai.com', 'http://localhost:5173', 'https://master.d1z9cmu638vh9k.amplifyapp.com'];

export function handleCors(req, res, method) {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', `${method}, OPTIONS`);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return false;
  }
  if (req.method !== method) {
    res.status(405).json({ error: 'Method not allowed' });
    return false;
  }
  return true;
}