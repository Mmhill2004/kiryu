# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this codebase.

## Project Overview

Kiryu is a unified security operations dashboard built on Cloudflare Workers. It aggregates data from multiple security tools (CrowdStrike, Abnormal Security, Zscaler, Microsoft Defender, Salesforce) to provide visibility into an organization's security posture.

## Architecture

**Single Worker serving both UI and API** - no separate frontend build pipeline.

- **apps/worker** - Hono app serving HTML (JSX) + JSON API
- **packages/db** - D1 database migrations
- **mcp-servers/security-dashboard** - MCP server for Claude integration

### Tech Stack
- **Runtime**: Cloudflare Workers
- **Framework**: Hono (API + JSX views)
- **Interactivity**: htmx
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Cloudflare KV
- **Storage**: Cloudflare R2
- **Validation**: Zod

### Cloudflare Services
- **Workers** - App hosting with scheduled cron triggers (every 15 min)
- **D1** - SQLite database for persistent storage
- **R2** - Object storage for reports
- **KV** - Cache layer

## Common Commands

```bash
# Install dependencies
pnpm install

# Development (starts on :8787)
pnpm dev

# Deploy to Cloudflare
pnpm deploy

# Database migrations
pnpm db:migrate        # Remote (production)
pnpm db:migrate:local  # Local development

# Quality
pnpm lint
pnpm typecheck
pnpm test
```

## Code Organization

### Worker Structure (`apps/worker/src/`)
```
src/
├── index.ts              # Hono app entry, routes, scheduled handler
├── views/                # JSX components for HTML rendering
│   ├── Layout.tsx        # Base HTML layout with CSS
│   ├── Dashboard.tsx     # Main dashboard page
│   └── components/       # Reusable UI components
├── routes/
│   ├── ui.tsx            # Dashboard HTML routes
│   ├── dashboard.ts      # Dashboard API (JSON)
│   ├── health.ts         # Health check endpoint
│   ├── sync.ts           # Manual sync trigger
│   └── integrations/     # Platform-specific API routes
├── integrations/         # External API clients
│   ├── crowdstrike/
│   ├── abnormal/
│   ├── zscaler/
│   ├── microsoft/
│   └── salesforce/
├── middleware/           # Auth and error handling
├── services/             # Business logic (sync service)
└── types/                # TypeScript types
```

### Routes
- `GET /` - Dashboard UI (HTML)
- `GET /health` - Health check (public)
- `GET /api/dashboard/*` - Dashboard data (requires API key)
- `GET /api/integrations/*` - Platform-specific endpoints
- `POST /api/sync` - Trigger manual data sync

### Database Schema (`packages/db/migrations/`)
Key tables:
- `security_events` - Normalized events from all platforms
- `incidents` - Ongoing security incidents
- `tickets` - Salesforce service desk tickets
- `platform_status` - Health/sync status per platform
- `daily_summaries` - Pre-aggregated stats for dashboard
- `metrics` - Time-series metrics for trending

## Key Patterns

### Hono JSX Views
```typescript
import { Layout } from './views/Layout';

app.get('/', (c) => {
  return c.html(<Layout><Dashboard data={data} /></Layout>);
});
```

### API Authentication
Protected routes under `/api/*` require `X-API-Key` header. Dashboard UI uses Zero Trust for access control.

### Cloudflare Bindings
Access via context: `c.env.DB`, `c.env.CACHE`, `c.env.REPORTS_BUCKET`

### htmx for Interactivity
```html
<button hx-get="/?period=7d" hx-target="body" hx-swap="outerHTML">
  Refresh
</button>
```

## Environment & Secrets

Non-sensitive vars are in `wrangler.toml`. Secrets must be set via:
```bash
wrangler secret put CROWDSTRIKE_CLIENT_ID --name security-dashboard-api
wrangler secret put CROWDSTRIKE_CLIENT_SECRET --name security-dashboard-api
wrangler secret put ABNORMAL_API_TOKEN --name security-dashboard-api
wrangler secret put ZSCALER_API_KEY --name security-dashboard-api
wrangler secret put ZSCALER_API_SECRET --name security-dashboard-api
wrangler secret put AZURE_TENANT_ID --name security-dashboard-api
wrangler secret put AZURE_CLIENT_ID --name security-dashboard-api
wrangler secret put AZURE_CLIENT_SECRET --name security-dashboard-api
wrangler secret put SALESFORCE_CLIENT_ID --name security-dashboard-api
wrangler secret put SALESFORCE_CLIENT_SECRET --name security-dashboard-api
wrangler secret put SALESFORCE_PRIVATE_KEY --name security-dashboard-api
wrangler secret put DASHBOARD_API_KEY --name security-dashboard-api
```

## Deployment

Push to `main` triggers GitHub Actions deployment, or deploy manually:
```bash
pnpm deploy
```

**Live URL**: https://security-dashboard-api.rodgersbuilders.workers.dev
