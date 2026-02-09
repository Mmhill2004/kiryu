import type { Env } from '../types/env';

export interface TrendData {
  current: number;
  previous: number;
  changePercent: number;
  direction: 'up' | 'down' | 'flat';
  sparkline: number[];
}

export interface CrowdStrikeTrends {
  alertsTotal: TrendData;
  alertsCritical: TrendData;
  hostsTotal: TrendData;
  hostsOnline: TrendData;
  incidentsOpen: TrendData;
  ztaAvgScore: TrendData;
  securityScore: TrendData;
  ngsiemEventsTotal: TrendData;
  overwatchDetections: TrendData;
}

export interface SalesforceTrends {
  openTickets: TrendData;
  mttrOverall: TrendData;
  slaCompliance: TrendData;
  escalationRate: TrendData;
}

export interface ZscalerTrends {
  zpaConnectorsHealthy: TrendData;
  risk360Overall: TrendData;
  ziaUrlFilterRulesEnabled: TrendData;
  zpaAppsTotal: TrendData;
  zdxAvgScore: TrendData;
  zdxActiveAlerts: TrendData;
  analyticsTrafficBlocked: TrendData;
}

export interface MerakiTrends {
  devicesOnline: TrendData;
  devicesAlerting: TrendData;
  vpnOnline: TrendData;
  uplinksActive: TrendData;
}

export class TrendService {
  constructor(private env: Env) {}

  async getCrowdStrikeTrends(periodDays: number): Promise<CrowdStrikeTrends | null> {
    try {
      const totalDays = periodDays * 2;
      const rows = await this.env.DB.prepare(`
        SELECT date, alerts_total, alerts_critical, hosts_total, hosts_online,
               incidents_open, zta_avg_score, security_score,
               ngsiem_events_total, overwatch_total_detections
        FROM crowdstrike_metrics_daily
        WHERE date >= date('now', '-' || ? || ' days')
        ORDER BY date ASC
      `).bind(totalDays).all();

      if (!rows.results || rows.results.length === 0) return null;

      const midpoint = new Date();
      midpoint.setDate(midpoint.getDate() - periodDays);
      const midpointStr = midpoint.toISOString().split('T')[0];

      const previous = rows.results.filter((r: any) => r.date < midpointStr!);
      const current = rows.results.filter((r: any) => r.date >= midpointStr!);

      if (current.length === 0) return null;

      return {
        alertsTotal: this.buildTrend(current, previous, 'alerts_total'),
        alertsCritical: this.buildTrend(current, previous, 'alerts_critical'),
        hostsTotal: this.buildTrend(current, previous, 'hosts_total'),
        hostsOnline: this.buildTrend(current, previous, 'hosts_online'),
        incidentsOpen: this.buildTrend(current, previous, 'incidents_open'),
        ztaAvgScore: this.buildTrend(current, previous, 'zta_avg_score'),
        securityScore: this.buildTrend(current, previous, 'security_score'),
        ngsiemEventsTotal: this.buildTrend(current, previous, 'ngsiem_events_total'),
        overwatchDetections: this.buildTrend(current, previous, 'overwatch_total_detections'),
      };
    } catch (error) {
      console.error('Error fetching CrowdStrike trends:', error);
      return null;
    }
  }

  async getSalesforceTrends(periodDays: number): Promise<SalesforceTrends | null> {
    try {
      const totalDays = periodDays * 2;
      const rows = await this.env.DB.prepare(`
        SELECT date, total_open, avg_resolution_minutes,
               sla_compliance_rate, escalation_rate
        FROM ticket_metrics_daily
        WHERE date >= date('now', '-' || ? || ' days')
        ORDER BY date ASC
      `).bind(totalDays).all();

      if (!rows.results || rows.results.length === 0) return null;

      const midpoint = new Date();
      midpoint.setDate(midpoint.getDate() - periodDays);
      const midpointStr = midpoint.toISOString().split('T')[0];

      const previous = rows.results.filter((r: any) => r.date < midpointStr!);
      const current = rows.results.filter((r: any) => r.date >= midpointStr!);

      if (current.length === 0) return null;

      return {
        openTickets: this.buildTrend(current, previous, 'total_open'),
        mttrOverall: this.buildTrend(current, previous, 'avg_resolution_minutes'),
        slaCompliance: this.buildTrend(current, previous, 'sla_compliance_rate'),
        escalationRate: this.buildTrend(current, previous, 'escalation_rate'),
      };
    } catch (error) {
      console.error('Error fetching Salesforce trends:', error);
      return null;
    }
  }

