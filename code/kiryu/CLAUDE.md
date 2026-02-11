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
| **Zscaler** | ✅ Active | ZIA, ZPA, ZDX, Z-Insights (ZINS GraphQL: web traffic, cyber security, shadow IT). Risk360 manual only (no API). OneAPI via ZIdentity OAuth2. |
| **Cloudflare** | ✅ Active | Access logs, Gateway logs, Security events, Access apps. Bearer token auth. |

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono (API + JSX views)
- **Interactivity**: htmx
- **Typography**: Outfit (UI) + JetBrains Mono (data values)
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Cloudflare KV (5 min dashboard TTL, 29 min CS OAuth, 118 min SF OAuth, 58 min per-scope MS OAuth)
- **Storage**: Cloudflare R2 (monthly executive reports)
- **Validation**: Zod
- **Auth**: Cloudflare Zero Trust (dashboard), API Key (programmatic)
- **AI Integration**: MCP server with 53 tools

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
wrangler d1 execute security-dashboard-db --file=./packages/db/migrations/0008_zscaler_analytics_extended.sql --remote

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
│   │   └── components/       # MetricCard, GaugeChart, DonutChart, SecurityScore, ThreatChart
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
├── packages/db/migrations/   # D1 SQL migrations (8 files)
└── mcp-servers/security-dashboard/  # MCP server (53 tools)
```

## Key Files

### Integration Clients (`integrations/*/client.ts`)
All follow the same pattern: `isConfigured()` → OAuth with KV caching → `getFullSummary()` via `Promise.allSettled`. All clients have AbortController timeouts (10s OAuth, 20s data). All route handlers check `isConfigured()` before calling client methods.

- **CrowdStrike** — 12 modules (Alerts, Hosts, Incidents, CrowdScore, Spotlight, ZTA, IDP, Discover, Sensors, Intel, NGSIEM, OverWatch). OAuth KV-backed (29 min TTL). Constructor takes optional `KVNamespace` cache param. IDP uses alerts API with `product:'idp'` filter. Discover uses timestamp-based FQL. Sensors derived from hosts API.
- **Microsoft** — 8 modules across 3 API scopes (Graph, Defender/SecurityCenter, Azure Management). Per-scope OAuth with in-flight dedup. Returns pre-computed analytics (severity/status breakdowns). Constructor takes only `Env` (manages its own KV caching internally). Note: Identity, Incidents, and Machines only accessible via `/summary` (no dedicated routes yet).
- **Salesforce** — SOQL-based. OAuth KV-backed (118 min TTL). Constructor takes optional `KVNamespace` cache param. `getDashboardMetrics()` returns all KPIs in one call.
- **Meraki** — Static API key auth (no OAuth, no token caching). Constructor takes `Env`. Must follow redirects (`redirect: 'follow'`) — Meraki 302s to region shards. Rate limit: 10 req/sec per-org shared across all API consumers. `getSummary()` aggregates device overview, statuses, networks, VPN, uplinks, and licensing.
- **Zscaler** — 6-file multi-client architecture: `client.ts` (orchestrator), `auth.ts` (OneAPI + legacy auth), `zia-client.ts`, `zpa-client.ts`, `zdx-client.ts`, `analytics-client.ts`. Supports both OneAPI (new) and legacy per-module credentials with fallback logic. Risk360 scores stored manually in KV (no API available). `getFullSummary()` returns ZIA, ZPA, ZDX, Analytics (ZINS), Risk360 data.
  - **ZDX** (`zdx-client.ts`) — Digital Experience monitoring. All endpoints use `since` param (hours, default 2). Does NOT support `limit`/`offset` — pagination is cursor-based via `next_offset` in responses. Methods: `getApps()` (scores, regions, users), `getDeviceCount()` (enrolled devices), `getAlerts()` (active alert rules). `getSummary()` calls all three in parallel via `Promise.allSettled`.
  - **Analytics (ZINS)** — Uses Z-Insights GraphQL API at `/zins/graphql`. Root fields are UPPERCASE (`WEB_TRAFFIC`, `CYBER_SECURITY`, `SHADOW_IT`). Times are epoch milliseconds (not ISO). 3 domains queried in parallel: web traffic (transactions, locations, protocols, threat classes), cyber security incidents (7/14-day intervals only, end_time must be 1+ day before now), shadow IT (app discovery with risk scores). IOT domain returns 403 (not provisioned). FIREWALL and SAAS_SECURITY not available. Introspection is disabled by Zscaler. D1 stores daily aggregates (traffic totals, incident count, shadow IT total/high-risk, threat category count) plus top-5 JSON snapshots (protocols, locations, threats, incidents, riskiest shadow IT apps) for trend tracking.
  - **Risk360 / ZRA** — No public API exists (as of Feb 2026). The `RISK_SCORE` type exists in the ZINS GraphQL schema but is not exposed as a queryable root field (confirmed by Zscaler SDK PR #443). REST paths under `/zra/` and `/risk360/` on the OneAPI gateway return 401 — no service is registered. Risk360 scores must be entered manually via `POST /api/integrations/zscaler/risk360` and are stored in KV. Monitor the ZIdentity admin portal (API Resources) and Zscaler SDK releases for future API availability.
- **Abnormal** — Bearer token auth (`ABNORMAL_API_TOKEN`). Has `isConfigured()`. 20s AbortController timeout on all requests. Methods: `getThreats()`, `getThreatDetails()`, `getCases()`, `getStats()`.
- **Cloudflare** — Bearer token auth (`CLOUDFLARE_API_TOKEN`). Has `isConfigured()`. 20s AbortController timeout on all requests. `getGatewayLogs()` uses GraphQL variables (not string interpolation) to prevent injection. Methods: `getAccessLogs()`, `getGatewayLogs()`, `getSecurityEvents()`, `getAccessApps()`, `getStats()`.

### Services
- **CacheService** (`services/cache.ts`) — KV wrapper. Keys follow `{prefix}:{period}` pattern (e.g. `cs:summary:7d`). `invalidatePrefix()` paginates via cursor.
- **SyncService** (`services/sync.ts`) — Cron-triggered: fetches all platforms → stores daily snapshots in D1 → invalidates KV (errors logged). Zscaler sync stores extended ZINS analytics: aggregate counts (shadow IT total/high-risk, threat categories) + top-5 JSON snapshots (protocols, locations, threats, incidents, shadow IT apps). 90-day retention with batched deletes (MAX_BATCHES=200 safety limit per table).
- **TrendService** (`services/trends.ts`) — Queries D1 for current vs previous period, returns `TrendData` (changePercent, direction, sparkline). `ZscalerTrends` includes 12 fields: ZPA health, ZIA rules, ZDX scores, Risk360, and ZINS analytics (traffic, incidents, shadow IT, threat categories). Uses `Record<string, unknown>` for D1 rows (no `any`).
- **ReportService** (`services/report.ts`) — Generates self-contained HTML reports from D1 data, stores in R2. Rules-based recommendation engine. Live API fallback has 25s timeout.

### Views
- **Dashboard.tsx** — Main dashboard with 9 tabs: Executive, CrowdStrike, Microsoft, Salesforce, ZIA, ZPA, ZDX, ZINS, Meraki. Executive tab is the default active tab.
  - **Top KPI strip** — 5 actionable metrics (Critical Alerts, Open Incidents, Risky Users, Open Cases, SLA). Informational metrics (Secure Score, Endpoints, ZDX Score) live in platform tabs, not the top bar.
  - **Platform status row** — Horizontal badges below KPI strip showing connected platforms with health dots (green/red/gray).
  - **Executive tab** — CEO-friendly cross-platform overview: 3 headline gauges (Security Score, Compliance, Network Uptime), 5 health indicator gauges (Asset Health, Threat Posture, Compliance Posture, Connectivity, Service Delivery) aggregating metrics across CS/MS/SF/ZS/MK, 6 platform summary cards, and auto-generated action items from threshold checks.
  - **ZINS tab** — Dedicated Z-Insights analytics with D1-backed trend indicators on key metrics (Total Transactions, Cyber Incidents, Shadow IT Apps, Threat Categories). DonutCharts for protocols/threat categories/incidents, horizontal bar charts for traffic by location, Shadow IT table with risk bars and formatBytes() data columns.
  - **Helper functions**: `formatCompact(n)` (1.2M, 3.4B), `formatBytes(bytes)` (1.0 MB), `calculateHealthIndicators()` (5 composite scores from cross-platform data), `calculateCompositeScore()` (weighted security score from CS + MS).
- **DonutChart** (`components/DonutChart.tsx`) — Shared donut chart component with built-in `compact()` formatter for center totals and legend values (K/M/B suffixes for large numbers).
- **ReportTemplate.tsx** — Self-contained HTML monthly report with inline CSS and `escapeHtml()` for raw string output.
- **Layout.tsx** — Base HTML shell with all CSS. Uses Outfit (sans) + JetBrains Mono (data values) fonts. Includes executive-specific styles (`.exec-headline` 3-col, `.exec-health-grid`, `.exec-summary-grid`), horizontal bar chart (`.hbar-*`), health indicator cards (`.exec-health-card`), platform status row (`.platform-status-row`), and `.sr-only` utility. Tab JS manages `aria-selected` state.

## API Routes

Route files: `routes/ui.tsx`, `routes/dashboard.ts`, `routes/reports.ts`, `routes/health.ts`, `routes/sync.ts`, `routes/integrations/*.ts`

- `GET /` — Dashboard UI (KV-cached, `?period=7d`, `?refresh=true`)
- `GET /health` — Health check (public, not behind Zero Trust)
- `GET /api/dashboard/{summary,platforms/status,trends,threats/timeline,incidents/recent,tickets/metrics,executive-summary}` — Dashboard data APIs
- `GET /api/integrations/crowdstrike/{summary,alerts,hosts,incidents,vulnerabilities,identity,discover,sensors,intel,crowdscore,zta,ngsiem,overwatch,diagnostic}` — CrowdStrike (each has `/list` variant for raw data)
- `GET /api/integrations/microsoft/{summary,alerts,defender/alerts,secure-score,recommendations,compliance}` — Microsoft (identity/incidents/machines only via `/summary`)
- `GET /api/integrations/salesforce/{metrics,tickets,open,mttr,workload}` — Salesforce
- `GET /api/integrations/meraki/{test,summary,devices,networks,vpn,uplinks}` — Meraki
- `GET /api/integrations/zscaler/{test,summary,zia,zpa,zpa/connectors,zdx,zdx/apps,zdx/alerts,analytics,analytics/schema,risk360,diagnostic}` — Zscaler (`POST risk360` to set scores, `POST analytics/query` for raw ZINS GraphQL)
- `GET /api/integrations/abnormal/{threats,stats,cases}` — Abnormal
- `GET /api/integrations/cloudflare/{access/logs,gateway/logs,security/events,stats,access/apps}` — Cloudflare
- `GET /api/reports`, `GET /api/reports/latest`, `GET /api/reports/:yearMonth`, `POST /api/reports/generate` — Reports
- `POST /api/v1/sync/{all,:platform}`, `GET /api/v1/sync/{status,history}` — Sync (API key required)

## MCP Server

Located at `mcp-servers/security-dashboard/`. Proxies to the worker API with API key auth. 53 tools covering all platforms: Dashboard/Reports (7), CrowdStrike (12), Microsoft (6), Zscaler (9, including connectors and raw GraphQL query), Meraki (5), Cloudflare (5), Salesforce (4), Abnormal (3), Reports (2). See [mcp-servers/README.md](./mcp-servers/README.md) for the full tool list and setup instructions.

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
- `zscaler_metrics_daily` - Daily Zscaler snapshots (ZIA, ZPA, ZDX, Analytics with ZINS breakdowns, Risk360)
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
- D1 query results: use `.all<Record<string, unknown>>()` — never `any`. Cast fields explicitly (e.g., `r.date as string`, `typeof val === 'number' ? val : 0`)
- Null checks: use strict `=== null` (not falsy `!value`) when checking for missing API sub-module data — avoids treating `0` or `""` as missing

## Performance & Stability

### Fetch Timeouts
All external API calls have AbortController timeouts:
- OAuth token fetches: 10s timeout
- Data API requests: 20s timeout
- Dashboard platform fetches: 25s timeout (in `ui.tsx`)

### OAuth In-Flight Dedup
All three OAuth clients (CS, SF, MS) deduplicate concurrent auth requests via `pendingAuth` promise tracking — prevents thundering herd on token expiry.

### Batched Database Operations
Sync service uses `DB.batch()` for all bulk inserts instead of sequential statements. Data retention cleanup runs batched DELETEs with `LIMIT 500` and a `MAX_BATCHES=200` safety cap (100k rows max per table per run) to avoid locking or runaway loops.

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

### Route Handler Pattern
All integration routes check `isConfigured()` before proceeding. Error responses use generic messages (never leak raw `error.message` to clients — log details server-side with `console.error`).
```typescript
const client = new PlatformClient(c.env);
if (!client.isConfigured()) {
  return c.json({ configured: false, error: 'Platform not configured' }, 503);
}
```

## Security

- **Never return raw error messages** to API clients — use generic messages and `console.error` the details server-side
- **GraphQL queries must use variables** (not string interpolation) to prevent injection — see Cloudflare `getGatewayLogs()` as the reference pattern
- **All fetch calls require AbortController timeouts** — 10s for OAuth, 20s for data, 25s for dashboard/report fallbacks
- **Sync cleanup loops must have a max iteration cap** — use `MAX_BATCHES` constant to prevent runaway deletes

## Accessibility

Dashboard uses ARIA attributes for screen reader support:
- Tab navigation: `role="tablist"` on container, `role="tab"` with `aria-selected` and `aria-controls` on buttons, `role="tabpanel"` with `aria-label` on content panels
- Tab JS in Layout.tsx toggles `aria-selected` when switching tabs
- Decorative SVGs use `aria-hidden="true"`
- Interactive elements (refresh button, report link, period select) have `aria-label`
- Dashboard wrapper uses `<main>` landmark
- `.sr-only` utility class available in Layout.tsx for screen-reader-only text

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

### Zscaler ZIA/ZPA/ZDX return 401 "unauthorized" through OneAPI
-> The API client in ZIdentity must have ZIA, ZPA, and ZDX scopes explicitly assigned. Token fetch succeeding does not mean the token has access to all services. After updating permissions in ZIdentity, flush the cached token: `npx wrangler kv key delete "zscaler:oneapi:token" --namespace-id=445b6afd3f1044bb9b84c22e32db3f5c --remote`

### Zscaler ZDX /devices or /alerts returns 400 Bad Request
-> The ZDX API does NOT accept `limit` or `offset` query parameters — it uses cursor-based pagination via `next_offset` in the response. Only pass `since` (hours, e.g. `?since=2`). The `/apps`, `/devices`, and `/alerts` endpoints all use the same `since` parameter format.

### Zscaler ZINS Analytics returns no data
-> The ZINS GraphQL API uses UPPERCASE root fields (`WEB_TRAFFIC`, `CYBER_SECURITY`, `SHADOW_IT`) and epoch millisecond timestamps. CYBER_SECURITY requires exactly 7 or 14-day intervals with end_time at least 1 day before now. IOT returns 403 if not provisioned. FIREWALL is not in the schema. Use `POST /api/integrations/zscaler/analytics/query` to test raw GraphQL queries. Introspection is disabled by Zscaler.

### Zscaler Risk360 / ZRA returns "Permission Denied" or 401
-> Risk360 does not have a public API (as of Feb 2026). The ZINS `RISK_SCORE` GraphQL type exists but is not queryable — the Zscaler SDK team confirmed it was "incorrectly created for GraphQL types not exposed in the root Query" (PR #443). REST paths `/zra/` and `/risk360/` are not registered on the OneAPI gateway. Use the manual KV approach: `POST /api/integrations/zscaler/risk360` to set scores.

### Zscaler ZIA/ZPA/ZINS suddenly return 401 after working previously
-> The cached OneAPI token in KV may have been invalidated server-side (Zscaler token rotation, maintenance). Flush it: `npx wrangler kv key delete "zscaler:oneapi:token" --namespace-id=445b6afd3f1044bb9b84c22e32db3f5c --remote`. Use `/api/integrations/zscaler/diagnostic` to verify — the `apiProbe` section tests actual ZIA/ZPA API calls (not just token fetch). If flushing fixes it, the issue was a stale cached token.

### Zscaler cached token doesn't reflect new permissions
-> OneAPI tokens are cached in KV for 55 minutes (`zscaler:oneapi:token`). After changing API client scopes in ZIdentity, flush the cached token: `npx wrangler kv key delete "zscaler:oneapi:token" --namespace-id=445b6afd3f1044bb9b84c22e32db3f5c --remote`

### Deploy fails with "No project was selected"
-> Run from `apps/worker/` directory: `npx wrangler deploy src/index.ts` (not `pnpm deploy` from root)
