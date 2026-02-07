import { Hono } from 'hono';
import type { Env } from '../../types/env';
import { CrowdStrikeClient } from '../../integrations/crowdstrike/client';
import { safeInt } from '../../middleware/auth';

export const crowdstrikeRoutes = new Hono<{ Bindings: Env }>();

/**
 * Test CrowdStrike connection and list available modules
 */
crowdstrikeRoutes.get('/test', async (c) => {
  const client = new CrowdStrikeClient(c.env, c.env.CACHE);

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
  const client = new CrowdStrikeClient(c.env, c.env.CACHE);
  const alertDays = safeInt(c.req.query('alert_days'), 7, 90);
  const incidentDays = safeInt(c.req.query('incident_days'), 30, 90);

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const summary = await client.getFullSummary(alertDays, incidentDays);
    return c.json(summary);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch CrowdStrike data',
      message: 'An internal error occurred',
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
  const client = new CrowdStrikeClient(c.env, c.env.CACHE);
  const daysBack = safeInt(c.req.query('days'), 7, 90);
  const limit = safeInt(c.req.query('limit'), 500, 500);

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const summary = await client.getAlertSummary(daysBack, limit);
    return c.json(summary);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch alerts',
      message: 'An internal error occurred',
    }, 500);
  }
});

/**
 * Get raw alerts list
 */
crowdstrikeRoutes.get('/alerts/list', async (c) => {
  const client = new CrowdStrikeClient(c.env, c.env.CACHE);
  const daysBack = safeInt(c.req.query('days'), 7, 90);
  const limit = safeInt(c.req.query('limit'), 100, 500);

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const alerts = await client.getAlerts(daysBack, limit);
    return c.json({ alerts, count: alerts.length });
  } catch (error) {
    return c.json({
      error: 'Failed to fetch alerts',
      message: 'An internal error occurred',
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
  const client = new CrowdStrikeClient(c.env, c.env.CACHE);

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const summary = await client.getHostSummary();
    return c.json(summary);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch hosts',
      message: 'An internal error occurred',
    }, 500);
  }
});

/**
 * Get raw hosts list
 */
crowdstrikeRoutes.get('/hosts/list', async (c) => {
  const client = new CrowdStrikeClient(c.env, c.env.CACHE);
  const limit = safeInt(c.req.query('limit'), 100, 500);

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const hosts = await client.getHosts(limit);
    return c.json({ hosts, count: hosts.length });
  } catch (error) {
    return c.json({
      error: 'Failed to fetch hosts',
      message: 'An internal error occurred',
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
  const client = new CrowdStrikeClient(c.env, c.env.CACHE);
  const daysBack = safeInt(c.req.query('days'), 30, 90);

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const summary = await client.getIncidentSummary(daysBack);
    return c.json(summary);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch incidents',
      message: 'An internal error occurred',
    }, 500);
  }
});

/**
 * Get raw incidents list
 */
crowdstrikeRoutes.get('/incidents/list', async (c) => {
  const client = new CrowdStrikeClient(c.env, c.env.CACHE);
  const daysBack = safeInt(c.req.query('days'), 30, 90);
  const limit = safeInt(c.req.query('limit'), 100, 500);

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const incidents = await client.getIncidents(daysBack, limit);
    return c.json({ incidents, count: incidents.length });
  } catch (error) {
    return c.json({
      error: 'Failed to fetch incidents',
      message: 'An internal error occurred',
    }, 500);
  }
});

// ============================================
// NGSIEM / LOGSCALE ENDPOINTS
// ============================================

/**
 * Get NGSIEM summary
 */
crowdstrikeRoutes.get('/ngsiem', async (c) => {
  const client = new CrowdStrikeClient(c.env, c.env.CACHE);

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const summary = await client.getNGSIEMSummary();
    return c.json(summary);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch NGSIEM data',
      message: 'An internal error occurred',
    }, 500);
  }
});

// ============================================
// OVERWATCH ENDPOINTS
// ============================================

/**
 * Get OverWatch threat hunting summary
 */
crowdstrikeRoutes.get('/overwatch', async (c) => {
  const client = new CrowdStrikeClient(c.env, c.env.CACHE);

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const summary = await client.getOverWatchSummary();
    return c.json(summary);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch OverWatch data',
      message: 'An internal error occurred',
    }, 500);
  }
});

// ============================================
// DIAGNOSTIC ENDPOINT
// ============================================

/**
 * Test all CrowdStrike API scopes and report availability
 */
crowdstrikeRoutes.get('/diagnostic', async (c) => {
  const client = new CrowdStrikeClient(c.env, c.env.CACHE);

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const results = await client.runDiagnostic();
    const available = results.filter(r => r.available).map(r => r.module);
    const unavailable = results.filter(r => !r.available).map(r => ({ module: r.module, error: r.error }));
    return c.json({ available, unavailable, details: results });
  } catch (error) {
    return c.json({
      error: 'Failed to run diagnostic',
      message: 'An internal error occurred',
    }, 500);
  }
});

// ============================================
// CROWDSCORE ENDPOINT
// ============================================

/**
 * Get CrowdScore threat level
 */
crowdstrikeRoutes.get('/crowdscore', async (c) => {
  const client = new CrowdStrikeClient(c.env, c.env.CACHE);

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const score = await client.getCrowdScore();
    return c.json(score);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch CrowdScore',
      message: 'An internal error occurred',
    }, 500);
  }
});

// ============================================
// VULNERABILITY ENDPOINTS
// ============================================

/**
 * Get vulnerability summary with aggregates
 */
