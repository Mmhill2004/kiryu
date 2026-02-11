import { Hono } from 'hono';
import type { Env } from '../../types/env';
import { AbnormalClient } from '../../integrations/abnormal/client';

export const abnormalRoutes = new Hono<{ Bindings: Env }>();

/**
 * Get email threats
 */
abnormalRoutes.get('/threats', async (c) => {
  const client = new AbnormalClient(c.env);

  if (!client.isConfigured()) {
    return c.json({ configured: false, error: 'Abnormal Security not configured' }, 503);
  }

  try {
    const threats = await client.getThreats();
    return c.json({ threats, count: threats.length });
  } catch (error) {
    console.error('Failed to fetch threats:', error);
    return c.json({
      error: 'Failed to fetch threats',
      message: 'An internal error occurred'
    }, 500);
  }
});

/**
 * Get threat statistics
 */
abnormalRoutes.get('/stats', async (c) => {
  const client = new AbnormalClient(c.env);

  if (!client.isConfigured()) {
    return c.json({ configured: false, error: 'Abnormal Security not configured' }, 503);
  }

  try {
    const stats = await client.getStats();
    return c.json(stats);
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return c.json({
      error: 'Failed to fetch stats',
      message: 'An internal error occurred'
    }, 500);
  }
});

/**
 * Get cases
 */
abnormalRoutes.get('/cases', async (c) => {
  const client = new AbnormalClient(c.env);

  if (!client.isConfigured()) {
    return c.json({ configured: false, error: 'Abnormal Security not configured' }, 503);
  }

  try {
    const cases = await client.getCases();
    return c.json({ cases, count: cases.length });
  } catch (error) {
    console.error('Failed to fetch cases:', error);
    return c.json({
      error: 'Failed to fetch cases',
      message: 'An internal error occurred'
    }, 500);
  }
});
