import type { Env } from '../../types/env';

interface SalesforceCase {
  Id: string;
  CaseNumber: string;
  Subject: string | null;
  Description: string | null;
  Status: string;
  Priority: string | null;
  Type: string | null;
  Reason: string | null;
  Origin: string | null;
  IsClosed: boolean;
  IsEscalated: boolean;
  CreatedDate: string;
  ClosedDate: string | null;
  OwnerId: string;
  Owner?: { Name: string };
  ContactId: string | null;
  Contact?: { Name: string } | null;
  AccountId: string | null;
  Account?: { Name: string } | null;
}

interface PriorityCount {
  Priority: string | null;
  cnt: number;
}

interface OriginCount {
  Origin: string | null;
  cnt: number;
}

interface OwnerCount {
  ownerName: string;
  cnt: number;
}

interface CountResult {
  cnt: number;
}

export interface TicketMetrics {
  openTickets: number;
  ticketsByPriority: Record<string, number>;
  ticketsByOrigin: Record<string, number>;
  mttr: {
    overall: number;
    byPriority: Record<string, number>;
  };
  escalationRate: number;
  slaComplianceRate: number;
  backlogAging: {
    avgAgeHours: number;
    agingBuckets: Record<string, number>;
    oldestTicket: { caseNumber: string; subject: string; ageHours: number } | null;
  };
  weekOverWeek: {
    thisWeek: number;
    lastWeek: number;
    changePercent: number;
  };
  agentWorkload: { name: string; count: number }[];
  recentTickets: Array<{
    id: string;
    caseNumber: string;
    subject: string | null;
    priority: string | null;
    status: string;
    createdDate: string;
    ownerName: string | null;
  }>;
  fetchedAt: string;
}

export class SalesforceClient {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private instanceUrl: string | null = null;
  private readonly apiVersion = 'v59.0';

  constructor(private env: Env) {}

  /**
   * Check if Salesforce is configured
   */
  isConfigured(): boolean {
    return !!(
      this.env.SALESFORCE_INSTANCE_URL &&
      this.env.SALESFORCE_CLIENT_ID &&
      this.env.SALESFORCE_CLIENT_SECRET
    );
  }

  /**
   * Get OAuth access token using Client Credentials flow
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Use instance URL directly for My Domain orgs (most common now)
    // Remove trailing slash if present
    const instanceUrl = this.env.SALESFORCE_INSTANCE_URL.replace(/\/$/, '');

    const response = await fetch(`${instanceUrl}/services/oauth2/token`, {
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
      throw new Error(`Salesforce authentication failed: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      instance_url: string;
      expires_in?: number;
      issued_at?: string;
    };

    this.accessToken = data.access_token;
    this.instanceUrl = data.instance_url || this.env.SALESFORCE_INSTANCE_URL;
    // Refresh 60 seconds before expiry (default 2 hours)
    this.tokenExpiry = Date.now() + ((data.expires_in || 7200) - 60) * 1000;

    return this.accessToken;
  }

  /**
   * Get the instance URL (after authentication)
   */
  private getInstanceUrl(): string {
    return this.instanceUrl || this.env.SALESFORCE_INSTANCE_URL;
  }

