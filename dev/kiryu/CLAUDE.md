# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this codebase.

## Project Overview

Kiryu is a unified security operations dashboard built on Cloudflare Workers. It aggregates data from multiple security tools to provide visibility into an organization's security posture.

**Live URL**: https://security-dashboard-api.rodgersbuilders.workers.dev

## Architecture

**Single Worker serving both UI and API** - Hono JSX renders HTML server-side, htmx provides interactivity. No separate frontend build.

```
┌─────────────────────────────────────────────────┐
│    Cloudflare Worker (Hono + JSX)               │
│    • HTML Dashboard (/)                         │
│    • REST API (/api/*)                          │
│    • Cron Sync (every 15 min)                   │
└─────────────────────┬───────────────────────────┘
                      │
      ┌───────────────┼───────────────┐
      ▼               ▼               ▼
  ┌───────┐     ┌─────────┐     ┌───────┐
  │  D1   │     │   R2    │     │  KV   │
  │(Data) │     │(Reports)│     │(Cache)│
  └───────┘     └─────────┘     └───────┘
```

## Current Integration Status

| Platform | Status | Notes |
|----------|--------|-------|
| **CrowdStrike** | ✅ Active | Full API: Alerts, Hosts, Incidents, Vulnerabilities, ZTA |
| **Salesforce** | ✅ Active | Service desk: MTTR, SLA, backlog aging, agent workload |
| **Abnormal** | ⚪ Stubbed | Client ready, needs credentials |
| **Zscaler** | ⚪ Stubbed | Client ready, needs credentials |
| **Microsoft** | ⚪ Stubbed | Client ready, needs credentials |
| **Cloudflare** | ⚪ Stubbed | Access/Gateway logs, needs API token |

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono (API + JSX views)
- **Interactivity**: htmx
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Cloudflare KV
- **Storage**: Cloudflare R2
- **Validation**: Zod
- **Auth**: Cloudflare Zero Trust (dashboard), API Key (programmatic)

## Common Commands

```bash
# Development (starts on :8787)
pnpm dev

# Deploy to Cloudflare
pnpm deploy

# Database migrations
wrangler d1 execute security-dashboard-db --file=./packages/db/migrations/0001_initial_schema.sql --remote
wrangler d1 execute security-dashboard-db --file=./packages/db/migrations/0002_salesforce_tickets.sql --remote

# Add secrets
wrangler secret put SECRET_NAME --name security-dashboard-api
```

## Project Structure

```
kiryu/
├── apps/worker/src/
│   ├── index.ts              # Hono app entry, routes, cron handler
│   ├── views/                # JSX components
│   │   ├── Layout.tsx        # Base HTML + all CSS
│   │   ├── Dashboard.tsx     # Main dashboard (CrowdStrike + Salesforce)
│   │   └── components/       # MetricCard, SecurityScore, ThreatChart, etc.
│   ├── routes/
│   │   ├── ui.tsx            # Dashboard HTML route (/)
│   │   ├── dashboard.ts      # Dashboard API endpoints
│   │   ├── health.ts         # Health check
│   │   ├── sync.ts           # Manual sync trigger
│   │   └── integrations/     # Per-platform API routes
│   ├── integrations/         # API clients
│   │   ├── crowdstrike/client.ts  # Full implementation
│   │   ├── salesforce/client.ts   # Full implementation
│   │   ├── abnormal/client.ts     # Basic stub
│   │   ├── zscaler/client.ts      # Basic stub
│   │   ├── microsoft/client.ts    # Basic stub
│   │   └── cloudflare/client.ts   # Basic stub
│   ├── services/sync.ts      # Background sync logic
│   ├── middleware/           # Auth, error handling
│   └── types/env.ts          # Environment types
├── packages/db/migrations/   # D1 SQL migrations
└── mcp-servers/              # MCP server for Claude (not yet active)
```

## Key Files

### CrowdStrike Client (`integrations/crowdstrike/client.ts`)
Full implementation with:
- OAuth2 token caching
- `getAlertSummary()` - Alerts by severity, status, MITRE tactics
- `getHostSummary()` - Endpoints by platform, containment status
- `getIncidentSummary()` - Open/closed, lateral movement, MTTR
- `getVulnerabilitySummary()` - Spotlight vulns by severity
- `getZTASummary()` - Zero Trust Assessment scores
- `getFullSummary()` - All data in parallel

