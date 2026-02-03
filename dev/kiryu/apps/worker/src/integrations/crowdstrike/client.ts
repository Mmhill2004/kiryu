import type { Env } from '../../types/env';

interface CrowdStrikeToken {
  access_token: string;
  expires_in: number;
  expires_at: number;
}

export interface Alert {
  composite_id: string;
  created_timestamp: string;
  severity: number;
  severity_name: string;
  status: string;
  name: string;
  description: string;
  tactic: string;
  tactic_id: string;
  technique: string;
  technique_id: string;
  hostname?: string;
  product: string;
}

export interface Host {
  device_id: string;
  hostname: string;
  status: string;
  platform_name: string;
  os_version: string;
  last_seen: string;
  agent_version: string;
  reduced_functionality_mode: string;
}

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
  recentAlerts: Alert[];
}

export interface HostSummary {
  total: number;
  online: number;
  offline: number;
  byPlatform: {
    windows: number;
    mac: number;
    linux: number;
  };
  reducedFunctionality: number;
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
}

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
      expires_at: Date.now() + (data.expires_in * 1000) - 60000,
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

  /**
   * Get alert summary with counts by severity and status (using new Alerts API)
   */
  async getAlertSummary(daysBack = 7, limit = 100): Promise<AlertSummary> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    const filter = `created_timestamp:>='${startDate.toISOString()}'`;

    try {
      // Query alerts using the new Alerts API
      const response = await this.request<{
        resources: Alert[];
        meta: { pagination: { total: number } }
      }>(
        `/alerts/queries/alerts/v2?limit=${limit}&sort=created_timestamp|desc&filter=${encodeURIComponent(filter)}`
      );

      const total = response.meta?.pagination?.total || 0;
      const alerts = response.resources || [];

      if (alerts.length === 0) {
        return {
          total,
          bySeverity: { critical: 0, high: 0, medium: 0, low: 0, informational: 0 },
          byStatus: { new: 0, in_progress: 0, resolved: 0 },
          recentAlerts: [],
        };
      }

      // Get full alert details
      const alertIds = alerts.map(a => a.composite_id || a).filter(Boolean);
      let detailedAlerts = alerts;

      if (alertIds.length > 0 && typeof alertIds[0] === 'string') {
        try {
          const detailsResponse = await this.request<{ resources: Alert[] }>(
            '/alerts/entities/alerts/v2',
            {
              method: 'POST',
              body: JSON.stringify({ composite_ids: alertIds }),
            }
          );
          detailedAlerts = detailsResponse.resources || alerts;
        } catch {
          // Fall back to basic alerts if details fail
        }
      }

      // Count by severity (severity is 1-5 scale or severity_name)
      const bySeverity = {
        critical: detailedAlerts.filter(a => a.severity >= 5 || a.severity_name?.toLowerCase() === 'critical').length,
        high: detailedAlerts.filter(a => a.severity === 4 || a.severity_name?.toLowerCase() === 'high').length,
        medium: detailedAlerts.filter(a => a.severity === 3 || a.severity_name?.toLowerCase() === 'medium').length,
        low: detailedAlerts.filter(a => a.severity === 2 || a.severity_name?.toLowerCase() === 'low').length,
        informational: detailedAlerts.filter(a => a.severity <= 1 || a.severity_name?.toLowerCase() === 'informational').length,
      };

      // Count by status
      const byStatus = {
        new: detailedAlerts.filter(a => a.status === 'new').length,
        in_progress: detailedAlerts.filter(a => a.status === 'in_progress').length,
        resolved: detailedAlerts.filter(a => ['closed', 'true_positive', 'false_positive', 'ignored'].includes(a.status)).length,
      };

      return {
        total,
        bySeverity,
        byStatus,
        recentAlerts: detailedAlerts.slice(0, 10),
      };
    } catch (error) {
      console.warn('Failed to get alerts:', error);
      return {
        total: 0,
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0, informational: 0 },
        byStatus: { new: 0, in_progress: 0, resolved: 0 },
        recentAlerts: [],
      };
    }
  }

  /**
   * Get host/endpoint summary
   */
  async getHostSummary(): Promise<HostSummary> {
    // Get total host count
    const countResponse = await this.request<{ meta: { pagination: { total: number } } }>(
      '/devices/queries/devices/v1?limit=1'
    );

    const total = countResponse.meta?.pagination?.total || 0;

    // Get hosts with details (sample for platform breakdown)
    const hostsResponse = await this.request<{ resources: string[] }>(
      '/devices/queries/devices/v1?limit=500'
    );

    if (!hostsResponse.resources || hostsResponse.resources.length === 0) {
      return {
        total,
        online: 0,
        offline: 0,
        byPlatform: { windows: 0, mac: 0, linux: 0 },
        reducedFunctionality: 0,
      };
    }

    // Get host details
    const detailsResponse = await this.request<{ resources: Host[] }>(
      '/devices/entities/devices/v2',
      {
        method: 'POST',
        body: JSON.stringify({ ids: hostsResponse.resources.slice(0, 100) }),
      }
    );

    const hosts = detailsResponse.resources || [];

    // Calculate time threshold for "online" (seen within last 30 minutes)
    const onlineThreshold = new Date();
    onlineThreshold.setMinutes(onlineThreshold.getMinutes() - 30);

    const online = hosts.filter(h => new Date(h.last_seen) > onlineThreshold).length;
    const offline = hosts.length - online;

    const byPlatform = {
      windows: hosts.filter(h => h.platform_name?.toLowerCase().includes('windows')).length,
      mac: hosts.filter(h => h.platform_name?.toLowerCase().includes('mac')).length,
      linux: hosts.filter(h => h.platform_name?.toLowerCase().includes('linux')).length,
    };

    const reducedFunctionality = hosts.filter(h => h.reduced_functionality_mode === 'yes').length;

    // Scale numbers if we only sampled
    const scaleFactor = total / Math.max(hosts.length, 1);

    return {
      total,
      online: Math.round(online * scaleFactor),
      offline: Math.round(offline * scaleFactor),
      byPlatform: {
        windows: Math.round(byPlatform.windows * scaleFactor),
        mac: Math.round(byPlatform.mac * scaleFactor),
        linux: Math.round(byPlatform.linux * scaleFactor),
      },
      reducedFunctionality: Math.round(reducedFunctionality * scaleFactor),
    };
  }

  /**
   * Get incident summary
   */
  async getIncidentSummary(daysBack = 30): Promise<IncidentSummary> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    const filter = `start:>='${startDate.toISOString()}'`;

    try {
      const idsResponse = await this.request<{ resources: string[]; meta: { pagination: { total: number } } }>(
        `/incidents/queries/incidents/v1?limit=500&sort=start|desc&filter=${encodeURIComponent(filter)}`
      );

      const total = idsResponse.meta?.pagination?.total || 0;

      if (!idsResponse.resources || idsResponse.resources.length === 0) {
        return {
          total,
          open: 0,
          closed: 0,
          bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
        };
      }

      // Get incident details
      const detailsResponse = await this.request<{ resources: Incident[] }>(
        '/incidents/entities/incidents/GET/v1',
        {
          method: 'POST',
          body: JSON.stringify({ ids: idsResponse.resources }),
        }
      );

      const incidents = detailsResponse.resources || [];

      // Status: 20=new, 25=reopened, 30=in_progress, 40=closed
      const open = incidents.filter(i => i.status < 40).length;
      const closed = incidents.filter(i => i.status >= 40).length;

      // fine_score ranges: 1-39=low, 40-59=medium, 60-79=high, 80-100=critical
      const bySeverity = {
        critical: incidents.filter(i => i.fine_score >= 80).length,
        high: incidents.filter(i => i.fine_score >= 60 && i.fine_score < 80).length,
        medium: incidents.filter(i => i.fine_score >= 40 && i.fine_score < 60).length,
        low: incidents.filter(i => i.fine_score < 40).length,
      };

      return { total, open, closed, bySeverity };
    } catch (error) {
      // Incidents API might not be available
      console.warn('Failed to get incidents:', error);
      return {
        total: 0,
        open: 0,
        closed: 0,
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
      };
    }
  }

  /**
   * Get vulnerability summary (Spotlight module)
   */
  async getVulnerabilitySummary(): Promise<{ critical: number; high: number; medium: number; low: number; total: number }> {
    try {
      // Get vulnerability aggregates
      const response = await this.request<{ resources: Array<{ severity: string; count: number }> }>(
        '/spotlight/aggregates/vulnerabilities/GET/v1',
        {
          method: 'POST',
          body: JSON.stringify([{
            name: 'severity',
            type: 'terms',
            field: 'cve.severity',
          }]),
        }
      );

      const buckets = response.resources || [];
      const counts = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        total: 0,
      };

      for (const bucket of buckets) {
        const severity = bucket.severity?.toLowerCase();
        if (severity === 'critical') counts.critical = bucket.count;
        else if (severity === 'high') counts.high = bucket.count;
        else if (severity === 'medium') counts.medium = bucket.count;
        else if (severity === 'low') counts.low = bucket.count;
        counts.total += bucket.count || 0;
      }

      return counts;
    } catch (error) {
      // Spotlight API might not be available
      console.warn('Failed to get vulnerabilities:', error);
      return { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.authenticate();
      return { success: true, message: 'Successfully connected to CrowdStrike API' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to connect',
      };
    }
  }
}
