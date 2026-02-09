import type { ZscalerAuth } from './auth';

export interface ZDXApp {
  id: number;
  name: string;
  score: number;
  mostImpactedRegion: string;
  totalUsers: number;
}

export interface ZDXAlert {
  id: number;
  ruleName: string;
  severity: string;
  status: string;
  numDevices: number;
  impactedApp: string;
  startedOn: string;
}

export interface ZDXSummary {
  averageScore: number;
  scoreCategory: 'Good' | 'Okay' | 'Poor' | 'No Data';
  apps: ZDXApp[];
  lowestScoringApp: ZDXApp | null;
  totalDevices: number;
  alerts: {
    activeAlerts: number;
    criticalAlerts: number;
    alerts: ZDXAlert[];
  };
  fetchedAt: string;
}

function zdxScoreCategory(score: number): ZDXSummary['scoreCategory'] {
  if (score < 0) return 'No Data';
  if (score >= 66) return 'Good';
  if (score >= 34) return 'Okay';
  return 'Poor';
}

export class ZDXClient {
  constructor(private auth: ZscalerAuth) {}

  isConfigured(): boolean {
    return this.auth.isZdxConfigured();
  }

  async getApps(sinceHours = 2): Promise<ZDXApp[]> {
    try {
      // API returns a plain array [...] or { apps: [...] }
      const raw = await this.auth.zdxFetch<unknown>(`/apps?since=${sinceHours}`);
      const list: Array<{
        id?: number;
        name?: string;
        score?: number;
        most_impacted_region?: { state?: string; country?: string };
        most_impacted_geo?: string;
        total_users?: number;
      }> = Array.isArray(raw) ? raw : (raw as { apps?: unknown[] }).apps || [];

      return list.map(a => ({
        id: a.id ?? 0,
        name: a.name || 'Unknown',
        score: a.score ?? -1,
        mostImpactedRegion: typeof a.most_impacted_region === 'object' && a.most_impacted_region
          ? [a.most_impacted_region.state, a.most_impacted_region.country].filter(Boolean).join(', ')
          : (a.most_impacted_geo || ''),
        totalUsers: a.total_users ?? 0,
      }));
    } catch (error) {
      console.error('ZDX getApps error:', error);
      return [];
    }
  }

  async getDeviceCount(sinceHours = 2): Promise<number> {
    try {
      // API returns { devices: [...], next_offset: "" } — no total_count field
      // Use limit=500 to get a reasonable count; if next_offset is non-empty, there are more
      const data = await this.auth.zdxFetch<{
        devices?: unknown[];
        total_count?: number;
        next_offset?: string;
      }>(`/devices?since=${sinceHours}&limit=500&offset=0`);
      if (data.total_count) return data.total_count;
      const count = (data.devices || []).length;
      // If next_offset is set, there are more pages — report count as approximate
      return count;
    } catch (error) {
      console.error('ZDX getDeviceCount error:', error);
      return 0;
    }
  }

  async getAlerts(sinceHours = 24): Promise<ZDXSummary['alerts']> {
    try {
      // API may return { alerts: [...] } or plain array
      const raw = await this.auth.zdxFetch<unknown>(`/alerts?since=${sinceHours}`);
      const list: Array<{
        id?: number;
        rule_name?: string;
        ruleName?: string;
        severity?: string;
        status?: string;
        num_devices?: number;
        numAffectedDevices?: number;
        impacted_app?: string;
        impactedApp?: string;
        started_on?: string;
        startedOn?: string;
      }> = Array.isArray(raw) ? raw : (raw as { alerts?: unknown[] }).alerts || [];

      const alerts = list.map(a => ({
        id: a.id ?? 0,
        ruleName: a.rule_name || a.ruleName || 'Unknown',
        severity: a.severity || 'Unknown',
        status: a.status || 'Unknown',
        numDevices: a.num_devices ?? a.numAffectedDevices ?? 0,
        impactedApp: a.impacted_app || a.impactedApp || 'Unknown',
        startedOn: a.started_on || a.startedOn || '',
      }));

      return {
        activeAlerts: alerts.filter(a => a.status === 'ACTIVE' || a.status === 'active').length,
        criticalAlerts: alerts.filter(a =>
          a.severity === 'CRITICAL' || a.severity === 'Critical' || a.severity === 'critical'
        ).length,
        alerts,
      };
    } catch (error) {
      console.error('ZDX getAlerts error:', error);
      return { activeAlerts: 0, criticalAlerts: 0, alerts: [] };
    }
  }

  async getSummary(sinceHours = 2): Promise<ZDXSummary> {
    const [apps, deviceCount, alerts] = await Promise.allSettled([
      this.getApps(sinceHours),
      this.getDeviceCount(sinceHours),
      this.getAlerts(24),
    ]);

    const appList = apps.status === 'fulfilled' ? apps.value : [];
    const validApps = appList.filter(a => a.score >= 0);
    const avgScore = validApps.length > 0
      ? Math.round((validApps.reduce((sum, a) => sum + a.score, 0) / validApps.length) * 10) / 10
      : -1;

    const lowestApp = validApps.length > 0
      ? validApps.reduce((min, a) => a.score < min.score ? a : min)
      : null;

    return {
      averageScore: avgScore,
      scoreCategory: zdxScoreCategory(avgScore),
      apps: appList,
      lowestScoringApp: lowestApp,
      totalDevices: deviceCount.status === 'fulfilled' ? deviceCount.value : 0,
      alerts: alerts.status === 'fulfilled' ? alerts.value
        : { activeAlerts: 0, criticalAlerts: 0, alerts: [] },
      fetchedAt: new Date().toISOString(),
    };
  }
}
