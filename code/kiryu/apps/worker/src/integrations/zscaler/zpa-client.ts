import type { ZscalerAuth } from './auth';

export interface ZPAConnector {
  id: string;
  name: string;
  enabled: boolean;
  runtimeStatus: string;
  currentVersion: string;
  expectedVersion: string;
  lastBrokerConnectTime: string;
  connectorGroupName: string;
  platform: string;
  runtimeOS: string;
  privateIp: string;
  publicIp: string;
}

export interface ZPAConnectorGroup {
  id: string;
  name: string;
  enabled: boolean;
  connectorCount: number;
}

export interface ZPASummary {
  applications: {
    total: number;
    enabled: number;
    disabled: number;
    doubleEncryptEnabled: number;
  };
  connectors: {
    total: number;
    healthy: number;
    unhealthy: number;
    unknown: number;
    outdated: number;
    byGroup: Record<string, { total: number; healthy: number }>;
    list: ZPAConnector[];
  };
  connectorGroups: {
    total: number;
    list: ZPAConnectorGroup[];
  };
  serverGroups: {
    total: number;
  };
  segmentGroups: {
    total: number;
  };
  accessPolicies: {
    total: number;
  };
  fetchedAt: string;
}

export class ZPAClient {
  constructor(private auth: ZscalerAuth, private customerId: string) {}

  private mgmtBase(): string {
    return `/mgmtconfig/v1/admin/customers/${this.customerId}`;
  }

  async getApplications(): Promise<ZPASummary['applications']> {
    try {
      const data = await this.auth.zpaFetch<{ totalPages?: number; list?: Array<{
        enabled?: boolean;
        doubleEncrypt?: boolean;
        double_encrypt?: boolean;
      }> }>(
        `${this.mgmtBase()}/application?page=1&pageSize=500`
      );
      const apps = data.list || [];
      let enabled = 0;
      let disabled = 0;
      let doubleEncryptEnabled = 0;

      for (const app of apps) {
        if (app.enabled !== false) {
          enabled++;
        } else {
          disabled++;
        }
        if (app.doubleEncrypt || app.double_encrypt) {
          doubleEncryptEnabled++;
        }
      }

      return { total: apps.length, enabled, disabled, doubleEncryptEnabled };
    } catch (error) {
      console.error('ZPA getApplications error:', error);
      return { total: 0, enabled: 0, disabled: 0, doubleEncryptEnabled: 0 };
    }
  }

  async getConnectors(): Promise<ZPASummary['connectors']> {
    try {
      const data = await this.auth.zpaFetch<{
        list?: Array<{
          id?: string;
          name?: string;
          enabled?: boolean;
          controlChannelStatus?: string;
          runtimeStatus?: string;
          currentVersion?: string;
          expectedVersion?: string;
          lastBrokerConnectTime?: string;
          appConnectorGroupName?: string;
          connectorGroupName?: string;
          platform?: string;
          runtimeOS?: string;
          runtime_os?: string;
          privateIp?: string;
          private_ip?: string;
          publicIp?: string;
          public_ip?: string;
        }>;
      }>(`${this.mgmtBase()}/connector?page=1&pageSize=500`);

      const connectors = data.list || [];
      let healthy = 0;
      let unhealthy = 0;
      let unknown = 0;
      let outdated = 0;
      const byGroup: Record<string, { total: number; healthy: number }> = {};
      const list: ZPAConnector[] = [];

      for (const c of connectors) {
        // API returns controlChannelStatus as the real health field; runtimeStatus is a fallback
        const status = c.controlChannelStatus || c.runtimeStatus || 'UNKNOWN';
        const isHealthy = status === 'ZPN_STATUS_AUTHENTICATED';
        const isUnhealthy = status === 'ZPN_STATUS_DISCONNECTED';

        if (isHealthy) healthy++;
        else if (isUnhealthy) unhealthy++;
        else unknown++;

        if (c.currentVersion && c.expectedVersion && c.currentVersion !== c.expectedVersion) {
          outdated++;
        }

        // API returns appConnectorGroupName; connectorGroupName is a fallback
        const groupName = c.appConnectorGroupName || c.connectorGroupName || 'Ungrouped';
        const group = byGroup[groupName] ?? { total: 0, healthy: 0 };
        group.total++;
        if (isHealthy) group.healthy++;
        byGroup[groupName] = group;

        list.push({
          id: c.id || '',
          name: c.name || 'Unknown',
          enabled: c.enabled !== false,
          runtimeStatus: status,
          currentVersion: c.currentVersion || '',
          expectedVersion: c.expectedVersion || '',
          lastBrokerConnectTime: c.lastBrokerConnectTime || '',
          connectorGroupName: groupName,
          platform: c.platform || '',
          runtimeOS: c.runtimeOS || c.runtime_os || '',
          privateIp: c.privateIp || c.private_ip || '',
          publicIp: c.publicIp || c.public_ip || '',
        });
      }

      return { total: connectors.length, healthy, unhealthy, unknown, outdated, byGroup, list };
    } catch (error) {
      console.error('ZPA getConnectors error:', error);
      return { total: 0, healthy: 0, unhealthy: 0, unknown: 0, outdated: 0, byGroup: {}, list: [] };
    }
  }

