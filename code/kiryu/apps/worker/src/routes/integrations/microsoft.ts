import { Hono } from 'hono';
import type { Env } from '../../types/env';
import { MicrosoftClient } from '../../integrations/microsoft/client';

export const microsoftRoutes = new Hono<{ Bindings: Env }>();

/**
 * Test Microsoft connection
 */
microsoftRoutes.get('/test', async (c) => {
  const client = new MicrosoftClient(c.env);

  if (!client.isConfigured()) {
    return c.json({ status: 'not_configured', message: 'Azure credentials not set' });
  }

  try {
    const score = await client.getSecureScore();
    return c.json({ status: 'connected', secureScore: score ? score.currentScore : 'unavailable' });
  } catch (error) {
    return c.json({
      status: 'error',
      message: 'An internal error occurred',
    }, 500);
  }
});

/**
 * Get full Microsoft summary (all APIs in parallel)
 */
microsoftRoutes.get('/summary', async (c) => {
  const client = new MicrosoftClient(c.env);

  if (!client.isConfigured()) {
    return c.json({ error: 'Microsoft not configured' }, 503);
  }

  try {
    const summary = await client.getFullSummary();
    return c.json(summary);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch Microsoft summary',
      message: 'An internal error occurred',
    }, 500);
  }
});

/**
 * Get security alerts
 */
microsoftRoutes.get('/alerts', async (c) => {
  const client = new MicrosoftClient(c.env);

  try {
    const analytics = await client.getAlertAnalytics();
    return c.json(analytics);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch alerts',
      message: 'An internal error occurred'
    }, 500);
  }
});

/**
 * Get Microsoft Secure Score
 */
microsoftRoutes.get('/secure-score', async (c) => {
  const client = new MicrosoftClient(c.env);
  
  try {
    const score = await client.getSecureScore();
    return c.json(score || { error: 'No secure score available' });
  } catch (error) {
    return c.json({ 
      error: 'Failed to fetch secure score',
      message: 'An internal error occurred'
    }, 500);
  }
});

/**
 * Get Defender for Endpoint alerts
 */
microsoftRoutes.get('/defender/alerts', async (c) => {
  const client = new MicrosoftClient(c.env);
  
  try {
    const analytics = await client.getDefenderAnalytics();
    return c.json(analytics);
  } catch (error) {
    return c.json({ 
      error: 'Failed to fetch Defender alerts',
      message: 'An internal error occurred'
    }, 500);
  }
});

/**
 * Get security recommendations
 */
microsoftRoutes.get('/recommendations', async (c) => {
  const client = new MicrosoftClient(c.env);
  
  try {
    const assessments = await client.getAssessmentAnalytics();
    return c.json(assessments);
  } catch (error) {
    return c.json({ 
      error: 'Failed to fetch recommendations',
      message: 'An internal error occurred'
    }, 500);
  }
});

/**
 * Get device compliance
 */
microsoftRoutes.get('/compliance', async (c) => {
  const client = new MicrosoftClient(c.env);

  try {
    const compliance = await client.getDeviceCompliance();
    return c.json(compliance);
  } catch (error) {
    return c.json({
      error: 'Failed to fetch compliance',
      message: 'An internal error occurred'
    }, 500);
  }
});

// ─── Intune Routes ──────────────────────────────────────────────────────────

/**
 * Get Intune full summary (devices, policies, apps)
 */
microsoftRoutes.get('/intune/summary', async (c) => {
  const client = new MicrosoftClient(c.env);

  if (!client.isConfigured()) {
    return c.json({ error: 'Microsoft not configured' }, 503);
  }

  try {
    const summary = await client.getIntuneSummary();
    return c.json(summary);
  } catch (error) {
    console.error('Intune summary error:', error);
    return c.json({ error: 'Failed to fetch Intune summary', message: 'An internal error occurred' }, 500);
  }
});

/**
 * Get Intune managed device analytics
 */
microsoftRoutes.get('/intune/devices', async (c) => {
  const client = new MicrosoftClient(c.env);

  if (!client.isConfigured()) {
    return c.json({ error: 'Microsoft not configured' }, 503);
  }

  const osFilter = c.req.query('os')?.toLowerCase();
  const complianceFilter = c.req.query('compliance')?.toLowerCase();

  try {
    let devices = await client.getManagedDevices();

    if (osFilter) {
      devices = devices.filter(d => (d.operatingSystem || '').toLowerCase().includes(osFilter));
    }
    if (complianceFilter) {
      devices = devices.filter(d => (d.complianceState || '').toLowerCase() === complianceFilter);
    }

    return c.json({ devices, count: devices.length });
  } catch (error) {
    console.error('Intune devices error:', error);
    return c.json({ error: 'Failed to fetch Intune devices', message: 'An internal error occurred' }, 500);
  }
});

