import type { FC } from 'hono/jsx';
import { Layout } from './Layout';
import { SecurityScore } from './components/SecurityScore';
import { MetricCard } from './components/MetricCard';
import { ThreatChart } from './components/ThreatChart';
import { PlatformStatus } from './components/PlatformStatus';
import type { AlertSummary, HostSummary, IncidentSummary, ZTASummary, NGSIEMSummary, OverWatchSummary } from '../integrations/crowdstrike/client';
import type { TicketMetrics } from '../integrations/salesforce/client';
import type { MicrosoftFullSummary } from '../integrations/microsoft/client';
import type { CrowdStrikeTrends, SalesforceTrends } from '../services/trends';

interface DashboardData {
  crowdstrike: {
    alerts: AlertSummary;
    hosts: HostSummary;
    incidents: IncidentSummary;
    zta: ZTASummary;
    ngsiem: NGSIEMSummary;
    overwatch: OverWatchSummary;
    fetchedAt: string;
    errors?: string[];
  } | null;
  salesforce: TicketMetrics | null;
  microsoft: MicrosoftFullSummary | null;
  platforms: Array<{
    platform: string;
    status: 'healthy' | 'error' | 'not_configured' | 'unknown';
    last_sync: string | null;
    error_message?: string;
  }>;
  period: string;
  lastUpdated: string;
  dataSource: 'cache' | 'live';
  cachedAt: string | null;
  csTrends: CrowdStrikeTrends | null;
  sfTrends: SalesforceTrends | null;
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

// Helper to format minutes to human readable
const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`;
  return `${(minutes / 1440).toFixed(1)}d`;
};

export const Dashboard: FC<Props> = ({ data }) => {
  const { crowdstrike, salesforce, microsoft, platforms, period, lastUpdated, dataSource, cachedAt, csTrends, sfTrends } = data;

  // Calculate security score from CrowdStrike data
  let securityScore = 100;
  if (crowdstrike) {
    const alerts = crowdstrike.alerts;
    const criticalWeight = 10;
    const highWeight = 5;
    const mediumWeight = 2;
    const lowWeight = 1;
    const totalWeight =
      alerts.bySeverity.critical * criticalWeight +
      alerts.bySeverity.high * highWeight +
      alerts.bySeverity.medium * mediumWeight +
      alerts.bySeverity.low * lowWeight;
    securityScore = Math.max(0, Math.min(100, 100 - totalWeight));
  }
  if (microsoft) {
    const aa = microsoft.alertAnalytics;
    const da = microsoft.defenderAnalytics;
    const msWeight =
      (aa.bySeverity.high + da.bySeverity.high) * 5 +
      (aa.bySeverity.medium + da.bySeverity.medium) * 2 +
      (aa.bySeverity.low + da.bySeverity.low) * 1;
    securityScore = Math.max(0, Math.min(100, securityScore - msWeight));
  }

  return (
    <Layout title="Security Dashboard">
      {/* Header */}
      <header>
        <div class="header-left">
          <div class="logo-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <div class="header-title">
            <h1>Security Operations</h1>
            <p>
              CrowdStrike Falcon &bull; Salesforce Service Cloud
              {microsoft && <> &bull; Microsoft Security</>}
            </p>
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

          <a href="/api/reports/latest" class="report-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Report
          </a>

          <button
            hx-get={`/?period=${period}&refresh=true`}
            hx-target="body"
            hx-swap="outerHTML"
            class="refresh-btn"
          >
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Refresh
          </button>
        </div>
      </header>

      {/* Error/Warning banners */}
      {(() => {
        const csStatus = platforms.find(p => p.platform === 'crowdstrike');
        const sfStatus = platforms.find(p => p.platform === 'salesforce');
        const hasErrors = platforms.some(p => p.status === 'error');
        const hasPartialErrors = (crowdstrike?.errors && crowdstrike.errors.length > 0) || (microsoft?.errors && microsoft.errors.length > 0);
        const allNotConfigured = !crowdstrike && !salesforce && !microsoft && !hasErrors;

        if (allNotConfigured) {
          return (
            <div class="error-banner">
              No platforms configured. Configure CrowdStrike or Salesforce credentials to see data.
            </div>
          );
        }

        if (hasErrors || hasPartialErrors) {
          return (
            <div class="error-banner" style="background: #fef3c7; border-color: #f59e0b;">
              <strong>Warning:</strong> Some data could not be loaded.
              {csStatus?.status === 'error' && (
                <div style="margin-top: 0.5rem;">
                  <strong>CrowdStrike:</strong> {csStatus.error_message || 'Unknown error'}
                </div>
              )}
              {hasPartialErrors && crowdstrike?.errors?.map((err, i) => (
                <div style="margin-top: 0.5rem;" key={i}>
                  <strong>CrowdStrike API:</strong> {err}
                </div>
              ))}
              {sfStatus?.status === 'error' && (
                <div style="margin-top: 0.5rem;">
                  <strong>Salesforce:</strong> {sfStatus.error_message || 'Unknown error'}
                </div>
              )}
              {(() => {
                const msStatus = platforms.find(p => p.platform === 'microsoft');
                return msStatus?.status === 'error' ? (
                  <div style="margin-top: 0.5rem;">
                    <strong>Microsoft:</strong> {msStatus.error_message || 'Unknown error'}
                  </div>
                ) : null;
              })()}
              {microsoft?.errors && microsoft.errors.length > 0 && microsoft.errors.map((err, i) => (
                <div style="margin-top: 0.5rem;" key={`ms-${i}`}>
                  <strong>Microsoft API:</strong> {err}
                </div>
              ))}
            </div>
          );
        }

        return null;
      })()}

      {crowdstrike || salesforce || microsoft ? (
        <>
          {/* Main Grid */}
          <div class="grid">
            {/* Row 1: Security Score + Host Overview */}
            {crowdstrike && (
              <>
                <div class="card col-3">
                  <div class="card-title">Security Score</div>
                  <SecurityScore score={securityScore} />
                </div>

                <div class="col-9">
                  <div class="card-title" style="margin-bottom: 1rem;">Endpoint Overview</div>
                  <div class="metric-grid">
                    <MetricCard
                      label="Total Endpoints"
                      value={crowdstrike.hosts.total}
                      trend={csTrends?.hostsTotal ? { ...csTrends.hostsTotal, invertColor: true } : undefined}
                      source="CS"
                    />
                    <MetricCard
                      label="Online"
                      value={crowdstrike.hosts.online}
                      severity={crowdstrike.hosts.online > 0 ? undefined : 'medium'}
                      trend={csTrends?.hostsOnline ? { ...csTrends.hostsOnline, invertColor: true } : undefined}
                      source="CS"
                    />
                    <MetricCard
                      label="Contained"
                      value={crowdstrike.hosts.contained}
                      severity={crowdstrike.hosts.contained > 0 ? 'critical' : undefined}
                      source="CS"
                    />
                    <MetricCard
                      label="Stale (7+ days)"
                      value={crowdstrike.hosts.staleEndpoints}
                      severity={crowdstrike.hosts.staleEndpoints > 0 ? 'medium' : undefined}
                      source="CS"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Row 2: Alerts by Severity (CrowdStrike) */}
            {crowdstrike && (
              <div class="col-12">
                <div class="card-title" style="margin-bottom: 1rem;">Active Alerts by Severity</div>
                <div class="metric-grid" style="grid-template-columns: repeat(5, 1fr);">
                  <MetricCard
                    label="Critical"
                    value={crowdstrike.alerts.bySeverity.critical}
                    severity="critical"
                    trend={csTrends?.alertsCritical}
                    source="CS"
                  />
                  <MetricCard
                    label="High"
                    value={crowdstrike.alerts.bySeverity.high}
                    severity="high"
                    source="CS"
                  />
                  <MetricCard
                    label="Medium"
                    value={crowdstrike.alerts.bySeverity.medium}
                    severity="medium"
                    source="CS"
                  />
                  <MetricCard
                    label="Low"
                    value={crowdstrike.alerts.bySeverity.low}
                    severity="low"
                    source="CS"
                  />
                  <MetricCard
                    label="Informational"
                    value={crowdstrike.alerts.bySeverity.informational}
                    source="CS"
                  />
                </div>
              </div>
            )}

            {/* Row 2b: Alerts by Status (CrowdStrike) */}
            {crowdstrike && (
              <div class="col-12">
                <div class="card-title" style="margin-bottom: 1rem;">Alert Status</div>
                <div class="metric-grid" style="grid-template-columns: repeat(4, 1fr);">
                  <MetricCard
                    label="Total Alerts"
                    value={crowdstrike.alerts.total}
                    trend={csTrends?.alertsTotal}
                    source="CS"
                  />
                  <MetricCard
                    label="New"
                    value={crowdstrike.alerts.byStatus.new}
                    severity={crowdstrike.alerts.byStatus.new > 0 ? 'high' : undefined}
                    source="CS"
                  />
                  <MetricCard
                    label="In Progress"
                    value={crowdstrike.alerts.byStatus.in_progress}
                    severity={crowdstrike.alerts.byStatus.in_progress > 0 ? 'medium' : undefined}
                    source="CS"
                  />
                  <MetricCard
                    label="Resolved"
                    value={crowdstrike.alerts.byStatus.resolved}
                    source="CS"
                  />
                </div>
              </div>
            )}

            {/* Row 3: Salesforce Service Desk KPIs */}
            {salesforce && (
              <div class="col-12">
                <div class="card-title" style="margin-bottom: 1rem;">Service Desk Metrics</div>
                <div class="metric-grid" style="grid-template-columns: repeat(6, 1fr);">
                  <MetricCard
                    label="Open Tickets"
                    value={salesforce.openTickets}
                    severity={salesforce.openTickets > 10 ? 'high' : salesforce.openTickets > 5 ? 'medium' : undefined}
                    trend={sfTrends?.openTickets}
                    source="SF"
                  />
                  <MetricCard
                    label="MTTR"
                    value={formatDuration(salesforce.mttr.overall)}
                    severity={salesforce.mttr.overall > 240 ? 'high' : salesforce.mttr.overall > 120 ? 'medium' : undefined}
                    trend={sfTrends?.mttrOverall}
                    source="SF"
                  />
                  <MetricCard
                    label="SLA Compliance"
                    value={`${salesforce.slaComplianceRate.toFixed(0)}%`}
                    severity={salesforce.slaComplianceRate < 90 ? 'critical' : salesforce.slaComplianceRate < 95 ? 'medium' : undefined}
                    trend={sfTrends?.slaCompliance ? { ...sfTrends.slaCompliance, invertColor: true } : undefined}
                    source="SF"
                  />
                  <MetricCard
                    label="Escalation Rate"
                    value={`${salesforce.escalationRate.toFixed(1)}%`}
                    severity={salesforce.escalationRate > 15 ? 'high' : salesforce.escalationRate > 10 ? 'medium' : undefined}
                    trend={sfTrends?.escalationRate}
                    source="SF"
                  />
                  <MetricCard
                    label="Backlog Age"
                    value={`${salesforce.backlogAging.avgAgeHours.toFixed(0)}h`}
                    severity={salesforce.backlogAging.avgAgeHours > 72 ? 'critical' : salesforce.backlogAging.avgAgeHours > 48 ? 'medium' : undefined}
                    source="SF"
                  />
                  <MetricCard
                    label="Week Trend"
                    value={`${salesforce.weekOverWeek.changePercent >= 0 ? '+' : ''}${salesforce.weekOverWeek.changePercent.toFixed(0)}%`}
                    severity={salesforce.weekOverWeek.changePercent > 20 ? 'high' : salesforce.weekOverWeek.changePercent > 10 ? 'medium' : undefined}
                    source="SF"
                  />
                </div>
              </div>
            )}

            {/* ═══ Microsoft Security ═══ */}
            {microsoft && (
              <>
                {/* MS Row 1: Top-Level KPIs */}
                <div class="col-12">
                  <div class="card-title" style="margin-bottom: 1rem;">Microsoft Security</div>
                  <div class="metric-grid" style="grid-template-columns: repeat(6, 1fr);">
                    <MetricCard
                      label="Secure Score"
                      value={microsoft.secureScore
                        ? `${((microsoft.secureScore.currentScore / microsoft.secureScore.maxScore) * 100).toFixed(0)}%`
                        : 'N/A'}
                      source="MS"
                    />
                    <MetricCard
                      label="Active Alerts"
                      value={microsoft.alertAnalytics.active}
                      severity={microsoft.alertAnalytics.bySeverity.high > 0 ? 'high' : undefined}
                      source="MS"
                    />
                    <MetricCard
                      label="Risky Users"
                      value={microsoft.identity.riskyUsers.unresolvedCount}
                      severity={microsoft.identity.riskyUsers.byRiskLevel.high > 0 ? 'critical' : microsoft.identity.riskyUsers.unresolvedCount > 0 ? 'high' : undefined}
                      source="MS"
                    />
                    <MetricCard
                      label="Open Incidents"
                      value={microsoft.incidents.open}
                      severity={microsoft.incidents.bySeverity.high > 0 ? 'high' : undefined}
                      source="MS"
                    />
                    <MetricCard
                      label="Managed Endpoints"
                      value={microsoft.machines.total}
                      source="MS"
                    />
                    <MetricCard
                      label="Cloud Pass Rate"
                      value={`${microsoft.assessments.passRate}%`}
                      severity={microsoft.assessments.passRate < 70 ? 'critical' : microsoft.assessments.passRate < 85 ? 'medium' : undefined}
                      source="MS"
                    />
                  </div>
                </div>

                {/* MS Row 2: Entra Alert Breakdown + Defender Breakdown + Identity Risk */}
                <div class="card col-4">
                  <div class="card-title">Entra Security Alerts ({microsoft.alertAnalytics.total})</div>
                  <div class="stat-row">
                    <span class="stat-label">Active</span>
                    <span class="stat-value severity-high">{microsoft.alertAnalytics.active}</span>
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">New Today</span>
                    <span class="stat-value">{microsoft.alertAnalytics.newToday}</span>
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">Unassigned</span>
                    <span class="stat-value severity-medium">{microsoft.alertAnalytics.unassigned}</span>
                  </div>
                  <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-subtle);">
                    <div class="stat-label" style="margin-bottom: 0.5rem;">By Severity:</div>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                      <span class="badge badge-critical">High: {microsoft.alertAnalytics.bySeverity.high}</span>
                      <span class="badge badge-medium">Medium: {microsoft.alertAnalytics.bySeverity.medium}</span>
                      <span class="badge badge-low">Low: {microsoft.alertAnalytics.bySeverity.low}</span>
                      <span class="badge badge-info">Info: {microsoft.alertAnalytics.bySeverity.informational}</span>
                    </div>
                  </div>
                  {Object.keys(microsoft.alertAnalytics.byCategory).length > 0 && (
                    <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-subtle);">
                      <div class="stat-label" style="margin-bottom: 0.5rem;">Top Categories:</div>
                      {Object.entries(microsoft.alertAnalytics.byCategory)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 4)
                        .map(([cat, count]) => (
                          <div class="stat-row" key={cat}>
                            <span class="stat-label">{cat}</span>
                            <span class="stat-value">{count}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div class="card col-4">
                  <div class="card-title">Defender for Endpoint ({microsoft.defenderAnalytics.total})</div>
                  <div class="stat-row">
                    <span class="stat-label">Active</span>
                    <span class="stat-value severity-high">{microsoft.defenderAnalytics.active}</span>
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">Linked to Incidents</span>
                    <span class="stat-value">{microsoft.defenderAnalytics.linkedToIncidents}</span>
                  </div>
                  <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-subtle);">
                    <div class="stat-label" style="margin-bottom: 0.5rem;">By Severity:</div>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                      <span class="badge badge-critical">High: {microsoft.defenderAnalytics.bySeverity.high}</span>
                      <span class="badge badge-medium">Medium: {microsoft.defenderAnalytics.bySeverity.medium}</span>
                      <span class="badge badge-low">Low: {microsoft.defenderAnalytics.bySeverity.low}</span>
                      <span class="badge badge-info">Info: {microsoft.defenderAnalytics.bySeverity.informational}</span>
                    </div>
                  </div>
                  {Object.keys(microsoft.defenderAnalytics.byDetectionSource).length > 0 && (
                    <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-subtle);">
                      <div class="stat-label" style="margin-bottom: 0.5rem;">Detection Sources:</div>
                      {Object.entries(microsoft.defenderAnalytics.byDetectionSource)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 4)
                        .map(([src, count]) => (
                          <div class="stat-row" key={src}>
                            <span class="stat-label">{src}</span>
                            <span class="stat-value">{count}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div class="card col-4">
                  <div class="card-title">Identity Risk</div>
                  {microsoft.identity.riskyUsers.total > 0 ? (
                    <>
                      <div class="stat-row">
                        <span class="stat-label">Total Risky Users</span>
                        <span class="stat-value">{microsoft.identity.riskyUsers.total}</span>
                      </div>
                      <div class="stat-row">
                        <span class="stat-label">Unresolved</span>
                        <span class="stat-value severity-critical">{microsoft.identity.riskyUsers.unresolvedCount}</span>
                      </div>
                      <div class="stat-row">
                        <span class="stat-label">Confirmed Compromised</span>
                        <span class="stat-value severity-critical">{microsoft.identity.riskyUsers.byRiskState.confirmedCompromised}</span>
                      </div>
                      <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-subtle);">
                        <div class="stat-label" style="margin-bottom: 0.5rem;">By Risk Level:</div>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                          <span class="badge badge-critical">High: {microsoft.identity.riskyUsers.byRiskLevel.high}</span>
                          <span class="badge badge-medium">Medium: {microsoft.identity.riskyUsers.byRiskLevel.medium}</span>
                          <span class="badge badge-low">Low: {microsoft.identity.riskyUsers.byRiskLevel.low}</span>
                        </div>
                      </div>
                      <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-subtle);">
                        <div class="stat-label" style="margin-bottom: 0.5rem;">By State:</div>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                          <span class="badge badge-critical">At Risk: {microsoft.identity.riskyUsers.byRiskState.atRisk}</span>
                          <span class="badge badge-low">Remediated: {microsoft.identity.riskyUsers.byRiskState.remediated}</span>
                          <span class="badge badge-info">Dismissed: {microsoft.identity.riskyUsers.byRiskState.dismissed}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p class="no-data">No risky users detected</p>
                  )}
                </div>

                {/* MS Row 3: Incidents + Machines + Assessments/Compliance */}
                <div class="card col-4">
                  <div class="card-title">Security Incidents ({microsoft.incidents.total})</div>
                  {microsoft.incidents.total > 0 ? (
                    <>
                      <div class="stat-row">
                        <span class="stat-label">Open</span>
                        <span class="stat-value severity-high">{microsoft.incidents.open}</span>
                      </div>
                      <div class="stat-row">
                        <span class="stat-label">Unassigned</span>
                        <span class="stat-value severity-medium">{microsoft.incidents.unassigned}</span>
                      </div>
                      <div class="stat-row">
                        <span class="stat-label">Redirected</span>
                        <span class="stat-value">{microsoft.incidents.redirected}</span>
                      </div>
                      <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-subtle);">
                        <div class="stat-label" style="margin-bottom: 0.5rem;">By Severity:</div>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                          <span class="badge badge-critical">High: {microsoft.incidents.bySeverity.high}</span>
                          <span class="badge badge-medium">Medium: {microsoft.incidents.bySeverity.medium}</span>
                          <span class="badge badge-low">Low: {microsoft.incidents.bySeverity.low}</span>
                        </div>
                      </div>
                      {Object.keys(microsoft.incidents.byDetermination).length > 0 && (
                        <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-subtle);">
                          <div class="stat-label" style="margin-bottom: 0.5rem;">By Determination:</div>
                          {Object.entries(microsoft.incidents.byDetermination)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 4)
                            .map(([det, count]) => (
                              <div class="stat-row" key={det}>
                                <span class="stat-label">{det}</span>
                                <span class="stat-value">{count}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p class="no-data">No incidents</p>
                  )}
                </div>

                <div class="card col-4">
                  <div class="card-title">Defender Machines ({microsoft.machines.total})</div>
                  {microsoft.machines.total > 0 ? (
                    <>
                      <div class="stat-row">
                        <span class="stat-label">Onboarded</span>
                        <span class="stat-value">{microsoft.machines.onboarded}</span>
                      </div>
                      <div class="stat-row">
                        <span class="stat-label">Stale (7+ days)</span>
                        <span class="stat-value severity-medium">{microsoft.machines.stale}</span>
                      </div>
                      <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-subtle);">
                        <div class="stat-label" style="margin-bottom: 0.5rem;">By Risk Score:</div>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                          <span class="badge badge-critical">High: {microsoft.machines.byRiskScore.high}</span>
                          <span class="badge badge-medium">Medium: {microsoft.machines.byRiskScore.medium}</span>
                          <span class="badge badge-low">Low: {microsoft.machines.byRiskScore.low}</span>
                          <span class="badge badge-info">None: {microsoft.machines.byRiskScore.none}</span>
                        </div>
                      </div>
                      <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-subtle);">
                        <div class="stat-label" style="margin-bottom: 0.5rem;">By Exposure:</div>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                          <span class="badge badge-critical">High: {microsoft.machines.byExposureLevel.high}</span>
                          <span class="badge badge-medium">Medium: {microsoft.machines.byExposureLevel.medium}</span>
                          <span class="badge badge-low">Low: {microsoft.machines.byExposureLevel.low}</span>
                        </div>
                      </div>
                      {Object.keys(microsoft.machines.byOsPlatform).length > 0 && (
                        <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-subtle);">
                          <div class="stat-label" style="margin-bottom: 0.5rem;">By OS:</div>
                          {Object.entries(microsoft.machines.byOsPlatform)
                            .sort((a, b) => b[1] - a[1])
                            .map(([os, count]) => (
                              <div class="stat-row" key={os}>
                                <span class="stat-label">{os}</span>
                                <span class="stat-value">{count}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p class="no-data">No machines data</p>
                  )}
                </div>

                <div class="card col-4">
                  <div class="card-title">Cloud Security &amp; Compliance</div>
                  {/* Secure Score */}
                  {microsoft.secureScore && (
                    <>
                      <div class="stat-row">
                        <span class="stat-label">Secure Score</span>
                        <span class="stat-value">{microsoft.secureScore.currentScore.toFixed(1)} / {microsoft.secureScore.maxScore.toFixed(1)}</span>
                      </div>
                      {microsoft.secureScore.averageComparativeScores.length > 0 &&
                        microsoft.secureScore.averageComparativeScores.map((comp) => (
                          <div class="stat-row" key={comp.basis}>
                            <span class="stat-label">vs {comp.basis}</span>
                            <span class="stat-value">{comp.averageScore.toFixed(1)}</span>
                          </div>
                        ))
                      }
                    </>
                  )}
                  {/* Assessments */}
                  <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-subtle);">
                    <div class="stat-label" style="margin-bottom: 0.5rem;">Cloud Assessments ({microsoft.assessments.total}):</div>
                    <div class="stat-row">
                      <span class="stat-label">Pass Rate</span>
                      <span class={`stat-value ${microsoft.assessments.passRate < 70 ? 'severity-critical' : microsoft.assessments.passRate < 85 ? 'severity-medium' : ''}`}>
                        {microsoft.assessments.passRate}%
                      </span>
                    </div>
                    <div class="stat-row">
                      <span class="stat-label">Healthy</span>
                      <span class="stat-value">{microsoft.assessments.healthy}</span>
                    </div>
                    <div class="stat-row">
                      <span class="stat-label">Unhealthy</span>
                      <span class="stat-value severity-high">{microsoft.assessments.unhealthy}</span>
                    </div>
                  </div>
                  {/* Device Compliance */}
                  {(microsoft.compliance.compliant + microsoft.compliance.nonCompliant + microsoft.compliance.unknown) > 0 && (
                    <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-subtle);">
                      <div class="stat-label" style="margin-bottom: 0.5rem;">Device Compliance:</div>
                      <div class="stat-row">
                        <span class="stat-label">Compliant</span>
                        <span class="stat-value">{microsoft.compliance.compliant}</span>
                      </div>
                      <div class="stat-row">
                        <span class="stat-label">Non-Compliant</span>
                        <span class="stat-value severity-critical">{microsoft.compliance.nonCompliant}</span>
                      </div>
                      <div class="stat-row">
                        <span class="stat-label">Compliance Rate</span>
                        <span class="stat-value">
                          {((microsoft.compliance.compliant / (microsoft.compliance.compliant + microsoft.compliance.nonCompliant + microsoft.compliance.unknown)) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* MS Row 4: Recent Alerts Table */}
                {microsoft.alertAnalytics.recentAlerts.length > 0 && (
                  <div class="card col-12">
                    <div class="card-title">Recent Microsoft Security Alerts</div>
                    <table>
                      <thead>
                        <tr>
                          <th>Severity</th>
                          <th>Title</th>
                          <th>Category</th>
                          <th>Provider</th>
                          <th>Status</th>
                          <th>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {microsoft.alertAnalytics.recentAlerts.slice(0, 10).map((alert) => (
                          <tr key={alert.id}>
                            <td>
                              <span class={`badge badge-${alert.severity?.toLowerCase() || 'medium'}`}>
                                {alert.severity || 'Unknown'}
                              </span>
                            </td>
                            <td>{alert.title?.slice(0, 60) || 'N/A'}{alert.title && alert.title.length > 60 ? '...' : ''}</td>
                            <td>{alert.category || 'N/A'}</td>
                            <td>{alert.vendorInformation?.provider || 'N/A'}</td>
                            <td style="text-transform: capitalize;">{alert.status || 'N/A'}</td>
                            <td>{new Date(alert.createdDateTime).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* MS Row 5: Recent Incidents Table */}
                {microsoft.incidents.recentIncidents.length > 0 && (
                  <div class="card col-12">
                    <div class="card-title">Recent Microsoft Incidents</div>
                    <table>
                      <thead>
                        <tr>
                          <th>Severity</th>
                          <th>Name</th>
                          <th>Status</th>
                          <th>Classification</th>
                          <th>Assigned To</th>
                          <th>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {microsoft.incidents.recentIncidents.slice(0, 10).map((inc) => (
                          <tr key={inc.id}>
                            <td>
                              <span class={`badge badge-${inc.severity?.toLowerCase() === 'high' ? 'critical' : inc.severity?.toLowerCase() || 'medium'}`}>
                                {inc.severity || 'Unknown'}
                              </span>
                            </td>
                            <td>{inc.displayName?.slice(0, 60) || 'N/A'}{inc.displayName && inc.displayName.length > 60 ? '...' : ''}</td>
                            <td style="text-transform: capitalize;">{inc.status || 'N/A'}</td>
                            <td>{inc.classification || 'N/A'}</td>
                            <td>{inc.assignedTo || 'Unassigned'}</td>
                            <td>{new Date(inc.createdDateTime).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* Row 4: CrowdStrike Details */}
            {crowdstrike && (
              <>
                <div class="card col-4">
                  <div class="card-title">Incidents ({crowdstrike.incidents.total})</div>
                  <div class="stat-row">
                    <span class="stat-label">Open</span>
                    <span class="stat-value severity-high">{crowdstrike.incidents.open}</span>
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">Closed</span>
                    <span class="stat-value">{crowdstrike.incidents.closed}</span>
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">With Lateral Movement</span>
                    <span class="stat-value severity-critical">{crowdstrike.incidents.withLateralMovement}</span>
                  </div>
                  {crowdstrike.incidents.mttr !== undefined && (
                    <div class="stat-row">
                      <span class="stat-label">MTTR</span>
                      <span class="stat-value">{crowdstrike.incidents.mttr}h</span>
                    </div>
                  )}
                  <div class="stat-row">
                    <span class="stat-label">Avg Fine Score</span>
                    <span class="stat-value">{crowdstrike.incidents.avgFineScore}</span>
                  </div>
                  <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color);">
                    <div class="stat-label" style="margin-bottom: 0.5rem;">By Severity:</div>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                      <span class="badge badge-critical">Critical: {crowdstrike.incidents.bySeverity.critical}</span>
                      <span class="badge badge-high">High: {crowdstrike.incidents.bySeverity.high}</span>
                      <span class="badge badge-medium">Medium: {crowdstrike.incidents.bySeverity.medium}</span>
                      <span class="badge badge-low">Low: {crowdstrike.incidents.bySeverity.low}</span>
                    </div>
                  </div>
                </div>

                <div class="card col-4">
                  <div class="card-title">Zero Trust Assessment</div>
                  {crowdstrike.zta.totalAssessed > 0 ? (
                    <>
                      <div class="stat-row">
                        <span class="stat-label">Avg Score</span>
                        <span class="stat-value">{crowdstrike.zta.avgScore}/100</span>
                      </div>
                      <div class="stat-row">
                        <span class="stat-label">Excellent (80+)</span>
                        <span class="stat-value">{crowdstrike.zta.scoreDistribution.excellent}</span>
                      </div>
                      <div class="stat-row">
                        <span class="stat-label">Good (60-79)</span>
                        <span class="stat-value">{crowdstrike.zta.scoreDistribution.good}</span>
                      </div>
                      <div class="stat-row">
                        <span class="stat-label">Fair (40-59)</span>
                        <span class="stat-value severity-medium">{crowdstrike.zta.scoreDistribution.fair}</span>
                      </div>
                      <div class="stat-row">
                        <span class="stat-label">Poor (&lt;40)</span>
                        <span class="stat-value severity-critical">{crowdstrike.zta.scoreDistribution.poor}</span>
                      </div>
                    </>
                  ) : (
                    <p class="no-data">No ZTA data available</p>
                  )}
                </div>

                {/* NGSIEM Card */}
                <div class="card col-4">
                  <div class="card-title">NGSIEM / LogScale</div>
                  {crowdstrike.ngsiem.repositories > 0 || crowdstrike.ngsiem.eventCounts.total > 0 ? (
                    <>
                      <div class="stat-row">
                        <span class="stat-label">Repositories</span>
                        <span class="stat-value">{crowdstrike.ngsiem.repositories}</span>
                      </div>
                      <div class="stat-row">
                        <span class="stat-label">Total Ingest</span>
                        <span class="stat-value">{crowdstrike.ngsiem.totalIngestGB} GB</span>
                      </div>
                      <div class="stat-row">
                        <span class="stat-label">Saved Searches</span>
                        <span class="stat-value">{crowdstrike.ngsiem.savedSearches}</span>
                      </div>
                      <div class="stat-row">
                        <span class="stat-label">Events (24h)</span>
                        <span class="stat-value">{crowdstrike.ngsiem.eventCounts.total.toLocaleString()}</span>
                      </div>
                      <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color);">
                        <div class="stat-label" style="margin-bottom: 0.5rem;">Recent Activity:</div>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                          <span class="badge badge-info">Auth: {crowdstrike.ngsiem.recentActivity.authEvents.toLocaleString()}</span>
                          <span class="badge badge-info">Network: {crowdstrike.ngsiem.recentActivity.networkEvents.toLocaleString()}</span>
                          <span class="badge badge-info">Process: {crowdstrike.ngsiem.recentActivity.processEvents.toLocaleString()}</span>
                          <span class="badge badge-info">DNS: {crowdstrike.ngsiem.recentActivity.dnsEvents.toLocaleString()}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p class="no-data">No NGSIEM data available</p>
                  )}
                </div>
              </>
            )}

            {/* Row 4b: OverWatch Threat Hunting */}
            {crowdstrike && (
              <>
                <div class="card col-6">
                  <div class="card-title">OverWatch Threat Hunting</div>
                  {crowdstrike.overwatch.totalDetections > 0 || crowdstrike.overwatch.activeEscalations > 0 ? (
                    <>
                      <div class="metric-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 1rem;">
                        <div style="text-align: center;">
                          <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary);">{crowdstrike.overwatch.totalDetections}</div>
                          <div style="font-size: 0.75rem; color: var(--text-muted);">Total Detections</div>
                        </div>
                        <div style="text-align: center;">
                          <div style="font-size: 1.5rem; font-weight: 700; color: var(--severity-high);">{crowdstrike.overwatch.activeEscalations}</div>
                          <div style="font-size: 0.75rem; color: var(--text-muted);">Active Escalations</div>
                        </div>
                        <div style="text-align: center;">
                          <div style="font-size: 1.5rem; font-weight: 700; color: var(--severity-low);">{crowdstrike.overwatch.resolvedLast30Days}</div>
                          <div style="font-size: 0.75rem; color: var(--text-muted);">Resolved (30d)</div>
                        </div>
                        <div style="text-align: center;">
                          <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary);">{crowdstrike.overwatch.huntingCoverage.hostsMonitored}</div>
                          <div style="font-size: 0.75rem; color: var(--text-muted);">Hosts Monitored</div>
                        </div>
                      </div>
                      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <span class="badge badge-critical">Critical: {crowdstrike.overwatch.detectionsBySeverity.critical}</span>
                        <span class="badge badge-high">High: {crowdstrike.overwatch.detectionsBySeverity.high}</span>
                        <span class="badge badge-medium">Medium: {crowdstrike.overwatch.detectionsBySeverity.medium}</span>
                        <span class="badge badge-low">Low: {crowdstrike.overwatch.detectionsBySeverity.low}</span>
                      </div>
                    </>
                  ) : (
                    <p class="no-data">No OverWatch data available</p>
                  )}
                </div>

                <div class="card col-6">
                  <div class="card-title">OverWatch Tactics Detected</div>
                  {Object.keys(crowdstrike.overwatch.detectionsByTactic).length > 0 ? (
                    <div class="tactic-list">
                      {Object.entries(crowdstrike.overwatch.detectionsByTactic)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 6)
                        .map(([tactic, count]) => (
                          <div class="stat-row" key={tactic}>
                            <span class="stat-label">{tactic}</span>
                            <span class="stat-value">{count}</span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p class="no-data">No tactics detected by OverWatch</p>
                  )}
                </div>
              </>
            )}

            {/* Top NGSIEM Event Types */}
            {crowdstrike && crowdstrike.ngsiem.topEventTypes.length > 0 && (
              <div class="card col-12">
                <div class="card-title">Top Event Types (NGSIEM - Last 24h)</div>
                <div class="metric-grid" style="grid-template-columns: repeat(5, 1fr);">
                  {crowdstrike.ngsiem.topEventTypes.slice(0, 5).map((evt) => (
                    <div key={evt.type} style="text-align: center; padding: 0.75rem;">
                      <div style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary);">{evt.count.toLocaleString()}</div>
                      <div style="font-size: 0.7rem; color: var(--text-muted); word-break: break-word;">{evt.type}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Row 5: Salesforce Details */}
            {salesforce && (
              <>
                <div class="card col-4">
                  <div class="card-title">Tickets by Priority</div>
                  {Object.keys(salesforce.ticketsByPriority).length > 0 ? (
                    <div>
                      {Object.entries(salesforce.ticketsByPriority)
                        .sort((a, b) => {
                          const order = ['High', 'Medium', 'Low', 'None'];
                          return order.indexOf(a[0]) - order.indexOf(b[0]);
                        })
                        .map(([priority, count]) => (
                          <div class="stat-row" key={priority}>
                            <span class="stat-label">{priority}</span>
                            <span class={`stat-value ${priority === 'High' ? 'severity-critical' : priority === 'Medium' ? 'severity-medium' : ''}`}>
                              {count}
                            </span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p class="no-data">No open tickets</p>
                  )}
                </div>

                <div class="card col-4">
                  <div class="card-title">Backlog Aging</div>
                  {Object.keys(salesforce.backlogAging.agingBuckets).length > 0 ? (
                    <div>
                      {Object.entries(salesforce.backlogAging.agingBuckets).map(([bucket, count]) => (
                        <div class="stat-row" key={bucket}>
                          <span class="stat-label">{bucket}</span>
                          <span class={`stat-value ${bucket === '>72h' ? 'severity-critical' : bucket === '48-72h' ? 'severity-high' : ''}`}>
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p class="no-data">No backlog data</p>
                  )}
                </div>

                <div class="card col-4">
                  <div class="card-title">Agent Workload</div>
                  {salesforce.agentWorkload.length > 0 ? (
                    <div>
                      {salesforce.agentWorkload.slice(0, 5).map((agent) => (
                        <div class="stat-row" key={agent.name}>
                          <span class="stat-label">{agent.name}</span>
                          <span class={`stat-value ${agent.count > 5 ? 'severity-high' : agent.count > 3 ? 'severity-medium' : ''}`}>
                            {agent.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p class="no-data">No workload data</p>
                  )}
                </div>
              </>
            )}

            {/* Row 6: MITRE ATT&CK Tactics + Techniques + Platform by OS */}
            {crowdstrike && (
              <>
                <div class="card col-4">
                  <div class="card-title">Top MITRE ATT&CK Tactics</div>
                  {Object.keys(crowdstrike.alerts.byTactic).length > 0 ? (
                    <div class="tactic-list">
                      {Object.entries(crowdstrike.alerts.byTactic)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([tactic, count]) => (
                          <div class="stat-row" key={tactic}>
                            <span class="stat-label">{tactic}</span>
                            <span class="stat-value">{count}</span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p class="no-data">No tactics detected</p>
                  )}
                </div>

                <div class="card col-4">
                  <div class="card-title">Top MITRE ATT&CK Techniques</div>
                  {Object.keys(crowdstrike.alerts.byTechnique).length > 0 ? (
                    <div class="technique-list">
                      {Object.entries(crowdstrike.alerts.byTechnique)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([technique, count]) => (
                          <div class="stat-row" key={technique}>
                            <span class="stat-label">{technique}</span>
                            <span class="stat-value">{count}</span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p class="no-data">No techniques detected</p>
                  )}
                </div>

                <div class="card col-4">
                  <div class="card-title">Endpoints by Platform</div>
                  <ThreatChart
                    data={{
                      endpoint: crowdstrike.hosts.byPlatform.windows,
                      email: crowdstrike.hosts.byPlatform.mac,
                      web: crowdstrike.hosts.byPlatform.linux,
                      cloud: 0,
                    }}
                    labels={{
                      endpoint: 'Windows',
                      email: 'macOS',
                      web: 'Linux',
                    }}
                  />
                </div>
              </>
            )}

            {/* Row 6b: Host Status Details */}
            {crowdstrike && (
              <div class="col-12">
                <div class="card-title" style="margin-bottom: 1rem;">Host Containment Status</div>
                <div class="metric-grid" style="grid-template-columns: repeat(5, 1fr);">
                  <MetricCard
                    label="Normal"
                    value={crowdstrike.hosts.byStatus.normal}
                    source="CS"
                  />
                  <MetricCard
                    label="Contained"
                    value={crowdstrike.hosts.byStatus.contained}
                    severity={crowdstrike.hosts.byStatus.contained > 0 ? 'critical' : undefined}
                    source="CS"
                  />
                  <MetricCard
                    label="Containment Pending"
                    value={crowdstrike.hosts.byStatus.containment_pending}
                    severity={crowdstrike.hosts.byStatus.containment_pending > 0 ? 'high' : undefined}
                    source="CS"
                  />
                  <MetricCard
                    label="Lift Pending"
                    value={crowdstrike.hosts.byStatus.lift_containment_pending}
                    severity={crowdstrike.hosts.byStatus.lift_containment_pending > 0 ? 'medium' : undefined}
                    source="CS"
                  />
                  <MetricCard
                    label="Reduced Mode"
                    value={crowdstrike.hosts.reducedFunctionality}
                    severity={crowdstrike.hosts.reducedFunctionality > 0 ? 'high' : undefined}
                    source="CS"
                  />
                </div>
              </div>
            )}

            {/* Row 7: Recent Security Tickets (Salesforce) */}
            {salesforce && salesforce.recentTickets.length > 0 && (
              <div class="card col-12">
                <div class="card-title">Open Security Tickets</div>
                <table>
                  <thead>
                    <tr>
                      <th>Case #</th>
                      <th>Subject</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Owner</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesforce.recentTickets.map((ticket) => (
                      <tr key={ticket.id}>
                        <td>{ticket.caseNumber}</td>
                        <td>{ticket.subject?.slice(0, 50) || 'N/A'}{ticket.subject && ticket.subject.length > 50 ? '...' : ''}</td>
                        <td>
                          <span class={`badge badge-${ticket.priority?.toLowerCase() === 'high' ? 'critical' : ticket.priority?.toLowerCase() || 'medium'}`}>
                            {ticket.priority || 'None'}
                          </span>
                        </td>
                        <td style="text-transform: capitalize;">{ticket.status}</td>
                        <td>{ticket.ownerName || 'Unassigned'}</td>
                        <td>{new Date(ticket.createdDate).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Row 8: Recent Alerts (CrowdStrike) */}
            {crowdstrike && crowdstrike.alerts.recentAlerts.length > 0 && (
              <div class="card col-12">
                <div class="card-title">Recent CrowdStrike Alerts</div>
                <table>
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>Name</th>
                      <th>Hostname</th>
                      <th>Tactic</th>
                      <th>Status</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crowdstrike.alerts.recentAlerts.slice(0, 10).map((alert) => (
                      <tr key={alert.composite_id}>
                        <td>
                          <span class={`badge badge-${alert.severity_name?.toLowerCase() || 'medium'}`}>
                            {alert.severity_name || 'Unknown'}
                          </span>
                        </td>
                        <td>{alert.name || alert.description?.slice(0, 50) || 'N/A'}</td>
                        <td>{alert.hostname || 'N/A'}</td>
                        <td>{alert.tactic || 'N/A'}</td>
                        <td style="text-transform: capitalize;">{alert.status || 'N/A'}</td>
                        <td>{new Date(alert.created_timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Platform Status - Bottom */}
            <div class="col-12">
              <div class="card-title">Platform Integrations</div>
              <PlatformStatus platforms={platforms} horizontal />
            </div>
          </div>
        </>
      ) : null}

      {/* Footer */}
      <footer>
        <p>Last updated: {new Date(lastUpdated).toLocaleString()}</p>
        {dataSource === 'cache' && cachedAt && (
          <p class="cache-indicator">
            Cached data from {new Date(cachedAt).toLocaleString()} &mdash;{' '}
            <a href={`/?period=${period}&refresh=true`}>Force refresh</a>
          </p>
        )}
        {dataSource === 'live' && (
          <p class="cache-indicator">Live data</p>
        )}
      </footer>
    </Layout>
  );
};
