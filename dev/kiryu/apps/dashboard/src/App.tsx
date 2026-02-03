import { useState } from 'react';
import { Shield, RefreshCw, AlertTriangle, Mail, Globe, Cloud } from 'lucide-react';
import { useDashboard } from './hooks/useDashboard';
import { Card } from './components/Card';
import { SecurityScore } from './components/SecurityScore';
import { ThreatChart } from './components/ThreatChart';
import { IncidentTable } from './components/IncidentTable';
import { PlatformStatus } from './components/PlatformStatus';
import { MetricCard } from './components/MetricCard';
import type { Period } from './types/api';

const periodLabels: Record<Period, string> = {
  '24h': 'Last 24 Hours',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  '90d': 'Last 90 Days',
};

function App() {
  const [period, setPeriod] = useState<Period>('7d');
  const { summary, platforms, incidents, tickets, loading, error, refresh } = useDashboard(period);

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-info" />
          <div>
            <h1 className="text-2xl font-bold text-white">Security Dashboard</h1>
            <p className="text-sm text-slate-400">
              Unified security operations overview
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Period Selector */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="bg-card-bg border border-card-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-info"
          >
            {Object.entries(periodLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {/* Refresh Button */}
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 bg-card-bg border border-card-border rounded-lg px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-critical/10 border border-critical/20 rounded-lg text-critical">
          {error}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Security Score */}
        <Card title="Security Score" className="col-span-12 md:col-span-3">
          <div className="flex justify-center py-4">
            <SecurityScore score={summary?.securityScore ?? 0} />
          </div>
        </Card>

        {/* Threat Metrics */}
        <div className="col-span-12 md:col-span-9 grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Endpoint Threats"
            value={summary?.threatsByCategory.endpoint ?? 0}
            icon={<AlertTriangle className="w-5 h-5" />}
            severity={summary?.threatsByCategory.endpoint ? 'high' : undefined}
          />
          <MetricCard
            label="Email Threats"
            value={summary?.threatsByCategory.email ?? 0}
            icon={<Mail className="w-5 h-5" />}
            severity={summary?.threatsByCategory.email ? 'high' : undefined}
          />
          <MetricCard
            label="Web Threats"
            value={summary?.threatsByCategory.web ?? 0}
            icon={<Globe className="w-5 h-5" />}
            severity={summary?.threatsByCategory.web ? 'medium' : undefined}
          />
          <MetricCard
            label="Cloud Threats"
            value={summary?.threatsByCategory.cloud ?? 0}
            icon={<Cloud className="w-5 h-5" />}
            severity={summary?.threatsByCategory.cloud ? 'medium' : undefined}
          />
        </div>

        {/* Incidents by Severity */}
        <div className="col-span-12 md:col-span-6 grid grid-cols-4 gap-4">
          <MetricCard
            label="Critical"
            value={summary?.incidentsBySeverity.critical ?? 0}
            severity="critical"
          />
          <MetricCard
            label="High"
            value={summary?.incidentsBySeverity.high ?? 0}
            severity="high"
          />
          <MetricCard
            label="Medium"
            value={summary?.incidentsBySeverity.medium ?? 0}
            severity="medium"
          />
          <MetricCard
            label="Low"
            value={summary?.incidentsBySeverity.low ?? 0}
            severity="low"
          />
        </div>

        {/* Ticket Metrics */}
        <div className="col-span-12 md:col-span-6 grid grid-cols-3 gap-4">
          <MetricCard
            label="Open Tickets"
            value={tickets?.metrics.openTickets ?? 0}
          />
          <MetricCard
            label="Avg Resolution"
            value={tickets?.metrics.avgResolutionHours ? `${Math.round(tickets.metrics.avgResolutionHours)}h` : 'N/A'}
          />
          <MetricCard
            label="High Priority"
            value={tickets?.metrics.highPriority ?? 0}
            severity={tickets?.metrics.highPriority ? 'high' : undefined}
          />
        </div>

        {/* Threats by Category Chart */}
        <Card title="Threats by Category" className="col-span-12 md:col-span-4">
          <ThreatChart
            data={summary?.threatsByCategory ?? { endpoint: 0, email: 0, web: 0, cloud: 0 }}
          />
        </Card>

        {/* Recent Incidents */}
        <Card title="Recent Incidents" className="col-span-12 md:col-span-5">
          <IncidentTable incidents={incidents} />
        </Card>

        {/* Platform Status */}
        <Card title="Platform Status" className="col-span-12 md:col-span-3">
          <PlatformStatus platforms={platforms} />
        </Card>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-sm text-slate-500">
        {summary?.lastUpdated && (
          <p>Last updated: {new Date(summary.lastUpdated).toLocaleString()}</p>
        )}
      </footer>
    </div>
  );
}

export default App;
