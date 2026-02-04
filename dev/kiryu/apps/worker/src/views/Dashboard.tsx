import type { FC } from 'hono/jsx';
import { Layout } from './Layout';
import { SecurityScore } from './components/SecurityScore';
import { MetricCard } from './components/MetricCard';
import { ThreatChart } from './components/ThreatChart';
import { PlatformStatus } from './components/PlatformStatus';
import type { AlertSummary, HostSummary, IncidentSummary, VulnerabilitySummary, ZTASummary } from '../integrations/crowdstrike/client';
import type { TicketMetrics } from '../integrations/salesforce/client';

interface DashboardData {
  crowdstrike: {
    alerts: AlertSummary;
    hosts: HostSummary;
    incidents: IncidentSummary;
    vulnerabilities: VulnerabilitySummary;
    zta: ZTASummary;
    fetchedAt: string;
  } | null;
  salesforce: TicketMetrics | null;
  platforms: Array<{
    platform: string;
    status: 'healthy' | 'error' | 'not_configured' | 'unknown';
    last_sync: string | null;
    error_message?: string;
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

// Helper to format minutes to human readable
const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`;
  return `${(minutes / 1440).toFixed(1)}d`;
};

export const Dashboard: FC<Props> = ({ data }) => {
  const { crowdstrike, salesforce, platforms, period, lastUpdated } = data;

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
            <p>CrowdStrike Falcon + Salesforce Service Cloud</p>
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

      {/* Error/Warning banners */}
      {(() => {
        const csStatus = platforms.find(p => p.platform === 'crowdstrike');
        const sfStatus = platforms.find(p => p.platform === 'salesforce');
        const hasErrors = platforms.some(p => p.status === 'error');
        const allNotConfigured = !crowdstrike && !salesforce && !hasErrors;

        if (allNotConfigured) {
          return (
            <div class="error-banner">
              No platforms configured. Configure CrowdStrike or Salesforce credentials to see data.
            </div>
          );
        }

        if (hasErrors) {
          return (
            <div class="error-banner" style="background: #fef3c7; border-color: #f59e0b;">
              <strong>Warning:</strong> Some platforms encountered errors.
              {csStatus?.status === 'error' && (
                <div style="margin-top: 0.5rem;">
                  <strong>CrowdStrike:</strong> {csStatus.error_message || 'Unknown error'}
                </div>
              )}
              {sfStatus?.status === 'error' && (
                <div style="margin-top: 0.5rem;">
                  <strong>Salesforce:</strong> {sfStatus.error_message || 'Unknown error'}
                </div>
              )}
            </div>
          );
        }

        return null;
      })()}

      {crowdstrike || salesforce ? (
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
            )}

            {/* Row 2b: Alerts by Status (CrowdStrike) */}
            {crowdstrike && (
              <div class="col-12">
                <div class="card-title" style="margin-bottom: 1rem;">Alert Status</div>
                <div class="metric-grid" style="grid-template-columns: repeat(4, 1fr);">
                  <MetricCard
                    label="Total Alerts"
                    value={crowdstrike.alerts.total}
                  />
                  <MetricCard
                    label="New"
                    value={crowdstrike.alerts.byStatus.new}
                    severity={crowdstrike.alerts.byStatus.new > 0 ? 'high' : undefined}
                  />
                  <MetricCard
                    label="In Progress"
                    value={crowdstrike.alerts.byStatus.in_progress}
                    severity={crowdstrike.alerts.byStatus.in_progress > 0 ? 'medium' : undefined}
                  />
                  <MetricCard
                    label="Resolved"
                    value={crowdstrike.alerts.byStatus.resolved}
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
                  />
                  <MetricCard
                    label="MTTR"
                    value={formatDuration(salesforce.mttr.overall)}
                    severity={salesforce.mttr.overall > 240 ? 'high' : salesforce.mttr.overall > 120 ? 'medium' : undefined}
                  />
                  <MetricCard
                    label="SLA Compliance"
                    value={`${salesforce.slaComplianceRate.toFixed(0)}%`}
                    severity={salesforce.slaComplianceRate < 90 ? 'critical' : salesforce.slaComplianceRate < 95 ? 'medium' : undefined}
                  />
                  <MetricCard
                    label="Escalation Rate"
                    value={`${salesforce.escalationRate.toFixed(1)}%`}
                    severity={salesforce.escalationRate > 15 ? 'high' : salesforce.escalationRate > 10 ? 'medium' : undefined}
                  />
                  <MetricCard
                    label="Backlog Age"
                    value={`${salesforce.backlogAging.avgAgeHours.toFixed(0)}h`}
                    severity={salesforce.backlogAging.avgAgeHours > 72 ? 'critical' : salesforce.backlogAging.avgAgeHours > 48 ? 'medium' : undefined}
                  />
                  <MetricCard
                    label="Week Trend"
                    value={`${salesforce.weekOverWeek.changePercent >= 0 ? '+' : ''}${salesforce.weekOverWeek.changePercent.toFixed(0)}%`}
                    severity={salesforce.weekOverWeek.changePercent > 20 ? 'high' : salesforce.weekOverWeek.changePercent > 10 ? 'medium' : undefined}
                  />
                </div>
              </div>
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
                  <div class="card-title">Vulnerabilities (Spotlight) - {crowdstrike.vulnerabilities.total}</div>
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
                        <span class="stat-label">Medium</span>
                        <span class="stat-value severity-medium">{crowdstrike.vulnerabilities.bySeverity.medium}</span>
                      </div>
                      <div class="stat-row">
                        <span class="stat-label">Low</span>
                        <span class="stat-value">{crowdstrike.vulnerabilities.bySeverity.low}</span>
                      </div>
                      <div class="stat-row">
                        <span class="stat-label">With Exploits</span>
                        <span class="stat-value severity-critical">{crowdstrike.vulnerabilities.withExploits}</span>
                      </div>
                      <div class="stat-row">
                        <span class="stat-label">Affected Hosts</span>
                        <span class="stat-value">{crowdstrike.vulnerabilities.affectedHosts}</span>
                      </div>
                      <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color);">
                        <div class="stat-label" style="margin-bottom: 0.5rem;">Status:</div>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                          <span class="badge badge-high">Open: {crowdstrike.vulnerabilities.byStatus.open}</span>
                          <span class="badge">Closed: {crowdstrike.vulnerabilities.byStatus.closed}</span>
                        </div>
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
              </>
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
                  />
                  <MetricCard
                    label="Contained"
                    value={crowdstrike.hosts.byStatus.contained}
                    severity={crowdstrike.hosts.byStatus.contained > 0 ? 'critical' : undefined}
                  />
                  <MetricCard
                    label="Containment Pending"
                    value={crowdstrike.hosts.byStatus.containment_pending}
                    severity={crowdstrike.hosts.byStatus.containment_pending > 0 ? 'high' : undefined}
                  />
                  <MetricCard
                    label="Lift Pending"
                    value={crowdstrike.hosts.byStatus.lift_containment_pending}
                    severity={crowdstrike.hosts.byStatus.lift_containment_pending > 0 ? 'medium' : undefined}
                  />
                  <MetricCard
                    label="Reduced Mode"
                    value={crowdstrike.hosts.reducedFunctionality}
                    severity={crowdstrike.hosts.reducedFunctionality > 0 ? 'high' : undefined}
                  />
                </div>
              </div>
            )}

            <div class={`card ${crowdstrike ? 'col-4' : 'col-12'}`}>
              <div class="card-title">Platform Status</div>
              <PlatformStatus platforms={platforms} />
            </div>

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

            {/* Row 9: Top CVEs (CrowdStrike Spotlight) */}
            {crowdstrike && crowdstrike.vulnerabilities.topCVEs && crowdstrike.vulnerabilities.topCVEs.length > 0 && (
              <div class="card col-12">
                <div class="card-title">Top CVEs by Affected Hosts</div>
                <table>
                  <thead>
                    <tr>
                      <th>CVE ID</th>
                      <th>Severity</th>
                      <th>Affected Hosts</th>
                      <th>ExPRT Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crowdstrike.vulnerabilities.topCVEs.slice(0, 10).map((cve) => (
                      <tr key={cve.cve_id}>
                        <td>
                          <a href={`https://nvd.nist.gov/vuln/detail/${cve.cve_id}`} target="_blank" rel="noopener noreferrer">
                            {cve.cve_id}
                          </a>
                        </td>
                        <td>
                          <span class={`badge badge-${cve.severity?.toLowerCase() === 'critical' ? 'critical' : cve.severity?.toLowerCase() === 'high' ? 'high' : cve.severity?.toLowerCase() === 'medium' ? 'medium' : 'low'}`}>
                            {cve.severity || 'Unknown'}
                          </span>
                        </td>
                        <td>{cve.affected_hosts}</td>
                        <td>{cve.exprt_rating || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}

      {/* Footer */}
      <footer>
        <p>Last updated: {new Date(lastUpdated).toLocaleString()}</p>
        {crowdstrike && <p>CrowdStrike data fetched at {new Date(crowdstrike.fetchedAt).toLocaleString()}</p>}
        {salesforce && <p>Salesforce data fetched at {new Date(salesforce.fetchedAt).toLocaleString()}</p>}
      </footer>
    </Layout>
  );
};
