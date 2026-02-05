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

export class TrendService {
  constructor(private env: Env) {}

  async getCrowdStrikeTrends(periodDays: number): Promise<CrowdStrikeTrends | null> {
    try {
      const totalDays = periodDays * 2;
      const rows = await this.env.DB.prepare(`
        SELECT * FROM crowdstrike_metrics_daily
        WHERE date >= date('now', '-' || ? || ' days')
        ORDER BY date ASC
      `).bind(totalDays).all();

      if (!rows.results || rows.results.length === 0) return null;

      const midpoint = new Date();
      midpoint.setDate(midpoint.getDate() - periodDays);
      const midpointStr = midpoint.toISOString().split('T')[0];

      const previous = rows.results.filter((r: any) => r.date < midpointStr);
      const current = rows.results.filter((r: any) => r.date >= midpointStr);

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
        SELECT * FROM ticket_metrics_daily
        WHERE date >= date('now', '-' || ? || ' days')
        ORDER BY date ASC
      `).bind(totalDays).all();

      if (!rows.results || rows.results.length === 0) return null;

      const midpoint = new Date();
      midpoint.setDate(midpoint.getDate() - periodDays);
      const midpointStr = midpoint.toISOString().split('T')[0];

      const previous = rows.results.filter((r: any) => r.date < midpointStr);
      const current = rows.results.filter((r: any) => r.date >= midpointStr);

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
