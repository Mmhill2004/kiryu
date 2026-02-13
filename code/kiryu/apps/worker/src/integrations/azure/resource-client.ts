import type { Env } from '../../types/env';

// ─── ARM API Response Types ────────────────────────────────────────────────

interface ArmToken {
  access_token: string;
  expires_in: number;
  expires_at: number;
}

interface RawVM {
  id: string;
  name: string;
  location: string;
  properties: {
    hardwareProfile: { vmSize: string };
    storageProfile: { osDisk: { osType: string } };
    networkProfile: { networkInterfaces: Array<{ id: string }> };
  };
}

interface RawVNet {
  id: string;
  name: string;
  location: string;
  properties: {
    addressSpace: { addressPrefixes: string[] };
    subnets: Array<{
      id: string;
      name: string;
      properties: {
        addressPrefix: string;
        networkSecurityGroup?: { id: string };
        routeTable?: { id: string };
      };
    }>;
    virtualNetworkPeerings?: Array<{
      name: string;
      properties: {
        peeringState: string;
        remoteVirtualNetwork: { id: string };
        allowForwardedTraffic?: boolean;
        allowGatewayTransit?: boolean;
      };
    }>;
  };
}

interface RawNIC {
  id: string;
  name: string;
  properties: {
    virtualMachine?: { id: string };
    networkSecurityGroup?: { id: string };
    ipConfigurations: Array<{
      properties: {
        subnet?: { id: string };
        publicIPAddress?: { id: string };
        privateIPAddress?: string;
      };
    }>;
  };
}

interface RawNSG {
  id: string;
  name: string;
  location: string;
  properties: {
    securityRules: Array<{
      name: string;
      properties: {
        direction: 'Inbound' | 'Outbound';
        access: 'Allow' | 'Deny';
        protocol: string;
        destinationPortRange?: string;
        destinationPortRanges?: string[];
        sourcePortRange?: string;
        sourceAddressPrefix?: string;
        destinationAddressPrefix?: string;
        priority: number;
      };
    }>;
    subnets?: Array<{ id: string }>;
    networkInterfaces?: Array<{ id: string }>;
  };
}

interface RawPublicIP {
  id: string;
  name: string;
  location: string;
  properties: {
    ipAddress?: string;
    publicIPAllocationMethod: 'Static' | 'Dynamic';
    ipConfiguration?: { id: string };
  };
}

interface RawLoadBalancer {
  id: string;
  name: string;
  location: string;
  properties: {
    frontendIPConfigurations: Array<{
      properties: {
        publicIPAddress?: { id: string };
        privateIPAddress?: string;
        subnet?: { id: string };
      };
    }>;
    backendAddressPools: Array<{
      name: string;
      properties: {
        backendIPConfigurations?: Array<{ id: string }>;
      };
    }>;
  };
}

interface RawRouteTable {
  id: string;
  name: string;
  location: string;
  properties: {
    routes: Array<{
      name: string;
      properties: {
        addressPrefix: string;
        nextHopType: string;
        nextHopIpAddress?: string;
      };
    }>;
    subnets?: Array<{ id: string }>;
  };
}

interface ArmPage<T> {
  value: T[];
  nextLink?: string;
}

// ─── Exported Types ────────────────────────────────────────────────────────

export interface AzureVM {
  id: string;
  name: string;
  resourceGroup: string;
  location: string;
  vmSize: string;
  osType: string;
  powerState: string;
  nicIds: string[];
  privateIP: string;
  publicIP: string | null;
  subnetId: string | null;
}

export interface AzureVNet {
  id: string;
  name: string;
  resourceGroup: string;
  location: string;
  addressPrefixes: string[];
  subnets: AzureSubnet[];
  peerings: AzurePeering[];
}

export interface AzureSubnet {
  id: string;
  name: string;
  addressPrefix: string;
  nsgId: string | null;
  routeTableId: string | null;
}

export interface AzurePeering {
  name: string;
  peeringState: string;
  remoteVNetId: string;
  allowForwarding: boolean;
  allowGatewayTransit: boolean;
}

export interface AzureNSG {
  id: string;
  name: string;
  resourceGroup: string;
  rules: NSGRule[];
}

export interface NSGRule {
  name: string;
  direction: 'Inbound' | 'Outbound';
  access: 'Allow' | 'Deny';
  protocol: string;
  portRange: string;
  priority: number;
}

export interface AzurePublicIP {
  id: string;
  name: string;
  ipAddress: string | null;
  allocationMethod: string;
}

