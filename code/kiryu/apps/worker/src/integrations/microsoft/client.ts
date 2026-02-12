import type { Env } from '../../types/env';

// ─── Raw API Types ──────────────────────────────────────────────────────────

export interface MicrosoftToken {
  access_token: string;
  expires_in: number;
  expires_at: number;
}

export interface SecurityAlert {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  createdDateTime: string;
  resolvedDateTime?: string;
  firstActivityDateTime?: string;
  category: string;
  classification?: string;
  assignedTo?: string;
  vendorInformation: {
    provider: string;
    vendor: string;
  };
  mitreTechniques?: string[];
}

export interface SecureScore {
  currentScore: number;
  maxScore: number;
  averageComparativeScores: Array<{
    basis: string;
    averageScore: number;
  }>;
}

export interface DefenderAlert {
  id: string;
  incidentId: string;
  title: string;
  severity: string;
  status: string;
  classification: string;
  category?: string;
  detectionSource?: string;
  createdDateTime: string;
  alertCreationTime?: string;
  resolvedTime?: string;
}

export interface RiskyUser {
  id: string;
  userDisplayName: string;
  userPrincipalName: string;
  riskLevel: string;
  riskState: string;
  riskLastUpdatedDateTime: string;
}

export interface MicrosoftIncident {
  id: string;
  displayName: string;
  severity: string;
  status: string;
  classification?: string;
  determination?: string;
  assignedTo?: string;
  createdDateTime: string;
  lastUpdateDateTime: string;
}

export interface DefenderMachine {
  id: string;
  computerDnsName: string;
  osPlatform: string;
  healthStatus: string;
  riskScore: string;
  exposureLevel: string;
  onboardingStatus: string;
  lastSeen: string;
  defenderAvStatus?: string;
}

// ─── Pre-Computed Analytics Types ───────────────────────────────────────────

export interface AlertAnalytics {
  total: number;
  active: number;
  bySeverity: { high: number; medium: number; low: number; informational: number };
  byStatus: { new: number; inProgress: number; resolved: number; unknown: number };
  byCategory: Record<string, number>;
  byProvider: Record<string, number>;
  byClassification: Record<string, number>;
  newToday: number;
  unassigned: number;
  recentAlerts: SecurityAlert[];
}

export interface DefenderAnalytics {
  total: number;
  active: number;
  bySeverity: { high: number; medium: number; low: number; informational: number };
  byStatus: { new: number; inProgress: number; resolved: number; unknown: number };
  byCategory: Record<string, number>;
  byClassification: Record<string, number>;
  byDetectionSource: Record<string, number>;
  linkedToIncidents: number;
  recentAlerts: DefenderAlert[];
}

export interface IdentityRiskSummary {
  riskyUsers: {
    total: number;
    byRiskLevel: { high: number; medium: number; low: number; hidden: number; none: number };
    byRiskState: { atRisk: number; confirmedCompromised: number; remediated: number; dismissed: number };
    unresolvedCount: number;
    recentUsers: RiskyUser[];
  };
}

export interface IncidentAnalytics {
  total: number;
  open: number;
  bySeverity: { high: number; medium: number; low: number; informational: number };
  byStatus: Record<string, number>;
  byClassification: Record<string, number>;
  byDetermination: Record<string, number>;
  redirected: number;
  unassigned: number;
  recentIncidents: MicrosoftIncident[];
}

export interface MachineAnalytics {
  total: number;
  byHealthStatus: Record<string, number>;
  byRiskScore: { high: number; medium: number; low: number; none: number; informational: number };
  byExposureLevel: { high: number; medium: number; low: number; none: number };
  byOsPlatform: Record<string, number>;
  onboarded: number;
  stale: number;
}

export interface AssessmentAnalytics {
  total: number;
  healthy: number;
  unhealthy: number;
  notApplicable: number;
  passRate: number;
  bySeverity: { high: number; medium: number; low: number };
}

export interface DeviceCompliance {
  compliant: number;
  nonCompliant: number;
  unknown: number;
}

// ─── Intune Types ──────────────────────────────────────────────────────────

export interface IntuneManagedDevice {
  id: string;
  deviceName: string;
  operatingSystem: string;
  osVersion: string;
  complianceState: string;
  lastSyncDateTime: string;
  userDisplayName: string;
  userPrincipalName: string;
  serialNumber: string;
  managedDeviceOwnerType: string;
  isEncrypted: boolean;
  isSupervised: boolean;
  jailBroken: string;
  managementState: string;
  managementAgent: string;
  enrolledDateTime: string;
  model: string;
  manufacturer: string;
}

export interface IntuneCompliancePolicy {
  id: string;
  displayName: string;
}

export interface IntuneDeviceOverview {
  pendingCount: number;
  notApplicableCount: number;
  successCount: number;
  errorCount: number;
  failedCount: number;
  conflictCount: number;
}

export interface IntuneDetectedApp {
  id: string;
  displayName: string;
  version: string;
  sizeInByte: number;
  deviceCount: number;
  publisher: string;
  platform: string;
}

export interface IntuneDeviceAnalytics {
  total: number;
  byComplianceState: Record<string, number>;
  byOS: Record<string, number>;
  byManagementState: Record<string, number>;
  byManagementAgent: Record<string, number>;
  stale: number;
  encrypted: number;
  recentEnrollments: number;
}

export interface IntunePolicyAnalytics {
  total: number;
  policies: Array<{
    id: string;
    name: string;
    success: number;
    failed: number;
    error: number;
    pending: number;
    conflict: number;
    notApplicable: number;
    passRate: number;
  }>;
}

