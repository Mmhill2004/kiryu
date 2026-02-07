import type { Env } from '../../types/env';

interface CrowdStrikeToken {
  access_token: string;
  expires_in: number;
  expires_at: number;
}

// ============================================
// Alert Types (Primary - replacing Detections)
// ============================================
export interface Alert {
  composite_id: string;
  created_timestamp: string;
  updated_timestamp: string;
  severity: number;
  severity_name: string;
  status: string;
  name: string;
  description: string;
  tactic: string;
  tactic_id: string;
  technique: string;
  technique_id: string;
  hostname: string;
  username: string;
  product: string;
  scenario: string;
  show_in_ui: boolean;
}

export interface AlertSummary {
  total: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    informational: number;
  };
  byStatus: {
    new: number;
    in_progress: number;
    resolved: number;
  };
  byTactic: Record<string, number>;
  byTechnique: Record<string, number>;
  recentAlerts: Alert[];
}

// ============================================
// Host/Endpoint Types
// ============================================
export interface Host {
  device_id: string;
  hostname: string;
  status: string;
  platform_name: string;
  os_version: string;
  os_build: string;
  last_seen: string;
  first_seen: string;
  agent_version: string;
  agent_local_time: string;
  reduced_functionality_mode: string;
  containment_status: string;
  groups: string[];
  tags: string[];
  machine_domain: string;
  ou: string[];
  site_name: string;
  external_ip: string;
  local_ip: string;
  mac_address: string;
  system_manufacturer: string;
  system_product_name: string;
  product_type_desc: string;
  provision_status: string;
  kernel_version: string;
  policies: Array<{ policy_id: string; policy_type: string; applied: boolean }>;
}

export interface HostSummary {
  total: number;
  online: number;
  offline: number;
  contained: number;
  reducedFunctionality: number;
  byPlatform: {
    windows: number;
    mac: number;
    linux: number;
  };
  byStatus: {
    normal: number;
    contained: number;
    containment_pending: number;
    lift_containment_pending: number;
  };
  agentVersions: Record<string, number>;
  staleEndpoints: number; // Not seen in 7+ days
}

// ============================================
// Incident Types
// ============================================
export interface Incident {
  incident_id: string;
  name: string;
  description: string;
  status: number;
  state: string;
  start: string;
  end?: string;
  fine_score: number;
  host_ids: string[];
  hosts: Array<{ device_id: string; hostname: string }>;
  users: Array<{ user_name: string; domain: string }>;
  tactics: string[];
  techniques: string[];
  objectives: string[];
  lm_host_ids?: string[]; // Lateral movement hosts
  created: string;
  modified_timestamp: string;
}

export interface IncidentSummary {
  total: number;
  open: number;
  closed: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byState: {
    new: number;
    reopened: number;
    in_progress: number;
    closed: number;
  };
  withLateralMovement: number;
  avgFineScore: number;
  recentIncidents: Incident[];
  mttr?: number; // Mean time to resolve in hours
}

// ============================================
// Spotlight Vulnerability Types
// ============================================
export interface Vulnerability {
  id: string;
  cve_id: string;
  aid: string;
  host_info: {
    hostname: string;
    os_version: string;
    platform: string;
  };
  app: {
    product_name: string;
    vendor: string;
    version: string;
  };
  severity: string;
  status: string;
  created_timestamp: string;
  updated_timestamp: string;
  closed_timestamp?: string;
  exprt_rating: string; // ExPRT AI rating
  cve: {
    id: string;
    base_score: number;
    severity: string;
    exploit_status: string;
    published_date: string;
    description: string;
    vector: string;
  };
  remediation: {
    ids: string[];
  };
}

export interface VulnerabilitySummary {
  total: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    unknown: number;
  };
  byStatus: {
    open: number;
    closed: number;
    reopen: number;
  };
  byExploitStatus: {
    available: number;
    none: number;
    unknown: number;
  };
  topCVEs: Array<{ cve_id: string; severity: string; affected_hosts: number; exprt_rating: string }>;
  affectedHosts: number;
  withExploits: number;
}

// ============================================
// NGSIEM / LogScale Types
// ============================================
export interface NGSIEMRepository {
  id: string;
  name: string;
  description?: string;
  retention_days?: number;
  ingest_size_bytes?: number;
  compressed_size_bytes?: number;
}

export interface NGSIEMSavedSearch {
  id: string;
  name: string;
  description?: string;
  search_query: string;
  created_timestamp: string;
  updated_timestamp: string;
  mode?: string;
}

export interface NGSIEMEvent {
  timestamp: string;
  event_type: string;
  aid?: string;
  hostname?: string;
  user_name?: string;
  event_data: Record<string, unknown>;
}

export interface NGSIEMSummary {
  repositories: number;
  totalIngestGB: number;
  savedSearches: number;
  eventCounts: {
    total: number;
    byType: Record<string, number>;
  };
  recentActivity: {
    authEvents: number;
    networkEvents: number;
    processEvents: number;
    dnsEvents: number;
  };
  topEventTypes: Array<{ type: string; count: number }>;
}

// ============================================
// OverWatch Types
// ============================================
export interface OverWatchDetection {
  id: string;
  detection_id: string;
  severity: string;
  tactic: string;
  technique: string;
  hostname: string;
  created_timestamp: string;
  description: string;
  status: string;
  assigned_to?: string;
}

export interface OverWatchIncident {
  id: string;
  incident_id: string;
  name: string;
  description: string;
  severity: number;
  status: string;
  created_timestamp: string;
  host_count: number;
  user_count: number;
}

export interface OverWatchSummary {
  totalDetections: number;
  detectionsBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  detectionsByTactic: Record<string, number>;
  activeEscalations: number;
  resolvedLast30Days: number;
  avgTimeToEscalate?: number; // hours
  recentDetections: OverWatchDetection[];
  huntingCoverage: {
    hostsMonitored: number;
    threatsIdentified: number;
    falsePositiveRate?: number;
  };
}

// ============================================
// Zero Trust Assessment Types
// ============================================
export interface ZTAAssessment {
  aid: string;
  assessment: {
    overall: number;
    sensor_config: number;
    os: number;
    version: number;
  };
  assessment_items: Array<{
    name: string;
    meets_criteria: boolean;
    weight: number;
  }>;
  modified_time: string;
}

export interface ZTASummary {
  totalAssessed: number;
  avgScore: number;
  scoreDistribution: {
    excellent: number;  // 80-100
    good: number;       // 60-79
    fair: number;       // 40-59
    poor: number;       // 0-39
  };
  lowestScores: Array<{ aid: string; hostname?: string; score: number }>;
}

// ============================================
// CrowdScore Types
// ============================================
export interface CrowdScore {
  id: string;
  timestamp: string;
  score: number;
  adjusted_score: number;
}

export interface CrowdScoreSummary {
  current: number;
  adjusted: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  trend: CrowdScore[];
}

// ============================================
// Identity Protection Types (GraphQL)
// ============================================
export interface IDPDetection {
  id: string;
  timestamp: string;
  severity: string;
  type: string;
  description: string;
  sourceAccount: { displayName: string; domain: string } | null;
  targetAccount: { displayName: string; domain: string } | null;
  sourceEndpoint: { hostname: string; ip: string } | null;
}

export interface IDPSummary {
  total: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  targetedAccounts: number;
  sourceEndpoints: number;
  recentDetections: IDPDetection[];
}

