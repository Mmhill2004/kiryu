import type { Env } from '../types/env';
import { CrowdStrikeClient } from '../integrations/crowdstrike/client';
import { renderReport } from '../views/ReportTemplate';

export interface ReportData {
  month: string;
  monthLabel: string;
  generatedAt: string;
  securityScore: { current: number; previous: number; direction: 'up' | 'down' | 'stable' };
  alerts: {
    total: number;
    bySeverity: Record<string, number>;
    byTactic: Record<string, number>;
    trend: { current: number; previous: number; changePercent: number };
  };
  incidents: {
    total: number;
    open: number;
    closed: number;
    withLateralMovement: number;
    mttr: number | null;
    bySeverity: Record<string, number>;
  };
  hosts: {
    total: number;
    online: number;
    contained: number;
    staleEndpoints: number;
    byPlatform: Record<string, number>;
  };
  overwatch: {
    totalDetections: number;
    activeEscalations: number;
    resolvedLast30Days: number;
    detectionsBySeverity: Record<string, number>;
  };
  ngsiem: {
    totalEvents: number;
    repositories: number;
    totalIngestGB: number;
  };
  serviceDesk: {
    openTickets: number;
    mttrOverall: number;
    slaComplianceRate: number;
    escalationRate: number;
  } | null;
  zscaler: {
    risk360Overall: number | null;
    risk360Stages: { externalAttackSurface: number; compromise: number; lateralPropagation: number; dataLoss: number } | null;
    zpaConnectorsTotal: number;
    zpaConnectorsHealthy: number;
    zpaConnectorsUnhealthy: number;
    zpaConnectorsOutdated: number;
    zpaAppsTotal: number;
    zpaConnectorGroups: number;
    zpaDoubleEncryptApps: number;
    ziaProtectionsEnabled: number;
    ziaSslInspectionEnabled: boolean;
    ziaActivationPending: boolean;
    ziaUrlFilterRules: number;
    ziaFirewallRules: number;
    ziaDlpRules: number;
    ziaCustomUrlCategories: number;
    ziaSandboxEnabled: boolean;
    ziaBandwidthRules: number;
    zdxAvgScore: number | null;
    zdxScoreCategory: string | null;
    zdxAppsMonitored: number;
    zdxTotalDevices: number;
    zdxActiveAlerts: number;
    analyticsTrafficAllowed: number;
    analyticsTrafficBlocked: number;
    analyticsThreatsTotal: number;
    unhealthyConnectorNames: string[];
  } | null;
  platforms: Array<{ name: string; status: string; lastSync: string | null }>;
  recommendations: string[];
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export class ReportService {
  constructor(private env: Env) {}

  async generateMonthlyReport(year: number, month: number): Promise<{ key: string; html: string }> {
    const data = await this.gatherData(year, month);
    const html = renderReport(data);
    const key = `reports/${year}-${String(month).padStart(2, '0')}-security-report.html`;
    await this.storeReport(key, html);
    return { key, html };
  }

  private async gatherData(year: number, month: number): Promise<ReportData> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

    // Previous month for comparison
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevStartDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;

    // Query CrowdStrike daily metrics for current and previous month
    let csRows: any[] = [];
    let csPrevRows: any[] = [];
    try {
      const result = await this.env.DB.prepare(
        `SELECT * FROM crowdstrike_metrics_daily WHERE date >= ? AND date < ? ORDER BY date ASC`
      ).bind(startDate, endDate).all();
      csRows = result.results || [];

      const prevResult = await this.env.DB.prepare(
        `SELECT * FROM crowdstrike_metrics_daily WHERE date >= ? AND date < ? ORDER BY date ASC`
      ).bind(prevStartDate, startDate).all();
      csPrevRows = prevResult.results || [];
    } catch (error) {
      console.error('Error querying CS metrics for report:', error);
    }

    // Query ticket metrics
    let sfRows: any[] = [];
    try {
      const result = await this.env.DB.prepare(
        `SELECT * FROM ticket_metrics_daily WHERE date >= ? AND date < ? ORDER BY date ASC`
      ).bind(startDate, endDate).all();
      sfRows = result.results || [];
    } catch (error) {
      console.error('Error querying ticket metrics for report:', error);
    }

    // Query Zscaler metrics
    let zsRows: any[] = [];
    try {
      const result = await this.env.DB.prepare(
        `SELECT * FROM zscaler_metrics_daily WHERE date >= ? AND date < ? ORDER BY date DESC LIMIT 1`
      ).bind(startDate, endDate).all();
      zsRows = result.results || [];
    } catch (error) {
      console.error('Error querying Zscaler metrics for report:', error);
    }

    // Query platform status
    let platformRows: any[] = [];
    try {
      const result = await this.env.DB.prepare(`SELECT * FROM platform_status`).all();
      platformRows = result.results || [];
    } catch (error) {
      console.error('Error querying platform status:', error);
    }

    // Aggregate CS data
    const avg = (arr: any[], field: string) => {
      const vals = arr.map(r => (r[field] as number) || 0);
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };
    const last = (arr: any[], field: string) => arr.length > 0 ? (arr[arr.length - 1][field] as number) || 0 : 0;

    // Parse metadata from last row for tactics
    let byTactic: Record<string, number> = {};
    if (csRows.length > 0) {
      try {
        const meta = JSON.parse(csRows[csRows.length - 1].metadata || '{}');
        byTactic = meta.byTactic || {};
      } catch { /* ignore */ }
    }

    const currentAlertAvg = avg(csRows, 'alerts_total');
    const prevAlertAvg = avg(csPrevRows, 'alerts_total');
    const alertChangePercent = prevAlertAvg !== 0 ? ((currentAlertAvg - prevAlertAvg) / prevAlertAvg) * 100 : 0;

    const currentScore = last(csRows, 'security_score');
    const prevScore = last(csPrevRows, 'security_score');

    // Aggregate SF data
    let serviceDesk = null;
    if (sfRows.length > 0) {
      serviceDesk = {
        openTickets: last(sfRows, 'total_open'),
        mttrOverall: avg(sfRows, 'avg_resolution_minutes'),
        slaComplianceRate: avg(sfRows, 'sla_compliance_rate'),
        escalationRate: avg(sfRows, 'escalation_rate'),
      };
    }

    // If no D1 data, try live API as fallback
    if (csRows.length === 0) {
      try {
        const csClient = new CrowdStrikeClient(this.env, this.env.CACHE);
        if (csClient.isConfigured()) {
          const live = await csClient.getFullSummary(30, 30);
          csRows = [{
            alerts_total: live.alerts.total,
            alerts_critical: live.alerts.bySeverity.critical ?? 0,
            alerts_high: live.alerts.bySeverity.high ?? 0,
            alerts_medium: live.alerts.bySeverity.medium ?? 0,
            alerts_low: live.alerts.bySeverity.low ?? 0,
            hosts_total: live.hosts.total,
            hosts_online: live.hosts.online,
            hosts_contained: live.hosts.contained,
            hosts_stale: live.hosts.staleEndpoints,
            hosts_windows: live.hosts.byPlatform.windows ?? 0,
            hosts_mac: live.hosts.byPlatform.mac ?? 0,
            hosts_linux: live.hosts.byPlatform.linux ?? 0,
            incidents_total: live.incidents.total,
            incidents_open: live.incidents.open,
            incidents_closed: live.incidents.closed,
            incidents_with_lateral_movement: live.incidents.withLateralMovement,
            incidents_mttr_hours: live.incidents.mttr,
            incidents_critical: live.incidents.bySeverity.critical ?? 0,
            incidents_high: live.incidents.bySeverity.high ?? 0,
            incidents_medium: live.incidents.bySeverity.medium ?? 0,
            incidents_low: live.incidents.bySeverity.low ?? 0,
            overwatch_total_detections: live.overwatch.totalDetections,
            overwatch_active_escalations: live.overwatch.activeEscalations,
            overwatch_resolved_30d: live.overwatch.resolvedLast30Days,
            overwatch_critical: live.overwatch.detectionsBySeverity.critical ?? 0,
            overwatch_high: live.overwatch.detectionsBySeverity.high ?? 0,
            overwatch_medium: live.overwatch.detectionsBySeverity.medium ?? 0,
            overwatch_low: live.overwatch.detectionsBySeverity.low ?? 0,
            ngsiem_events_total: live.ngsiem.eventCounts.total,
            ngsiem_repositories: live.ngsiem.repositories,
            ngsiem_total_ingest_gb: live.ngsiem.totalIngestGB,
            security_score: Math.max(0, Math.min(100,
              100 - ((live.alerts.bySeverity.critical ?? 0) * 10 + (live.alerts.bySeverity.high ?? 0) * 5
                + (live.alerts.bySeverity.medium ?? 0) * 2 + (live.alerts.bySeverity.low ?? 0) * 1))),
            metadata: JSON.stringify({ byTactic: live.alerts.byTactic }),
          }];
          byTactic = live.alerts.byTactic;
        }
      } catch (error) {
        console.error('Live CrowdStrike fallback failed:', error);
      }
    }

    const reportData: ReportData = {
      month: `${year}-${String(month).padStart(2, '0')}`,
      monthLabel: `${MONTH_NAMES[month - 1]} ${year}`,
      generatedAt: new Date().toISOString(),
      securityScore: {
        current: currentScore || last(csRows, 'security_score'),
        previous: prevScore,
        direction: currentScore > prevScore ? 'up' : currentScore < prevScore ? 'down' : 'stable',
      },
      alerts: {
        total: Math.round(avg(csRows, 'alerts_total')),
        bySeverity: {
          critical: Math.round(avg(csRows, 'alerts_critical')),
          high: Math.round(avg(csRows, 'alerts_high')),
          medium: Math.round(avg(csRows, 'alerts_medium')),
          low: Math.round(avg(csRows, 'alerts_low')),
        },
        byTactic,
        trend: {
          current: Math.round(currentAlertAvg),
          previous: Math.round(prevAlertAvg),
          changePercent: Math.round(alertChangePercent),
        },
      },
      incidents: {
        total: Math.round(avg(csRows, 'incidents_total')),
        open: Math.round(avg(csRows, 'incidents_open')),
        closed: Math.round(avg(csRows, 'incidents_closed')),
        withLateralMovement: Math.round(avg(csRows, 'incidents_with_lateral_movement')),
        mttr: avg(csRows, 'incidents_mttr_hours') || null,
        bySeverity: {
          critical: Math.round(avg(csRows, 'incidents_critical')),
          high: Math.round(avg(csRows, 'incidents_high')),
          medium: Math.round(avg(csRows, 'incidents_medium')),
          low: Math.round(avg(csRows, 'incidents_low')),
        },
      },
      hosts: {
        total: last(csRows, 'hosts_total'),
        online: last(csRows, 'hosts_online'),
        contained: last(csRows, 'hosts_contained'),
        staleEndpoints: last(csRows, 'hosts_stale'),
        byPlatform: {
          Windows: last(csRows, 'hosts_windows'),
          macOS: last(csRows, 'hosts_mac'),
          Linux: last(csRows, 'hosts_linux'),
        },
      },
      overwatch: {
        totalDetections: last(csRows, 'overwatch_total_detections'),
        activeEscalations: last(csRows, 'overwatch_active_escalations'),
        resolvedLast30Days: last(csRows, 'overwatch_resolved_30d'),
        detectionsBySeverity: {
          critical: last(csRows, 'overwatch_critical'),
          high: last(csRows, 'overwatch_high'),
          medium: last(csRows, 'overwatch_medium'),
          low: last(csRows, 'overwatch_low'),
        },
      },
      ngsiem: {
        totalEvents: last(csRows, 'ngsiem_events_total'),
        repositories: last(csRows, 'ngsiem_repositories'),
        totalIngestGB: last(csRows, 'ngsiem_total_ingest_gb'),
      },
      serviceDesk,
      zscaler: null,
      platforms: platformRows.map((p: any) => ({
        name: p.platform,
        status: p.status,
        lastSync: p.last_sync,
      })),
      recommendations: [],
    };

    // Process Zscaler data
    let zscalerData = null;
    if (zsRows.length > 0) {
      const zs = zsRows[0] as any;
      zscalerData = {
        risk360Overall: zs.risk360_overall ?? null,
        risk360Stages: zs.risk360_overall != null ? {
          externalAttackSurface: zs.risk360_external_attack_surface ?? 0,
          compromise: zs.risk360_compromise ?? 0,
          lateralPropagation: zs.risk360_lateral_propagation ?? 0,
          dataLoss: zs.risk360_data_loss ?? 0,
        } : null,
        zpaConnectorsTotal: zs.zpa_connectors_total ?? 0,
        zpaConnectorsHealthy: zs.zpa_connectors_healthy ?? 0,
        zpaConnectorsUnhealthy: zs.zpa_connectors_unhealthy ?? 0,
        zpaConnectorsOutdated: zs.zpa_connectors_outdated ?? 0,
        zpaAppsTotal: zs.zpa_apps_total ?? 0,
        zpaConnectorGroups: zs.zpa_connector_groups ?? 0,
        zpaDoubleEncryptApps: zs.zpa_apps_double_encrypt ?? 0,
        ziaProtectionsEnabled: zs.zia_atp_protections_enabled ?? 0,
        ziaSslInspectionEnabled: !!(zs.zia_ssl_inspection_enabled),
        ziaActivationPending: !!(zs.zia_activation_pending),
        ziaUrlFilterRules: zs.zia_url_filter_rules_enabled ?? 0,
        ziaFirewallRules: zs.zia_firewall_rules_enabled ?? 0,
        ziaDlpRules: zs.zia_dlp_rules_total ?? 0,
        ziaCustomUrlCategories: zs.zia_custom_url_categories ?? 0,
        ziaSandboxEnabled: !!(zs.zia_sandbox_enabled),
        ziaBandwidthRules: zs.zia_bandwidth_rules ?? 0,
        zdxAvgScore: zs.zdx_avg_score ?? null,
        zdxScoreCategory: zs.zdx_score_category ?? null,
        zdxAppsMonitored: zs.zdx_apps_monitored ?? 0,
        zdxTotalDevices: zs.zdx_total_devices ?? 0,
        zdxActiveAlerts: zs.zdx_active_alerts ?? 0,
        analyticsTrafficAllowed: zs.analytics_traffic_allowed ?? 0,
        analyticsTrafficBlocked: zs.analytics_traffic_blocked ?? 0,
        analyticsThreatsTotal: zs.analytics_threats_total ?? 0,
        unhealthyConnectorNames: [],
      };
    }
    reportData.zscaler = zscalerData;

    reportData.recommendations = this.generateRecommendations(reportData);
    return reportData;
  }

