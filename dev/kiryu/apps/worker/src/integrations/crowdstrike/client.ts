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
// CrowdStrike Client
// ============================================
export class CrowdStrikeClient {
  private baseUrl: string;
  private token: CrowdStrikeToken | null = null;

  constructor(private env: Env) {
    this.baseUrl = env.CROWDSTRIKE_BASE_URL || 'https://api.crowdstrike.com';
  }

  /**
   * Check if credentials are configured
   */
  isConfigured(): boolean {
    return !!(this.env.CROWDSTRIKE_CLIENT_ID && this.env.CROWDSTRIKE_CLIENT_SECRET);
  }

  /**
   * Get OAuth2 access token
   */
  private async authenticate(): Promise<string> {
    if (this.token && this.token.expires_at > Date.now()) {
      return this.token.access_token;
    }

    const response = await fetch(`${this.baseUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.env.CROWDSTRIKE_CLIENT_ID,
        client_secret: this.env.CROWDSTRIKE_CLIENT_SECRET,
      }),
    });

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

    return this.token.access_token;
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.authenticate();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
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
  // COMBINED SUMMARY
  // ============================================

  /**
   * Get full dashboard summary
   */
  async getFullSummary(alertDays = 7, incidentDays = 30): Promise<{
    alerts: AlertSummary;
    hosts: HostSummary;
    incidents: IncidentSummary;
    vulnerabilities: VulnerabilitySummary;
    zta: ZTASummary;
    fetchedAt: string;
    errors?: string[];
  }> {
    const errors: string[] = [];

    // Default values for when individual calls fail
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

    const defaultVulns: VulnerabilitySummary = {
      total: 0,
      bySeverity: { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 },
      byStatus: { open: 0, closed: 0, reopen: 0 },
      byExploitStatus: { available: 0, none: 0, unknown: 0 },
      topCVEs: [],
      affectedHosts: 0,
      withExploits: 0,
    };

    const defaultZTA: ZTASummary = {
      totalAssessed: 0,
      avgScore: 0,
      scoreDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
      lowestScores: [],
    };

    // Fetch all data with individual error handling
    const [alertsResult, hostsResult, incidentsResult, vulnsResult, ztaResult] = await Promise.allSettled([
      this.getAlertSummary(alertDays),
      this.getHostSummary(),
      this.getIncidentSummary(incidentDays),
      this.getVulnerabilitySummary(),
      this.getZTASummary(),
    ]);

    const alerts = alertsResult.status === 'fulfilled' ? alertsResult.value : (errors.push(`Alerts: ${(alertsResult as PromiseRejectedResult).reason}`), defaultAlerts);
    const hosts = hostsResult.status === 'fulfilled' ? hostsResult.value : (errors.push(`Hosts: ${(hostsResult as PromiseRejectedResult).reason}`), defaultHosts);
    const incidents = incidentsResult.status === 'fulfilled' ? incidentsResult.value : (errors.push(`Incidents: ${(incidentsResult as PromiseRejectedResult).reason}`), defaultIncidents);
    const vulnerabilities = vulnsResult.status === 'fulfilled' ? vulnsResult.value : (errors.push(`Vulnerabilities: ${(vulnsResult as PromiseRejectedResult).reason}`), defaultVulns);
    const zta = ztaResult.status === 'fulfilled' ? ztaResult.value : (errors.push(`ZTA: ${(ztaResult as PromiseRejectedResult).reason}`), defaultZTA);

    if (errors.length > 0) {
      console.error('CrowdStrike API errors:', errors);
    }

    return {
      alerts,
      hosts,
      incidents,
      vulnerabilities,
      zta,
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
        await this.request('/spotlight/queries/vulnerabilities/v1?limit=1');
        modules.push('Spotlight');
      } catch { /* Module not available */ }

      try {
        await this.request('/zero-trust-assessment/entities/assessments/v1?ids=test');
        modules.push('ZTA');
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
