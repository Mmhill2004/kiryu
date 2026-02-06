import type { Env } from '../../types/env';

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
  category: string;
  vendorInformation: {
    provider: string;
    vendor: string;
  };
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
  createdDateTime: string;
}

export interface SecurityRecommendation {
  id: string;
  name: string;
  severity: string;
  status: string;
}

export interface DeviceCompliance {
  compliant: number;
  nonCompliant: number;
  unknown: number;
}

export interface MicrosoftFullSummary {
  alerts: SecurityAlert[];
  secureScore: SecureScore | null;
  defenderAlerts: DefenderAlert[];
  recommendations: SecurityRecommendation[];
  compliance: DeviceCompliance;
  errors: string[];
  fetchedAt: string;
}

export class MicrosoftClient {
  private graphUrl = 'https://graph.microsoft.com/v1.0';
  private securityUrl = 'https://api.securitycenter.microsoft.com/api';
  private tokens: Map<string, MicrosoftToken> = new Map();

  constructor(private env: Env) {}

  /**
   * Check if Microsoft/Azure credentials are configured
   */
  isConfigured(): boolean {
    return !!(this.env.AZURE_TENANT_ID && this.env.AZURE_CLIENT_ID && this.env.AZURE_CLIENT_SECRET);
  }

  /**
   * Get OAuth2 access token using client credentials flow.
   * Tokens are cached per-scope so multiple APIs can be called without overwriting each other.
   */
  private async authenticate(scope = 'https://graph.microsoft.com/.default'): Promise<string> {
    const cached = this.tokens.get(scope);
    if (cached && cached.expires_at > Date.now()) {
      return cached.access_token;
    }

    const tokenUrl = `https://login.microsoftonline.com/${this.env.AZURE_TENANT_ID}/oauth2/v2.0/token`;

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.env.AZURE_CLIENT_ID,
        client_secret: this.env.AZURE_CLIENT_SECRET,
        scope,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Microsoft authentication failed: ${error}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };

    const token: MicrosoftToken = {
      access_token: data.access_token,
      expires_in: data.expires_in,
      expires_at: Date.now() + (data.expires_in * 1000) - 60000,
    };

    this.tokens.set(scope, token);

    return token.access_token;
  }

  /**
   * Make authenticated request to Microsoft Graph API
   */
  private async graphRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.authenticate();

    const response = await fetch(`${this.graphUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Microsoft Graph API error: ${response.status} ${error}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Make authenticated request to Security Center API
   */
  private async securityRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.authenticate('https://api.securitycenter.microsoft.com/.default');

    const response = await fetch(`${this.securityUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Microsoft Security API error: ${response.status} ${error}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get security alerts from Microsoft Graph Security API
   */
  async getSecurityAlerts(): Promise<SecurityAlert[]> {
    try {
      const response = await this.graphRequest<{ value: SecurityAlert[] }>(
        '/security/alerts_v2?$top=100&$orderby=createdDateTime desc'
      );
      return response.value || [];
    } catch (error) {
      console.warn('Failed to get security alerts:', error);
      return [];
    }
  }

  /**
   * Get Microsoft Secure Score
   */
  async getSecureScore(): Promise<SecureScore | null> {
    try {
      const response = await this.graphRequest<{ value: SecureScore[] }>(
        '/security/secureScores?$top=1'
      );
      return response.value?.[0] || null;
    } catch (error) {
      console.warn('Failed to get secure score:', error);
      return null;
    }
  }

  /**
   * Get Defender for Endpoint alerts
   */
  async getDefenderAlerts(): Promise<DefenderAlert[]> {
    try {
      const response = await this.securityRequest<{ value: DefenderAlert[] }>(
        '/alerts?$top=100&$orderby=createdTime desc'
      );
      return response.value || [];
    } catch (error) {
      console.warn('Failed to get Defender alerts:', error);
      return [];
    }
  }

  /**
   * Get Azure Defender recommendations
   */
  async getSecurityRecommendations(): Promise<SecurityRecommendation[]> {
    try {
      // This requires Azure Resource Manager scope
      const token = await this.authenticate('https://management.azure.com/.default');

      // Use subscription-scoped endpoint if AZURE_SUBSCRIPTION_ID is set, otherwise provider-level
      const baseUrl = this.env.AZURE_SUBSCRIPTION_ID
        ? `https://management.azure.com/subscriptions/${this.env.AZURE_SUBSCRIPTION_ID}/providers/Microsoft.Security/assessments?api-version=2021-06-01`
        : 'https://management.azure.com/providers/Microsoft.Security/assessments?api-version=2021-06-01';

      const response = await fetch(baseUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Azure API error: ${response.status}`);
      }

      const data = await response.json() as { value: Array<{
        id: string;
        name: string;
        properties: { status: { code: string }; metadata: { severity: string } };
      }> };

      return (data.value || []).map(r => ({
        id: r.id,
        name: r.name,
        severity: r.properties?.metadata?.severity || 'unknown',
        status: r.properties?.status?.code || 'unknown',
      }));
    } catch (error) {
      console.warn('Failed to get security recommendations:', error);
      return [];
    }
  }

  /**
   * Get device compliance status
   */
  async getDeviceCompliance(): Promise<DeviceCompliance> {
    try {
      const response = await this.graphRequest<{ value: Array<{ complianceState: string }> }>(
        '/deviceManagement/managedDevices?$select=complianceState'
      );

      const devices = response.value || [];

      return {
        compliant: devices.filter(d => d.complianceState === 'compliant').length,
        nonCompliant: devices.filter(d => d.complianceState === 'noncompliant').length,
        unknown: devices.filter(d => !['compliant', 'noncompliant'].includes(d.complianceState)).length,
      };
    } catch (error) {
      console.warn('Failed to get device compliance:', error);
      return { compliant: 0, nonCompliant: 0, unknown: 0 };
    }
  }

  /**
   * Get full summary from all Microsoft APIs in parallel
   */
  async getFullSummary(): Promise<MicrosoftFullSummary> {
    const errors: string[] = [];

    const [alertsResult, scoreResult, defenderResult, recsResult, complianceResult] =
      await Promise.allSettled([
        this.getSecurityAlerts(),
        this.getSecureScore(),
        this.getDefenderAlerts(),
        this.getSecurityRecommendations(),
        this.getDeviceCompliance(),
      ]);

    const extract = <T>(result: PromiseSettledResult<T>, fallback: T, label: string): T => {
      if (result.status === 'fulfilled') return result.value;
      errors.push(`${label}: ${result.reason}`);
      return fallback;
    };

    return {
      alerts: extract(alertsResult, [], 'Security Alerts'),
      secureScore: extract(scoreResult, null, 'Secure Score'),
      defenderAlerts: extract(defenderResult, [], 'Defender Alerts'),
      recommendations: extract(recsResult, [], 'Recommendations'),
      compliance: extract(complianceResult, { compliant: 0, nonCompliant: 0, unknown: 0 }, 'Device Compliance'),
      errors,
      fetchedAt: new Date().toISOString(),
    };
  }
}
