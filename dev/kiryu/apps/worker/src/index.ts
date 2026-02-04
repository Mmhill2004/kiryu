import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { timing } from 'hono/timing';

// Route imports
import { healthRoutes } from './routes/health';
import { dashboardRoutes } from './routes/dashboard';
import { crowdstrikeRoutes } from './routes/integrations/crowdstrike';
import { abnormalRoutes } from './routes/integrations/abnormal';
import { zscalerRoutes } from './routes/integrations/zscaler';
import { microsoftRoutes } from './routes/integrations/microsoft';
import { salesforceRoutes } from './routes/integrations/salesforce';
import { cloudflareRoutes } from './routes/integrations/cloudflare';
import { syncRoutes } from './routes/sync';
import { uiRoutes } from './routes/ui';

// Middleware
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error';

// Types
import type { Env } from './types/env';

// Create the main Hono app
const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', timing());
app.use('*', logger());
app.use('*', secureHeaders());

// Error handling
app.onError(errorHandler);

// Public routes (no auth required)
app.route('/health', healthRoutes);

// Dashboard UI (no auth - use Zero Trust for access control)
app.route('/', uiRoutes);

// Protected API routes (require API key)
app.use('/api/*', authMiddleware);
app.route('/api/dashboard', dashboardRoutes);
app.route('/api/integrations/crowdstrike', crowdstrikeRoutes);
app.route('/api/integrations/abnormal', abnormalRoutes);
app.route('/api/integrations/zscaler', zscalerRoutes);
app.route('/api/integrations/microsoft', microsoftRoutes);
app.route('/api/integrations/salesforce', salesforceRoutes);
app.route('/api/integrations/cloudflare', cloudflareRoutes);
app.route('/api/sync', syncRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: `Route ${c.req.method} ${c.req.path} not found`,
  }, 404);
});

// Export for Cloudflare Workers
export default {
  fetch: app.fetch,
  
  // Scheduled handler for cron triggers
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`Cron triggered at ${new Date(event.scheduledTime).toISOString()}`);
    
    // Import sync service dynamically to avoid circular dependencies
    const { SyncService } = await import('./services/sync');
    const syncService = new SyncService(env);
    
    try {
      await syncService.syncAll();
      console.log('Scheduled sync completed successfully');
    } catch (error) {
      console.error('Scheduled sync failed:', error);
      // In production, you'd want to alert on this
    }
  },
};
