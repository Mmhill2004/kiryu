import type { Env } from '../types/env';
import { CrowdStrikeClient } from '../integrations/crowdstrike/client';
import { AbnormalClient } from '../integrations/abnormal/client';
import { ZscalerClient } from '../integrations/zscaler/client';
import { MicrosoftClient } from '../integrations/microsoft/client';
import { SalesforceClient } from '../integrations/salesforce/client';

export interface SyncResult {
  platform: string;
  status: 'success' | 'failed' | 'skipped';
  recordsSynced?: number;
  error?: string;
  duration?: number;
}

export class SyncService {
  constructor(private env: Env) {}

  /**
   * Sync all configured platforms
   */
  async syncAll(): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    // Run syncs in parallel with individual error handling
    const syncPromises = [
      this.syncPlatform('crowdstrike').catch(e => this.handleSyncError('crowdstrike', e)),
      this.syncPlatform('abnormal').catch(e => this.handleSyncError('abnormal', e)),
      this.syncPlatform('zscaler').catch(e => this.handleSyncError('zscaler', e)),
      this.syncPlatform('microsoft').catch(e => this.handleSyncError('microsoft', e)),
      this.syncPlatform('salesforce').catch(e => this.handleSyncError('salesforce', e)),
    ];

    const syncResults = await Promise.all(syncPromises);
    results.push(...syncResults);

    // Invalidate dashboard cache after sync so next page load gets fresh data
    try {
      const { CacheService } = await import('./cache');
      const cacheService = new CacheService(this.env.CACHE);
      await Promise.all([
        cacheService.invalidatePrefix('cs:summary'),
        cacheService.invalidatePrefix('sf:metrics'),
        cacheService.invalidatePrefix('ms:summary'),
      ]);
    } catch { /* ignore cache errors */ }

    // Run data retention cleanup
    try {
      await this.cleanupOldData();
    } catch (error) {
      console.error('Data retention cleanup failed:', error);
    }

