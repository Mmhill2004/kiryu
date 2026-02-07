import { Context, Next } from 'hono';
import type { AppContext } from '../types/env';

/**
 * API Key authentication middleware
 * Checks for valid API key in X-API-Key header or Authorization header
 */
export async function authMiddleware(c: Context<AppContext>, next: Next) {
  const apiKey = c.req.header('X-API-Key') || extractBearerToken(c.req.header('Authorization'));

  if (!apiKey) {
    return c.json({
      error: 'Unauthorized',
      message: 'Missing API key. Provide X-API-Key header or Authorization: Bearer <token>',
    }, 401);
  }

  // Validate API key
  const validApiKey = c.env.DASHBOARD_API_KEY;

  if (!validApiKey) {
    console.error('DASHBOARD_API_KEY not configured');
    return c.json({
      error: 'Server Configuration Error',
      message: 'Authentication not properly configured',
    }, 500);
  }

  // Constant-time comparison to prevent timing attacks
  if (!(await secureCompare(apiKey, validApiKey))) {
    return c.json({
      error: 'Unauthorized',
      message: 'Invalid API key',
    }, 401);
  }

  // Generate request ID for tracing
  const requestId = crypto.randomUUID();
  c.set('requestId', requestId);
  c.header('X-Request-Id', requestId);

  await next();
}

/**
 * Extract bearer token from Authorization header
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== 'bearer') {
    return null;
  }
  
  return parts[1] || null;
}

/**
 * Constant-time string comparison using HMAC-SHA256.
 * Hashing both inputs normalizes length and prevents timing side-channels.
 */
async function secureCompare(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode('kiryu-compare'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const [sigA, sigB] = await Promise.all([
    crypto.subtle.sign('HMAC', key, encoder.encode(a)),
    crypto.subtle.sign('HMAC', key, encoder.encode(b)),
  ]);
  const viewA = new Uint8Array(sigA);
  const viewB = new Uint8Array(sigB);
  let result = 0;
  for (let i = 0; i < viewA.length; i++) {
    result |= (viewA[i]! ^ viewB[i]!);
  }
  return result === 0;
}

/**
 * Safely parse an integer from a query parameter with bounds enforcement.
 * Returns the default if the value is missing, NaN, or out of bounds.
 */
export function safeInt(value: string | undefined, defaultVal: number, max: number): number {
  const n = parseInt(value || String(defaultVal), 10);
  if (isNaN(n) || n < 1) return defaultVal;
  return Math.min(n, max);
}