export interface AzureLoadBalancer {
  id: string;
  name: string;
  location: string;
  frontendCount: number;
  backendPoolCount: number;
}

export interface AzureRouteTable {
  id: string;
  name: string;
  routeCount: number;
}

export interface AzureTopology {
  vnets: AzureVNet[];
  vms: AzureVM[];
  nsgs: AzureNSG[];
  publicIPs: AzurePublicIP[];
  loadBalancers: AzureLoadBalancer[];
  routeTables: AzureRouteTable[];
  subscriptionId: string;
  fetchedAt: string;
  errors: string[];
}

// ─── Resource Group Parser ────────────────────────────────────────────────

function parseResourceGroup(id: string): string {
  const match = id.match(/\/resourceGroups\/([^/]+)/i);
  return match?.[1] ?? 'unknown';
}

// ─── Client ───────────────────────────────────────────────────────────────

const ARM_SCOPE = 'https://management.azure.com/.default';
const ARM_BASE = 'https://management.azure.com';
const MAX_PAGES = 10;

export class AzureResourceClient {
  private token: ArmToken | null = null;
  private pendingAuth: Promise<string> | null = null;
  private kv: KVNamespace | null;

  constructor(private env: Env) {
    this.kv = env.CACHE || null;
  }

  isConfigured(): boolean {
    return !!(
      this.env.AZURE_TENANT_ID &&
      this.env.AZURE_CLIENT_ID &&
      this.env.AZURE_CLIENT_SECRET &&
      this.env.AZURE_SUBSCRIPTION_ID
    );
  }

  // ── Authentication (replicates MicrosoftClient pattern) ──────────────

  private async authenticate(): Promise<string> {
    if (this.token && this.token.expires_at > Date.now()) {
      return this.token.access_token;
    }

    if (this.pendingAuth) return this.pendingAuth;

    this.pendingAuth = this.authenticateInner();
    try {
      return await this.pendingAuth;
    } finally {
      this.pendingAuth = null;
    }
  }

