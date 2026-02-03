# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this codebase.

## Project Overview

Kiryu is a unified security operations dashboard built on Cloudflare's edge platform. It aggregates data from multiple security tools (CrowdStrike, Abnormal Security, Zscaler, Microsoft Defender, Salesforce) to provide visibility into an organization's security posture.

## Architecture

- **Monorepo** using pnpm workspaces
- **apps/worker** - Hono API on Cloudflare Workers (backend)
- **apps/dashboard** - React + Vite + Tailwind on Cloudflare Pages (frontend)
- **packages/db** - D1 database migrations
- **mcp-servers/security-dashboard** - MCP server for Claude integration

### Cloudflare Services Used
- **Workers** - API backend with scheduled cron triggers (every 15 min)
- **D1** - SQLite database for persistent storage
- **R2** - Object storage for reports
- **KV** - Cache layer
- **Pages** - Frontend hosting

## Common Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev                  # Start worker (API) dev server on :8787
pnpm dev:dashboard        # Start dashboard dev server on :5173

# Build
pnpm build               # Build all packages
pnpm build:worker        # Build worker only
pnpm build:dashboard     # Build dashboard only

# Deploy
pnpm deploy              # Deploy all to Cloudflare
pnpm deploy:worker       # Deploy worker only
pnpm deploy:dashboard    # Deploy dashboard only

# Database
pnpm db:migrate          # Run D1 migrations (production)
pnpm db:migrate:local    # Run D1 migrations (local)

# Quality
pnpm lint                # Lint all packages
pnpm typecheck           # TypeScript check
pnpm test                # Run tests (vitest)
```

## Code Organization

### Worker API Structure (`apps/worker/src/`)
- `index.ts` - Hono app entry, routes, and scheduled handler
- `routes/` - API route handlers (dashboard, health, sync, integrations/*)
- `integrations/` - External API clients (crowdstrike, abnormal, zscaler, microsoft, salesforce)
- `middleware/` - Auth and error handling middleware
- `services/` - Business logic (sync service)
- `types/` - TypeScript types including Cloudflare bindings (Env)

### Dashboard Structure (`apps/dashboard/src/`)
- `App.tsx` - Main dashboard component
- `components/` - React components (Card, MetricCard, IncidentTable, SecurityScore, etc.)
- `hooks/` - Custom hooks (useDashboard)
- `lib/` - API client utilities
- `types/` - API response types

### Database Schema (`packages/db/migrations/`)
Key tables:
- `security_events` - Normalized events from all platforms
- `incidents` - Ongoing security incidents
- `tickets` - Salesforce service desk tickets
- `platform_status` - Health/sync status per platform
- `daily_summaries` - Pre-aggregated stats for dashboard
- `metrics` - Time-series metrics for trending

## Key Patterns

### API Authentication
Protected routes under `/api/*` require `X-API-Key` header validated against `DASHBOARD_API_KEY` secret.

### Hono App Structure
```typescript
const app = new Hono<{ Bindings: Env }>();
app.use('/api/*', authMiddleware);
app.route('/api/dashboard', dashboardRoutes);
```

### Cloudflare Bindings
Access via context: `c.env.DB`, `c.env.CACHE`, `c.env.REPORTS_BUCKET`

### Integration Clients
Each integration has a client class in `integrations/{platform}/client.ts` that handles OAuth/API auth and data fetching.

## Environment & Secrets

Non-sensitive vars are in `wrangler.toml`. Secrets must be set via:
```bash
wrangler secret put CROWDSTRIKE_CLIENT_ID
wrangler secret put CROWDSTRIKE_CLIENT_SECRET
wrangler secret put ABNORMAL_API_TOKEN
wrangler secret put ZSCALER_API_KEY
wrangler secret put ZSCALER_API_SECRET
wrangler secret put AZURE_TENANT_ID
wrangler secret put AZURE_CLIENT_ID
wrangler secret put AZURE_CLIENT_SECRET
wrangler secret put SALESFORCE_CLIENT_ID
wrangler secret put SALESFORCE_CLIENT_SECRET
wrangler secret put SALESFORCE_PRIVATE_KEY
wrangler secret put DASHBOARD_API_KEY
```

## Tech Stack

- **Runtime**: Cloudflare Workers (Node.js compat)
- **API Framework**: Hono v4
- **Validation**: Zod
- **Frontend**: React 19, Vite 7, Tailwind CSS v4
- **Charts**: Recharts
- **Icons**: Lucide React
- **Testing**: Vitest
- **Package Manager**: pnpm 8.12+
- **Node**: 18+