crowdstrikeRoutes.get('/vulnerabilities', async (c) => {
  const client = new CrowdStrikeClient(c.env, c.env.CACHE);

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const summary = await client.getVulnerabilitySummary();
    return c.json(summary);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch vulnerabilities',
      message: 'An internal error occurred',
    }, 500);
  }
});

/**
 * Get raw vulnerability list
 */
crowdstrikeRoutes.get('/vulnerabilities/list', async (c) => {
  const client = new CrowdStrikeClient(c.env, c.env.CACHE);
  const limit = safeInt(c.req.query('limit'), 100, 500);

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const vulns = await client.getVulnerabilities(limit);
    return c.json({ vulnerabilities: vulns, count: vulns.length });
  } catch (error) {
    return c.json({
      error: 'Failed to fetch vulnerabilities',
      message: 'An internal error occurred',
    }, 500);
  }
});

// ============================================
// IDENTITY PROTECTION ENDPOINTS
// ============================================

/**
 * Get Identity Protection detection summary
 */
crowdstrikeRoutes.get('/identity', async (c) => {
  const client = new CrowdStrikeClient(c.env, c.env.CACHE);

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const summary = await client.getIdentityDetectionSummary();
    return c.json(summary);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch identity detections',
      message: 'An internal error occurred',
    }, 500);
  }
});

/**
 * Get raw Identity Protection detections
 */
crowdstrikeRoutes.get('/identity/detections', async (c) => {
  const client = new CrowdStrikeClient(c.env, c.env.CACHE);
  const limit = safeInt(c.req.query('limit'), 50, 100);

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const detections = await client.getIdentityDetections(limit);
    return c.json({ detections, count: detections.length });
  } catch (error) {
    return c.json({
      error: 'Failed to fetch identity detections',
      message: 'An internal error occurred',
    }, 500);
  }
});

// ============================================
// DISCOVER / ASSET INVENTORY ENDPOINTS
// ============================================

/**
 * Get Discover asset summary
 */
crowdstrikeRoutes.get('/discover', async (c) => {
  const client = new CrowdStrikeClient(c.env, c.env.CACHE);

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const summary = await client.getDiscoverSummary();
    return c.json(summary);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch asset discovery data',
      message: 'An internal error occurred',
    }, 500);
  }
});

// ============================================
// SENSOR USAGE ENDPOINTS
// ============================================

/**
 * Get sensor usage trends
 */
crowdstrikeRoutes.get('/sensors', async (c) => {
  const client = new CrowdStrikeClient(c.env, c.env.CACHE);

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const usage = await client.getSensorUsage();
    return c.json(usage);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch sensor usage',
      message: 'An internal error occurred',
    }, 500);
  }
});

// ============================================
// THREAT INTELLIGENCE ENDPOINTS
// ============================================

/**
 * Get intel summary (actors, indicators, reports)
 */
crowdstrikeRoutes.get('/intel', async (c) => {
  const client = new CrowdStrikeClient(c.env, c.env.CACHE);

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const summary = await client.getIntelSummary();
    return c.json(summary);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch threat intelligence',
      message: 'An internal error occurred',
    }, 500);
  }
});

/**
 * Get threat actors
 */
crowdstrikeRoutes.get('/intel/actors', async (c) => {
  const client = new CrowdStrikeClient(c.env, c.env.CACHE);
  const limit = safeInt(c.req.query('limit'), 20, 50);

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const actors = await client.getActors(limit);
    return c.json({ actors, count: actors.length });
  } catch (error) {
    return c.json({
      error: 'Failed to fetch threat actors',
      message: 'An internal error occurred',
    }, 500);
  }
});

/**
 * Get intel reports
 */
crowdstrikeRoutes.get('/intel/reports', async (c) => {
  const client = new CrowdStrikeClient(c.env, c.env.CACHE);
  const limit = safeInt(c.req.query('limit'), 10, 50);

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const reports = await client.getIntelReports(limit);
    return c.json({ reports, count: reports.length });
  } catch (error) {
    return c.json({
      error: 'Failed to fetch intel reports',
      message: 'An internal error occurred',
    }, 500);
  }
});

// ============================================
// ALERT DETAIL ENDPOINT
// ============================================

/**
 * Get a specific alert by composite ID
 */
crowdstrikeRoutes.get('/alerts/:id', async (c) => {
  const client = new CrowdStrikeClient(c.env, c.env.CACHE);
  const alertId = c.req.param('id');

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const alerts = await client.getAlerts(30, 500);
    const alert = alerts.find(a => a.composite_id === alertId);
    if (!alert) {
      return c.json({ error: 'Alert not found' }, 404);
    }
    return c.json(alert);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch alert',
      message: 'An internal error occurred',
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
  const client = new CrowdStrikeClient(c.env, c.env.CACHE);

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const summary = await client.getZTASummary();
    return c.json(summary);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch ZTA scores',
      message: 'An internal error occurred',
    }, 500);
  }
});

/**
 * Get raw ZTA scores
 */
crowdstrikeRoutes.get('/zta/list', async (c) => {
  const client = new CrowdStrikeClient(c.env, c.env.CACHE);
  const limit = safeInt(c.req.query('limit'), 100, 500);

  if (!client.isConfigured()) {
    return c.json({ error: 'CrowdStrike not configured' }, 503);
  }

  try {
    const assessments = await client.getZTAScores(limit);
    return c.json({ assessments, count: assessments.length });
  } catch (error) {
    return c.json({
      error: 'Failed to fetch ZTA scores',
      message: 'An internal error occurred',
    }, 500);
  }
});
