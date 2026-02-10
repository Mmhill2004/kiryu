import type { Env } from '../../types/env';
import { ZscalerAuth } from './auth';
import { ZIAClient, type ZIASummary } from './zia-client';
import { ZPAClient, type ZPASummary } from './zpa-client';
import { ZDXClient, type ZDXSummary } from './zdx-client';
import { AnalyticsClient, type AnalyticsSummary } from './analytics-client';

export type { ZIASummary } from './zia-client';
export type { ZPASummary, ZPAConnector, ZPAConnectorGroup } from './zpa-client';
export type { ZDXSummary, ZDXApp, ZDXAlert } from './zdx-client';
export type {
  AnalyticsSummary, WebTrafficSummary, CyberSecuritySummary, ShadowITSummary,
  TrafficAction, ThreatCategory, ProtocolBreakdown, CyberIncidentEntry, ShadowITApp,
} from './analytics-client';

export interface Risk360Scores {
  overallScore: number;
  externalAttackSurface: number;
  compromise: number;
  lateralPropagation: number;
  dataLoss: number;
  updatedAt: string;
  updatedBy: string;
}

export interface ZscalerFullSummary {
  zia: ZIASummary | null;
  zpa: ZPASummary | null;
  zdx: ZDXSummary | null;
  analytics: AnalyticsSummary | null;
  risk360: Risk360Scores | null;
  configured: boolean;
  errors: string[];
}

export class ZscalerClient {
  private auth: ZscalerAuth;
  private zia: ZIAClient;
  private zpa: ZPAClient;
  private zdx: ZDXClient;
  private analyticsClient: AnalyticsClient;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    this.auth = new ZscalerAuth(env);
    this.zia = new ZIAClient(this.auth);
    this.zpa = new ZPAClient(this.auth, env.ZSCALER_ZPA_CUSTOMER_ID || '');
    this.zdx = new ZDXClient(this.auth);
    this.analyticsClient = new AnalyticsClient(this.auth);
  }

  isConfigured(): boolean {
    return this.auth.isConfigured();
  }

  isZiaConfigured(): boolean {
    return this.auth.isZiaConfigured();
  }

  isZpaConfigured(): boolean {
    return this.auth.isZpaConfigured();
  }

  isZdxConfigured(): boolean {
    return this.auth.isZdxConfigured();
  }

  isAnalyticsConfigured(): boolean {
    return this.analyticsClient.isConfigured();
  }

  async getFullSummary(): Promise<ZscalerFullSummary> {
    const errors: string[] = [];
    const promises: [
      Promise<ZIASummary | null>,
      Promise<ZPASummary | null>,
      Promise<ZDXSummary | null>,
      Promise<AnalyticsSummary | null>,
      Promise<Risk360Scores | null>,
    ] = [
      this.auth.isZiaConfigured()
        ? this.zia.getSummary().catch(e => { errors.push(`ZIA: ${e}`); return null; })
        : Promise.resolve(null),
      this.auth.isZpaConfigured()
        ? this.zpa.getSummary().catch(e => { errors.push(`ZPA: ${e}`); return null; })
        : Promise.resolve(null),
      this.auth.isZdxConfigured()
        ? this.zdx.getSummary().catch(e => { errors.push(`ZDX: ${e}`); return null; })
        : Promise.resolve(null),
      this.analyticsClient.isConfigured()
        ? this.analyticsClient.getTrafficSummary().catch(e => { errors.push(`Analytics: ${e}`); return null; })
        : Promise.resolve(null),
      this.getRisk360Scores(),
    ];

    const [zia, zpa, zdx, analytics, risk360] = await Promise.all(promises);

    // Release legacy ZIA session after batch of calls
    if (this.auth.isLegacyZiaConfigured() && !this.auth.isOneApiConfigured()) {
      this.auth.releaseZiaSession().catch(() => {});
    }

    return { zia, zpa, zdx, analytics, risk360, configured: this.isConfigured(), errors };
  }

  async getZiaSummary(): Promise<ZIASummary> {
    return this.zia.getSummary();
  }

  async getZpaSummary(): Promise<ZPASummary> {
    return this.zpa.getSummary();
  }

  async getZdxSummary(): Promise<ZDXSummary> {
    return this.zdx.getSummary();
  }

  async getAnalyticsSummary(): Promise<AnalyticsSummary | null> {
    return this.analyticsClient.getTrafficSummary();
  }

  async getRisk360Scores(): Promise<Risk360Scores | null> {
    try {
      const raw = await this.env.CACHE.get('risk360:scores');
      return raw ? JSON.parse(raw) as Risk360Scores : null;
    } catch {
      return null;
    }
  }

  async setRisk360Scores(scores: Omit<Risk360Scores, 'updatedAt'>): Promise<void> {
    const data: Risk360Scores = { ...scores, updatedAt: new Date().toISOString() };
    await this.env.CACHE.put('risk360:scores', JSON.stringify(data));
  }

  async testConnection(): Promise<{
    oneApi: { configured: boolean; status: string };
    legacyZia: { configured: boolean; status: string };
    legacyZpa: { configured: boolean; status: string };
    zdx: { configured: boolean; status: string };
    analytics: { configured: boolean; status: string };
  }> {
    const result = {
      oneApi: { configured: this.auth.isOneApiConfigured(), status: 'not_configured' },
      legacyZia: { configured: this.auth.isLegacyZiaConfigured(), status: 'not_configured' },
      legacyZpa: { configured: this.auth.isLegacyZpaConfigured(), status: 'not_configured' },
      zdx: { configured: this.auth.isZdxConfigured(), status: 'not_configured' },
      analytics: { configured: this.analyticsClient.isConfigured(), status: 'not_configured' },
    };

    if (this.auth.isOneApiConfigured()) {
      try {
        await this.auth.getOneApiToken();
        result.oneApi.status = 'ok';
      } catch (e) {
        result.oneApi.status = `error: ${e}`;
      }
    }

    if (this.auth.isLegacyZiaConfigured()) {
      try {
        await this.auth.getZiaSession();
        result.legacyZia.status = 'ok';
        await this.auth.releaseZiaSession();
      } catch (e) {
        result.legacyZia.status = `error: ${e}`;
      }
    }

    if (this.auth.isLegacyZpaConfigured()) {
      try {
        await this.auth.getZpaToken();
        result.legacyZpa.status = 'ok';
      } catch (e) {
        result.legacyZpa.status = `error: ${e}`;
      }
    }

    if (this.auth.isZdxConfigured()) {
      result.zdx.status = result.oneApi.status === 'ok' ? 'ok (via OneAPI)' : 'pending';
    }

    if (this.analyticsClient.isConfigured()) {
      result.analytics.status = result.oneApi.status === 'ok' ? 'ok (via OneAPI)' : 'pending';
    }

    return result;
  }
}
