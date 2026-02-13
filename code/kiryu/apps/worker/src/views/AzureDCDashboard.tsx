import type { FC } from 'hono/jsx';
import { raw } from 'hono/html';
import { Layout } from './Layout';
import { DonutChart } from './components/DonutChart';
import type { BuiltTopology } from '../services/topology-builder';
import type { SVGTopology } from '../services/topology-svg';

interface Props {
  topology: BuiltTopology | null;
  svg: SVGTopology | null;
  cachedAt: string | null;
  configured?: boolean;
  error?: string;
}

function dataAgeLabel(isoDate: string | null): string {
  if (!isoDate) return '';
  const ms = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export const AzureDCDashboard: FC<Props> = ({ topology, svg, cachedAt, configured = true, error }) => {
  const stats = topology?.stats;

  return (
    <Layout title="Azure DC Topology" scrollable>
      <header>
        <div class="header-left">
          <div class="logo-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="2" y="2" width="20" height="8" rx="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" />
              <line x1="6" y1="18" x2="6.01" y2="18" />
            </svg>
          </div>
          <div class="header-title">
            <h1>Azure DC Topology</h1>
            <p>Virtual Networks &bull; Virtual Machines &bull; Network Security</p>
          </div>
        </div>

        <div class="header-right">
          <nav style="display: flex; gap: 4px; margin-right: 16px;">
            <a href="/" class="tab-link">Security</a>
            <a href="/intune" class="tab-link">Intune</a>
            <a href="/entra" class="tab-link">Entra ID</a>
            <a href="/azure-dc" class="tab-link tab-active">Azure DC</a>
          </nav>

          {cachedAt && (
            <span class="cache-age" style="font-size: 0.75rem; color: rgba(255,255,255,0.5); margin-right: 12px; white-space: nowrap;" title={`Cached at ${cachedAt}`}>
              Data: {dataAgeLabel(cachedAt)}
            </span>
          )}
          <a href="/azure-dc?refresh=true" class="refresh-btn" aria-label="Refresh Azure DC data">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Refresh
          </a>
        </div>
      </header>

      {error && <div class="error-banner"><strong>Error:</strong> {error}</div>}
      {!topology && !error && !configured && (
        <div class="error-banner" style="background: var(--medium-bg); border-color: rgba(234, 179, 8, 0.3);">
          Azure DC not configured. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_SUBSCRIPTION_ID.
        </div>
      )}
      {!topology && !error && configured && (
        <div class="error-banner" style="background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.3);">
          Awaiting first data sync. Data will appear after the next cron cycle (every 15 minutes).
          <a href="/azure-dc?refresh=true" style="color: #60a5fa; margin-left: 8px;">Load now</a>
        </div>
      )}
      {topology && topology.errors.length > 0 && (
        <div class="error-banner" style="background: var(--medium-bg); border-color: rgba(234, 179, 8, 0.3);">
          <strong>Warning:</strong> Some resources could not be loaded: {topology.errors.join('; ')}
        </div>
      )}

      {stats && (
        <main>
          <div class="grid">

            {/* ── Row 1: Headline KPIs ── */}
            <div class="card col-2">
              <div class="card-title">Virtual Machines</div>
              <div class="metric-value" style="font-size: 2.5rem;">{stats.totalVMs}</div>
              <div style="display: flex; gap: 12px; margin-top: 8px; flex-wrap: wrap;">
                <span class="stat-label" style="color: var(--healthy);">{stats.runningVMs} running</span>
                <span class="stat-label" style="color: var(--text-muted);">{stats.deallocatedVMs} dealloc</span>
                {stats.stoppedVMs > 0 && <span class="stat-label" style="color: var(--critical);">{stats.stoppedVMs} stopped</span>}
              </div>
            </div>

            <div class="card col-2">
              <div class="card-title">Virtual Networks</div>
              <div class="metric-value" style="font-size: 2.5rem;">{stats.totalVNets}</div>
              <div style="display: flex; gap: 12px; margin-top: 8px; flex-wrap: wrap;">
                <span class="stat-label">{stats.totalSubnets} subnets</span>
                {stats.peeringCount > 0 && <span class="stat-label">{stats.peeringCount} peerings</span>}
              </div>
            </div>

            <div class="card col-2">
              <div class="card-title">Network Security</div>
              <div class="metric-value" style="font-size: 2.5rem;">{stats.totalNSGs}</div>
              <div style="margin-top: 8px;">
                <span class="stat-label">NSGs deployed</span>
              </div>
            </div>

            <div class="card col-2">
              <div class="card-title">Public IPs</div>
              <div class="metric-value" style="font-size: 2.5rem;">{stats.totalPublicIPs}</div>
              <div style="margin-top: 8px;">
                <span class="stat-label">assigned addresses</span>
              </div>
            </div>

            <div class="card col-2">
              <div class="card-title">Load Balancers</div>
              <div class="metric-value" style="font-size: 2.5rem;">{stats.totalLoadBalancers}</div>
            </div>

            <div class="card col-2">
              <div class="card-title">VM Uptime</div>
              <div class="metric-value" style={`font-size: 2.5rem; color: ${stats.totalVMs > 0 && stats.runningVMs / stats.totalVMs >= 0.9 ? 'var(--healthy)' : stats.totalVMs > 0 ? 'var(--medium)' : 'var(--text-primary)'};`}>
                {stats.totalVMs > 0 ? Math.round((stats.runningVMs / stats.totalVMs) * 100) : 0}%
              </div>
              <div style="margin-top: 8px;">
                <span class="stat-label">running / total</span>
              </div>
            </div>

            {/* ── Row 2: Donut Charts ── */}
            <div class="card col-4">
              <div class="card-title">VMs by Power State</div>
              <DonutChart
                segments={[
                  { label: 'Running', value: stats.runningVMs, color: '#10b981' },
                  { label: 'Deallocated', value: stats.deallocatedVMs, color: '#6b7280' },
                  { label: 'Stopped', value: stats.stoppedVMs, color: '#ef4444' },
                  { label: 'Unknown', value: stats.totalVMs - stats.runningVMs - stats.deallocatedVMs - stats.stoppedVMs, color: '#eab308' },
                ]}
                centerLabel="VMs"
              />
            </div>

            <div class="card col-4">
              <div class="card-title">VMs by OS</div>
              <DonutChart
                segments={Object.entries(stats.vmsByOS).map(([os, count]) => ({
                  label: os,
                  value: count,
                  color: os === 'Windows' ? '#3b82f6' : os === 'Linux' ? '#f97316' : '#6b7280',
                }))}
                centerLabel="VMs"
              />
            </div>

            <div class="card col-4">
              <div class="card-title">VMs by Location</div>
              <DonutChart
                segments={Object.entries(stats.vmsByLocation)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 6)
                  .map(([loc, count], i) => ({
                    label: loc,
                    value: count,
                    color: ['#06b6d4', '#8b5cf6', '#f43f5e', '#10b981', '#f59e0b', '#6366f1'][i] ?? '#6b7280',
                  }))}
                centerLabel="VMs"
              />
            </div>

            {/* ── Row 3: Network Topology SVG ── */}
            {svg && svg.svg && (
              <div class="card col-12" style="overflow-x: auto; padding: 16px;">
                <div class="card-title" style="margin-bottom: 12px;">Network Topology</div>
                <div style={`max-width: 100%; overflow-x: auto;`}>
                  {raw(svg.svg)}
                </div>
                <div style="display: flex; gap: 24px; flex-wrap: wrap; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border-subtle);">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 14px; height: 14px; background: rgba(16,185,129,0.15); border: 2px solid #10b981; border-radius: 3px;" />
                    <span class="stat-label">Running</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 14px; height: 14px; background: rgba(107,114,128,0.15); border: 2px solid #6b7280; border-radius: 3px;" />
                    <span class="stat-label">Deallocated</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 14px; height: 14px; background: rgba(239,68,68,0.15); border: 2px solid #ef4444; border-radius: 3px;" />
                    <span class="stat-label">Stopped</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 10px; height: 10px; background: #3b82f6; border-radius: 50%;" />
                    <span class="stat-label">Public IP</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 36px; height: 16px; background: #064e3b; border: 1px solid #10b981; border-radius: 8px;" />
                    <span class="stat-label">NSG Attached</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 30px; border-top: 2px dashed #10b981;" />
                    <span class="stat-label">Peering</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Row 4: VM Table ── */}
            {topology && topology.vnets.length > 0 && (
              <div class="card col-12">
                <div class="card-title">All Virtual Machines ({stats.totalVMs})</div>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Resource Group</th>
                      <th>VNet / Subnet</th>
                      <th>Private IP</th>
                      <th>Public IP</th>
                      <th>Size</th>
                      <th>OS</th>
                      <th>State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topology.vnets.flatMap(v =>
                      v.subnets.flatMap(s =>
                        s.vms.map(vm => (
                          <tr>
                            <td style="font-weight: 500;">{vm.name}</td>
                            <td style="font-size: 0.8rem; color: var(--text-tertiary);">{vm.resourceGroup}</td>
                            <td style="font-size: 0.8rem;">
                              {v.vnet.name} / <span style="color: var(--text-tertiary);">{s.subnet.name}</span>
                            </td>
                            <td style="font-family: var(--font-mono); font-size: 0.8rem;">{vm.privateIP || '—'}</td>
                            <td style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--accent-primary);">{vm.publicIP || '—'}</td>
                            <td style="font-size: 0.8rem; color: var(--text-tertiary);">{vm.vmSize}</td>
                            <td>{vm.osType}</td>
                            <td>
                              <span class={`badge badge-${vm.powerState === 'running' ? 'low' : vm.powerState === 'deallocated' ? 'medium' : 'critical'}`}>
                                {vm.powerState}
                              </span>
                            </td>
                          </tr>
                        ))
                      )
                    )}
                    {topology.orphanedVMs.map(vm => (
                      <tr>
                        <td style="font-weight: 500;">{vm.name}</td>
                        <td style="font-size: 0.8rem; color: var(--text-tertiary);">{vm.resourceGroup}</td>
                        <td style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">Unattached</td>
                        <td style="font-family: var(--font-mono); font-size: 0.8rem;">{vm.privateIP || '—'}</td>
                        <td style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--accent-primary);">{vm.publicIP || '—'}</td>
                        <td style="font-size: 0.8rem; color: var(--text-tertiary);">{vm.vmSize}</td>
                        <td>{vm.osType}</td>
                        <td>
                          <span class={`badge badge-${vm.powerState === 'running' ? 'low' : vm.powerState === 'deallocated' ? 'medium' : 'critical'}`}>
                            {vm.powerState}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Row 5: NSG Rules Panel ── */}
            {topology && topology.vnets.some(v => v.subnets.some(s => s.nsg)) && (
              <div class="card col-12">
                <div class="card-title">Network Security Group Rules</div>
                {topology.vnets.flatMap(v =>
                  v.subnets.filter(s => s.nsg).map(s => {
                    const nsg = s.nsg!;
                    const sortedRules = [...nsg.rules].sort((a, b) => a.priority - b.priority);
                    const hasOverlyPermissive = sortedRules.some(
                      r => r.access === 'Allow' && r.portRange === '*' && r.direction === 'Inbound'
                    );

                    return (
                      <div style="margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                          <span style="font-weight: 600; color: var(--text-primary);">{nsg.name}</span>
                          <span class="stat-label">on {v.vnet.name} / {s.subnet.name}</span>
                          {hasOverlyPermissive && (
                            <span class="badge badge-critical">Overly permissive</span>
                          )}
                        </div>
                        <table>
                          <thead>
                            <tr><th>Priority</th><th>Name</th><th>Direction</th><th>Access</th><th>Protocol</th><th>Port</th></tr>
                          </thead>
                          <tbody>
                            {sortedRules.slice(0, 15).map(rule => {
                              const isWideOpen = rule.access === 'Allow' && rule.portRange === '*' && rule.direction === 'Inbound';
                              return (
                                <tr style={isWideOpen ? 'background: rgba(239,68,68,0.08);' : ''}>
                                  <td style="font-family: var(--font-mono); font-size: 0.8rem;">{rule.priority}</td>
                                  <td>{rule.name}</td>
                                  <td>{rule.direction}</td>
                                  <td>
                                    <span class={`badge badge-${rule.access === 'Allow' ? 'low' : 'critical'}`}>
                                      {rule.access}
                                    </span>
                                  </td>
                                  <td style="font-size: 0.8rem;">{rule.protocol}</td>
                                  <td style="font-family: var(--font-mono); font-size: 0.8rem;">{rule.portRange}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── Row 6: VM Sizes Table ── */}
            {stats.totalVMs > 0 && Object.keys(stats.vmsBySize).length > 1 && (
              <div class="card col-6">
                <div class="card-title">VM Sizes</div>
                <table>
                  <thead><tr><th>Size</th><th>Count</th></tr></thead>
                  <tbody>
                    {Object.entries(stats.vmsBySize)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 15)
                      .map(([size, count]) => (
                        <tr>
                          <td style="font-family: var(--font-mono); font-size: 0.85rem;">{size}</td>
                          <td>{count}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Empty state */}
            {stats.totalVMs === 0 && stats.totalVNets === 0 && (
              <div class="card col-12" style="text-align: center; padding: 40px;">
                <div class="stat-value" style="font-size: 1.2rem;">No Azure resources found</div>
                <div class="stat-label" style="margin-top: 8px;">Check that the subscription has VMs and VNets, and that the app registration has Reader role.</div>
              </div>
            )}
          </div>
        </main>
      )}

      <footer>
        {topology && <p>Data fetched: {new Date(topology.fetchedAt).toLocaleString()}</p>}
        <p style="margin-top: 4px;"><a href="/" style="color: var(--accent-primary);">Back to Security Dashboard</a></p>
      </footer>
    </Layout>
  );
};
