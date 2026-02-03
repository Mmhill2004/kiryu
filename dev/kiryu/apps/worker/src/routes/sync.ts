import { Hono } from 'hono';
import type { Env } from '../types/env';
import { SyncService } from '../services/sync';

export const syncRoutes = new Hono<{ Bindings: Env }>();

/**
 * Trigger a full sync of all integrations
 */
syncRoutes.post('/all', async (c) => {
  const syncService = new SyncService(c.env);
  
  try {
    const results = await syncService.syncAll();
    return c.json({
      message: 'Sync completed',
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Sync failed:', error);
    return c.json({
      error: 'Sync failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * Trigger sync for a specific platform
 */
syncRoutes.post('/:platform', async (c) => {
  const platform = c.req.param('platform');
  const validPlatforms = ['crowdstrike', 'abnormal', 'zscaler', 'microsoft', 'salesforce'];
  
  if (!validPlatforms.includes(platform)) {
    return c.json({
      error: 'Invalid platform',
      message: `Valid platforms: ${validPlatforms.join(', ')}`,
    }, 400);
  }

  const syncService = new SyncService(c.env);
  
  try {
    const result = await syncService.syncPlatform(platform);
    return c.json({
      message: `${platform} sync completed`,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`${platform} sync failed:`, error);
    return c.json({
      error: `${platform} sync failed`,
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * Get sync status for all platforms
 */
syncRoutes.get('/status', async (c) => {
  try {
    const statuses = await c.env.DB.prepare(`
      SELECT 
        platform,
        status,
        last_sync,
        last_success,
        last_error,
        error_message,
        records_synced
      FROM sync_status
      ORDER BY platform ASC
    `).all();

    return c.json({
      statuses: statuses.results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Return default status if table doesn't exist yet
    return c.json({
      statuses: [
        { platform: 'crowdstrike', status: 'never_run' },
        { platform: 'abnormal', status: 'never_run' },
        { platform: 'zscaler', status: 'never_run' },
        { platform: 'microsoft', status: 'never_run' },
        { platform: 'salesforce', status: 'never_run' },
      ],
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Get sync history/logs
 */
syncRoutes.get('/history', async (c) => {
  const limit = parseInt(c.req.query('limit') || '50');
  const platform = c.req.query('platform');

  try {
    let query = `
      SELECT 
        id,
        platform,
        status,
        started_at,
        completed_at,
        records_synced,
        error_message
      FROM sync_logs
    `;
    
    const params: (string | number)[] = [];
    
    if (platform) {
      query += ' WHERE platform = ?';
      params.push(platform);
    }
    
    query += ' ORDER BY started_at DESC LIMIT ?';
    params.push(Math.min(limit, 100));

    const logs = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({
      logs: logs.results,
      total: logs.results.length,
    });
  } catch (error) {
    return c.json({
      logs: [],
      total: 0,
    });
  }
});
