import type { Env } from '../../types/env';

// ── Types ────────────────────────────────────────────────────────────

export interface MerakiDeviceSummary {
  total: number;
  online: number;
  alerting: number;
  offline: number;
  dormant: number;
  byProductType: Record<string, number>;
}

export interface MerakiDevice {
  name: string;
  serial: string;
  mac: string;
  publicIp: string;
  networkId: string;
  status: string;
  productType: string;
  model: string;
}

export interface MerakiNetwork {
  id: string;
  name: string;
  productTypes: string[];
  timeZone: string;
  tags: string[];
}

export interface MerakiVpnPeer {
  networkName: string;
  status: string;
  vpnMode: string;
  reachablePeers: number;
  totalPeers: number;
}

export interface MerakiVpnSummary {
  totalTunnels: number;
  online: number;
  offline: number;
  peers: MerakiVpnPeer[];
}

export interface MerakiUplinkSummary {
  totalUplinks: number;
  active: number;
  failed: number;
  byInterface: Record<string, number>;
}

export interface MerakiLicensing {
  status: string;
  expirationDate: string;
  licensedDeviceCount: number;
}

export interface MerakiSummary {
  devices: MerakiDeviceSummary;
  deviceList: MerakiDevice[];
  networks: { total: number; byType: Record<string, number> };
  vpn: MerakiVpnSummary;
  uplinks: MerakiUplinkSummary;
  licensing: MerakiLicensing;
  fetchedAt: string;
  errors: string[];
}

// ── Raw API response shapes ──────────────────────────────────────────

interface DeviceStatusOverviewResponse {
  counts: {
    byStatus: { online?: number; alerting?: number; offline?: number; dormant?: number };
  };
}

interface RawDeviceStatus {
  name?: string;
  serial?: string;
  mac?: string;
  publicIp?: string;
  networkId?: string;
  status?: string;
  productType?: string;
  model?: string;
}

interface RawNetwork {
  id?: string;
  name?: string;
  productTypes?: string[];
  timeZone?: string;
  tags?: string[];
}

interface RawVpnStatus {
  networkId?: string;
  networkName?: string;
  deviceStatus?: string;
  vpnMode?: string;
  merakiVpnPeers?: Array<{ reachability?: string }>;
  thirdPartyVpnPeers?: Array<{ reachability?: string }>;
}

interface RawUplinkStatus {
  uplinks?: Array<{ interface?: string; status?: string }>;
}

interface RawLicenseOverview {
  status?: string;
  expirationDate?: string;
  licensedDeviceCounts?: Record<string, number>;
}

// ── Client ───────────────────────────────────────────────────────────

export class MerakiClient {
  private baseUrl: string;

  constructor(private env: Env) {
    this.baseUrl = env.MERAKI_BASE_URL || 'https://api.meraki.com/api/v1';
  }

  isConfigured(): boolean {
    return !!this.env.MERAKI_API_KEY;
  }

