# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this codebase.

## Project Overview

Kiryu is a unified security operations dashboard built on Cloudflare Workers. It aggregates data from multiple security tools to provide visibility into an organization's security posture, with KV-cached dashboards, D1 historical trends, R2 executive reports, and an MCP server for AI-assisted security operations.

**Live URL**: https://security-dashboard-api.rodgersbuilders.workers.dev

## Architecture

**Single Worker serving both UI and API** - Hono JSX renders HTML server-side, htmx provides interactivity. No separate frontend build.

```
┌─────────────────────────────────────────────────┐
│    Cloudflare Worker (Hono + JSX)               │
│    • HTML Dashboard (/)                         │
│    • REST API (/api/*)                          │
│    • Cron Sync (every 15 min)                   │
│    • Monthly Report Generation (1st of month)   │
└─────────────────────┬───────────────────────────┘
                      │
      ┌───────────────┼───────────────┐
      ▼               ▼               ▼
  ┌───────┐     ┌─────────┐     ┌───────┐
  │  D1   │     │   R2    │     │  KV   │
  │(Data) │     │(Reports)│     │(Cache)│
  └───────┘     └─────────┘     └───────┘
```

**Data flow:** Cron syncs every 15 min → stores daily snapshots in D1 → KV caches dashboard data (5 min TTL) → Dashboard loads from KV cache first. On the 1st of each month, cron generates an HTML executive report and stores it in R2.

## Current Integration Status

| Platform | Status | Notes |
|----------|--------|-------|
| **CrowdStrike** | ✅ Active | 12 available: Alerts, Hosts, Incidents, CrowdScore, Spotlight Vulns, ZTA, Identity Protection, Discover, Sensor Usage, Intel (Actors/Indicators/Reports). NGSIEM + OverWatch: 404 (not provisioned). Prevention Policies: 403 (no scope). |
| **Salesforce** | ✅ Active | Service desk: MTTR, SLA, backlog aging, agent workload |
| **Microsoft** | ✅ Active | Entra alerts, Defender for Endpoint, Secure Score, Cloud Defender, Device Compliance, Risky Users, Incidents, Machines |
| **Meraki** | ✅ Active | Network infrastructure: Device statuses, VPN tunnels, Uplinks, Licensing. Static API key auth (no OAuth). |
| **Abnormal** | ✅ Active | Email threats, cases, stats. Bearer token auth. |
| **Zscaler** | ✅ Active | ZIA, ZPA, ZDX, Analytics, Risk360. Supports OneAPI + legacy credentials. |
| **Cloudflare** | ✅ Active | Access logs, Gateway logs, Security events, Access apps. Bearer token auth. |

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono (API + JSX views)
- **Interactivity**: htmx
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Cloudflare KV (5 min dashboard TTL, 29 min CS OAuth, 118 min SF OAuth, 58 min per-scope MS OAuth)
- **Storage**: Cloudflare R2 (monthly executive reports)
- **Validation**: Zod
- **Auth**: Cloudflare Zero Trust (dashboard), API Key (programmatic)
- **AI Integration**: MCP server with 35 tools

## Common Commands

```bash
# Local development (starts on :8787, uses .dev.vars for secrets, local D1/KV/R2)
pnpm dev

# Deploy to Cloudflare
cd apps/worker && npx wrangler deploy src/index.ts

# Database migrations
wrangler d1 execute security-dashboard-db --file=./packages/db/migrations/0001_initial_schema.sql --remote
wrangler d1 execute security-dashboard-db --file=./packages/db/migrations/0002_salesforce_tickets.sql --remote
wrangler d1 execute security-dashboard-db --file=./packages/db/migrations/0003_metrics_and_retention.sql --remote
wrangler d1 execute security-dashboard-db --file=./packages/db/migrations/0004_expanded_cs_metrics.sql --remote
wrangler d1 execute security-dashboard-db --file=./packages/db/migrations/0005_zscaler_metrics.sql --remote
wrangler d1 execute security-dashboard-db --file=./packages/db/migrations/0006_zdx_analytics_metrics.sql --remote
wrangler d1 execute security-dashboard-db --file=./packages/db/migrations/0007_meraki_metrics.sql --remote

# Add secrets
wrangler secret put SECRET_NAME --name security-dashboard-api

# Additional useful scripts
cd apps/worker && npx wrangler deploy --env staging src/index.ts  # Deploy to staging
cd apps/worker && npx wrangler types                              # Regenerate CF binding types
pnpm test                                                         # Run tests (vitest)
```

