# MCP Servers for Security Dashboard

This directory contains MCP (Model Context Protocol) servers that allow Claude Desktop and other MCP clients to interact with your security data.

## Overview

MCP servers provide a standardized way for AI assistants like Claude to access external tools and data sources. These servers expose your security dashboard data through a set of tools that Claude can use to:

- Query security metrics and incidents
- Analyze threat trends
- Generate reports
- Search across security platforms

## Available Servers

### 1. Security Dashboard MCP Server (`security-dashboard/`)
A unified MCP server that connects to your Security Dashboard API to provide aggregated security data.

**Tools:**
- `get_security_summary` - Get overall security posture
- `search_incidents` - Search for security incidents
- `get_threat_trends` - Analyze threat trends over time
- `get_platform_status` - Check status of all security platforms
- `get_ticket_metrics` - Get service desk metrics
- `generate_report` - Generate ad-hoc security reports

### 2. Individual Platform Servers (Optional)
For direct API access, you can also use individual platform servers:
- `crowdstrike/` - Direct CrowdStrike Falcon API access
- `abnormal/` - Direct Abnormal Security API access
- `zscaler/` - Direct Zscaler API access
- `microsoft-defender/` - Direct Microsoft Defender API access
- `salesforce/` - Direct Salesforce Service Cloud access

## Installation

### Prerequisites
- Node.js 18+
- pnpm
- Claude Desktop (or another MCP client)

### Setup

```bash
# Navigate to the MCP server directory
cd mcp-servers/security-dashboard

# Install dependencies
pnpm install

# Build the server
pnpm build

# Test the server
pnpm test
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
      "args": ["/path/to/security-dashboard/mcp-servers/security-dashboard/dist/index.js"],
      "env": {
        "SECURITY_API_URL": "https://your-worker.your-subdomain.workers.dev",
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
| `SECURITY_API_KEY` | API key for authentication | Yes |
| `DEBUG` | Enable debug logging | No |

## Usage with Claude

Once configured, you can ask Claude questions like:

- "What's our current security posture?"
- "Show me the top threats from the last 7 days"
- "How many critical incidents are open?"
- "What's our mean time to resolution for security tickets?"
- "Generate a weekly security summary report"
- "Compare this week's threat volume to last week"

## Development

### Running in Development Mode

```bash
# Start the server with hot reload
pnpm dev

# Run tests
pnpm test

# Lint code
pnpm lint
```

### Adding New Tools

1. Define the tool in `src/tools/index.ts`
2. Implement the handler in `src/handlers/`
3. Add tests in `tests/`
4. Update the tool list in the README

## Troubleshooting

### Server not connecting
- Check that the path in your Claude Desktop config is correct
- Ensure the server is built (`pnpm build`)
- Check environment variables are set

### Authentication errors
- Verify your API key is correct
- Check that the API URL is accessible

### Tools not appearing
- Restart Claude Desktop after config changes
- Check the MCP server logs for errors

## Security Considerations

- Store API keys securely (use environment variables, not config files)
- Rotate API keys regularly
- Consider using separate API keys for MCP access
- Monitor API usage for unusual patterns
