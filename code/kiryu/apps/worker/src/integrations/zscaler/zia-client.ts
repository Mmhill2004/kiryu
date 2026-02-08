import type { ZscalerAuth } from './auth';

export interface ZIASummary {
  securityPolicy: {
    atpEnabled: boolean;
    enabledProtections: string[];
    disabledProtections: string[];
    protectionCount: number;
  };
  urlFiltering: {
    totalRules: number;
    enabledRules: number;
    disabledRules: number;
    byAction: Record<string, number>;
  };
  firewall: {
    totalRules: number;
    enabledRules: number;
    disabledRules: number;
  };
  dlp: {
    totalRules: number;
    totalDictionaries: number;
  };
  locations: {
    total: number;
    withSslInspection: number;
    withoutSslInspection: number;
  };
  users: {
    total: number;
  };
  sslInspection: {
    enabled: boolean;
  };
  activationPending: boolean;
  recentAdminChanges: number;
  fetchedAt: string;
}

// ATP protection fields we check
const ATP_FIELDS = [
  'malwareSitesAction', 'phishingSitesAction', 'cryptominingAction',
  'adSpywareSitesAction', 'crossSiteScriptingAction', 'cookieStealingAction',
  'webSpamAction', 'browserExploitAction', 'fileFormatVuln', 'knownMaliciousSites',
  'knownPhishingSites', 'suspectedMaliciousSites', 'suspectedPhishingSites',
  'blockedCountries',
] as const;

export class ZIAClient {
  constructor(private auth: ZscalerAuth) {}

  async getSecurityPolicy(): Promise<ZIASummary['securityPolicy']> {
    try {
      const data = await this.auth.ziaFetch<Record<string, unknown>>('/api/v1/security/advanced');
      const enabled: string[] = [];
      const disabled: string[] = [];

      for (const field of ATP_FIELDS) {
        const val = data[field];
        if (val && val !== 'NONE' && val !== 'OFF' && val !== false) {
          enabled.push(field);
        } else {
          disabled.push(field);
        }
      }

      return {
        atpEnabled: enabled.length > 0,
        enabledProtections: enabled,
        disabledProtections: disabled,
        protectionCount: enabled.length,
      };
    } catch (error) {
      console.error('ZIA getSecurityPolicy error:', error);
      return { atpEnabled: false, enabledProtections: [], disabledProtections: [], protectionCount: 0 };
    }
  }

  async getUrlFilteringRules(): Promise<ZIASummary['urlFiltering']> {
    try {
      const rules = await this.auth.ziaFetch<Array<{ state?: string; action?: string }>>('/api/v1/urlFilteringRules');
      const arr = Array.isArray(rules) ? rules : [];
      const byAction: Record<string, number> = {};

      let enabledCount = 0;
      let disabledCount = 0;

      for (const rule of arr) {
        if (rule.state === 'ENABLED') {
          enabledCount++;
        } else {
          disabledCount++;
        }
        const action = rule.action || 'UNKNOWN';
        byAction[action] = (byAction[action] ?? 0) + 1;
      }

      return {
        totalRules: arr.length,
        enabledRules: enabledCount,
        disabledRules: disabledCount,
        byAction,
      };
    } catch (error) {
      console.error('ZIA getUrlFilteringRules error:', error);
      return { totalRules: 0, enabledRules: 0, disabledRules: 0, byAction: {} };
    }
  }

  async getFirewallRules(): Promise<ZIASummary['firewall']> {
    try {
      const rules = await this.auth.ziaFetch<Array<{ state?: string }>>('/api/v1/firewallRules');
      const arr = Array.isArray(rules) ? rules : [];
      let enabledCount = 0;
      let disabledCount = 0;

      for (const rule of arr) {
        if (rule.state === 'ENABLED') {
          enabledCount++;
        } else {
          disabledCount++;
        }
      }

      return { totalRules: arr.length, enabledRules: enabledCount, disabledRules: disabledCount };
    } catch (error) {
      console.error('ZIA getFirewallRules error:', error);
      return { totalRules: 0, enabledRules: 0, disabledRules: 0 };
    }
  }

  async getDlpSummary(): Promise<ZIASummary['dlp']> {
    const [rulesResult, dictsResult] = await Promise.allSettled([
      this.auth.ziaFetch<unknown[]>('/api/v1/dlpRules'),
      this.auth.ziaFetch<unknown[]>('/api/v1/dlpDictionaries'),
    ]);

    const rules = rulesResult.status === 'fulfilled' && Array.isArray(rulesResult.value) ? rulesResult.value : [];
    const dicts = dictsResult.status === 'fulfilled' && Array.isArray(dictsResult.value) ? dictsResult.value : [];

    return { totalRules: rules.length, totalDictionaries: dicts.length };
  }

