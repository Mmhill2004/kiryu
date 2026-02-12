import type { ZscalerAuth } from './auth';

// --- Shared entry types ---

export interface ZinsEntry {
  name: string;
  total: number;
}

export interface ZinsEntryWithTrend extends ZinsEntry {
  trend?: {
    trend_start_time: number;
    trend_interval: string;
    trend_values: number[];
  };
}

export interface CyberIncidentEntry {
  name: string;
  total: number;
  entries?: Array<{ name: string; total: number }> | null;
}

export interface ShadowITApp {
  application: string;
  application_category: string;
  risk_index: number;
  sanctioned_state: string;
  data_consumed: number;
  authenticated_users: number;
}

// --- Summary types ---

export interface TrafficAction {
  action: string;
  count: number;
}

export interface ProtocolBreakdown {
  protocol: string;
  count: number;
}

export interface ThreatCategory {
  category: string;
  count: number;
}

export interface WebTrafficSummary {
  totalTransactions: number;
  byLocation: ZinsEntryWithTrend[];
  protocols: ProtocolBreakdown[];
  threatSuperCategories: ThreatCategory[];
  threatClasses: ThreatCategory[];
}

export interface CyberSecuritySummary {
  totalIncidents: number;
  byCategory: CyberIncidentEntry[];
}

export interface ShadowITSummary {
  totalApps: number;
  apps: ShadowITApp[];
}

export interface AnalyticsSummary {
  webTraffic: WebTrafficSummary | null;
  cyberSecurity: CyberSecuritySummary | null;
  shadowIT: ShadowITSummary | null;
  fetchedAt: string;
}

// --- GraphQL Queries (ZINS schema uses UPPERCASE root fields, epoch ms times) ---

const WEB_TRAFFIC_QUERY = `
  query WebTrafficSummary($startTime: Long!, $endTime: Long!) {
    WEB_TRAFFIC {
      no_grouping(start_time: $startTime, end_time: $endTime, traffic_unit: TRANSACTIONS) {
        entries(limit: 1) { name total }
      }
      location(start_time: $startTime, end_time: $endTime, traffic_unit: TRANSACTIONS) {
        entries(limit: 10) { name total }
      }
      protocols(start_time: $startTime, end_time: $endTime, traffic_unit: TRANSACTIONS) {
        entries(limit: 10) { name total }
      }
      threat_super_categories(start_time: $startTime, end_time: $endTime, traffic_unit: TRANSACTIONS) {
        entries(limit: 20) { name total }
      }
      threat_class(start_time: $startTime, end_time: $endTime, traffic_unit: TRANSACTIONS) {
        entries(limit: 20) { name total }
      }
    }
  }
`;

const CYBER_SECURITY_QUERY = `
  query CyberSecuritySummary($startTime: Long!, $endTime: Long!) {
    CYBER_SECURITY {
      incidents(
        categorize_by: [THREAT_CATEGORY_ID],
        start_time: $startTime,
        end_time: $endTime
      ) {
        entries(limit: 20) {
          name
          total
          entries(limit: 10) { name total }
        }
      }
    }
  }
`;

const SHADOW_IT_QUERY = `
  query ShadowITSummary($startTime: Long!, $endTime: Long!) {
    SHADOW_IT {
      apps(start_time: $startTime, end_time: $endTime) {
        entries(limit: 20) {
          application
          application_category
          risk_index
          sanctioned_state
          data_consumed
          authenticated_users
        }
      }
    }
  }
`;

export class AnalyticsClient {
  constructor(private auth: ZscalerAuth) {}

  isConfigured(): boolean {
    return this.auth.isOneApiConfigured();
  }

  private async graphqlFetch<T>(query: string, variables: Record<string, unknown> = {}): Promise<T | null> {
    const endpoint = this.auth.getAnalyticsBaseUrl();
    const token = await this.auth.getOneApiToken();
    const body = JSON.stringify({ query, variables });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    try {
      let resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body,
        signal: controller.signal,
      });

