# Kiryu Security Dashboard

A unified security operations dashboard built on Cloudflare Workers that aggregates data from multiple security tools to provide leadership with clear visibility into your organization's security posture.

**Live Dashboard**: https://security-dashboard-api.rodgersbuilders.workers.dev

## Integrated Platforms

| Platform | Status | Data Collected |
|----------|--------|----------------|
| **CrowdStrike Falcon** | Active | Alerts, Hosts, Incidents, CrowdScore, Spotlight Vulns, ZTA, Identity Protection, Discover, Sensor Usage, Intel |
| **Salesforce Service Cloud** | Active | Security tickets, MTTR, SLA compliance, backlog aging, agent workload |
| **Microsoft Security** | Active | Entra Alerts, Defender for Endpoint, Secure Score, Cloud Defender, Device Compliance, Risky Users, Incidents, Machines |
| **Abnormal Security** | Stubbed | Email threats, phishing attempts (client ready, needs credentials) |
| **Zscaler** | Stubbed | Web security events, blocked categories (client ready, needs credentials) |
| **Cloudflare** | Stubbed | Access logs, Gateway events (client ready, needs API token) |

## Architecture

Single Cloudflare Worker serving both the HTML dashboard and REST API:

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
  │(SQLite)│    │(Reports)│     │(Cache)│
  └───────┘     └─────────┘     └───────┘
```

**Tech Stack**:
- **Runtime**: Cloudflare Workers
- **Framework**: Hono (API + JSX server-rendered views)
- **Interactivity**: htmx
- **Database**: Cloudflare D1 (SQLite) — historical trends + daily snapshots
- **Cache**: Cloudflare KV — dashboard data (5 min TTL), OAuth tokens (per-provider TTLs)
- **Storage**: Cloudflare R2 — monthly executive HTML reports
- **Auth**: Cloudflare Zero Trust (dashboard), API Key (programmatic)
- **AI Integration**: MCP server with 28 tools for Claude Desktop

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account

### Installation

```bash
git clone https://github.com/Mmhill2004/kiryu.git
cd kiryu
pnpm install
wrangler login
pnpm dev
```

### Deploy

```bash
cd apps/worker && npx wrangler deploy src/index.ts
```

### Configure Secrets

```bash
# CrowdStrike
wrangler secret put CROWDSTRIKE_CLIENT_ID --name security-dashboard-api
wrangler secret put CROWDSTRIKE_CLIENT_SECRET --name security-dashboard-api

# Salesforce
wrangler secret put SALESFORCE_INSTANCE_URL --name security-dashboard-api
wrangler secret put SALESFORCE_CLIENT_ID --name security-dashboard-api
wrangler secret put SALESFORCE_CLIENT_SECRET --name security-dashboard-api

# Microsoft / Azure
wrangler secret put AZURE_TENANT_ID --name security-dashboard-api
wrangler secret put AZURE_CLIENT_ID --name security-dashboard-api
wrangler secret put AZURE_CLIENT_SECRET --name security-dashboard-api