  /**
   * Execute a SOQL query
   */
  async query<T>(soql: string): Promise<T[]> {
    const token = await this.getAccessToken();
    const url = `${this.getInstanceUrl()}/services/data/${this.apiVersion}/query?q=${encodeURIComponent(soql)}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SOQL query failed: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as { records: T[]; totalSize: number; done: boolean };
    return data.records;
  }

  /**
   * Get security-related tickets
   */
  async getSecurityTickets(days: number = 30, limit: number = 2000): Promise<SalesforceCase[]> {
    const soql = `
      SELECT
        Id, CaseNumber, Subject, Description, Status, Priority,
        Type, Reason, Origin, IsClosed, IsEscalated,
        CreatedDate, ClosedDate, OwnerId, Owner.Name,
        ContactId, Contact.Name, AccountId, Account.Name
      FROM Case
      WHERE (Type = 'Security Incident' OR Type LIKE '%Security%' OR Type = 'Security'
             OR Subject LIKE '%security%' OR Subject LIKE '%incident%'
             OR Subject LIKE '%breach%' OR Subject LIKE '%malware%' OR Subject LIKE '%phishing%')
        AND CreatedDate >= LAST_N_DAYS:${days}
      ORDER BY CreatedDate DESC
      LIMIT ${limit}
    `;
    return this.query<SalesforceCase>(soql);
  }

  /**
   * Get open tickets grouped by priority
   */
  async getOpenTicketsByPriority(): Promise<PriorityCount[]> {
    const soql = `
      SELECT Priority, COUNT(Id) cnt
      FROM Case
      WHERE IsClosed = false
        AND (Type = 'Security Incident' OR Type LIKE '%Security%' OR Type = 'Security'
             OR Subject LIKE '%security%' OR Subject LIKE '%incident%')
      GROUP BY Priority
    `;
    return this.query<PriorityCount>(soql);
  }

  /**
   * Get tickets grouped by origin/channel
   */
  async getTicketsByOrigin(days: number = 30): Promise<OriginCount[]> {
    const soql = `
      SELECT Origin, COUNT(Id) cnt
      FROM Case
      WHERE (Type = 'Security Incident' OR Type LIKE '%Security%' OR Type = 'Security'
             OR Subject LIKE '%security%' OR Subject LIKE '%incident%')
        AND CreatedDate >= LAST_N_DAYS:${days}
      GROUP BY Origin
    `;
    return this.query<OriginCount>(soql);
  }

  /**
   * Get closed tickets for MTTR calculation
   */
  async getClosedTickets(days: number = 30): Promise<SalesforceCase[]> {
    const soql = `
      SELECT Id, CaseNumber, Priority, CreatedDate, ClosedDate
      FROM Case
      WHERE IsClosed = true
        AND (Type = 'Security Incident' OR Type LIKE '%Security%' OR Type = 'Security'
             OR Subject LIKE '%security%' OR Subject LIKE '%incident%')
        AND ClosedDate >= LAST_N_DAYS:${days}
    `;
    return this.query<SalesforceCase>(soql);
  }

  /**
   * Get open tickets for backlog aging
   */
  async getOpenTickets(): Promise<SalesforceCase[]> {
    const soql = `
      SELECT Id, CaseNumber, Subject, Priority, Status, CreatedDate, Owner.Name
      FROM Case
      WHERE IsClosed = false
        AND (Type = 'Security Incident' OR Type LIKE '%Security%' OR Type = 'Security'
             OR Subject LIKE '%security%' OR Subject LIKE '%incident%')
      ORDER BY CreatedDate ASC
    `;
    return this.query<SalesforceCase>(soql);
  }

  /**
   * Get ticket count for a date range
   */
  async getTicketCount(dateFilter: string): Promise<number> {
    const soql = `
      SELECT COUNT(Id) cnt
      FROM Case
      WHERE (Type = 'Security Incident' OR Type LIKE '%Security%' OR Type = 'Security'
             OR Subject LIKE '%security%' OR Subject LIKE '%incident%')
        AND CreatedDate = ${dateFilter}
    `;
    const result = await this.query<CountResult>(soql);
    return result[0]?.cnt || 0;
  }

  /**
   * Get escalated ticket count
   */
  async getEscalatedCount(days: number = 30): Promise<number> {
    const soql = `
      SELECT COUNT(Id) cnt
      FROM Case
      WHERE IsEscalated = true
        AND (Type = 'Security Incident' OR Type LIKE '%Security%' OR Type = 'Security'
             OR Subject LIKE '%security%' OR Subject LIKE '%incident%')
        AND CreatedDate >= LAST_N_DAYS:${days}
    `;
    const result = await this.query<CountResult>(soql);
    return result[0]?.cnt || 0;
  }

  /**
   * Get agent workload (open tickets per owner)
   */
  async getAgentWorkload(): Promise<OwnerCount[]> {
    const soql = `
      SELECT Owner.Name ownerName, COUNT(Id) cnt
      FROM Case
      WHERE IsClosed = false
        AND (Type = 'Security Incident' OR Type LIKE '%Security%' OR Type = 'Security'
             OR Subject LIKE '%security%' OR Subject LIKE '%incident%')
      GROUP BY Owner.Name
      ORDER BY COUNT(Id) DESC
    `;
    return this.query<OwnerCount>(soql);
  }

  /**
   * Calculate MTTR from closed tickets
   */
  calculateMTTR(tickets: SalesforceCase[]): {
    overall: number;
    byPriority: Record<string, number>;
  } {
    const byPriority: Record<string, number[]> = {};
    const allTimes: number[] = [];

    for (const ticket of tickets) {
      if (!ticket.ClosedDate) continue;

      const created = new Date(ticket.CreatedDate).getTime();
      const closed = new Date(ticket.ClosedDate).getTime();
      const resolutionMinutes = (closed - created) / (1000 * 60);

      allTimes.push(resolutionMinutes);

      const priority = ticket.Priority || 'None';
      if (!byPriority[priority]) byPriority[priority] = [];
      byPriority[priority].push(resolutionMinutes);
    }

    const avg = (arr: number[]) =>
      arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    return {
      overall: avg(allTimes),
      byPriority: Object.fromEntries(
        Object.entries(byPriority).map(([k, v]) => [k, avg(v)])
      ),
    };
  }

  /**
   * Calculate backlog aging metrics
   */
  calculateBacklogAging(tickets: SalesforceCase[]): {
    avgAgeHours: number;
    agingBuckets: Record<string, number>;
    oldestTicket: { caseNumber: string; subject: string; ageHours: number } | null;
  } {
    const now = Date.now();
    const ages = tickets.map((t) => ({
      caseNumber: t.CaseNumber,
      subject: t.Subject || '(No Subject)',
      ageHours: (now - new Date(t.CreatedDate).getTime()) / (1000 * 60 * 60),
    }));

    const buckets = {
      '<24h': 0,
      '24-48h': 0,
      '48-72h': 0,
      '>72h': 0,
    };

    for (const age of ages) {
      if (age.ageHours < 24) buckets['<24h']++;
      else if (age.ageHours < 48) buckets['24-48h']++;
      else if (age.ageHours < 72) buckets['48-72h']++;
      else buckets['>72h']++;
    }

    const avgAgeHours = ages.length
      ? ages.reduce((a, b) => a + b.ageHours, 0) / ages.length
      : 0;

    const first = ages[0];
    const oldestTicket: { caseNumber: string; subject: string; ageHours: number } | null =
      first ?? null;

    return {
      avgAgeHours,
      agingBuckets: buckets,
      oldestTicket,
    };
  }

  /**
   * Get comprehensive dashboard metrics
   */
  async getDashboardMetrics(): Promise<TicketMetrics> {
    // Execute all queries in parallel
    const [
      priorityData,
      originData,
      closedTickets,
      openTickets,
      escalatedCount,
      thisWeekCount,
      lastWeekCount,
      agentWorkload,
    ] = await Promise.all([
      this.getOpenTicketsByPriority(),
      this.getTicketsByOrigin(30),
      this.getClosedTickets(30),
      this.getOpenTickets(),
      this.getEscalatedCount(30),
      this.getTicketCount('THIS_WEEK'),
      this.getTicketCount('LAST_WEEK'),
      this.getAgentWorkload(),
    ]);

    // Calculate derived metrics
    const ticketsByPriority: Record<string, number> = {};
    let totalOpen = 0;
    for (const p of priorityData) {
      const key = p.Priority || 'None';
      ticketsByPriority[key] = p.cnt;
      totalOpen += p.cnt;
    }

    const ticketsByOrigin: Record<string, number> = {};
    for (const o of originData) {
      ticketsByOrigin[o.Origin || 'Unknown'] = o.cnt;
    }

    const mttr = this.calculateMTTR(closedTickets);
    const backlogAging = this.calculateBacklogAging(openTickets);

    // Total tickets in period for escalation rate
    const totalInPeriod = closedTickets.length + openTickets.length;
    const escalationRate = totalInPeriod > 0 ? (escalatedCount / totalInPeriod) * 100 : 0;

    // Week over week change
    const weekOverWeekChange =
      lastWeekCount > 0 ? ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100 : 0;

    // SLA compliance (estimate based on MTTR vs 4-hour target)
    const slaTarget = 240; // 4 hours in minutes
    const ticketsMetSLA = closedTickets.filter((t) => {
      if (!t.ClosedDate) return false;
      const resolution =
        (new Date(t.ClosedDate).getTime() - new Date(t.CreatedDate).getTime()) / (1000 * 60);
      return resolution <= slaTarget;
    }).length;
    const slaComplianceRate =
      closedTickets.length > 0 ? (ticketsMetSLA / closedTickets.length) * 100 : 100;

    // Get recent tickets for the table
    const recentTickets = openTickets.slice(0, 10).map((t) => ({
      id: t.Id,
      caseNumber: t.CaseNumber,
      subject: t.Subject,
      priority: t.Priority,
      status: t.Status,
      createdDate: t.CreatedDate,
      ownerName: t.Owner?.Name || null,
    }));

    return {
      openTickets: totalOpen,
      ticketsByPriority,
      ticketsByOrigin,
      mttr,
      escalationRate,
      slaComplianceRate,
      backlogAging,
      weekOverWeek: {
        thisWeek: thisWeekCount,
        lastWeek: lastWeekCount,
        changePercent: weekOverWeekChange,
      },
      agentWorkload: agentWorkload.map((a) => ({
        name: a.ownerName,
        count: a.cnt,
      })),
      recentTickets,
      fetchedAt: new Date().toISOString(),
    };
  }

  /**
   * Test the connection to Salesforce
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.getAccessToken();
      // Try a simple query to verify API access
      const result = await this.query<{ Id: string }>('SELECT Id FROM Case LIMIT 1');
      return {
        success: true,
        message: `Connected successfully. Found ${result.length} case(s).`,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
