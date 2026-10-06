import mongoose from 'mongoose';
import { handleCors } from '../lib/cors.js';
import { consumeContactRateLimit } from '../lib/rate-limit.js';

const MONGODB_URI = process.env.MONGODB_URI;

// Connection cache to prevent multiple connections in serverless
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    }).then((mongoose) => mongoose);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now }
});

const Contact = mongoose.models.Contact || mongoose.model('Contact', contactSchema);

export default async function handler(req, res) {
  if (!handleCors(req, res, 'POST')) return;
  try {
    await dbConnect();
    const rateLimit = await consumeContactRateLimit(req);
    if (rateLimit.unavailable) {
      return res.status(503).json({ error: 'Unable to verify request limit.' });
    }
    res.setHeader('X-RateLimit-Limit', rateLimit.limit);
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
    if (!rateLimit.allowed) {
      res.setHeader('Retry-After', rateLimit.retryAfter);
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    const { name, email, message } = req.body ?? {};
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'All fields required.' });
    }
    const newContact = new Contact({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      message: message.trim()
    });
    await newContact.save();
    res.status(200).json({ message: 'Contact saved successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save information.' });
  }
}
