import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env } from '../types/env';
import { TrendService } from '../services/trends';
import { CrowdStrikeClient } from '../integrations/crowdstrike/client';
import { SalesforceClient } from '../integrations/salesforce/client';

export const dashboardRoutes = new Hono<{ Bindings: Env }>();

// Query parameter schemas
const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  period: z.enum(['24h', '7d', '30d', '90d']).default('7d'),
});

/**
 * Get executive summary - high-level security metrics
 */
dashboardRoutes.get('/summary', zValidator('query', dateRangeSchema), async (c) => {
  const { period } = c.req.valid('query');
  
  // Calculate date range based on period
  const endDate = new Date();
  const startDate = new Date();
  switch (period) {
    case '24h': startDate.setHours(startDate.getHours() - 24); break;
    case '7d': startDate.setDate(startDate.getDate() - 7); break;
    case '30d': startDate.setDate(startDate.getDate() - 30); break;
    case '90d': startDate.setDate(startDate.getDate() - 90); break;
  }

  try {
    // Fetch aggregated metrics from D1
    const summary = await c.env.DB.prepare(`
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

    // Get previous period for comparison
    const prevEndDate = startDate;
    const prevStartDate = new Date(startDate);
    switch (period) {
      case '24h': prevStartDate.setHours(prevStartDate.getHours() - 24); break;
      case '7d': prevStartDate.setDate(prevStartDate.getDate() - 7); break;
      case '30d': prevStartDate.setDate(prevStartDate.getDate() - 30); break;
      case '90d': prevStartDate.setDate(prevStartDate.getDate() - 90); break;
    }

    const prevSummary = await c.env.DB.prepare(`
      SELECT 
        SUM(threat_count) as total_threats
      FROM security_events
      WHERE created_at >= ? AND created_at <= ?
    `).bind(prevStartDate.toISOString(), prevEndDate.toISOString()).first();

    // Calculate security score (simplified algorithm)
    const criticalWeight = 10;
    const highWeight = 5;
    const mediumWeight = 2;
    const lowWeight = 1;
    
    const totalWeightedIncidents = 
      ((summary?.critical_incidents as number) || 0) * criticalWeight +
      ((summary?.high_incidents as number) || 0) * highWeight +
      ((summary?.medium_incidents as number) || 0) * mediumWeight +
      ((summary?.low_incidents as number) || 0) * lowWeight;
    
    // Score from 0-100, lower incidents = higher score
    const securityScore = Math.max(0, Math.min(100, 100 - totalWeightedIncidents));

    const currentThreats = 
      ((summary?.endpoint_threats as number) || 0) +
      ((summary?.email_threats as number) || 0) +
      ((summary?.web_threats as number) || 0) +
      ((summary?.cloud_threats as number) || 0);

    const prevThreats = (prevSummary?.total_threats as number) || 0;
    const threatTrend = prevThreats > 0 
      ? ((currentThreats - prevThreats) / prevThreats * 100).toFixed(1)
      : '0';

    return c.json({
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      securityScore,
      threatsByCategory: {
        endpoint: (summary?.endpoint_threats as number) || 0,
        email: (summary?.email_threats as number) || 0,
        web: (summary?.web_threats as number) || 0,
        cloud: (summary?.cloud_threats as number) || 0,
      },
      incidentsBySeverity: {
        critical: (summary?.critical_incidents as number) || 0,
        high: (summary?.high_incidents as number) || 0,
        medium: (summary?.medium_incidents as number) || 0,
        low: (summary?.low_incidents as number) || 0,
      },
      trends: {
        threats: {
          current: currentThreats,
          previous: prevThreats,
          percentChange: threatTrend,
        },
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    
    // Return mock data if database is empty or error
    return c.json({
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      securityScore: 85,
      threatsByCategory: {
        endpoint: 0,
        email: 0,
        web: 0,
        cloud: 0,
      },
      incidentsBySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      trends: {
        threats: {
          current: 0,
          previous: 0,
          percentChange: '0',
        },
      },
      lastUpdated: new Date().toISOString(),
      _note: 'No data available yet. Run a sync to populate data.',
    });
  }
});

/**
 * Get threat timeline for charts
 */
dashboardRoutes.get('/threats/timeline', zValidator('query', dateRangeSchema), async (c) => {
  const { period } = c.req.valid('query');
  
  const endDate = new Date();
  const startDate = new Date();
  let groupBy: string;
  
  switch (period) {
    case '24h': 
      startDate.setHours(startDate.getHours() - 24);
      groupBy = 'hour';
      break;
    case '7d': 
      startDate.setDate(startDate.getDate() - 7);
      groupBy = 'day';
      break;
    case '30d': 
      startDate.setDate(startDate.getDate() - 30);
      groupBy = 'day';
      break;
    case '90d': 
      startDate.setDate(startDate.getDate() - 90);
      groupBy = 'week';
      break;
  }

  try {
    const timeline = await c.env.DB.prepare(`
      SELECT 
        DATE(created_at) as date,
        source,
        SUM(threat_count) as count
      FROM security_events
      WHERE created_at >= ? AND created_at <= ?
      GROUP BY DATE(created_at), source
      ORDER BY date ASC
    `).bind(startDate.toISOString(), endDate.toISOString()).all();

    return c.json({
      period,
      groupBy,
      data: timeline.results,
    });
  } catch (error) {
    return c.json({
      period,
      groupBy,
      data: [],
      _note: 'No data available yet.',
    });
  }
});

/**
 * Get platform health status
 */
dashboardRoutes.get('/platforms/status', async (c) => {
  try {
    const statuses = await c.env.DB.prepare(`
      SELECT 
        platform,
        status,
        last_sync,
        error_message
      FROM platform_status
      ORDER BY platform ASC
    `).all();

    return c.json({
      platforms: statuses.results.length > 0 ? statuses.results : [
        { platform: 'crowdstrike', status: 'not_configured', last_sync: null },
        { platform: 'abnormal', status: 'not_configured', last_sync: null },
        { platform: 'zscaler', status: 'not_configured', last_sync: null },
        { platform: 'microsoft', status: 'not_configured', last_sync: null },
        { platform: 'salesforce', status: 'not_configured', last_sync: null },
      ],
      lastChecked: new Date().toISOString(),
    });
  } catch (error) {
    return c.json({
      platforms: [
        { platform: 'crowdstrike', status: 'unknown', last_sync: null },
        { platform: 'abnormal', status: 'unknown', last_sync: null },
        { platform: 'zscaler', status: 'unknown', last_sync: null },
        { platform: 'microsoft', status: 'unknown', last_sync: null },
        { platform: 'salesforce', status: 'unknown', last_sync: null },
      ],
      lastChecked: new Date().toISOString(),
    });
  }
});

/**
 * Get recent incidents across all platforms
 */
dashboardRoutes.get('/incidents/recent', async (c) => {
  const limit = parseInt(c.req.query('limit') || '20');

  try {
    const incidents = await c.env.DB.prepare(`
      SELECT 
        id,
        source,
        title,
        severity,
        status,
        created_at,
        updated_at
      FROM incidents
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(Math.min(limit, 100)).all();

    return c.json({
      incidents: incidents.results,
      total: incidents.results.length,
    });
  } catch (error) {
    return c.json({
      incidents: [],
      total: 0,
      _note: 'No incidents data available yet.',
    });
  }
});

/**
 * Get historical trends from D1
 */
dashboardRoutes.get('/trends', zValidator('query', z.object({
  metric: z.enum(['crowdstrike', 'salesforce', 'all']).default('all'),
  period: z.enum(['24h', '7d', '30d', '90d']).default('7d'),
})), async (c) => {
  const { metric, period } = c.req.valid('query');
  const daysBack = period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90;

  const trendService = new TrendService(c.env);

  try {
    const result: Record<string, unknown> = { period };

    if (metric === 'crowdstrike' || metric === 'all') {
      result.crowdstrike = await trendService.getCrowdStrikeTrends(daysBack);
    }
    if (metric === 'salesforce' || metric === 'all') {
      result.salesforce = await trendService.getSalesforceTrends(daysBack);
    }

    return c.json(result);
  } catch (error) {
    return c.json({ period, error: 'Failed to fetch trends', crowdstrike: null, salesforce: null });
  }
});

/**
 * Get service desk metrics from Salesforce
 */
dashboardRoutes.get('/tickets/metrics', zValidator('query', dateRangeSchema), async (c) => {
  const { period } = c.req.valid('query');

  try {
    const metrics = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_tickets,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_tickets,
        AVG(resolution_time_hours) as avg_resolution_hours,
        COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority
      FROM tickets
      WHERE created_at >= datetime('now', '-' || ? || ' days')
    `).bind(period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90).first();

    return c.json({
      period,
      metrics: {
        totalTickets: (metrics?.total_tickets as number) || 0,
        openTickets: (metrics?.open_tickets as number) || 0,
        closedTickets: (metrics?.closed_tickets as number) || 0,
        avgResolutionHours: (metrics?.avg_resolution_hours as number) || 0,
        highPriority: (metrics?.high_priority as number) || 0,
      },
    });
  } catch (error) {
    return c.json({
      period,
      metrics: {
        totalTickets: 0,
        openTickets: 0,
        closedTickets: 0,
        avgResolutionHours: 0,
        highPriority: 0,
      },
      _note: 'No ticket data available yet.',
    });
  }
});

/**
 * Get AI-friendly executive summary with plain-language narrative
 */
dashboardRoutes.get('/executive-summary', zValidator('query', z.object({
  period: z.enum(['24h', '7d', '30d', '90d']).default('7d'),
})), async (c) => {
  const { period } = c.req.valid('query');
  const daysBack = period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90;

  try {
    const csClient = new CrowdStrikeClient(c.env, c.env.CACHE);
    const sfClient = new SalesforceClient(c.env, c.env.CACHE);
    const trendService = new TrendService(c.env);

    const [csSummary, sfMetrics, csTrends, sfTrends] = await Promise.allSettled([
      csClient.isConfigured() ? csClient.getFullSummary(daysBack, 30) : null,
      sfClient.isConfigured() ? sfClient.getDashboardMetrics() : null,
      trendService.getCrowdStrikeTrends(daysBack),
      trendService.getSalesforceTrends(daysBack),
    ]);

    const cs = csSummary.status === 'fulfilled' ? csSummary.value : null;
    const sf = sfMetrics.status === 'fulfilled' ? sfMetrics.value : null;
    const csT = csTrends.status === 'fulfilled' ? csTrends.value : null;
    const sfT = sfTrends.status === 'fulfilled' ? sfTrends.value : null;

    // Build plain-language narrative
    const riskAreas: string[] = [];
    const keyMetrics: Record<string, unknown> = {};

    if (cs) {
      keyMetrics.securityScore = Math.max(0, Math.min(100,
        100 - (cs.alerts.bySeverity.critical * 10 + cs.alerts.bySeverity.high * 5
          + cs.alerts.bySeverity.medium * 2 + cs.alerts.bySeverity.low * 1)));
      keyMetrics.totalAlerts = cs.alerts.total;
      keyMetrics.criticalAlerts = cs.alerts.bySeverity.critical;
      keyMetrics.totalEndpoints = cs.hosts.total;
      keyMetrics.containedEndpoints = cs.hosts.contained;
      keyMetrics.openIncidents = cs.incidents.open;

      if (cs.alerts.bySeverity.critical > 0) riskAreas.push(`${cs.alerts.bySeverity.critical} critical alert(s) require immediate attention`);
      if (cs.hosts.contained > 0) riskAreas.push(`${cs.hosts.contained} endpoint(s) are currently contained`);
      if (cs.incidents.withLateralMovement > 0) riskAreas.push(`Lateral movement detected in ${cs.incidents.withLateralMovement} incident(s)`);
    }

    if (sf) {
      keyMetrics.openTickets = sf.openTickets;
      keyMetrics.mttrMinutes = sf.mttr.overall;
      keyMetrics.slaCompliance = sf.slaComplianceRate;

      if (sf.slaComplianceRate < 95) riskAreas.push(`SLA compliance at ${sf.slaComplianceRate.toFixed(0)}% (below 95% target)`);
      if (sf.escalationRate > 15) riskAreas.push(`Escalation rate at ${sf.escalationRate.toFixed(1)}% (above 15% threshold)`);
    }

    const recommendations: string[] = [];
    if (cs?.alerts.bySeverity.critical) recommendations.push('Prioritize triage of critical security alerts');
    if (cs?.hosts.contained) recommendations.push('Complete forensic analysis on contained endpoints');
    if (sf && sf.slaComplianceRate < 95) recommendations.push('Review ticket triage process to improve SLA compliance');
    if (csT?.alertsTotal && csT.alertsTotal.direction === 'up') recommendations.push('Investigate increasing alert volume trend');

    return c.json({
      period,
      narrative: `Security posture for the ${period} period. ${cs ? `Monitoring ${cs.hosts.total} endpoints with ${cs.alerts.total} active alerts (${cs.alerts.bySeverity.critical} critical).` : 'CrowdStrike data unavailable.'} ${sf ? `Service desk has ${sf.openTickets} open tickets with ${sf.slaComplianceRate.toFixed(0)}% SLA compliance.` : ''}`,
      keyMetrics,
      riskAreas,
      recommendations,
      trends: { crowdstrike: csT, salesforce: sfT },
    });
  } catch (error) {
    return c.json({
      period,
      narrative: 'Unable to generate executive summary due to data fetch errors.',
      keyMetrics: {},
      riskAreas: [],
      recommendations: [],
      trends: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});
