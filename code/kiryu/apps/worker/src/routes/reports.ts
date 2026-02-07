import { Hono } from 'hono';
import type { Env } from '../types/env';
import { ReportService } from '../services/report';

export const reportRoutes = new Hono<{ Bindings: Env }>();

/**
 * List available reports
 */
reportRoutes.get('/', async (c) => {
  const reportService = new ReportService(c.env);
  const reports = await reportService.listReports();
  return c.json({ reports });
});

/**
 * Get the latest report
 */
reportRoutes.get('/latest', async (c) => {
  const reportService = new ReportService(c.env);
  const reports = await reportService.listReports();

  if (reports.length === 0) {
    return c.text('No reports available yet. Generate one via POST /api/reports/generate', 404);
  }

  // Reports are sorted by key (YYYY-MM), get the last one
  const latest = reports.sort((a, b) => b.key.localeCompare(a.key))[0]!;
  const html = await reportService.getReport(latest.key);

  if (!html) {
    return c.text('Report not found', 404);
  }

  return c.html(html);
});

/**
 * Get a specific report by year-month
 */
reportRoutes.get('/:yearMonth', async (c) => {
  const yearMonth = c.req.param('yearMonth');

  if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
    return c.json({ error: 'Invalid format. Use YYYY-MM' }, 400);
  }

  const reportService = new ReportService(c.env);
  const key = `reports/${yearMonth}-security-report.html`;
  const html = await reportService.getReport(key);

  if (!html) {
    return c.text(`Report for ${yearMonth} not found`, 404);
  }

  return c.html(html);
});

/**
 * Generate a report for a specific month
 */
reportRoutes.post('/generate', async (c) => {
  const body = await c.req.json<{ year?: number; month?: number }>().catch(() => ({} as { year?: number; month?: number }));

  // Default to previous month
  const now = new Date();
  const defaultYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const defaultMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const year = typeof body.year === 'number' && body.year >= 2020 && body.year <= 2099 ? body.year : defaultYear;
  const month = typeof body.month === 'number' && body.month >= 1 && body.month <= 12 ? body.month : defaultMonth;

  const reportService = new ReportService(c.env);

  try {
    const { key } = await reportService.generateMonthlyReport(year, month);
    return c.json({
      success: true,
      key,
      url: `/api/reports/${year}-${String(month).padStart(2, '0')}`,
      message: `Report generated for ${year}-${String(month).padStart(2, '0')}`,
    });
  } catch (error) {
    console.error('Report generation failed:', error instanceof Error ? error.message : error);
    return c.json({ success: false, error: 'Report generation failed' }, 500);
  }
});
