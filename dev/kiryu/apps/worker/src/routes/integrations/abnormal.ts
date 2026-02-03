import { Hono } from 'hono';
import type { Env } from '../../types/env';
import { AbnormalClient } from '../../integrations/abnormal/client';

export const abnormalRoutes = new Hono<{ Bindings: Env }>();

/**
 * Get email threats
 */
abnormalRoutes.get('/threats', async (c) => {
  const client = new AbnormalClient(c.env);
  
  try {
    const threats = await client.getThreats();
    return c.json({ threats, count: threats.length });
  } catch (error) {
    return c.json({ 
      error: 'Failed to fetch threats',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * Get threat statistics
 */
abnormalRoutes.get('/stats', async (c) => {
  const client = new AbnormalClient(c.env);
  
  try {
    const stats = await client.getStats();
    return c.json(stats);
  } catch (error) {
    return c.json({ 
      error: 'Failed to fetch stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * Get cases
 */
abnormalRoutes.get('/cases', async (c) => {
  const client = new AbnormalClient(c.env);
  
  try {
    const cases = await client.getCases();
    return c.json({ cases, count: cases.length });
  } catch (error) {
    return c.json({ 
      error: 'Failed to fetch cases',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});
