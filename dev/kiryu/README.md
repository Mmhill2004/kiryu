# Kiryu Security Dashboard

A unified security operations dashboard built on Cloudflare Workers that aggregates data from multiple security tools to provide leadership with clear visibility into your organization's security posture.

**Live Dashboard**: https://security-dashboard-api.rodgersbuilders.workers.dev

## Integrated Platforms

| Platform | Status | Data Collected |
|----------|--------|----------------|
| **CrowdStrike Falcon** | ✅ Active | Alerts, hosts, incidents, vulnerabilities, ZTA scores |
| **Salesforce Service Cloud** | ✅ Active | Security tickets, MTTR, SLA compliance, agent workload |
| **Abnormal Security** | ⚪ Ready | Email threats, phishing attempts |
| **Zscaler** | ⚪ Ready | Web security events, blocked categories |
| **Microsoft Defender** | ⚪ Ready | Security alerts, Secure Score, compliance |
| **Cloudflare** | ⚪ Ready | Access logs, Gateway events |

## Architecture

Single Cloudflare Worker serving both the HTML dashboard and REST API:

```
┌─────────────────────────────────────────────────┐
│    Cloudflare Worker (Hono + JSX)               │
│    • HTML Dashboard (/)                         │
│    • REST API (/api/*)                          │
│    • Scheduled Sync (cron every 15 min)         │
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
- Hono (API framework + JSX views)
- htmx (frontend interactivity)
- Cloudflare D1, R2, KV
- Cloudflare Zero Trust (authentication)

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account

### Installation

```bash
# Clone the repository
git clone https://github.com/Mmhill2004/kiryu.git
cd kiryu

# Install dependencies
pnpm install

# Login to Cloudflare
wrangler login

# Start development server
pnpm dev
```

### Deploy

```bash
cd apps/worker
pnpm deploy
```

### Configure Secrets

```bash
# CrowdStrike (required for endpoint data)
wrangler secret put CROWDSTRIKE_CLIENT_ID --name security-dashboard-api
wrangler secret put CROWDSTRIKE_CLIENT_SECRET --name security-dashboard-api

# Salesforce (required for ticket data)
wrangler secret put SALESFORCE_INSTANCE_URL --name security-dashboard-api
wrangler secret put SALESFORCE_CLIENT_ID --name security-dashboard-api
wrangler secret put SALESFORCE_CLIENT_SECRET --name security-dashboard-api
```

## Dashboard Features

### Security Overview
- **Security Score** - Calculated from alert severity weights
- **Endpoint Overview** - Total, online, contained, stale endpoints
- **Active Alerts** - By severity (Critical, High, Medium, Low)

### Service Desk Metrics
- **Open Tickets** - Current backlog
- **MTTR** - Mean Time to Resolution (overall and by priority)
- **SLA Compliance** - Percentage meeting 4-hour target
- **Escalation Rate** - Percentage of escalated tickets
- **Backlog Aging** - Tickets by age bucket (<24h, 24-48h, 48-72h, >72h)
- **Agent Workload** - Open tickets per agent

### CrowdStrike Details
- Incidents (open, closed, lateral movement)
- Vulnerabilities (Spotlight)
- Zero Trust Assessment scores
- MITRE ATT&CK tactics breakdown
- Endpoints by platform (Windows, macOS, Linux)

### Platform Status
- Real-time health status for all integrations
- Last sync timestamp

## API Endpoints

### Dashboard
- `GET /` - HTML dashboard
- `GET /api/dashboard/summary` - Executive summary JSON

### CrowdStrike
- `GET /api/integrations/crowdstrike/summary` - Full summary
- `GET /api/integrations/crowdstrike/alerts` - Alert details
- `GET /api/integrations/crowdstrike/hosts` - Host inventory

### Salesforce
- `GET /api/integrations/salesforce/test` - Test connection
- `GET /api/integrations/salesforce/metrics` - All KPIs
- `GET /api/integrations/salesforce/tickets` - Recent tickets
- `GET /api/integrations/salesforce/open` - Open tickets with aging
- `GET /api/integrations/salesforce/mttr` - MTTR breakdown
- `GET /api/integrations/salesforce/workload` - Agent workload

## Project Structure

```
kiryu/
├── apps/worker/           # Cloudflare Worker
│   ├── src/
│   │   ├── index.ts       # App entry point
│   │   ├── views/         # JSX components
│   │   ├── routes/        # API routes
│   │   ├── integrations/  # Platform API clients
│   │   └── services/      # Sync service
│   └── wrangler.toml      # Worker config
├── packages/db/           # Database migrations
└── mcp-servers/           # Claude MCP integration
```

## Documentation

- [CLAUDE.md](./CLAUDE.md) - AI assistant guidance
- [ROADMAP.md](./ROADMAP.md) - Project roadmap

## License

MIT License
