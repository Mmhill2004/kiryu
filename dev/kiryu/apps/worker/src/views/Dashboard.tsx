import type { FC } from 'hono/jsx';
import { Layout } from './Layout';
import { SecurityScore } from './components/SecurityScore';
import { MetricCard } from './components/MetricCard';
import { ThreatChart } from './components/ThreatChart';
import { IncidentTable } from './components/IncidentTable';
import { PlatformStatus } from './components/PlatformStatus';

interface DashboardData {
  summary: {
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
    lastUpdated: string;
  };
  platforms: Array<{
    platform: string;
    status: 'healthy' | 'error' | 'not_configured' | 'unknown';
    last_sync: string | null;
  }>;
  incidents: Array<{
    id: string;
    source: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    status: string;
    created_at: string;
  }>;
  tickets: {
    openTickets: number;
    avgResolutionHours: number;
    highPriority: number;
  };
  period: string;
}

interface Props {
  data: DashboardData;
}

const periodLabels: Record<string, string> = {
  '24h': 'Last 24 Hours',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  '90d': 'Last 90 Days',
};

export const Dashboard: FC<Props> = ({ data }) => {
  const { summary, platforms, incidents, tickets, period } = data;

  return (
    <Layout title="Security Dashboard">
      {/* Header */}
      <header>
        <div class="header-left">
          <svg class="icon shield-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <div>
            <h1>Security Dashboard</h1>
            <p>Unified security operations overview</p>
          </div>
        </div>

        <div class="header-right">
          <form method="get" action="/">
            <select name="period" onchange="this.form.submit()">
              {Object.entries(periodLabels).map(([value, label]) => (
                <option key={value} value={value} selected={value === period}>
                  {label}
                </option>
              ))}
            </select>
          </form>

          <button
            hx-get={`/?period=${period}`}
            hx-target="body"
            hx-swap="outerHTML"
          >
            Refresh
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div class="grid">
        {/* Security Score */}
        <div class="card col-3">
          <div class="card-title">Security Score</div>
          <SecurityScore score={summary.securityScore} />
        </div>

        {/* Threat Metrics */}
        <div class="col-9">
          <div class="metric-grid">
            <MetricCard
              label="Endpoint Threats"
              value={summary.threatsByCategory.endpoint}
              severity={summary.threatsByCategory.endpoint > 0 ? 'high' : undefined}
            />
            <MetricCard
              label="Email Threats"
              value={summary.threatsByCategory.email}
              severity={summary.threatsByCategory.email > 0 ? 'high' : undefined}
            />
            <MetricCard
              label="Web Threats"
              value={summary.threatsByCategory.web}
              severity={summary.threatsByCategory.web > 0 ? 'medium' : undefined}
            />
            <MetricCard
              label="Cloud Threats"
              value={summary.threatsByCategory.cloud}
              severity={summary.threatsByCategory.cloud > 0 ? 'medium' : undefined}
            />
          </div>
        </div>

        {/* Incidents by Severity */}
        <div class="col-6">
          <div class="metric-grid">
            <MetricCard label="Critical" value={summary.incidentsBySeverity.critical} severity="critical" />
            <MetricCard label="High" value={summary.incidentsBySeverity.high} severity="high" />
            <MetricCard label="Medium" value={summary.incidentsBySeverity.medium} severity="medium" />
            <MetricCard label="Low" value={summary.incidentsBySeverity.low} severity="low" />
          </div>
        </div>

        {/* Ticket Metrics */}
        <div class="col-6">
          <div class="metric-grid" style="grid-template-columns: repeat(3, 1fr);">
            <MetricCard label="Open Tickets" value={tickets.openTickets} />
            <MetricCard
              label="Avg Resolution"
              value={tickets.avgResolutionHours ? `${Math.round(tickets.avgResolutionHours)}h` : 'N/A'}
            />
            <MetricCard
              label="High Priority"
              value={tickets.highPriority}
              severity={tickets.highPriority > 0 ? 'high' : undefined}
            />
          </div>
        </div>

        {/* Threats by Category Chart */}
        <div class="card col-4">
          <div class="card-title">Threats by Category</div>
          <ThreatChart data={summary.threatsByCategory} />
        </div>

        {/* Recent Incidents */}
        <div class="card col-5">
          <div class="card-title">Recent Incidents</div>
          <IncidentTable incidents={incidents} />
        </div>

        {/* Platform Status */}
        <div class="card col-3">
          <div class="card-title">Platform Status</div>
          <PlatformStatus platforms={platforms} />
        </div>
      </div>

      {/* Footer */}
      <footer>
        <p>Last updated: {new Date(summary.lastUpdated).toLocaleString()}</p>
      </footer>
    </Layout>
  );
};