// ============================================
// Discover / Asset Inventory Types
// ============================================
export interface DiscoverSummary {
  totalApplications: number;
  unmanagedAssets: number;
  managedAssets: number;
  sensorCoverage: number; // percentage
}

// ============================================
// Sensor Usage Types
// ============================================
export interface SensorUsageSummary {
  totalSensors: number;
  currentWeek: Record<string, unknown> | null;
  trend: Array<Record<string, unknown>>;
}

// ============================================
// Threat Intelligence Types
// ============================================
export interface IntelActor {
  id: string;
  name: string;
  slug: string;
  description: string;
  target_industries: string[];
  last_activity_date: string;
}

export interface IntelReport {
  id: string;
  name: string;
  created_date: string;
  target_industries: string[];
  motivations: string[];
}

export interface IntelSummary {
  recentActors: IntelActor[];
  indicatorCount: number;
  recentReports: IntelReport[];
}

// ============================================
// Diagnostic Types
// ============================================
export interface DiagnosticResult {
  module: string;
  available: boolean;
  error?: string;
}

// ============================================
// CrowdStrike Client
// ============================================
export class CrowdStrikeClient {
  private baseUrl: string;
  private token: CrowdStrikeToken | null = null;
  private cache: KVNamespace | null;
  private pendingAuth: Promise<string> | null = null;

  constructor(private env: Env, cache?: KVNamespace) {
    this.baseUrl = env.CROWDSTRIKE_BASE_URL || 'https://api.crowdstrike.com';
    this.cache = cache || null;
  }

  /**
   * Check if credentials are configured
   */
  isConfigured(): boolean {
    return !!(this.env.CROWDSTRIKE_CLIENT_ID && this.env.CROWDSTRIKE_CLIENT_SECRET);
  }

  /**
   * Get OAuth2 access token (with in-flight deduplication)
   */
  private async authenticate(): Promise<string> {
    // Fast path: in-memory token still valid
    if (this.token && this.token.expires_at > Date.now()) {
      return this.token.access_token;
    }

    // Deduplicate concurrent auth calls
    if (this.pendingAuth) return this.pendingAuth;

    this.pendingAuth = this.authenticateInner();
    try {
      return await this.pendingAuth;
    } finally {
      this.pendingAuth = null;
    }
  }

  private async authenticateInner(): Promise<string> {
    // Check KV cache
    if (this.cache) {
      try {
        const cached = await this.cache.get('auth:cs:token', 'text');
        if (cached) {
          const parsed = JSON.parse(cached) as CrowdStrikeToken;
          if (parsed.expires_at > Date.now()) {
            this.token = parsed;
            return parsed.access_token;
          }
        }
      } catch { /* ignore cache errors */ }
    }

    const authController = new AbortController();
    const authTimeout = setTimeout(() => authController.abort(), 10000);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/oauth2/token`, {
        method: 'POST',
        signal: authController.signal,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.env.CROWDSTRIKE_CLIENT_ID,
          client_secret: this.env.CROWDSTRIKE_CLIENT_SECRET,
        }),
      });
    } catch (error) {
      clearTimeout(authTimeout);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('CrowdStrike authentication timeout (10s)');
      }
      throw error;
    } finally {
      clearTimeout(authTimeout);
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`CrowdStrike authentication failed: ${response.status} ${error}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };

    this.token = {
      access_token: data.access_token,
      expires_in: data.expires_in,
      expires_at: Date.now() + (data.expires_in * 1000) - 60000, // Refresh 1 min early
    };

    // Store in KV
    if (this.cache) {
      try {
        await this.cache.put('auth:cs:token', JSON.stringify(this.token), {
          expirationTtl: Math.max(60, data.expires_in - 120),
        });
      } catch { /* ignore cache errors */ }
    }

