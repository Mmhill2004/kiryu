import type { Env } from '../types/env';
import { CrowdStrikeClient } from '../integrations/crowdstrike/client';
import { SalesforceClient } from '../integrations/salesforce/client';
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
  platforms: Array<{ name: string; status: string; lastSync: string | null }>;
  recommendations: string[];
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const TACTIC_DESCRIPTIONS: Record<string, string> = {
  'Reconnaissance': 'Gathering information about the organization to plan an attack',
  'Resource Development': 'Building infrastructure or acquiring tools for an attack',
  'Initial Access': 'Attempting to gain first entry into the network',
  'Execution': 'Running malicious code on compromised systems',
  'Persistence': 'Maintaining a foothold in the environment',
  'Privilege Escalation': 'Attempting to gain higher-level permissions',
  'Defense Evasion': 'Trying to avoid detection by security tools',
  'Credential Access': 'Stealing usernames, passwords, or authentication tokens',
  'Discovery': 'Mapping out the network and identifying valuable targets',
  'Lateral Movement': 'Moving between systems after initial compromise',
  'Collection': 'Gathering data of interest before exfiltration',
  'Command and Control': 'Communicating with compromised systems from outside',
  'Exfiltration': 'Stealing data from the network',
  'Impact': 'Disrupting or destroying systems and data',
};

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
    const sum = (arr: any[], field: string) => arr.reduce((s, r) => s + ((r[field] as number) || 0), 0);
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
            alerts_critical: live.alerts.bySeverity.critical,
            alerts_high: live.alerts.bySeverity.high,
            alerts_medium: live.alerts.bySeverity.medium,
            alerts_low: live.alerts.bySeverity.low,
            hosts_total: live.hosts.total,
            hosts_online: live.hosts.online,
            hosts_contained: live.hosts.contained,
            hosts_stale: live.hosts.staleEndpoints,
            hosts_windows: live.hosts.byPlatform.windows,
            hosts_mac: live.hosts.byPlatform.mac,
            hosts_linux: live.hosts.byPlatform.linux,
            incidents_total: live.incidents.total,
            incidents_open: live.incidents.open,
            incidents_closed: live.incidents.closed,
            incidents_with_lateral_movement: live.incidents.withLateralMovement,
            incidents_mttr_hours: live.incidents.mttr,
            incidents_critical: live.incidents.bySeverity.critical,
            incidents_high: live.incidents.bySeverity.high,
            incidents_medium: live.incidents.bySeverity.medium,
            incidents_low: live.incidents.bySeverity.low,
            overwatch_total_detections: live.overwatch.totalDetections,
            overwatch_active_escalations: live.overwatch.activeEscalations,
            overwatch_resolved_30d: live.overwatch.resolvedLast30Days,
            overwatch_critical: live.overwatch.detectionsBySeverity.critical,
            overwatch_high: live.overwatch.detectionsBySeverity.high,
            overwatch_medium: live.overwatch.detectionsBySeverity.medium,
            overwatch_low: live.overwatch.detectionsBySeverity.low,
            ngsiem_events_total: live.ngsiem.eventCounts.total,
            ngsiem_repositories: live.ngsiem.repositories,
            ngsiem_total_ingest_gb: live.ngsiem.totalIngestGB,
            security_score: Math.max(0, Math.min(100,
              100 - (live.alerts.bySeverity.critical * 10 + live.alerts.bySeverity.high * 5
                + live.alerts.bySeverity.medium * 2 + live.alerts.bySeverity.low * 1))),
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
      platforms: platformRows.map((p: any) => ({
        name: p.platform,
        status: p.status,
        lastSync: p.last_sync,
      })),
      recommendations: [],
    };

    reportData.recommendations = this.generateRecommendations(reportData);
    return reportData;
  }

  private generateRecommendations(data: ReportData): string[] {
    const recs: string[] = [];

    if (data.alerts.bySeverity.critical > 0) {
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
    return list.objects.map(obj => ({
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
