import { Hono } from 'hono';
import type { Env } from '../types/env';
import { Dashboard } from '../views/Dashboard';
import { CrowdStrikeClient } from '../integrations/crowdstrike/client';
import { SalesforceClient, type TicketMetrics } from '../integrations/salesforce/client';
import { MicrosoftClient, type MicrosoftFullSummary } from '../integrations/microsoft/client';
import { ZscalerClient, type ZscalerFullSummary } from '../integrations/zscaler/client';
import { MerakiClient, type MerakiSummary } from '../integrations/meraki/client';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../services/cache';
import { TrendService, type CrowdStrikeTrends, type SalesforceTrends, type ZscalerTrends, type MerakiTrends } from '../services/trends';

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
  let microsoft: MicrosoftFullSummary | null = null;
  let zscaler: ZscalerFullSummary | null = null;
  let meraki: MerakiSummary | null = null;
  let dataSource: 'cache' | 'live' = 'live';
  let cachedAt: string | null = null;
  let csTrends: CrowdStrikeTrends | null = null;
  let sfTrends: SalesforceTrends | null = null;
  let zsTrends: ZscalerTrends | null = null;
  let mkTrends: MerakiTrends | null = null;
  let platforms: Array<{
    platform: string;
    status: 'healthy' | 'error' | 'not_configured' | 'unknown';
    last_sync: string | null;
    error_message?: string;
  }> = [];

  const csClient = new CrowdStrikeClient(c.env, c.env.CACHE);
  const sfClient = new SalesforceClient(c.env, c.env.CACHE);
  const msClient = new MicrosoftClient(c.env);
  const trendService = new TrendService(c.env);

  // Timeout wrapper: resolves with undefined after specified ms
  function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
    return Promise.race([promise, new Promise<undefined>(resolve => setTimeout(() => resolve(undefined), ms))]);
  }

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

      // Fall back to live API with 25s timeout
      try {
        const result = await withTimeout(csClient.getFullSummary(daysBack, 30), 25000);
        if (result) {
          crowdstrike = result;
          platforms.push({ platform: 'crowdstrike', status: 'healthy', last_sync: new Date().toISOString() });
          await cache.set(csCacheKey, crowdstrike, CACHE_TTL.DASHBOARD_DATA);
          dataSource = 'live';
        } else {
          console.error('CrowdStrike fetch timed out (25s)');
          platforms.push({ platform: 'crowdstrike', status: 'error', last_sync: null, error_message: 'Request timeout' });
        }
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
        const result = await withTimeout(sfClient.getDashboardMetrics(), 25000);
        if (result) {
          salesforce = result;
          platforms.push({ platform: 'salesforce', status: 'healthy', last_sync: new Date().toISOString() });
          await cache.set(sfCacheKey, salesforce, CACHE_TTL.DASHBOARD_DATA);
        } else {
          console.error('Salesforce fetch timed out (25s)');
          platforms.push({ platform: 'salesforce', status: 'error', last_sync: null, error_message: 'Request timeout' });
        }
      } catch (error) {
        console.error('Salesforce fetch error:', error instanceof Error ? error.message : error);
        platforms.push({ platform: 'salesforce', status: 'error', last_sync: null, error_message: 'Failed to connect' });
      }
    })());
  } else {
    platforms.push({ platform: 'salesforce', status: 'not_configured', last_sync: null });
  }

  // Microsoft: try cache first, then live API
  if (msClient.isConfigured()) {
    const msCacheKey = `${CACHE_KEYS.MICROSOFT_SUMMARY}:${period}`;

    fetchPromises.push((async () => {
      if (!forceRefresh) {
        const cached = await cache.get<MicrosoftFullSummary>(msCacheKey);
        if (cached) {
          microsoft = cached.data;
          if (!cachedAt) cachedAt = cached.cachedAt;
          platforms.push({ platform: 'microsoft', status: 'healthy', last_sync: cached.cachedAt });
          return;
        }
      }

      try {
        const result = await withTimeout(msClient.getFullSummary(), 25000);
        if (result) {
          microsoft = result;
          platforms.push({ platform: 'microsoft', status: 'healthy', last_sync: new Date().toISOString() });
          await cache.set(msCacheKey, microsoft, CACHE_TTL.DASHBOARD_DATA);
        } else {
          console.error('Microsoft fetch timed out (25s)');
          platforms.push({ platform: 'microsoft', status: 'error', last_sync: null, error_message: 'Request timeout' });
        }
      } catch (error) {
        console.error('Microsoft fetch error:', error instanceof Error ? error.message : error);
        platforms.push({ platform: 'microsoft', status: 'error', last_sync: null, error_message: 'Failed to connect' });
      }
    })());
  } else {
    platforms.push({ platform: 'microsoft', status: 'not_configured', last_sync: null });
  }

  // Zscaler: try cache first, then live API
  // Note: Zscaler has multiple sub-modules (ZIA, ZPA, ZDX). If the cache has null
  // sub-modules that should have data, treat it as a cache miss to avoid showing zeros.
  const zsClient = new ZscalerClient(c.env);
  if (zsClient.isConfigured()) {
    const zsCacheKey = `${CACHE_KEYS.ZSCALER_SUMMARY}:${period}`;
    fetchPromises.push((async () => {
      if (!forceRefresh) {
        const cached = await cache.get<ZscalerFullSummary>(zsCacheKey);
        if (cached) {
          const d = cached.data;
          const isCacheComplete =
            (!zsClient.isZpaConfigured() || d.zpa !== null) &&
            (!zsClient.isZdxConfigured() || d.zdx !== null) &&
            (!zsClient.isZiaConfigured() || d.zia !== null);
          if (isCacheComplete) {
            zscaler = d;
            if (!cachedAt) cachedAt = cached.cachedAt;
            platforms.push({ platform: 'zscaler', status: 'healthy', last_sync: cached.cachedAt });
            return;
          }
          // Stale cache with missing sub-modules — fall through to live fetch
        }
      }
      try {
        const result = await withTimeout(zsClient.getFullSummary(), 25000);
        if (result) {
          zscaler = result;
          platforms.push({ platform: 'zscaler', status: 'healthy', last_sync: new Date().toISOString() });
          // Only cache if configured sub-modules returned data (avoid caching partial failures)
          const hasConfiguredNulls =
            (zsClient.isZpaConfigured() && !result.zpa) ||
            (zsClient.isZdxConfigured() && !result.zdx) ||
            (zsClient.isZiaConfigured() && !result.zia);
          if (!hasConfiguredNulls) {
            await cache.set(zsCacheKey, zscaler, CACHE_TTL.DASHBOARD_DATA);
          }
        } else {
          console.error('Zscaler fetch timed out (25s)');
          platforms.push({ platform: 'zscaler', status: 'error', last_sync: null, error_message: 'Request timeout' });
        }
      } catch (error) {
        console.error('Zscaler fetch error:', error instanceof Error ? error.message : error);
        platforms.push({ platform: 'zscaler', status: 'error', last_sync: null, error_message: 'Failed to connect' });
      }
    })());
  } else {
    platforms.push({ platform: 'zscaler', status: 'not_configured', last_sync: null });
  }

  // Meraki: try cache first, then live API
  const mkClient = new MerakiClient(c.env);
  if (mkClient.isConfigured()) {
    const mkCacheKey = `${CACHE_KEYS.MERAKI_SUMMARY}:${period}`;
    fetchPromises.push((async () => {
      if (!forceRefresh) {
        const cached = await cache.get<MerakiSummary>(mkCacheKey);
        if (cached) {
          meraki = cached.data;
          if (!cachedAt) cachedAt = cached.cachedAt;
          platforms.push({ platform: 'meraki', status: 'healthy', last_sync: cached.cachedAt });
          return;
        }
      }
      try {
        const result = await withTimeout(mkClient.getSummary(), 25000);
        if (result) {
          meraki = result;
          platforms.push({ platform: 'meraki', status: 'healthy', last_sync: new Date().toISOString() });
          await cache.set(mkCacheKey, meraki, CACHE_TTL.DASHBOARD_DATA);
        } else {
          console.error('Meraki fetch timed out (25s)');
          platforms.push({ platform: 'meraki', status: 'error', last_sync: null, error_message: 'Request timeout' });
        }
      } catch (error) {
        console.error('Meraki fetch error:', error instanceof Error ? error.message : error);
        platforms.push({ platform: 'meraki', status: 'error', last_sync: null, error_message: 'Failed to connect' });
      }
    })());
  } else {
    platforms.push({ platform: 'meraki', status: 'not_configured', last_sync: null });
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
  fetchPromises.push(
    trendService.getZscalerTrends(daysBack)
      .then(data => { zsTrends = data; })
      .catch(err => console.error('ZS trend fetch error:', err))
  );
  fetchPromises.push(
    trendService.getMerakiTrends(daysBack)
      .then(data => { mkTrends = data; })
      .catch(err => console.error('MK trend fetch error:', err))
  );

  // Wait for all fetches to complete (individual timeouts above prevent indefinite hang)
  await Promise.all(fetchPromises);

  // Add other platforms as not configured for now
  platforms.push(
    { platform: 'abnormal', status: 'not_configured', last_sync: null },
  );

  return c.html(
    <Dashboard
      data={{
        crowdstrike,
        salesforce,
        microsoft,
        zscaler,
        meraki,
        platforms,
        period,
        lastUpdated: new Date().toISOString(),
        dataSource,
        cachedAt,
        csTrends,
        sfTrends,
        zsTrends,
        mkTrends,
      }}
    />
  );
});
