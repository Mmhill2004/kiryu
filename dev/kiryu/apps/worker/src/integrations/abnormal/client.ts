import type { Env } from '../../types/env';

interface AbnormalThreat {
  threatId: string;
  attackType: string;
  severity: string;
  subject: string;
  receivedTime: string;
  senderEmail: string;
  recipientEmail: string;
  attackStrategy: string;
}

interface AbnormalCase {
  caseId: string;
  status: string;
  severity: string;
  threatIds: string[];
  createdTime: string;
}

export class AbnormalClient {
  private baseUrl: string;

  constructor(private env: Env) {
    this.baseUrl = env.ABNORMAL_BASE_URL || 'https://api.abnormalsecurity.com/v1';
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.env.ABNORMAL_API_TOKEN}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Abnormal API error: ${response.status} ${error}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get recent threats
   */
  async getThreats(pageSize = 100): Promise<AbnormalThreat[]> {
    // Calculate time range for last 24 hours
    const endTime = new Date().toISOString();
    const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const response = await this.request<{ threats: AbnormalThreat[]; nextPageNumber?: number }>(
      `/threats?receivedTimeFilter=${startTime}/${endTime}&pageSize=${pageSize}`
    );

    return response.threats || [];
  }

  /**
   * Get threat details
   */
  async getThreatDetails(threatId: string): Promise<AbnormalThreat> {
    return this.request<AbnormalThreat>(`/threats/${threatId}`);
  }

  /**
   * Get cases (aggregated threats)
   */
  async getCases(): Promise<AbnormalCase[]> {
    const response = await this.request<{ cases: AbnormalCase[] }>('/cases');
    return response.cases || [];
  }

  /**
   * Get threat statistics
   */
  async getStats(): Promise<{
    totalThreats: number;
    byAttackType: Record<string, number>;
    bySeverity: Record<string, number>;
  }> {
    const threats = await this.getThreats(500);
    
    const byAttackType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const threat of threats) {
      byAttackType[threat.attackType] = (byAttackType[threat.attackType] || 0) + 1;
      bySeverity[threat.severity] = (bySeverity[threat.severity] || 0) + 1;
    }

    return {
      totalThreats: threats.length,
      byAttackType,
      bySeverity,
    };
  }
}
