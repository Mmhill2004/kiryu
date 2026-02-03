import type { Env } from '../../types/env';

interface MicrosoftToken {
  access_token: string;
  expires_in: number;
  expires_at: number;
}

interface SecurityAlert {
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

interface SecureScore {
  currentScore: number;
  maxScore: number;
  averageComparativeScores: Array<{
    basis: string;
    averageScore: number;
  }>;
}

interface DefenderAlert {
  id: string;
  incidentId: string;
  title: string;
  severity: string;
  status: string;
  classification: string;
  createdDateTime: string;
}

export class MicrosoftClient {
  private graphUrl = 'https://graph.microsoft.com/v1.0';
  private securityUrl = 'https://api.securitycenter.microsoft.com/api';
  private token: MicrosoftToken | null = null;

  constructor(private env: Env) {}

  /**
   * Get OAuth2 access token using client credentials flow
   */
  private async authenticate(scope = 'https://graph.microsoft.com/.default'): Promise<string> {
    if (this.token && this.token.expires_at > Date.now()) {
      return this.token.access_token;
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

    this.token = {
      access_token: data.access_token,
      expires_in: data.expires_in,
      expires_at: Date.now() + (data.expires_in * 1000) - 60000,
    };

    return this.token.access_token;
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
  async getSecurityRecommendations(): Promise<Array<{
    id: string;
    name: string;
    severity: string;
    status: string;
  }>> {
    try {
      // This requires Azure Resource Manager scope
      const token = await this.authenticate('https://management.azure.com/.default');
      
      const response = await fetch(
        'https://management.azure.com/providers/Microsoft.Security/assessments?api-version=2021-06-01',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

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
  async getDeviceCompliance(): Promise<{
    compliant: number;
    nonCompliant: number;
    unknown: number;
  }> {
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
}