  private async request<T>(endpoint: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${this.env.MERAKI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        redirect: 'follow',
        signal: controller.signal,
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || '60';
        throw new Error(`Meraki rate limited. Retry after ${retryAfter}s`);
      }

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Meraki API ${response.status}: ${body.slice(0, 200)}`);
      }

      return response.json() as Promise<T>;
    } finally {
      clearTimeout(timeout);
    }
  }

  private getOrgId(): string {
    if (!this.env.MERAKI_ORG_ID) {
      throw new Error('MERAKI_ORG_ID not configured');
    }
    return this.env.MERAKI_ORG_ID;
  }

  // ── Individual API methods ──────────────────────────────────────────

  async getOrganizations(): Promise<Array<{ id: string; name: string; url: string }>> {
    return this.request('/organizations');
  }

  async getDeviceStatusOverview(): Promise<DeviceStatusOverviewResponse> {
    return this.request(`/organizations/${this.getOrgId()}/devices/statuses/overview`);
  }

  async getDeviceStatuses(): Promise<RawDeviceStatus[]> {
    return this.request(`/organizations/${this.getOrgId()}/devices/statuses?perPage=1000`);
  }

  async getNetworks(): Promise<RawNetwork[]> {
    return this.request(`/organizations/${this.getOrgId()}/networks`);
  }

  async getVpnStatuses(): Promise<RawVpnStatus[]> {
    return this.request(`/organizations/${this.getOrgId()}/appliance/vpn/statuses`);
  }

  async getUplinkStatuses(): Promise<RawUplinkStatus[]> {
    return this.request(`/organizations/${this.getOrgId()}/appliance/uplink/statuses`);
  }

  async getLicenseOverview(): Promise<RawLicenseOverview> {
    return this.request(`/organizations/${this.getOrgId()}/licenses/overview`);
  }

  // ── Aggregate summary ───────────────────────────────────────────────

  async getSummary(): Promise<MerakiSummary> {
    const errors: string[] = [];

    const [overviewR, devicesR, networksR, vpnR, uplinksR, licenseR] =
      await Promise.allSettled([
        this.getDeviceStatusOverview(),
        this.getDeviceStatuses(),
        this.getNetworks(),
        this.getVpnStatuses(),
        this.getUplinkStatuses(),
        this.getLicenseOverview(),
      ]);

    // Devices overview
    const overview = overviewR.status === 'fulfilled' ? overviewR.value : null;
    if (overviewR.status === 'rejected') errors.push(`DeviceOverview: ${overviewR.reason}`);

    const online = overview?.counts?.byStatus?.online ?? 0;
    const alerting = overview?.counts?.byStatus?.alerting ?? 0;
    const offline = overview?.counts?.byStatus?.offline ?? 0;
    const dormant = overview?.counts?.byStatus?.dormant ?? 0;

    // Device list + product type breakdown
    const rawDevices = devicesR.status === 'fulfilled' ? devicesR.value : [];
    if (devicesR.status === 'rejected') errors.push(`DeviceStatuses: ${devicesR.reason}`);

    const byProductType: Record<string, number> = {};
    const deviceList: MerakiDevice[] = rawDevices.map(d => {
      const pt = d.productType || 'unknown';
      byProductType[pt] = (byProductType[pt] ?? 0) + 1;
      return {
        name: d.name || d.serial || 'Unknown',
        serial: d.serial || '',
        mac: d.mac || '',
        publicIp: d.publicIp || '',
        networkId: d.networkId || '',
        status: d.status || 'unknown',
        productType: pt,
        model: d.model || '',
      };
    });

    // Networks
    const rawNetworks = networksR.status === 'fulfilled' ? networksR.value : [];
    if (networksR.status === 'rejected') errors.push(`Networks: ${networksR.reason}`);

    const byType: Record<string, number> = {};
    for (const net of rawNetworks) {
      for (const pt of net.productTypes || []) {
        byType[pt] = (byType[pt] ?? 0) + 1;
      }
    }

    // VPN
    const rawVpn = vpnR.status === 'fulfilled' ? vpnR.value : [];
    if (vpnR.status === 'rejected') errors.push(`VPN: ${vpnR.reason}`);

    let vpnOnline = 0;
    let vpnOffline = 0;
    const peers: MerakiVpnPeer[] = rawVpn.map(v => {
      const isOnline = v.deviceStatus === 'online';
      if (isOnline) vpnOnline++;
      else vpnOffline++;
      const allPeers = [...(v.merakiVpnPeers || []), ...(v.thirdPartyVpnPeers || [])];
      const reachable = allPeers.filter(p => p.reachability === 'reachable').length;
      return {
        networkName: v.networkName || v.networkId || 'Unknown',
        status: v.deviceStatus || 'unknown',
        vpnMode: v.vpnMode || 'unknown',
        reachablePeers: reachable,
        totalPeers: allPeers.length,
      };
    });

    // Uplinks
    const rawUplinks = uplinksR.status === 'fulfilled' ? uplinksR.value : [];
    if (uplinksR.status === 'rejected') errors.push(`Uplinks: ${uplinksR.reason}`);

    let uplinkActive = 0;
    let uplinkFailed = 0;
    const byInterface: Record<string, number> = {};
    for (const device of rawUplinks) {
      for (const ul of device.uplinks || []) {
        const iface = ul.interface || 'unknown';
        byInterface[iface] = (byInterface[iface] ?? 0) + 1;
        if (ul.status === 'active') uplinkActive++;
        else if (ul.status === 'failed') uplinkFailed++;
      }
    }
    const totalUplinks = Object.values(byInterface).reduce((a, b) => a + b, 0);

    // Licensing
    const rawLicense = licenseR.status === 'fulfilled' ? licenseR.value : null;
    if (licenseR.status === 'rejected') errors.push(`License: ${licenseR.reason}`);

    const licensedCount = rawLicense?.licensedDeviceCounts
      ? Object.values(rawLicense.licensedDeviceCounts).reduce((a, b) => a + b, 0)
      : 0;

    return {
      devices: {
        total: online + alerting + offline + dormant,
        online,
        alerting,
        offline,
        dormant,
        byProductType,
      },
      deviceList: deviceList.sort((a, b) => {
        const order: Record<string, number> = { alerting: 0, offline: 1, dormant: 2, online: 3 };
        return (order[a.status] ?? 4) - (order[b.status] ?? 4);
      }),
      networks: { total: rawNetworks.length, byType },
      vpn: { totalTunnels: rawVpn.length, online: vpnOnline, offline: vpnOffline, peers },
      uplinks: { totalUplinks, active: uplinkActive, failed: uplinkFailed, byInterface },
      licensing: {
        status: rawLicense?.status || 'unknown',
        expirationDate: rawLicense?.expirationDate || '',
        licensedDeviceCount: licensedCount,
      },
      fetchedAt: new Date().toISOString(),
      errors,
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const orgs = await this.getOrganizations();
      return {
        success: true,
        message: `Connected. Found ${orgs.length} organization(s): ${orgs.map(o => o.name).join(', ')}`,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to connect',
      };
    }
  }
}