export interface IntuneAppAnalytics {
  total: number;
  apps: Array<{
    name: string;
    publisher: string;
    deviceCount: number;
    platform: string;
    sizeInByte: number;
  }>;
}

export interface IntuneSummary {
  devices: IntuneDeviceAnalytics;
  policies: IntunePolicyAnalytics;
  apps: IntuneAppAnalytics;
}

// ─── Intune Detailed Types (for /intune page) ──────────────────────────────

/** Beta device with hardware info (includes lastRebootDateTime) */
export interface IntuneManagedDeviceBeta extends IntuneManagedDevice {
  hardwareInformation?: {
    lastRebootDateTime?: string;
    totalStorageSpace?: number;
    freeStorageSpace?: number;
  };
}

/** Compliance policy summary from deviceCompliancePolicyDeviceStateSummary */
export interface IntuneCompliancePolicySummary {
  compliantDeviceCount: number;
  nonCompliantDeviceCount: number;
  errorDeviceCount: number;
  conflictDeviceCount: number;
  unknownDeviceCount: number;
  notApplicableDeviceCount: number;
}

/** Individual compliance policy with description */
export interface IntuneCompliancePolicyDetail {
  id: string;
  displayName: string;
  description: string;
  lastModifiedDateTime: string;
}

/** OS version grouping for currency analysis */
export interface OSVersionGroup {
  version: string;
  count: number;
  percentage: number;
}

/** Full detailed Intune summary for the dedicated /intune page */
export interface IntuneDetailedSummary {
  totalDevices: number;
  devicesByOS: { windows: number; ios: number; macos: number; android: number; other: number };
  ownership: { corporate: number; personal: number; unknown: number };
  complianceSummary: IntuneCompliancePolicySummary;
  complianceRate: number;
  policies: Array<IntuneCompliancePolicyDetail & {
    compliant: number;
    nonCompliant: number;
    error: number;
    total: number;
  }>;
  osVersions: {
    windows: OSVersionGroup[];
    ios: OSVersionGroup[];
    macos: OSVersionGroup[];
    android: OSVersionGroup[];
  };
  encryption: { encrypted: number; notEncrypted: number; unknown: number; rate: number };
  supervised: { supervised: number; unsupervised: number; rate: number };
  jailbroken: {
    compromised: number;
    clean: number;
    unknown: number;
    devices: IntuneManagedDevice[];
  };
  staleDevices: IntuneManagedDevice[];
  staleCount: number;
  rebootNeeded: IntuneManagedDeviceBeta[];
  rebootNeededCount: number;
  enrolledLast7Days: number;
  enrolledLast30Days: number;
  nonCompliantDevices: IntuneManagedDevice[];
  fetchedAt: string;
  errors: string[];
}

// ─── Full Summary ───────────────────────────────────────────────────────────

export interface MicrosoftFullSummary {
  alertAnalytics: AlertAnalytics;
  secureScore: SecureScore | null;
  defenderAnalytics: DefenderAnalytics;
  assessments: AssessmentAnalytics;
  compliance: DeviceCompliance;
  identity: IdentityRiskSummary;
  incidents: IncidentAnalytics;
  machines: MachineAnalytics;
  intune: IntuneSummary | null;
  errors: string[];
  fetchedAt: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function countBy<T>(items: T[], keyFn: (item: T) => string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item) || 'unknown';
    result[key] = (result[key] || 0) + 1;
  }
  return result;
}

function sevBucket(sev: string | undefined): 'high' | 'medium' | 'low' | 'informational' {
  switch (sev?.toLowerCase()) {
    case 'high': return 'high';
    case 'medium': return 'medium';
    case 'low': return 'low';
    default: return 'informational';
  }
}

const EMPTY_ALERT_ANALYTICS: AlertAnalytics = {
  total: 0, active: 0,
  bySeverity: { high: 0, medium: 0, low: 0, informational: 0 },
  byStatus: { new: 0, inProgress: 0, resolved: 0, unknown: 0 },
  byCategory: {}, byProvider: {}, byClassification: {},
  newToday: 0, unassigned: 0, recentAlerts: [],
};

const EMPTY_DEFENDER_ANALYTICS: DefenderAnalytics = {
  total: 0, active: 0,
  bySeverity: { high: 0, medium: 0, low: 0, informational: 0 },
  byStatus: { new: 0, inProgress: 0, resolved: 0, unknown: 0 },
  byCategory: {}, byClassification: {}, byDetectionSource: {},
  linkedToIncidents: 0, recentAlerts: [],
};

const EMPTY_IDENTITY: IdentityRiskSummary = {
  riskyUsers: {
    total: 0,
    byRiskLevel: { high: 0, medium: 0, low: 0, hidden: 0, none: 0 },
    byRiskState: { atRisk: 0, confirmedCompromised: 0, remediated: 0, dismissed: 0 },
    unresolvedCount: 0,
    recentUsers: [],
  },
};

const EMPTY_INCIDENTS: IncidentAnalytics = {
  total: 0, open: 0,
  bySeverity: { high: 0, medium: 0, low: 0, informational: 0 },
  byStatus: {}, byClassification: {}, byDetermination: {},
  redirected: 0, unassigned: 0, recentIncidents: [],
};

const EMPTY_MACHINES: MachineAnalytics = {
  total: 0,
  byHealthStatus: {},
  byRiskScore: { high: 0, medium: 0, low: 0, none: 0, informational: 0 },
  byExposureLevel: { high: 0, medium: 0, low: 0, none: 0 },
  byOsPlatform: {},
  onboarded: 0, stale: 0,
};

