import { Context, Next } from 'hono';
import type { Env } from '../types/env';

/**
 * API Key authentication middleware
 * Checks for valid API key in X-API-Key header or Authorization header
 */
export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
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
  if (!secureCompare(apiKey, validApiKey)) {
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
 * Constant-time string comparison to prevent timing attacks
 */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}