      // Auto-retry once on 401 with a fresh token
      if (resp.status === 401) {
        console.warn('ZINS GraphQL got 401 — refreshing OneAPI token and retrying');
        await this.auth.invalidateOneApiToken();
        const freshToken = await this.auth.getOneApiToken(true);
        resp = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${freshToken}`,
            'Content-Type': 'application/json',
          },
          body,
          signal: controller.signal,
        });
      }

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Analytics GraphQL failed (${resp.status}): ${text.slice(0, 200)}`);
      }

      const data = await resp.json() as { data?: T; errors?: Array<{ message: string }> };
      // ZINS returns errors alongside partial data — only throw if no data at all
      if (data.errors && data.errors.length > 0 && !data.data) {
        throw new Error(`GraphQL errors: ${data.errors.map(e => e.message).join(', ')}`);
      }

      return data.data ?? null;
    } finally {
      clearTimeout(timeout);
    }
  }

  async getWebTrafficSummary(days = 7): Promise<WebTrafficSummary | null> {
    try {
      const endTime = Date.now();
      const startTime = endTime - days * 86_400_000;

      const result = await this.graphqlFetch<{
        WEB_TRAFFIC?: {
          no_grouping?: { entries?: ZinsEntry[] };
          location?: { entries?: ZinsEntry[] };
          protocols?: { entries?: ZinsEntry[] };
          threat_super_categories?: { entries?: ZinsEntry[] };
          threat_class?: { entries?: ZinsEntry[] };
        };
      }>(WEB_TRAFFIC_QUERY, { startTime, endTime });

      const wt = result?.WEB_TRAFFIC;
      if (!wt) return null;

      const noGrouping = wt.no_grouping?.entries ?? [];
      const totalTransactions = noGrouping[0]?.total ?? 0;

      return {
        totalTransactions,
        byLocation: (wt.location?.entries ?? []).map(e => ({ name: e.name, total: e.total })),
        protocols: (wt.protocols?.entries ?? []).map(e => ({
          protocol: e.name,
          count: e.total,
        })),
        threatSuperCategories: (wt.threat_super_categories?.entries ?? []).map(e => ({
          category: e.name,
          count: e.total,
        })),
        threatClasses: (wt.threat_class?.entries ?? []).map(e => ({
          category: e.name,
          count: e.total,
        })),
      };
    } catch (error) {
      console.error('Analytics getWebTrafficSummary error:', error);
      return null;
    }
  }

  async getCyberSecuritySummary(days = 7): Promise<CyberSecuritySummary | null> {
    try {
      // CYBER_SECURITY requires end_time at least 1 day before now, and exactly 7 or 14 day intervals
      const validDays = days <= 7 ? 7 : 14;
      const endTime = Date.now() - 86_400_000; // 1 day ago
      const startTime = endTime - validDays * 86_400_000;

      const result = await this.graphqlFetch<{
        CYBER_SECURITY?: {
          incidents?: { entries?: CyberIncidentEntry[] };
        };
      }>(CYBER_SECURITY_QUERY, { startTime, endTime });

      const cs = result?.CYBER_SECURITY;
      if (!cs?.incidents?.entries) return null;

      const entries = cs.incidents.entries;
      const totalIncidents = entries.reduce((sum, e) => sum + e.total, 0);

      return {
        totalIncidents,
        byCategory: entries,
      };
    } catch (error) {
      console.error('Analytics getCyberSecuritySummary error:', error);
      return null;
    }
  }

  async getShadowITSummary(days = 7): Promise<ShadowITSummary | null> {
    try {
      const endTime = Date.now();
      const startTime = endTime - days * 86_400_000;

      const result = await this.graphqlFetch<{
        SHADOW_IT?: {
          apps?: {
            entries?: Array<{
              application?: string;
              application_category?: string;
              risk_index?: number;
              sanctioned_state?: string;
              data_consumed?: number;
              authenticated_users?: number;
            }>;
          };
        };
      }>(SHADOW_IT_QUERY, { startTime, endTime });

      const si = result?.SHADOW_IT;
      if (!si?.apps?.entries) return null;

      const apps = si.apps.entries.map(e => ({
        application: e.application ?? 'unknown',
        application_category: e.application_category ?? 'unknown',
        risk_index: e.risk_index ?? 0,
        sanctioned_state: e.sanctioned_state ?? 'unknown',
        data_consumed: e.data_consumed ?? 0,
        authenticated_users: e.authenticated_users ?? 0,
      }));

      return {
        totalApps: apps.length,
        apps,
      };
    } catch (error) {
      console.error('Analytics getShadowITSummary error:', error);
      return null;
    }
  }

  /** Fetch all available ZINS analytics in parallel */
  async getFullSummary(days = 7): Promise<AnalyticsSummary | null> {
    try {
      const [webTraffic, cyberSecurity, shadowIT] = await Promise.all([
        this.getWebTrafficSummary(days),
        this.getCyberSecuritySummary(days),
        this.getShadowITSummary(days),
      ]);

      if (!webTraffic && !cyberSecurity && !shadowIT) return null;

      return {
        webTraffic,
        cyberSecurity,
        shadowIT,
        fetchedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Analytics getFullSummary error:', error);
      return null;
    }
  }

  /** Backwards-compatible method (used by ZscalerClient.getFullSummary) */
  async getTrafficSummary(hours = 24): Promise<AnalyticsSummary | null> {
    const days = Math.max(1, Math.ceil(hours / 24));
    return this.getFullSummary(days);
  }
}
