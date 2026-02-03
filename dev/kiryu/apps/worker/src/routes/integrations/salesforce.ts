import { Hono } from 'hono';
import type { Env } from '../../types/env';
import { SalesforceClient } from '../../integrations/salesforce/client';

export const salesforceRoutes = new Hono<{ Bindings: Env }>();

/**
 * Get security-related tickets
 */
salesforceRoutes.get('/tickets', async (c) => {
  const client = new SalesforceClient(c.env);
  const days = parseInt(c.req.query('days') || '30');
  
  try {
    const tickets = await client.getSecurityTickets(days);
    return c.json({ tickets, count: tickets.length });
  } catch (error) {
    return c.json({ 
      error: 'Failed to fetch tickets',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * Get open cases
 */
salesforceRoutes.get('/open-cases', async (c) => {
  const client = new SalesforceClient(c.env);
  
  try {
    const cases = await client.getOpenCases();
    return c.json({ cases, count: cases.length });
  } catch (error) {
    return c.json({ 
      error: 'Failed to fetch open cases',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * Get case metrics
 */
salesforceRoutes.get('/metrics', async (c) => {
  const client = new SalesforceClient(c.env);
  const days = parseInt(c.req.query('days') || '30');
  
  try {
    const metrics = await client.getCaseMetrics(days);
    return c.json(metrics);
  } catch (error) {
    return c.json({ 
      error: 'Failed to fetch metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * Get SLA compliance
 */
salesforceRoutes.get('/sla', async (c) => {
  const client = new SalesforceClient(c.env);
  
  try {
    const compliance = await client.getSLACompliance();
    return c.json(compliance);
  } catch (error) {
    return c.json({ 
      error: 'Failed to fetch SLA compliance',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});
