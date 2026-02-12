import { Hono } from 'hono';
import type { Env } from '../../types/env';
import { EntraClient } from '../../integrations/entra/client';

export const entraRoutes = new Hono<{ Bindings: Env }>();

/** Full Entra ID dashboard summary */
entraRoutes.get('/summary', async (c) => {
  const client = new EntraClient(c.env);

  if (!client.isConfigured()) {
    return c.json({
      configured: false,
      error: 'Azure credentials not configured',
    }, 503);
  }

  try {
    const summary = await client.getEntraSummary();
    return c.json(summary);
  } catch (error) {
    console.error('Entra summary error:', error);
    return c.json({ error: 'Failed to fetch Entra summary' }, 500);
  }
});

/** Risky users list */
entraRoutes.get('/risky-users', async (c) => {
  const client = new EntraClient(c.env);

  if (!client.isConfigured()) {
    return c.json({ configured: false, error: 'Azure credentials not configured' }, 503);
  }

  try {
    const users = await client.getRiskyUsers();
    return c.json({ users, count: users.length });
  } catch (error) {
    console.error('Entra risky users error:', error);
    return c.json({ error: 'Failed to fetch risky users' }, 500);
  }
});

/** Risk detections */
entraRoutes.get('/risk-detections', async (c) => {
  const client = new EntraClient(c.env);

  if (!client.isConfigured()) {
    return c.json({ configured: false, error: 'Azure credentials not configured' }, 503);
  }

  const days = parseInt(c.req.query('days') || '30', 10);
  try {
    const detections = await client.getRiskDetections(days);
    return c.json({ detections, count: detections.length });
  } catch (error) {
    console.error('Entra risk detections error:', error);
    return c.json({ error: 'Failed to fetch risk detections' }, 500);
  }
});

/** MFA registration status */
entraRoutes.get('/mfa-status', async (c) => {
  const client = new EntraClient(c.env);

  if (!client.isConfigured()) {
    return c.json({ configured: false, error: 'Azure credentials not configured' }, 503);
  }

  try {
    const details = await client.getUserRegistrationDetails();
    const registered = details.filter(u => u.isMfaRegistered).length;
    return c.json({
      totalUsers: details.length,
      mfaRegistered: registered,
      mfaRate: details.length > 0 ? Math.round((registered / details.length) * 100) : 0,
    });
  } catch (error) {
    console.error('Entra MFA status error:', error);
    return c.json({ error: 'Failed to fetch MFA status' }, 500);
  }
});

/** Conditional Access policies */
entraRoutes.get('/conditional-access', async (c) => {
  const client = new EntraClient(c.env);

  if (!client.isConfigured()) {
    return c.json({ configured: false, error: 'Azure credentials not configured' }, 503);
  }

  try {
    const policies = await client.getConditionalAccessPolicies();
    return c.json({ policies, count: policies.length });
  } catch (error) {
    console.error('Entra CA policies error:', error);
    return c.json({ error: 'Failed to fetch conditional access policies' }, 500);
  }
});

/** Privileged role assignments */
entraRoutes.get('/privileged-roles', async (c) => {
  const client = new EntraClient(c.env);

  if (!client.isConfigured()) {
    return c.json({ configured: false, error: 'Azure credentials not configured' }, 503);
  }

  try {
    const roles = await client.getPrivilegedRoles();
    return c.json({ roles, count: roles.length });
  } catch (error) {
    console.error('Entra privileged roles error:', error);
    return c.json({ error: 'Failed to fetch privileged roles' }, 500);
  }
});

/** App registrations with expiring credentials */
entraRoutes.get('/app-credentials', async (c) => {
  const client = new EntraClient(c.env);

  if (!client.isConfigured()) {
    return c.json({ configured: false, error: 'Azure credentials not configured' }, 503);
  }

  try {
    const apps = await client.getAppRegistrations();
    const now = Date.now();
    const expiring: Array<{
      appName: string;
      credentialName: string | null;
      expiresAt: string;
      daysUntilExpiry: number;
      expired: boolean;
    }> = [];
    for (const app of apps) {
      for (const cred of [...(app.passwordCredentials || []), ...(app.keyCredentials || [])]) {
        const daysUntil = Math.floor((new Date(cred.endDateTime).getTime() - now) / (1000 * 60 * 60 * 24));
        if (daysUntil <= 90) {
          expiring.push({
            appName: app.displayName,
            credentialName: cred.displayName,
            expiresAt: cred.endDateTime,
            daysUntilExpiry: daysUntil,
            expired: daysUntil < 0,
          });
        }
      }
    }
    expiring.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
    return c.json({ credentials: expiring, count: expiring.length });
  } catch (error) {
    console.error('Entra app credentials error:', error);
    return c.json({ error: 'Failed to fetch app credentials' }, 500);
  }
});