  async getZscalerTrends(periodDays: number): Promise<ZscalerTrends | null> {
    try {
      const totalDays = periodDays * 2;
      const rows = await this.env.DB.prepare(`
        SELECT date, zpa_connectors_healthy, risk360_overall,
               zia_url_filter_rules_enabled, zpa_apps_total,
               zdx_avg_score, zdx_active_alerts, analytics_traffic_blocked
        FROM zscaler_metrics_daily
        WHERE date >= date('now', '-' || ? || ' days')
        ORDER BY date ASC
      `).bind(totalDays).all();

      if (!rows.results || rows.results.length === 0) return null;

      const midpoint = new Date();
      midpoint.setDate(midpoint.getDate() - periodDays);
      const midpointStr = midpoint.toISOString().split('T')[0];

      const previous = rows.results.filter((r: any) => r.date < midpointStr!);
      const current = rows.results.filter((r: any) => r.date >= midpointStr!);

      if (current.length === 0) return null;

      return {
        zpaConnectorsHealthy: this.buildTrend(current, previous, 'zpa_connectors_healthy'),
        risk360Overall: this.buildTrend(current, previous, 'risk360_overall'),
        ziaUrlFilterRulesEnabled: this.buildTrend(current, previous, 'zia_url_filter_rules_enabled'),
        zpaAppsTotal: this.buildTrend(current, previous, 'zpa_apps_total'),
        zdxAvgScore: this.buildTrend(current, previous, 'zdx_avg_score'),
        zdxActiveAlerts: this.buildTrend(current, previous, 'zdx_active_alerts'),
        analyticsTrafficBlocked: this.buildTrend(current, previous, 'analytics_traffic_blocked'),
      };
    } catch (error) {
      console.error('Error fetching Zscaler trends:', error);
      return null;
    }
  }

  async getMerakiTrends(periodDays: number): Promise<MerakiTrends | null> {
    try {
      const totalDays = periodDays * 2;
      const rows = await this.env.DB.prepare(`
        SELECT date, devices_online, devices_alerting, vpn_tunnels_online, uplinks_active
        FROM meraki_metrics_daily
        WHERE date >= date('now', '-' || ? || ' days')
        ORDER BY date ASC
      `).bind(totalDays).all();

      if (!rows.results || rows.results.length === 0) return null;

      const midpoint = new Date();
      midpoint.setDate(midpoint.getDate() - periodDays);
      const midpointStr = midpoint.toISOString().split('T')[0];

      const previous = rows.results.filter((r: any) => r.date < midpointStr!);
      const current = rows.results.filter((r: any) => r.date >= midpointStr!);

      if (current.length === 0) return null;

      return {
        devicesOnline: this.buildTrend(current, previous, 'devices_online'),
        devicesAlerting: this.buildTrend(current, previous, 'devices_alerting'),
        vpnOnline: this.buildTrend(current, previous, 'vpn_tunnels_online'),
        uplinksActive: this.buildTrend(current, previous, 'uplinks_active'),
      };
    } catch (error) {
      console.error('Error fetching Meraki trends:', error);
      return null;
    }
  }

  private buildTrend(current: any[], previous: any[], field: string): TrendData {
    const currentValues = current.map((r: any) => (r[field] as number) || 0);
    const previousValues = previous.map((r: any) => (r[field] as number) || 0);

    const avg = (arr: number[]) => arr.length > 0
      ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const currentAvg = avg(currentValues);
    const previousAvg = avg(previousValues);
    const changePercent = previousAvg !== 0
      ? ((currentAvg - previousAvg) / previousAvg) * 100 : 0;

    return {
      current: Math.round(currentAvg * 100) / 100,
      previous: Math.round(previousAvg * 100) / 100,
      changePercent: Math.round(changePercent * 10) / 10,
      direction: changePercent > 1 ? 'up' : changePercent < -1 ? 'down' : 'flat',
      sparkline: currentValues,
    };
  }
}
