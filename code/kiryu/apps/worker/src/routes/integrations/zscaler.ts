import { Hono } from 'hono';
import type { Env } from '../../types/env';
import { ZscalerClient } from '../../integrations/zscaler/client';
import type { ZscalerFullSummary } from '../../integrations/zscaler/client';
import { CacheService, CACHE_TTL } from '../../services/cache';

export const zscalerRoutes = new Hono<{ Bindings: Env }>();

// ============================================
// CONNECTION TEST
// ============================================

/**
 * Test Zscaler connection — returns auth status for OneAPI, legacy ZIA, legacy ZPA
 */
zscalerRoutes.get('/test', async (c) => {
  const client = new ZscalerClient(c.env);

  if (!client.isConfigured()) {
    return c.json({
      configured: false,
      message: 'Zscaler credentials not configured',
      oneApi: { configured: false, status: 'not_configured' },
      legacyZia: { configured: false, status: 'not_configured' },
      legacyZpa: { configured: false, status: 'not_configured' },
    });
  }

  try {
    const result = await client.testConnection();
    return c.json({
      configured: true,
      ...result,
    });
  } catch (error) {
    return c.json({
      error: 'Failed to test Zscaler connection',
      message: 'An internal error occurred',
    }, 500);
  }
});

// ============================================
// FULL SUMMARY (KV-CACHED)
// ============================================

/**
 * Get full Zscaler summary — ZIA + ZPA + Risk360, KV-cached for 5 min
 */
zscalerRoutes.get('/summary', async (c) => {
  const client = new ZscalerClient(c.env);

  if (!client.isConfigured()) {
    return c.json({ error: 'Zscaler not configured' }, 503);
  }

  try {
    const cache = new CacheService(c.env.CACHE);
    const cacheKey = 'zs:summary';
    const cached = await cache.get<ZscalerFullSummary>(cacheKey);

    if (cached) {
      return c.json({ ...cached.data, dataSource: 'cache', cachedAt: cached.cachedAt });
    }

    const summary = await client.getFullSummary();
    await cache.set(cacheKey, summary, CACHE_TTL.DASHBOARD_DATA);
    return c.json({ ...summary, dataSource: 'live' });
  } catch (error) {
    return c.json({
      error: 'Failed to fetch Zscaler summary',
      message: 'An internal error occurred',
    }, 500);
  }
});

// ============================================
// ZIA ENDPOINTS
// ============================================

/**
 * Get ZIA (Zscaler Internet Access) summary
 */
zscalerRoutes.get('/zia', async (c) => {
  const client = new ZscalerClient(c.env);

  if (!client.isZiaConfigured()) {
    return c.json({ error: 'ZIA not configured' }, 503);
  }

  try {
    const summary = await client.getZiaSummary();
    return c.json(summary);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch ZIA data',
      message: 'An internal error occurred',
    }, 500);
  }
});

// ============================================
// ZPA ENDPOINTS
// ============================================

/**
 * Get ZPA (Zscaler Private Access) summary
 */
zscalerRoutes.get('/zpa', async (c) => {
  const client = new ZscalerClient(c.env);

  if (!client.isZpaConfigured()) {
    return c.json({ error: 'ZPA not configured' }, 503);
  }

  try {
    const summary = await client.getZpaSummary();
    return c.json(summary);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch ZPA data',
      message: 'An internal error occurred',
    }, 500);
  }
});

/**
 * Get ZPA connector list with health status
 */
zscalerRoutes.get('/zpa/connectors', async (c) => {
  const client = new ZscalerClient(c.env);

  if (!client.isZpaConfigured()) {
    return c.json({ error: 'ZPA not configured' }, 503);
  }

  try {
    const summary = await client.getZpaSummary();
    const connectors = summary.connectors.list;
    return c.json({ connectors, count: connectors.length });
  } catch (error) {
    return c.json({
      error: 'Failed to fetch ZPA connectors',
      message: 'An internal error occurred',
    }, 500);
  }
});