  async getConnectorGroups(): Promise<ZPASummary['connectorGroups']> {
    try {
      const data = await this.auth.zpaFetch<{
        list?: Array<{
          id?: string;
          name?: string;
          enabled?: boolean;
          connectors?: unknown[];
        }>;
      }>(`${this.mgmtBase()}/connectorGroup?page=1&pageSize=500`);

      const groups = (data.list || []).map(g => ({
        id: g.id || '',
        name: g.name || 'Unknown',
        enabled: g.enabled !== false,
        connectorCount: Array.isArray(g.connectors) ? g.connectors.length : 0,
      }));

      return { total: groups.length, list: groups };
    } catch (error) {
      console.error('ZPA getConnectorGroups error:', error);
      return { total: 0, list: [] };
    }
  }

  async getServerGroups(): Promise<ZPASummary['serverGroups']> {
    try {
      const data = await this.auth.zpaFetch<{ list?: unknown[] }>(
        `${this.mgmtBase()}/serverGroup?page=1&pageSize=500`
      );
      return { total: (data.list || []).length };
    } catch (error) {
      console.error('ZPA getServerGroups error:', error);
      return { total: 0 };
    }
  }

  async getSegmentGroups(): Promise<ZPASummary['segmentGroups']> {
    try {
      const data = await this.auth.zpaFetch<{ list?: unknown[] }>(
        `${this.mgmtBase()}/segmentGroup?page=1&pageSize=500`
      );
      return { total: (data.list || []).length };
    } catch (error) {
      console.error('ZPA getSegmentGroups error:', error);
      return { total: 0 };
    }
  }

  async getAccessPolicies(): Promise<ZPASummary['accessPolicies']> {
    try {
      const data = await this.auth.zpaFetch<{ rules?: unknown[]; list?: unknown[] }>(
        `${this.mgmtBase()}/policySet/rules/policyType/ACCESS_POLICY`
      );
      const rules = data.rules || data.list || [];
      return { total: Array.isArray(rules) ? rules.length : 0 };
    } catch (error) {
      console.error('ZPA getAccessPolicies error:', error);
      return { total: 0 };
    }
  }

  async getSummary(): Promise<ZPASummary> {
    const [apps, connectors, connectorGroups, serverGroups, segmentGroups, accessPolicies] = await Promise.allSettled([
      this.getApplications(),
      this.getConnectors(),
      this.getConnectorGroups(),
      this.getServerGroups(),
      this.getSegmentGroups(),
      this.getAccessPolicies(),
    ]);

    return {
      applications: apps.status === 'fulfilled' ? apps.value
        : { total: 0, enabled: 0, disabled: 0, doubleEncryptEnabled: 0 },
      connectors: connectors.status === 'fulfilled' ? connectors.value
        : { total: 0, healthy: 0, unhealthy: 0, unknown: 0, outdated: 0, byGroup: {}, list: [] },
      connectorGroups: connectorGroups.status === 'fulfilled' ? connectorGroups.value
        : { total: 0, list: [] },
      serverGroups: serverGroups.status === 'fulfilled' ? serverGroups.value : { total: 0 },
      segmentGroups: segmentGroups.status === 'fulfilled' ? segmentGroups.value : { total: 0 },
      accessPolicies: accessPolicies.status === 'fulfilled' ? accessPolicies.value : { total: 0 },
      fetchedAt: new Date().toISOString(),
    };
  }
}