## Project Structure

```
kiryu/
├── apps/worker/src/
│   ├── index.ts              # Hono app entry, routes, cron handler
│   ├── views/                # JSX components
│   │   ├── Layout.tsx        # Base HTML + all CSS
│   │   ├── Dashboard.tsx     # Main dashboard with trends + cache indicator
│   │   ├── ReportTemplate.tsx # Self-contained HTML monthly report
│   │   └── components/       # MetricCard, SecurityScore, ThreatChart, etc.
│   ├── routes/
│   │   ├── ui.tsx            # Dashboard HTML route (/) with KV cache
│   │   ├── dashboard.ts      # Dashboard API (summary, trends, executive-summary)
│   │   ├── reports.ts        # Report API (list, get, generate)
│   │   ├── health.ts         # Health check
│   │   ├── sync.ts           # Manual sync trigger
│   │   └── integrations/     # Per-platform API routes
│   ├── integrations/         # API clients
│   │   ├── crowdstrike/client.ts  # Full: 12 modules (see Key Files below)
│   │   ├── salesforce/client.ts   # Full: Tickets, MTTR, SLA, Workload
│   │   ├── microsoft/client.ts    # Full: Entra Alerts, Defender, Secure Score, Compliance, Recommendations, Risky Users, Incidents, Machines
│   │   ├── meraki/client.ts       # Full: Device statuses, VPN tunnels, Uplinks, Licensing
│   │   ├── abnormal/client.ts     # Full: Threats, Cases, Stats
│   │   ├── zscaler/              # Full: 6 files (client.ts, auth.ts, zia-client.ts, zpa-client.ts, zdx-client.ts, analytics-client.ts)
│   │   └── cloudflare/client.ts   # Full: Access logs, Gateway logs, Security events
│   ├── services/
│   │   ├── sync.ts           # Background sync + D1 snapshots + 90-day retention
│   │   ├── cache.ts          # KV cache utility with typed get/set/invalidate
│   │   ├── trends.ts         # D1 historical trend queries (period-over-period)
│   │   └── report.ts         # Monthly report generation + R2 storage
│   ├── middleware/           # Auth, error handling
│   └── types/env.ts          # Environment types
├── packages/db/migrations/   # D1 SQL migrations (7 files)
└── mcp-servers/security-dashboard/  # MCP server (35 tools)
```

## Key Files

### Integration Clients (`integrations/*/client.ts`)
All follow the same pattern: `isConfigured()` → OAuth with KV caching → `getFullSummary()` via `Promise.allSettled`.

