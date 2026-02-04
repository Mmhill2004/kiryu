import { Hono } from 'hono';
import type { Env } from '../types/env';
import { Dashboard } from '../views/Dashboard';
import { CrowdStrikeClient } from '../integrations/crowdstrike/client';
import { SalesforceClient, type TicketMetrics } from '../integrations/salesforce/client';

export const uiRoutes = new Hono<{ Bindings: Env }>();

/**
 * Main dashboard page
 */
uiRoutes.get('/', async (c) => {
  const period = (c.req.query('period') || '7d') as '24h' | '7d' | '30d' | '90d';
  const daysBack = period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90;

  // Initialize with defaults
  let crowdstrike = null;
  let salesforce: TicketMetrics | null = null;
  let platforms: Array<{
    platform: string;
    status: 'healthy' | 'error' | 'not_configured' | 'unknown';
    last_sync: string | null;
    error_message?: string;
  }> = [];

  // Fetch data from both platforms in parallel
  const csClient = new CrowdStrikeClient(c.env);
  const sfClient = new SalesforceClient(c.env);

  const fetchPromises: Promise<void>[] = [];

  // CrowdStrike fetch
  if (csClient.isConfigured()) {
    fetchPromises.push(
      csClient.getFullSummary(daysBack, 30)
        .then((data) => {
          crowdstrike = data;
          platforms.push({
            platform: 'crowdstrike',
            status: 'healthy',
            last_sync: new Date().toISOString(),
          });
        })
        .catch((error) => {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error('CrowdStrike fetch error:', errorMsg);
          platforms.push({
            platform: 'crowdstrike',
            status: 'error',
            last_sync: null,
            error_message: errorMsg,
          });
        })
    );
  } else {
    platforms.push({
      platform: 'crowdstrike',
      status: 'not_configured',
      last_sync: null,
    });
  }

  // Salesforce fetch
  if (sfClient.isConfigured()) {
    fetchPromises.push(
      sfClient.getDashboardMetrics()
        .then((data) => {
          salesforce = data;
          platforms.push({
            platform: 'salesforce',
            status: 'healthy',
            last_sync: new Date().toISOString(),
          });
        })
        .catch((error) => {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error('Salesforce fetch error:', errorMsg);
          platforms.push({
            platform: 'salesforce',
            status: 'error',
            last_sync: null,
            error_message: errorMsg,
          });
        })
    );
  } else {
    platforms.push({
      platform: 'salesforce',
      status: 'not_configured',
      last_sync: null,
    });
  }

  // Wait for all fetches to complete
  await Promise.all(fetchPromises);

  // Add other platforms as not configured for now
  platforms.push(
    { platform: 'abnormal', status: 'not_configured', last_sync: null },
    { platform: 'zscaler', status: 'not_configured', last_sync: null },
    { platform: 'microsoft', status: 'not_configured', last_sync: null },
  );

  return c.html(
    <Dashboard
      data={{
        crowdstrike,
        salesforce,
        platforms,
        period,
        lastUpdated: new Date().toISOString(),
      }}
    />
  );
});
