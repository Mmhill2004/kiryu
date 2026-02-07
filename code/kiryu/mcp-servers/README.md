# MCP Servers for Security Dashboard

This directory contains MCP (Model Context Protocol) servers that allow Claude Desktop and other MCP clients to interact with your security data.

## Overview

MCP servers provide a standardized way for AI assistants like Claude to access external tools and data sources. The security dashboard MCP server exposes 28 tools covering all integrated platforms.

## Security Dashboard MCP Server (`security-dashboard/`)

A unified MCP server that connects to your Security Dashboard Worker API.

### Tools (28)

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
| `get_microsoft_summary` | Full Microsoft security summary (all 8 modules) |
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

## Installation

### Prerequisites
- Node.js 18+
- pnpm
- Claude Desktop (or another MCP client)

### Setup

```bash
cd mcp-servers/security-dashboard
pnpm install
pnpm build
```

## Configuration

### Claude Desktop Configuration

Add the following to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "security-dashboard": {
      "command": "node",
      "args": ["/path/to/kiryu/mcp-servers/security-dashboard/dist/index.js"],
      "env": {
        "SECURITY_API_URL": "https://security-dashboard-api.rodgersbuilders.workers.dev",
        "SECURITY_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SECURITY_API_URL` | URL of your Security Dashboard Worker API | Yes |
| `SECURITY_API_KEY` | API key for authentication (matches `DASHBOARD_API_KEY` secret) | Yes |
| `DEBUG` | Enable debug logging | No |

## Usage with Claude

Once configured, you can ask Claude questions like:

- "What's our current security posture?"
- "Show me the top threats from the last 7 days"
- "How many critical incidents are open?"
- "What's our CrowdScore right now?"
- "Show me risky users from Microsoft Entra"
- "What's our Spotlight vulnerability status?"
- "Generate a monthly security report"
- "What's the mean time to resolution for security tickets?"
- "Run a CrowdStrike diagnostic to check API scope access"
- "Investigate alert ABC123"

## Development

```bash
# Start with hot reload
pnpm dev

# Run tests
pnpm test
```

## Troubleshooting

### Server not connecting
- Check that the path in your Claude Desktop config is correct
- Ensure the server is built (`pnpm build`)
- Check environment variables are set

### Authentication errors
- Verify your API key matches the `DASHBOARD_API_KEY` secret on the worker
- Check that the API URL is accessible (note: endpoints behind Zero Trust require the `/api/v1/` prefix with API key auth)

### Tools not appearing
- Restart Claude Desktop after config changes
- Check the MCP server logs for errors
