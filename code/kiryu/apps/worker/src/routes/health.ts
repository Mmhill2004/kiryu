import { Hono } from 'hono';
import type { Env } from '../types/env';

export const healthRoutes = new Hono<{ Bindings: Env }>();

/**
 * Basic health check endpoint
 */
healthRoutes.get('/', async (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Detailed health check with dependency status
 */
healthRoutes.get('/detailed', async (c) => {
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {};

  // Check D1 Database
  const dbStart = Date.now();
  try {
    await c.env.DB.prepare('SELECT 1').first();
    checks['database'] = { status: 'healthy', latency: Date.now() - dbStart };
  } catch (error) {
    checks['database'] = { 
      status: 'unhealthy', 
      latency: Date.now() - dbStart,
      error: 'Connection failed'
    };
  }

  // Check KV
  const kvStart = Date.now();
  try {
    await c.env.CACHE.get('health-check');
    checks['cache'] = { status: 'healthy', latency: Date.now() - kvStart };
  } catch (error) {
    checks['cache'] = { 
      status: 'unhealthy', 
      latency: Date.now() - kvStart,
      error: 'Connection failed'
    };
  }

  // Check R2 — .head() returns null for non-existent objects (no throw),
  // so reaching the next line confirms R2 is reachable.
  const r2Start = Date.now();
  try {
    await c.env.REPORTS_BUCKET.head('health-check');
    checks['storage'] = { status: 'healthy', latency: Date.now() - r2Start };
  } catch (error) {
    checks['storage'] = {
      status: 'unhealthy',
      latency: Date.now() - r2Start,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }

  const allHealthy = Object.values(checks).every(c => c.status === 'healthy');
  const overallStatus = allHealthy ? 'healthy' : 'degraded';

  return c.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    checks,
  }, allHealthy ? 200 : 503);
});

/**
 * Readiness check for load balancers
 */
healthRoutes.get('/ready', async (c) => {
  try {
    // Quick database check
    await c.env.DB.prepare('SELECT 1').first();
    return c.json({ ready: true });
  } catch {
    return c.json({ ready: false }, 503);
  }
});

/**
 * Liveness check for container orchestration
 */
healthRoutes.get('/live', (c) => {
  return c.json({ alive: true });
});