const EMPTY_ASSESSMENTS: AssessmentAnalytics = {
  total: 0, healthy: 0, unhealthy: 0, notApplicable: 0, passRate: 0,
  bySeverity: { high: 0, medium: 0, low: 0 },
};

const EMPTY_INTUNE: IntuneSummary = {
  devices: {
    total: 0, byComplianceState: {}, byOS: {}, byManagementState: {},
    byManagementAgent: {}, stale: 0, encrypted: 0, recentEnrollments: 0,
  },
  policies: { total: 0, policies: [] },
  apps: { total: 0, apps: [] },
};

// ─── Client ─────────────────────────────────────────────────────────────────

export class MicrosoftClient {
  private graphUrl = 'https://graph.microsoft.com/v1.0';
  private betaUrl = 'https://graph.microsoft.com/beta';
  private securityUrl = 'https://api.securitycenter.microsoft.com/api';
  private tokens: Map<string, MicrosoftToken> = new Map();
  private pendingAuth: Map<string, Promise<string>> = new Map();
  private kv: KVNamespace | null;

  constructor(private env: Env) {
    this.kv = env.CACHE || null;
  }

  isConfigured(): boolean {
    return !!(this.env.AZURE_TENANT_ID && this.env.AZURE_CLIENT_ID && this.env.AZURE_CLIENT_SECRET);
  }

  private async authenticate(scope = 'https://graph.microsoft.com/.default'): Promise<string> {
    // 1. Check in-memory cache
    const cached = this.tokens.get(scope);
    if (cached && cached.expires_at > Date.now()) {
      return cached.access_token;
    }

    // 2. Deduplicate concurrent auth calls for the same scope
    const pending = this.pendingAuth.get(scope);
    if (pending) return pending;

    const authPromise = this.authenticateInner(scope);
    this.pendingAuth.set(scope, authPromise);
    try {
      return await authPromise;
    } finally {
      this.pendingAuth.delete(scope);
    }
  }

