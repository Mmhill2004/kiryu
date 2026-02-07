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
| **CrowdStrike** | ✅ Active | 12 modules: Alerts, Hosts, Incidents, CrowdScore, Spotlight Vulns, ZTA, NGSIEM, OverWatch, Identity Protection, Discover, Sensor Usage, Threat Intel |
| **Salesforce** | ✅ Active | Service desk: MTTR, SLA, backlog aging, agent workload |
| **Microsoft** | ✅ Active | Entra alerts, Defender for Endpoint, Secure Score, Cloud Defender, Device Compliance, Risky Users, Incidents, Machines |
| **Abnormal** | ⚪ Stubbed | Client ready, needs credentials |
| **Zscaler** | ⚪ Stubbed | Client ready, needs credentials |
| **Cloudflare** | ⚪ Stubbed | Access/Gateway logs, needs API token |

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono (API + JSX views)
- **Interactivity**: htmx
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Cloudflare KV (5 min dashboard TTL, 29 min CS OAuth, 118 min SF OAuth, 58 min per-scope MS OAuth)
- **Storage**: Cloudflare R2 (monthly executive reports)
- **Validation**: Zod
- **Auth**: Cloudflare Zero Trust (dashboard), API Key (programmatic)
- **AI Integration**: MCP server with 28 tools

## Common Commands

```bash
# Development (starts on :8787)
pnpm dev

# Deploy to Cloudflare
cd apps/worker && npx wrangler deploy src/index.ts

# Database migrations
wrangler d1 execute security-dashboard-db --file=./packages/db/migrations/0001_initial_schema.sql --remote
wrangler d1 execute security-dashboard-db --file=./packages/db/migrations/0002_salesforce_tickets.sql --remote
wrangler d1 execute security-dashboard-db --file=./packages/db/migrations/0003_metrics_and_retention.sql --remote
wrangler d1 execute security-dashboard-db --file=./packages/db/migrations/0004_expanded_cs_metrics.sql --remote

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
│   │   ├── abnormal/client.ts     # Stubbed
│   │   ├── zscaler/client.ts      # Stubbed
│   │   └── cloudflare/client.ts   # Stubbed
│   ├── services/
│   │   ├── sync.ts           # Background sync + D1 snapshots + 90-day retention
│   │   ├── cache.ts          # KV cache utility with typed get/set/invalidate
│   │   ├── trends.ts         # D1 historical trend queries (period-over-period)
│   │   └── report.ts         # Monthly report generation + R2 storage
│   ├── middleware/           # Auth, error handling
│   └── types/env.ts          # Environment types
├── packages/db/migrations/   # D1 SQL migrations (4 files)
└── mcp-servers/security-dashboard/  # MCP server (28 tools)
```

## Key Files

### CrowdStrike Client (`integrations/crowdstrike/client.ts`)
Full implementation with 12 modules:
- OAuth2 token caching (KV-backed, 29 min TTL)
- `getAlertSummary()` - Alerts by severity, status, MITRE ATT&CK tactics
- `getAlertAggregates()` - Fast server-side alert counts via aggregates API
- `getHostSummary()` - Endpoints by platform, containment status
- `getIncidentSummary()` - Open/closed, lateral movement, MTTR (deprecated March 2026)
- `getCrowdScore()` - CrowdScore threat level (0-100) with trend sparkline
- `getVulnerabilitySummary()` - Spotlight: severity, exploit status, ExPRT ratings, top CVEs
- `getZTASummary()` - Zero Trust Assessment scores
- `getNGSIEMSummary()` - LogScale repositories, saved searches, data ingest
- `getOverWatchSummary()` - Threat hunting detections, escalations, coverage
- `getIdentityDetectionSummary()` - Identity Protection via GraphQL: detections by severity/type, targeted accounts
- `getDiscoverSummary()` - Asset inventory: managed/unmanaged assets, sensor coverage %
- `getSensorUsage()` - Weekly sensor deployment trends
- `getIntelSummary()` - Threat actors, IOC count, recent intel reports
- `runDiagnostic()` - Tests all 15 API scopes, reports availability matrix
- `getFullSummary()` - All 12 modules in parallel via `Promise.allSettled`

