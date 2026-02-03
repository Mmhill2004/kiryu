export interface DashboardSummary {
  period: string;
  dateRange: {
    start: string;
    end: string;
  };
  securityScore: number;
  threatsByCategory: {
    endpoint: number;
    email: number;
    web: number;
    cloud: number;
  };
  incidentsBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  trends: {
    threats: {
      current: number;
      previous: number;
      percentChange: string;
    };
  };
  lastUpdated: string;
}

export interface PlatformStatus {
  platform: string;
  status: 'healthy' | 'error' | 'not_configured' | 'unknown';
  last_sync: string | null;
  error_message?: string;
}

export interface Incident {
  id: string;
  source: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TicketMetrics {
  period: string;
  metrics: {
    totalTickets: number;
    openTickets: number;
    closedTickets: number;
    avgResolutionHours: number;
    highPriority: number;
  };
}

export type Period = '24h' | '7d' | '30d' | '90d';
