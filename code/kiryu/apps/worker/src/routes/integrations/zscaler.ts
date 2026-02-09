import { Hono } from 'hono';
import type { Env } from '../../types/env';
import { ZscalerClient } from '../../integrations/zscaler/client';
import type { ZscalerFullSummary } from '../../integrations/zscaler/client';
import { ZscalerAuth } from '../../integrations/zscaler/auth';
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

/**
 * Raw ZPA connector response for debugging field names
 */
zscalerRoutes.get('/zpa/connectors/raw', async (c) => {
  const auth = new ZscalerAuth(c.env);
  const customerId = c.env.ZSCALER_ZPA_CUSTOMER_ID || '';
  try {
    const data = await auth.zpaFetch<unknown>(
      `/mgmtconfig/v1/admin/customers/${customerId}/connector?page=1&pageSize=2`
    );
    return c.json(data);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : String(e) }, 500);
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
// ZDX ENDPOINTS
// ============================================

/**
 * Get ZDX (Zscaler Digital Experience) summary
 */
zscalerRoutes.get('/zdx', async (c) => {
  const client = new ZscalerClient(c.env);

  if (!client.isZdxConfigured()) {
    return c.json({ error: 'ZDX not configured' }, 503);
  }

  try {
    const summary = await client.getZdxSummary();
    return c.json(summary);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch ZDX data',
      message: 'An internal error occurred',
    }, 500);
  }
});

/**
 * Get ZDX app scores
 */
zscalerRoutes.get('/zdx/apps', async (c) => {
  const client = new ZscalerClient(c.env);

  if (!client.isZdxConfigured()) {
    return c.json({ error: 'ZDX not configured' }, 503);
  }

  try {
    const summary = await client.getZdxSummary();
    return c.json({ apps: summary.apps, averageScore: summary.averageScore, scoreCategory: summary.scoreCategory });
  } catch (error) {
    return c.json({
      error: 'Failed to fetch ZDX apps',
      message: 'An internal error occurred',
    }, 500);
  }
});

/**
 * Get ZDX active alerts
 */
zscalerRoutes.get('/zdx/alerts', async (c) => {
  const client = new ZscalerClient(c.env);

  if (!client.isZdxConfigured()) {
    return c.json({ error: 'ZDX not configured' }, 503);
  }

  try {
    const summary = await client.getZdxSummary();
    return c.json(summary.alerts);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch ZDX alerts',
      message: 'An internal error occurred',
    }, 500);
  }
});

// ============================================
// ANALYTICS ENDPOINT
// ============================================

/**
 * Get Analytics traffic summary (GraphQL)
 */
