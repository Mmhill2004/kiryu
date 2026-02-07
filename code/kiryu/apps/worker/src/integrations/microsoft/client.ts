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

// ─── Client ─────────────────────────────────────────────────────────────────

export class MicrosoftClient {
  private graphUrl = 'https://graph.microsoft.com/v1.0';
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

  // ─── Full Summary ─────────────────────────────────────────────────────────

  async getFullSummary(): Promise<MicrosoftFullSummary> {
    const errors: string[] = [];

    const [
      alertsResult, scoreResult, defenderResult, assessResult,
      complianceResult, identityResult, incidentResult, machineResult,
    ] = await Promise.allSettled([
      this.getAlertAnalytics(),
      this.getSecureScore(),
      this.getDefenderAnalytics(),
      this.getAssessmentAnalytics(),
      this.getDeviceCompliance(),
      this.getIdentityRisk(),
      this.getIncidentAnalytics(),
      this.getMachineAnalytics(),
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
      errors,
      fetchedAt: new Date().toISOString(),
    };
  }
}
