import { Hono } from 'hono';
import type { Env } from '../../types/env';
import { MicrosoftClient } from '../../integrations/microsoft/client';

export const microsoftRoutes = new Hono<{ Bindings: Env }>();

/**
 * Get security alerts
 */
microsoftRoutes.get('/alerts', async (c) => {
  const client = new MicrosoftClient(c.env);
  
  try {
    const alerts = await client.getSecurityAlerts();
    return c.json({ alerts, count: alerts.length });
  } catch (error) {
    return c.json({ 
      error: 'Failed to fetch alerts',
      message: 'An internal error occurred'
    }, 500);
  }
});

/**
 * Get Microsoft Secure Score
 */
microsoftRoutes.get('/secure-score', async (c) => {
  const client = new MicrosoftClient(c.env);
  
  try {
    const score = await client.getSecureScore();
    return c.json(score || { error: 'No secure score available' });
  } catch (error) {
    return c.json({ 
      error: 'Failed to fetch secure score',
      message: 'An internal error occurred'
    }, 500);
  }
});

/**
 * Get Defender for Endpoint alerts
 */
microsoftRoutes.get('/defender/alerts', async (c) => {
  const client = new MicrosoftClient(c.env);
  
  try {
    const alerts = await client.getDefenderAlerts();
    return c.json({ alerts, count: alerts.length });
  } catch (error) {
    return c.json({ 
      error: 'Failed to fetch Defender alerts',
      message: 'An internal error occurred'
    }, 500);
  }
});

/**
 * Get security recommendations
 */
microsoftRoutes.get('/recommendations', async (c) => {
  const client = new MicrosoftClient(c.env);
  
  try {
    const recommendations = await client.getSecurityRecommendations();
    return c.json({ recommendations, count: recommendations.length });
  } catch (error) {
    return c.json({ 
      error: 'Failed to fetch recommendations',
      message: 'An internal error occurred'
    }, 500);
  }
});

/**
 * Get device compliance
 */
microsoftRoutes.get('/compliance', async (c) => {
  const client = new MicrosoftClient(c.env);
  
  try {
    const compliance = await client.getDeviceCompliance();
    return c.json(compliance);
  } catch (error) {
    return c.json({ 
      error: 'Failed to fetch compliance',
      message: 'An internal error occurred'
    }, 500);
  }
});
