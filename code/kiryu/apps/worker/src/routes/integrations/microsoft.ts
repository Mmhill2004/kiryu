import { Hono } from 'hono';
import type { Env } from '../../types/env';
import { MicrosoftClient } from '../../integrations/microsoft/client';

export const microsoftRoutes = new Hono<{ Bindings: Env }>();

/**
 * Test Microsoft connection
 */
microsoftRoutes.get('/test', async (c) => {
  const client = new MicrosoftClient(c.env);

  if (!client.isConfigured()) {
    return c.json({ status: 'not_configured', message: 'Azure credentials not set' });
  }

  try {
    const score = await client.getSecureScore();
    return c.json({ status: 'connected', secureScore: score ? score.currentScore : 'unavailable' });
  } catch (error) {
    return c.json({
      status: 'error',
      message: 'An internal error occurred',
    }, 500);
  }
});

/**
 * Get full Microsoft summary (all APIs in parallel)
 */
microsoftRoutes.get('/summary', async (c) => {
  const client = new MicrosoftClient(c.env);

  if (!client.isConfigured()) {
    return c.json({ error: 'Microsoft not configured' }, 503);
  }

  try {
    const summary = await client.getFullSummary();
    return c.json(summary);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch Microsoft summary',
      message: 'An internal error occurred',
    }, 500);
  }
});

/**
 * Get security alerts
 */
microsoftRoutes.get('/alerts', async (c) => {
  const client = new MicrosoftClient(c.env);

  try {
    const analytics = await client.getAlertAnalytics();
    return c.json(analytics);
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
    const analytics = await client.getDefenderAnalytics();
    return c.json(analytics);
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
    const assessments = await client.getAssessmentAnalytics();
    return c.json(assessments);
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
