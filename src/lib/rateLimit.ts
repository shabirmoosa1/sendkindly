import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
  routeName?: string;
}

interface TokenBucket {
  count: number;
  resetTime: number;
}

const store = new Map<string, TokenBucket>();

let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60_000;

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, bucket] of store) {
    if (now > bucket.resetTime) {
      store.delete(key);
    }
  }
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

/**
 * Check rate limit for the given request.
 * Returns null if allowed, or a 429 NextResponse if rate limited.
 */
export function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): NextResponse | null {
  cleanup();

  const ip = getClientIp(request);
  const key = `${config.routeName || 'default'}:${ip}`;
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  const bucket = store.get(key);

  if (!bucket || now > bucket.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs });
    return null;
  }

  if (bucket.count >= config.limit) {
    const retryAfter = Math.ceil((bucket.resetTime - now) / 1000);
    return NextResponse.json(
      { error: 'Too many requests. Please try again shortly.', retryAfter },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(config.limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  bucket.count++;
  return null;
}