    return this.token.access_token;
  }

  /**
   * Make authenticated API request with timeout
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.authenticate();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`CrowdStrike API error: ${response.status} ${error}`);
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`CrowdStrike API timeout (20s): ${endpoint.split('?')[0]}`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ============================================
  // ALERTS API (Primary - replacing Detections)
  // ============================================

  /**
   * Get alerts with full details
   */
  async getAlerts(daysBack = 7, limit = 500): Promise<Alert[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    const filter = `created_timestamp:>='${startDate.toISOString()}'`;

    // Query alert IDs
    const queryResponse = await this.request<{ resources: string[]; meta: { pagination: { total: number } } }>(
      `/alerts/queries/alerts/v2?limit=${limit}&sort=created_timestamp|desc&filter=${encodeURIComponent(filter)}`
    );

    if (!queryResponse.resources || queryResponse.resources.length === 0) {
      return [];
    }

    // Get full alert details
    const detailsResponse = await this.request<{ resources: Alert[] }>(
      '/alerts/entities/alerts/v2',
      {
        method: 'POST',
        body: JSON.stringify({ composite_ids: queryResponse.resources }),
      }
    );

    return detailsResponse.resources || [];
  }

  /**
   * Get alert summary with counts and breakdowns
   */
  async getAlertSummary(daysBack = 7, limit = 500): Promise<AlertSummary> {
    try {
      const alerts = await this.getAlerts(daysBack, limit);

      const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, informational: 0 };
      const byStatus = { new: 0, in_progress: 0, resolved: 0 };
      const byTactic: Record<string, number> = {};
      const byTechnique: Record<string, number> = {};

      for (const alert of alerts) {
        // Count by severity
        const sev = alert.severity_name?.toLowerCase() || '';
        if (sev === 'critical' || alert.severity >= 5) bySeverity.critical++;
        else if (sev === 'high' || alert.severity === 4) bySeverity.high++;
        else if (sev === 'medium' || alert.severity === 3) bySeverity.medium++;
        else if (sev === 'low' || alert.severity === 2) bySeverity.low++;
        else bySeverity.informational++;

        // Count by status
        const status = alert.status?.toLowerCase() || '';
        if (status === 'new') byStatus.new++;
        else if (status === 'in_progress') byStatus.in_progress++;
        else byStatus.resolved++;

        // Count by MITRE tactic
        if (alert.tactic) {
          byTactic[alert.tactic] = (byTactic[alert.tactic] || 0) + 1;
        }

        // Count by MITRE technique
        if (alert.technique) {
          byTechnique[alert.technique] = (byTechnique[alert.technique] || 0) + 1;
        }
      }

      return {
        total: alerts.length,
        bySeverity,
        byStatus,
        byTactic,
        byTechnique,
        recentAlerts: alerts.slice(0, 20),
      };
    } catch (error) {
      console.error('Error fetching alerts:', error);
      return {
        total: 0,
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0, informational: 0 },
        byStatus: { new: 0, in_progress: 0, resolved: 0 },
        byTactic: {},
        byTechnique: {},
        recentAlerts: [],
      };
    }
  }

  // ============================================
  // HOSTS API
  // ============================================

  /**
   * Get hosts with full details
   * Note: Limited to avoid Cloudflare Workers subrequest limits (50 per request)
   */
  async getHosts(limit = 100): Promise<Host[]> {
    // Query host IDs - limit to 100 to stay within subrequest limits
    const queryResponse = await this.request<{ resources: string[]; meta: { pagination: { total: number } } }>(
      `/devices/queries/devices/v1?limit=${limit}&sort=last_seen|desc`
    );

    console.log(`Host query returned ${queryResponse.resources?.length || 0} IDs`);

    if (!queryResponse.resources || queryResponse.resources.length === 0) {
      return [];
    }

    // Get full host details - CrowdStrike uses GET with query params
    const idsParam = queryResponse.resources.map(id => `ids=${encodeURIComponent(id)}`).join('&');
    const detailsResponse = await this.request<{ resources: Host[] }>(
      `/devices/entities/devices/v2?${idsParam}`
    );
    console.log(`Fetched ${detailsResponse.resources?.length || 0} host details`);

    return detailsResponse.resources || [];
  }

  /**
   * Get host summary with breakdowns
   */
  async getHostSummary(): Promise<HostSummary> {
    try {
      // Get total count
      console.log('Fetching host count...');
      const countResponse = await this.request<{ meta: { pagination: { total: number } } }>(
        '/devices/queries/devices/v1?limit=1'
      );
      const total = countResponse.meta?.pagination?.total || 0;
      console.log(`Total hosts from API: ${total}`);

      // Get sample of hosts for breakdown (limited to 100 to stay within CF subrequest limits)
      console.log('Fetching host details...');
      const hosts = await this.getHosts(100);
      console.log(`Fetched ${hosts.length} host details for sampling`);

      const now = new Date();
      const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      let online = 0, offline = 0, contained = 0, reducedFunctionality = 0, stale = 0;
      const byPlatform = { windows: 0, mac: 0, linux: 0 };
      const byStatus = { normal: 0, contained: 0, containment_pending: 0, lift_containment_pending: 0 };
      const agentVersions: Record<string, number> = {};

      for (const host of hosts) {
        const lastSeen = new Date(host.last_seen);

        // Online/offline (30 min threshold)
        if (lastSeen > thirtyMinAgo) online++;
        else offline++;

        // Stale (7+ days)
        if (lastSeen < sevenDaysAgo) stale++;

        // Containment
        const containmentStatus = host.containment_status?.toLowerCase() || 'normal';
        if (containmentStatus === 'contained') {
          contained++;
          byStatus.contained++;
        } else if (containmentStatus === 'containment_pending') {
          byStatus.containment_pending++;
        } else if (containmentStatus === 'lift_containment_pending') {
          byStatus.lift_containment_pending++;
        } else {
          byStatus.normal++;
        }

        // Reduced functionality
        if (host.reduced_functionality_mode === 'yes') reducedFunctionality++;

        // Platform
        const platform = host.platform_name?.toLowerCase() || '';
        if (platform.includes('windows')) byPlatform.windows++;
        else if (platform.includes('mac')) byPlatform.mac++;
        else if (platform.includes('linux')) byPlatform.linux++;

        // Agent versions
        if (host.agent_version) {
          agentVersions[host.agent_version] = (agentVersions[host.agent_version] || 0) + 1;
        }
      }

      // Scale if sampled
      const scaleFactor = total / Math.max(hosts.length, 1);

      return {
        total,
        online: Math.round(online * scaleFactor),
        offline: Math.round(offline * scaleFactor),
        contained: Math.round(contained * scaleFactor),
        reducedFunctionality: Math.round(reducedFunctionality * scaleFactor),
        byPlatform: {
          windows: Math.round(byPlatform.windows * scaleFactor),
          mac: Math.round(byPlatform.mac * scaleFactor),
          linux: Math.round(byPlatform.linux * scaleFactor),
        },
        byStatus: {
          normal: Math.round(byStatus.normal * scaleFactor),
          contained: Math.round(byStatus.contained * scaleFactor),
          containment_pending: Math.round(byStatus.containment_pending * scaleFactor),
          lift_containment_pending: Math.round(byStatus.lift_containment_pending * scaleFactor),
        },
        agentVersions,
        staleEndpoints: Math.round(stale * scaleFactor),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Error fetching hosts:', errorMsg);
      // Re-throw so the caller knows there was an error
      throw new Error(`Failed to fetch hosts: ${errorMsg}`);
    }
  }

  // ============================================
  // INCIDENTS API
  // ============================================

  /**
   * Get incidents with full details
   */
  async getIncidents(daysBack = 30, limit = 500): Promise<Incident[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    const filter = `start:>='${startDate.toISOString()}'`;

    // Query incident IDs
    const queryResponse = await this.request<{ resources: string[]; meta: { pagination: { total: number } } }>(
      `/incidents/queries/incidents/v1?limit=${limit}&sort=start|desc&filter=${encodeURIComponent(filter)}`
    );

    if (!queryResponse.resources || queryResponse.resources.length === 0) {
      return [];
    }

    // Get full incident details
    const detailsResponse = await this.request<{ resources: Incident[] }>(
      '/incidents/entities/incidents/GET/v1',
      {
        method: 'POST',
        body: JSON.stringify({ ids: queryResponse.resources }),
      }
    );

    return detailsResponse.resources || [];
  }

  /**
   * Get incident summary with breakdowns
   */
  async getIncidentSummary(daysBack = 30): Promise<IncidentSummary> {
    try {
      const incidents = await this.getIncidents(daysBack);

      let open = 0, closed = 0, withLateralMovement = 0;
      let totalFineScore = 0;
      const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
      const byState = { new: 0, reopened: 0, in_progress: 0, closed: 0 };
      const resolutionTimes: number[] = [];

      for (const incident of incidents) {
        // Status: 20=new, 25=reopened, 30=in_progress, 40=closed
        if (incident.status >= 40) {
          closed++;
          byState.closed++;
          // Calculate resolution time
          if (incident.end && incident.start) {
            const startTime = new Date(incident.start).getTime();
            const endTime = new Date(incident.end).getTime();
            resolutionTimes.push((endTime - startTime) / (1000 * 60 * 60)); // Hours
          }
        } else {
          open++;
          if (incident.status === 20) byState.new++;
          else if (incident.status === 25) byState.reopened++;
          else byState.in_progress++;
        }

        // Severity by fine_score: 1-39=low, 40-59=medium, 60-79=high, 80-100=critical
        if (incident.fine_score >= 80) bySeverity.critical++;
        else if (incident.fine_score >= 60) bySeverity.high++;
        else if (incident.fine_score >= 40) bySeverity.medium++;
        else bySeverity.low++;

        totalFineScore += incident.fine_score || 0;

        // Lateral movement
        if (incident.lm_host_ids && incident.lm_host_ids.length > 0) {
          withLateralMovement++;
        }
      }

      const avgFineScore = incidents.length > 0 ? Math.round(totalFineScore / incidents.length) : 0;
      const mttr = resolutionTimes.length > 0
        ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length)
        : undefined;

      return {
        total: incidents.length,
        open,
        closed,
        bySeverity,
        byState,
        withLateralMovement,
        avgFineScore,
        recentIncidents: incidents.slice(0, 10),
        mttr,
      };
    } catch (error) {
      console.error('Error fetching incidents:', error);
      return {
        total: 0,
        open: 0,
        closed: 0,
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
        byState: { new: 0, reopened: 0, in_progress: 0, closed: 0 },
        withLateralMovement: 0,
        avgFineScore: 0,
        recentIncidents: [],
      };
    }
  }

  // ============================================
  // SPOTLIGHT VULNERABILITIES API
  // ============================================

  /**
   * Get vulnerabilities with full details
   */
  async getVulnerabilities(limit = 500): Promise<Vulnerability[]> {
    try {
      // Query vulnerability IDs (only open/critical/high by default)
      const filter = `status:'open'+cve.severity:['CRITICAL','HIGH']`;
      const queryResponse = await this.request<{ resources: string[]; meta: { pagination: { total: number } } }>(
        `/spotlight/queries/vulnerabilities/v1?limit=${limit}&filter=${encodeURIComponent(filter)}`
      );

      if (!queryResponse.resources || queryResponse.resources.length === 0) {
        return [];
      }

      // Get full vulnerability details
      const detailsResponse = await this.request<{ resources: Vulnerability[] }>(
        '/spotlight/entities/vulnerabilities/v2',
        {
          method: 'POST',
          body: JSON.stringify({ ids: queryResponse.resources }),
        }
      );

      return detailsResponse.resources || [];
    } catch (error) {
      console.error('Error fetching vulnerabilities:', error);
      return [];
    }
  }

  /**
   * Get vulnerability summary
   */
  async getVulnerabilitySummary(): Promise<VulnerabilitySummary> {
    try {
      // Use aggregates endpoint for faster counts
      const aggregateResponse = await this.request<{ resources: Array<{ name: string; buckets: Array<{ label: string; count: number }> }> }>(
        '/spotlight/aggregates/vulnerabilities/GET/v1',
        {
          method: 'POST',
          body: JSON.stringify([
            { name: 'severity', type: 'terms', field: 'cve.severity' },
            { name: 'status', type: 'terms', field: 'status' },
            { name: 'exploit_status', type: 'terms', field: 'cve.exploit_status' },
          ]),
        }
      );

      const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 };
      const byStatus = { open: 0, closed: 0, reopen: 0 };
      const byExploitStatus = { available: 0, none: 0, unknown: 0 };
      let total = 0;

      for (const agg of aggregateResponse.resources || []) {
        for (const bucket of agg.buckets || []) {
          const label = bucket.label?.toLowerCase() || '';
          const count = bucket.count || 0;

          if (agg.name === 'severity') {
            if (label === 'critical') bySeverity.critical = count;
            else if (label === 'high') bySeverity.high = count;
            else if (label === 'medium') bySeverity.medium = count;
            else if (label === 'low') bySeverity.low = count;
            else bySeverity.unknown += count;
            total += count;
          } else if (agg.name === 'status') {
            if (label === 'open') byStatus.open = count;
            else if (label === 'closed') byStatus.closed = count;
            else if (label === 'reopen') byStatus.reopen = count;
          } else if (agg.name === 'exploit_status') {
            if (label.includes('available')) byExploitStatus.available = count;
            else if (label === 'none') byExploitStatus.none = count;
            else byExploitStatus.unknown += count;
          }
        }
      }

      // Get top CVEs
      const vulns = await this.getVulnerabilities(100);
      const cveMap = new Map<string, { severity: string; count: number; exprt_rating: string }>();

      for (const vuln of vulns) {
        const existing = cveMap.get(vuln.cve_id);
        if (existing) {
          existing.count++;
        } else {
          cveMap.set(vuln.cve_id, {
            severity: vuln.cve?.severity || vuln.severity || 'UNKNOWN',
            count: 1,
            exprt_rating: vuln.exprt_rating || 'N/A',
          });
        }
      }

      const topCVEs = Array.from(cveMap.entries())
        .map(([cve_id, data]) => ({
          cve_id,
          severity: data.severity,
          affected_hosts: data.count,
          exprt_rating: data.exprt_rating,
        }))
        .sort((a, b) => b.affected_hosts - a.affected_hosts)
        .slice(0, 10);

      const affectedHostIds = new Set(vulns.map(v => v.aid));

      return {
        total,
        bySeverity,
        byStatus,
        byExploitStatus,
        topCVEs,
        affectedHosts: affectedHostIds.size,
        withExploits: byExploitStatus.available,
      };
    } catch (error) {
      console.error('Error fetching vulnerability summary:', error);
      return {
        total: 0,
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 },
        byStatus: { open: 0, closed: 0, reopen: 0 },
        byExploitStatus: { available: 0, none: 0, unknown: 0 },
        topCVEs: [],
        affectedHosts: 0,
        withExploits: 0,
      };
    }
  }

  // ============================================
  // ZERO TRUST ASSESSMENT API
  // ============================================

  /**
   * Get Zero Trust Assessment scores
   * Note: Limited to avoid Cloudflare Workers subrequest limits
   */
  async getZTAScores(limit = 50): Promise<ZTAAssessment[]> {
    try {
      // Get host IDs first - limited to reduce subrequests
      const hostsResponse = await this.request<{ resources: string[] }>(
        `/devices/queries/devices/v1?limit=${limit}`
      );

      if (!hostsResponse.resources || hostsResponse.resources.length === 0) {
        return [];
      }

      // Get ZTA assessments for those hosts
      const ztaResponse = await this.request<{ resources: ZTAAssessment[] }>(
        '/zero-trust-assessment/entities/assessments/v1',
        {
          method: 'GET',
          headers: {
            'ids': hostsResponse.resources.join(','),
          },
        }
      );

      return ztaResponse.resources || [];
    } catch (error) {
      console.error('Error fetching ZTA scores:', error);
      return [];
    }
  }

  /**
   * Get ZTA summary
   */
  async getZTASummary(): Promise<ZTASummary> {
    try {
      const assessments = await this.getZTAScores(50);

      if (assessments.length === 0) {
        return {
          totalAssessed: 0,
          avgScore: 0,
          scoreDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
          lowestScores: [],
        };
      }

      let totalScore = 0;
      const scoreDistribution = { excellent: 0, good: 0, fair: 0, poor: 0 };
      const scores: Array<{ aid: string; score: number }> = [];

      for (const assessment of assessments) {
        const score = assessment.assessment?.overall || 0;
        totalScore += score;
        scores.push({ aid: assessment.aid, score });

        if (score >= 80) scoreDistribution.excellent++;
        else if (score >= 60) scoreDistribution.good++;
        else if (score >= 40) scoreDistribution.fair++;
        else scoreDistribution.poor++;
      }

      const avgScore = Math.round(totalScore / assessments.length);
      const lowestScores = scores
        .sort((a, b) => a.score - b.score)
        .slice(0, 10);

      return {
        totalAssessed: assessments.length,
        avgScore,
        scoreDistribution,
        lowestScores,
      };
    } catch (error) {
      console.error('Error fetching ZTA summary:', error);
      return {
        totalAssessed: 0,
        avgScore: 0,
        scoreDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
        lowestScores: [],
      };
    }
  }

  // ============================================
  // NGSIEM / LOGSCALE API
  // ============================================

  /**
   * Get NGSIEM repositories
   */
  async getNGSIEMRepositories(): Promise<NGSIEMRepository[]> {
    try {
      const response = await this.request<{ resources: NGSIEMRepository[] }>(
        '/loggingreadonly/combined/repos/v1'
      );
      return response.resources || [];
    } catch (error) {
      console.error('Error fetching NGSIEM repositories:', error);
      return [];
    }
  }

  /**
   * Get NGSIEM saved searches
   */
  async getNGSIEMSavedSearches(): Promise<NGSIEMSavedSearch[]> {
    try {
      const response = await this.request<{ resources: NGSIEMSavedSearch[] }>(
        '/loggingreadonly/entities/saved-searches/v1'
      );
      return response.resources || [];
    } catch (error) {
      console.error('Error fetching NGSIEM saved searches:', error);
      return [];
    }
  }

  /**
   * Execute a LogScale query
   */
  async executeNGSIEMQuery(
    repoName: string,
    query: string,
    startTime: string,
    endTime: string
  ): Promise<NGSIEMEvent[]> {
    try {
      const response = await this.request<{ resources: NGSIEMEvent[] }>(
        '/loggingreadonly/entities/query/v1',
        {
          method: 'POST',
          body: JSON.stringify({
            repo_name: repoName,
            search_query: query,
            search_query_args: {},
            start: startTime,
            end: endTime,
            limit: 1000,
          }),
        }
      );
      return response.resources || [];
    } catch (error) {
      console.error('Error executing NGSIEM query:', error);
      return [];
    }
  }

  /**
   * Get NGSIEM summary with event counts and activity
   */
  async getNGSIEMSummary(): Promise<NGSIEMSummary> {
    try {
      // Fetch repositories and saved searches in parallel
      const [repos, savedSearches] = await Promise.all([
        this.getNGSIEMRepositories(),
        this.getNGSIEMSavedSearches(),
      ]);

      // Calculate total ingest size
      const totalIngestBytes = repos.reduce((sum, r) => sum + (r.ingest_size_bytes || 0), 0);
      const totalIngestGB = Math.round((totalIngestBytes / (1024 * 1024 * 1024)) * 100) / 100;

      // Try to get event counts from aggregates if available
      let eventCounts = { total: 0, byType: {} as Record<string, number> };
      let recentActivity = { authEvents: 0, networkEvents: 0, processEvents: 0, dnsEvents: 0 };

      try {
        // Query for event type distribution (last 24 hours)
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Try to get aggregate counts from the primary repo
        if (repos.length > 0) {
          const aggregateResponse = await this.request<{
            resources: Array<{ name: string; buckets: Array<{ label: string; count: number }> }>;
          }>(
            '/loggingreadonly/aggregates/events/GET/v1',
            {
              method: 'POST',
              body: JSON.stringify({
                date_ranges: [{
                  from: yesterday.toISOString(),
                  to: now.toISOString(),
                }],
                field: 'event_simpleName',
                filter: '',
                interval: 'day',
                name: 'event_types',
                type: 'terms',
                size: 20,
              }),
            }
          );

          for (const agg of aggregateResponse.resources || []) {
            for (const bucket of agg.buckets || []) {
              const eventType = bucket.label || 'unknown';
              const count = bucket.count || 0;
              eventCounts.byType[eventType] = count;
              eventCounts.total += count;

              // Categorize into activity types
              const lowerType = eventType.toLowerCase();
              if (lowerType.includes('auth') || lowerType.includes('logon') || lowerType.includes('credential')) {
                recentActivity.authEvents += count;
              } else if (lowerType.includes('network') || lowerType.includes('connection') || lowerType.includes('socket')) {
                recentActivity.networkEvents += count;
              } else if (lowerType.includes('process') || lowerType.includes('exec')) {
                recentActivity.processEvents += count;
              } else if (lowerType.includes('dns')) {
                recentActivity.dnsEvents += count;
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching NGSIEM event aggregates:', error);
      }

      // Sort top event types
      const topEventTypes = Object.entries(eventCounts.byType)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        repositories: repos.length,
        totalIngestGB,
        savedSearches: savedSearches.length,
        eventCounts,
        recentActivity,
        topEventTypes,
      };
    } catch (error) {
      console.error('Error fetching NGSIEM summary:', error);
      return {
        repositories: 0,
        totalIngestGB: 0,
        savedSearches: 0,
        eventCounts: { total: 0, byType: {} },
        recentActivity: { authEvents: 0, networkEvents: 0, processEvents: 0, dnsEvents: 0 },
        topEventTypes: [],
      };
    }
  }

  // ============================================
  // OVERWATCH API
  // ============================================

  /**
   * Get OverWatch detections
   */
  async getOverWatchDetections(daysBack = 30, limit = 100): Promise<OverWatchDetection[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      const filter = `created_timestamp:>='${startDate.toISOString()}'`;

      // Query detection IDs
      const queryResponse = await this.request<{ resources: string[]; meta: { pagination: { total: number } } }>(
        `/overwatch-dashboards/queries/detections/v1?limit=${limit}&sort=created_timestamp|desc&filter=${encodeURIComponent(filter)}`
      );

      if (!queryResponse.resources || queryResponse.resources.length === 0) {
        return [];
      }

      // Get full detection details
      const detailsResponse = await this.request<{ resources: OverWatchDetection[] }>(
        '/overwatch-dashboards/entities/detections/v1',
        {
          method: 'POST',
          body: JSON.stringify({ ids: queryResponse.resources }),
        }
      );

      return detailsResponse.resources || [];
    } catch (error) {
      console.error('Error fetching OverWatch detections:', error);
      return [];
    }
  }

  /**
   * Get OverWatch incidents/escalations
   */
  async getOverWatchIncidents(daysBack = 30): Promise<OverWatchIncident[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      const filter = `created_timestamp:>='${startDate.toISOString()}'`;

      const response = await this.request<{ resources: OverWatchIncident[] }>(
        `/overwatch-dashboards/entities/incidents/v1?filter=${encodeURIComponent(filter)}`
      );

      return response.resources || [];
    } catch (error) {
      console.error('Error fetching OverWatch incidents:', error);
      return [];
    }
  }

  /**
   * Get OverWatch aggregate counts
   */
  async getOverWatchAggregates(): Promise<{
    detections: { total: number; bySeverity: Record<string, number> };
    events: { total: number; byType: Record<string, number> };
  }> {
    try {
      const response = await this.request<{
        resources: Array<{ name: string; value: number; buckets?: Array<{ label: string; count: number }> }>;
      }>(
        '/overwatch-dashboards/aggregates/detections-global-counts/v1'
      );

      const result = {
        detections: { total: 0, bySeverity: {} as Record<string, number> },
        events: { total: 0, byType: {} as Record<string, number> },
      };

      for (const resource of response.resources || []) {
        if (resource.buckets) {
          for (const bucket of resource.buckets) {
            if (resource.name === 'severity') {
              result.detections.bySeverity[bucket.label] = bucket.count;
            } else {
              result.events.byType[bucket.label] = bucket.count;
            }
          }
        }
        if (resource.name === 'total') {
          result.detections.total = resource.value;
        }
      }

      return result;
    } catch (error) {
      console.error('Error fetching OverWatch aggregates:', error);
      return {
        detections: { total: 0, bySeverity: {} },
        events: { total: 0, byType: {} },
      };
    }
  }

  /**
   * Get OverWatch summary with detections and escalations
   */
  async getOverWatchSummary(): Promise<OverWatchSummary> {
    try {
      // Fetch detections and aggregates in parallel
      const [detections, aggregates] = await Promise.all([
        this.getOverWatchDetections(30, 50),
        this.getOverWatchAggregates(),
      ]);

      const detectionsBySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
      const detectionsByTactic: Record<string, number> = {};
      let activeEscalations = 0;
      let resolvedLast30Days = 0;
      const escalationTimes: number[] = [];

      for (const detection of detections) {
        // Count by severity
        const sev = detection.severity?.toLowerCase() || '';
        if (sev === 'critical') detectionsBySeverity.critical++;
        else if (sev === 'high') detectionsBySeverity.high++;
        else if (sev === 'medium') detectionsBySeverity.medium++;
        else detectionsBySeverity.low++;

        // Count by tactic
        if (detection.tactic) {
          detectionsByTactic[detection.tactic] = (detectionsByTactic[detection.tactic] || 0) + 1;
        }

        // Track status
        const status = detection.status?.toLowerCase() || '';
        if (status === 'open' || status === 'in_progress' || status === 'new') {
          activeEscalations++;
        } else if (status === 'closed' || status === 'resolved') {
          resolvedLast30Days++;
        }
      }

      // Use aggregate totals if available, otherwise use detection counts
      const totalDetections = aggregates.detections.total || detections.length;

      // Get host monitoring count from existing host summary (simplified)
      let hostsMonitored = 0;
      try {
        const hostCount = await this.request<{ meta: { pagination: { total: number } } }>(
          '/devices/queries/devices/v1?limit=1'
        );
        hostsMonitored = hostCount.meta?.pagination?.total || 0;
      } catch {
        // Ignore - we already have this from hosts API
      }

      return {
        totalDetections,
        detectionsBySeverity,
        detectionsByTactic,
        activeEscalations,
        resolvedLast30Days,
        avgTimeToEscalate: escalationTimes.length > 0
          ? Math.round(escalationTimes.reduce((a, b) => a + b, 0) / escalationTimes.length)
          : undefined,
        recentDetections: detections.slice(0, 10),
        huntingCoverage: {
          hostsMonitored,
          threatsIdentified: totalDetections,
          falsePositiveRate: undefined, // Would need historical data
        },
      };
    } catch (error) {
      console.error('Error fetching OverWatch summary:', error);
      return {
        totalDetections: 0,
        detectionsBySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
        detectionsByTactic: {},
        activeEscalations: 0,
        resolvedLast30Days: 0,
        recentDetections: [],
        huntingCoverage: {
          hostsMonitored: 0,
          threatsIdentified: 0,
        },
      };
    }
  }

  // ============================================
  // CROWDSCORE API
  // ============================================

  /**
   * Get CrowdScore — the single most important threat-level KPI (0-100)
   */
  async getCrowdScore(): Promise<CrowdScoreSummary> {
    const response = await this.request<{ resources: CrowdScore[] }>(
      '/incidents/combined/crowdscores/v1?sort=timestamp.desc&limit=12'
    );

    const scores = response.resources || [];
    if (scores.length === 0) {
      return { current: 0, adjusted: 0, level: 'low', trend: [] };
    }

    const latest = scores[0]!;
    const current = latest.score || 0;
    const level = current >= 80 ? 'critical' : current >= 60 ? 'high' : current >= 40 ? 'medium' : 'low';

    return {
      current,
      adjusted: latest.adjusted_score || current,
      level,
      trend: scores,
    };
  }

  // ============================================
  // ALERT AGGREGATES API
  // ============================================

  /**
   * Get alert counts via aggregates API — faster and more accurate than fetching all alerts
   */
  async getAlertAggregates(daysBack = 7): Promise<{
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
    byProduct: Record<string, number>;
    byTactic: Record<string, number>;
    total: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    const filter = `created_timestamp:>='${startDate.toISOString()}'`;

    const response = await this.request<{
      resources: Array<{ name: string; buckets: Array<{ label: string; count: number }> }>;
    }>(
      '/alerts/aggregates/alerts/v2',
      {
        method: 'POST',
        body: JSON.stringify([
          { name: 'severity', type: 'terms', field: 'severity_name', filter },
          { name: 'status', type: 'terms', field: 'status', filter },
          { name: 'product', type: 'terms', field: 'product', filter },
          { name: 'tactic', type: 'terms', field: 'tactic', filter, size: 20 },
        ]),
      }
    );

    const bySeverity: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byProduct: Record<string, number> = {};
    const byTactic: Record<string, number> = {};
    let total = 0;

    for (const agg of response.resources || []) {
      for (const bucket of agg.buckets || []) {
        const label = bucket.label || 'unknown';
        const count = bucket.count || 0;

        if (agg.name === 'severity') {
          bySeverity[label.toLowerCase()] = count;
          total += count;
        } else if (agg.name === 'status') {
          byStatus[label.toLowerCase()] = count;
        } else if (agg.name === 'product') {
          byProduct[label] = count;
        } else if (agg.name === 'tactic') {
          byTactic[label] = count;
        }
      }
    }

    return { bySeverity, byStatus, byProduct, byTactic, total };
  }

  // ============================================
  // IDENTITY PROTECTION API (via Alerts with product:'idp' filter)
  // ============================================

  /**
   * Get Identity Protection detections via the alerts API
   * Note: IDP GraphQL "detections" query is no longer supported.
   * Instead we filter alerts by product:'idp'.
   */
  async getIdentityDetections(limit = 50): Promise<IDPDetection[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const filter = `product:'idp'+created_timestamp:>='${startDate.toISOString()}'`;

    const queryResponse = await this.request<{ resources: string[]; meta: { pagination: { total: number } } }>(
      `/alerts/queries/alerts/v2?limit=${limit}&sort=created_timestamp|desc&filter=${encodeURIComponent(filter)}`
    );

    if (!queryResponse.resources || queryResponse.resources.length === 0) {
      return [];
    }

    const detailsResponse = await this.request<{ resources: Alert[] }>(
      '/alerts/entities/alerts/v2',
      {
        method: 'POST',
        body: JSON.stringify({ composite_ids: queryResponse.resources }),
      }
    );

    return (detailsResponse.resources || []).map(alert => ({
      id: alert.composite_id,
      timestamp: alert.created_timestamp,
      severity: alert.severity_name || String(alert.severity),
      type: alert.tactic || alert.scenario || 'unknown',
      description: alert.description || alert.name || '',
      sourceAccount: null,
      targetAccount: alert.username ? { displayName: alert.username, domain: '' } : null,
      sourceEndpoint: alert.hostname ? { hostname: alert.hostname, ip: '' } : null,
    }));
  }

  /**
   * Get Identity Protection detection summary
   */
  async getIdentityDetectionSummary(): Promise<IDPSummary> {
    const detections = await this.getIdentityDetections(50);

    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const targetAccounts = new Set<string>();
    const sourceEndpoints = new Set<string>();

    for (const d of detections) {
      const sev = d.severity?.toLowerCase() || 'unknown';
      bySeverity[sev] = (bySeverity[sev] || 0) + 1;

      const type = d.type || 'unknown';
      byType[type] = (byType[type] || 0) + 1;

      if (d.targetAccount?.displayName) {
        targetAccounts.add(`${d.targetAccount.domain}\\${d.targetAccount.displayName}`);
      }
      if (d.sourceEndpoint?.hostname) {
        sourceEndpoints.add(d.sourceEndpoint.hostname);
      }
    }

    return {
      total: detections.length,
      bySeverity,
      byType,
      targetedAccounts: targetAccounts.size,
      sourceEndpoints: sourceEndpoints.size,
      recentDetections: detections.slice(0, 10),
    };
  }

  // ============================================
  // DISCOVER / ASSET INVENTORY API
  // ============================================

  /**
   * Get Discover asset summary — managed vs unmanaged, sensor coverage
   */
  async getDiscoverSummary(): Promise<DiscoverSummary> {
    // Discover API requires a FQL filter — use last_seen_timestamp as safe minimum filter
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const appFilter = encodeURIComponent(`last_used_timestamp:>='${ninetyDaysAgo.toISOString()}'`);
    const hostFilter = encodeURIComponent(`last_seen_timestamp:>='${ninetyDaysAgo.toISOString()}'`);

    const [appsResponse, unmanagedResponse, managedCountResponse] = await Promise.all([
      this.request<{ meta: { pagination: { total: number } } }>(
        `/discover/combined/applications/v1?limit=1&filter=${appFilter}`
      ),
      this.request<{ meta: { pagination: { total: number } } }>(
        `/discover/combined/hosts/v1?limit=1&filter=${hostFilter}`
      ),
      this.request<{ meta: { pagination: { total: number } } }>(
        '/devices/queries/devices/v1?limit=1'
      ),
    ]);

    const totalApplications = appsResponse.meta?.pagination?.total || 0;
    const unmanagedAssets = unmanagedResponse.meta?.pagination?.total || 0;
    const managedAssets = managedCountResponse.meta?.pagination?.total || 0;
    const totalAssets = managedAssets + unmanagedAssets;
    const sensorCoverage = totalAssets > 0 ? Math.round((managedAssets / totalAssets) * 10000) / 100 : 0;

    return { totalApplications, unmanagedAssets, managedAssets, sensorCoverage };
  }

  // ============================================
  // SENSOR USAGE API
  // ============================================

  /**
   * Get sensor usage derived from host counts
   * Note: /sensor-usage/combined/weekly/v1 is not available; we derive from hosts API
   */
  async getSensorUsage(): Promise<SensorUsageSummary> {
    const hostSummary = await this.getHostSummary();
    return {
      totalSensors: hostSummary.total,
      currentWeek: {
        total: hostSummary.total,
        online: hostSummary.online,
        offline: hostSummary.offline,
        byPlatform: hostSummary.byPlatform,
      },
      trend: [],
    };
  }

  // ============================================
  // THREAT INTELLIGENCE API
  // ============================================

  /**
   * Get recent threat actors
   */
  async getActors(limit = 5): Promise<IntelActor[]> {
    const queryResponse = await this.request<{ resources: string[] }>(
      `/intel/queries/actors/v1?limit=${limit}&sort=last_activity_date|desc`
    );

    if (!queryResponse.resources?.length) return [];

    const ids = queryResponse.resources.map(id => `ids=${encodeURIComponent(id)}`).join('&');
    const details = await this.request<{ resources: IntelActor[] }>(
      `/intel/entities/actors/v1?${ids}&fields=__full__`
    );
    return details.resources || [];
  }

  /**
   * Get total indicator count
   */
  async getIndicatorCount(): Promise<number> {
    const response = await this.request<{ meta: { pagination: { total: number } } }>(
      '/intel/queries/indicators/v1?limit=1&filter=deleted:false'
    );
    return response.meta?.pagination?.total || 0;
  }

  /**
   * Get recent intel reports
   */
  async getIntelReports(limit = 5): Promise<IntelReport[]> {
    const queryResponse = await this.request<{ resources: string[] }>(
      `/intel/queries/reports/v1?limit=${limit}&sort=created_date|desc`
    );

    if (!queryResponse.resources?.length) return [];

    const ids = queryResponse.resources.map(id => `ids=${encodeURIComponent(id)}`).join('&');
    const details = await this.request<{ resources: IntelReport[] }>(
      `/intel/entities/reports/v1?${ids}&fields=__full__`
    );
    return details.resources || [];
  }

  /**
   * Get threat intelligence summary
   */
  async getIntelSummary(): Promise<IntelSummary> {
    const [actorsResult, countResult, reportsResult] = await Promise.allSettled([
      this.getActors(5),
      this.getIndicatorCount(),
      this.getIntelReports(5),
    ]);

    return {
      recentActors: actorsResult.status === 'fulfilled' ? actorsResult.value : [],
      indicatorCount: countResult.status === 'fulfilled' ? countResult.value : 0,
      recentReports: reportsResult.status === 'fulfilled' ? reportsResult.value : [],
    };
  }

  // ============================================
  // DIAGNOSTIC
  // ============================================

  /**
   * Test every API scope and report availability
   */
  async runDiagnostic(): Promise<DiagnosticResult[]> {
    const tests: Array<{ module: string; endpoint: string; method?: string; body?: string }> = [
      { module: 'Alerts', endpoint: '/alerts/queries/alerts/v2?limit=1' },
      { module: 'Hosts', endpoint: '/devices/queries/devices/v1?limit=1' },
      { module: 'Incidents', endpoint: '/incidents/queries/incidents/v1?limit=1' },
      { module: 'Spotlight', endpoint: `/spotlight/queries/vulnerabilities/v1?limit=1&filter=${encodeURIComponent("status:'open'")}` },
      { module: 'ZTA', endpoint: '/zero-trust-assessment/entities/assessments/v1?ids=test' },
      { module: 'NGSIEM', endpoint: '/loggingreadonly/combined/repos/v1?limit=1' },
      { module: 'OverWatch', endpoint: '/overwatch-dashboards/aggregates/detections-global-counts/v1' },
      { module: 'Identity Protection', endpoint: `/alerts/queries/alerts/v2?limit=1&filter=${encodeURIComponent("product:'idp'")}` },
      { module: 'Discover', endpoint: `/discover/combined/applications/v1?limit=1&filter=${encodeURIComponent(`last_used_timestamp:>='${new Date(Date.now() - 90 * 86400000).toISOString()}'`)}` },
      { module: 'Sensor Usage (via Hosts)', endpoint: '/devices/queries/devices/v1?limit=1' },
      { module: 'Intel Actors', endpoint: '/intel/queries/actors/v1?limit=1' },
      { module: 'Intel Indicators', endpoint: '/intel/queries/indicators/v1?limit=1' },
      { module: 'Intel Reports', endpoint: '/intel/queries/reports/v1?limit=1' },
      { module: 'CrowdScore', endpoint: '/incidents/combined/crowdscores/v1?limit=1' },
      { module: 'Prevention Policies', endpoint: '/policy/combined/prevention/v1?limit=1' },
    ];

    const results = await Promise.allSettled(
      tests.map(async (test): Promise<DiagnosticResult> => {
        try {
          await this.request(test.endpoint, {
            method: test.method || 'GET',
            ...(test.body ? { body: test.body } : {}),
          });
          return { module: test.module, available: true };
        } catch (error) {
          return {
            module: test.module,
            available: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      })
    );

    return results.map(r => r.status === 'fulfilled' ? r.value : { module: 'unknown', available: false, error: 'Promise rejected' });
  }

  // ============================================
  // COMBINED SUMMARY
  // ============================================

  /**
   * Get full dashboard summary — all 12 modules in parallel
   */
  async getFullSummary(alertDays = 7, incidentDays = 30): Promise<{
    alerts: AlertSummary;
    hosts: HostSummary;
    incidents: IncidentSummary;
    zta: ZTASummary;
    ngsiem: NGSIEMSummary;
    overwatch: OverWatchSummary;
    crowdScore: CrowdScoreSummary | null;
    vulnerabilities: VulnerabilitySummary | null;
    identity: IDPSummary | null;
    discover: DiscoverSummary | null;
    sensors: SensorUsageSummary | null;
    intel: IntelSummary | null;
    fetchedAt: string;
    errors?: string[];
  }> {
    const errors: string[] = [];

    // Default values for existing modules (keeps dashboard working on failures)
    const defaultAlerts: AlertSummary = {
      total: 0,
      bySeverity: { critical: 0, high: 0, medium: 0, low: 0, informational: 0 },
      byStatus: { new: 0, in_progress: 0, resolved: 0 },
      byTactic: {},
      byTechnique: {},
      recentAlerts: [],
    };

    const defaultHosts: HostSummary = {
      total: 0,
      online: 0,
      offline: 0,
      contained: 0,
      reducedFunctionality: 0,
      byPlatform: { windows: 0, mac: 0, linux: 0 },
      byStatus: { normal: 0, contained: 0, containment_pending: 0, lift_containment_pending: 0 },
      agentVersions: {},
      staleEndpoints: 0,
    };

    const defaultIncidents: IncidentSummary = {
      total: 0,
      open: 0,
      closed: 0,
      bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
      byState: { new: 0, reopened: 0, in_progress: 0, closed: 0 },
      withLateralMovement: 0,
      avgFineScore: 0,
      recentIncidents: [],
    };

    const defaultZTA: ZTASummary = {
      totalAssessed: 0,
      avgScore: 0,
      scoreDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
      lowestScores: [],
    };

    const defaultNGSIEM: NGSIEMSummary = {
      repositories: 0,
      totalIngestGB: 0,
      savedSearches: 0,
      eventCounts: { total: 0, byType: {} },
      recentActivity: { authEvents: 0, networkEvents: 0, processEvents: 0, dnsEvents: 0 },
      topEventTypes: [],
    };

    const defaultOverWatch: OverWatchSummary = {
      totalDetections: 0,
      detectionsBySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
      detectionsByTactic: {},
      activeEscalations: 0,
      resolvedLast30Days: 0,
      recentDetections: [],
      huntingCoverage: { hostsMonitored: 0, threatsIdentified: 0 },
    };

    // Fetch all 12 modules in parallel with individual error handling
    const [
      alertsResult, hostsResult, incidentsResult, ztaResult, ngsiemResult, overwatchResult,
      crowdScoreResult, vulnsResult, identityResult, discoverResult, sensorsResult, intelResult,
    ] = await Promise.allSettled([
      this.getAlertSummary(alertDays),
      this.getHostSummary(),
      this.getIncidentSummary(incidentDays),
      this.getZTASummary(),
      this.getNGSIEMSummary(),
      this.getOverWatchSummary(),
      this.getCrowdScore(),
      this.getVulnerabilitySummary(),
      this.getIdentityDetectionSummary(),
      this.getDiscoverSummary(),
      this.getSensorUsage(),
      this.getIntelSummary(),
    ]);

    // Existing modules: use defaults on failure
    const alerts = alertsResult.status === 'fulfilled' ? alertsResult.value : (errors.push(`Alerts: ${(alertsResult as PromiseRejectedResult).reason}`), defaultAlerts);
    const hosts = hostsResult.status === 'fulfilled' ? hostsResult.value : (errors.push(`Hosts: ${(hostsResult as PromiseRejectedResult).reason}`), defaultHosts);
    const incidents = incidentsResult.status === 'fulfilled' ? incidentsResult.value : (errors.push(`Incidents: ${(incidentsResult as PromiseRejectedResult).reason}`), defaultIncidents);
    const zta = ztaResult.status === 'fulfilled' ? ztaResult.value : (errors.push(`ZTA: ${(ztaResult as PromiseRejectedResult).reason}`), defaultZTA);
    const ngsiem = ngsiemResult.status === 'fulfilled' ? ngsiemResult.value : (errors.push(`NGSIEM: ${(ngsiemResult as PromiseRejectedResult).reason}`), defaultNGSIEM);
    const overwatch = overwatchResult.status === 'fulfilled' ? overwatchResult.value : (errors.push(`OverWatch: ${(overwatchResult as PromiseRejectedResult).reason}`), defaultOverWatch);

    // New modules: null on failure
    const crowdScore = crowdScoreResult.status === 'fulfilled' ? crowdScoreResult.value : (errors.push(`CrowdScore: ${(crowdScoreResult as PromiseRejectedResult).reason}`), null);
    const vulnerabilities = vulnsResult.status === 'fulfilled' ? vulnsResult.value : (errors.push(`Vulnerabilities: ${(vulnsResult as PromiseRejectedResult).reason}`), null);
    const identity = identityResult.status === 'fulfilled' ? identityResult.value : (errors.push(`Identity Protection: ${(identityResult as PromiseRejectedResult).reason}`), null);
    const discover = discoverResult.status === 'fulfilled' ? discoverResult.value : (errors.push(`Discover: ${(discoverResult as PromiseRejectedResult).reason}`), null);
    const sensors = sensorsResult.status === 'fulfilled' ? sensorsResult.value : (errors.push(`Sensor Usage: ${(sensorsResult as PromiseRejectedResult).reason}`), null);
    const intel = intelResult.status === 'fulfilled' ? intelResult.value : (errors.push(`Intel: ${(intelResult as PromiseRejectedResult).reason}`), null);

    if (errors.length > 0) {
      console.error('CrowdStrike API errors:', errors);
    }

    return {
      alerts,
      hosts,
      incidents,
      zta,
      ngsiem,
      overwatch,
      crowdScore,
      vulnerabilities,
      identity,
      discover,
      sensors,
      intel,
      fetchedAt: new Date().toISOString(),
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; modules: string[] }> {
    try {
      await this.authenticate();

      // Test each module
      const modules: string[] = [];

      try {
        await this.request('/alerts/queries/alerts/v2?limit=1');
        modules.push('Alerts');
      } catch { /* Module not available */ }

      try {
        await this.request('/devices/queries/devices/v1?limit=1');
        modules.push('Hosts');
      } catch { /* Module not available */ }

      try {
        await this.request('/incidents/queries/incidents/v1?limit=1');
        modules.push('Incidents');
      } catch { /* Module not available */ }

      try {
        await this.request(`/spotlight/queries/vulnerabilities/v1?limit=1&filter=${encodeURIComponent("status:'open'")}`);
        modules.push('Spotlight');
      } catch { /* Module not available */ }

      try {
        await this.request('/zero-trust-assessment/entities/assessments/v1?ids=test');
        modules.push('ZTA');
      } catch { /* Module not available */ }

      try {
        await this.request('/loggingreadonly/combined/repos/v1?limit=1');
        modules.push('NGSIEM');
      } catch { /* Module not available */ }

      try {
        await this.request('/overwatch-dashboards/aggregates/detections-global-counts/v1');
        modules.push('OverWatch');
      } catch { /* Module not available */ }

      try {
        await this.request('/incidents/combined/crowdscores/v1?limit=1');
        modules.push('CrowdScore');
      } catch { /* Module not available */ }

      try {
        await this.request(`/alerts/queries/alerts/v2?limit=1&filter=${encodeURIComponent("product:'idp'")}`);
        modules.push('Identity Protection');
      } catch { /* Module not available */ }

      try {
        const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();
        await this.request(`/discover/combined/applications/v1?limit=1&filter=${encodeURIComponent(`last_used_timestamp:>='${ninetyDaysAgo}'`)}`);
        modules.push('Discover');
      } catch { /* Module not available */ }

      try {
        await this.request('/intel/queries/actors/v1?limit=1');
        modules.push('Intel');
      } catch { /* Module not available */ }

      return {
        success: true,
        message: `Connected to CrowdStrike API. Available modules: ${modules.join(', ')}`,
        modules,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to connect',
        modules: [],
      };
    }
  }
}
