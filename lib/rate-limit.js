import { createHash } from 'node:crypto';
import mongoose from 'mongoose';

const LIMIT = 5;
const WINDOW_MS = 10 * 60 * 1000;

const rateLimitSchema = new mongoose.Schema({
  key: { type: String, required: true },
  windowStart: { type: Date, required: true },
  count: { type: Number, required: true },
  expiresAt: { type: Date, required: true },
}, { versionKey: false });

rateLimitSchema.index({ key: 1, windowStart: 1 }, { unique: true });
rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RateLimit = mongoose.models.RateLimit || mongoose.model('RateLimit', rateLimitSchema);

function getClientIp(headers) {
  const realIp = headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) return realIp.trim();

  const forwardedFor = headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string') {
    return forwardedFor.split(',').at(-1)?.trim() || null;
  }

  return null;
}

export async function consumeContactRateLimit(req) {
  const clientIp = getClientIp(req.headers);
  if (!clientIp) return { unavailable: true };

  const now = Date.now();
  const windowStartMs = Math.floor(now / WINDOW_MS) * WINDOW_MS;
  const windowStart = new Date(windowStartMs);
  const key = createHash('sha256').update(clientIp).digest('hex');

  await RateLimit.init();

  let record;
  try {
    record = await RateLimit.findOneAndUpdate(
      { key, windowStart },
      {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt: new Date(windowStartMs + WINDOW_MS) },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
    record = await RateLimit.findOneAndUpdate(
      { key, windowStart },
      { $inc: { count: 1 } },
      { new: true }
    );
  }

  const remaining = Math.max(0, LIMIT - record.count);
  const retryAfter = Math.max(1, Math.ceil((windowStartMs + WINDOW_MS - now) / 1000));

  return {
    allowed: record.count <= LIMIT,
    limit: LIMIT,
    remaining,
    retryAfter,
  };
}