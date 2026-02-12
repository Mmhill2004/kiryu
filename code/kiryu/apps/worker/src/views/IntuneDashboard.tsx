import type { FC } from 'hono/jsx';
import { Layout } from './Layout';
import type { IntuneDetailedSummary } from '../integrations/microsoft/client';

interface Props {
  data: IntuneDetailedSummary | null;
  error?: string;
}

function daysSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
}

function complianceColor(rate: number): string {
  if (rate >= 95) return 'var(--healthy)';
  if (rate >= 80) return 'var(--medium)';
  return 'var(--critical)';
}

function encryptionColor(rate: number): string {
  if (rate >= 95) return 'var(--healthy)';
  if (rate >= 80) return 'var(--medium)';
  return 'var(--critical)';
}

export const IntuneDashboard: FC<Props> = ({ data, error }) => {
  return (
    <Layout title="Intune Device Management">
      <header>
        <div class="header-left">
          <div class="logo-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <div class="header-title">
            <h1>Intune Device Management</h1>
            <p>Fleet Health &bull; Compliance &bull; OS Currency &bull; Hygiene</p>
          </div>
        </div>

        <div class="header-right">
          <nav style="display: flex; gap: 4px; margin-right: 16px;">
            <a href="/" class="tab-link">Security</a>
            <a href="/intune" class="tab-link tab-active">Intune</a>
            <a href="/entra" class="tab-link">Entra ID</a>
          </nav>

          <a
            href="/intune?refresh=true"
            class="refresh-btn"
            aria-label="Refresh Intune data"
          >
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Refresh
          </a>
        </div>
      </header>

      {error && (
        <div class="error-banner">
          <strong>Error:</strong> {error}
        </div>
      )}

      {!data && !error && (
        <div class="error-banner warning-banner">
          Microsoft / Azure credentials not configured. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET.
        </div>
      )}

      {data && data.errors.length > 0 && (
        <div class="error-banner" style="background: var(--medium-bg); border-color: rgba(234, 179, 8, 0.3);">
          <strong>Warning:</strong> Some data could not be loaded: {data.errors.join('; ')}
        </div>
      )}

      {data && (
        <main class="dashboard-wrapper" style="height: auto;">
          <div class="grid">

            {/* Row 1: Headline KPIs */}
            <div class="card col-4">
              <div class="card-title">Total Managed Devices</div>
              <div class="metric-value" style="font-size: 2.5rem;">{data.totalDevices}</div>
              <div style="display: flex; gap: 12px; margin-top: 12px; flex-wrap: wrap;">
                <span class="metric-trend" style="color: var(--info);">+{data.enrolledLast7Days} this week</span>
                <span class="metric-trend" style="color: var(--text-tertiary);">+{data.enrolledLast30Days} this month</span>
              </div>
            </div>

            <div class="card col-4">
              <div class="card-title">Compliance Rate</div>
              <div class="metric-value" style={`font-size: 2.5rem; color: ${complianceColor(data.complianceRate)};`}>
                {data.complianceRate}%
              </div>
              <div style="display: flex; gap: 16px; margin-top: 12px;">
                <span class="stat-label">
                  <span style="color: var(--healthy);">&#10003;</span> {data.complianceSummary.compliantDeviceCount} compliant
                </span>
                <span class="stat-label">
                  <span style="color: var(--critical);">&#10007;</span> {data.complianceSummary.nonCompliantDeviceCount} non-compliant
                </span>
              </div>
            </div>

            <div class="card col-4">
              <div class="card-title">Encryption Rate</div>
              <div class="metric-value" style={`font-size: 2.5rem; color: ${encryptionColor(data.encryption.rate)};`}>
                {data.encryption.rate}%
              </div>
              <div style="display: flex; gap: 16px; margin-top: 12px;">
                <span class="stat-label">{data.encryption.encrypted} encrypted</span>
                <span class="stat-label" style={data.encryption.notEncrypted > 0 ? 'color: var(--critical);' : ''}>
                  {data.encryption.notEncrypted} unencrypted
                </span>
              </div>
            </div>

            {/* Health Alerts */}
            <div class="card col-12">
              <div class="card-title">Health Alerts</div>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                <div style="text-align: center; padding: 16px; background: var(--bg-raised); border-radius: 8px;">
                  <div class="metric-value" style={`font-size: 1.8rem; color: ${data.staleCount > 0 ? 'var(--medium)' : 'var(--healthy)'};`}>
                    {data.staleCount}
                  </div>
                  <div class="stat-label">Stale (30+ days)</div>
                </div>
                <div style="text-align: center; padding: 16px; background: var(--bg-raised); border-radius: 8px;">
                  <div class="metric-value" style={`font-size: 1.8rem; color: ${data.rebootNeededCount > 0 ? 'var(--high)' : 'var(--healthy)'};`}>
                    {data.rebootNeededCount}
                  </div>
                  <div class="stat-label">Reboot Needed (14+ days)</div>
                </div>
                <div style="text-align: center; padding: 16px; background: var(--bg-raised); border-radius: 8px;">
                  <div class="metric-value" style={`font-size: 1.8rem; color: ${data.jailbroken.compromised > 0 ? 'var(--critical)' : 'var(--healthy)'};`}>
                    {data.jailbroken.compromised}
                  </div>
                  <div class="stat-label">Jailbroken / Rooted</div>
                </div>
              </div>
            </div>

            {/* Row 2: Fleet Breakdown */}
            <div class="card col-4">
              <div class="card-title">Devices by Platform</div>
              <div style="display: flex; flex-direction: column; gap: 12px;">
                {[
                  { label: 'Windows', count: data.devicesByOS.windows, color: '#0078d4' },
                  { label: 'iOS / iPadOS', count: data.devicesByOS.ios, color: '#a3aaae' },
                  { label: 'macOS', count: data.devicesByOS.macos, color: '#555555' },
                  { label: 'Android', count: data.devicesByOS.android, color: '#3ddc84' },
                  ...(data.devicesByOS.other > 0 ? [{ label: 'Other', count: data.devicesByOS.other, color: '#6b7280' }] : []),
                ].map(({ label, count, color }) => (
                  <div key={label} style="display: flex; align-items: center; gap: 12px;">
                    <div style={`width: 10px; height: 10px; border-radius: 3px; background: ${color}; flex-shrink: 0;`}></div>
                    <span class="stat-label" style="flex: 1;">{label}</span>
                    <span class="stat-value">{count}</span>
                    <span class="stat-label" style="width: 40px; text-align: right;">
                      {data.totalDevices > 0 ? Math.round((count / data.totalDevices) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div class="card col-4">
              <div class="card-title">Ownership</div>
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="width: 10px; height: 10px; border-radius: 3px; background: var(--info); flex-shrink: 0;"></div>
                  <span class="stat-label" style="flex: 1;">Corporate</span>
                  <span class="stat-value">{data.ownership.corporate}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="width: 10px; height: 10px; border-radius: 3px; background: var(--accent); flex-shrink: 0;"></div>
                  <span class="stat-label" style="flex: 1;">Personal (BYOD)</span>
                  <span class="stat-value">{data.ownership.personal}</span>
                </div>
                {data.ownership.unknown > 0 && (
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 10px; height: 10px; border-radius: 3px; background: var(--not-configured); flex-shrink: 0;"></div>
                    <span class="stat-label" style="flex: 1;">Unknown</span>
                    <span class="stat-value">{data.ownership.unknown}</span>
                  </div>
                )}
              </div>

              {(data.supervised.supervised + data.supervised.unsupervised) > 0 && (
                <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border-subtle);">
                  <div class="card-title" style="font-size: 0.7rem;">iOS Supervised Mode</div>
                  <div style="display: flex; gap: 16px; margin-top: 8px;">
                    <span class="stat-label">
                      <span style={`color: ${data.supervised.rate >= 90 ? 'var(--healthy)' : 'var(--medium)'};`}>
                        {data.supervised.rate}%
                      </span> supervised
                    </span>
                    <span class="stat-label">{data.supervised.unsupervised} unsupervised</span>
                  </div>
                </div>
              )}
            </div>

            <div class="card col-4">
              <div class="card-title">Enrollment Velocity</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div style="text-align: center; padding: 16px; background: var(--bg-raised); border-radius: 8px;">
                  <div class="metric-value" style="font-size: 1.5rem; color: var(--info);">{data.enrolledLast7Days}</div>
                  <div class="stat-label">Last 7 Days</div>
                </div>
                <div style="text-align: center; padding: 16px; background: var(--bg-raised); border-radius: 8px;">
                  <div class="metric-value" style="font-size: 1.5rem;">{data.enrolledLast30Days}</div>
                  <div class="stat-label">Last 30 Days</div>
                </div>
              </div>
            </div>

            {/* Row 3: OS Version Currency — each platform gets its own card */}
            {data.osVersions.windows.length > 0 && (
              <div class="card col-6">
                <div class="card-title">Windows OS Versions</div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  {data.osVersions.windows.slice(0, 10).map((v) => (
                    <div key={v.version} style="display: flex; align-items: center; gap: 12px;">
                      <span class="stat-label" style="min-width: 120px; font-family: var(--font-mono); font-size: 0.8rem; white-space: nowrap;">{v.version}</span>
                      <div style="flex: 1; height: 8px; background: var(--bg-raised); border-radius: 4px; overflow: hidden;">
                        <div style={`width: ${v.percentage}%; height: 100%; background: #0078d4; border-radius: 4px;`}></div>
                      </div>
                      <span class="stat-value" style="min-width: 32px; text-align: right; font-size: 0.85rem;">{v.count}</span>
                      <span class="stat-label" style="min-width: 36px; text-align: right;">{v.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.osVersions.macos.length > 0 && (
              <div class="card col-6">
                <div class="card-title">macOS Versions</div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  {data.osVersions.macos.slice(0, 10).map((v) => (
                    <div key={v.version} style="display: flex; align-items: center; gap: 12px;">
                      <span class="stat-label" style="min-width: 120px; font-family: var(--font-mono); font-size: 0.8rem; white-space: nowrap;">{v.version}</span>
                      <div style="flex: 1; height: 8px; background: var(--bg-raised); border-radius: 4px; overflow: hidden;">
                        <div style={`width: ${v.percentage}%; height: 100%; background: #555; border-radius: 4px;`}></div>
                      </div>
                      <span class="stat-value" style="min-width: 32px; text-align: right; font-size: 0.85rem;">{v.count}</span>
                      <span class="stat-label" style="min-width: 36px; text-align: right;">{v.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.osVersions.ios.length > 0 && (
              <div class="card col-6">
                <div class="card-title">iOS / iPadOS Versions</div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  {data.osVersions.ios.slice(0, 10).map((v) => (
                    <div key={v.version} style="display: flex; align-items: center; gap: 12px;">
                      <span class="stat-label" style="min-width: 120px; font-family: var(--font-mono); font-size: 0.8rem; white-space: nowrap;">{v.version}</span>
                      <div style="flex: 1; height: 8px; background: var(--bg-raised); border-radius: 4px; overflow: hidden;">
                        <div style={`width: ${v.percentage}%; height: 100%; background: #a3aaae; border-radius: 4px;`}></div>
                      </div>
                      <span class="stat-value" style="min-width: 32px; text-align: right; font-size: 0.85rem;">{v.count}</span>
                      <span class="stat-label" style="min-width: 36px; text-align: right;">{v.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.osVersions.android.length > 0 && (
              <div class="card col-6">
                <div class="card-title">Android Versions</div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  {data.osVersions.android.slice(0, 10).map((v) => (
                    <div key={v.version} style="display: flex; align-items: center; gap: 12px;">
                      <span class="stat-label" style="min-width: 120px; font-family: var(--font-mono); font-size: 0.8rem; white-space: nowrap;">{v.version}</span>
                      <div style="flex: 1; height: 8px; background: var(--bg-raised); border-radius: 4px; overflow: hidden;">
                        <div style={`width: ${v.percentage}%; height: 100%; background: #3ddc84; border-radius: 4px;`}></div>
                      </div>
                      <span class="stat-value" style="min-width: 32px; text-align: right; font-size: 0.85rem;">{v.count}</span>
                      <span class="stat-label" style="min-width: 36px; text-align: right;">{v.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Row 4: Per-Policy Compliance */}
            {data.policies.length > 0 && (
              <div class="card col-12">
                <div class="card-title">Compliance by Policy</div>
                <table class="compact-table">
                  <thead>
                    <tr>
                      <th>Policy Name</th>
                      <th>Compliant</th>
                      <th>Non-Compliant</th>
                      <th>Error</th>
                      <th>Total</th>
                      <th>Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.policies.map((policy) => {
                      const rate = policy.total > 0 ? Math.round((policy.compliant / policy.total) * 100) : 0;
                      return (
                        <tr key={policy.id}>
                          <td>{policy.displayName}</td>
                          <td style="color: var(--healthy);">{policy.compliant}</td>
                          <td style={policy.nonCompliant > 0 ? 'color: var(--critical);' : ''}>{policy.nonCompliant}</td>
                          <td style={policy.error > 0 ? 'color: var(--high);' : ''}>{policy.error}</td>
                          <td>{policy.total}</td>
                          <td>
                            <span class={`badge badge-${rate >= 95 ? 'low' : rate >= 80 ? 'medium' : 'critical'}`}>
                              {rate}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Row 5: Jailbroken Devices */}
            {data.jailbroken.compromised > 0 && (
              <div class="card col-12 has-critical">
                <div class="card-title" style="color: var(--critical);">
                  Jailbroken / Rooted Devices ({data.jailbroken.compromised})
                </div>
                <table class="compact-table">
                  <thead>
                    <tr><th>Device Name</th><th>OS</th><th>User</th><th>Compliance</th><th>Ownership</th><th>Last Sync</th></tr>
                  </thead>
                  <tbody>
                    {data.jailbroken.devices.map((d) => (
                      <tr key={d.id}>
                        <td>{d.deviceName}</td>
                        <td>{d.operatingSystem} {d.osVersion}</td>
                        <td>{d.userDisplayName || d.userPrincipalName}</td>
                        <td><span class={`badge badge-${d.complianceState === 'compliant' ? 'low' : 'critical'}`}>{d.complianceState}</span></td>
                        <td style="text-transform: capitalize;">{d.managedDeviceOwnerType}</td>
                        <td>{new Date(d.lastSyncDateTime).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Row 6: Non-Compliant Devices */}
            {data.nonCompliantDevices.length > 0 && (
              <div class="card col-12">
                <div class="card-title">Non-Compliant Devices ({data.nonCompliantDevices.length})</div>
                <table class="compact-table">
                  <thead>
                    <tr><th>Device Name</th><th>OS</th><th>Version</th><th>User</th><th>Encrypted</th><th>Ownership</th><th>Last Sync</th></tr>
                  </thead>
                  <tbody>
                    {data.nonCompliantDevices.slice(0, 25).map((d) => (
                      <tr key={d.id}>
                        <td>{d.deviceName}</td>
                        <td>{d.operatingSystem}</td>
                        <td style="font-family: var(--font-mono); font-size: 0.8rem;">{d.osVersion}</td>
                        <td>{d.userDisplayName || d.userPrincipalName}</td>
                        <td><span class={`badge badge-${d.isEncrypted ? 'low' : 'critical'}`}>{d.isEncrypted ? 'Yes' : 'No'}</span></td>
                        <td style="text-transform: capitalize;">{d.managedDeviceOwnerType}</td>
                        <td>{new Date(d.lastSyncDateTime).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.nonCompliantDevices.length > 25 && (
                  <div class="no-data">Showing 25 of {data.nonCompliantDevices.length}. Use /api/integrations/microsoft/intune/devices?compliance=noncompliant for full list.</div>
                )}
              </div>
            )}

            {/* Row 7: Stale Devices */}
            {data.staleDevices.length > 0 && (
              <div class="card col-12">
                <div class="card-title">Stale Devices - Not Seen in 30+ Days ({data.staleCount})</div>
                <table class="compact-table">
                  <thead>
                    <tr><th>Device Name</th><th>OS</th><th>User</th><th>Last Sync</th><th>Days Ago</th><th>Ownership</th><th>Model</th></tr>
                  </thead>
                  <tbody>
                    {data.staleDevices.slice(0, 25).map((d) => (
                      <tr key={d.id}>
                        <td>{d.deviceName}</td>
                        <td>{d.operatingSystem}</td>
                        <td>{d.userDisplayName || d.userPrincipalName}</td>
                        <td>{new Date(d.lastSyncDateTime).toLocaleDateString()}</td>
                        <td><span class={`badge badge-${daysSince(d.lastSyncDateTime) > 60 ? 'critical' : 'medium'}`}>{daysSince(d.lastSyncDateTime)}d</span></td>
                        <td style="text-transform: capitalize;">{d.managedDeviceOwnerType}</td>
                        <td>{d.manufacturer} {d.model}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.staleDevices.length > 25 && (
                  <div class="no-data">Showing 25 of {data.staleCount}. Use /api/integrations/microsoft/intune/stale for full list.</div>
                )}
              </div>
            )}

            {/* Row 8: Reboot Needed */}
            {data.rebootNeeded.length > 0 && (
              <div class="card col-12">
                <div class="card-title">Reboot Needed - Not Rebooted in 14+ Days ({data.rebootNeededCount})</div>
                <table class="compact-table">
                  <thead>
                    <tr><th>Device Name</th><th>OS</th><th>User</th><th>Last Reboot</th><th>Days Ago</th><th>Compliance</th><th>Model</th></tr>
                  </thead>
                  <tbody>
                    {data.rebootNeeded.slice(0, 25).map((d) => {
                      const rebootDate = d.hardwareInformation?.lastRebootDateTime || '';
                      const days = rebootDate ? daysSince(rebootDate) : 0;
                      return (
                        <tr key={d.id}>
                          <td>{d.deviceName}</td>
                          <td>{d.operatingSystem}</td>
                          <td>{d.userDisplayName || d.userPrincipalName}</td>
                          <td>{rebootDate ? new Date(rebootDate).toLocaleDateString() : 'Unknown'}</td>
                          <td><span class={`badge badge-${days > 30 ? 'critical' : days > 21 ? 'high' : 'medium'}`}>{days}d</span></td>
                          <td><span class={`badge badge-${d.complianceState === 'compliant' ? 'low' : 'critical'}`}>{d.complianceState}</span></td>
                          <td>{d.manufacturer} {d.model}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {data.rebootNeeded.length > 25 && (
                  <div class="no-data">Showing 25 of {data.rebootNeededCount}. Use /api/integrations/microsoft/intune/reboot-needed for full list.</div>
                )}
              </div>
            )}

            {/* All clear state */}
            {data.staleDevices.length === 0 && data.rebootNeeded.length === 0 &&
             data.jailbroken.compromised === 0 && data.nonCompliantDevices.length === 0 && (
              <div class="card col-12" style="text-align: center; padding: 40px;">
                <div class="stat-value">All Clear</div>
                <div class="stat-label" style="margin-top: 8px;">
                  No stale devices, no reboot issues, no jailbroken devices, and full compliance.
                </div>
              </div>
            )}

          </div>
        </main>
      )}

      <footer>
        {data && <p>Data fetched: {new Date(data.fetchedAt).toLocaleString()}</p>}
        <p style="margin-top: 4px;">
          <a href="/" style="color: var(--accent);">Back to Security Dashboard</a>
        </p>
      </footer>
    </Layout>
  );
};
