import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';

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
import { reportRoutes } from './routes/reports';
import { uiRoutes } from './routes/ui';

// Middleware
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error';

// Types
import type { Env } from './types/env';

// Create the main Hono app
const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", 'https://unpkg.com'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    imgSrc: ["'self'", 'data:'],
    connectSrc: ["'self'"],
  },
}));

// Error handling
app.onError(errorHandler);

// Public routes (no auth required)
app.route('/health', healthRoutes);

// Dashboard UI (Zero Trust handles auth)
app.route('/', uiRoutes);

// Dashboard data endpoints (Zero Trust handles auth)
app.route('/api/dashboard', dashboardRoutes);
app.route('/api/integrations/crowdstrike', crowdstrikeRoutes);
app.route('/api/integrations/abnormal', abnormalRoutes);
app.route('/api/integrations/zscaler', zscalerRoutes);
app.route('/api/integrations/microsoft', microsoftRoutes);
app.route('/api/integrations/salesforce', salesforceRoutes);
app.route('/api/integrations/cloudflare', cloudflareRoutes);

// Report routes (Zero Trust handles auth)
app.route('/api/reports', reportRoutes);

// Protected API routes (require API key for programmatic access)
app.use('/api/v1/*', authMiddleware);
app.route('/api/v1/sync', syncRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
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
    }

    // Generate monthly report on the 1st of each month (for previous month)
    const now = new Date(event.scheduledTime);
    if (now.getUTCDate() === 1) {
      // getUTCMonth() is 0-indexed: Jan=0, Feb=1, etc.
      // On Jan 1st, generate December report; on Feb 1st, generate January report
      const prevMonth = now.getUTCMonth() === 0 ? 12 : now.getUTCMonth(); // 1-indexed
      const prevYear = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
      const flagKey = `report:generated:${prevYear}-${String(prevMonth).padStart(2, '0')}`;
      try {
        const alreadyGenerated = await env.CACHE.get(flagKey);
        if (!alreadyGenerated) {
          const { ReportService } = await import('./services/report');
          const reportService = new ReportService(env);
          await reportService.generateMonthlyReport(prevYear, prevMonth);
          await env.CACHE.put(flagKey, 'true', { expirationTtl: 86400 * 7 });
          console.log(`Monthly report generated for ${prevYear}-${String(prevMonth).padStart(2, '0')}`);
        }
      } catch (error) {
        console.error('Monthly report generation failed:', error);
      }
    }
  },
};