### Microsoft Client (`integrations/microsoft/client.ts`)
Full implementation with 8 modules across 3 API surfaces, returning pre-computed analytics (matching CrowdStrike pattern):
- OAuth2 client credentials flow with KV-backed per-scope token caching + in-flight dedup (Graph, Defender, Management)
- `getAlertAnalytics()` - Entra / Graph Security alerts with severity/status/category breakdowns (alerts_v2 API)
- `getSecureScore()` - Microsoft Secure Score (current/max/percentage + industry comparison)
- `getDefenderAnalytics()` - Defender for Endpoint alerts with severity/detection source breakdowns (Security Center API)
- `getAssessmentAnalytics()` - Cloud Defender assessments with pass rate and severity breakdown (Azure Management API)
- `getDeviceCompliance()` - Intune device compliance (compliant/nonCompliant/unknown + compliance rate)
- `getIdentityRisk()` - Entra ID risky users by risk level and state (Graph API)
- `getIncidentAnalytics()` - Microsoft security incidents by severity/status/determination (Graph API, $top=50 limit)
- `getMachineAnalytics()` - Defender machines by risk score, exposure level, health status, and OS (Security Center API)
- `getFullSummary()` - All 8 modules in parallel with error isolation via `Promise.allSettled`
- Helper utilities: `countBy<T>()` for grouping, `sevBucket()` for severity normalization
- Pre-computed analytics types: `AlertAnalytics`, `DefenderAnalytics`, `IdentityRiskSummary`, `IncidentAnalytics`, `MachineAnalytics`, `AssessmentAnalytics`

### Salesforce Client (`integrations/salesforce/client.ts`)
Full implementation with:
- OAuth2 Client Credentials flow (KV-backed, 118 min TTL)
- `getDashboardMetrics()` - All KPIs in one call
- MTTR calculation (overall and by priority)
- SLA compliance tracking
- Backlog aging buckets (<24h, 24-48h, 48-72h, >72h)
- Agent workload distribution
- Week-over-week volume comparison

### Services

- **CacheService** (`services/cache.ts`) - KV wrapper with well-known keys (`cs:summary:{period}`, `sf:metrics:{period}`, `ms:summary:{period}`) and TTL management
- **TrendService** (`services/trends.ts`) - Queries D1 for current vs previous period, returns `TrendData` (changePercent, direction, sparkline)
- **ReportService** (`services/report.ts`) - Generates HTML executive reports from D1 data, stores in R2, with rules-based recommendation engine
- **SyncService** (`services/sync.ts`) - Cron-triggered sync storing daily snapshots to D1, invalidating KV cache, enforcing 90-day data retention

### Dashboard (`views/Dashboard.tsx`)
Displays:
- Security Score (calculated from CS + MS alert severity)
- Platform source labels (CS/SF/MS) on all MetricCards
- **CrowdStrike**: Endpoint Overview, Active Alerts by severity, Alert Status, Host Containment, Incidents, ZTA, NGSIEM, OverWatch
- **Salesforce**: Service Desk Metrics (open tickets, MTTR, SLA, escalation rate), Tickets by Priority, Backlog Aging, Agent Workload
- **Microsoft**: 6 KPI cards (Secure Score, Active Alerts, Risky Users, Open Incidents, Managed Endpoints, Cloud Pass Rate), Entra Alert Breakdown, Defender for Endpoint detail, Identity Risk, Security Incidents, Defender Machines, Cloud Security & Compliance, Recent MS Alerts table, Recent MS Incidents table
- Recent CrowdStrike alerts and Salesforce tickets tables
- Platform status, Cache indicator, Report link

### Report Template (`views/ReportTemplate.tsx`)
Self-contained HTML report with inline CSS:
- Executive Summary, Security Score ring, Threat Landscape
- Incident Response, Endpoint Posture, OverWatch Hunting
- NGSIEM Activity, Service Desk Performance
- Recommendations (rules-based), Platform Health
- MITRE tactic plain-English descriptions

## API Routes

### Public
- `GET /health` - Health check

