import type { FC } from 'hono/jsx';
import { Layout } from './Layout';
import { SecurityScore } from './components/SecurityScore';
import { MetricCard } from './components/MetricCard';
import { ThreatChart } from './components/ThreatChart';
import { PlatformStatus } from './components/PlatformStatus';
import type { AlertSummary, HostSummary, IncidentSummary, VulnerabilitySummary, ZTASummary } from '../integrations/crowdstrike/client';

interface DashboardData {
  crowdstrike: {
    alerts: AlertSummary;
    hosts: HostSummary;
    incidents: IncidentSummary;
    vulnerabilities: VulnerabilitySummary;
    zta: ZTASummary;
    fetchedAt: string;
  } | null;
  platforms: Array<{
    platform: string;
    status: 'healthy' | 'error' | 'not_configured' | 'unknown';
    last_sync: string | null;
  }>;
  period: string;
  lastUpdated: string;
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
  const { crowdstrike, platforms, period, lastUpdated } = data;

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
            <p>CrowdStrike Falcon + Security Operations</p>
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
            class="refresh-btn"
          >
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Refresh
          </button>
        </div>
      </header>

      {!crowdstrike ? (
        <div class="error-banner">
          CrowdStrike not configured or unable to fetch data. Check your API credentials.
        </div>
      ) : (
        <>
          {/* Main Grid */}
          <div class="grid">
            {/* Row 1: Security Score + Host Overview */}
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
                />
                <MetricCard
                  label="Online"
                  value={crowdstrike.hosts.online}
                  severity={crowdstrike.hosts.online > 0 ? undefined : 'medium'}
                />
                <MetricCard
                  label="Contained"
                  value={crowdstrike.hosts.contained}
                  severity={crowdstrike.hosts.contained > 0 ? 'critical' : undefined}
                />
                <MetricCard
                  label="Stale (7+ days)"
                  value={crowdstrike.hosts.staleEndpoints}
                  severity={crowdstrike.hosts.staleEndpoints > 0 ? 'medium' : undefined}
                />
              </div>
            </div>

            {/* Row 2: Alerts by Severity */}
            <div class="col-12">
              <div class="card-title" style="margin-bottom: 1rem;">Active Alerts</div>
              <div class="metric-grid" style="grid-template-columns: repeat(5, 1fr);">
                <MetricCard
                  label="Critical"
                  value={crowdstrike.alerts.bySeverity.critical}
                  severity="critical"
                />
                <MetricCard
                  label="High"
                  value={crowdstrike.alerts.bySeverity.high}
                  severity="high"
                />
                <MetricCard
                  label="Medium"
                  value={crowdstrike.alerts.bySeverity.medium}
                  severity="medium"
                />
                <MetricCard
                  label="Low"
                  value={crowdstrike.alerts.bySeverity.low}
                  severity="low"
                />
                <MetricCard
                  label="Informational"
                  value={crowdstrike.alerts.bySeverity.informational}
                />
              </div>
            </div>

            {/* Row 3: Incidents + Vulnerabilities + ZTA */}
            <div class="card col-4">
              <div class="card-title">Incidents</div>
              <div class="stat-row">
                <span class="stat-label">Open</span>
                <span class="stat-value">{crowdstrike.incidents.open}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Closed</span>
                <span class="stat-value">{crowdstrike.incidents.closed}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">With Lateral Movement</span>
                <span class="stat-value severity-critical">{crowdstrike.incidents.withLateralMovement}</span>
              </div>
              {crowdstrike.incidents.mttr && (
                <div class="stat-row">
                  <span class="stat-label">MTTR</span>
                  <span class="stat-value">{crowdstrike.incidents.mttr}h</span>
                </div>
              )}
              <div class="stat-row">
                <span class="stat-label">Avg Fine Score</span>
                <span class="stat-value">{crowdstrike.incidents.avgFineScore}</span>
              </div>
            </div>

            <div class="card col-4">
              <div class="card-title">Vulnerabilities (Spotlight)</div>
              {crowdstrike.vulnerabilities.total > 0 ? (
                <>
                  <div class="stat-row">
                    <span class="stat-label">Critical</span>
                    <span class="stat-value severity-critical">{crowdstrike.vulnerabilities.bySeverity.critical}</span>
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">High</span>
                    <span class="stat-value severity-high">{crowdstrike.vulnerabilities.bySeverity.high}</span>
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">With Exploits</span>
                    <span class="stat-value severity-critical">{crowdstrike.vulnerabilities.withExploits}</span>
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">Affected Hosts</span>
                    <span class="stat-value">{crowdstrike.vulnerabilities.affectedHosts}</span>
                  </div>
                </>
              ) : (
                <p class="no-data">No vulnerability data (Spotlight not licensed or no vulns)</p>
              )}
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

            {/* Row 4: MITRE ATT&CK Tactics + Platform by OS + Platform Status */}
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

            <div class="card col-4">
              <div class="card-title">Platform Status</div>
              <PlatformStatus platforms={platforms} />
            </div>

            {/* Row 5: Recent Alerts */}
            <div class="card col-12">
              <div class="card-title">Recent Alerts</div>
              {crowdstrike.alerts.recentAlerts.length > 0 ? (
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
              ) : (
                <p class="no-data">No recent alerts</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <footer>
        <p>Last updated: {new Date(lastUpdated).toLocaleString()}</p>
        {crowdstrike && <p>Data fetched from CrowdStrike Falcon at {new Date(crowdstrike.fetchedAt).toLocaleString()}</p>}
      </footer>
    </Layout>
  );
};
