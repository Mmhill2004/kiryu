import { Hono } from 'hono';
import type { Env } from '../../types/env';
import { AzureResourceClient } from '../../integrations/azure/resource-client';
import { buildTopology } from '../../services/topology-builder';
import { CacheService, CACHE_KEYS } from '../../services/cache';
import type { BuiltTopology } from '../../services/topology-builder';
import type { SVGTopology } from '../../services/topology-svg';

export const azureDCRoutes = new Hono<{ Bindings: Env }>();

// ── Test connection ──────────────────────────────────────────────────
azureDCRoutes.get('/test', async (c) => {
  const client = new AzureResourceClient(c.env);
  if (!client.isConfigured()) {
    return c.json({ configured: false, message: 'Azure DC not configured (missing AZURE_SUBSCRIPTION_ID or Azure credentials)' }, 503);
  }

  try {
    const vnets = await client.listVirtualNetworks();
    return c.json({ configured: true, success: true, vnetsFound: vnets.length });
  } catch (error) {
    console.error('Azure DC test error:', error);
    return c.json({ configured: true, success: false, error: 'Failed to connect to Azure ARM API' }, 500);
  }
});

// ── Full topology (KV-cached) ────────────────────────────────────────
azureDCRoutes.get('/topology', async (c) => {
  const client = new AzureResourceClient(c.env);
  if (!client.isConfigured()) {
    return c.json({ configured: false, message: 'Azure DC not configured' }, 503);
  }

  const cache = new CacheService(c.env.CACHE);
  const cacheKey = CACHE_KEYS.AZURE_DC_TOPOLOGY;
  const forceRefresh = c.req.query('refresh') === 'true';

  if (!forceRefresh) {
    const cached = await cache.get<{ topology: BuiltTopology; svg: SVGTopology }>(cacheKey);
    if (cached) {
      return c.json({ ...cached.data.topology, dataSource: 'cache', cachedAt: cached.cachedAt });
    }
  }

  try {
    const raw = await client.getTopology();
    const topology = buildTopology(raw);
    return c.json({ ...topology, dataSource: 'live' });
  } catch (error) {
    console.error('Azure DC topology error:', error);
    return c.json({ error: 'Failed to fetch Azure topology' }, 500);
  }
});

// ── Summary stats only ───────────────────────────────────────────────
azureDCRoutes.get('/summary', async (c) => {
  const client = new AzureResourceClient(c.env);
  if (!client.isConfigured()) {
    return c.json({ configured: false, message: 'Azure DC not configured' }, 503);
  }

  const cache = new CacheService(c.env.CACHE);
  const cacheKey = CACHE_KEYS.AZURE_DC_TOPOLOGY;

  const cached = await cache.get<{ topology: BuiltTopology; svg: SVGTopology }>(cacheKey);
  if (cached) {
    return c.json({
      stats: cached.data.topology.stats,
      vnets: cached.data.topology.vnets.map(v => ({
        name: v.vnet.name,
        location: v.vnet.location,
        subnets: v.subnets.length,
        vms: v.vmCount,
      })),
      errors: cached.data.topology.errors,
      fetchedAt: cached.data.topology.fetchedAt,
      dataSource: 'cache',
      cachedAt: cached.cachedAt,
    });
  }

  try {
    const raw = await client.getTopology();
    const topology = buildTopology(raw);
    return c.json({
      stats: topology.stats,
      vnets: topology.vnets.map(v => ({
        name: v.vnet.name,
        location: v.vnet.location,
        subnets: v.subnets.length,
        vms: v.vmCount,
      })),
      errors: topology.errors,
      fetchedAt: topology.fetchedAt,
      dataSource: 'live',
    });
  } catch (error) {
    console.error('Azure DC summary error:', error);
    return c.json({ error: 'Failed to fetch Azure DC summary' }, 500);
  }
});

// ── Virtual Networks ─────────────────────────────────────────────────
azureDCRoutes.get('/vnets', async (c) => {
  const client = new AzureResourceClient(c.env);
  if (!client.isConfigured()) {
    return c.json({ configured: false }, 503);
  }

  try {
    const vnets = await client.listVirtualNetworks();
    return c.json({ count: vnets.length, vnets });
  } catch (error) {
    console.error('Azure VNets error:', error);
    return c.json({ error: 'Failed to fetch virtual networks' }, 500);
  }
});

// ── Virtual Machines ─────────────────────────────────────────────────
azureDCRoutes.get('/vms', async (c) => {
  const client = new AzureResourceClient(c.env);
  if (!client.isConfigured()) {
    return c.json({ configured: false }, 503);
  }

  try {
    const vms = await client.listVirtualMachines();
    return c.json({ count: vms.length, vms });
  } catch (error) {
    console.error('Azure VMs error:', error);
    return c.json({ error: 'Failed to fetch virtual machines' }, 500);
  }
});

// ── NSGs ─────────────────────────────────────────────────────────────
azureDCRoutes.get('/nsgs', async (c) => {
  const client = new AzureResourceClient(c.env);
  if (!client.isConfigured()) {
    return c.json({ configured: false }, 503);
  }

  try {
    const nsgs = await client.listNetworkSecurityGroups();
    return c.json({ count: nsgs.length, nsgs });
  } catch (error) {
    console.error('Azure NSGs error:', error);
    return c.json({ error: 'Failed to fetch NSGs' }, 500);
  }
});
