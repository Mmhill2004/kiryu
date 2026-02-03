import { Hono } from 'hono';
import type { Env } from '../types/env';
import { Dashboard } from '../views/Dashboard';

export const uiRoutes = new Hono<{ Bindings: Env }>();

/**
 * Main dashboard page
 */
uiRoutes.get('/', async (c) => {
  const period = (c.req.query('period') || '7d') as '24h' | '7d' | '30d' | '90d';

  // Calculate date range based on period
  const endDate = new Date();
  const startDate = new Date();
  switch (period) {
    case '24h': startDate.setHours(startDate.getHours() - 24); break;
    case '7d': startDate.setDate(startDate.getDate() - 7); break;
    case '30d': startDate.setDate(startDate.getDate() - 30); break;
    case '90d': startDate.setDate(startDate.getDate() - 90); break;
  }

  // Fetch all dashboard data
  let summary = {
    securityScore: 100,
    threatsByCategory: { endpoint: 0, email: 0, web: 0, cloud: 0 },
    incidentsBySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
    lastUpdated: new Date().toISOString(),
  };

  let platforms = [
    { platform: 'crowdstrike', status: 'not_configured' as const, last_sync: null },
    { platform: 'abnormal', status: 'not_configured' as const, last_sync: null },
    { platform: 'zscaler', status: 'not_configured' as const, last_sync: null },
    { platform: 'microsoft', status: 'not_configured' as const, last_sync: null },
    { platform: 'salesforce', status: 'not_configured' as const, last_sync: null },
  ];

  let incidents: Array<{
    id: string;
    source: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    status: string;
    created_at: string;
  }> = [];

  let tickets = {
    openTickets: 0,
    avgResolutionHours: 0,
    highPriority: 0,
  };

  try {
    // Fetch summary data
    const summaryResult = await c.env.DB.prepare(`
      SELECT
        SUM(CASE WHEN source = 'crowdstrike' THEN threat_count ELSE 0 END) as endpoint_threats,
        SUM(CASE WHEN source = 'abnormal' THEN threat_count ELSE 0 END) as email_threats,
        SUM(CASE WHEN source = 'zscaler' THEN threat_count ELSE 0 END) as web_threats,
        SUM(CASE WHEN source = 'microsoft' THEN threat_count ELSE 0 END) as cloud_threats,
        COUNT(DISTINCT CASE WHEN severity = 'critical' THEN id END) as critical_incidents,
        COUNT(DISTINCT CASE WHEN severity = 'high' THEN id END) as high_incidents,
        COUNT(DISTINCT CASE WHEN severity = 'medium' THEN id END) as medium_incidents,
        COUNT(DISTINCT CASE WHEN severity = 'low' THEN id END) as low_incidents
      FROM security_events
      WHERE created_at >= ? AND created_at <= ?
    `).bind(startDate.toISOString(), endDate.toISOString()).first();

    if (summaryResult) {
      const criticalWeight = 10;
      const highWeight = 5;
      const mediumWeight = 2;
      const lowWeight = 1;

      const totalWeightedIncidents =
        ((summaryResult.critical_incidents as number) || 0) * criticalWeight +
        ((summaryResult.high_incidents as number) || 0) * highWeight +
        ((summaryResult.medium_incidents as number) || 0) * mediumWeight +
        ((summaryResult.low_incidents as number) || 0) * lowWeight;

      const securityScore = Math.max(0, Math.min(100, 100 - totalWeightedIncidents));

      summary = {
        securityScore,
        threatsByCategory: {
          endpoint: (summaryResult.endpoint_threats as number) || 0,
          email: (summaryResult.email_threats as number) || 0,
          web: (summaryResult.web_threats as number) || 0,
          cloud: (summaryResult.cloud_threats as number) || 0,
        },
        incidentsBySeverity: {
          critical: (summaryResult.critical_incidents as number) || 0,
          high: (summaryResult.high_incidents as number) || 0,
          medium: (summaryResult.medium_incidents as number) || 0,
          low: (summaryResult.low_incidents as number) || 0,
        },
        lastUpdated: new Date().toISOString(),
      };
    }

    // Fetch platform status
    const platformsResult = await c.env.DB.prepare(`
      SELECT platform, status, last_sync, error_message
      FROM platform_status
      ORDER BY platform ASC
    `).all();

    if (platformsResult.results.length > 0) {
      platforms = platformsResult.results as typeof platforms;
    }

    // Fetch recent incidents
    const incidentsResult = await c.env.DB.prepare(`
      SELECT id, source, title, severity, status, created_at
      FROM incidents
      ORDER BY created_at DESC
      LIMIT 10
    `).all();

    incidents = incidentsResult.results as typeof incidents;

    // Fetch ticket metrics
    const ticketsResult = await c.env.DB.prepare(`
      SELECT
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
        AVG(resolution_time_hours) as avg_resolution_hours,
        COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority
      FROM tickets
      WHERE created_at >= datetime('now', '-' || ? || ' days')
    `).bind(period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90).first();

    if (ticketsResult) {
      tickets = {
        openTickets: (ticketsResult.open_tickets as number) || 0,
        avgResolutionHours: (ticketsResult.avg_resolution_hours as number) || 0,
        highPriority: (ticketsResult.high_priority as number) || 0,
      };
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
  }

  return c.html(
    <Dashboard
      data={{
        summary,
        platforms,
        incidents,
        tickets,
        period,
      }}
    />
  );
});