### Dashboard (Zero Trust protected)
- `GET /` - Dashboard UI (KV-cached, `?refresh=true` to bust cache)
- `GET /api/dashboard/summary` - Security metrics summary
- `GET /api/dashboard/platforms/status` - Platform health
- `GET /api/dashboard/threats/timeline` - Threat timeline
- `GET /api/dashboard/incidents/recent` - Recent incidents
- `GET /api/dashboard/tickets/metrics` - Service desk KPIs
- `GET /api/dashboard/trends` - Historical trends from D1 (`?metric=crowdstrike|salesforce|all&period=7d`)
- `GET /api/dashboard/executive-summary` - Plain-language summary for AI consumption

### CrowdStrike
- `GET /api/integrations/crowdstrike/test` - Test connection + list available modules
- `GET /api/integrations/crowdstrike/diagnostic` - Test all API scopes, report availability matrix
- `GET /api/integrations/crowdstrike/summary` - Full summary (all 12 modules)
- `GET /api/integrations/crowdstrike/crowdscore` - CrowdScore threat level (0-100) with trend
- `GET /api/integrations/crowdstrike/alerts` - Alert summary with MITRE breakdown
- `GET /api/integrations/crowdstrike/alerts/list` - Raw alerts list
- `GET /api/integrations/crowdstrike/alerts/:id` - Single alert by composite ID
- `GET /api/integrations/crowdstrike/hosts` - Host summary
- `GET /api/integrations/crowdstrike/hosts/list` - Raw hosts list
- `GET /api/integrations/crowdstrike/incidents` - Incident summary with MTTR
- `GET /api/integrations/crowdstrike/incidents/list` - Raw incidents list
- `GET /api/integrations/crowdstrike/vulnerabilities` - Spotlight vulnerability summary (aggregates)
- `GET /api/integrations/crowdstrike/vulnerabilities/list` - Raw vulnerability list
- `GET /api/integrations/crowdstrike/identity` - Identity Protection detection summary
- `GET /api/integrations/crowdstrike/identity/detections` - Raw IDP detections
- `GET /api/integrations/crowdstrike/discover` - Asset inventory summary
- `GET /api/integrations/crowdstrike/sensors` - Sensor usage trends
- `GET /api/integrations/crowdstrike/intel` - Threat intelligence summary
- `GET /api/integrations/crowdstrike/intel/actors` - Threat actors list
- `GET /api/integrations/crowdstrike/intel/reports` - Intel reports list
- `GET /api/integrations/crowdstrike/ngsiem` - NGSIEM/LogScale summary
- `GET /api/integrations/crowdstrike/overwatch` - OverWatch threat hunting summary
- `GET /api/integrations/crowdstrike/zta` - Zero Trust Assessment summary
- `GET /api/integrations/crowdstrike/zta/list` - Raw ZTA scores

### Microsoft
- `GET /api/integrations/microsoft/test` - Test connection
- `GET /api/integrations/microsoft/summary` - Full summary (all 8 modules, pre-computed analytics)
- `GET /api/integrations/microsoft/alerts` - Entra security alert analytics
- `GET /api/integrations/microsoft/defender/alerts` - Defender for Endpoint analytics
- `GET /api/integrations/microsoft/secure-score` - Microsoft Secure Score
- `GET /api/integrations/microsoft/recommendations` - Cloud Defender assessment analytics
- `GET /api/integrations/microsoft/compliance` - Device compliance

### Salesforce
- `GET /api/integrations/salesforce/test` - Test connection
- `GET /api/integrations/salesforce/metrics` - All KPIs
- `GET /api/integrations/salesforce/tickets` - Recent tickets
- `GET /api/integrations/salesforce/open` - Open tickets with aging
- `GET /api/integrations/salesforce/mttr` - MTTR breakdown
- `GET /api/integrations/salesforce/workload` - Agent workload

### Reports
- `GET /api/reports` - List available reports
- `GET /api/reports/latest` - Serve latest report HTML
- `GET /api/reports/:yearMonth` - Serve specific report (e.g., `/api/reports/2026-01`)
- `POST /api/reports/generate` - Generate report (`{ year, month }`)

