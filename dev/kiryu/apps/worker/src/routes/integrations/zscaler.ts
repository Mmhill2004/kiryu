import { Hono } from 'hono';
import type { Env } from '../../types/env';
import { ZscalerClient } from '../../integrations/zscaler/client';
import { safeInt } from '../../middleware/auth';

export const zscalerRoutes = new Hono<{ Bindings: Env }>();

/**
 * Get security events
 */
zscalerRoutes.get('/events', async (c) => {
  const client = new ZscalerClient(c.env);
  const hours = safeInt(c.req.query('hours'), 24, 720);
  
  try {
    const events = await client.getSecurityEvents(hours);
    return c.json({ events, count: events.length });
  } catch (error) {
    return c.json({ 
      error: 'Failed to fetch events',
      message: 'An internal error occurred'
    }, 500);
  }
});

/**
 * Get web activity summary
 */
zscalerRoutes.get('/activity', async (c) => {
  const client = new ZscalerClient(c.env);
  
  try {
    const activity = await client.getWebActivity();
    return c.json(activity);
  } catch (error) {
    return c.json({ 
      error: 'Failed to fetch activity',
      message: 'An internal error occurred'
    }, 500);
  }
});

/**
 * Get blocked categories
 */
zscalerRoutes.get('/blocked-categories', async (c) => {
  const client = new ZscalerClient(c.env);
  
  try {
    const categories = await client.getBlockedCategories();
    return c.json({ categories });
  } catch (error) {
    return c.json({ 
      error: 'Failed to fetch blocked categories',
      message: 'An internal error occurred'
    }, 500);
  }
});
