import type { Env } from '../../types/env';

interface AccessAuditLog {
  user_email: string;
  action: string;
  allowed: boolean;
  created_at: string;
  connection: string;
  country: string;
  ip_address: string;
  app_name: string;
  app_domain: string;
}

interface GatewayLog {
  datetime: string;
  user_email: string;
  action: string;
  hostname: string;
  policy_name: string;
  categories: string[];
  location: string;
}

interface SecurityEvent {
  datetime: string;
  action: string;
  host: string;
  client_ip: string;
  ray_id: string;
  rule_id: string;
  rule_message: string;
}

export class CloudflareClient {
  private baseUrl = 'https://api.cloudflare.com/client/v4';

  constructor(private env: Env) {}

  isConfigured(): boolean {
    return !!this.env.CLOUDFLARE_API_TOKEN;
  }

  /**
   * Make authenticated API request to Cloudflare
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20_000);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${this.env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Cloudflare API error: ${response.status} ${error}`);
      }

      const data = await response.json() as { success: boolean; result: T; errors?: Array<{ message: string }> };

      if (!data.success) {
        throw new Error(`Cloudflare API error: ${data.errors?.[0]?.message || 'Unknown error'}`);
      }

      return data.result;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get Access audit logs (authentication events)
   */
  async getAccessLogs(since?: string): Promise<AccessAuditLog[]> {
    const accountId = this.env.CLOUDFLARE_ACCOUNT_ID;
    if (!accountId) {
      console.warn('CLOUDFLARE_ACCOUNT_ID not configured');
      return [];
    }

    const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    try {
      const logs = await this.request<AccessAuditLog[]>(
        `/accounts/${accountId}/access/logs/access_requests?since=${sinceDate}&limit=100`
      );
      return logs || [];
    } catch (error) {
      console.error('Error fetching Access logs:', error);
      return [];
    }
  }

  /**
   * Get Gateway activity logs (DNS/HTTP filtering)
   */
  async getGatewayLogs(since?: string): Promise<GatewayLog[]> {
    const accountId = this.env.CLOUDFLARE_ACCOUNT_ID;
    if (!accountId) {
      console.warn('CLOUDFLARE_ACCOUNT_ID not configured');
      return [];
    }

    const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    try {
      // Gateway logs via GraphQL Analytics API — use variables to prevent injection
      const query = `
        query GatewayLogs($accountTag: string!, $since: Time!) {
          viewer {
            accounts(filter: {accountTag: $accountTag}) {
              gatewayResolverLogs(
                filter: {datetime_gt: $since}
                limit: 100
                orderBy: [datetime_DESC]
              ) {
                datetime
                userEmail
                action
                queryName
                policyName
                categories
                location
              }
            }
          }
        }
      `;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20_000);

      try {
        const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${this.env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            variables: { accountTag: accountId, since: sinceDate },
          }),
        });

        interface GatewayGraphQLResponse {
          data?: {
            viewer?: {
              accounts?: Array<{
                gatewayResolverLogs?: Array<{
                  datetime: string;
                  userEmail: string;
                  action: string;
                  queryName: string;
                  policyName: string;
                  categories: string[];
                  location: string;
                }>;
              }>;
            };
          };
        }

        const data = await response.json() as GatewayGraphQLResponse;
        const logs = data?.data?.viewer?.accounts?.[0]?.gatewayResolverLogs ?? [];

        return logs.map((log) => ({
          datetime: log.datetime,
          user_email: log.userEmail,
          action: log.action,
          hostname: log.queryName,
          policy_name: log.policyName,
          categories: log.categories || [],
          location: log.location,
        }));
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('Error fetching Gateway logs:', error);
      return [];
    }
  }

  /**
   * Get WAF/Security events
   */
  async getSecurityEvents(zoneId?: string): Promise<SecurityEvent[]> {
    const zone = zoneId || this.env.CLOUDFLARE_ZONE_ID;
    if (!zone) {
      console.warn('CLOUDFLARE_ZONE_ID not configured');
      return [];
    }

    try {
      const events = await this.request<SecurityEvent[]>(
        `/zones/${zone}/security/events?per_page=100`
      );
      return events || [];
    } catch (error) {
      console.error('Error fetching security events:', error);
      return [];
    }
  }

  /**
   * Get Access application list
   */
  async getAccessApps(): Promise<Array<{ id: string; name: string; domain: string }>> {
    const accountId = this.env.CLOUDFLARE_ACCOUNT_ID;
    if (!accountId) return [];

    try {
      const apps = await this.request<Array<{ id: string; name: string; domain: string }>>(
        `/accounts/${accountId}/access/apps`
      );
      return apps || [];
    } catch (error) {
      console.error('Error fetching Access apps:', error);
      return [];
    }
  }

  /**
   * Get aggregated stats for dashboard
   */
  async getStats(): Promise<{
    accessLogins: number;
    blockedRequests: number;
    allowedRequests: number;
    uniqueUsers: number;
    byCountry: Record<string, number>;
  }> {
    const accessLogs = await this.getAccessLogs();

    const uniqueUsers = new Set(accessLogs.map(l => l.user_email));
    const byCountry: Record<string, number> = {};
    let blocked = 0;
    let allowed = 0;

    for (const log of accessLogs) {
      if (log.allowed) {
        allowed++;
      } else {
        blocked++;
      }
      if (log.country) {
        byCountry[log.country] = (byCountry[log.country] ?? 0) + 1;
      }
    }

    return {
      accessLogins: accessLogs.length,
      blockedRequests: blocked,
      allowedRequests: allowed,
      uniqueUsers: uniqueUsers.size,
      byCountry,
    };
  }
}
