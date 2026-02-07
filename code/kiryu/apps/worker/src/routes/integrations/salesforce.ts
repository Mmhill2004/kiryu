import { Hono } from 'hono';
import type { Env } from '../../types/env';
import { SalesforceClient } from '../../integrations/salesforce/client';
import { safeInt } from '../../middleware/auth';

export const salesforceRoutes = new Hono<{ Bindings: Env }>();

/**
 * GET /api/integrations/salesforce/test
 * Test Salesforce connection
 */
salesforceRoutes.get('/test', async (c) => {
  const client = new SalesforceClient(c.env, c.env.CACHE);

  if (!client.isConfigured()) {
    return c.json({
      success: false,
      message: 'Salesforce is not configured. Set SALESFORCE_INSTANCE_URL, SALESFORCE_CLIENT_ID, and SALESFORCE_CLIENT_SECRET.',
    });
  }

  const result = await client.testConnection();
  return c.json(result);
});

/**
 * GET /api/integrations/salesforce/tickets
 * Get recent security tickets
 */
salesforceRoutes.get('/tickets', async (c) => {
  const client = new SalesforceClient(c.env, c.env.CACHE);

  if (!client.isConfigured()) {
    return c.json({
      error: 'Not configured',
      message: 'Salesforce credentials not configured',
    }, 400);
  }

  const days = safeInt(c.req.query('days'), 30, 90);
  const limit = safeInt(c.req.query('limit'), 100, 500);

  try {
    const tickets = await client.getSecurityTickets(days, limit);
    return c.json({
      success: true,
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    return c.json({
      error: 'Failed to fetch tickets',
      message: 'An internal error occurred',
    }, 500);
  }
});

/**
 * GET /api/integrations/salesforce/metrics
 * Get comprehensive ticket metrics for dashboard
 */
salesforceRoutes.get('/metrics', async (c) => {
  const client = new SalesforceClient(c.env, c.env.CACHE);

  if (!client.isConfigured()) {
    return c.json({
      error: 'Not configured',
      message: 'Salesforce credentials not configured',
    }, 400);
  }

  try {
    const metrics = await client.getDashboardMetrics();
    return c.json({
      success: true,
      metrics,
    });
  } catch (error) {
    return c.json({
      error: 'Failed to fetch metrics',
      message: 'An internal error occurred',
    }, 500);
  }
});

/**
 * GET /api/integrations/salesforce/open
 * Get open tickets with aging info
 */
salesforceRoutes.get('/open', async (c) => {
  const client = new SalesforceClient(c.env, c.env.CACHE);

  if (!client.isConfigured()) {
    return c.json({
      error: 'Not configured',
      message: 'Salesforce credentials not configured',
    }, 400);
  }

  try {
    const tickets = await client.getOpenTickets();
    const aging = client.calculateBacklogAging(tickets);

    return c.json({
      success: true,
      count: tickets.length,
      aging,
      tickets,
    });
  } catch (error) {
    return c.json({
      error: 'Failed to fetch open tickets',
      message: 'An internal error occurred',
    }, 500);
  }
});

/**
 * GET /api/integrations/salesforce/mttr
 * Get MTTR breakdown
 */
salesforceRoutes.get('/mttr', async (c) => {
  const client = new SalesforceClient(c.env, c.env.CACHE);

  if (!client.isConfigured()) {
    return c.json({
      error: 'Not configured',
      message: 'Salesforce credentials not configured',
    }, 400);
  }

  const days = safeInt(c.req.query('days'), 30, 90);

  try {
    const closedTickets = await client.getClosedTickets(days);
    const mttr = client.calculateMTTR(closedTickets);

    return c.json({
      success: true,
      period: `${days} days`,
      closedCount: closedTickets.length,
      mttr,
    });
  } catch (error) {
    return c.json({
      error: 'Failed to fetch MTTR',
      message: 'An internal error occurred',
    }, 500);
  }
});

/**
 * GET /api/integrations/salesforce/workload
 * Get agent workload
 */
salesforceRoutes.get('/workload', async (c) => {
  const client = new SalesforceClient(c.env, c.env.CACHE);

  if (!client.isConfigured()) {
    return c.json({
      error: 'Not configured',
      message: 'Salesforce credentials not configured',
    }, 400);
  }

  try {
    const workload = await client.getAgentWorkload();

    return c.json({
      success: true,
      agents: workload.map((a) => ({
        name: a.ownerName,
        openTickets: a.cnt,
      })),
    });
  } catch (error) {
    return c.json({
      error: 'Failed to fetch agent workload',
      message: 'An internal error occurred',
    }, 500);
  }
});