// ============================================
// RISK360 ENDPOINTS
// ============================================

/**
 * Get Risk360 scores (stored in KV)
 */
zscalerRoutes.get('/risk360', async (c) => {
  const client = new ZscalerClient(c.env);

  try {
    const scores = await client.getRisk360Scores();
    if (!scores) {
      return c.json({ error: 'No Risk360 scores available', message: 'Scores have not been submitted yet' }, 404);
    }
    return c.json(scores);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch Risk360 scores',
      message: 'An internal error occurred',
    }, 500);
  }
});

/**
 * Submit Risk360 scores (manual entry — stored in KV)
 */
zscalerRoutes.post('/risk360', async (c) => {
  const client = new ZscalerClient(c.env);

  try {
    const body = await c.req.json();

    // Validate required field: updatedBy
    if (!body.updatedBy || typeof body.updatedBy !== 'string' || body.updatedBy.trim().length === 0) {
      return c.json({ error: 'updatedBy is required and must be a non-empty string' }, 400);
    }

    // Validate overallScore is a number 0-100
    if (typeof body.overallScore !== 'number' || body.overallScore < 0 || body.overallScore > 100) {
      return c.json({ error: 'overallScore must be a number between 0 and 100' }, 400);
    }

    // Validate optional numeric fields are numbers if present
    const numericFields = ['externalAttackSurface', 'compromise', 'lateralPropagation', 'dataLoss'] as const;
    for (const field of numericFields) {
      if (body[field] !== undefined && (typeof body[field] !== 'number' || body[field] < 0 || body[field] > 100)) {
        return c.json({ error: `${field} must be a number between 0 and 100` }, 400);
      }
    }

    await client.setRisk360Scores({
      overallScore: body.overallScore,
      externalAttackSurface: body.externalAttackSurface ?? 0,
      compromise: body.compromise ?? 0,
      lateralPropagation: body.lateralPropagation ?? 0,
      dataLoss: body.dataLoss ?? 0,
      updatedBy: body.updatedBy.trim(),
    });

    // Invalidate cached summary since risk360 is part of it
    const cache = new CacheService(c.env.CACHE);
    await cache.invalidate('zs:summary');

    const scores = await client.getRisk360Scores();
    return c.json({ success: true, scores });
  } catch (error) {
    return c.json({
      error: 'Failed to save Risk360 scores',
      message: 'An internal error occurred',
    }, 500);
  }
});

// ============================================
// DIAGNOSTIC ENDPOINT
// ============================================

/**
 * Per-module status check — reports configuration and availability of each Zscaler module
 */
zscalerRoutes.get('/diagnostic', async (c) => {
  const client = new ZscalerClient(c.env);

  const zia = { configured: client.isZiaConfigured(), status: 'not_configured' };
  const zpa = { configured: client.isZpaConfigured(), status: 'not_configured' };
  const risk360 = { configured: true, status: 'checking' };

  // Check ZIA
  if (client.isZiaConfigured()) {
    try {
      await client.getZiaSummary();
      zia.status = 'ok';
    } catch (e) {
      zia.status = `error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  // Check ZPA
  if (client.isZpaConfigured()) {
    try {
      await client.getZpaSummary();
      zpa.status = 'ok';
    } catch (e) {
      zpa.status = `error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  // Check Risk360 (always available — it's KV-backed)
  try {
    const scores = await client.getRisk360Scores();
    risk360.status = scores ? 'ok' : 'no_data';
  } catch (e) {
    risk360.status = `error: ${e instanceof Error ? e.message : String(e)}`;
  }

  const details = { zia, zpa, risk360 };
  const available = Object.entries(details)
    .filter(([, v]) => v.status === 'ok')
    .map(([k]) => k);
  const unavailable = Object.entries(details)
    .filter(([, v]) => v.status !== 'ok')
    .map(([k, v]) => ({ module: k, status: v.status }));

  return c.json({
    configured: client.isConfigured(),
    available,
    unavailable,
    details,
  });
});
