import { Hono } from 'hono';
import type { Env } from '../../types/env';
import { CrowdStrikeClient } from '../../integrations/crowdstrike/client';

export const crowdstrikeRoutes = new Hono<{ Bindings: Env }>();

/**
 * Test CrowdStrike connection and list available modules
 */
crowdstrikeRoutes.get('/test', async (c) => {
  const client = new CrowdStrikeClient(c.env);

  if (!client.isConfigured()) {
    return c.json({
      configured: false,
      connected: false,
      message: 'CrowdStrike credentials not configured',
      modules: [],
    });
  }

  const result = await client.testConnection();
  return c.json({
    configured: true,
    connected: result.success,
    message: result.message,
    modules: result.modules,
  });
});

/**
 * Get full summary for dashboard (all modules)
 */
crowdstrikeRoutes.get('/summary', async (c) => {
  const client = new CrowdStrikeClient(c.env);
  const alertDays = parseInt(c.req.query('alert_days') || '7');
  const incidentDays = parseInt(c.req.query('incident_days') || '30');

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const summary = await client.getFullSummary(alertDays, incidentDays);
    return c.json(summary);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch CrowdStrike data',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ============================================
// ALERTS ENDPOINTS
// ============================================

/**
 * Get alert summary with MITRE ATT&CK breakdown
 */
crowdstrikeRoutes.get('/alerts', async (c) => {
  const client = new CrowdStrikeClient(c.env);
  const daysBack = parseInt(c.req.query('days') || '7');
  const limit = parseInt(c.req.query('limit') || '500');

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const summary = await client.getAlertSummary(daysBack, limit);
    return c.json(summary);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch alerts',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * Get raw alerts list
 */
crowdstrikeRoutes.get('/alerts/list', async (c) => {
  const client = new CrowdStrikeClient(c.env);
  const daysBack = parseInt(c.req.query('days') || '7');
  const limit = parseInt(c.req.query('limit') || '100');

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const alerts = await client.getAlerts(daysBack, limit);
    return c.json({ alerts, count: alerts.length });
  } catch (error) {
    return c.json({
      error: 'Failed to fetch alerts',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ============================================
// HOSTS ENDPOINTS
// ============================================

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
 * Get raw hosts list
 */
crowdstrikeRoutes.get('/hosts/list', async (c) => {
  const client = new CrowdStrikeClient(c.env);
  const limit = parseInt(c.req.query('limit') || '100');

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const hosts = await client.getHosts(limit);
    return c.json({ hosts, count: hosts.length });
  } catch (error) {
    return c.json({
      error: 'Failed to fetch hosts',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ============================================
// INCIDENTS ENDPOINTS
// ============================================

/**
 * Get incident summary with MTTR
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
 * Get raw incidents list
 */
crowdstrikeRoutes.get('/incidents/list', async (c) => {
  const client = new CrowdStrikeClient(c.env);
  const daysBack = parseInt(c.req.query('days') || '30');
  const limit = parseInt(c.req.query('limit') || '100');

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const incidents = await client.getIncidents(daysBack, limit);
    return c.json({ incidents, count: incidents.length });
  } catch (error) {
    return c.json({
      error: 'Failed to fetch incidents',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ============================================
// VULNERABILITIES ENDPOINTS (Spotlight)
// ============================================

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

/**
 * Get raw vulnerabilities list
 */
crowdstrikeRoutes.get('/vulnerabilities/list', async (c) => {
  const client = new CrowdStrikeClient(c.env);
  const limit = parseInt(c.req.query('limit') || '100');

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const vulnerabilities = await client.getVulnerabilities(limit);
    return c.json({ vulnerabilities, count: vulnerabilities.length });
  } catch (error) {
    return c.json({
      error: 'Failed to fetch vulnerabilities',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ============================================
// ZERO TRUST ASSESSMENT ENDPOINTS
// ============================================

/**
 * Get ZTA summary
 */
crowdstrikeRoutes.get('/zta', async (c) => {
  const client = new CrowdStrikeClient(c.env);

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const summary = await client.getZTASummary();
    return c.json(summary);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch ZTA scores',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * Get raw ZTA scores
 */
crowdstrikeRoutes.get('/zta/list', async (c) => {
  const client = new CrowdStrikeClient(c.env);
  const limit = parseInt(c.req.query('limit') || '100');

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const assessments = await client.getZTAScores(limit);
    return c.json({ assessments, count: assessments.length });
  } catch (error) {
    return c.json({
      error: 'Failed to fetch ZTA scores',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});