- **CrowdStrike** — 12 modules (Alerts, Hosts, Incidents, CrowdScore, Spotlight, ZTA, IDP, Discover, Sensors, Intel, NGSIEM, OverWatch). OAuth KV-backed (29 min TTL). Constructor takes optional `KVNamespace` cache param. IDP uses alerts API with `product:'idp'` filter. Discover uses timestamp-based FQL. Sensors derived from hosts API.
- **Microsoft** — 8 modules across 3 API scopes (Graph, Defender/SecurityCenter, Azure Management). Per-scope OAuth with in-flight dedup. Returns pre-computed analytics (severity/status breakdowns). Constructor takes only `Env` (manages its own KV caching internally). Note: Identity, Incidents, and Machines only accessible via `/summary` (no dedicated routes yet).
- **Salesforce** — SOQL-based. OAuth KV-backed (118 min TTL). Constructor takes optional `KVNamespace` cache param. `getDashboardMetrics()` returns all KPIs in one call.
- **Meraki** — Static API key auth (no OAuth, no token caching). Constructor takes `Env`. Must follow redirects (`redirect: 'follow'`) — Meraki 302s to region shards. Rate limit: 10 req/sec per-org shared across all API consumers. `getSummary()` aggregates device overview, statuses, networks, VPN, uplinks, and licensing.
- **Zscaler** — 6-file multi-client architecture: `client.ts` (orchestrator), `auth.ts` (OneAPI + legacy auth), `zia-client.ts`, `zpa-client.ts`, `zdx-client.ts`, `analytics-client.ts`. Supports both OneAPI (new) and legacy per-module credentials with fallback logic. Risk360 scores cached in KV. `getFullSummary()` returns ZIA, ZPA, ZDX, Analytics, Risk360 data.
- **Abnormal** — Bearer token auth (`ABNORMAL_API_TOKEN`). Methods: `getThreats()`, `getThreatDetails()`, `getCases()`, `getStats()`.
- **Cloudflare** — Bearer token auth (`CLOUDFLARE_API_TOKEN`). Methods: `getAccessLogs()`, `getGatewayLogs()`, `getSecurityEvents()`, `getAccessApps()`, `getStats()`.

### Services
- **CacheService** (`services/cache.ts`) — KV wrapper. Keys follow `{prefix}:{period}` pattern (e.g. `cs:summary:7d`). `invalidatePrefix()` paginates via cursor.
- **SyncService** (`services/sync.ts`) — Cron-triggered: fetches all platforms → stores daily snapshots in D1 → invalidates KV. 90-day retention with batched deletes.
- **TrendService** (`services/trends.ts`) — Queries D1 for current vs previous period, returns `TrendData` (changePercent, direction, sparkline).
- **ReportService** (`services/report.ts`) — Generates self-contained HTML reports from D1 data, stores in R2. Rules-based recommendation engine.

### Views
- **Dashboard.tsx** — Main dashboard with tabs: CrowdStrike, Microsoft, Salesforce, ZIA, ZPA, ZDX, Meraki. MetricCards with source labels and trend indicators. Security Score calculated from CS + MS alert severity weights.
- **ReportTemplate.tsx** — Self-contained HTML monthly report with inline CSS and `escapeHtml()` for raw string output.
- **Layout.tsx** — Base HTML shell with all CSS.

## API Routes

Route files: `routes/ui.tsx`, `routes/dashboard.ts`, `routes/reports.ts`, `routes/health.ts`, `routes/sync.ts`, `routes/integrations/*.ts`

- `GET /` — Dashboard UI (KV-cached, `?period=7d`, `?refresh=true`)
- `GET /health` — Health check (public, not behind Zero Trust)
- `GET /api/dashboard/{summary,platforms/status,trends,threats/timeline,incidents/recent,tickets/metrics,executive-summary}` — Dashboard data APIs
- `GET /api/integrations/crowdstrike/{summary,alerts,hosts,incidents,vulnerabilities,identity,discover,sensors,intel,crowdscore,zta,ngsiem,overwatch,diagnostic}` — CrowdStrike (each has `/list` variant for raw data)
- `GET /api/integrations/microsoft/{summary,alerts,defender/alerts,secure-score,recommendations,compliance}` — Microsoft (identity/incidents/machines only via `/summary`)
- `GET /api/integrations/salesforce/{metrics,tickets,open,mttr,workload}` — Salesforce
- `GET /api/integrations/meraki/{test,summary,devices,networks,vpn,uplinks}` — Meraki
- `GET /api/integrations/zscaler/{test,summary,zia,zpa,zpa/connectors,zdx,zdx/apps,zdx/alerts,analytics,risk360,diagnostic}` — Zscaler (`POST risk360` to set scores)
- `GET /api/integrations/abnormal/{threats,stats,cases}` — Abnormal
- `GET /api/integrations/cloudflare/{access/logs,gateway/logs,security/events,stats,access/apps}` — Cloudflare
- `GET /api/reports`, `GET /api/reports/latest`, `GET /api/reports/:yearMonth`, `POST /api/reports/generate` — Reports
- `POST /api/v1/sync/{all,:platform}`, `GET /api/v1/sync/{status,history}` — Sync (API key required)

