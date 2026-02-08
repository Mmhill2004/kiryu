import type { Env } from '../../types/env';
import { ZscalerAuth } from './auth';
import { ZIAClient, type ZIASummary } from './zia-client';
import { ZPAClient, type ZPASummary } from './zpa-client';

export type { ZIASummary } from './zia-client';
export type { ZPASummary, ZPAConnector } from './zpa-client';

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
  risk360: Risk360Scores | null;
  configured: boolean;
  errors: string[];
}

export class ZscalerClient {
  private auth: ZscalerAuth;
  private zia: ZIAClient;
  private zpa: ZPAClient;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    this.auth = new ZscalerAuth(env);
    this.zia = new ZIAClient(this.auth);
    this.zpa = new ZPAClient(this.auth, env.ZSCALER_ZPA_CUSTOMER_ID || '');
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

  async getFullSummary(): Promise<ZscalerFullSummary> {
    const errors: string[] = [];
    const promises: [
      Promise<ZIASummary | null>,
      Promise<ZPASummary | null>,
      Promise<Risk360Scores | null>,
    ] = [
      this.auth.isZiaConfigured()
        ? this.zia.getSummary().catch(e => { errors.push(`ZIA: ${e}`); return null; })
        : Promise.resolve(null),
      this.auth.isZpaConfigured()
        ? this.zpa.getSummary().catch(e => { errors.push(`ZPA: ${e}`); return null; })
        : Promise.resolve(null),
      this.getRisk360Scores(),
    ];

    const [zia, zpa, risk360] = await Promise.all(promises);

    // Release legacy ZIA session after batch of calls
    if (this.auth.isLegacyZiaConfigured() && !this.auth.isOneApiConfigured()) {
      this.auth.releaseZiaSession().catch(() => {});
    }

    return { zia, zpa, risk360, configured: this.isConfigured(), errors };
  }

  async getZiaSummary(): Promise<ZIASummary> {
    return this.zia.getSummary();
  }

  async getZpaSummary(): Promise<ZPASummary> {
    return this.zpa.getSummary();
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
  }> {
    const result = {
      oneApi: { configured: this.auth.isOneApiConfigured(), status: 'not_configured' },
      legacyZia: { configured: this.auth.isLegacyZiaConfigured(), status: 'not_configured' },
      legacyZpa: { configured: this.auth.isLegacyZpaConfigured(), status: 'not_configured' },
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

    return result;
  }
}
