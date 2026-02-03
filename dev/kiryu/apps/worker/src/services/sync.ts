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

    const client = new CrowdStrikeClient(this.env);

    // Fetch data from CrowdStrike
    const [alerts, hosts, incidents] = await Promise.all([
      client.getAlertSummary(7, 100),
      client.getHostSummary(),
      client.getIncidentSummary(30),
    ]);

    let recordsSynced = 0;

    // Store recent alerts as security events
    for (const alert of alerts.recentAlerts) {
      const severityMap: Record<number, string> = {
        5: 'critical', 4: 'high', 3: 'medium', 2: 'low', 1: 'informational'
      };
      const severity = alert.severity_name?.toLowerCase() || severityMap[alert.severity] || 'medium';

      await this.env.DB.prepare(`
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
      ).run();
      recordsSynced++;
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

    for (const threat of threats) {
      await this.env.DB.prepare(`
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
      ).run();
      recordsSynced++;
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

    for (const event of events) {
      await this.env.DB.prepare(`
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
      ).run();
      recordsSynced++;
    }

    await this.updatePlatformStatus('zscaler', 'healthy');
    return { platform: 'zscaler', status: 'success', recordsSynced };
  }

  private async syncMicrosoft(): Promise<SyncResult> {
    if (!this.env.AZURE_CLIENT_ID || !this.env.AZURE_CLIENT_SECRET) {
      return { platform: 'microsoft', status: 'skipped', error: 'Not configured' };
    }

    const client = new MicrosoftClient(this.env);
    const alerts = await client.getSecurityAlerts();
    const secureScore = await client.getSecureScore();
    
    let recordsSynced = 0;

    for (const alert of alerts) {
      await this.env.DB.prepare(`
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
      ).run();
      recordsSynced++;
    }

    // Store secure score
    if (secureScore) {
      await this.env.DB.prepare(`
        INSERT OR REPLACE INTO metrics 
        (id, source, metric_type, value, metadata, recorded_at)
        VALUES ('microsoft_secure_score', 'microsoft', 'secure_score', ?, ?, ?)
      `).bind(
        secureScore.currentScore,
        JSON.stringify({ maxScore: secureScore.maxScore }),
        new Date().toISOString()
      ).run();
    }

    await this.updatePlatformStatus('microsoft', 'healthy');
    return { platform: 'microsoft', status: 'success', recordsSynced };
  }

  private async syncSalesforce(): Promise<SyncResult> {
    if (!this.env.SALESFORCE_CLIENT_ID || !this.env.SALESFORCE_CLIENT_SECRET) {
      return { platform: 'salesforce', status: 'skipped', error: 'Not configured' };
    }

    const client = new SalesforceClient(this.env);
    const tickets = await client.getSecurityTickets();
    
    let recordsSynced = 0;

    for (const ticket of tickets) {
      await this.env.DB.prepare(`
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
        ticket.ClosedDate ? 
          Math.round((new Date(ticket.ClosedDate).getTime() - new Date(ticket.CreatedDate).getTime()) / (1000 * 60 * 60)) : 
          null
      ).run();
      recordsSynced++;
    }

    await this.updatePlatformStatus('salesforce', 'healthy');
    return { platform: 'salesforce', status: 'success', recordsSynced };
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
