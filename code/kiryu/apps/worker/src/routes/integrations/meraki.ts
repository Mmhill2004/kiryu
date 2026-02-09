import { Hono } from 'hono';
import type { Env } from '../../types/env';
import { MerakiClient } from '../../integrations/meraki/client';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../../services/cache';
import type { MerakiSummary } from '../../integrations/meraki/client';

export const merakiRoutes = new Hono<{ Bindings: Env }>();

// ── Test connection ──────────────────────────────────────────────────
merakiRoutes.get('/test', async (c) => {
  const client = new MerakiClient(c.env);
  if (!client.isConfigured()) {
    return c.json({ configured: false, message: 'Meraki API key not configured' }, 503);
  }
  const result = await client.testConnection();
  return c.json(result, result.success ? 200 : 500);
});

// ── Full summary (KV-cached) ─────────────────────────────────────────
merakiRoutes.get('/summary', async (c) => {
  const client = new MerakiClient(c.env);
  if (!client.isConfigured()) {
    return c.json({ configured: false, message: 'Meraki not configured' }, 503);
  }

  const cache = new CacheService(c.env.CACHE);
  const cacheKey = `${CACHE_KEYS.MERAKI_SUMMARY}:default`;
  const forceRefresh = c.req.query('refresh') === 'true';

  if (!forceRefresh) {
    const cached = await cache.get<MerakiSummary>(cacheKey);
    if (cached) {
      return c.json({ ...cached.data, dataSource: 'cache', cachedAt: cached.cachedAt });
    }
  }

  try {
    const summary = await client.getSummary();
    await cache.set(cacheKey, summary, CACHE_TTL.DASHBOARD_DATA);
    return c.json({ ...summary, dataSource: 'live' });
  } catch (error) {
    return c.json({ error: 'Failed to fetch Meraki data', message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ── Device statuses ──────────────────────────────────────────────────
merakiRoutes.get('/devices', async (c) => {
  const client = new MerakiClient(c.env);
  if (!client.isConfigured()) {
    return c.json({ configured: false, message: 'Meraki not configured' }, 503);
  }

  try {
    const [overview, devices] = await Promise.all([
      client.getDeviceStatusOverview(),
      client.getDeviceStatuses(),
    ]);
    return c.json({ overview, devices });
  } catch (error) {
    return c.json({ error: 'Failed to fetch device data', message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ── Networks ─────────────────────────────────────────────────────────
merakiRoutes.get('/networks', async (c) => {
  const client = new MerakiClient(c.env);
  if (!client.isConfigured()) {
    return c.json({ configured: false, message: 'Meraki not configured' }, 503);
  }

  try {
    const networks = await client.getNetworks();
    return c.json({ total: networks.length, networks });
  } catch (error) {
    return c.json({ error: 'Failed to fetch network data', message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ── VPN statuses ─────────────────────────────────────────────────────
merakiRoutes.get('/vpn', async (c) => {
  const client = new MerakiClient(c.env);
  if (!client.isConfigured()) {
    return c.json({ configured: false, message: 'Meraki not configured' }, 503);
  }

  try {
    const vpn = await client.getVpnStatuses();
    return c.json({ total: vpn.length, statuses: vpn });
  } catch (error) {
    return c.json({ error: 'Failed to fetch VPN data', message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

// ── Uplink statuses ──────────────────────────────────────────────────
merakiRoutes.get('/uplinks', async (c) => {
  const client = new MerakiClient(c.env);
  if (!client.isConfigured()) {
    return c.json({ configured: false, message: 'Meraki not configured' }, 503);
  }

  try {
    const uplinks = await client.getUplinkStatuses();
    return c.json({ total: uplinks.length, statuses: uplinks });
  } catch (error) {
    return c.json({ error: 'Failed to fetch uplink data', message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
