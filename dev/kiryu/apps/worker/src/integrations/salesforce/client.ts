import type { Env } from '../../types/env';

interface SalesforceToken {
  access_token: string;
  instance_url: string;
  expires_at: number;
}

interface SalesforceCase {
  Id: string;
  CaseNumber: string;
  Subject: string;
  Description: string;
  Status: string;
  Priority: string;
  Type: string;
  CreatedDate: string;
  ClosedDate: string | null;
  OwnerId: string;
  ContactId: string;
}

interface CaseMetrics {
  totalCases: number;
  openCases: number;
  closedCases: number;
  avgResolutionHours: number;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
}

export class SalesforceClient {
  private token: SalesforceToken | null = null;

  constructor(private env: Env) {}

  /**
   * Authenticate using OAuth2 Username-Password flow
   * For production, consider using JWT Bearer flow
   */
  private async authenticate(): Promise<SalesforceToken> {
    if (this.token && this.token.expires_at > Date.now()) {
      return this.token;
    }

    // For JWT Bearer flow (recommended for server-to-server)
    // You would need to implement JWT signing here
    // This example uses the simpler client credentials flow
    
    const loginUrl = this.env.SALESFORCE_INSTANCE_URL.includes('sandbox')
      ? 'https://test.salesforce.com'
      : 'https://login.salesforce.com';

    const response = await fetch(`${loginUrl}/services/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.env.SALESFORCE_CLIENT_ID,
        client_secret: this.env.SALESFORCE_CLIENT_SECRET,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Salesforce authentication failed: ${error}`);
    }

    const data = await response.json() as { 
      access_token: string; 
      instance_url: string;
      issued_at: string;
    };

    this.token = {
      access_token: data.access_token,
      instance_url: data.instance_url,
      expires_at: Date.now() + (2 * 60 * 60 * 1000), // 2 hour expiry
    };

    return this.token;
  }

  /**
   * Execute SOQL query
   */
  private async query<T>(soql: string): Promise<T[]> {
    const token = await this.authenticate();
    const encodedQuery = encodeURIComponent(soql);

    const response = await fetch(
      `${token.instance_url}/services/data/v59.0/query/?q=${encodedQuery}`,
      {
        headers: {
          'Authorization': `Bearer ${token.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Salesforce query failed: ${error}`);
    }

    const data = await response.json() as { records: T[]; totalSize: number };
    return data.records;
  }

  /**
   * Get security-related tickets
   * Filters by record type or custom field if configured
   */
  async getSecurityTickets(days = 30): Promise<SalesforceCase[]> {
    const dateFilter = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    // Customize this query based on your Salesforce setup
    // You might filter by RecordType, custom fields, or specific queues
    const soql = `
      SELECT 
        Id, CaseNumber, Subject, Description, Status, Priority, Type,
        CreatedDate, ClosedDate, OwnerId, ContactId
      FROM Case
      WHERE CreatedDate >= ${dateFilter}
        AND (
          Type = 'Security'
          OR Subject LIKE '%security%'
          OR Subject LIKE '%incident%'
          OR Subject LIKE '%breach%'
          OR Subject LIKE '%malware%'
          OR Subject LIKE '%phishing%'
        )
      ORDER BY CreatedDate DESC
      LIMIT 500
    `;

    try {
      return await this.query<SalesforceCase>(soql);
    } catch (error) {
      console.warn('Failed to get security tickets:', error);
      return [];
    }
  }

  /**
   * Get all open cases
   */
  async getOpenCases(): Promise<SalesforceCase[]> {
    const soql = `
      SELECT 
        Id, CaseNumber, Subject, Status, Priority, CreatedDate, OwnerId
      FROM Case
      WHERE IsClosed = false
      ORDER BY Priority DESC, CreatedDate ASC
      LIMIT 200
    `;

    return this.query<SalesforceCase>(soql);
  }

  /**
   * Get case metrics
   */
  async getCaseMetrics(days = 30): Promise<CaseMetrics> {
    const dateFilter = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    // Get case counts by status
    const statusQuery = `
      SELECT Status, COUNT(Id) cnt
      FROM Case
      WHERE CreatedDate >= ${dateFilter}
      GROUP BY Status
    `;

    // Get case counts by priority
    const priorityQuery = `
      SELECT Priority, COUNT(Id) cnt
      FROM Case
      WHERE CreatedDate >= ${dateFilter}
      GROUP BY Priority
    `;

    // Get closed cases with resolution time
    const resolutionQuery = `
      SELECT Id, CreatedDate, ClosedDate
      FROM Case
      WHERE CreatedDate >= ${dateFilter}
        AND IsClosed = true
        AND ClosedDate != null
      LIMIT 1000
    `;

    try {
      const [statusResults, priorityResults, closedCases] = await Promise.all([
        this.query<{ Status: string; cnt: number }>(statusQuery),
        this.query<{ Priority: string; cnt: number }>(priorityQuery),
        this.query<{ Id: string; CreatedDate: string; ClosedDate: string }>(resolutionQuery),
      ]);

      // Calculate metrics
      const byStatus: Record<string, number> = {};
      let totalCases = 0;
      let openCases = 0;
      let closedCount = 0;

      for (const row of statusResults) {
        byStatus[row.Status] = row.cnt;
        totalCases += row.cnt;
        if (row.Status === 'Closed') {
          closedCount = row.cnt;
        } else {
          openCases += row.cnt;
        }
      }

      const byPriority: Record<string, number> = {};
      for (const row of priorityResults) {
        byPriority[row.Priority] = row.cnt;
      }

      // Calculate average resolution time
      let totalResolutionHours = 0;
      for (const case_ of closedCases) {
        const created = new Date(case_.CreatedDate).getTime();
        const closed = new Date(case_.ClosedDate).getTime();
        totalResolutionHours += (closed - created) / (1000 * 60 * 60);
      }

      const avgResolutionHours = closedCases.length > 0
        ? totalResolutionHours / closedCases.length
        : 0;

      return {
        totalCases,
        openCases,
        closedCases: closedCount,
        avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
        byPriority,
        byStatus,
      };
    } catch (error) {
      console.warn('Failed to get case metrics:', error);
      return {
        totalCases: 0,
        openCases: 0,
        closedCases: 0,
        avgResolutionHours: 0,
        byPriority: {},
        byStatus: {},
      };
    }
  }

  /**
   * Get SLA compliance metrics
   */
  async getSLACompliance(): Promise<{
    totalCases: number;
    withinSLA: number;
    breachedSLA: number;
    complianceRate: number;
  }> {
    // This assumes you have SLA fields on your Case object
    // Adjust the query based on your Salesforce configuration
    const soql = `
      SELECT 
        COUNT(Id) total,
        SUM(CASE WHEN IsClosed = true AND ClosedDate <= SLA_Due_Date__c THEN 1 ELSE 0 END) within_sla
      FROM Case
      WHERE CreatedDate >= LAST_N_DAYS:30
        AND SLA_Due_Date__c != null
    `;

    try {
      const results = await this.query<{ total: number; within_sla: number }>(soql);
      const data = results[0] || { total: 0, within_sla: 0 };
      
      return {
        totalCases: data.total,
        withinSLA: data.within_sla,
        breachedSLA: data.total - data.within_sla,
        complianceRate: data.total > 0 
          ? Math.round((data.within_sla / data.total) * 100) 
          : 100,
      };
    } catch (error) {
      // SLA fields might not exist
      console.warn('SLA fields not configured:', error);
      return {
        totalCases: 0,
        withinSLA: 0,
        breachedSLA: 0,
        complianceRate: 100,
      };
    }
  }
}
