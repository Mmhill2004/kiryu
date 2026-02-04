import { Hono } from 'hono';
import type { Env } from '../../types/env';
import { CloudflareClient } from '../../integrations/cloudflare/client';

export const cloudflareRoutes = new Hono<{ Bindings: Env }>();

/**
 * Get Cloudflare Access audit logs
 */
cloudflareRoutes.get('/access/logs', async (c) => {
  const client = new CloudflareClient(c.env);
  const since = c.req.query('since');

  try {
    const logs = await client.getAccessLogs(since);
    return c.json({
      logs,
      count: logs.length,
    });
  } catch (error) {
    return c.json({
      error: 'Failed to fetch Access logs',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * Get Cloudflare Gateway logs
 */
cloudflareRoutes.get('/gateway/logs', async (c) => {
  const client = new CloudflareClient(c.env);
  const since = c.req.query('since');

  try {
    const logs = await client.getGatewayLogs(since);
    return c.json({
      logs,
      count: logs.length,
    });
  } catch (error) {
    return c.json({
      error: 'Failed to fetch Gateway logs',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * Get Cloudflare security events (WAF, DDoS, etc.)
 */
cloudflareRoutes.get('/security/events', async (c) => {
  const client = new CloudflareClient(c.env);
  const zoneId = c.req.query('zone_id');

  try {
    const events = await client.getSecurityEvents(zoneId);
    return c.json({
      events,
      count: events.length,
    });
  } catch (error) {
    return c.json({
      error: 'Failed to fetch security events',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * Get Cloudflare stats summary
 */
cloudflareRoutes.get('/stats', async (c) => {
  const client = new CloudflareClient(c.env);

  try {
    const stats = await client.getStats();
    return c.json(stats);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch stats',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * Get configured Access applications
 */
cloudflareRoutes.get('/access/apps', async (c) => {
  const client = new CloudflareClient(c.env);

  try {
    const apps = await client.getAccessApps();
    return c.json({ apps });
  } catch (error) {
    return c.json({
      error: 'Failed to fetch Access apps',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});