## MCP Server

Located at `mcp-servers/security-dashboard/`. Proxies to the worker API with API key auth. 35 tools covering all platforms (including Zscaler-specific tools: summary, zia, zpa, zdx, analytics, risk360, diagnostic). See [mcp-servers/README.md](./mcp-servers/README.md) for the full tool list and setup instructions.

## Database Schema

### Tables
- `security_events` - Normalized events from all platforms
- `security_tickets` - Enhanced Salesforce tickets
- `tickets` - Legacy ticket table
- `incidents` - Security incidents
- `platform_status` - Sync status per platform
- `daily_summaries` - Pre-aggregated daily stats
- `metrics` - Time-series metrics
- `sync_logs` - Sync operation history
- `audit_logs` - Audit trail
- `ticket_metrics_daily` - Daily Salesforce ticket KPIs
- `crowdstrike_metrics_daily` - Daily CrowdStrike snapshots (~68 columns across 12 modules)
- `zscaler_metrics_daily` - Daily Zscaler snapshots (ZIA, ZPA, ZDX, Analytics, Risk360)
- `meraki_metrics_daily` - Daily Meraki snapshots (devices, networks, VPN, uplinks, licensing)
- `data_retention_log` - Tracks automated cleanup runs (90-day retention)

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

# Microsoft / Azure
AZURE_TENANT_ID              # Entra ID Directory (tenant) ID
AZURE_CLIENT_ID              # App Registration Application (client) ID
AZURE_CLIENT_SECRET          # App Registration client secret value

# Dashboard API (for programmatic access)
DASHBOARD_API_KEY
```

### Optional (for additional integrations)
```bash
CROWDSTRIKE_BASE_URL         # Region override (default: https://api.crowdstrike.com)
AZURE_SUBSCRIPTION_ID        # Scope Cloud Defender recommendations to a subscription
ABNORMAL_API_TOKEN
ABNORMAL_BASE_URL            # Base URL override

# Zscaler — supports OneAPI (preferred) or legacy per-module credentials
ZSCALER_CLIENT_ID            # OneAPI client ID
ZSCALER_CLIENT_SECRET        # OneAPI client secret
ZSCALER_VANITY_DOMAIN        # OneAPI vanity domain
ZSCALER_CLOUD                # OneAPI cloud (e.g., zscaler.net)
ZSCALER_ZPA_CUSTOMER_ID      # ZPA customer ID (needed for both OneAPI and legacy)
# Legacy ZIA credentials (fallback if OneAPI not configured)
ZSCALER_ZIA_USERNAME
ZSCALER_ZIA_PASSWORD
ZSCALER_ZIA_API_KEY
ZSCALER_ZIA_CLOUD
# Legacy ZPA credentials (fallback if OneAPI not configured)
ZSCALER_ZPA_CLIENT_ID
ZSCALER_ZPA_CLIENT_SECRET
ZSCALER_ZPA_CLOUD
# ZDX credentials
ZDX_API_KEY_ID
ZDX_API_SECRET
ZDX_CLOUD

MERAKI_API_KEY               # Meraki Dashboard API key
MERAKI_ORG_ID                # Meraki Organization ID
MERAKI_BASE_URL              # Region override (default: https://api.meraki.com/api/v1)

CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_ZONE_ID           # Zone ID for security events
```

## TypeScript

Strict mode is enabled with `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`:
```bash
# Check types (must use worker tsconfig for JSX/Workers types)
cd apps/worker && npx tsc -p tsconfig.json --noEmit