    return results;
  }

  /**
   * Sync a specific platform
   */
  async syncPlatform(platform: string): Promise<SyncResult> {
    const startTime = Date.now();
    
    // Log sync start
    await this.logSyncStart(platform);

    try {
      let result: SyncResult;

      switch (platform) {
        case 'crowdstrike':
          result = await this.syncCrowdStrike();
          break;
        case 'abnormal':
          result = await this.syncAbnormal();
          break;
        case 'zscaler':
          result = await this.syncZscaler();
          break;
        case 'microsoft':
          result = await this.syncMicrosoft();
          break;
        case 'salesforce':
          result = await this.syncSalesforce();
          break;
        default:
          throw new Error(`Unknown platform: ${platform}`);
      }

      result.duration = Date.now() - startTime;
      
      // Log sync completion
      await this.logSyncComplete(platform, result);
      
      return result;
    } catch (error) {
      const result = this.handleSyncError(platform, error);
      result.duration = Date.now() - startTime;
      await this.logSyncComplete(platform, result);
      return result;
    }
  }

  private async syncCrowdStrike(): Promise<SyncResult> {
    if (!this.env.CROWDSTRIKE_CLIENT_ID || !this.env.CROWDSTRIKE_CLIENT_SECRET) {
      return { platform: 'crowdstrike', status: 'skipped', error: 'Not configured' };
    }

    const client = new CrowdStrikeClient(this.env, this.env.CACHE);

    // Fetch full summary (all 12 modules in parallel)
    const fullSummary = await client.getFullSummary(7, 30);
    const { alerts, hosts, incidents, zta, ngsiem, overwatch, crowdScore, vulnerabilities, identity, discover, sensors } = fullSummary;

    let recordsSynced = 0;

    // Store recent alerts as security events (batched)
    if (alerts.recentAlerts.length > 0) {
      const severityMap: Record<number, string> = {
        5: 'critical', 4: 'high', 3: 'medium', 2: 'low', 1: 'informational'
      };
      const alertStmts = alerts.recentAlerts.map(alert => {
        const severity = alert.severity_name?.toLowerCase() || severityMap[alert.severity] || 'medium';
        return this.env.DB.prepare(`
          INSERT OR REPLACE INTO security_events
          (id, source, event_type, severity, title, description, threat_count, raw_data, created_at)
          VALUES (?, 'crowdstrike', 'alert', ?, ?, ?, 1, ?, ?)
        `).bind(
          alert.composite_id,
          severity,
          alert.name || alert.tactic || 'CrowdStrike Alert',
          alert.description || '',
          JSON.stringify(alert),
          alert.created_timestamp
        );
      });
      await this.env.DB.batch(alertStmts);
      recordsSynced += alerts.recentAlerts.length;
    }

    // Store daily summary metrics
    const today = new Date().toISOString().split('T')[0];
    await this.env.DB.prepare(`
      INSERT OR REPLACE INTO daily_summaries
      (date, source, total_events, critical_count, high_count, medium_count, low_count, unique_threats, metadata)
      VALUES (?, 'crowdstrike', ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      today,
      alerts.total,
      alerts.bySeverity.critical,
      alerts.bySeverity.high,
      alerts.bySeverity.medium,
      alerts.bySeverity.low,
      alerts.total,
      JSON.stringify({
        hosts: hosts,
        incidents: incidents,
        byStatus: alerts.byStatus,
      })
    ).run();

    // Store host metrics
    await this.env.DB.prepare(`
      INSERT OR REPLACE INTO metrics
      (id, source, metric_type, value, metadata, recorded_at)
      VALUES (?, 'crowdstrike', 'total_hosts', ?, ?, ?)
    `).bind(
      `crowdstrike_hosts_${today}`,
      hosts.total,
      JSON.stringify({
        online: hosts.online,
        offline: hosts.offline,
        byPlatform: hosts.byPlatform,
        reducedFunctionality: hosts.reducedFunctionality,
      }),
      new Date().toISOString()
    ).run();

    // Store daily CrowdStrike metrics snapshot
    const securityScore = Math.max(0, Math.min(100,
      100 - (alerts.bySeverity.critical * 10 + alerts.bySeverity.high * 5
        + alerts.bySeverity.medium * 2 + alerts.bySeverity.low * 1)
    ));

    try {
      await this.env.DB.prepare(`
        INSERT OR REPLACE INTO crowdstrike_metrics_daily (
          date, alerts_total, alerts_critical, alerts_high, alerts_medium, alerts_low, alerts_informational,
          alerts_new, alerts_in_progress, alerts_resolved,
          hosts_total, hosts_online, hosts_offline, hosts_contained, hosts_stale, hosts_reduced_functionality,
          hosts_windows, hosts_mac, hosts_linux,
          incidents_total, incidents_open, incidents_closed,
          incidents_critical, incidents_high, incidents_medium, incidents_low,
          incidents_with_lateral_movement, incidents_avg_fine_score, incidents_mttr_hours,
          zta_total_assessed, zta_avg_score, zta_excellent, zta_good, zta_fair, zta_poor,
          ngsiem_repositories, ngsiem_total_ingest_gb, ngsiem_events_total,
          ngsiem_auth_events, ngsiem_network_events, ngsiem_process_events, ngsiem_dns_events,
          overwatch_total_detections, overwatch_active_escalations, overwatch_resolved_30d,
          overwatch_critical, overwatch_high, overwatch_medium, overwatch_low,
          crowdscore, crowdscore_adjusted,
          vulns_total, vulns_critical, vulns_high, vulns_medium, vulns_low, vulns_with_exploits, vulns_unique_cves,
          idp_detections_total, idp_detections_critical, idp_detections_high, idp_targeted_accounts, idp_source_endpoints,
          discover_total_apps, discover_unmanaged_assets, discover_sensor_coverage, sensor_total_count,
          security_score, metadata, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, datetime('now')
        )
      `).bind(
        today,
        alerts.total, alerts.bySeverity.critical, alerts.bySeverity.high,
        alerts.bySeverity.medium, alerts.bySeverity.low, alerts.bySeverity.informational,
        alerts.byStatus.new, alerts.byStatus.in_progress, alerts.byStatus.resolved,
        hosts.total, hosts.online, hosts.offline, hosts.contained,
        hosts.staleEndpoints, hosts.reducedFunctionality,
        hosts.byPlatform.windows, hosts.byPlatform.mac, hosts.byPlatform.linux,
        incidents.total, incidents.open, incidents.closed,
        incidents.bySeverity.critical, incidents.bySeverity.high,
        incidents.bySeverity.medium, incidents.bySeverity.low,
        incidents.withLateralMovement, incidents.avgFineScore, incidents.mttr || null,
        zta.totalAssessed, zta.avgScore, zta.scoreDistribution.excellent,
        zta.scoreDistribution.good, zta.scoreDistribution.fair, zta.scoreDistribution.poor,
        ngsiem.repositories, ngsiem.totalIngestGB, ngsiem.eventCounts.total,
        ngsiem.recentActivity.authEvents, ngsiem.recentActivity.networkEvents,
        ngsiem.recentActivity.processEvents, ngsiem.recentActivity.dnsEvents,
        overwatch.totalDetections, overwatch.activeEscalations, overwatch.resolvedLast30Days,
        overwatch.detectionsBySeverity.critical, overwatch.detectionsBySeverity.high,
        overwatch.detectionsBySeverity.medium, overwatch.detectionsBySeverity.low,
        crowdScore?.current || null, crowdScore?.adjusted || null,
        vulnerabilities?.total || 0, vulnerabilities?.bySeverity.critical || 0,
        vulnerabilities?.bySeverity.high || 0, vulnerabilities?.bySeverity.medium || 0,
        vulnerabilities?.bySeverity.low || 0, vulnerabilities?.withExploits || 0,
        vulnerabilities?.topCVEs?.length || 0,
        identity?.total || 0, identity?.bySeverity?.critical || 0,
        identity?.bySeverity?.high || 0, identity?.targetedAccounts || 0, identity?.sourceEndpoints || 0,
        discover?.totalApplications || 0, discover?.unmanagedAssets || 0,
        discover?.sensorCoverage || 0, sensors?.totalSensors || 0,
        securityScore,
        JSON.stringify({
          byTactic: alerts.byTactic,
          byTechnique: alerts.byTechnique,
          overwatchByTactic: overwatch.detectionsByTactic,
          ngsiemTopEventTypes: ngsiem.topEventTypes,
          crowdScoreLevel: crowdScore?.level,
          intelActorCount: fullSummary.intel?.recentActors?.length || 0,
          intelIndicatorCount: fullSummary.intel?.indicatorCount || 0,
          errors: fullSummary.errors,
        })
      ).run();
    } catch (error) {
      console.error('Error storing crowdstrike_metrics_daily:', error);
    }

    // Update platform status
    await this.updatePlatformStatus('crowdstrike', 'healthy', {
      total_hosts: hosts.total,
      online_hosts: hosts.online,
      offline_hosts: hosts.offline,
      total_alerts: alerts.total,
      open_incidents: incidents.open,
    });

    return { platform: 'crowdstrike', status: 'success', recordsSynced };
  }

  private async syncAbnormal(): Promise<SyncResult> {
    if (!this.env.ABNORMAL_API_TOKEN) {
      return { platform: 'abnormal', status: 'skipped', error: 'Not configured' };
    }

    const client = new AbnormalClient(this.env);
    const threats = await client.getThreats();

    let recordsSynced = 0;

    if (threats.length > 0) {
      const stmts = threats.map(threat =>
        this.env.DB.prepare(`
          INSERT OR REPLACE INTO security_events
          (id, source, event_type, severity, title, description, threat_count, raw_data, created_at)
          VALUES (?, 'abnormal', 'email_threat', ?, ?, ?, 1, ?, ?)
        `).bind(
          threat.threatId,
          threat.severity?.toLowerCase() || 'medium',
          threat.attackType || 'Email Threat',
          threat.subject || '',
          JSON.stringify(threat),
          threat.receivedTime
        )
      );
      await this.env.DB.batch(stmts);
      recordsSynced = threats.length;
    }

    await this.updatePlatformStatus('abnormal', 'healthy');
    return { platform: 'abnormal', status: 'success', recordsSynced };
  }

  private async syncZscaler(): Promise<SyncResult> {
    if (!this.env.ZSCALER_API_KEY || !this.env.ZSCALER_API_SECRET) {
      return { platform: 'zscaler', status: 'skipped', error: 'Not configured' };
    }

    const client = new ZscalerClient(this.env);
    const events = await client.getSecurityEvents();

    let recordsSynced = 0;

    if (events.length > 0) {
      const stmts = events.map(event =>
        this.env.DB.prepare(`
          INSERT OR REPLACE INTO security_events
          (id, source, event_type, severity, title, description, threat_count, raw_data, created_at)
          VALUES (?, 'zscaler', 'web_threat', ?, ?, ?, 1, ?, ?)
        `).bind(
          event.id || crypto.randomUUID(),
          event.severity?.toLowerCase() || 'medium',
          event.category || 'Web Threat',
          event.url || '',
          JSON.stringify(event),
          event.datetime || new Date().toISOString()
        )
      );
      await this.env.DB.batch(stmts);
      recordsSynced = events.length;
    }

    await this.updatePlatformStatus('zscaler', 'healthy');
    return { platform: 'zscaler', status: 'success', recordsSynced };
  }

  private async syncMicrosoft(): Promise<SyncResult> {
    if (!this.env.AZURE_CLIENT_ID || !this.env.AZURE_CLIENT_SECRET || !this.env.AZURE_TENANT_ID) {
      return { platform: 'microsoft', status: 'skipped', error: 'Not configured' };
    }

    const client = new MicrosoftClient(this.env);
    const summary = await client.getFullSummary();

    let recordsSynced = 0;

    // Store Graph security alerts + Defender alerts (batched)
    const msAlertStmts = [
      ...summary.alertAnalytics.recentAlerts.map(alert =>
        this.env.DB.prepare(`
          INSERT OR REPLACE INTO security_events
          (id, source, event_type, severity, title, description, threat_count, raw_data, created_at)
          VALUES (?, 'microsoft', 'security_alert', ?, ?, ?, 1, ?, ?)
        `).bind(
          alert.id,
          alert.severity?.toLowerCase() || 'medium',
          alert.title || 'Security Alert',
          alert.description || '',
          JSON.stringify(alert),
          alert.createdDateTime
        )
      ),
      ...summary.defenderAnalytics.recentAlerts.map(alert =>
        this.env.DB.prepare(`
          INSERT OR REPLACE INTO security_events
          (id, source, event_type, severity, title, description, threat_count, raw_data, created_at)
          VALUES (?, 'microsoft', 'defender_alert', ?, ?, ?, 1, ?, ?)
        `).bind(
          `defender_${alert.id}`,
          alert.severity?.toLowerCase() || 'medium',
          alert.title || 'Defender Alert',
          `Classification: ${alert.classification || 'unknown'}`,
          JSON.stringify(alert),
          alert.createdDateTime
        )
      ),
    ];
    if (msAlertStmts.length > 0) {
      await this.env.DB.batch(msAlertStmts);
      recordsSynced += msAlertStmts.length;
    }

    // Store secure score
    if (summary.secureScore) {
      await this.env.DB.prepare(`
        INSERT OR REPLACE INTO metrics
        (id, source, metric_type, value, metadata, recorded_at)
        VALUES ('microsoft_secure_score', 'microsoft', 'secure_score', ?, ?, ?)
      `).bind(
        summary.secureScore.currentScore,
        JSON.stringify({ maxScore: summary.secureScore.maxScore, comparativeScores: summary.secureScore.averageComparativeScores }),
        new Date().toISOString()
      ).run();
    }

    // Store device compliance
    const totalDevices = summary.compliance.compliant + summary.compliance.nonCompliant + summary.compliance.unknown;
    if (totalDevices > 0) {
      await this.env.DB.prepare(`
        INSERT OR REPLACE INTO metrics
        (id, source, metric_type, value, metadata, recorded_at)
        VALUES ('microsoft_compliance', 'microsoft', 'device_compliance', ?, ?, ?)
      `).bind(
        totalDevices,
        JSON.stringify(summary.compliance),
        new Date().toISOString()
      ).run();
    }

    await this.updatePlatformStatus('microsoft', 'healthy', {
      security_alerts: summary.alertAnalytics.total,
      defender_alerts: summary.defenderAnalytics.total,
      secure_score: summary.secureScore?.currentScore || null,
      compliant_devices: summary.compliance.compliant,
      non_compliant_devices: summary.compliance.nonCompliant,
      assessments: summary.assessments.total,
      risky_users: summary.identity.riskyUsers.unresolvedCount,
      incidents: summary.incidents.open,
      machines: summary.machines.total,
      errors: summary.errors,
    });

    return { platform: 'microsoft', status: 'success', recordsSynced };
  }

  private async syncSalesforce(): Promise<SyncResult> {
    if (!this.env.SALESFORCE_CLIENT_ID || !this.env.SALESFORCE_CLIENT_SECRET) {
      return { platform: 'salesforce', status: 'skipped', error: 'Not configured' };
    }

    const client = new SalesforceClient(this.env, this.env.CACHE);

    if (!client.isConfigured()) {
      return { platform: 'salesforce', status: 'skipped', error: 'Not configured' };
    }

    const tickets = await client.getTickets(30, 2000);

    let recordsSynced = 0;

    // Batch ticket inserts in chunks of 100 (D1 batch limit considerations)
    const BATCH_SIZE = 100;
    for (let i = 0; i < tickets.length; i += BATCH_SIZE) {
      const chunk = tickets.slice(i, i + BATCH_SIZE);
      const stmts = chunk.map(ticket => {
        const resolutionMinutes = ticket.ClosedDate
          ? Math.round(
              (new Date(ticket.ClosedDate).getTime() - new Date(ticket.CreatedDate).getTime()) /
                (1000 * 60)
            )
          : null;

        return this.env.DB.prepare(`
          INSERT OR REPLACE INTO security_tickets (
            id, case_number, subject, description, status, priority,
            ticket_type, reason, origin, is_escalated, is_closed,
            owner_id, owner_name, contact_id, contact_name,
            account_id, account_name, created_at, closed_at,
            resolution_time_minutes, synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).bind(
          ticket.Id,
          ticket.CaseNumber,
          ticket.Subject,
          ticket.Description,
          ticket.Status,
          ticket.Priority,
          ticket.Type,
          ticket.Reason,
          ticket.Origin,
          ticket.IsEscalated ? 1 : 0,
          ticket.IsClosed ? 1 : 0,
          ticket.OwnerId,
          ticket.Owner?.Name || null,
          ticket.ContactId,
          ticket.Contact?.Name || null,
          ticket.AccountId,
          ticket.Account?.Name || null,
          ticket.CreatedDate,
          ticket.ClosedDate,
          resolutionMinutes
        );
      });

      try {
        await this.env.DB.batch(stmts);
      } catch {
        // Fallback to old tickets table if security_tickets doesn't exist
        const fallbackStmts = chunk.map(ticket => {
          const resolutionMinutes = ticket.ClosedDate
            ? Math.round(
                (new Date(ticket.ClosedDate).getTime() - new Date(ticket.CreatedDate).getTime()) /
                  (1000 * 60)
              )
            : null;
          return this.env.DB.prepare(`
            INSERT OR REPLACE INTO tickets
            (id, case_number, subject, status, priority, created_at, closed_at, resolution_time_hours)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            ticket.Id,
            ticket.CaseNumber,
            ticket.Subject,
            ticket.Status,
            ticket.Priority,
            ticket.CreatedDate,
            ticket.ClosedDate,
            resolutionMinutes ? Math.round(resolutionMinutes / 60) : null
          );
        });
        await this.env.DB.batch(fallbackStmts);
      }
      recordsSynced += chunk.length;
    }

    // Get metrics for platform status
    const metrics = await client.getDashboardMetrics();

    await this.updatePlatformStatus('salesforce', 'healthy', {
      open_tickets: metrics.openTickets,
      mttr_minutes: metrics.mttr.overall,
      sla_compliance: metrics.slaComplianceRate,
      escalation_rate: metrics.escalationRate,
    });

    // Store daily ticket metrics
    try {
      await this.env.DB.prepare(`
        INSERT OR REPLACE INTO ticket_metrics_daily (
          date, total_created, total_closed, total_open,
          avg_resolution_minutes, sla_compliance_rate, escalation_rate
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        new Date().toISOString().split('T')[0],
        metrics.weekOverWeek.thisWeek,
        0,
        metrics.openTickets,
        metrics.mttr.overall,
        metrics.slaComplianceRate,
        metrics.escalationRate
      ).run();
    } catch (error) {
      console.error('Error storing ticket_metrics_daily:', error);
    }

    return { platform: 'salesforce', status: 'success', recordsSynced };
  }

  private async cleanupOldData(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoff = cutoffDate.toISOString().split('T')[0];

    // Whitelist of allowed table/column pairs for retention cleanup
    const ALLOWED_CLEANUP = new Map([
      ['crowdstrike_metrics_daily', 'date'],
      ['ticket_metrics_daily', 'date'],
      ['daily_summaries', 'date'],
      ['security_events', 'created_at'],
      ['sync_logs', 'started_at'],
    ]);

    const tables = [
      { name: 'crowdstrike_metrics_daily', dateCol: 'date' },
      { name: 'ticket_metrics_daily', dateCol: 'date' },
      { name: 'daily_summaries', dateCol: 'date' },
      { name: 'security_events', dateCol: 'created_at' },
      { name: 'sync_logs', dateCol: 'started_at' },
    ];

    for (const table of tables) {
      if (ALLOWED_CLEANUP.get(table.name) !== table.dateCol) {
        console.error(`Retention: skipping unrecognized table ${table.name}`);
        continue;
      }
      try {
        // Batched deletion to avoid D1 timeout on large tables
        let totalDeleted = 0;
        const DELETE_BATCH = 500;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const result = await this.env.DB.prepare(
            `DELETE FROM ${table.name} WHERE rowid IN (
              SELECT rowid FROM ${table.name} WHERE ${table.dateCol} < ? LIMIT ?
            )`
          ).bind(cutoff, DELETE_BATCH).run();

          const deleted = result.meta.changes || 0;
          totalDeleted += deleted;
          if (deleted < DELETE_BATCH) break;
        }

        if (totalDeleted > 0) {
          await this.env.DB.prepare(`
            INSERT INTO data_retention_log (run_at, table_name, records_deleted, oldest_date_removed)
            VALUES (?, ?, ?, ?)
          `).bind(new Date().toISOString(), table.name, totalDeleted, cutoff).run();
          console.log(`Retention: deleted ${totalDeleted} rows from ${table.name}`);
        }
      } catch (error) {
        console.error(`Retention cleanup failed for ${table.name}:`, error);
      }
    }
  }

  private handleSyncError(platform: string, error: unknown): SyncResult {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Sync error for ${platform}:`, error);
    
    // Update platform status to error
    this.updatePlatformStatus(platform, 'error', { error: errorMessage }).catch(console.error);
    
    return {
      platform,
      status: 'failed',
      error: errorMessage,
    };
  }

  private async updatePlatformStatus(
    platform: string, 
    status: string, 
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.env.DB.prepare(`
        INSERT OR REPLACE INTO platform_status 
        (platform, status, last_sync, metadata)
        VALUES (?, ?, ?, ?)
      `).bind(
        platform,
        status,
        new Date().toISOString(),
        metadata ? JSON.stringify(metadata) : null
      ).run();
    } catch (error) {
      console.error('Failed to update platform status:', error);
    }
  }

  private async logSyncStart(platform: string): Promise<void> {
    try {
      await this.env.DB.prepare(`
        INSERT INTO sync_logs (platform, status, started_at)
        VALUES (?, 'running', ?)
      `).bind(platform, new Date().toISOString()).run();
    } catch (error) {
      // Table might not exist yet, ignore
    }
  }

  private async logSyncComplete(platform: string, result: SyncResult): Promise<void> {
    try {
      await this.env.DB.prepare(`
        UPDATE sync_logs 
        SET status = ?, completed_at = ?, records_synced = ?, error_message = ?
        WHERE platform = ? AND status = 'running'
        ORDER BY started_at DESC LIMIT 1
      `).bind(
        result.status,
        new Date().toISOString(),
        result.recordsSynced || 0,
        result.error || null,
        platform
      ).run();
    } catch (error) {
      // Table might not exist yet, ignore
    }
  }
}