  private async authenticateInner(scope: string): Promise<string> {
    // 3. Check KV cache
    const kvKey = `auth:ms:token:${scope.replace(/[^a-zA-Z]/g, '_')}`;
    if (this.kv) {
      try {
        const kvRaw = await this.kv.get(kvKey, 'text');
        if (kvRaw) {
          const kvToken = JSON.parse(kvRaw) as MicrosoftToken;
          if (kvToken.expires_at > Date.now()) {
            this.tokens.set(scope, kvToken);
            return kvToken.access_token;
          }
        }
      } catch { /* KV miss, continue to fetch */ }
    }

    // 4. Fetch fresh token
    const tokenUrl = `https://login.microsoftonline.com/${this.env.AZURE_TENANT_ID}/oauth2/v2.0/token`;

    const authController = new AbortController();
    const authTimeout = setTimeout(() => authController.abort(), 10000);

    let response: Response;
    try {
      response = await fetch(tokenUrl, {
        method: 'POST',
        signal: authController.signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.env.AZURE_CLIENT_ID,
          client_secret: this.env.AZURE_CLIENT_SECRET,
          scope,
          grant_type: 'client_credentials',
        }),
      });
    } catch (error) {
      clearTimeout(authTimeout);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Microsoft authentication timeout (10s) for scope ${scope}`);
      }
      throw error;
    } finally {
      clearTimeout(authTimeout);
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Microsoft authentication failed for scope ${scope}: ${error}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };

    const token: MicrosoftToken = {
      access_token: data.access_token,
      expires_in: data.expires_in,
      expires_at: Date.now() + (data.expires_in * 1000) - 60000,
    };

    // Cache in memory
    this.tokens.set(scope, token);

    // Cache in KV (TTL = token lifetime minus 2 min buffer)
    if (this.kv) {
      const kvTtl = Math.max(60, data.expires_in - 120);
      try {
        await this.kv.put(kvKey, JSON.stringify(token), { expirationTtl: kvTtl });
      } catch { /* non-fatal */ }
    }

    return token.access_token;
  }

  private async graphRequest<T>(endpoint: string): Promise<T> {
    const token = await this.authenticate();
    const url = `${this.graphUrl}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Graph API ${response.status} (${endpoint.split('?')[0]}): ${error.slice(0, 200)}`);
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Graph API timeout (20s): ${endpoint.split('?')[0]}`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async securityRequest<T>(endpoint: string): Promise<T> {
    const token = await this.authenticate('https://api.securitycenter.microsoft.com/.default');
    const url = `${this.securityUrl}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Defender API ${response.status} (${endpoint.split('?')[0]}): ${error.slice(0, 200)}`);
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Defender API timeout (20s): ${endpoint.split('?')[0]}`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async betaRequest<T>(endpoint: string): Promise<T> {
    const token = await this.authenticate();
    const url = endpoint.startsWith('http') ? endpoint : `${this.betaUrl}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Graph Beta API ${response.status} (${endpoint.split('?')[0]}): ${error.slice(0, 200)}`);
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Graph Beta API timeout (20s): ${endpoint.split('?')[0]}`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /** Page through an OData collection, following @odata.nextLink */
  private async paginateGraph<T>(
    firstEndpoint: string,
    requester: (endpoint: string) => Promise<{ value: T[]; '@odata.nextLink'?: string }>,
    maxPages = 10
  ): Promise<T[]> {
    const items: T[] = [];
    let endpoint: string | undefined = firstEndpoint;

    for (let page = 0; page < maxPages; page++) {
      if (!endpoint) break;
      const resp = await requester(endpoint);
      items.push(...(resp.value || []));
      const rawNext = resp['@odata.nextLink'];
      // nextLink is a full URL — strip the base if it matches our graphUrl or betaUrl
      if (rawNext) {
        endpoint = rawNext.startsWith('http') ? rawNext : undefined;
      } else {
        endpoint = undefined;
      }
    }

    return items;
  }

  // ─── Phase 1: Enriched existing methods ─────────────────────────────────

  async getAlertAnalytics(): Promise<AlertAnalytics> {
    const response = await this.graphRequest<{ value: SecurityAlert[] }>(
      '/security/alerts_v2?$top=100&$orderby=createdDateTime desc'
    );
    const alerts = response.value || [];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const sev = { high: 0, medium: 0, low: 0, informational: 0 };
    const status = { new: 0, inProgress: 0, resolved: 0, unknown: 0 };
    let active = 0;
    let newToday = 0;
    let unassigned = 0;

    for (const a of alerts) {
      sev[sevBucket(a.severity)]++;
      const s = a.status?.toLowerCase();
      if (s === 'new') status.new++;
      else if (s === 'inprogress' || s === 'in_progress') status.inProgress++;
      else if (s === 'resolved') status.resolved++;
      else status.unknown++;

      if (s !== 'resolved') active++;
      if (new Date(a.createdDateTime) >= todayStart) newToday++;
      if (!a.assignedTo) unassigned++;
    }

    return {
      total: alerts.length,
      active,
      bySeverity: sev,
      byStatus: status,
      byCategory: countBy(alerts, a => a.category),
      byProvider: countBy(alerts, a => a.vendorInformation?.provider),
      byClassification: countBy(alerts, a => a.classification || 'unclassified'),
      newToday,
      unassigned,
      recentAlerts: alerts.slice(0, 20),
    };
  }

  async getSecureScore(): Promise<SecureScore | null> {
    const response = await this.graphRequest<{ value: SecureScore[] }>(
      '/security/secureScores?$top=1'
    );
    return response.value?.[0] || null;
  }

  async getDefenderAnalytics(): Promise<DefenderAnalytics> {
    const response = await this.securityRequest<{ value: DefenderAlert[] }>(
      '/alerts?$top=100&$orderby=alertCreationTime desc'
    );
    const alerts = response.value || [];

    const sev = { high: 0, medium: 0, low: 0, informational: 0 };
    const status = { new: 0, inProgress: 0, resolved: 0, unknown: 0 };
    let active = 0;
    let linkedToIncidents = 0;

    for (const a of alerts) {
      sev[sevBucket(a.severity)]++;
      const s = a.status?.toLowerCase();
      if (s === 'new') status.new++;
      else if (s === 'inprogress' || s === 'in_progress') status.inProgress++;
      else if (s === 'resolved') status.resolved++;
      else status.unknown++;

      if (s !== 'resolved') active++;
      if (a.incidentId) linkedToIncidents++;
    }

    return {
      total: alerts.length,
      active,
      bySeverity: sev,
      byStatus: status,
      byCategory: countBy(alerts, a => a.category || 'unknown'),
      byClassification: countBy(alerts, a => a.classification || 'unclassified'),
      byDetectionSource: countBy(alerts, a => a.detectionSource || 'unknown'),
      linkedToIncidents,
      recentAlerts: alerts.slice(0, 20),
    };
  }

  async getAssessmentAnalytics(): Promise<AssessmentAnalytics> {
    const token = await this.authenticate('https://management.azure.com/.default');
    const baseUrl = this.env.AZURE_SUBSCRIPTION_ID
      ? `https://management.azure.com/subscriptions/${this.env.AZURE_SUBSCRIPTION_ID}/providers/Microsoft.Security/assessments?api-version=2021-06-01`
      : 'https://management.azure.com/providers/Microsoft.Security/assessments?api-version=2021-06-01';

    const azureController = new AbortController();
    const azureTimeout = setTimeout(() => azureController.abort(), 20000);

    let response: Response;
    try {
      response = await fetch(baseUrl, {
        signal: azureController.signal,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      clearTimeout(azureTimeout);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Azure Management API timeout (20s)');
      }
      throw error;
    } finally {
      clearTimeout(azureTimeout);
    }

    if (!response.ok) {
      throw new Error(`Azure API error: ${response.status}`);
    }

    const data = await response.json() as { value: Array<{
      id: string;
      name: string;
      properties: { status: { code: string }; metadata: { severity: string } };
    }> };

    const items = data.value || [];
    let healthy = 0;
    let unhealthy = 0;
    let notApplicable = 0;
    const bySev = { high: 0, medium: 0, low: 0 };

    for (const r of items) {
      const code = r.properties?.status?.code?.toLowerCase();
      if (code === 'healthy') healthy++;
      else if (code === 'unhealthy') unhealthy++;
      else notApplicable++;

      const sev = r.properties?.metadata?.severity?.toLowerCase();
      if (sev === 'high') bySev.high++;
      else if (sev === 'medium') bySev.medium++;
      else if (sev === 'low') bySev.low++;
    }

    const denominator = healthy + unhealthy;
    return {
      total: items.length,
      healthy,
      unhealthy,
      notApplicable,
      passRate: denominator > 0 ? Math.round((healthy / denominator) * 100) : 0,
      bySeverity: bySev,
    };
  }

  async getDeviceCompliance(): Promise<DeviceCompliance> {
    const response = await this.graphRequest<{ value: Array<{ complianceState: string }> }>(
      '/deviceManagement/managedDevices?$select=complianceState'
    );
    const devices = response.value || [];
    return {
      compliant: devices.filter(d => d.complianceState === 'compliant').length,
      nonCompliant: devices.filter(d => d.complianceState === 'noncompliant').length,
      unknown: devices.filter(d => !['compliant', 'noncompliant'].includes(d.complianceState)).length,
    };
  }

  // ─── Phase 2: New high-value methods ────────────────────────────────────

  async getIdentityRisk(): Promise<IdentityRiskSummary> {
    const response = await this.graphRequest<{ value: RiskyUser[] }>(
      '/identityProtection/riskyUsers?$top=100&$orderby=riskLastUpdatedDateTime desc'
    );
    const users = response.value || [];

    const byLevel = { high: 0, medium: 0, low: 0, hidden: 0, none: 0 };
    const byState = { atRisk: 0, confirmedCompromised: 0, remediated: 0, dismissed: 0 };
    let unresolved = 0;

    for (const u of users) {
      const level = u.riskLevel?.toLowerCase() as keyof typeof byLevel;
      if (level in byLevel) byLevel[level]++;

      const state = u.riskState as keyof typeof byState;
      if (state in byState) byState[state]++;

      if (u.riskState === 'atRisk' || u.riskState === 'confirmedCompromised') {
        unresolved++;
      }
    }

    return {
      riskyUsers: {
        total: users.length,
        byRiskLevel: byLevel,
        byRiskState: byState,
        unresolvedCount: unresolved,
        recentUsers: users.slice(0, 10),
      },
    };
  }

  async getIncidentAnalytics(): Promise<IncidentAnalytics> {
    const response = await this.graphRequest<{ value: MicrosoftIncident[] }>(
      '/security/incidents?$top=50&$orderby=createdDateTime desc'
    );
    const incidents = response.value || [];

    const sev = { high: 0, medium: 0, low: 0, informational: 0 };
    let open = 0;
    let redirected = 0;
    let unassigned = 0;

    for (const inc of incidents) {
      sev[sevBucket(inc.severity)]++;
      const s = inc.status?.toLowerCase();
      if (s !== 'resolved' && s !== 'redirected') open++;
      if (s === 'redirected') redirected++;
      if (!inc.assignedTo) unassigned++;
    }

    return {
      total: incidents.length,
      open,
      bySeverity: sev,
      byStatus: countBy(incidents, i => i.status),
      byClassification: countBy(incidents, i => i.classification || 'unclassified'),
      byDetermination: countBy(incidents, i => i.determination || 'unknown'),
      redirected,
      unassigned,
      recentIncidents: incidents.slice(0, 10),
    };
  }

  async getMachineAnalytics(): Promise<MachineAnalytics> {
    const response = await this.securityRequest<{ value: DefenderMachine[] }>(
      '/machines?$top=500'
    );
    const machines = response.value || [];

    const risk = { high: 0, medium: 0, low: 0, none: 0, informational: 0 };
    const exposure = { high: 0, medium: 0, low: 0, none: 0 };
    let onboarded = 0;
    let stale = 0;
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    for (const m of machines) {
      const r = m.riskScore?.toLowerCase() as keyof typeof risk;
      if (r in risk) risk[r]++;

      const e = m.exposureLevel?.toLowerCase() as keyof typeof exposure;
      if (e in exposure) exposure[e]++;

      if (m.onboardingStatus?.toLowerCase() === 'onboarded') onboarded++;
      if (m.lastSeen && new Date(m.lastSeen).getTime() < sevenDaysAgo) stale++;
    }

    return {
      total: machines.length,
      byHealthStatus: countBy(machines, m => m.healthStatus),
      byRiskScore: risk,
      byExposureLevel: exposure,
      byOsPlatform: countBy(machines, m => m.osPlatform),
      onboarded,
      stale,
    };
  }

  // ─── Phase 3: Intune methods ──────────────────────────────────────────────

  async getIntuneDeviceAnalytics(): Promise<IntuneDeviceAnalytics> {
    const allDevices: IntuneManagedDevice[] = [];
    const maxPages = 10;
    let endpoint: string | undefined = '/deviceManagement/managedDevices?$select=id,deviceName,operatingSystem,osVersion,complianceState,lastSyncDateTime,userDisplayName,userPrincipalName,serialNumber,managedDeviceOwnerType,isEncrypted,isSupervised,jailBroken,managementState,managementAgent,enrolledDateTime,model,manufacturer&$top=1000';

    for (let page = 0; page < maxPages; page++) {
      if (!endpoint) break;
      const resp: { value: IntuneManagedDevice[]; '@odata.nextLink'?: string } = await this.graphRequest(endpoint);
      allDevices.push(...(resp.value || []));
      const rawNext = resp['@odata.nextLink'];
      endpoint = rawNext ? rawNext.replace(this.graphUrl, '') : undefined;
    }

    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    let stale = 0;
    let encrypted = 0;
    let recentEnrollments = 0;

    for (const d of allDevices) {
      if (d.lastSyncDateTime && new Date(d.lastSyncDateTime).getTime() < sevenDaysAgo) stale++;
      if (d.isEncrypted) encrypted++;
      if (d.enrolledDateTime && new Date(d.enrolledDateTime).getTime() > thirtyDaysAgo) recentEnrollments++;
    }

    return {
      total: allDevices.length,
      byComplianceState: countBy(allDevices, d => d.complianceState || 'unknown'),
      byOS: countBy(allDevices, d => d.operatingSystem || 'unknown'),
      byManagementState: countBy(allDevices, d => d.managementState || 'unknown'),
      byManagementAgent: countBy(allDevices, d => d.managementAgent || 'unknown'),
      stale,
      encrypted,
      recentEnrollments,
    };
  }

  async getIntunePolicyAnalytics(): Promise<IntunePolicyAnalytics> {
    const policiesResp = await this.graphRequest<{ value: IntuneCompliancePolicy[] }>(
      '/deviceManagement/deviceCompliancePolicies?$top=50'
    );
    const policies = policiesResp.value || [];
    const maxPolicies = 20;
    const toFetch = policies.slice(0, maxPolicies);

    const overviewResults = await Promise.allSettled(
      toFetch.map(p =>
        this.graphRequest<IntuneDeviceOverview>(
          `/deviceManagement/deviceCompliancePolicies/${p.id}/deviceStatusOverview`
        )
      )
    );

    const policyAnalytics = toFetch.map((p, i) => {
      const result = overviewResults[i];
      if (!result || result.status !== 'fulfilled') {
        return { id: p.id, name: p.displayName, success: 0, failed: 0, error: 0, pending: 0, conflict: 0, notApplicable: 0, passRate: 0 };
      }
      const ov = result.value;
      const total = ov.successCount + ov.failedCount + ov.errorCount;
      const passRate = total > 0 ? Math.round((ov.successCount / total) * 100) : 0;
      return {
        id: p.id,
        name: p.displayName,
        success: ov.successCount,
        failed: ov.failedCount,
        error: ov.errorCount,
        pending: ov.pendingCount,
        conflict: ov.conflictCount,
        notApplicable: ov.notApplicableCount,
        passRate,
      };
    });

    return { total: policies.length, policies: policyAnalytics };
  }

  async getIntuneDetectedApps(): Promise<IntuneAppAnalytics> {
    const response = await this.graphRequest<{ value: IntuneDetectedApp[]; '@odata.count'?: number }>(
      '/deviceManagement/detectedApps?$top=50&$orderby=deviceCount desc'
    );
    const apps = (response.value || []).slice(0, 30).map(a => ({
      name: a.displayName,
      publisher: a.publisher || 'Unknown',
      deviceCount: a.deviceCount,
      platform: a.platform || 'unknown',
      sizeInByte: a.sizeInByte || 0,
    }));

    return { total: response.value?.length ?? 0, apps };
  }

  async getIntuneSummary(): Promise<IntuneSummary> {
    const [devicesResult, policiesResult, appsResult] = await Promise.allSettled([
      this.getIntuneDeviceAnalytics(),
      this.getIntunePolicyAnalytics(),
      this.getIntuneDetectedApps(),
    ]);

    return {
      devices: devicesResult.status === 'fulfilled' ? devicesResult.value : EMPTY_INTUNE.devices,
      policies: policiesResult.status === 'fulfilled' ? policiesResult.value : EMPTY_INTUNE.policies,
      apps: appsResult.status === 'fulfilled' ? appsResult.value : EMPTY_INTUNE.apps,
    };
  }

  // ─── Phase 4: Detailed Intune methods (for /intune page) ────────────────

  /** Fetch all managed devices via v1.0 API with full field set */
  async getManagedDevices(): Promise<IntuneManagedDevice[]> {
    const select = [
      'id', 'deviceName', 'operatingSystem', 'osVersion',
      'complianceState', 'lastSyncDateTime', 'userDisplayName',
      'userPrincipalName', 'serialNumber', 'model', 'manufacturer',
      'managedDeviceOwnerType', 'enrolledDateTime', 'isEncrypted',
      'isSupervised', 'jailBroken', 'managementAgent', 'managementState',
    ].join(',');

    return this.paginateGraph<IntuneManagedDevice>(
      `/deviceManagement/managedDevices?$select=${select}&$top=999`,
      (url) => this.graphRequest(url)
    );
  }

  /** Fetch all managed devices via beta API (includes hardwareInformation.lastRebootDateTime) */
  async getManagedDevicesBeta(): Promise<IntuneManagedDeviceBeta[]> {
    const select = [
      'id', 'deviceName', 'operatingSystem', 'osVersion',
      'complianceState', 'lastSyncDateTime', 'userDisplayName',
      'userPrincipalName', 'serialNumber', 'model', 'manufacturer',
      'managedDeviceOwnerType', 'enrolledDateTime', 'isEncrypted',
      'isSupervised', 'jailBroken', 'managementAgent', 'managementState',
      'hardwareInformation',
    ].join(',');

    return this.paginateGraph<IntuneManagedDeviceBeta>(
      `/deviceManagement/managedDevices?$select=${select}&$top=999`,
      (url) => this.betaRequest(url)
    );
  }

  /** Get aggregate compliance counts from deviceCompliancePolicyDeviceStateSummary */
  async getCompliancePolicySummary(): Promise<IntuneCompliancePolicySummary> {
    try {
      return await this.graphRequest<IntuneCompliancePolicySummary>(
        '/deviceManagement/deviceCompliancePolicyDeviceStateSummary'
      );
    } catch (error) {
      console.warn('Failed to get compliance summary:', error);
      return {
        compliantDeviceCount: 0, nonCompliantDeviceCount: 0,
        errorDeviceCount: 0, conflictDeviceCount: 0,
        unknownDeviceCount: 0, notApplicableDeviceCount: 0,
      };
    }
  }

  /** Get individual compliance policies with description */
  async getCompliancePolicies(): Promise<IntuneCompliancePolicyDetail[]> {
    try {
      const response = await this.graphRequest<{ value: IntuneCompliancePolicyDetail[] }>(
        '/deviceManagement/deviceCompliancePolicies?$select=id,displayName,description,lastModifiedDateTime'
      );
      return response.value || [];
    } catch (error) {
      console.warn('Failed to get compliance policies:', error);
      return [];
    }
  }

  /** Get per-policy device status overview */
  async getPolicyDeviceStatusSummary(policyId: string): Promise<{
    compliant: number; nonCompliant: number; error: number;
    conflict: number; notApplicable: number;
  }> {
    try {
      const response = await this.graphRequest<{
        compliantDeviceCount: number; nonCompliantDeviceCount: number;
        errorDeviceCount: number; conflictDeviceCount: number;
        notApplicableDeviceCount: number;
      }>(`/deviceManagement/deviceCompliancePolicies/${policyId}/deviceStatusOverview`);
      return {
        compliant: response.compliantDeviceCount || 0,
        nonCompliant: response.nonCompliantDeviceCount || 0,
        error: response.errorDeviceCount || 0,
        conflict: response.conflictDeviceCount || 0,
        notApplicable: response.notApplicableDeviceCount || 0,
      };
    } catch (error) {
      console.warn(`Failed to get status for policy ${policyId}:`, error);
      return { compliant: 0, nonCompliant: 0, error: 0, conflict: 0, notApplicable: 0 };
    }
  }

  /** Group devices by OS version for currency analysis */
  private groupByVersion(devices: IntuneManagedDeviceBeta[]): OSVersionGroup[] {
    if (devices.length === 0) return [];

    const counts = new Map<string, number>();
    for (const d of devices) {
      const raw = d.osVersion || 'Unknown';
      const parts = raw.split('.');
      const normalized = parts.length >= 3 ? parts.slice(0, 3).join('.') : raw;
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([version, count]) => ({
        version,
        count,
        percentage: Math.round((count / devices.length) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }

  /** Full detailed Intune summary for the dedicated /intune page */
  async getIntuneDetailedSummary(): Promise<IntuneDetailedSummary> {
    const errors: string[] = [];
    const fetchedAt = new Date().toISOString();

    const [devicesBetaResult, complianceSummaryResult, policiesResult] = await Promise.allSettled([
      this.getManagedDevicesBeta(),
      this.getCompliancePolicySummary(),
      this.getCompliancePolicies(),
    ]);

    const devicesBeta = devicesBetaResult.status === 'fulfilled'
      ? devicesBetaResult.value
      : (errors.push(`Devices: ${devicesBetaResult.reason}`), [] as IntuneManagedDeviceBeta[]);

    const complianceSummary = complianceSummaryResult.status === 'fulfilled'
      ? complianceSummaryResult.value
      : (errors.push(`Compliance summary: ${complianceSummaryResult.reason}`), {
          compliantDeviceCount: 0, nonCompliantDeviceCount: 0,
          errorDeviceCount: 0, conflictDeviceCount: 0,
          unknownDeviceCount: 0, notApplicableDeviceCount: 0,
        } as IntuneCompliancePolicySummary);

    const policies = policiesResult.status === 'fulfilled'
      ? policiesResult.value
      : (errors.push(`Policies: ${policiesResult.reason}`), [] as IntuneCompliancePolicyDetail[]);

    // Fetch per-policy status overviews (parallel, max 20)
    const policyDetails = await Promise.all(
      policies.slice(0, 20).map(async (policy) => {
        const status = await this.getPolicyDeviceStatusSummary(policy.id);
        return {
          ...policy,
          compliant: status.compliant,
          nonCompliant: status.nonCompliant,
          error: status.error,
          total: status.compliant + status.nonCompliant + status.error,
        };
      })
    );

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    // OS breakdown
    const devicesByOS = { windows: 0, ios: 0, macos: 0, android: 0, other: 0 };
    for (const d of devicesBeta) {
      const os = (d.operatingSystem || '').toLowerCase();
      if (os.includes('windows')) devicesByOS.windows++;
      else if (os === 'ios' || os === 'ipados') devicesByOS.ios++;
      else if (os.includes('macos') || os.includes('mac os')) devicesByOS.macos++;
      else if (os.includes('android')) devicesByOS.android++;
      else devicesByOS.other++;
    }

    // Ownership breakdown
    const ownership = { corporate: 0, personal: 0, unknown: 0 };
    for (const d of devicesBeta) {
      const type = (d.managedDeviceOwnerType || '').toLowerCase();
      if (type === 'company') ownership.corporate++;
      else if (type === 'personal') ownership.personal++;
      else ownership.unknown++;
    }

    // OS version currency analysis
    const osVersions = {
      windows: this.groupByVersion(devicesBeta.filter(d => (d.operatingSystem || '').toLowerCase().includes('windows'))),
      ios: this.groupByVersion(devicesBeta.filter(d => ['ios', 'ipados'].includes((d.operatingSystem || '').toLowerCase()))),
      macos: this.groupByVersion(devicesBeta.filter(d => (d.operatingSystem || '').toLowerCase().includes('mac'))),
      android: this.groupByVersion(devicesBeta.filter(d => (d.operatingSystem || '').toLowerCase().includes('android'))),
    };

    // Encryption status
    const encrypted = devicesBeta.filter(d => d.isEncrypted === true).length;
    const notEncrypted = devicesBeta.filter(d => d.isEncrypted === false).length;
    const encryptionUnknown = devicesBeta.length - encrypted - notEncrypted;
    const encryptableDevices = encrypted + notEncrypted;

    // Supervised status (iOS)
    const iosDevices = devicesBeta.filter(d =>
      ['ios', 'ipados'].includes((d.operatingSystem || '').toLowerCase())
    );
    const supervisedCount = iosDevices.filter(d => d.isSupervised === true).length;

    // Jailbreak / Root detection
    const compromised = devicesBeta.filter(d =>
      (d.jailBroken || '').toLowerCase() === 'true'
    );
    const jailbrokenClean = devicesBeta.filter(d =>
      (d.jailBroken || '').toLowerCase() === 'false'
    ).length;

    // Stale devices (30+ days)
    const staleDevices = devicesBeta
      .filter(d => d.lastSyncDateTime && new Date(d.lastSyncDateTime).getTime() < thirtyDaysAgo)
      .sort((a, b) => new Date(a.lastSyncDateTime).getTime() - new Date(b.lastSyncDateTime).getTime());

    // Reboot hygiene (14+ days via beta API)
    const rebootNeeded = devicesBeta
      .filter(d => {
        const rebootTime = d.hardwareInformation?.lastRebootDateTime;
        if (!rebootTime) return false;
        return new Date(rebootTime).getTime() < fourteenDaysAgo;
      })
      .sort((a, b) => {
        const aTime = new Date(a.hardwareInformation?.lastRebootDateTime || 0).getTime();
        const bTime = new Date(b.hardwareInformation?.lastRebootDateTime || 0).getTime();
        return aTime - bTime;
      });

    // Enrollment velocity
    const enrolledLast7Days = devicesBeta.filter(d =>
      d.enrolledDateTime && new Date(d.enrolledDateTime).getTime() > sevenDaysAgo
    ).length;
    const enrolledLast30Days = devicesBeta.filter(d =>
      d.enrolledDateTime && new Date(d.enrolledDateTime).getTime() > thirtyDaysAgo
    ).length;

    // Non-compliant device list
    const nonCompliantDevices = devicesBeta
      .filter(d => d.complianceState === 'noncompliant')
      .sort((a, b) => a.deviceName.localeCompare(b.deviceName));

    // Overall compliance rate
    const compliantCount = devicesBeta.filter(d => d.complianceState === 'compliant').length;
    const complianceRate = devicesBeta.length > 0
      ? Math.round((compliantCount / devicesBeta.length) * 100)
      : 0;

    return {
      totalDevices: devicesBeta.length,
      devicesByOS,
      ownership,
      complianceSummary,
      complianceRate,
      policies: policyDetails,
      osVersions,
      encryption: {
        encrypted,
        notEncrypted,
        unknown: encryptionUnknown,
        rate: encryptableDevices > 0 ? Math.round((encrypted / encryptableDevices) * 100) : 0,
      },
      supervised: {
        supervised: supervisedCount,
        unsupervised: iosDevices.length - supervisedCount,
        rate: iosDevices.length > 0 ? Math.round((supervisedCount / iosDevices.length) * 100) : 0,
      },
      jailbroken: {
        compromised: compromised.length,
        clean: jailbrokenClean,
        unknown: devicesBeta.length - compromised.length - jailbrokenClean,
        devices: compromised,
      },
      staleDevices,
      staleCount: staleDevices.length,
      rebootNeeded,
      rebootNeededCount: rebootNeeded.length,
      enrolledLast7Days,
      enrolledLast30Days,
      nonCompliantDevices,
      fetchedAt,
      errors,
    };
  }

  // ─── Full Summary ─────────────────────────────────────────────────────────

  async getFullSummary(): Promise<MicrosoftFullSummary> {
    const errors: string[] = [];

    const [
      alertsResult, scoreResult, defenderResult, assessResult,
      complianceResult, identityResult, incidentResult, machineResult,
      intuneResult,
    ] = await Promise.allSettled([
      this.getAlertAnalytics(),
      this.getSecureScore(),
      this.getDefenderAnalytics(),
      this.getAssessmentAnalytics(),
      this.getDeviceCompliance(),
      this.getIdentityRisk(),
      this.getIncidentAnalytics(),
      this.getMachineAnalytics(),
      this.getIntuneSummary(),
    ]);

    const extract = <T>(result: PromiseSettledResult<T>, fallback: T, label: string): T => {
      if (result.status === 'fulfilled') return result.value;
      errors.push(`${label}: ${result.reason}`);
      return fallback;
    };

    return {
      alertAnalytics: extract(alertsResult, EMPTY_ALERT_ANALYTICS, 'Security Alerts'),
      secureScore: extract(scoreResult, null, 'Secure Score'),
      defenderAnalytics: extract(defenderResult, EMPTY_DEFENDER_ANALYTICS, 'Defender Alerts'),
      assessments: extract(assessResult, EMPTY_ASSESSMENTS, 'Assessments'),
      compliance: extract(complianceResult, { compliant: 0, nonCompliant: 0, unknown: 0 }, 'Device Compliance'),
      identity: extract(identityResult, EMPTY_IDENTITY, 'Identity Risk'),
      incidents: extract(incidentResult, EMPTY_INCIDENTS, 'Incidents'),
      machines: extract(machineResult, EMPTY_MACHINES, 'Machines'),
      intune: extract(intuneResult, EMPTY_INTUNE, 'Intune'),
      errors,
      fetchedAt: new Date().toISOString(),
    };
  }
}