/**
 * Get Intune compliance policy analytics
 */
microsoftRoutes.get('/intune/policies', async (c) => {
  const client = new MicrosoftClient(c.env);

  if (!client.isConfigured()) {
    return c.json({ error: 'Microsoft not configured' }, 503);
  }

  try {
    const policies = await client.getIntunePolicyAnalytics();
    return c.json(policies);
  } catch (error) {
    console.error('Intune policies error:', error);
    return c.json({ error: 'Failed to fetch Intune policies', message: 'An internal error occurred' }, 500);
  }
});

/**
 * Get Intune detected apps
 */
microsoftRoutes.get('/intune/apps', async (c) => {
  const client = new MicrosoftClient(c.env);

  if (!client.isConfigured()) {
    return c.json({ error: 'Microsoft not configured' }, 503);
  }

  try {
    const apps = await client.getIntuneDetectedApps();
    return c.json(apps);
  } catch (error) {
    console.error('Intune apps error:', error);
    return c.json({ error: 'Failed to fetch Intune detected apps', message: 'An internal error occurred' }, 500);
  }
});

/**
 * Get stale devices (not synced in N days, default 30)
 */
microsoftRoutes.get('/intune/stale', async (c) => {
  const client = new MicrosoftClient(c.env);

  if (!client.isConfigured()) {
    return c.json({ error: 'Microsoft not configured' }, 503);
  }

  const days = parseInt(c.req.query('days') || '30', 10);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  try {
    const devices = await client.getManagedDevices();
    const stale = devices
      .filter(d => d.lastSyncDateTime && new Date(d.lastSyncDateTime).getTime() < cutoff)
      .sort((a, b) => new Date(a.lastSyncDateTime).getTime() - new Date(b.lastSyncDateTime).getTime());

    return c.json({ devices: stale, count: stale.length, cutoffDays: days });
  } catch (error) {
    console.error('Intune stale devices error:', error);
    return c.json({ error: 'Failed to fetch stale devices', message: 'An internal error occurred' }, 500);
  }
});

/**
 * Get devices needing reboot (not rebooted in N days, default 14)
 * Uses the beta Graph API for hardwareInformation.lastRebootDateTime
 */
microsoftRoutes.get('/intune/reboot-needed', async (c) => {
  const client = new MicrosoftClient(c.env);

  if (!client.isConfigured()) {
    return c.json({ error: 'Microsoft not configured' }, 503);
  }

  const days = parseInt(c.req.query('days') || '14', 10);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  try {
    const devices = await client.getManagedDevicesBeta();
    const needsReboot = devices
      .filter(d => {
        const rebootTime = d.hardwareInformation?.lastRebootDateTime;
        if (!rebootTime) return false;
        return new Date(rebootTime).getTime() < cutoff;
      })
      .sort((a, b) => {
        const aTime = new Date(a.hardwareInformation?.lastRebootDateTime || 0).getTime();
        const bTime = new Date(b.hardwareInformation?.lastRebootDateTime || 0).getTime();
        return aTime - bTime;
      });

    return c.json({ devices: needsReboot, count: needsReboot.length, cutoffDays: days });
  } catch (error) {
    console.error('Intune reboot-needed error:', error);
    return c.json({ error: 'Failed to fetch reboot data', message: 'An internal error occurred' }, 500);
  }
});

/**
 * Get compliance policies with per-policy device status
 */
microsoftRoutes.get('/intune/compliance/policies', async (c) => {
  const client = new MicrosoftClient(c.env);

  if (!client.isConfigured()) {
    return c.json({ error: 'Microsoft not configured' }, 503);
  }

  try {
    const policies = await client.getCompliancePolicies();
    const details = await Promise.all(
      policies.slice(0, 20).map(async (policy) => {
        const status = await client.getPolicyDeviceStatusSummary(policy.id);
        return { ...policy, ...status, total: status.compliant + status.nonCompliant + status.error };
      })
    );

    return c.json({ policies: details, count: details.length });
  } catch (error) {
    console.error('Intune compliance policies error:', error);
    return c.json({ error: 'Failed to fetch policy compliance', message: 'An internal error occurred' }, 500);
  }
});