  async getLocations(): Promise<ZIASummary['locations']> {
    try {
      const locs = await this.auth.ziaFetch<Array<{ sslScanEnabled?: boolean }>>('/api/v1/locations');
      const arr = Array.isArray(locs) ? locs : [];
      let withSsl = 0;
      let withoutSsl = 0;

      for (const loc of arr) {
        if (loc.sslScanEnabled) {
          withSsl++;
        } else {
          withoutSsl++;
        }
      }

      return { total: arr.length, withSslInspection: withSsl, withoutSslInspection: withoutSsl };
    } catch (error) {
      console.error('ZIA getLocations error:', error);
      return { total: 0, withSslInspection: 0, withoutSslInspection: 0 };
    }
  }

  async getUserCount(): Promise<number> {
    try {
      const data = await this.auth.ziaFetch<{ totalPages?: number }>('/api/v1/users?page=1&pageSize=1');
      return (data.totalPages ?? 0);
    } catch (error) {
      console.error('ZIA getUserCount error:', error);
      return 0;
    }
  }

  async getSslInspectionStatus(): Promise<boolean> {
    try {
      const data = await this.auth.ziaFetch<Record<string, unknown>>('/api/v1/sslSettings');
      // Check for top-level enabled flags
      return !!(data && (data.sslInterceptionEnabled || data.enableSslInspection || data.interceptionEnabled));
    } catch (error) {
      console.error('ZIA getSslInspectionStatus error:', error);
      return false;
    }
  }

  async getActivationStatus(): Promise<boolean> {
    try {
      const data = await this.auth.ziaFetch<{ status?: string }>('/api/v1/status');
      return data.status === 'PENDING';
    } catch (error) {
      console.error('ZIA getActivationStatus error:', error);
      return false;
    }
  }

  async getRecentAdminChanges(hours = 24): Promise<number> {
    try {
      const startTime = Date.now() - hours * 60 * 60 * 1000;
      const endTime = Date.now();
      const data = await this.auth.ziaFetch<{ auditLogEntries?: unknown[] }>(
        `/api/v1/auditlogEntryReport?startTime=${startTime}&endTime=${endTime}&page=1&pageSize=1`
      );
      // The API may return total in different places; count what we get
      const entries = data.auditLogEntries || [];
      return Array.isArray(entries) ? entries.length : 0;
    } catch (error) {
      // Audit log may not be available in all tenants
      console.error('ZIA getRecentAdminChanges error:', error);
      return 0;
    }
  }

  async getSummary(): Promise<ZIASummary> {
    const [
      securityPolicy,
      urlFiltering,
      firewall,
      dlp,
      locations,
      userCount,
      sslEnabled,
      activationPending,
      adminChanges,
    ] = await Promise.allSettled([
      this.getSecurityPolicy(),
      this.getUrlFilteringRules(),
      this.getFirewallRules(),
      this.getDlpSummary(),
      this.getLocations(),
      this.getUserCount(),
      this.getSslInspectionStatus(),
      this.getActivationStatus(),
      this.getRecentAdminChanges(),
    ]);

    return {
      securityPolicy: securityPolicy.status === 'fulfilled' ? securityPolicy.value
        : { atpEnabled: false, enabledProtections: [], disabledProtections: [], protectionCount: 0 },
      urlFiltering: urlFiltering.status === 'fulfilled' ? urlFiltering.value
        : { totalRules: 0, enabledRules: 0, disabledRules: 0, byAction: {} },
      firewall: firewall.status === 'fulfilled' ? firewall.value
        : { totalRules: 0, enabledRules: 0, disabledRules: 0 },
      dlp: dlp.status === 'fulfilled' ? dlp.value
        : { totalRules: 0, totalDictionaries: 0 },
      locations: locations.status === 'fulfilled' ? locations.value
        : { total: 0, withSslInspection: 0, withoutSslInspection: 0 },
      users: { total: userCount.status === 'fulfilled' ? userCount.value : 0 },
      sslInspection: { enabled: sslEnabled.status === 'fulfilled' ? sslEnabled.value : false },
      activationPending: activationPending.status === 'fulfilled' ? activationPending.value : false,
      recentAdminChanges: adminChanges.status === 'fulfilled' ? adminChanges.value : 0,
      fetchedAt: new Date().toISOString(),
    };
  }
}