### Salesforce Client (`integrations/salesforce/client.ts`)
Full implementation with:
- OAuth2 Client Credentials flow
- `getDashboardMetrics()` - All KPIs in one call
- MTTR calculation (overall and by priority)
- SLA compliance tracking
- Backlog aging buckets (<24h, 24-48h, 48-72h, >72h)
- Agent workload distribution
- Week-over-week volume comparison

### Dashboard (`views/Dashboard.tsx`)
Displays:
- Security Score (calculated from alert severity)
- Endpoint Overview (total, online, contained, stale)
- Active Alerts by severity
- Service Desk Metrics (open tickets, MTTR, SLA, escalation rate)
- Incidents, Vulnerabilities, ZTA cards
- Tickets by Priority, Backlog Aging, Agent Workload
- Recent alerts and tickets tables
- Platform status

## API Routes

### Public
- `GET /health` - Health check

### Dashboard (Zero Trust protected)
- `GET /` - Dashboard UI
- `GET /api/dashboard/summary` - Executive summary
- `GET /api/dashboard/platforms/status` - Platform health

### CrowdStrike
- `GET /api/integrations/crowdstrike/summary` - Full summary
- `GET /api/integrations/crowdstrike/alerts` - Alert details
- `GET /api/integrations/crowdstrike/hosts` - Host details

### Salesforce
- `GET /api/integrations/salesforce/test` - Test connection
- `GET /api/integrations/salesforce/metrics` - All KPIs
- `GET /api/integrations/salesforce/tickets` - Recent tickets
- `GET /api/integrations/salesforce/open` - Open tickets with aging
- `GET /api/integrations/salesforce/mttr` - MTTR breakdown
- `GET /api/integrations/salesforce/workload` - Agent workload

### Sync (API key required)
- `POST /api/v1/sync` - Trigger manual sync

## Database Schema

### Tables
- `security_events` - Normalized events from all platforms
- `security_tickets` - Enhanced Salesforce tickets (new)
- `tickets` - Legacy ticket table
- `incidents` - Security incidents
- `platform_status` - Sync status per platform
- `daily_summaries` - Pre-aggregated daily stats
- `metrics` - Time-series metrics
- `ticket_metrics_daily` - Daily ticket KPIs (new)

## Environment Variables

### Required Secrets (set via `wrangler secret put`)
```bash
# CrowdStrike
CROWDSTRIKE_CLIENT_ID
CROWDSTRIKE_CLIENT_SECRET

# Salesforce
SALESFORCE_INSTANCE_URL      # e.g., https://yourorg.my.salesforce.com
SALESFORCE_CLIENT_ID         # Connected App Consumer Key
SALESFORCE_CLIENT_SECRET     # Connected App Consumer Secret

# Dashboard API (for programmatic access)
DASHBOARD_API_KEY
```

### Optional (for additional integrations)
```bash
ABNORMAL_API_TOKEN
ZSCALER_API_KEY
ZSCALER_API_SECRET
AZURE_TENANT_ID
AZURE_CLIENT_ID
AZURE_CLIENT_SECRET
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

## Key Patterns

### Hono JSX Views
```typescript
app.get('/', async (c) => {
  const data = await fetchData();
  return c.html(<Dashboard data={data} />);
});
```

### htmx Interactivity
```html
<button hx-get="/?period=7d" hx-target="body" hx-swap="outerHTML">
  Refresh
</button>
```

### Integration Client Pattern
```typescript
export class PlatformClient {
  isConfigured(): boolean { /* check env vars */ }
  private async getAccessToken(): Promise<string> { /* OAuth */ }
  async getSummary(): Promise<Summary> { /* parallel API calls */ }
}
```

## Deployment

Push to `main` triggers GitHub Actions, or deploy manually:
```bash
cd apps/worker && pnpm deploy
```

## Troubleshooting

### Salesforce "no client credentials user enabled"
→ Configure Run As user in Connected App: Manage → Edit Policies → Client Credentials Flow → Run As

### Salesforce "request not supported on this domain"
→ Use your My Domain URL (e.g., `https://yourorg.my.salesforce.com`) not `login.salesforce.com`

### CrowdStrike 403 errors
→ Check API client scopes in Falcon console, ensure read access to alerts/hosts/incidents
