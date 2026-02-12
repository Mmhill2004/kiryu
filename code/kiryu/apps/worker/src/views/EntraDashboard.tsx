import type { FC } from 'hono/jsx';
import { Layout } from './Layout';
import type { EntraSummary } from '../integrations/entra/client';

interface Props {
  data: EntraSummary | null;
  error?: string;
}

function daysSinceLabel(isoDate: string | null): string {
  if (!isoDate) return 'Never';
  const days = Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days}d ago`;
}

function mfaColor(rate: number): string {
  if (rate >= 95) return 'var(--healthy)';
  if (rate >= 80) return 'var(--medium)';
  return 'var(--critical)';
}

function caStateLabel(state: string): string {
  if (state === 'enabled') return 'Enabled';
  if (state === 'enabledForReportingButNotEnforced') return 'Report-Only';
  return 'Disabled';
}

function caStateBadge(state: string): string {
  if (state === 'enabled') return 'low';
  if (state === 'enabledForReportingButNotEnforced') return 'medium';
  return 'critical';
}

function credStatusBadge(status: string): string {
  if (status === 'expired') return 'critical';
  if (status === 'critical') return 'high';
  if (status === 'warning') return 'medium';
  return 'low';
}

function formatRiskType(type: string): string {
  return type
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

export const EntraDashboard: FC<Props> = ({ data, error }) => {
  return (
    <Layout title="Entra ID Security">
      <header>
        <div class="header-left">
          <div class="logo-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div class="header-title">
            <h1>Entra ID Security</h1>
            <p>Identity Protection &bull; MFA &bull; Conditional Access &bull; Privileged Access</p>
          </div>
        </div>

        <div class="header-right">
          <nav style="display: flex; gap: 4px; margin-right: 16px;">
            <a href="/" class="tab-link">Security</a>
            <a href="/intune" class="tab-link">Intune</a>
            <a href="/entra" class="tab-link tab-active">Entra ID</a>
          </nav>

          <button hx-get="/entra?refresh=true" hx-target="body" hx-swap="outerHTML" class="refresh-btn" aria-label="Refresh Entra data">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Refresh
          </button>
        </div>
      </header>

      {error && <div class="error-banner"><strong>Error:</strong> {error}</div>}
      {!data && !error && (
        <div class="error-banner" style="background: var(--medium-bg); border-color: rgba(234, 179, 8, 0.3);">
          Azure credentials not configured. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET.
        </div>
      )}
      {data && data.errors.length > 0 && (
        <div class="error-banner" style="background: var(--medium-bg); border-color: rgba(234, 179, 8, 0.3);">
          <strong>Warning:</strong> Some data could not be loaded: {data.errors.join('; ')}
        </div>
      )}

      {data && (
        <main>
          <div class="grid">

            {/* ── Row 1: Headline KPIs ── */}
            <div class="card col-2">
              <div class="card-title">MFA Registration</div>
              <div class="metric-value" style={`font-size: 2.5rem; color: ${mfaColor(data.mfaStatus.mfaRate)};`}>{data.mfaStatus.mfaRate}%</div>
              <div style="display: flex; gap: 12px; margin-top: 12px;">
                <span class="stat-label">{data.mfaStatus.mfaRegistered} / {data.mfaStatus.totalUsers} users</span>
              </div>
            </div>

            <div class="card col-2">
              <div class="card-title">Risky Users</div>
              <div class="metric-value" style={`font-size: 2.5rem; color: ${data.riskyUsers.atRisk > 0 ? 'var(--critical)' : 'var(--healthy)'};`}>
                {data.riskyUsers.atRisk + data.riskyUsers.confirmedCompromised}
              </div>
              <div style="display: flex; gap: 12px; margin-top: 12px; flex-wrap: wrap;">
                {data.riskyUsers.high > 0 && <span class="stat-label" style="color: var(--critical);">{data.riskyUsers.high} high</span>}
                {data.riskyUsers.medium > 0 && <span class="stat-label" style="color: var(--high);">{data.riskyUsers.medium} medium</span>}
                {data.riskyUsers.low > 0 && <span class="stat-label">{data.riskyUsers.low} low</span>}
              </div>
            </div>

            <div class="card col-2">
              <div class="card-title">Sign-in Failures (24h)</div>
              <div class="metric-value" style={`font-size: 2.5rem; color: ${data.signInActivity.failureRate > 10 ? 'var(--critical)' : data.signInActivity.failureRate > 5 ? 'var(--medium)' : 'var(--healthy)'};`}>
                {data.signInActivity.failureRate}%
              </div>
              <div style="display: flex; gap: 12px; margin-top: 12px;">
                <span class="stat-label">{data.signInActivity.failedSignIns} failed / {data.signInActivity.totalSignIns} total</span>
              </div>
            </div>

            {/* Health Alerts */}
            <div class="card col-6">
              <div class="card-title">Identity Health Alerts</div>
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
                <div style="text-align: center; padding: 14px 8px; background: var(--bg-elevated); border-radius: 8px;">
                  <div class="metric-value" style={`font-size: 1.5rem; color: ${data.privilegedRoles.globalAdminCount > 5 ? 'var(--critical)' : 'var(--text-primary)'};`}>
                    {data.privilegedRoles.globalAdminCount}
                  </div>
                  <div class="stat-label">Global Admins</div>
                </div>
                <div style="text-align: center; padding: 14px 8px; background: var(--bg-elevated); border-radius: 8px;">
                  <div class="metric-value" style={`font-size: 1.5rem; color: ${data.appHygiene.expiredCount > 0 ? 'var(--critical)' : 'var(--healthy)'};`}>
                    {data.appHygiene.expiredCount}
                  </div>
                  <div class="stat-label">Expired Secrets</div>
                </div>
                <div style="text-align: center; padding: 14px 8px; background: var(--bg-elevated); border-radius: 8px;">
                  <div class="metric-value" style={`font-size: 1.5rem; color: ${data.userHygiene.staleUserCount > 0 ? 'var(--medium)' : 'var(--healthy)'};`}>
                    {data.userHygiene.staleUserCount}
                  </div>
                  <div class="stat-label">Stale Users (90d)</div>
                </div>
                <div style="text-align: center; padding: 14px 8px; background: var(--bg-elevated); border-radius: 8px;">
                  <div class="metric-value" style={`font-size: 1.5rem; color: ${data.signInActivity.riskySignIns > 0 ? 'var(--high)' : 'var(--healthy)'};`}>
                    {data.signInActivity.riskySignIns}
                  </div>
                  <div class="stat-label">Risky Sign-ins (24h)</div>
                </div>
              </div>
            </div>

            {/* ── Row 2: MFA & Auth Methods ── */}
            <div class="card col-4">
              <div class="card-title">Authentication Coverage</div>
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span class="stat-label" style="flex: 1;">MFA Registered</span>
                  <span class="stat-value" style={`color: ${mfaColor(data.mfaStatus.mfaRate)};`}>{data.mfaStatus.mfaRate}%</span>
                  <span class="stat-label" style="width: 80px; text-align: right;">{data.mfaStatus.mfaRegistered} users</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span class="stat-label" style="flex: 1;">Passwordless Capable</span>
                  <span class="stat-value">{data.mfaStatus.passwordlessRate}%</span>
                  <span class="stat-label" style="width: 80px; text-align: right;">{data.mfaStatus.passwordlessCapable} users</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span class="stat-label" style="flex: 1;">SSPR Registered</span>
                  <span class="stat-value">{data.mfaStatus.ssprRate}%</span>
                  <span class="stat-label" style="width: 80px; text-align: right;">{data.mfaStatus.ssprRegistered} users</span>
                </div>
              </div>
              {data.mfaStatus.methodBreakdown.length > 0 && (
                <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border-subtle);">
                  <div class="card-title" style="font-size: 0.7rem;">Methods Registered</div>
                  <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 8px;">
                    {data.mfaStatus.methodBreakdown.slice(0, 6).map(m => (
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="stat-label" style="flex: 1; font-size: 0.8rem;">{m.method}</span>
                        <span class="stat-value" style="font-size: 0.85rem;">{m.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Conditional Access */}
            <div class="card col-4">
              <div class="card-title">Conditional Access Policies</div>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;">
                <div style="text-align: center; padding: 12px; background: var(--bg-elevated); border-radius: 8px;">
                  <div class="metric-value" style="font-size: 1.3rem; color: var(--healthy);">{data.conditionalAccess.enabled}</div>
                  <div class="stat-label">Enabled</div>
                </div>
                <div style="text-align: center; padding: 12px; background: var(--bg-elevated); border-radius: 8px;">
                  <div class="metric-value" style="font-size: 1.3rem; color: var(--medium);">{data.conditionalAccess.reportOnly}</div>
                  <div class="stat-label">Report-Only</div>
                </div>
                <div style="text-align: center; padding: 12px; background: var(--bg-elevated); border-radius: 8px;">
                  <div class="metric-value" style="font-size: 1.3rem; color: var(--text-muted);">{data.conditionalAccess.disabled}</div>
                  <div class="stat-label">Disabled</div>
                </div>
              </div>
            </div>

            {/* User Hygiene */}
            <div class="card col-4">
              <div class="card-title">User Hygiene</div>
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span class="stat-label" style="flex: 1;">Total Users</span>
                  <span class="stat-value">{data.userHygiene.totalUsers}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span class="stat-label" style="flex: 1;">Guest Users</span>
                  <span class="stat-value">{data.userHygiene.guestUsers}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span class="stat-label" style="flex: 1;">Disabled Accounts</span>
                  <span class="stat-value">{data.userHygiene.disabledUsers}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span class="stat-label" style="flex: 1;">Stale Users (90+ days)</span>
                  <span class="stat-value" style={data.userHygiene.staleUserCount > 0 ? 'color: var(--medium);' : ''}>{data.userHygiene.staleUserCount}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span class="stat-label" style="flex: 1;">Stale Guests (90+ days)</span>
                  <span class="stat-value" style={data.userHygiene.staleGuestCount > 0 ? 'color: var(--medium);' : ''}>{data.userHygiene.staleGuestCount}</span>
                </div>
              </div>
            </div>

            {/* ── Row 3: Privileged Roles ── */}
            {data.privilegedRoles.roles.length > 0 && (
              <div class="card col-6">
                <div class="card-title">Privileged Role Assignments ({data.privilegedRoles.totalAssignments} total)</div>
                <table>
                  <thead>
                    <tr><th>Role</th><th>Members</th><th>Users</th></tr>
                  </thead>
                  <tbody>
                    {data.privilegedRoles.roles.slice(0, 15).map(role => (
                      <tr>
                        <td style={role.displayName.includes('Global Administrator') ? 'color: var(--accent-primary); font-weight: 600;' : ''}>
                          {role.displayName}
                        </td>
                        <td>
                          <span class={`badge badge-${role.displayName.includes('Global Administrator') && role.memberCount > 5 ? 'critical' : 'low'}`}>
                            {role.memberCount}
                          </span>
                        </td>
                        <td style="font-size: 0.8rem; color: var(--text-tertiary);">
                          {role.members.slice(0, 3).map(m => m.displayName).join(', ')}
                          {role.members.length > 3 ? ` +${role.members.length - 3} more` : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Risk Detections Summary */}
            <div class="card col-6">
              <div class="card-title">Risk Detections (Last 30 Days)</div>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;">
                <div style="text-align: center; padding: 12px; background: var(--bg-elevated); border-radius: 8px;">
                  <div class="metric-value" style="font-size: 1.3rem; color: var(--critical);">{data.riskDetections.high}</div>
                  <div class="stat-label">High Risk</div>
                </div>
                <div style="text-align: center; padding: 12px; background: var(--bg-elevated); border-radius: 8px;">
                  <div class="metric-value" style="font-size: 1.3rem; color: var(--high);">{data.riskDetections.medium}</div>
                  <div class="stat-label">Medium Risk</div>
                </div>
                <div style="text-align: center; padding: 12px; background: var(--bg-elevated); border-radius: 8px;">
                  <div class="metric-value" style="font-size: 1.3rem; color: var(--medium);">{data.riskDetections.low}</div>
                  <div class="stat-label">Low Risk</div>
                </div>
              </div>
              {data.riskDetections.topRiskTypes.length > 0 && (
                <div>
                  <div class="card-title" style="font-size: 0.7rem;">Top Detection Types</div>
                  <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 8px;">
                    {data.riskDetections.topRiskTypes.slice(0, 5).map(t => (
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="stat-label" style="flex: 1; font-size: 0.8rem;">{formatRiskType(t.type)}</span>
                        <span class="stat-value" style="font-size: 0.85rem;">{t.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Row 4: Conditional Access Policy List ── */}
            {data.conditionalAccess.policies.length > 0 && (
              <div class="card col-12">
                <div class="card-title">Conditional Access Policies</div>
                <table>
                  <thead>
                    <tr><th>Policy Name</th><th>State</th><th>Grant Controls</th><th>Last Modified</th></tr>
                  </thead>
                  <tbody>
                    {data.conditionalAccess.policies.map(p => (
                      <tr>
                        <td>{p.displayName}</td>
                        <td><span class={`badge badge-${caStateBadge(p.state)}`}>{caStateLabel(p.state)}</span></td>
                        <td style="font-size: 0.8rem; color: var(--text-tertiary);">
                          {p.grantControls?.builtInControls?.join(', ') || 'None'}
                        </td>
                        <td>{new Date(p.modifiedDateTime).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Row 5: Expiring App Credentials ── */}
            {data.appHygiene.expiringCredentials.length > 0 && (
              <div class="card col-12">
                <div class="card-title">
                  Expiring App Credentials ({data.appHygiene.expiredCount} expired, {data.appHygiene.expiringIn30Days} within 30 days)
                </div>
                <table>
                  <thead>
                    <tr><th>Application</th><th>Type</th><th>Credential</th><th>Expires</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {data.appHygiene.expiringCredentials.slice(0, 25).map((cred) => (
                      <tr>
                        <td>{cred.appName}</td>
                        <td style="text-transform: capitalize;">{cred.credentialType}</td>
                        <td style="font-size: 0.8rem; color: var(--text-tertiary);">{cred.credentialName || '(unnamed)'}</td>
                        <td>{new Date(cred.expiresAt).toLocaleDateString()}</td>
                        <td>
                          <span class={`badge badge-${credStatusBadge(cred.status)}`}>
                            {cred.daysUntilExpiry < 0 ? `Expired ${Math.abs(cred.daysUntilExpiry)}d ago` : `${cred.daysUntilExpiry}d`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Row 6: Risky Users Table ── */}
            {data.riskyUsers.users.length > 0 && (
              <div class="card col-12">
                <div class="card-title" style="color: var(--critical);">Active Risky Users ({data.riskyUsers.users.length})</div>
                <table>
                  <thead>
                    <tr><th>User</th><th>UPN</th><th>Risk Level</th><th>Risk State</th><th>Detail</th><th>Last Updated</th></tr>
                  </thead>
                  <tbody>
                    {data.riskyUsers.users.slice(0, 25).map(u => (
                      <tr>
                        <td>{u.userDisplayName}</td>
                        <td style="font-size: 0.8rem;">{u.userPrincipalName}</td>
                        <td><span class={`badge badge-${u.riskLevel === 'high' ? 'critical' : u.riskLevel === 'medium' ? 'high' : 'medium'}`}>{u.riskLevel}</span></td>
                        <td style="text-transform: capitalize;">{u.riskState}</td>
                        <td style="font-size: 0.8rem; color: var(--text-tertiary); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{u.riskDetail}</td>
                        <td>{new Date(u.riskLastUpdatedDateTime).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Row 7: Sign-in Failure Reasons ── */}
            {data.signInActivity.topFailureReasons.length > 0 && (
              <div class="card col-6">
                <div class="card-title">Top Sign-in Failure Reasons (24h)</div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  {data.signInActivity.topFailureReasons.slice(0, 8).map(r => (
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <span class="stat-label" style="flex: 1; font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{r.reason}</span>
                      <span class="stat-value" style="font-size: 0.85rem;">{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Users Without MFA */}
            {data.mfaStatus.usersWithoutMfa.length > 0 && (
              <div class="card col-6">
                <div class="card-title">Users Without MFA ({data.mfaStatus.totalUsers - data.mfaStatus.mfaRegistered})</div>
                <table>
                  <thead>
                    <tr><th>User</th><th>Methods</th></tr>
                  </thead>
                  <tbody>
                    {data.mfaStatus.usersWithoutMfa.slice(0, 15).map(u => (
                      <tr>
                        <td>{u.userDisplayName}</td>
                        <td style="font-size: 0.8rem; color: var(--text-tertiary);">
                          {u.methodsRegistered.length > 0 ? u.methodsRegistered.join(', ') : 'None'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.mfaStatus.usersWithoutMfa.length > 15 && (
                  <div class="no-data">Showing 15 of {data.mfaStatus.totalUsers - data.mfaStatus.mfaRegistered}. Use /api/integrations/entra/mfa-status for full details.</div>
                )}
              </div>
            )}

            {/* ── Row 8: Stale Users ── */}
            {data.userHygiene.staleUsers.length > 0 && (
              <div class="card col-12">
                <div class="card-title">Stale User Accounts - No Sign-in for 90+ Days ({data.userHygiene.staleUserCount})</div>
                <table>
                  <thead>
                    <tr><th>User</th><th>UPN</th><th>Last Sign-in</th><th>Enabled</th><th>Created</th></tr>
                  </thead>
                  <tbody>
                    {data.userHygiene.staleUsers.slice(0, 25).map(u => (
                      <tr>
                        <td>{u.displayName}</td>
                        <td style="font-size: 0.8rem;">{u.userPrincipalName}</td>
                        <td>{daysSinceLabel(u.signInActivity?.lastSignInDateTime ?? null)}</td>
                        <td><span class={`badge badge-${u.accountEnabled ? 'low' : 'medium'}`}>{u.accountEnabled ? 'Yes' : 'No'}</span></td>
                        <td>{new Date(u.createdDateTime).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.userHygiene.staleUsers.length > 25 && (
                  <div class="no-data">Showing 25 of {data.userHygiene.staleUserCount}.</div>
                )}
              </div>
            )}

            {/* All clear */}
            {data.riskyUsers.users.length === 0 && data.appHygiene.expiringCredentials.length === 0 &&
             data.userHygiene.staleUserCount === 0 && data.signInActivity.failedSignIns === 0 && (
              <div class="card col-12" style="text-align: center; padding: 40px;">
                <div class="stat-value" style="font-size: 1.2rem;">Identity Posture: Healthy</div>
                <div class="stat-label" style="margin-top: 8px;">No risky users, no expiring credentials, no stale accounts, no sign-in failures.</div>
              </div>
            )}
          </div>
        </main>
      )}

      <footer>
        {data && <p>Data fetched: {new Date(data.fetchedAt).toLocaleString()}</p>}
        <p style="margin-top: 4px;"><a href="/" style="color: var(--accent-primary);">Back to Security Dashboard</a></p>
      </footer>
    </Layout>
  );
};
