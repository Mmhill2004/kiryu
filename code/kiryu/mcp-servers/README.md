# MCP Servers for Security Dashboard

This directory contains MCP (Model Context Protocol) servers that allow Claude Desktop and other MCP clients to interact with your security data.

## Overview

MCP servers provide a standardized way for AI assistants like Claude to access external tools and data sources. The security dashboard MCP server exposes 67 tools covering all integrated platforms.

## Security Dashboard MCP Server (`security-dashboard/`)

A unified MCP server that connects to your Security Dashboard Worker API.

### Tools (67)

#### Dashboard & Reports (7)
| Tool | Description |
|------|-------------|
| `get_security_summary` | High-level security posture with scores |
| `search_incidents` | Search incidents with severity/source filters |
| `get_threat_trends` | Threat timeline analysis |
| `get_platform_status` | Health/sync status of all platforms |
| `get_ticket_metrics` | Salesforce service desk KPIs |
| `trigger_sync` | Manual data sync (one or all platforms) |
| `get_executive_summary` | Plain-language security narrative |

#### CrowdStrike (12)
| Tool | Description |
|------|-------------|
| `get_crowdstrike_detections` | Endpoint alert details (alerts/list) |
| `investigate_alert` | Deep dive into a specific CrowdStrike alert |
| `get_crowdscore` | CrowdScore threat level (0-100) with trend |
| `get_vulnerability_summary` | Spotlight vulnerability counts, exploit status, top CVEs |
| `get_identity_detections` | Identity Protection detections by severity/type |
| `get_discover_summary` | Asset discovery: managed/unmanaged, sensor coverage % |
| `get_sensor_usage` | Weekly sensor deployment trends |
| `get_intel_summary` | Threat actors, IOC count, recent intel reports |
| `get_ngsiem_summary` | CrowdStrike LogScale metrics |
| `get_overwatch_summary` | OverWatch threat hunting data |
| `get_crowdstrike_diagnostic` | Test all CrowdStrike API scopes, report availability |
| `get_historical_trends` | D1 trend data with period comparisons |

#### Microsoft (13)
| Tool | Description |
|------|-------------|
| `get_microsoft_summary` | Full Microsoft security summary (all 11 modules) |
| `get_microsoft_secure_score` | Microsoft 365/Azure secure score |
| `get_microsoft_alerts` | Entra / Graph Security alerts |
| `get_microsoft_defender_alerts` | Defender for Endpoint alerts |
| `get_microsoft_compliance` | Intune device compliance status |
| `get_microsoft_recommendations` | Cloud Defender security assessments |
| `get_intune_summary` | Intune full summary (devices, policies, detected apps) |
| `get_intune_devices` | Managed device inventory with OS/compliance filters |
| `get_intune_policies` | Compliance policy pass rates and success/failed counts |
| `get_intune_detected_apps` | Top detected applications by device count |
| `get_intune_stale_devices` | Devices not synced in 30+ days (configurable) |
| `get_intune_reboot_needed` | Devices not rebooted in 14+ days (beta API) |
| `get_intune_compliance_policies` | Per-policy compliance breakdown with pass rates |

#### Entra ID (7)
| Tool | Description |
|------|-------------|
| `get_entra_summary` | Full Entra ID security summary (all 8 domains) |
| `get_entra_risky_users` | Risky users from Identity Protection |
| `get_entra_risk_detections` | Risk detection events (risky sign-ins) |
| `get_entra_mfa_status` | MFA registration status across all users |
| `get_entra_conditional_access` | Conditional Access policies with state |
| `get_entra_privileged_roles` | Privileged directory role assignments |
| `get_entra_app_credentials` | App registrations with expiring credentials |

#### Zscaler (9)
| Tool | Description |
|------|-------------|
| `get_zscaler_summary` | Full Zscaler summary (ZIA + ZPA + ZDX + Analytics + Risk360) |
| `get_zscaler_zia` | ZIA policy posture (ATP, SSL, URL filtering, firewall, DLP) |
| `get_zscaler_zpa` | ZPA connector health, apps, groups, policies |
| `get_zscaler_zdx` | ZDX performance scores, monitored apps, alerts |
| `get_zscaler_analytics` | Z-Insights traffic summary (protocols, threats, locations) |
| `get_zscaler_risk360` | Risk360 scores (manually submitted) |
| `get_zscaler_diagnostic` | Test all Zscaler API modules, report auth status |
| `get_zscaler_connectors` | Detailed ZPA connector list with status and version |
| `query_zscaler_analytics` | Execute raw ZINS GraphQL queries |

#### Meraki (5)
| Tool | Description |
|------|-------------|
| `get_meraki_summary` | Full network infrastructure summary |
| `get_meraki_devices` | Device inventory with status details |
| `get_meraki_networks` | All networks in the organization |
| `get_meraki_vpn_status` | Site-to-site VPN tunnel statuses |
| `get_meraki_uplink_status` | WAN uplink statuses for all appliances |

#### Cloudflare (5)
| Tool | Description |
|------|-------------|
| `get_cloudflare_access_logs` | Access audit logs (who, when, where) |
| `get_cloudflare_gateway_logs` | Gateway DNS/HTTP logs and policy decisions |
| `get_cloudflare_security_events` | WAF, rate limiting, bot, DDoS events |
| `get_cloudflare_stats` | Aggregated security statistics |
| `get_cloudflare_access_apps` | Protected application inventory |

#### Salesforce (4)
| Tool | Description |
|------|-------------|
| `get_salesforce_tickets` | Recent tickets with priority, status, assignee |
| `get_salesforce_open_tickets` | Open tickets with aging analysis |
| `get_salesforce_mttr` | Mean time to resolution by priority |
| `get_salesforce_agent_workload` | Agent workload distribution |

#### Abnormal (3)
| Tool | Description |
|------|-------------|
| `get_email_threats` | Email threats (phishing, BEC, malware) |
| `get_abnormal_cases` | Security investigation cases |
| `get_abnormal_stats` | Aggregated threat statistics |

#### Reports (2)
| Tool | Description |
|------|-------------|
| `generate_security_report` | Trigger monthly R2 report generation |
| `list_reports` | List available R2 reports |

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
- "Are any Meraki devices offline?"
- "Show me VPN tunnel status"
- "What are the recent Cloudflare security events?"
- "Who's got the most open tickets on the service desk?"
- "Show me the aging backlog for open tickets"
- "What shadow IT apps did Zscaler discover?"
- "Run a custom ZINS analytics query for web traffic"
- "Are there any Abnormal Security cases to investigate?"
- "How many Intune devices are non-compliant?"
- "What's the compliance policy pass rate?"
- "Show me the top detected apps across managed devices"
- "Are there stale Intune devices that haven't synced?"
- "Which devices need a reboot?"
- "Show me devices by OS version for currency analysis"
- "How many corporate vs personal devices are enrolled?"
- "Are there any jailbroken or rooted devices?"
- "What's the MFA registration rate?"
- "Are there any risky users in Entra ID?"
- "Show me expiring app credentials"
- "What Conditional Access policies are enabled?"
- "How many Global Admins do we have?"

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
