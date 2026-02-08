import type { FC } from 'hono/jsx';
import { Layout } from './Layout';
import { SecurityScore } from './components/SecurityScore';
import { MetricCard } from './components/MetricCard';
import { ThreatChart } from './components/ThreatChart';
import type { AlertSummary, HostSummary, IncidentSummary, VulnerabilitySummary, ZTASummary, CrowdScoreSummary, IDPSummary, DiscoverSummary, SensorUsageSummary, IntelSummary } from '../integrations/crowdstrike/client';
import type { TicketMetrics } from '../integrations/salesforce/client';
import type { MicrosoftFullSummary } from '../integrations/microsoft/client';
import type { ZscalerFullSummary } from '../integrations/zscaler/client';
import type { CrowdStrikeTrends, SalesforceTrends } from '../services/trends';

interface DashboardData {
  crowdstrike: {
    alerts: AlertSummary;
    hosts: HostSummary;
    incidents: IncidentSummary;
    vulnerabilities: VulnerabilitySummary | null;
    zta: ZTASummary;
    crowdScore: CrowdScoreSummary | null;
    identity: IDPSummary | null;
    discover: DiscoverSummary | null;
    sensors: SensorUsageSummary | null;
    intel: IntelSummary | null;
    fetchedAt: string;
    errors?: string[];
  } | null;
  salesforce: TicketMetrics | null;
  microsoft: MicrosoftFullSummary | null;
  zscaler: ZscalerFullSummary | null;
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

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`;
  return `${(minutes / 1440).toFixed(1)}d`;
};

function calculateCompositeScore(
  crowdstrike: DashboardData['crowdstrike'],
  microsoft: DashboardData['microsoft'],
): number | null {
  const components: Array<{ score: number; weight: number }> = [];

  if (crowdstrike?.crowdScore) {
    components.push({ score: Math.max(0, 100 - crowdstrike.crowdScore.current), weight: 30 });
  }

  if (microsoft?.secureScore && microsoft.secureScore.maxScore > 0) {
    const msScorePct = (microsoft.secureScore.currentScore / microsoft.secureScore.maxScore) * 100;
    components.push({ score: Math.min(100, msScorePct), weight: 25 });
  }

  {
    let totalWeight = 0;
    if (crowdstrike) {
      const a = crowdstrike.alerts.bySeverity;
      totalWeight += a.critical * 10 + a.high * 5 + a.medium * 2 + a.low * 1;
    }
    if (microsoft) {
      const aa = microsoft.alertAnalytics.bySeverity;
      const da = microsoft.defenderAnalytics.bySeverity;
      totalWeight += (aa.high + da.high) * 5 + (aa.medium + da.medium) * 2 + (aa.low + da.low) * 1;
    }
    if (crowdstrike || microsoft) {
      const alertScore = 100 * Math.max(0, 1 - Math.log10(1 + totalWeight) / 2);
      components.push({ score: alertScore, weight: 25 });
    }
  }

  {
    const healthScores: number[] = [];
    if (microsoft) {
      const totalDevices = microsoft.compliance.compliant + microsoft.compliance.nonCompliant + microsoft.compliance.unknown;
      if (totalDevices > 0) {
        healthScores.push((microsoft.compliance.compliant / totalDevices) * 100);
      }
      const riskyPenalty = microsoft.identity.riskyUsers.unresolvedCount * 10;
      healthScores.push(Math.max(0, 100 - riskyPenalty));
      if (microsoft.incidents.total > 0) {
        const closedRate = ((microsoft.incidents.total - microsoft.incidents.open) / microsoft.incidents.total) * 100;
        healthScores.push(closedRate);
      }
    }
    if (crowdstrike) {
      if (crowdstrike.incidents.total > 0) {
        const csClosedRate = (crowdstrike.incidents.closed / crowdstrike.incidents.total) * 100;
        healthScores.push(csClosedRate);
      }
    }
    if (healthScores.length > 0) {
      const avgHealth = healthScores.reduce((a, b) => a + b, 0) / healthScores.length;
      components.push({ score: avgHealth, weight: 20 });
    }
  }

  if (components.length === 0) return null;

  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
  const score = components.reduce((sum, c) => sum + c.score * (c.weight / totalWeight), 0);
  return Math.round(Math.max(0, Math.min(100, score)));
}

export const Dashboard: FC<Props> = ({ data }) => {
  const { crowdstrike, salesforce, microsoft, zscaler, platforms, period, lastUpdated, dataSource, cachedAt, csTrends, sfTrends } = data;

  const securityScore = calculateCompositeScore(crowdstrike, microsoft);

  const criticalAlerts = (crowdstrike?.alerts.bySeverity.critical ?? 0) + (microsoft?.alertAnalytics.bySeverity.high ?? 0);
  const openIncidents = (crowdstrike?.incidents.open ?? 0) + (microsoft?.incidents.open ?? 0);
  const riskyUsers = microsoft?.identity.riskyUsers.unresolvedCount ?? 0;

  return (
    <Layout title="Rodgers Security Dashboard">
      <div class="dashboard-wrapper">
        {/* ═══ HEADER ═══ */}
        <header>
          <div class="header-left">
            <div class="logo-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div class="header-title">
              <h1>Rodgers Security Dashboard</h1>
              <p>{periodLabels[period] ?? period}</p>
            </div>
          </div>
          <div class="header-right">
            <p class="cache-indicator">
              {dataSource === 'cache' && cachedAt
                ? `Cached ${new Date(cachedAt).toLocaleTimeString()}`
                : 'Live data'}
            </p>
            <a href="/api/reports/latest" class="report-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Report
            </a>
            <form method="get" action="/">
              <select name="period">
                {Object.entries(periodLabels).map(([val, label]) => (
                  <option value={val} selected={val === period}>{label}</option>
                ))}
              </select>
            </form>
            <a
              href={`/?period=${period}&refresh=true`}
              class="refresh-btn"
            >
              <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
              </svg>
              Refresh
            </a>
          </div>
        </header>

        {/* ═══ COMMAND BAR ═══ */}
        <div class="dashboard-top">
          <div class="command-bar">
            {/* Security Score Ring */}
            <div class="command-bar-score">
              {securityScore !== null ? (
                <SecurityScore score={securityScore} />
              ) : (
                <div style="width: 90px; height: 90px; display: flex; align-items: center; justify-content: center;">
                  <span class="stat-label" style="font-size: 0.6rem;">N/A</span>
                </div>
              )}
            </div>

            {/* Cross-Platform KPIs */}
            <div class="command-bar-kpis">
              <div class="kpi-strip">
                {crowdstrike?.crowdScore && (
                  <div class="kpi-item">
                    <div class={`kpi-value ${crowdstrike.crowdScore.current > 70 ? 'severity-critical' : crowdstrike.crowdScore.current > 40 ? 'severity-medium' : ''}`}>
                      {crowdstrike.crowdScore.current}
                    </div>
                    <div class="kpi-label">CrowdScore</div>
                    <div class="kpi-source">CS</div>
                  </div>
                )}

                {microsoft?.secureScore && microsoft.secureScore.maxScore > 0 && (
                  <div class="kpi-item">
                    <div class={`kpi-value ${((microsoft.secureScore.currentScore / microsoft.secureScore.maxScore) * 100) < 50 ? 'severity-critical' : ((microsoft.secureScore.currentScore / microsoft.secureScore.maxScore) * 100) < 80 ? 'severity-medium' : ''}`}>
                      {((microsoft.secureScore.currentScore / microsoft.secureScore.maxScore) * 100).toFixed(0)}%
                    </div>
                    <div class="kpi-label">Secure Score</div>
                    <div class="kpi-source">MS</div>
                  </div>
                )}

                {criticalAlerts > 0 && (
                  <div class="kpi-item kpi-pulse">
                    <div class="kpi-value severity-critical">{criticalAlerts}</div>
                    <div class="kpi-label">Critical Alerts</div>
                    <div class="kpi-source">CS+MS</div>
                  </div>
                )}

                {openIncidents > 0 && (
                  <div class="kpi-item">
                    <div class="kpi-value severity-high">{openIncidents}</div>
                    <div class="kpi-label">Open Incidents</div>
                    <div class="kpi-source">CS+MS</div>
                  </div>
                )}

                {riskyUsers > 0 && (
                  <div class="kpi-item kpi-pulse">
                    <div class="kpi-value severity-critical">{riskyUsers}</div>
                    <div class="kpi-label">Risky Users</div>
                    <div class="kpi-source">MS</div>
                  </div>
                )}

                {salesforce && (
                  <div class="kpi-item">
                    <div class={`kpi-value ${salesforce.openTickets > 20 ? 'severity-critical' : salesforce.openTickets > 10 ? 'severity-medium' : ''}`}>
                      {salesforce.openTickets}
                    </div>
                    <div class="kpi-label">Open Cases</div>
                    <div class="kpi-source">SF</div>
                  </div>
                )}

                {salesforce && (
                  <div class="kpi-item">
                    <div class={`kpi-value ${salesforce.slaComplianceRate < 90 ? 'severity-critical' : salesforce.slaComplianceRate < 95 ? 'severity-medium' : ''}`}>
                      {salesforce.slaComplianceRate.toFixed(0)}%
                    </div>
                    <div class="kpi-label">SLA</div>
                    <div class="kpi-source">SF</div>
                  </div>
                )}

                {microsoft && (
                  <div class="kpi-item">
                    <div class="kpi-value">{microsoft.machines.total}</div>
                    <div class="kpi-label">Endpoints</div>
                    <div class="kpi-source">MS</div>
                  </div>
                )}
              </div>
            </div>

            {/* Platform Status Badges */}
            <div class="command-bar-status">
              <div class="platform-badges">
                {platforms.filter((p) => p.status !== 'not_configured').map((p) => (
                  <span class="platform-badge" key={p.platform}>
                    <span class={`status-dot status-${p.status}`} />
                    {p.platform}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ TABS ═══ */}
        <div class="dashboard-tabs">
          <div class="tab-nav">
            <button class="tab-btn active" data-tab="crowdstrike">CrowdStrike</button>
            <button class="tab-btn" data-tab="microsoft">Microsoft</button>
            <button class="tab-btn" data-tab="salesforce">Salesforce</button>
            <button class="tab-btn" data-tab="zia">ZIA</button>
            <button class="tab-btn" data-tab="zpa">ZPA</button>
          </div>

          {/* ═══ CROWDSTRIKE TAB ═══ */}
          <div id="tab-crowdstrike" class="tab-content active">
            {crowdstrike ? (
              <>
                {/* Row 1: Key Metrics */}
                <div class="col-12">
                  <div class="metric-grid" style="grid-template-columns: repeat(6, 1fr);">
                    <MetricCard label="Hosts" value={crowdstrike.hosts.total} source="CS" compact
                      trend={csTrends?.hostsTotal ? { ...csTrends.hostsTotal, invertColor: true } : undefined} />
                    <MetricCard label="CrowdScore" value={crowdstrike.crowdScore?.current ?? 'N/A'} compact
                      severity={crowdstrike.crowdScore && crowdstrike.crowdScore.current > 70 ? 'critical' : crowdstrike.crowdScore && crowdstrike.crowdScore.current > 40 ? 'medium' : undefined} />
                    <MetricCard label="Critical" value={crowdstrike.alerts.bySeverity.critical} severity={crowdstrike.alerts.bySeverity.critical > 0 ? 'critical' : undefined} compact
                      trend={csTrends?.alertsCritical ? csTrends.alertsCritical : undefined} />
                    <MetricCard label="High" value={crowdstrike.alerts.bySeverity.high} severity={crowdstrike.alerts.bySeverity.high > 0 ? 'high' : undefined} compact />
                    <MetricCard label="Medium" value={crowdstrike.alerts.bySeverity.medium} severity={crowdstrike.alerts.bySeverity.medium > 0 ? 'medium' : undefined} compact />
                    <MetricCard label="Low" value={crowdstrike.alerts.bySeverity.low} compact />
                  </div>
                </div>

                {/* Row 2: Incidents, Vulnerabilities, ZTA & Identity */}
                <div class="card card-compact col-4">
                  <div class="card-title">Incidents ({crowdstrike.incidents.total})</div>
                  <div class="mini-metric-grid">
                    <MetricCard label="Open" value={crowdstrike.incidents.open} compact
                      severity={crowdstrike.incidents.open > 0 ? 'high' : undefined}
                      trend={csTrends?.incidentsOpen ? csTrends.incidentsOpen : undefined} />
                    <MetricCard label="Closed" value={crowdstrike.incidents.closed} compact />
                    <MetricCard label="Lateral" value={crowdstrike.incidents.withLateralMovement} compact
                      severity={crowdstrike.incidents.withLateralMovement > 0 ? 'critical' : undefined} />
                    <MetricCard label="MTTR" value={crowdstrike.incidents.mttr ? formatDuration(crowdstrike.incidents.mttr * 60) : 'N/A'} compact />
                  </div>
                </div>

                <div class="card card-compact col-4">
                  <div class="card-title">Vulnerabilities ({crowdstrike.vulnerabilities?.total ?? 0})</div>
                  {crowdstrike.vulnerabilities ? (
                    <>
                      <div class="mini-metric-grid">
                        <MetricCard label="Critical" value={crowdstrike.vulnerabilities.bySeverity.critical} compact severity="critical" />
                        <MetricCard label="High" value={crowdstrike.vulnerabilities.bySeverity.high} compact severity="high" />
                        <MetricCard label="Exploits" value={crowdstrike.vulnerabilities.withExploits} compact severity={crowdstrike.vulnerabilities.withExploits > 0 ? 'critical' : undefined} />
                        <MetricCard label="Hosts" value={crowdstrike.vulnerabilities.affectedHosts} compact />
                      </div>
                      {crowdstrike.vulnerabilities.topCVEs.length > 0 && (
                        <div style="margin-top: var(--sp-2); display: flex; gap: 4px; flex-wrap: wrap;">
                          {crowdstrike.vulnerabilities.topCVEs.slice(0, 3).map((cve) => (
                            <span key={cve.cve_id} class={`badge badge-${cve.severity === 'CRITICAL' ? 'critical' : cve.severity === 'HIGH' ? 'high' : 'medium'}`}>
                              {cve.cve_id}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p class="no-data">No vulnerability data</p>
                  )}
                </div>

                <div class="card card-compact col-4">
                  <div class="card-title">ZTA &amp; Identity</div>
                  <div class="mini-metric-grid">
                    <MetricCard label="ZTA Avg" value={crowdstrike.zta.avgScore} compact
                      trend={csTrends?.ztaAvgScore ? { ...csTrends.ztaAvgScore, invertColor: true } : undefined} />
                    <MetricCard label="Good+" value={crowdstrike.zta.scoreDistribution.excellent + crowdstrike.zta.scoreDistribution.good} compact severity="low" />
                    <MetricCard label="Fair" value={crowdstrike.zta.scoreDistribution.fair} compact severity={crowdstrike.zta.scoreDistribution.fair > 0 ? 'medium' : undefined} />
                    <MetricCard label="Poor" value={crowdstrike.zta.scoreDistribution.poor} compact severity={crowdstrike.zta.scoreDistribution.poor > 0 ? 'critical' : undefined} />
                  </div>
                  {crowdstrike.identity && (
                    <div style="margin-top: var(--sp-2);">
                      <div class="stat-row">
                        <span class="stat-label">IDP Detections</span>
                        <span class="stat-value">{crowdstrike.identity.total}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Row 3: MITRE, Endpoints, Intel */}
                <div class="card card-compact col-4">
                  <div class="card-title">MITRE ATT&CK</div>
                  <div class="tactic-list">
                    {Object.entries(crowdstrike.alerts.byTactic).slice(0, 5).map(([tactic, count]) => (
                      <div class="stat-row" key={tactic}>
                        <span class="stat-label">{tactic}</span>
                        <span class="stat-value">{count}</span>
                      </div>
                    ))}
                    {Object.keys(crowdstrike.alerts.byTactic).length === 0 && <p class="no-data">No tactics</p>}
                  </div>
                </div>

                <div class="card card-compact col-4">
                  <div class="card-title">Endpoints</div>
                  <div class="mini-metric-grid">
                    <MetricCard label="Online" value={crowdstrike.hosts.online} compact
                      trend={csTrends?.hostsOnline ? { ...csTrends.hostsOnline, invertColor: true } : undefined} />
                    <MetricCard label="Contained" value={crowdstrike.hosts.contained} compact
                      severity={crowdstrike.hosts.contained > 0 ? 'high' : undefined} />
                    <MetricCard label="Stale" value={crowdstrike.hosts.staleEndpoints} compact
                      severity={crowdstrike.hosts.staleEndpoints > 0 ? 'medium' : undefined} />
                  </div>
                  <ThreatChart
                    data={{
                      endpoint: crowdstrike.hosts.byPlatform.windows,
                      email: crowdstrike.hosts.byPlatform.mac,
                      web: crowdstrike.hosts.byPlatform.linux,
                      cloud: 0,
                    }}
                    labels={{ endpoint: 'Windows', email: 'macOS', web: 'Linux', cloud: 'Other' }}
                  />
                </div>

                <div class="card card-compact col-4">
                  <div class="card-title">Intel &amp; Discovery</div>
                  <div class="mini-metric-grid">
                    <MetricCard label="IOCs" value={crowdstrike.intel?.indicatorCount.toLocaleString() ?? '0'} compact />
                    <MetricCard label="Reports" value={crowdstrike.intel?.recentReports.length ?? 0} compact />
                    <MetricCard label="Apps" value={crowdstrike.discover?.totalApplications.toLocaleString() ?? '0'} compact />
                    <MetricCard label="Unmanaged" value={crowdstrike.discover?.unmanagedAssets.toLocaleString() ?? '0'} compact
                      severity={crowdstrike.discover && crowdstrike.discover.unmanagedAssets > 0 ? 'medium' : undefined} />
                  </div>
                  {crowdstrike.intel && crowdstrike.intel.recentActors.length > 0 && (
                    <div style="margin-top: var(--sp-2); display: flex; gap: 4px; flex-wrap: wrap;">
                      {crowdstrike.intel.recentActors.slice(0, 3).map((actor) => (
                        <span key={actor.id} class="badge badge-info">{actor.name}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Row 4: Recent Alerts */}
                <div class="card card-compact col-12">
                  <div class="card-title">Recent Alerts</div>
                  <table class="compact-table">
                    <thead>
                      <tr><th>Severity</th><th>Name</th><th>Status</th><th>Time</th></tr>
                    </thead>
                    <tbody>
                      {crowdstrike.alerts.recentAlerts.slice(0, 5).map((alert) => (
                        <tr key={alert.composite_id}>
                          <td><span class={`badge badge-${alert.severity_name?.toLowerCase() ?? 'info'}`}>{alert.severity_name ?? 'Unknown'}</span></td>
                          <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{alert.name ?? alert.tactic ?? 'Unnamed'}</td>
                          <td>{alert.status ?? 'Unknown'}</td>
                          <td style="white-space: nowrap;">{alert.created_timestamp ? new Date(alert.created_timestamp).toLocaleDateString() : '-'}</td>
                        </tr>
                      ))}
                      {crowdstrike.alerts.recentAlerts.length === 0 && (
                        <tr><td colSpan={4}><p class="no-data">No recent alerts</p></td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div class="col-12">
                <p class="no-data">CrowdStrike not configured</p>
              </div>
            )}
          </div>

          {/* ═══ MICROSOFT TAB ═══ */}
          <div id="tab-microsoft" class="tab-content">
            {microsoft ? (
              <>
                {/* Row 1: Key Metrics */}
                <div class="col-12">
                  <div class="metric-grid" style="grid-template-columns: repeat(6, 1fr);">
                    <MetricCard label="Entra Alerts" value={microsoft.alertAnalytics.active} source="MS" compact
                      severity={microsoft.alertAnalytics.active > 0 ? 'high' : undefined} />
                    <MetricCard label="Defender Alerts" value={microsoft.defenderAnalytics.active} compact
                      severity={microsoft.defenderAnalytics.active > 0 ? 'high' : undefined} />
                    <MetricCard label="Risky Users" value={microsoft.identity.riskyUsers.unresolvedCount} compact
                      severity={microsoft.identity.riskyUsers.unresolvedCount > 0 ? 'critical' : undefined} />
                    <MetricCard label="Open Incidents" value={microsoft.incidents.open} compact
                      severity={microsoft.incidents.open > 0 ? 'high' : undefined} />
                    <MetricCard label="Secure Score" value={microsoft.secureScore ? `${((microsoft.secureScore.currentScore / Math.max(1, microsoft.secureScore.maxScore)) * 100).toFixed(0)}%` : 'N/A'} compact />
                    <MetricCard label="Machines" value={microsoft.machines.total} compact />
                  </div>
                </div>

                {/* Row 2: Entra, Defender, Identity */}
                <div class="card card-compact col-4">
                  <div class="card-title">Entra Alerts ({microsoft.alertAnalytics.total})</div>
                  <div class="mini-metric-grid">
                    <MetricCard label="High" value={microsoft.alertAnalytics.bySeverity.high} compact severity="critical" />
                    <MetricCard label="Medium" value={microsoft.alertAnalytics.bySeverity.medium} compact severity="medium" />
                    <MetricCard label="Low" value={microsoft.alertAnalytics.bySeverity.low} compact severity="low" />
                    <MetricCard label="Info" value={microsoft.alertAnalytics.bySeverity.informational} compact />
                  </div>
                  {Object.keys(microsoft.alertAnalytics.byCategory).length > 0 && (
                    <div style="margin-top: var(--sp-2); display: flex; gap: 4px; flex-wrap: wrap;">
                      {Object.entries(microsoft.alertAnalytics.byCategory).slice(0, 3).map(([cat, count]) => (
                        <span key={cat} class="badge badge-info">{cat}: {count}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div class="card card-compact col-4">
                  <div class="card-title">Defender ({microsoft.defenderAnalytics.total})</div>
                  <div class="mini-metric-grid">
                    <MetricCard label="High" value={microsoft.defenderAnalytics.bySeverity.high} compact severity="critical" />
                    <MetricCard label="Medium" value={microsoft.defenderAnalytics.bySeverity.medium} compact severity="medium" />
                    <MetricCard label="Low" value={microsoft.defenderAnalytics.bySeverity.low} compact severity="low" />
                    <MetricCard label="Linked" value={microsoft.defenderAnalytics.linkedToIncidents} compact />
                  </div>
                  {Object.keys(microsoft.defenderAnalytics.byDetectionSource).length > 0 && (
                    <div style="margin-top: var(--sp-2); display: flex; gap: 4px; flex-wrap: wrap;">
                      {Object.entries(microsoft.defenderAnalytics.byDetectionSource).slice(0, 3).map(([src, count]) => (
                        <span key={src} class="badge badge-info">{src}: {count}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div class="card card-compact col-4">
                  <div class="card-title">Identity Risk</div>
                  {microsoft.identity.riskyUsers.total > 0 ? (
                    <>
                      <div class="mini-metric-grid">
                        <MetricCard label="At Risk" value={microsoft.identity.riskyUsers.byRiskState.atRisk} compact severity="critical" />
                        <MetricCard label="Compromised" value={microsoft.identity.riskyUsers.byRiskState.confirmedCompromised} compact severity={microsoft.identity.riskyUsers.byRiskState.confirmedCompromised > 0 ? 'critical' : undefined} />
                        <MetricCard label="Remediated" value={microsoft.identity.riskyUsers.byRiskState.remediated} compact severity="low" />
                        <MetricCard label="Dismissed" value={microsoft.identity.riskyUsers.byRiskState.dismissed} compact />
                      </div>
                      <div style="margin-top: var(--sp-2); display: flex; gap: 4px; flex-wrap: wrap;">
                        <span class="badge badge-critical">High: {microsoft.identity.riskyUsers.byRiskLevel.high}</span>
                        <span class="badge badge-medium">Med: {microsoft.identity.riskyUsers.byRiskLevel.medium}</span>
                        <span class="badge badge-low">Low: {microsoft.identity.riskyUsers.byRiskLevel.low}</span>
                      </div>
                    </>
                  ) : (
                    <p class="no-data">No risky users</p>
                  )}
                </div>

                {/* Row 3: Incidents, Machines, Compliance */}
                <div class="card card-compact col-4">
                  <div class="card-title">Incidents ({microsoft.incidents.total})</div>
                  {microsoft.incidents.total > 0 ? (
                    <>
                      <div class="mini-metric-grid">
                        <MetricCard label="Open" value={microsoft.incidents.open} compact severity={microsoft.incidents.open > 0 ? 'high' : undefined} />
                        <MetricCard label="Unassigned" value={microsoft.incidents.unassigned} compact severity={microsoft.incidents.unassigned > 0 ? 'medium' : undefined} />
                        <MetricCard label="Redirected" value={microsoft.incidents.redirected} compact />
                      </div>
                      <div style="margin-top: var(--sp-2); display: flex; gap: 4px; flex-wrap: wrap;">
                        <span class="badge badge-critical">High: {microsoft.incidents.bySeverity.high}</span>
                        <span class="badge badge-medium">Med: {microsoft.incidents.bySeverity.medium}</span>
                        <span class="badge badge-low">Low: {microsoft.incidents.bySeverity.low}</span>
                      </div>
                    </>
                  ) : (
                    <p class="no-data">No incidents</p>
                  )}
                </div>

                <div class="card card-compact col-4">
                  <div class="card-title">Machines ({microsoft.machines.total})</div>
                  <div class="mini-metric-grid">
                    <MetricCard label="Onboarded" value={microsoft.machines.onboarded} compact />
                    <MetricCard label="Stale" value={microsoft.machines.stale} compact severity={microsoft.machines.stale > 0 ? 'medium' : undefined} />
                    <MetricCard label="High Risk" value={microsoft.machines.byRiskScore.high} compact severity={microsoft.machines.byRiskScore.high > 0 ? 'critical' : undefined} />
                    <MetricCard label="Exposed" value={microsoft.machines.byExposureLevel.high} compact severity={microsoft.machines.byExposureLevel.high > 0 ? 'high' : undefined} />
                  </div>
                  {Object.keys(microsoft.machines.byOsPlatform).length > 0 && (
                    <div style="margin-top: var(--sp-2); display: flex; gap: 4px; flex-wrap: wrap;">
                      {Object.entries(microsoft.machines.byOsPlatform).slice(0, 4).map(([os, count]) => (
                        <span key={os} class="badge badge-info">{os}: {count}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div class="card card-compact col-4">
                  <div class="card-title">Compliance &amp; Cloud</div>
                  <div class="mini-metric-grid">
                    <MetricCard label="Compliant" value={`${(microsoft.compliance.compliant + microsoft.compliance.nonCompliant) > 0 ? ((microsoft.compliance.compliant / (microsoft.compliance.compliant + microsoft.compliance.nonCompliant)) * 100).toFixed(0) : 0}%`} compact />
                    <MetricCard label="Pass Rate" value={`${microsoft.assessments.passRate.toFixed(0)}%`} compact />
                    <MetricCard label="Unhealthy" value={microsoft.assessments.unhealthy} compact severity={microsoft.assessments.unhealthy > 0 ? 'high' : undefined} />
                  </div>
                  {microsoft.secureScore && (
                    <div style="margin-top: var(--sp-2);">
                      <div class="stat-row">
                        <span class="stat-label">Secure Score</span>
                        <span class="stat-value">{microsoft.secureScore.currentScore.toFixed(1)} / {microsoft.secureScore.maxScore.toFixed(1)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Row 4: Recent Alerts Table */}
                <div class="card card-compact col-12">
                  <div class="card-title">Recent Alerts</div>
                  <table class="compact-table">
                    <thead>
                      <tr><th>Severity</th><th>Title</th><th>Status</th><th>Category</th></tr>
                    </thead>
                    <tbody>
                      {microsoft.alertAnalytics.recentAlerts.slice(0, 5).map((alert) => (
                        <tr key={alert.id}>
                          <td><span class={`badge badge-${alert.severity === 'high' ? 'critical' : alert.severity === 'medium' ? 'medium' : alert.severity === 'low' ? 'low' : 'info'}`}>{alert.severity}</span></td>
                          <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{alert.title}</td>
                          <td>{alert.status}</td>
                          <td>{alert.category ?? '-'}</td>
                        </tr>
                      ))}
                      {microsoft.alertAnalytics.recentAlerts.length === 0 && (
                        <tr><td colSpan={4}><p class="no-data">No recent alerts</p></td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div class="col-12">
                <p class="no-data">Microsoft not configured</p>
              </div>
            )}
          </div>

          {/* ═══ SALESFORCE TAB ═══ */}
          <div id="tab-salesforce" class="tab-content">
            {salesforce ? (
              <>
                {/* Row 1: Case Activity KPIs */}
                <div class="col-12">
                  <div class="metric-grid" style="grid-template-columns: repeat(6, 1fr);">
                    <MetricCard label="Open Cases" value={salesforce.openTickets} source="SF" compact
                      severity={salesforce.openTickets > 20 ? 'critical' : salesforce.openTickets > 10 ? 'medium' : undefined}
                      trend={sfTrends?.openTickets ? sfTrends.openTickets : undefined} />
                    <MetricCard label="Created Today" value={salesforce.createdToday} compact
                      severity={salesforce.createdToday > 10 ? 'critical' : salesforce.createdToday > 5 ? 'medium' : undefined} />
                    <MetricCard label="Closed Today" value={salesforce.closedToday} compact severity="low" />
                    <MetricCard label="MTTR" value={formatDuration(salesforce.mttr.overall)} compact
                      trend={sfTrends?.mttrOverall ? { ...sfTrends.mttrOverall, invertColor: true } : undefined} />
                    <MetricCard label="SLA" value={`${salesforce.slaComplianceRate.toFixed(0)}%`} compact
                      severity={salesforce.slaComplianceRate < 90 ? 'critical' : salesforce.slaComplianceRate < 95 ? 'medium' : 'low'}
                      trend={sfTrends?.slaCompliance ? { ...sfTrends.slaCompliance, invertColor: true } : undefined} />
                    <MetricCard label="Escalation" value={`${salesforce.escalationRate.toFixed(1)}%`} compact
                      severity={salesforce.escalationRate > 15 ? 'critical' : salesforce.escalationRate > 5 ? 'medium' : undefined}
                      trend={sfTrends?.escalationRate ? { ...sfTrends.escalationRate, invertColor: true } : undefined} />
                  </div>
                </div>

                {/* Row 2: Priority, Aging, Workload */}
                <div class="card card-compact col-4">
                  <div class="card-title">Priority Breakdown</div>
                  <div class="mini-metric-grid">
                    {Object.entries(salesforce.ticketsByPriority).slice(0, 4).map(([priority, count]) => {
                      const sev = priority.toLowerCase().includes('high') ? 'critical' as const
                        : priority.toLowerCase().includes('medium') ? 'medium' as const
                        : priority.toLowerCase().includes('low') ? 'low' as const
                        : undefined;
                      return <MetricCard key={priority} label={priority} value={count ?? 0} compact severity={sev} />;
                    })}
                    {Object.keys(salesforce.ticketsByPriority).length === 0 && <p class="no-data">No data</p>}
                  </div>
                </div>

                <div class="card card-compact col-4">
                  <div class="card-title">Backlog Aging</div>
                  <div class="mini-metric-grid">
                    {Object.entries(salesforce.backlogAging.agingBuckets).map(([bucket, count]) => (
                      <MetricCard key={bucket} label={bucket} value={count ?? 0} compact
                        severity={bucket.includes('72') || bucket.includes('>') ? 'critical' : bucket.includes('48') ? 'medium' : undefined} />
                    ))}
                  </div>
                  {salesforce.backlogAging.oldestTicket && (
                    <div style="margin-top: var(--sp-2); font-size: 0.6rem; color: var(--text-muted);">
                      Oldest: {salesforce.backlogAging.oldestTicket.caseNumber} ({salesforce.backlogAging.oldestTicket.ageHours.toFixed(0)}h)
                    </div>
                  )}
                </div>

                <div class="card card-compact col-4">
                  <div class="card-title">Agent Workload</div>
                  {salesforce.agentWorkload.length > 0 ? (
                    salesforce.agentWorkload.slice(0, 5).map((agent) => (
                      <div class="stat-row" key={agent.name}>
                        <span class="stat-label">{agent.name}</span>
                        <span class="stat-value">{agent.count}</span>
                      </div>
                    ))
                  ) : (
                    <p class="no-data">No workload data</p>
                  )}
                </div>

                {/* Row 3: Week-over-Week, Origin */}
                <div class="card card-compact col-6">
                  <div class="card-title">Week-over-Week</div>
                  <div class="mini-metric-grid">
                    <MetricCard label="This Week" value={salesforce.weekOverWeek.thisWeek} compact />
                    <MetricCard label="Last Week" value={salesforce.weekOverWeek.lastWeek} compact />
                    <MetricCard label="Change" value={`${salesforce.weekOverWeek.changePercent >= 0 ? '+' : ''}${salesforce.weekOverWeek.changePercent.toFixed(0)}%`} compact
                      severity={salesforce.weekOverWeek.changePercent > 20 ? 'critical' : salesforce.weekOverWeek.changePercent > 0 ? 'medium' : 'low'} />
                  </div>
                </div>

                <div class="card card-compact col-6">
                  <div class="card-title">Cases by Origin</div>
                  {Object.keys(salesforce.ticketsByOrigin).length > 0 ? (
                    Object.entries(salesforce.ticketsByOrigin).slice(0, 5).map(([origin, count]) => (
                      <div class="stat-row" key={origin}>
                        <span class="stat-label">{origin || 'Unknown'}</span>
                        <span class="stat-value">{count ?? 0}</span>
                      </div>
                    ))
                  ) : (
                    <p class="no-data">No origin data</p>
                  )}
                </div>

                {/* Row 4: Open Cases Table */}
                <div class="card card-compact col-12">
                  <div class="card-title">Open Cases</div>
                  <table class="compact-table">
                    <thead>
                      <tr><th>Case #</th><th>Subject</th><th>Priority</th><th>Status</th><th>Created</th></tr>
                    </thead>
                    <tbody>
                      {salesforce.recentTickets.slice(0, 5).map((ticket) => (
                        <tr key={ticket.caseNumber}>
                          <td style="font-family: var(--font-mono); font-weight: 600;">{ticket.caseNumber}</td>
                          <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{ticket.subject}</td>
                          <td><span class={`badge badge-${ticket.priority === 'High' ? 'critical' : ticket.priority === 'Medium' ? 'medium' : 'low'}`}>{ticket.priority}</span></td>
                          <td>{ticket.status}</td>
                          <td style="white-space: nowrap;">{new Date(ticket.createdDate).toLocaleDateString()}</td>
                        </tr>
                      ))}
                      {salesforce.recentTickets.length === 0 && (
                        <tr><td colSpan={5}><p class="no-data">No open cases</p></td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div class="col-12">
                <p class="no-data">Salesforce not configured</p>
              </div>
            )}
          </div>

          {/* ═══ ZIA TAB ═══ */}
          <div id="tab-zia" class="tab-content">
            {zscaler?.zia ? (() => {
              const zia = zscaler.zia;
              return (
                <>
                  {/* Row 1: Key Metrics */}
                  <div class="col-12">
                    <div class="metric-grid" style="grid-template-columns: repeat(6, 1fr);">
                      <MetricCard label="ATP Protections" value={zia.securityPolicy.protectionCount} source="ZS" compact
                        severity={zia.securityPolicy.protectionCount < 10 ? 'medium' : undefined} />
                      <MetricCard label="SSL Inspection" value={zia.sslInspection.enabled ? 'Enabled' : 'Disabled'} compact
                        severity={!zia.sslInspection.enabled ? 'critical' : undefined} />
                      <MetricCard label="Config Status" value={zia.activationPending ? 'Pending' : 'Active'} compact
                        severity={zia.activationPending ? 'medium' : undefined} />
                      <MetricCard label="Locations" value={zia.locations.total} compact />
                      <MetricCard label="Managed Users" value={zia.users.total} compact />
                      <MetricCard label="Admin Changes (24h)" value={zia.recentAdminChanges} compact
                        severity={zia.recentAdminChanges > 10 ? 'medium' : undefined} />
                    </div>
                  </div>

                  {/* Row 2: URL Filtering, Firewall, DLP */}
                  <div class="card card-compact col-4">
                    <div class="card-title">URL Filtering ({zia.urlFiltering.totalRules})</div>
                    <div class="mini-metric-grid">
                      <MetricCard label="Total" value={zia.urlFiltering.totalRules} compact />
                      <MetricCard label="Enabled" value={zia.urlFiltering.enabledRules} compact />
                      <MetricCard label="Block" value={zia.urlFiltering.byAction['BLOCK'] ?? 0} compact severity={((zia.urlFiltering.byAction['BLOCK'] ?? 0) > 0) ? 'high' : undefined} />
                      <MetricCard label="Caution" value={zia.urlFiltering.byAction['CAUTION'] ?? 0} compact severity={((zia.urlFiltering.byAction['CAUTION'] ?? 0) > 0) ? 'medium' : undefined} />
                    </div>
                  </div>

                  <div class="card card-compact col-4">
                    <div class="card-title">Firewall Rules ({zia.firewall.totalRules})</div>
                    <div class="mini-metric-grid">
                      <MetricCard label="Total" value={zia.firewall.totalRules} compact />
                      <MetricCard label="Enabled" value={zia.firewall.enabledRules} compact />
                      <MetricCard label="Disabled" value={zia.firewall.disabledRules} compact
                        severity={zia.firewall.disabledRules > 0 ? 'medium' : undefined} />
                    </div>
                  </div>

                  <div class="card card-compact col-4">
                    <div class="card-title">DLP</div>
                    <div class="mini-metric-grid">
                      <MetricCard label="Total Rules" value={zia.dlp.totalRules} compact />
                      <MetricCard label="Dictionaries" value={zia.dlp.totalDictionaries} compact />
                    </div>
                  </div>

                  {/* Row 3: Protection Status */}
                  <div class="card card-compact col-12">
                    <div class="card-title">Protection Status</div>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                      {zia.securityPolicy.enabledProtections.map((p) => (
                        <span key={p} class="badge badge-low">{p}</span>
                      ))}
                      {zia.securityPolicy.disabledProtections.map((p) => (
                        <span key={p} class="badge badge-critical">{p}</span>
                      ))}
                      {zia.securityPolicy.enabledProtections.length === 0 && zia.securityPolicy.disabledProtections.length === 0 && (
                        <p class="no-data">No protection data</p>
                      )}
                    </div>
                  </div>
                </>
              );
            })() : (
              <div class="col-12">
                <p class="no-data">Zscaler not configured</p>
              </div>
            )}
          </div>

          {/* ═══ ZPA TAB ═══ */}
          <div id="tab-zpa" class="tab-content">
            {zscaler?.zpa ? (() => {
              const zpa = zscaler.zpa;
              return (
                <>
                  {/* Row 1: Key Metrics */}
                  <div class="col-12">
                    <div class="metric-grid" style="grid-template-columns: repeat(6, 1fr);">
                      <MetricCard label="Connectors" value={`${zpa.connectors.healthy}/${zpa.connectors.total}`} source="ZS" compact
                        severity={zpa.connectors.unhealthy > 0 ? 'critical' : undefined} />
                      <MetricCard label="Unhealthy" value={zpa.connectors.unhealthy} compact
                        severity={zpa.connectors.unhealthy > 0 ? 'critical' : undefined} />
                      <MetricCard label="Outdated" value={zpa.connectors.outdated} compact
                        severity={zpa.connectors.outdated > 0 ? 'high' : undefined} />
                      <MetricCard label="Applications" value={zpa.applications.total} compact />
                      <MetricCard label="Server Groups" value={zpa.serverGroups.total} compact />
                      <MetricCard label="Access Policies" value={zpa.accessPolicies.total} compact />
                    </div>
                  </div>

                  {/* Row 2: Applications, Connector Groups, Server Groups */}
                  <div class="card card-compact col-4">
                    <div class="card-title">Applications ({zpa.applications.total})</div>
                    <div class="mini-metric-grid">
                      <MetricCard label="Total" value={zpa.applications.total} compact />
                      <MetricCard label="Enabled" value={zpa.applications.enabled} compact />
                      <MetricCard label="Disabled" value={zpa.applications.disabled} compact
                        severity={zpa.applications.disabled > 0 ? 'medium' : undefined} />
                      <MetricCard label="Seg Groups" value={zpa.segmentGroups.total} compact />
                    </div>
                  </div>

                  <div class="card card-compact col-4">
                    <div class="card-title">Connector Groups</div>
                    {Object.keys(zpa.connectors.byGroup).length > 0 ? (
                      Object.entries(zpa.connectors.byGroup).map(([group, info]) => (
                        <div class="stat-row" key={group}>
                          <span class="stat-label">{group}</span>
                          <span class="stat-value">{info.healthy}/{info.total}</span>
                        </div>
                      ))
                    ) : (
                      <p class="no-data">No connector groups</p>
                    )}
                  </div>

                  <div class="card card-compact col-4">
                    <div class="card-title">Server Groups</div>
                    <div class="mini-metric-grid">
                      <MetricCard label="Total" value={zpa.serverGroups.total} compact />
                    </div>
                  </div>

                  {/* Row 3: Connector Table */}
                  <div class="card card-compact col-12">
                    <div class="card-title">Connectors</div>
                    <table class="compact-table">
                      <thead>
                        <tr><th>Name</th><th>Group</th><th>Status</th><th>Version</th><th>Last Connected</th></tr>
                      </thead>
                      <tbody>
                        {zpa.connectors.list.map((conn) => (
                          <tr key={conn.id}>
                            <td>{conn.name}</td>
                            <td>{conn.connectorGroupName}</td>
                            <td>
                              <span class={`badge ${conn.runtimeStatus === 'ZPN_STATUS_AUTHENTICATED' ? 'badge-low' : conn.runtimeStatus === 'ZPN_STATUS_DISCONNECTED' ? 'badge-critical' : 'badge-medium'}`}>
                                {conn.runtimeStatus === 'ZPN_STATUS_AUTHENTICATED' ? 'Connected' : conn.runtimeStatus === 'ZPN_STATUS_DISCONNECTED' ? 'Disconnected' : conn.runtimeStatus}
                              </span>
                            </td>
                            <td>
                              {conn.currentVersion || '-'}
                              {conn.currentVersion && conn.expectedVersion && conn.currentVersion !== conn.expectedVersion && (
                                <span class="badge badge-medium" style="margin-left: 4px; font-size: 0.5rem;">Update</span>
                              )}
                            </td>
                            <td style="white-space: nowrap;">{conn.lastBrokerConnectTime ? new Date(conn.lastBrokerConnectTime).toLocaleDateString() : '-'}</td>
                          </tr>
                        ))}
                        {zpa.connectors.list.length === 0 && (
                          <tr><td colSpan={5}><p class="no-data">No connectors</p></td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })() : (
              <div class="col-12">
                <p class="no-data">Zscaler not configured</p>
              </div>
            )}
          </div>
        </div>

        {/* ═══ FOOTER ═══ */}
        <footer>
          <p>Last updated: {new Date(lastUpdated).toLocaleString()}</p>
        </footer>
      </div>
    </Layout>
  );
};