### Sync (API key required)
- `POST /api/v1/sync/all` - Sync all platforms
- `POST /api/v1/sync/:platform` - Sync specific platform
- `GET /api/v1/sync/status` - Platform sync status
- `GET /api/v1/sync/history` - Sync log history

## MCP Server

Located at `mcp-servers/security-dashboard/`. Proxies to the worker API with API key auth. 28 tools:

| Tool | Description |
|------|-------------|
| `get_security_summary` | High-level security posture with scores |
| `search_incidents` | Search incidents with severity/source filters |
| `get_threat_trends` | Threat timeline analysis |
| `get_platform_status` | Health/sync status of all platforms |
| `get_ticket_metrics` | Salesforce service desk KPIs |
| `trigger_sync` | Manual data sync (one or all platforms) |
| `get_crowdstrike_detections` | Endpoint alert details (alerts/list) |
| `get_email_threats` | Abnormal email threats |
| `get_microsoft_secure_score` | Microsoft 365/Azure secure score |
| `get_microsoft_summary` | Full Microsoft security summary (all 8 modules, pre-computed analytics) |
| `get_microsoft_alerts` | Entra / Graph Security alerts |
| `get_microsoft_defender_alerts` | Defender for Endpoint alerts |
| `get_microsoft_compliance` | Intune device compliance status |
| `get_microsoft_recommendations` | Cloud Defender security assessments |
| `get_ngsiem_summary` | CrowdStrike LogScale metrics |
| `get_overwatch_summary` | OverWatch threat hunting data |
| `get_historical_trends` | D1 trend data with period comparisons |
| `generate_security_report` | Trigger monthly R2 report generation |
| `list_reports` | List available R2 reports |
| `get_executive_summary` | Plain-language security narrative |
| `investigate_alert` | Deep dive into a specific CrowdStrike alert |
| `get_crowdscore` | CrowdScore threat level (0-100) with trend |
| `get_vulnerability_summary` | Spotlight vulnerability counts, exploit status, top CVEs |
| `get_identity_detections` | Identity Protection detections by severity/type |
| `get_discover_summary` | Asset discovery: managed/unmanaged, sensor coverage % |
| `get_sensor_usage` | Weekly sensor deployment trends |
| `get_intel_summary` | Threat actors, IOC count, recent intel reports |
| `get_crowdstrike_diagnostic` | Test all CrowdStrike API scopes, report availability |

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
ZSCALER_API_KEY
ZSCALER_API_SECRET
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

## Key Patterns

### KV Cache-First Loading
```typescript
// Dashboard loads from KV cache, falls back to live API
const cached = await cacheService.get<DashboardData>(CACHE_KEYS.CS_SUMMARY(period));
if (cached && !refresh) return c.html(<Dashboard data={{ ...cached, dataSource: 'cache' }} />);
// Otherwise fetch live, then cache for 5 min
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
-> Ensure the API client has both "Identity Protection Entities (Read)" and "Identity Protection GraphQL (Write)" scopes enabled. The GraphQL Write scope is required for all IDP queries.

### CrowdStrike Spotlight returns empty
-> Spotlight API requires a FQL filter — empty filter returns nothing. The client always passes `status:'open'` as minimum. If still empty, ensure the "Vulnerabilities / Spotlight (Read)" scope is enabled.

### curl returns 302 redirect to production
-> All endpoints except /health are behind Cloudflare Zero Trust. Use the dashboard UI or MCP server for authenticated access.

### Microsoft Risky Users / Incidents return empty
-> Ensure the app registration has `IdentityRiskyUser.Read.All` and `SecurityIncident.Read.All` permissions with admin consent granted in the Azure portal.

### Microsoft Defender Machines return empty
-> Ensure the app registration has `WindowsDefenderATP Machine.Read.All` permission with admin consent. Uses the Security Center API scope (`api.securitycenter.microsoft.com/.default`).

### Deploy fails with "No project was selected"
-> Run from `apps/worker/` directory: `npx wrangler deploy src/index.ts` (not `pnpm deploy` from root)
