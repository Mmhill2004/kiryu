import type { ReportData } from '../services/report';

const TACTIC_DESCRIPTIONS: Record<string, string> = {
  'Reconnaissance': 'Gathering information about the organization to plan an attack',
  'Resource Development': 'Building infrastructure or acquiring tools for an attack',
  'Initial Access': 'Attempting to gain first entry into the network',
  'Execution': 'Running malicious code on compromised systems',
  'Persistence': 'Maintaining a foothold in the environment',
  'Privilege Escalation': 'Attempting to gain higher-level permissions',
  'Defense Evasion': 'Trying to avoid detection by security tools',
  'Credential Access': 'Stealing usernames, passwords, or authentication tokens',
  'Discovery': 'Mapping out the network and identifying valuable targets',
  'Lateral Movement': 'Moving between systems after initial compromise',
  'Collection': 'Gathering data of interest before exfiltration',
  'Command and Control': 'Communicating with compromised systems from outside',
  'Exfiltration': 'Stealing data from the network',
  'Impact': 'Disrupting or destroying systems and data',
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`;
  return `${(minutes / 1440).toFixed(1)}d`;
}

function scoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#eab308';
  return '#ef4444';
}

function severityColor(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'critical': return '#ef4444';
    case 'high': return '#f97316';
    case 'medium': return '#eab308';
    case 'low': return '#22c55e';
    default: return '#6b7280';
  }
}

function severityBg(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'critical': return '#fef2f2';
    case 'high': return '#fff7ed';
    case 'medium': return '#fefce8';
    case 'low': return '#f0fdf4';
    default: return '#f9fafb';
  }
}

function statusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'healthy': return '#22c55e';
    case 'error': return '#ef4444';
    case 'not_configured': return '#9ca3af';
    default: return '#9ca3af';
  }
}

function generateExecutiveSummary(data: ReportData): string {
  const parts: string[] = [];

  parts.push(`This report summarizes the security posture for ${data.monthLabel}.`);

  if (data.securityScore.current > 0) {
    const direction = data.securityScore.direction === 'up' ? 'improved' :
      data.securityScore.direction === 'down' ? 'declined' : 'remained stable';
    parts.push(`The overall security score is ${data.securityScore.current}/100, which has ${direction} compared to the prior period${data.securityScore.previous > 0 ? ` (${data.securityScore.previous}/100)` : ''}.`);
  }

  if (data.alerts.total > 0) {
    parts.push(`A total of ${data.alerts.total} security alerts were observed, with ${data.alerts.bySeverity.critical || 0} critical and ${data.alerts.bySeverity.high || 0} high severity.`);
  }

  if (data.alerts.trend.changePercent !== 0) {
    const direction = data.alerts.trend.changePercent > 0 ? 'increase' : 'decrease';
    parts.push(`This represents a ${Math.abs(data.alerts.trend.changePercent)}% ${direction} in alert volume compared to the previous month.`);
  }

  if (data.hosts.total > 0) {
    parts.push(`${data.hosts.total} endpoints are under management, with ${data.hosts.online} currently online.`);
  }

  if (data.incidents.total > 0) {
    parts.push(`${data.incidents.total} security incidents were tracked, of which ${data.incidents.open} remain open.`);
    if (data.incidents.mttr !== null) {
      parts.push(`The mean time to resolve incidents was ${data.incidents.mttr.toFixed(1)} hours.`);
    }
  }

  if (data.serviceDesk) {
    parts.push(`The service desk managed ${data.serviceDesk.openTickets} open tickets with an SLA compliance rate of ${data.serviceDesk.slaComplianceRate.toFixed(0)}%.`);
  }

  return parts.join(' ');
}

function renderSeverityBar(label: string, count: number, maxCount: number, severity: string): string {
  const pct = maxCount > 0 ? Math.max(2, (count / maxCount) * 100) : 0;
  return `
    <div style="display: flex; align-items: center; margin-bottom: 10px;">
      <div style="width: 80px; font-size: 13px; font-weight: 500; color: #374151; text-transform: capitalize;">${escapeHtml(label)}</div>
      <div style="flex: 1; height: 28px; background: ${severityBg(severity)}; border-radius: 6px; overflow: hidden; margin: 0 12px; border: 1px solid #e5e7eb;">
        <div style="width: ${pct}%; height: 100%; background: ${severityColor(severity)}; border-radius: 5px; opacity: 0.85;"></div>
      </div>
      <div style="width: 40px; text-align: right; font-family: 'JetBrains Mono', monospace; font-weight: 600; font-size: 14px; color: #111827;">${count}</div>
    </div>`;
}

function renderTacticsSection(byTactic: Record<string, number>): string {
  const entries = Object.entries(byTactic).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (entries.length === 0) {
    return '<p style="color: #9ca3af; font-style: italic; text-align: center; padding: 16px 0;">No MITRE ATT&CK tactics observed during this period.</p>';
  }

  let html = '<table style="width: 100%; border-collapse: collapse; font-size: 13px;">';
  html += '<thead><tr style="border-bottom: 2px solid #e5e7eb;">';
  html += '<th style="text-align: left; padding: 8px 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em;">Tactic</th>';
  html += '<th style="text-align: left; padding: 8px 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em;">Description</th>';
  html += '<th style="text-align: right; padding: 8px 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em;">Count</th>';
  html += '</tr></thead><tbody>';

  for (const [tactic, count] of entries) {
    const desc = TACTIC_DESCRIPTIONS[tactic] || 'Adversary activity observed';
    html += `<tr style="border-bottom: 1px solid #f3f4f6;">`;
    html += `<td style="padding: 10px 12px; font-weight: 500; color: #111827;">${escapeHtml(tactic)}</td>`;
    html += `<td style="padding: 10px 12px; color: #6b7280; font-size: 12px;">${escapeHtml(desc)}</td>`;
    html += `<td style="padding: 10px 12px; text-align: right; font-family: 'JetBrains Mono', monospace; font-weight: 600; color: #111827;">${count}</td>`;
    html += `</tr>`;
  }

  html += '</tbody></table>';
  return html;
}

export function renderReport(data: ReportData): string {
  const maxSeverity = Math.max(
    data.alerts.bySeverity.critical || 0,
    data.alerts.bySeverity.high || 0,
    data.alerts.bySeverity.medium || 0,
    data.alerts.bySeverity.low || 0,
    1
  );

  const maxIncidentSeverity = Math.max(
    data.incidents.bySeverity.critical || 0,
    data.incidents.bySeverity.high || 0,
    data.incidents.bySeverity.medium || 0,
    data.incidents.bySeverity.low || 0,
    1
  );

  const generatedDate = new Date(data.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });

  const trendArrow = data.securityScore.direction === 'up' ? '&#9650;' :
    data.securityScore.direction === 'down' ? '&#9660;' : '&#9644;';
  const trendColor = data.securityScore.direction === 'up' ? '#22c55e' :
    data.securityScore.direction === 'down' ? '#ef4444' : '#6b7280';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Report - ${escapeHtml(data.monthLabel)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { font-size: 15px; }
    body {
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #ffffff;
      color: #111827;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    @media print {
      body { font-size: 12px; }
      .page-break { page-break-before: always; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 48px 56px; position: relative; overflow: hidden;">
    <div style="position: absolute; top: -60px; right: -60px; width: 200px; height: 200px; background: radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%); border-radius: 50%;"></div>
    <div style="position: absolute; bottom: -40px; left: 20%; width: 150px; height: 150px; background: radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%); border-radius: 50%;"></div>
    <div style="position: relative; z-index: 1;">
      <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 8px;">
        <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #f59e0b, #fbbf24); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
        </div>
        <div>
          <h1 style="font-size: 28px; font-weight: 700; letter-spacing: -0.02em; margin: 0;">Monthly Security Report</h1>
          <p style="font-size: 16px; color: #94a3b8; margin: 2px 0 0 0; font-weight: 400;">${escapeHtml(data.monthLabel)}</p>
        </div>
      </div>
    </div>
  </div>

  <div style="max-width: 900px; margin: 0 auto; padding: 40px 56px 60px;">

    <!-- Executive Summary -->
    <div style="margin-bottom: 40px;">
      <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 3px solid #f59e0b; display: inline-block;">Executive Summary</h2>
      <p style="font-size: 14px; color: #374151; line-height: 1.8;">${escapeHtml(generateExecutiveSummary(data))}</p>
    </div>

    <!-- Security Score -->
    <div style="margin-bottom: 40px;">
      <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 3px solid #f59e0b; display: inline-block;">Security Score</h2>
      <div style="display: flex; align-items: center; gap: 40px; padding: 24px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
        <div style="text-align: center;">
          <div style="width: 120px; height: 120px; border-radius: 50%; background: conic-gradient(${scoreColor(data.securityScore.current)} ${data.securityScore.current * 3.6}deg, #e5e7eb 0deg); display: flex; align-items: center; justify-content: center; position: relative;">
            <div style="width: 96px; height: 96px; border-radius: 50%; background: #f9fafb; display: flex; align-items: center; justify-content: center; flex-direction: column;">
              <span style="font-family: 'JetBrains Mono', monospace; font-size: 32px; font-weight: 700; color: ${scoreColor(data.securityScore.current)};">${data.securityScore.current}</span>
              <span style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">/100</span>
            </div>
          </div>
        </div>
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <span style="font-size: 14px; font-weight: 500; color: #374151;">Trend:</span>
            <span style="color: ${trendColor}; font-size: 16px; font-weight: 600;">${trendArrow} ${data.securityScore.direction === 'up' ? 'Improving' : data.securityScore.direction === 'down' ? 'Declining' : 'Stable'}</span>
          </div>
          ${data.securityScore.previous > 0 ? `<div style="font-size: 13px; color: #6b7280;">Previous period: <strong style="color: #374151;">${data.securityScore.previous}/100</strong></div>` : ''}
          <div style="font-size: 13px; color: #6b7280; margin-top: 8px;">
            ${data.securityScore.current >= 80 ? 'The security posture is strong. Continue monitoring for emerging threats.' :
              data.securityScore.current >= 60 ? 'The security posture is moderate. Address high and critical findings to improve.' :
              'The security posture requires immediate attention. Prioritize critical and high severity items.'}
          </div>
        </div>
      </div>
    </div>

    <!-- Threat Landscape -->
    <div style="margin-bottom: 40px;">
      <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 3px solid #f59e0b; display: inline-block;">Threat Landscape</h2>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
        <!-- Alerts by Severity -->
        <div style="padding: 20px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
          <h3 style="font-size: 14px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px;">Alerts by Severity</h3>
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 700; color: #111827; margin-bottom: 16px;">${data.alerts.total} <span style="font-size: 14px; font-weight: 400; color: #6b7280;">total</span></div>
          ${renderSeverityBar('Critical', data.alerts.bySeverity.critical || 0, maxSeverity, 'critical')}
          ${renderSeverityBar('High', data.alerts.bySeverity.high || 0, maxSeverity, 'high')}
          ${renderSeverityBar('Medium', data.alerts.bySeverity.medium || 0, maxSeverity, 'medium')}
          ${renderSeverityBar('Low', data.alerts.bySeverity.low || 0, maxSeverity, 'low')}
        </div>

        <!-- Alert Trend -->
        <div style="padding: 20px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
          <h3 style="font-size: 14px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px;">Month-over-Month Trend</h3>
          <div style="display: flex; gap: 24px; margin-bottom: 20px;">
            <div>
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Current Month</div>
              <div style="font-family: 'JetBrains Mono', monospace; font-size: 24px; font-weight: 700; color: #111827;">${data.alerts.trend.current}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Previous Month</div>
              <div style="font-family: 'JetBrains Mono', monospace; font-size: 24px; font-weight: 700; color: #6b7280;">${data.alerts.trend.previous}</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: ${data.alerts.trend.changePercent > 10 ? '#fef2f2' : data.alerts.trend.changePercent < -10 ? '#f0fdf4' : '#f9fafb'}; border-radius: 8px; border: 1px solid ${data.alerts.trend.changePercent > 10 ? '#fecaca' : data.alerts.trend.changePercent < -10 ? '#bbf7d0' : '#e5e7eb'};">
            <span style="font-size: 18px; color: ${data.alerts.trend.changePercent > 0 ? '#ef4444' : data.alerts.trend.changePercent < 0 ? '#22c55e' : '#6b7280'};">
              ${data.alerts.trend.changePercent > 0 ? '&#9650;' : data.alerts.trend.changePercent < 0 ? '&#9660;' : '&#9644;'}
            </span>
            <span style="font-size: 14px; font-weight: 600; color: ${data.alerts.trend.changePercent > 0 ? '#ef4444' : data.alerts.trend.changePercent < 0 ? '#22c55e' : '#6b7280'};">
              ${data.alerts.trend.changePercent > 0 ? '+' : ''}${data.alerts.trend.changePercent}%
            </span>
            <span style="font-size: 13px; color: #6b7280;">vs. previous month</span>
          </div>
        </div>
      </div>

      <!-- Top Tactics -->
      <div style="padding: 20px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
        <h3 style="font-size: 14px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px;">Top MITRE ATT&CK Tactics</h3>
        ${renderTacticsSection(data.alerts.byTactic)}
      </div>
    </div>

    <!-- Incident Response -->
    <div style="margin-bottom: 40px;" class="page-break">
      <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 3px solid #f59e0b; display: inline-block;">Incident Response</h2>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        <!-- Incident Overview -->
        <div style="padding: 20px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
          <h3 style="font-size: 14px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px;">Overview</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div style="text-align: center; padding: 16px; background: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb;">
              <div style="font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 700; color: #111827;">${data.incidents.total}</div>
              <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px;">Total</div>
            </div>
            <div style="text-align: center; padding: 16px; background: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb;">
              <div style="font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 700; color: ${data.incidents.open > 0 ? '#f97316' : '#22c55e'};">${data.incidents.open}</div>
              <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px;">Open</div>
            </div>
            <div style="text-align: center; padding: 16px; background: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb;">
              <div style="font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 700; color: #22c55e;">${data.incidents.closed}</div>
              <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px;">Closed</div>
            </div>
            <div style="text-align: center; padding: 16px; background: ${data.incidents.withLateralMovement > 0 ? '#fef2f2' : '#ffffff'}; border-radius: 8px; border: 1px solid ${data.incidents.withLateralMovement > 0 ? '#fecaca' : '#e5e7eb'};">
              <div style="font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 700; color: ${data.incidents.withLateralMovement > 0 ? '#ef4444' : '#111827'};">${data.incidents.withLateralMovement}</div>
              <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px;">Lateral Movement</div>
            </div>
          </div>
          ${data.incidents.mttr !== null ? `
          <div style="margin-top: 16px; padding: 12px 16px; background: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb; text-align: center;">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Mean Time to Resolve</div>
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 22px; font-weight: 700; color: #111827;">${data.incidents.mttr.toFixed(1)}h</div>
          </div>` : ''}
        </div>

        <!-- Incidents by Severity -->
        <div style="padding: 20px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
          <h3 style="font-size: 14px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px;">Incidents by Severity</h3>
          ${renderSeverityBar('Critical', data.incidents.bySeverity.critical || 0, maxIncidentSeverity, 'critical')}
          ${renderSeverityBar('High', data.incidents.bySeverity.high || 0, maxIncidentSeverity, 'high')}
          ${renderSeverityBar('Medium', data.incidents.bySeverity.medium || 0, maxIncidentSeverity, 'medium')}
          ${renderSeverityBar('Low', data.incidents.bySeverity.low || 0, maxIncidentSeverity, 'low')}
          ${data.incidents.withLateralMovement > 0 ? `
          <div style="margin-top: 16px; padding: 12px 16px; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
            <div style="font-size: 13px; color: #991b1b; font-weight: 500;">
              Lateral movement was detected in ${data.incidents.withLateralMovement} incident(s). This is a high-risk indicator requiring immediate investigation of network segmentation and access controls.
            </div>
          </div>` : ''}
        </div>
      </div>
    </div>

    <!-- Endpoint Posture -->
    <div style="margin-bottom: 40px;">
      <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 3px solid #f59e0b; display: inline-block;">Endpoint Posture</h2>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px;">
        <div style="text-align: center; padding: 20px 16px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 700; color: #111827;">${data.hosts.total}</div>
          <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 6px;">Total Endpoints</div>
        </div>
        <div style="text-align: center; padding: 20px 16px; background: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0;">
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 700; color: #22c55e;">${data.hosts.online}</div>
          <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 6px;">Online</div>
        </div>
        <div style="text-align: center; padding: 20px 16px; background: ${data.hosts.contained > 0 ? '#fef2f2' : '#f9fafb'}; border-radius: 12px; border: 1px solid ${data.hosts.contained > 0 ? '#fecaca' : '#e5e7eb'};">
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 700; color: ${data.hosts.contained > 0 ? '#ef4444' : '#111827'};">${data.hosts.contained}</div>
          <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 6px;">Contained</div>
        </div>
        <div style="text-align: center; padding: 20px 16px; background: ${data.hosts.staleEndpoints > 5 ? '#fefce8' : '#f9fafb'}; border-radius: 12px; border: 1px solid ${data.hosts.staleEndpoints > 5 ? '#fde68a' : '#e5e7eb'};">
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 700; color: ${data.hosts.staleEndpoints > 5 ? '#eab308' : '#111827'};">${data.hosts.staleEndpoints}</div>
          <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 6px;">Stale (7+ days)</div>
        </div>
      </div>
      ${Object.keys(data.hosts.byPlatform).length > 0 ? `
      <div style="padding: 16px 20px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
        <h3 style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">By Platform</h3>
        <div style="display: flex; gap: 24px;">
          ${Object.entries(data.hosts.byPlatform).map(([platform, count]) =>
            `<div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 13px; color: #374151; font-weight: 500;">${escapeHtml(platform)}:</span>
              <span style="font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 600; color: #111827;">${count}</span>
            </div>`
          ).join('')}
        </div>
      </div>` : ''}
    </div>

    <!-- OverWatch Threat Hunting -->
    <div style="margin-bottom: 40px;">
      <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 3px solid #f59e0b; display: inline-block;">OverWatch Threat Hunting</h2>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px;">
        <div style="text-align: center; padding: 20px 16px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 700; color: #111827;">${data.overwatch.totalDetections}</div>
          <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 6px;">Total Detections</div>
        </div>
        <div style="text-align: center; padding: 20px 16px; background: ${data.overwatch.activeEscalations > 0 ? '#fff7ed' : '#f9fafb'}; border-radius: 12px; border: 1px solid ${data.overwatch.activeEscalations > 0 ? '#fed7aa' : '#e5e7eb'};">
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 700; color: ${data.overwatch.activeEscalations > 0 ? '#f97316' : '#111827'};">${data.overwatch.activeEscalations}</div>
          <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 6px;">Active Escalations</div>
        </div>
        <div style="text-align: center; padding: 20px 16px; background: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0;">
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 700; color: #22c55e;">${data.overwatch.resolvedLast30Days}</div>
          <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 6px;">Resolved (30d)</div>
        </div>
      </div>
      ${Object.keys(data.overwatch.detectionsBySeverity).some(k => (data.overwatch.detectionsBySeverity[k] || 0) > 0) ? `
      <div style="padding: 16px 20px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
        <h3 style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">Detections by Severity</h3>
        <div style="display: flex; gap: 16px;">
          ${Object.entries(data.overwatch.detectionsBySeverity).map(([sev, count]) =>
            `<div style="display: flex; align-items: center; gap: 6px;">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${severityColor(sev)};"></span>
              <span style="font-size: 13px; color: #374151; font-weight: 500; text-transform: capitalize;">${escapeHtml(sev)}:</span>
              <span style="font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 600; color: #111827;">${count}</span>
            </div>`
          ).join('')}
        </div>
      </div>` : `
      <div style="padding: 20px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-style: italic;">
        No OverWatch detections with severity breakdown available for this period.
      </div>`}
    </div>

    <!-- NGSIEM Activity -->
    <div style="margin-bottom: 40px;">
      <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 3px solid #f59e0b; display: inline-block;">NGSIEM Activity</h2>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
        <div style="text-align: center; padding: 20px 16px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 700; color: #111827;">${data.ngsiem.totalEvents.toLocaleString()}</div>
          <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 6px;">Total Events</div>
        </div>
        <div style="text-align: center; padding: 20px 16px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 700; color: #111827;">${data.ngsiem.repositories}</div>
          <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 6px;">Repositories</div>
        </div>
        <div style="text-align: center; padding: 20px 16px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 700; color: #111827;">${data.ngsiem.totalIngestGB} GB</div>
          <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 6px;">Total Ingest</div>
        </div>
      </div>
    </div>

    <!-- Service Desk Performance -->
    ${data.serviceDesk ? `
    <div style="margin-bottom: 40px;" class="page-break">
      <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 3px solid #f59e0b; display: inline-block;">Service Desk Performance</h2>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
        <div style="text-align: center; padding: 20px 16px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 700; color: ${data.serviceDesk.openTickets > 10 ? '#f97316' : '#111827'};">${data.serviceDesk.openTickets}</div>
          <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 6px;">Open Tickets</div>
        </div>
        <div style="text-align: center; padding: 20px 16px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 700; color: ${data.serviceDesk.mttrOverall > 240 ? '#f97316' : '#111827'};">${formatDuration(data.serviceDesk.mttrOverall)}</div>
          <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 6px;">MTTR</div>
        </div>
        <div style="text-align: center; padding: 20px 16px; background: ${data.serviceDesk.slaComplianceRate < 95 ? '#fefce8' : '#f0fdf4'}; border-radius: 12px; border: 1px solid ${data.serviceDesk.slaComplianceRate < 95 ? '#fde68a' : '#bbf7d0'};">
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 700; color: ${data.serviceDesk.slaComplianceRate < 90 ? '#ef4444' : data.serviceDesk.slaComplianceRate < 95 ? '#eab308' : '#22c55e'};">${data.serviceDesk.slaComplianceRate.toFixed(0)}%</div>
          <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 6px;">SLA Compliance</div>
        </div>
        <div style="text-align: center; padding: 20px 16px; background: ${data.serviceDesk.escalationRate > 15 ? '#fff7ed' : '#f9fafb'}; border-radius: 12px; border: 1px solid ${data.serviceDesk.escalationRate > 15 ? '#fed7aa' : '#e5e7eb'};">
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 700; color: ${data.serviceDesk.escalationRate > 15 ? '#f97316' : '#111827'};">${data.serviceDesk.escalationRate.toFixed(1)}%</div>
          <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 6px;">Escalation Rate</div>
        </div>
      </div>
    </div>` : ''}

    <!-- Recommendations -->
    ${data.recommendations.length > 0 ? `
    <div style="margin-bottom: 40px;">
      <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 3px solid #f59e0b; display: inline-block;">Recommendations</h2>
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 24px;">
        <ol style="margin: 0; padding-left: 20px; list-style-type: decimal;">
          ${data.recommendations.map((rec, i) =>
            `<li style="padding: 8px 0; font-size: 14px; color: #374151; line-height: 1.7;${i < data.recommendations.length - 1 ? ' border-bottom: 1px solid #fde68a;' : ''}">${escapeHtml(rec)}</li>`
          ).join('')}
        </ol>
      </div>
    </div>` : ''}

    <!-- Platform Health -->
    <div style="margin-bottom: 40px;">
      <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 3px solid #f59e0b; display: inline-block;">Platform Health</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 2px solid #e5e7eb;">
            <th style="text-align: left; padding: 10px 16px; font-weight: 600; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; background: #f9fafb; border-radius: 8px 0 0 0;">Platform</th>
            <th style="text-align: left; padding: 10px 16px; font-weight: 600; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; background: #f9fafb;">Status</th>
            <th style="text-align: left; padding: 10px 16px; font-weight: 600; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; background: #f9fafb; border-radius: 0 8px 0 0;">Last Sync</th>
          </tr>
        </thead>
        <tbody>
          ${data.platforms.length > 0 ? data.platforms.map((p) =>
            `<tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 10px 16px; font-weight: 500; color: #111827; text-transform: capitalize;">${escapeHtml(p.name)}</td>
              <td style="padding: 10px 16px;">
                <span style="display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; background: ${p.status === 'healthy' ? '#f0fdf4' : p.status === 'error' ? '#fef2f2' : '#f9fafb'}; color: ${statusColor(p.status)}; border: 1px solid ${p.status === 'healthy' ? '#bbf7d0' : p.status === 'error' ? '#fecaca' : '#e5e7eb'};">
                  <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${statusColor(p.status)};"></span>
                  ${escapeHtml(p.status.replace('_', ' '))}
                </span>
              </td>
              <td style="padding: 10px 16px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #6b7280;">${p.lastSync ? new Date(p.lastSync).toLocaleString() : 'Never'}</td>
            </tr>`
          ).join('') : `
          <tr>
            <td colspan="3" style="padding: 20px; text-align: center; color: #9ca3af; font-style: italic;">No platform status data available.</td>
          </tr>`}
        </tbody>
      </table>
    </div>

  </div>

  <!-- Footer -->
  <div style="background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 24px 56px; text-align: center;">
    <p style="font-size: 13px; font-weight: 600; color: #991b1b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Confidential</p>
    <p style="font-size: 12px; color: #9ca3af;">This report contains sensitive security information intended for authorized personnel only.</p>
    <p style="font-size: 12px; color: #9ca3af; margin-top: 4px;">Generated on ${escapeHtml(generatedDate)} by Kiryu Security Operations Dashboard</p>
  </div>

</body>
</html>`;
}
