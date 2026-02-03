# Security Dashboard

A unified security operations dashboard built on Cloudflare's edge platform that aggregates data from multiple security tools to provide leadership with clear visibility into your organization's security posture.

## 🛡️ Integrated Platforms

- **CrowdStrike Falcon** - Endpoint detection and response
- **Abnormal Security** - Email security and account protection
- **Zscaler** - Cloud security and web gateway
- **Microsoft Defender** - Endpoint and cloud security
- **Azure Defender** - Cloud workload protection
- **Salesforce Service Cloud** - Security ticket management

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│              Security Dashboard (Frontend)                │
│                  Cloudflare Pages                         │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│               Hono API (Cloudflare Worker)                │
│  • REST API  • Cron Triggers  • Data Aggregation          │
└────────────────────────┬─────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌─────────┐    ┌───────────┐    ┌─────────┐
    │   D1    │    │    R2     │    │   KV    │
    │ (Data)  │    │ (Reports) │    │ (Cache) │
    └─────────┘    └───────────┘    └─────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account (Workers Paid plan recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/security-dashboard.git
cd security-dashboard

# Install dependencies
pnpm install

# Login to Cloudflare
wrangler login

# Set up local environment
cp .env.example .env.local

# Create D1 database
wrangler d1 create security-dashboard-db

# Run database migrations
pnpm run db:migrate

# Start development server
pnpm dev
```

### Cloudflare Resources Setup

```bash
# Create D1 Database
wrangler d1 create security-dashboard-db

# Create R2 Bucket
wrangler r2 bucket create security-reports

# Create KV Namespace
wrangler kv:namespace create SECURITY_CACHE

# Add secrets (repeat for each credential)
wrangler secret put CROWDSTRIKE_CLIENT_ID
wrangler secret put CROWDSTRIKE_CLIENT_SECRET
# ... etc
```

## 📁 Project Structure

```
security-dashboard/
├── apps/
│   ├── worker/              # Cloudflare Worker (Hono API)
│   └── dashboard/           # Cloudflare Pages (Frontend)
├── packages/
│   ├── shared/              # Shared types and utilities
│   └── db/                  # Database schemas and migrations
├── mcp-servers/             # MCP servers for Claude integration
├── docs/                    # Documentation
└── .github/workflows/       # CI/CD
```

## 🔧 Configuration

### Environment Variables

See `.env.example` for all required environment variables.

### Cloudflare Secrets

All sensitive credentials should be stored as Cloudflare Secrets:

```bash
wrangler secret put <SECRET_NAME>
```

## 📊 Dashboard Features

- **Executive Summary** - High-level security posture at a glance
- **Threat Overview** - Blocked threats across all platforms
- **Incident Tracking** - Open incidents by severity and age
- **Trend Analysis** - Week-over-week and month-over-month comparisons
- **Platform Health** - Status of all integrated security tools
- **Ticket Metrics** - MTTR and ticket volume trends

## 🤖 MCP Servers

This project includes MCP (Model Context Protocol) servers for use with Claude Desktop:

```bash
# Install MCP servers
cd mcp-servers/security-dashboard
pnpm install
pnpm build

# Add to Claude Desktop config
# See mcp-servers/README.md for configuration
```

### Available MCP Tools

- `get_threat_summary` - Overall threat landscape
- `search_incidents` - Search across all platforms
- `get_endpoint_status` - Check endpoint health
- `analyze_trends` - Trend analysis
- `get_ticket_status` - Service desk metrics
- `generate_report` - Create ad-hoc reports

## 📖 Documentation

- [API Documentation](./docs/api/README.md)
- [Architecture Overview](./docs/architecture/README.md)
- [Runbooks](./docs/runbooks/README.md)
- [Development Guide](./docs/DEVELOPMENT.md)

## 🛣️ Roadmap

See [ROADMAP.md](./ROADMAP.md) for the detailed project roadmap.

## 📄 License

MIT License - See [LICENSE](./LICENSE) for details.

## 🤝 Contributing

1. Create a feature branch from `development`
2. Make your changes
3. Submit a pull request

---

Built with ❤️ on Cloudflare's Edge Platform
