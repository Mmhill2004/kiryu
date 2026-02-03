import { Hono } from 'hono';
import type { Env } from '../../types/env';
import { CrowdStrikeClient } from '../../integrations/crowdstrike/client';

export const crowdstrikeRoutes = new Hono<{ Bindings: Env }>();

/**
 * Test CrowdStrike connection
 */
crowdstrikeRoutes.get('/test', async (c) => {
  const client = new CrowdStrikeClient(c.env);

  if (!client.isConfigured()) {
    return c.json({
      configured: false,
      connected: false,
      message: 'CrowdStrike credentials not configured',
    });
  }

  const result = await client.testConnection();
  return c.json({
    configured: true,
    connected: result.success,
    message: result.message,
  });
});

/**
 * Get full summary for dashboard
 */
crowdstrikeRoutes.get('/summary', async (c) => {
  const client = new CrowdStrikeClient(c.env);
  const daysBack = parseInt(c.req.query('days') || '7');

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const [detections, hosts, incidents, vulnerabilities] = await Promise.all([
      client.getAlertSummary(daysBack),
      client.getHostSummary(),
      client.getIncidentSummary(daysBack),
      client.getVulnerabilitySummary(),
    ]);

    return c.json({
      detections,
      hosts,
      incidents,
      vulnerabilities,
      period: `${daysBack}d`,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return c.json({
      error: 'Failed to fetch CrowdStrike data',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * Get detection summary
 */
crowdstrikeRoutes.get('/detections', async (c) => {
  const client = new CrowdStrikeClient(c.env);
  const daysBack = parseInt(c.req.query('days') || '7');
  const limit = parseInt(c.req.query('limit') || '100');

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const summary = await client.getAlertSummary(daysBack, limit);
    return c.json(summary);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch detections',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * Get host/endpoint summary
 */
crowdstrikeRoutes.get('/hosts', async (c) => {
  const client = new CrowdStrikeClient(c.env);

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const summary = await client.getHostSummary();
    return c.json(summary);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch hosts',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * Get incident summary
 */
crowdstrikeRoutes.get('/incidents', async (c) => {
  const client = new CrowdStrikeClient(c.env);
  const daysBack = parseInt(c.req.query('days') || '30');

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const summary = await client.getIncidentSummary(daysBack);
    return c.json(summary);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch incidents',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * Get vulnerability summary
 */
crowdstrikeRoutes.get('/vulnerabilities', async (c) => {
  const client = new CrowdStrikeClient(c.env);

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const summary = await client.getVulnerabilitySummary();
    return c.json(summary);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch vulnerabilities',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});