  private async authenticateInner(): Promise<string> {
    const kvKey = 'auth:azure-arm:token';
    if (this.kv) {
      try {
        const kvRaw = await this.kv.get(kvKey, 'text');
        if (kvRaw) {
          const kvToken = JSON.parse(kvRaw) as ArmToken;
          if (kvToken.expires_at > Date.now()) {
            this.token = kvToken;
            return kvToken.access_token;
          }
        }
      } catch { /* KV miss, continue */ }
    }

    const tokenUrl = `https://login.microsoftonline.com/${this.env.AZURE_TENANT_ID}/oauth2/v2.0/token`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let response: Response;
    try {
      response = await fetch(tokenUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.env.AZURE_CLIENT_ID,
          client_secret: this.env.AZURE_CLIENT_SECRET,
          scope: ARM_SCOPE,
          grant_type: 'client_credentials',
        }),
      });
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Azure ARM authentication timeout (10s)');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Azure ARM auth failed: ${response.status} ${error.slice(0, 200)}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };

    const armToken: ArmToken = {
      access_token: data.access_token,
      expires_in: data.expires_in,
      expires_at: Date.now() + (data.expires_in * 1000) - 60000,
    };

    this.token = armToken;

    if (this.kv) {
      const kvTtl = Math.max(60, data.expires_in - 120);
      try {
        await this.kv.put(kvKey, JSON.stringify(armToken), { expirationTtl: kvTtl });
      } catch { /* non-fatal */ }
    }

    return armToken.access_token;
  }

  // ── ARM Request Helper ──────────────────────────────────────────────

  private async armRequest<T>(url: string): Promise<T> {
    const token = await this.authenticate();
    const fullUrl = url.startsWith('http') ? url : `${ARM_BASE}${url}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(fullUrl, {
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ARM API ${response.status}: ${error.slice(0, 200)}`);
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`ARM API timeout (20s): ${fullUrl.split('?')[0]}`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ── Paginated ARM List ──────────────────────────────────────────────

  private async paginateArm<T>(url: string): Promise<T[]> {
    const items: T[] = [];
    let nextUrl: string | undefined = url;

    for (let page = 0; page < MAX_PAGES; page++) {
      if (!nextUrl) break;
      const resp: ArmPage<T> = await this.armRequest<ArmPage<T>>(nextUrl);
      items.push(...(resp.value || []));
      nextUrl = resp.nextLink;
    }

    return items;
  }

  // ── Resource List Methods ───────────────────────────────────────────

  async listVirtualMachines(): Promise<AzureVM[]> {
    const subId = this.env.AZURE_SUBSCRIPTION_ID;

    // Fetch full VM properties and status-only views in parallel
    // ($expand=instanceView is not supported at subscription level — use statusOnly)
    interface StatusVM { id: string; properties?: { instanceView?: { statuses?: Array<{ code: string }> } } }
    const [rawVMs, statusVMs] = await Promise.all([
      this.paginateArm<RawVM>(
        `${ARM_BASE}/subscriptions/${subId}/providers/Microsoft.Compute/virtualMachines?api-version=2024-07-01`
      ),
      this.paginateArm<StatusVM>(
        `${ARM_BASE}/subscriptions/${subId}/providers/Microsoft.Compute/virtualMachines?api-version=2024-07-01&statusOnly=true`
      ),
    ]);

    // Build power state lookup from status-only response
    const powerStates = new Map<string, string>();
    for (const svm of statusVMs) {
      const code = svm.properties?.instanceView?.statuses?.find(s => s.code.startsWith('PowerState/'))?.code;
      if (code) powerStates.set(svm.id.toLowerCase(), code.replace('PowerState/', ''));
    }

    return rawVMs.map(vm => ({
      id: vm.id,
      name: vm.name,
      resourceGroup: parseResourceGroup(vm.id),
      location: vm.location,
      vmSize: vm.properties.hardwareProfile.vmSize,
      osType: vm.properties.storageProfile.osDisk.osType || 'Unknown',
      powerState: powerStates.get(vm.id.toLowerCase()) ?? 'unknown',
      nicIds: vm.properties.networkProfile.networkInterfaces.map(n => n.id.toLowerCase()),
      privateIP: '',
      publicIP: null,
      subnetId: null,
    }));
  }

  async listVirtualNetworks(): Promise<AzureVNet[]> {
    const subId = this.env.AZURE_SUBSCRIPTION_ID;
    const rawVNets = await this.paginateArm<RawVNet>(
      `${ARM_BASE}/subscriptions/${subId}/providers/Microsoft.Network/virtualNetworks?api-version=2023-11-01`
    );

    return rawVNets.map(vnet => ({
      id: vnet.id.toLowerCase(),
      name: vnet.name,
      resourceGroup: parseResourceGroup(vnet.id),
      location: vnet.location,
      addressPrefixes: vnet.properties.addressSpace.addressPrefixes,
      subnets: (vnet.properties.subnets || []).map(s => ({
        id: s.id.toLowerCase(),
        name: s.name,
        addressPrefix: s.properties.addressPrefix,
        nsgId: s.properties.networkSecurityGroup?.id.toLowerCase() ?? null,
        routeTableId: s.properties.routeTable?.id.toLowerCase() ?? null,
      })),
      peerings: (vnet.properties.virtualNetworkPeerings || []).map(p => ({
        name: p.name,
        peeringState: p.properties.peeringState,
        remoteVNetId: p.properties.remoteVirtualNetwork.id.toLowerCase(),
        allowForwarding: p.properties.allowForwardedTraffic ?? false,
        allowGatewayTransit: p.properties.allowGatewayTransit ?? false,
      })),
    }));
  }

  async listNetworkInterfaces(): Promise<RawNIC[]> {
    const subId = this.env.AZURE_SUBSCRIPTION_ID;
    return this.paginateArm<RawNIC>(
      `${ARM_BASE}/subscriptions/${subId}/providers/Microsoft.Network/networkInterfaces?api-version=2023-11-01`
    );
  }

  async listNetworkSecurityGroups(): Promise<AzureNSG[]> {
    const subId = this.env.AZURE_SUBSCRIPTION_ID;
    const rawNSGs = await this.paginateArm<RawNSG>(
      `${ARM_BASE}/subscriptions/${subId}/providers/Microsoft.Network/networkSecurityGroups?api-version=2023-11-01`
    );

    return rawNSGs.map(nsg => ({
      id: nsg.id.toLowerCase(),
      name: nsg.name,
      resourceGroup: parseResourceGroup(nsg.id),
      rules: (nsg.properties.securityRules || []).map(r => ({
        name: r.name,
        direction: r.properties.direction,
        access: r.properties.access,
        protocol: r.properties.protocol,
        portRange: r.properties.destinationPortRange
          || (r.properties.destinationPortRanges || []).join(', ')
          || '*',
        priority: r.properties.priority,
      })),
    }));
  }

  async listPublicIPAddresses(): Promise<AzurePublicIP[]> {
    const subId = this.env.AZURE_SUBSCRIPTION_ID;
    const rawIPs = await this.paginateArm<RawPublicIP>(
      `${ARM_BASE}/subscriptions/${subId}/providers/Microsoft.Network/publicIPAddresses?api-version=2023-11-01`
    );

    return rawIPs.map(ip => ({
      id: ip.id.toLowerCase(),
      name: ip.name,
      ipAddress: ip.properties.ipAddress ?? null,
      allocationMethod: ip.properties.publicIPAllocationMethod,
    }));
  }

  async listLoadBalancers(): Promise<AzureLoadBalancer[]> {
    const subId = this.env.AZURE_SUBSCRIPTION_ID;
    const rawLBs = await this.paginateArm<RawLoadBalancer>(
      `${ARM_BASE}/subscriptions/${subId}/providers/Microsoft.Network/loadBalancers?api-version=2023-11-01`
    );

    return rawLBs.map(lb => ({
      id: lb.id.toLowerCase(),
      name: lb.name,
      location: lb.location,
      frontendCount: lb.properties.frontendIPConfigurations.length,
      backendPoolCount: lb.properties.backendAddressPools.length,
    }));
  }

  async listRouteTables(): Promise<AzureRouteTable[]> {
    const subId = this.env.AZURE_SUBSCRIPTION_ID;
    const rawRTs = await this.paginateArm<RawRouteTable>(
      `${ARM_BASE}/subscriptions/${subId}/providers/Microsoft.Network/routeTables?api-version=2023-11-01`
    );

    return rawRTs.map(rt => ({
      id: rt.id.toLowerCase(),
      name: rt.name,
      routeCount: (rt.properties.routes || []).length,
    }));
  }

  // ── Full Topology Orchestrator ──────────────────────────────────────

  async getTopology(): Promise<AzureTopology> {
    const errors: string[] = [];

    function extract<T>(result: PromiseSettledResult<T>, fallback: T, label: string): T {
      if (result.status === 'fulfilled') return result.value;
      errors.push(`${label}: ${result.reason}`);
      console.warn(`Azure DC ${label} failed:`, result.reason);
      return fallback;
    }

    const [vmResult, vnetResult, nicResult, nsgResult, ipResult, lbResult, rtResult] =
      await Promise.allSettled([
        this.listVirtualMachines(),
        this.listVirtualNetworks(),
        this.listNetworkInterfaces(),
        this.listNetworkSecurityGroups(),
        this.listPublicIPAddresses(),
        this.listLoadBalancers(),
        this.listRouteTables(),
      ]);

    const vms = extract(vmResult, [], 'Virtual Machines');
    const vnets = extract(vnetResult, [], 'Virtual Networks');
    const nics = extract(nicResult, [], 'Network Interfaces');
    const nsgs = extract(nsgResult, [], 'NSGs');
    const publicIPs = extract(ipResult, [], 'Public IPs');
    const loadBalancers = extract(lbResult, [], 'Load Balancers');
    const routeTables = extract(rtResult, [], 'Route Tables');

    // Build public IP lookup: resource ID → IP address
    const publicIPMap = new Map<string, string>();
    for (const ip of publicIPs) {
      if (ip.ipAddress) {
        publicIPMap.set(ip.id, ip.ipAddress);
      }
    }

    // Enrich VMs with NIC data (private IP, public IP, subnet association)
    for (const nic of nics) {
      const nicId = nic.id.toLowerCase();
      const vm = vms.find(v => v.nicIds.includes(nicId));
      if (!vm) continue;

      for (const ipConfig of nic.properties.ipConfigurations) {
        if (ipConfig.properties.privateIPAddress && !vm.privateIP) {
          vm.privateIP = ipConfig.properties.privateIPAddress;
        }
        if (ipConfig.properties.subnet?.id && !vm.subnetId) {
          vm.subnetId = ipConfig.properties.subnet.id.toLowerCase();
        }
        if (ipConfig.properties.publicIPAddress?.id) {
          const pubAddr = publicIPMap.get(ipConfig.properties.publicIPAddress.id.toLowerCase());
          if (pubAddr) vm.publicIP = pubAddr;
        }
      }
    }

    return {
      vnets,
      vms,
      nsgs,
      publicIPs,
      loadBalancers,
      routeTables,
      subscriptionId: this.env.AZURE_SUBSCRIPTION_ID ?? '',
      fetchedAt: new Date().toISOString(),
      errors,
    };
  }
}