# Verify bundle compiles
cd apps/worker && npx wrangler deploy src/index.ts --dry-run
```

Key type patterns:
- `AppContext` (from `types/env.ts`) must be used for all Hono handlers/middleware — provides `Variables.requestId`
- `ContentfulStatusCode` (from `hono/utils/http-status`) for `ApiError.statusCode` — Hono's `c.json()` rejects 1xx codes
- `Record<string, number>` property access returns `number | undefined` — always use `?? 0`
- Arrow function generics in `.tsx` files parse as JSX tags — use `function` declarations instead
- All optional integration credentials (Abnormal, Zscaler, Meraki, Cloudflare) are typed as optional `string?` in `Env` — clients check with `isConfigured()`

## Performance & Stability

### Fetch Timeouts
All external API calls have AbortController timeouts:
- OAuth token fetches: 10s timeout
- Data API requests: 20s timeout
- Dashboard platform fetches: 25s timeout (in `ui.tsx`)

### OAuth In-Flight Dedup
All three OAuth clients (CS, SF, MS) deduplicate concurrent auth requests via `pendingAuth` promise tracking — prevents thundering herd on token expiry.

### Batched Database Operations
Sync service uses `DB.batch()` for all bulk inserts instead of sequential statements. Data retention cleanup runs batched DELETEs with `LIMIT 500` to avoid locking.

### Cache Invalidation
`CacheService.invalidatePrefix()` uses cursor-based pagination to handle >1000 keys per prefix.

## Key Patterns

### KV Cache-First Loading
```typescript
// ui.tsx: try cache first, fall back to live API, then cache result
const csCacheKey = `${CACHE_KEYS.CROWDSTRIKE_SUMMARY}:${period}`;  // e.g. "cs:summary:7d"
const cached = await cache.get<CSSummary>(csCacheKey);
if (cached && !forceRefresh) { crowdstrike = cached.data; return; }
// Otherwise fetch live, then cache for 5 min
crowdstrike = await csClient.getFullSummary(daysBack, 30);
await cache.set(csCacheKey, crowdstrike, CACHE_TTL.DASHBOARD_DATA);
```

### Trend Indicators
```typescript
// MetricCard accepts optional trend prop with invertColor for "down is good" metrics
<MetricCard label="Open Tickets" value={42}
  trend={{ direction: 'down', changePercent: 15, invertColor: true }} />
```

### MetricCard Source Labels
```typescript
// MetricCard accepts optional source prop to show platform origin
<MetricCard label="Active Alerts" value={12} source="CS" />  // CrowdStrike
<MetricCard label="Open Tickets" value={42} source="SF" />   // Salesforce
<MetricCard label="Secure Score" value="78%" source="MS" />  // Microsoft
<MetricCard label="Devices Online" value="42/50" source="MK" />  // Meraki
```

### Integration Client Pattern
```typescript
export class PlatformClient {
  isConfigured(): boolean { /* check env vars */ }
  private async getAccessToken(): Promise<string> { /* OAuth with KV caching */ }
  async getSummary(): Promise<Summary> { /* parallel API calls */ }
}
```

## Deployment

Push to `main` triggers GitHub Actions, or deploy manually:
```bash
cd apps/worker && npx wrangler deploy src/index.ts
```

## Troubleshooting

### Salesforce "no client credentials user enabled"
-> Configure Run As user in Connected App: Manage -> Edit Policies -> Client Credentials Flow -> Run As

### Salesforce "request not supported on this domain"
-> Use your My Domain URL (e.g., `https://yourorg.my.salesforce.com`) not `login.salesforce.com`

### Microsoft authentication failed / AADSTS7000215 invalid_client
-> The `AZURE_CLIENT_SECRET` must be the **Secret Value** (shown once at creation), NOT the Secret ID. Go to App Registrations → Certificates & secrets → create a new secret if the value is no longer visible.

### Microsoft authentication failed / 401 errors
-> Verify AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET are set correctly. Ensure admin consent was granted for all API permissions in the Azure portal.

### Microsoft Defender for Endpoint returns empty
-> Ensure the app registration has `WindowsDefenderATP Alert.Read.All` permission with admin consent granted. The Defender API uses a separate scope (`api.securitycenter.microsoft.com/.default`).