# Dashboard API (for programmatic / MCP access)
wrangler secret put DASHBOARD_API_KEY --name security-dashboard-api
```

## Dashboard Features

### Security Overview
- **Security Score** — Calculated from CrowdStrike + Microsoft alert severity weights
- **Platform source labels** (CS/SF/MS) on all metric cards
- **Cache indicator** — Shows whether data is live or cached, with age

### CrowdStrike
- Endpoint Overview (total, online, contained, stale)
- Active Alerts by severity with MITRE ATT&CK tactics/techniques
- CrowdScore threat level (0-100) with trend sparkline
- Identity Protection detections by severity and type
- Asset Discovery (managed/unmanaged, sensor coverage %)
- Threat Intelligence (actors, IOCs, intel reports)
- Incidents (open/closed, lateral movement, MTTR)
- Spotlight Vulnerabilities (severity, exploit status, top CVEs)
- Zero Trust Assessment scores
- Endpoints by platform (Windows, macOS, Linux)

### Microsoft Security
- Secure Score (current/max/percentage + industry comparison)
- Entra / Graph Security alerts with category breakdowns
- Defender for Endpoint alerts with detection source breakdowns
- Identity Risk (risky users by risk level and state)
- Security Incidents by severity/status/determination
- Defender Machines (risk score, exposure level, health, OS)
- Cloud Security & Compliance (assessment pass rate, device compliance)

### Salesforce Service Desk
- Open Tickets with backlog aging (<24h, 24-48h, 48-72h, >72h)
- MTTR (overall and by priority)
- SLA Compliance (4-hour target)
- Escalation Rate
- Agent Workload distribution
- Week-over-week volume comparison

### Reports
- Monthly executive HTML reports (auto-generated on 1st of each month)
- Security Score ring, Threat Landscape, Incident Response
- Endpoint Posture, Service Desk Performance
- Rules-based recommendations, Platform Health

## API Endpoints

### Dashboard (Zero Trust protected)
- `GET /` — Dashboard UI (`?period=7d`, `?refresh=true`)
- `GET /api/dashboard/summary` — Security metrics summary
- `GET /api/dashboard/platforms/status` — Platform health
- `GET /api/dashboard/trends` — Historical trends from D1
- `GET /api/dashboard/executive-summary` — Plain-language summary

### CrowdStrike
- `GET /api/integrations/crowdstrike/summary` — Full summary (12 modules)
- `GET /api/integrations/crowdstrike/diagnostic` — API scope availability matrix
- `GET /api/integrations/crowdstrike/alerts` — Alert summary with MITRE
- `GET /api/integrations/crowdstrike/hosts` — Host summary
- `GET /api/integrations/crowdstrike/crowdscore` — CrowdScore (0-100)
- `GET /api/integrations/crowdstrike/vulnerabilities` — Spotlight summary
- `GET /api/integrations/crowdstrike/identity` — Identity Protection
- `GET /api/integrations/crowdstrike/discover` — Asset inventory
- `GET /api/integrations/crowdstrike/sensors` — Sensor usage
- `GET /api/integrations/crowdstrike/intel` — Threat intelligence
- `GET /api/integrations/crowdstrike/incidents` — Incident summary
- `GET /api/integrations/crowdstrike/zta` — Zero Trust Assessment

### Microsoft
- `GET /api/integrations/microsoft/summary` — Full summary (8 modules)
- `GET /api/integrations/microsoft/alerts` — Entra security alerts
- `GET /api/integrations/microsoft/defender/alerts` — Defender analytics
- `GET /api/integrations/microsoft/secure-score` — Secure Score
- `GET /api/integrations/microsoft/recommendations` — Cloud Defender assessments
- `GET /api/integrations/microsoft/compliance` — Device compliance

### Salesforce
- `GET /api/integrations/salesforce/metrics` — All KPIs
- `GET /api/integrations/salesforce/tickets` — Recent tickets
- `GET /api/integrations/salesforce/open` — Open tickets with aging
- `GET /api/integrations/salesforce/mttr` — MTTR breakdown
- `GET /api/integrations/salesforce/workload` — Agent workload

### Reports
- `GET /api/reports` — List available reports
- `GET /api/reports/latest` — Latest report HTML
- `GET /api/reports/:yearMonth` — Specific report (e.g., `/api/reports/2026-01`)
- `POST /api/reports/generate` — Generate report (`{ year, month }`)

### Sync (API key required)
- `POST /api/v1/sync/all` — Sync all platforms
- `POST /api/v1/sync/:platform` — Sync specific platform
- `GET /api/v1/sync/status` — Platform sync status

## Project Structure

```
kiryu/
├── apps/worker/           # Cloudflare Worker
│   ├── src/
│   │   ├── index.ts       # App entry, routes, cron handler
│   │   ├── views/         # JSX components (Dashboard, Layout, ReportTemplate)
│   │   ├── routes/        # API routes + integration routes
│   │   ├── integrations/  # Platform API clients (CS, SF, MS, + stubs)
│   │   ├── services/      # Sync, Cache, Trends, Report services
│   │   ├── middleware/     # Auth (API key + HMAC), error handling
│   │   └── types/         # Environment types
│   └── wrangler.toml      # Worker config
├── packages/db/           # D1 SQL migrations (4 files)
├── mcp-servers/           # MCP server (28 tools) for Claude Desktop
├── CLAUDE.md              # AI assistant guidance
└── ROADMAP.md             # Project roadmap
```

## MCP Server

The MCP server (`mcp-servers/security-dashboard/`) provides 28 tools for Claude Desktop to query security data, trigger syncs, generate reports, and investigate alerts. See [mcp-servers/README.md](./mcp-servers/README.md) for setup.

## Documentation

- [CLAUDE.md](./CLAUDE.md) — Comprehensive AI assistant guidance (architecture, patterns, troubleshooting)
- [ROADMAP.md](./ROADMAP.md) — Project roadmap
- [mcp-servers/README.md](./mcp-servers/README.md) — MCP server setup and tools

## License

MIT License