  private generateRecommendations(data: ReportData): string[] {
    const recs: string[] = [];

    if ((data.alerts.bySeverity.critical ?? 0) > 0) {
      recs.push(`Address ${data.alerts.bySeverity.critical} critical security alerts requiring immediate attention. Critical alerts indicate active threats or significant vulnerabilities that could lead to a breach.`);
    }

    if (data.hosts.contained > 0) {
      recs.push(`Investigate ${data.hosts.contained} contained endpoint(s). These devices have been isolated from the network and require forensic analysis before being returned to service.`);
    }

    if (data.hosts.staleEndpoints > 5) {
      recs.push(`Review ${data.hosts.staleEndpoints} endpoints that have not communicated with security tools in over 7 days. These may be offline, decommissioned, or compromised.`);
    }

    if (data.incidents.withLateralMovement > 0) {
      recs.push(`Lateral movement was detected in ${data.incidents.withLateralMovement} incident(s). This indicates attackers moved between systems after initial compromise. Review network segmentation and access controls.`);
    }

    if (data.serviceDesk && data.serviceDesk.slaComplianceRate < 95) {
      recs.push(`SLA compliance is at ${data.serviceDesk.slaComplianceRate.toFixed(0)}%, below the 95% target. Review ticket triage processes and consider additional staffing during peak hours.`);
    }

    if (data.serviceDesk && data.serviceDesk.escalationRate > 15) {
      recs.push(`Escalation rate of ${data.serviceDesk.escalationRate.toFixed(1)}% exceeds the 15% threshold. Invest in Tier 1 training to resolve more tickets at first contact.`);
    }

    if (data.overwatch.activeEscalations > 0) {
      recs.push(`CrowdStrike OverWatch has ${data.overwatch.activeEscalations} active escalation(s) from proactive threat hunting. These require immediate review by the security team.`);
    }

    if (data.alerts.trend.changePercent > 20) {
      recs.push(`Alert volume increased by ${data.alerts.trend.changePercent}% compared to the previous period. Investigate whether this represents new threats or a change in detection coverage.`);
    }

    if (data.zscaler) {
      if (data.zscaler.zpaConnectorsUnhealthy > 0) {
        recs.push(`${data.zscaler.zpaConnectorsUnhealthy} ZPA connector(s) are unhealthy. Investigate disconnected connectors to restore private application access.`);
      }
      if (data.zscaler.risk360Overall !== null && data.zscaler.risk360Overall < 70) {
        recs.push(`Risk360 score is ${data.zscaler.risk360Overall}/100, below the 70-point threshold. Review top risk factors in the Zscaler console.`);
      }
      if (!data.zscaler.ziaSslInspectionEnabled) {
        recs.push('ZIA SSL inspection is disabled. Enable it for full threat visibility on encrypted traffic.');
      }
      if (data.zscaler.ziaActivationPending) {
        recs.push('ZIA has configuration changes pending activation. Review and activate to apply security policy updates.');
      }
      if (data.zscaler.zpaConnectorsOutdated > 0) {
        recs.push(`${data.zscaler.zpaConnectorsOutdated} ZPA connector(s) are running outdated software. Update to the latest version for security patches and improvements.`);
      }
      if (data.zscaler.zdxAvgScore !== null && data.zscaler.zdxAvgScore < 66 && data.zscaler.zdxAvgScore >= 0) {
        recs.push(`ZDX average score is ${data.zscaler.zdxAvgScore.toFixed(0)} (${data.zscaler.zdxScoreCategory}). Investigate degraded application performance affecting user digital experience.`);
      }
      if (data.zscaler.zdxActiveAlerts > 0) {
        recs.push(`${data.zscaler.zdxActiveAlerts} active ZDX alert(s) indicate performance degradation. Review impacted applications and network paths.`);
      }
      if (!data.zscaler.ziaSandboxEnabled) {
        recs.push('ZIA Cloud Sandbox is disabled. Enable it for advanced threat detection on unknown files.');
      }
    }

    return recs.slice(0, 5);
  }

  async storeReport(key: string, html: string): Promise<void> {
    await this.env.REPORTS_BUCKET.put(key, html, {
      httpMetadata: { contentType: 'text/html' },
      customMetadata: { generatedAt: new Date().toISOString() },
    });
  }

  async listReports(): Promise<Array<{ key: string; uploaded: string; size: number }>> {
    const list = await this.env.REPORTS_BUCKET.list({ prefix: 'reports/' });
    return list.objects.map((obj: { key: string; uploaded: Date; size: number }) => ({
      key: obj.key,
      uploaded: obj.uploaded.toISOString(),
      size: obj.size,
    }));
  }

  async getReport(key: string): Promise<string | null> {
    const obj = await this.env.REPORTS_BUCKET.get(key);
    if (!obj) return null;
    return obj.text();
  }
}