### Microsoft Cloud Defender recommendations return empty
-> Set `AZURE_SUBSCRIPTION_ID` secret to scope the query to a specific subscription. The provider-level endpoint may return empty without subscription context.

### CrowdStrike 403 errors
-> Check API client scopes in Falcon console. Use the `/api/integrations/crowdstrike/diagnostic` endpoint to see which scopes are accessible. Required scopes: Alerts, Hosts, Incidents, Spotlight, ZTA, NGSIEM, OverWatch, Identity Protection, Discover, Sensor Usage, Intel Actors/Indicators/Reports.

### CrowdStrike Identity Protection returns empty
-> IDP detections are fetched via the alerts API with `product:'idp'` filter (the GraphQL `detections` query type was deprecated). Ensure the "Alerts (Read)" scope is enabled. If still empty, there may be no IDP alerts in the last 30 days.

### CrowdStrike Spotlight returns empty
-> Spotlight API requires a FQL filter — empty filter returns nothing. The client always passes `status:'open'` as minimum. If still empty, ensure the "Vulnerabilities / Spotlight (Read)" scope is enabled.

### CrowdStrike Discover "invalid filter" / "operator not allowed"
-> Discover API FQL filters do not support `id:>'0'`. Use timestamp-based filters (e.g., `last_seen_timestamp:>='...'`). The client already handles this.

### CrowdStrike Sensor Usage 404
-> The `/sensor-usage/combined/weekly/v1` endpoint is not available. Sensor count is derived from the hosts API instead.

### CrowdStrike NGSIEM / OverWatch 404
-> These modules return 404 if LogScale or OverWatch are not provisioned in the CrowdStrike instance. The diagnostic endpoint reports which modules are available. These fail gracefully in `getFullSummary()` (NGSIEM/OverWatch use default empty values).

### curl returns 302 redirect to production
-> All endpoints except /health are behind Cloudflare Zero Trust. Use the dashboard UI or MCP server for authenticated access.

### Microsoft Risky Users / Incidents return empty
-> Ensure the app registration has `IdentityRiskyUser.Read.All` and `SecurityIncident.Read.All` permissions with admin consent granted in the Azure portal.

### Microsoft Defender Machines return empty
-> Ensure the app registration has `WindowsDefenderATP Machine.Read.All` permission with admin consent. Uses the Security Center API scope (`api.securitycenter.microsoft.com/.default`).

### Local dev with `wrangler dev --remote` requires cloudflared
-> Install `cloudflared` via `brew install cloudflared`. The worker is behind Cloudflare Access, so `--remote` needs a tunnel. Alternatively, use `wrangler dev` (local mode) which uses `.dev.vars` secrets and local D1/KV/R2 preview bindings.

### Testing production endpoints via curl
-> Use `cloudflared access token -app="https://security-dashboard-api.rodgersbuilders.workers.dev"` to get a CF Access JWT, then pass it as: `curl -H "cookie: CF_Authorization=$TOKEN" https://security-dashboard-api.rodgersbuilders.workers.dev/api/...`

### Meraki 429 rate limited
-> Meraki allows 10 req/sec per-org, shared across ALL API consumers. The client uses org-level endpoints to minimize calls. If rate-limited, the `Retry-After` header indicates wait time (1–10 min). Cache aggressively — the 5-min KV TTL should keep requests well under budget.

### Meraki 302/307 redirects
-> Meraki routes requests to regional shards via redirects. The client uses `redirect: 'follow'` in fetch. If you see redirect-related errors, ensure the runtime supports automatic redirect following.

### Meraki returns empty device list
-> Ensure `MERAKI_ORG_ID` is set correctly. Use `/api/integrations/meraki/test` to verify connectivity — it lists all organizations the API key can access. The org ID is the numeric string shown in that response.

### Deploy fails with "No project was selected"
-> Run from `apps/worker/` directory: `npx wrangler deploy src/index.ts` (not `pnpm deploy` from root)