zscalerRoutes.get('/analytics', async (c) => {
  const client = new ZscalerClient(c.env);

  if (!client.isAnalyticsConfigured()) {
    return c.json({ error: 'Analytics not configured (requires OneAPI)' }, 503);
  }

  try {
    const summary = await client.getAnalyticsSummary();
    if (!summary) {
      return c.json({ error: 'Analytics not available', message: 'Analytics API returned no data — may require Z-Insights subscription or API role configuration in ZIdentity' }, 404);
    }
    return c.json(summary);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch analytics data',
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
  const auth = new ZscalerAuth(c.env);

  // Test auth directly (not through summary which swallows errors)
  const oneApi = { configured: auth.isOneApiConfigured(), status: 'not_configured', tokenUrl: '' };
  const legacyZia = { configured: auth.isLegacyZiaConfigured(), status: 'not_configured' };
  const legacyZpa = { configured: auth.isLegacyZpaConfigured(), status: 'not_configured' };
  const zdx = { configured: auth.isZdxConfigured(), status: 'not_configured' };
  const analytics = { configured: client.isAnalyticsConfigured(), status: 'not_configured' };
  const risk360 = { configured: true, status: 'checking' };

  if (auth.isOneApiConfigured()) {
    oneApi.tokenUrl = auth.getOneApiTokenUrl();
    try {
      await auth.getOneApiToken();
      oneApi.status = 'ok';
    } catch (e) {
      oneApi.status = `error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  if (auth.isLegacyZiaConfigured()) {
    try {
      await auth.getZiaSession();
      legacyZia.status = 'ok';
      await auth.releaseZiaSession();
    } catch (e) {
      legacyZia.status = `error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  if (auth.isLegacyZpaConfigured()) {
    try {
      await auth.getZpaToken();
      legacyZpa.status = 'ok';
    } catch (e) {
      legacyZpa.status = `error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  try {
    const scores = await client.getRisk360Scores();
    risk360.status = scores ? 'ok' : 'no_data';
  } catch (e) {
    risk360.status = `error: ${e instanceof Error ? e.message : String(e)}`;
  }

  if (auth.isZdxConfigured()) {
    zdx.status = oneApi.status === 'ok' ? 'ok (via OneAPI)' : 'pending';
  }

  if (client.isAnalyticsConfigured()) {
    analytics.status = oneApi.status === 'ok' ? 'ok (via OneAPI)' : 'pending';
  }

  const authOk = oneApi.status === 'ok' || legacyZia.status === 'ok';
  const zpaAuthOk = oneApi.status === 'ok' || legacyZpa.status === 'ok';

  // Raw API probe: try one ZIA and one ZPA call to see actual HTTP responses
  const apiProbe = { zia: 'skipped', zpa: 'skipped' };
  if (authOk) {
    try {
      await auth.ziaFetch('/api/v1/status');
      apiProbe.zia = 'ok';
    } catch (e) {
      apiProbe.zia = `error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
  if (zpaAuthOk && c.env.ZSCALER_ZPA_CUSTOMER_ID) {
    try {
      await auth.zpaFetch(`/mgmtconfig/v1/admin/customers/${c.env.ZSCALER_ZPA_CUSTOMER_ID}/connector?page=1&pageSize=1`);
      apiProbe.zpa = 'ok';
    } catch (e) {
      apiProbe.zpa = `error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  // Per-endpoint ZIA probe to find which calls fail
  const ziaEndpoints: Record<string, string> = {};
  if (authOk) {
    const paths = [
      '/api/v1/security/advanced',
      '/api/v1/urlFilteringRules',
      '/api/v1/firewallRules',
      '/api/v1/dlpRules',
      '/api/v1/dlpDictionaries',
      '/api/v1/locations',
      '/api/v1/users?page=1&pageSize=1',
      '/api/v1/sslSettings',
      '/api/v1/status',
    ];
    const results = await Promise.allSettled(
      paths.map(async (p) => {
        try { await auth.ziaFetch(p); return 'ok'; }
        catch (e) { return `error: ${e instanceof Error ? e.message : String(e)}`; }
      })
    );
    for (let i = 0; i < paths.length; i++) {
      const r = results[i]!;
      ziaEndpoints[paths[i]!] = r.status === 'fulfilled' ? r.value : `rejected: ${r.reason}`;
    }
  }

  return c.json({
    configured: client.isConfigured(),
    auth: { oneApi, legacyZia, legacyZpa, zdx, analytics },
    endpoints: {
      oneApiGateway: auth.isOneApiConfigured() ? auth.getOneApiBaseUrl() : 'n/a (using legacy)',
      ziaBaseUrl: auth.getZiaBaseUrl(),
      zpaBaseUrl: auth.getZpaBaseUrl(),
    },
    apiProbe,
    ziaEndpoints,
    modules: {
      zia: { configured: client.isZiaConfigured(), authOk },
      zpa: { configured: client.isZpaConfigured(), authOk: zpaAuthOk },
      zdx: { configured: client.isZdxConfigured(), authOk: oneApi.status === 'ok' },
      analytics: { configured: client.isAnalyticsConfigured(), authOk: oneApi.status === 'ok' },
      risk360,
    },
    vanityDomain: c.env.ZSCALER_VANITY_DOMAIN ? `${c.env.ZSCALER_VANITY_DOMAIN.substring(0, 4)}***` : 'not set',
  });
});
