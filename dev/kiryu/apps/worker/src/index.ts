import { Hono } from 'hono';
import { cors } from 'hono/cors';
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
import { syncRoutes } from './routes/sync';

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
app.use('*', cors({
  origin: ['https://security-dashboard-e0x.pages.dev', 'http://localhost:3000', 'http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposeHeaders: ['X-Request-Id'],
  maxAge: 86400,
  credentials: true,
}));

// Error handling
app.onError(errorHandler);

// Public routes (no auth required)
app.route('/health', healthRoutes);

// Protected routes (require API key)
app.use('/api/*', authMiddleware);
app.route('/api/dashboard', dashboardRoutes);
app.route('/api/integrations/crowdstrike', crowdstrikeRoutes);
app.route('/api/integrations/abnormal', abnormalRoutes);
app.route('/api/integrations/zscaler', zscalerRoutes);
app.route('/api/integrations/microsoft', microsoftRoutes);
app.route('/api/integrations/salesforce', salesforceRoutes);
app.route('/api/sync', syncRoutes);

// Root route
app.get('/', (c) => {
  return c.json({
    name: 'Security Dashboard API',
    version: '0.1.0',
    status: 'operational',
    docs: '/health',
  });
});

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
