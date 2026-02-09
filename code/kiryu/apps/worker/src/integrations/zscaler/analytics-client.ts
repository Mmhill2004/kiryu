import type { ZscalerAuth } from './auth';

export interface TrafficAction {
  action: string;
  count: number;
  bandwidth: number;
}

export interface ProtocolBreakdown {
  protocol: string;
  count: number;
  bandwidth: number;
}

export interface ThreatCategory {
  category: string;
  count: number;
}

export interface AnalyticsSummary {
  traffic: {
    allowed: number;
    blocked: number;
    cautioned: number;
    totalBandwidth: number;
    actions: TrafficAction[];
  };
  protocols: ProtocolBreakdown[];
  threats: {
    total: number;
    categories: ThreatCategory[];
  };
  fetchedAt: string;
}

const TRAFFIC_QUERY = `
  query TrafficSummary($from: DateTime!, $to: DateTime!) {
    web_traffic {
      action(from: $from, to: $to) {
        action
        count
        bandwidth
      }
      protocols(from: $from, to: $to) {
        protocol
        count
        bandwidth
      }
      threat_class(from: $from, to: $to) {
        threat_class
        count
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Analytics GraphQL failed (${resp.status}): ${text.slice(0, 200)}`);
      }

      const data = await resp.json() as { data?: T; errors?: Array<{ message: string }> };
      if (data.errors && data.errors.length > 0) {
        throw new Error(`GraphQL errors: ${data.errors.map(e => e.message).join(', ')}`);
      }

      return data.data ?? null;
    } finally {
      clearTimeout(timeout);
    }
  }

  async getTrafficSummary(hours = 24): Promise<AnalyticsSummary | null> {
    try {
      const to = new Date().toISOString();
      const from = new Date(Date.now() - hours * 3600_000).toISOString();

      const result = await this.graphqlFetch<{
        web_traffic?: {
          action?: Array<{ action?: string; count?: number; bandwidth?: number }>;
          protocols?: Array<{ protocol?: string; count?: number; bandwidth?: number }>;
          threat_class?: Array<{ threat_class?: string; count?: number }>;
        };
      }>(TRAFFIC_QUERY, { from, to });

      if (!result?.web_traffic) return null;

      const wt = result.web_traffic;
      const actions = (wt.action || []).map(a => ({
        action: a.action || 'unknown',
        count: a.count ?? 0,
        bandwidth: a.bandwidth ?? 0,
      }));

      let allowed = 0;
      let blocked = 0;
      let cautioned = 0;
      let totalBandwidth = 0;

      for (const a of actions) {
        const lower = a.action.toLowerCase();
        if (lower === 'allowed' || lower === 'allow') allowed += a.count;
        else if (lower === 'blocked' || lower === 'block') blocked += a.count;
        else if (lower === 'cautioned' || lower === 'caution') cautioned += a.count;
        totalBandwidth += a.bandwidth;
      }

      const protocols = (wt.protocols || []).map(p => ({
        protocol: p.protocol || 'unknown',
        count: p.count ?? 0,
        bandwidth: p.bandwidth ?? 0,
      }));

      const threatCategories = (wt.threat_class || []).map(t => ({
        category: t.threat_class || 'unknown',
        count: t.count ?? 0,
      }));

      const totalThreats = threatCategories.reduce((sum, t) => sum + t.count, 0);

      return {
        traffic: { allowed, blocked, cautioned, totalBandwidth, actions },
        protocols,
        threats: { total: totalThreats, categories: threatCategories },
        fetchedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Analytics getTrafficSummary error:', error);
      return null;
    }
  }
}
