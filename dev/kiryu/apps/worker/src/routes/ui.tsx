import { Hono } from 'hono';
import type { Env } from '../types/env';
import { Dashboard } from '../views/Dashboard';
import { CrowdStrikeClient } from '../integrations/crowdstrike/client';
import { SalesforceClient, type TicketMetrics } from '../integrations/salesforce/client';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../services/cache';
import { TrendService, type CrowdStrikeTrends, type SalesforceTrends } from '../services/trends';

export const uiRoutes = new Hono<{ Bindings: Env }>();

/**
 * Main dashboard page
 */
uiRoutes.get('/', async (c) => {
  const validPeriods = ['24h', '7d', '30d', '90d'] as const;
  const rawPeriod = c.req.query('period') || '7d';
  const period = (validPeriods as readonly string[]).includes(rawPeriod)
    ? (rawPeriod as typeof validPeriods[number])
    : '7d';
  const forceRefresh = c.req.query('refresh') === 'true';
  const daysBack = period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90;

  const cache = new CacheService(c.env.CACHE);

  // Initialize with defaults
  let crowdstrike = null;
  let salesforce: TicketMetrics | null = null;
  let dataSource: 'cache' | 'live' = 'live';
  let cachedAt: string | null = null;
  let csTrends: CrowdStrikeTrends | null = null;
  let sfTrends: SalesforceTrends | null = null;
  let platforms: Array<{
    platform: string;
    status: 'healthy' | 'error' | 'not_configured' | 'unknown';
    last_sync: string | null;
    error_message?: string;
  }> = [];

  const csClient = new CrowdStrikeClient(c.env, c.env.CACHE);
  const sfClient = new SalesforceClient(c.env, c.env.CACHE);
  const trendService = new TrendService(c.env);

  const fetchPromises: Promise<void>[] = [];

  // CrowdStrike: try cache first, then live API
  if (csClient.isConfigured()) {
    const csCacheKey = `${CACHE_KEYS.CROWDSTRIKE_SUMMARY}:${period}`;

    fetchPromises.push((async () => {
      // Try cache first
      if (!forceRefresh) {
        const cached = await cache.get<typeof crowdstrike>(csCacheKey);
        if (cached) {
          crowdstrike = cached.data;
          dataSource = 'cache';
          cachedAt = cached.cachedAt;
          platforms.push({ platform: 'crowdstrike', status: 'healthy', last_sync: cached.cachedAt });
          return;
        }
      }

      // Fall back to live API
      try {
        crowdstrike = await csClient.getFullSummary(daysBack, 30);
        platforms.push({ platform: 'crowdstrike', status: 'healthy', last_sync: new Date().toISOString() });
        await cache.set(csCacheKey, crowdstrike, CACHE_TTL.DASHBOARD_DATA);
        dataSource = 'live';
      } catch (error) {
        console.error('CrowdStrike fetch error:', error instanceof Error ? error.message : error);
        platforms.push({ platform: 'crowdstrike', status: 'error', last_sync: null, error_message: 'Failed to connect' });
      }
    })());
  } else {
    platforms.push({ platform: 'crowdstrike', status: 'not_configured', last_sync: null });
  }

  // Salesforce: try cache first, then live API
  if (sfClient.isConfigured()) {
    const sfCacheKey = `${CACHE_KEYS.SALESFORCE_METRICS}:${period}`;

    fetchPromises.push((async () => {
      if (!forceRefresh) {
        const cached = await cache.get<TicketMetrics>(sfCacheKey);
        if (cached) {
          salesforce = cached.data;
          if (!cachedAt) cachedAt = cached.cachedAt;
          platforms.push({ platform: 'salesforce', status: 'healthy', last_sync: cached.cachedAt });
          return;
        }
      }

      try {
        salesforce = await sfClient.getDashboardMetrics();
        platforms.push({ platform: 'salesforce', status: 'healthy', last_sync: new Date().toISOString() });
        await cache.set(sfCacheKey, salesforce, CACHE_TTL.DASHBOARD_DATA);
      } catch (error) {
        console.error('Salesforce fetch error:', error instanceof Error ? error.message : error);
        platforms.push({ platform: 'salesforce', status: 'error', last_sync: null, error_message: 'Failed to connect' });
      }
    })());
  } else {
    platforms.push({ platform: 'salesforce', status: 'not_configured', last_sync: null });
  }

  // Fetch trend data from D1 (fast, no external API calls)
  fetchPromises.push(
    trendService.getCrowdStrikeTrends(daysBack)
      .then(data => { csTrends = data; })
      .catch(err => console.error('CS trend fetch error:', err))
  );
  fetchPromises.push(
    trendService.getSalesforceTrends(daysBack)
      .then(data => { sfTrends = data; })
      .catch(err => console.error('SF trend fetch error:', err))
  );

  // Wait for all fetches to complete
  await Promise.all(fetchPromises);

  // Add other platforms as not configured for now
  platforms.push(
    { platform: 'abnormal', status: 'not_configured', last_sync: null },
    { platform: 'zscaler', status: 'not_configured', last_sync: null },
    { platform: 'microsoft', status: 'not_configured', last_sync: null },
  );

  return c.html(
    <Dashboard
      data={{
        crowdstrike,
        salesforce,
        platforms,
        period,
        lastUpdated: new Date().toISOString(),
        dataSource,
        cachedAt,
        csTrends,
        sfTrends,
      }}
    />
  );
});
