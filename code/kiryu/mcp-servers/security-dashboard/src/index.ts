#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Configuration from environment
const API_URL = process.env.SECURITY_API_URL || "http://localhost:8787";
const API_KEY = process.env.SECURITY_API_KEY || "";
const DEBUG = process.env.DEBUG === "true";

function debug(...args: unknown[]) {
  if (DEBUG) {
    console.error("[DEBUG]", ...args);
  }
}

/**
 * Make authenticated request to the Security Dashboard API
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  debug(`API Request: ${url}`);

  const response = await fetch(url, {
    ...options,
    headers: {
      "X-API-Key": API_KEY,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error (${response.status}): ${error}`);
  }

  return response.json() as Promise<T>;
}

// Tool definitions
const TOOLS = [
  {
    name: "get_security_summary",
    description:
      "Get a high-level summary of the organization's security posture including threat counts, incident counts by severity, and a computed security score. Use this to understand the overall security landscape.",
    inputSchema: {
      type: "object" as const,
      properties: {
        period: {
          type: "string",
          enum: ["24h", "7d", "30d", "90d"],
          description: "Time period for the summary",
          default: "7d",
        },
      },
    },
  },
  {
    name: "search_incidents",
    description:
      "Search for security incidents across all integrated platforms. Returns recent incidents with details about severity, status, and source.",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of incidents to return",
          default: 20,
        },
        severity: {
          type: "string",
          enum: ["critical", "high", "medium", "low"],
          description: "Filter by severity level",
        },
        source: {
          type: "string",
          enum: ["crowdstrike", "abnormal", "zscaler", "microsoft"],
          description: "Filter by source platform",
        },
      },
    },
  },
  {
    name: "get_threat_trends",
    description:
      "Analyze threat trends over time. Returns timeline data showing how threat volumes have changed, useful for identifying patterns or anomalies.",
    inputSchema: {
      type: "object" as const,
      properties: {
        period: {
          type: "string",
          enum: ["24h", "7d", "30d", "90d"],
          description: "Time period for trend analysis",
          default: "7d",
        },
      },
    },
  },
  {
    name: "get_platform_status",
    description:
      "Check the health and sync status of all integrated security platforms. Use this to identify any connectivity issues or sync failures.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_ticket_metrics",
    description:
      "Get service desk metrics from Salesforce including open ticket counts, mean time to resolution, and ticket trends. Useful for understanding security operations workload.",
    inputSchema: {
      type: "object" as const,
      properties: {
        period: {
          type: "string",
          enum: ["24h", "7d", "30d", "90d"],
          description: "Time period for metrics",
          default: "30d",
        },
      },
    },
  },
  {
    name: "trigger_sync",
    description:
      "Trigger an immediate data sync for one or all security platforms. Use this to refresh data before generating reports.",
    inputSchema: {
      type: "object" as const,
      properties: {
        platform: {
          type: "string",
          enum: ["all", "crowdstrike", "abnormal", "zscaler", "microsoft", "salesforce"],
          description: "Platform to sync, or 'all' for all platforms",
          default: "all",
        },
      },
    },
  },
  {
    name: "get_crowdstrike_detections",
    description:
      "Get recent endpoint detections from CrowdStrike Falcon. Returns detailed information about threats detected on endpoints.",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of detections to return",
          default: 50,
        },
      },
    },
  },
  {
    name: "get_email_threats",
    description:
      "Get recent email threats from Abnormal Security. Returns information about phishing attempts, business email compromise, and other email-based threats.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_microsoft_secure_score",
    description:
      "Get the Microsoft Secure Score for the organization. This score indicates how well security best practices are being followed in Microsoft 365 and Azure.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_microsoft_summary",
    description:
      "Get a full Microsoft security summary including Entra security alerts, Defender for Endpoint alerts, Secure Score, Cloud Defender recommendations, and device compliance — all in one call.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_microsoft_alerts",
    description:
      "Get Microsoft Entra / Graph Security alerts (alert v2 API). Returns recent security alerts from Microsoft 365 and Azure AD.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_microsoft_defender_alerts",
    description:
      "Get Microsoft Defender for Endpoint alerts. Returns recent endpoint detection alerts from Windows Defender ATP.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_microsoft_compliance",
    description:
      "Get device compliance status from Microsoft Intune. Shows counts of compliant, non-compliant, and unknown devices.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_microsoft_recommendations",
    description:
      "Get Azure Cloud Defender security recommendations/assessments. Shows security posture recommendations with severity and status.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_ngsiem_summary",
    description:
      "Get CrowdStrike NGSIEM/LogScale metrics including repository counts, data ingest volumes, saved searches, and recent event activity. Use this to understand log management and SIEM capabilities.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_overwatch_summary",
    description:
      "Get CrowdStrike OverWatch threat hunting summary including proactive detections, active escalations, hunting coverage, and detections by severity and tactic. OverWatch provides 24/7 expert threat hunting.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_historical_trends",
    description:
      "Get historical trend data from the D1 database showing how security metrics have changed over time. Returns period-over-period comparisons with sparkline data for visualization.",
    inputSchema: {
      type: "object" as const,
      properties: {
        metric: {
          type: "string",
          enum: ["crowdstrike", "salesforce", "microsoft", "all"],
          description: "Which platform's trends to fetch",
          default: "all",
        },
        period: {
          type: "string",
          enum: ["24h", "7d", "30d", "90d"],
          description: "Time period for trend analysis",
          default: "7d",
        },
      },
    },
  },
  {
    name: "generate_security_report",
    description:
      "Generate an executive-friendly monthly security report stored in R2. The report includes security score, threat landscape, incident response metrics, OverWatch hunting activity, NGSIEM data, service desk performance, and actionable recommendations in plain language.",
    inputSchema: {
      type: "object" as const,
      properties: {
        year: {
          type: "number",
          description: "Year for the report (e.g. 2026). Defaults to current/previous month.",
        },
        month: {
          type: "number",
          description: "Month for the report (1-12). Defaults to previous month.",
        },
      },
    },
  },
  {
    name: "list_reports",
    description:
      "List all available monthly security reports stored in R2. Returns report keys, upload dates, and sizes.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_executive_summary",
    description:
      "Get a plain-language executive summary of the current security posture. Returns a narrative description, key metrics, risk areas, and recommendations suitable for non-technical stakeholders.",
    inputSchema: {
      type: "object" as const,
      properties: {
        period: {
          type: "string",
          enum: ["24h", "7d", "30d", "90d"],
          description: "Time period for the summary",
          default: "7d",
        },
      },
    },
  },
  {
    name: "investigate_alert",
    description:
      "Deep dive into a specific CrowdStrike alert by its composite ID. Returns full alert details including severity, MITRE ATT&CK tactic/technique, affected hostname, timestamps, and raw detection data.",
    inputSchema: {
      type: "object" as const,
      properties: {
        alert_id: {
          type: "string",
          description: "The composite ID of the CrowdStrike alert to investigate",
        },
      },
      required: ["alert_id"],
    },
  },
  {
    name: "get_crowdscore",
    description:
      "Get the CrowdStrike CrowdScore — the single most important threat-level KPI (0-100). Includes current score, adjusted score, threat level (low/medium/high/critical), and recent trend data for sparkline visualization.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_vulnerability_summary",
    description:
      "Get CrowdStrike Spotlight vulnerability summary. Returns total open vulnerabilities by severity (critical/high/medium/low), exploit availability, ExPRT AI-prioritized ratings, top 10 CVEs by affected host count, and affected host totals.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_identity_detections",
    description:
      "Get CrowdStrike Identity Protection detections via the GraphQL API. Returns identity-based attack detections broken down by severity and type (lateral movement, credential theft, etc.), with targeted account and source endpoint counts.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_discover_summary",
    description:
      "Get CrowdStrike Discover asset inventory summary. Returns managed vs unmanaged asset counts, total applications discovered, and sensor coverage percentage — key for identifying coverage gaps.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_sensor_usage",
    description:
      "Get CrowdStrike sensor deployment and usage trends. Returns current week sensor count, total sensors, and up to 12 weeks of historical data for trend analysis.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_intel_summary",
    description:
      "Get CrowdStrike Falcon Intelligence summary. Returns recent threat actors with target industries, total indicator of compromise (IOC) count, and recent intelligence reports — provides adversary context alongside detections.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_crowdstrike_diagnostic",
    description:
      "Test all CrowdStrike API scopes and report which modules are accessible. Returns a list of available and unavailable modules with error details. Use this to troubleshoot permissions or identify which CrowdStrike features are licensed.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
];

// Tool handlers
async function handleTool(name: string, args: Record<string, unknown>) {
  debug(`Handling tool: ${name}`, args);

  switch (name) {
    case "get_security_summary": {
      const period = (args.period as string) || "7d";
      return apiRequest(`/api/dashboard/summary?period=${period}`);
    }

    case "search_incidents": {
      const limit = (args.limit as number) || 20;
      const params = new URLSearchParams({ limit: limit.toString() });
      if (args.severity) params.set("severity", args.severity as string);
      if (args.source) params.set("source", args.source as string);
      return apiRequest(`/api/dashboard/incidents/recent?${params}`);
    }

    case "get_threat_trends": {
      const period = (args.period as string) || "7d";
      return apiRequest(`/api/dashboard/threats/timeline?period=${period}`);
    }

    case "get_platform_status": {
      return apiRequest("/api/dashboard/platforms/status");
    }

    case "get_ticket_metrics": {
      const period = (args.period as string) || "30d";
      return apiRequest(`/api/dashboard/tickets/metrics?period=${period}`);
    }

    case "trigger_sync": {
      const platform = (args.platform as string) || "all";
      const endpoint = platform === "all" ? "/api/v1/sync/all" : `/api/v1/sync/${platform}`;
      return apiRequest(endpoint, { method: "POST" });
    }

    case "get_crowdstrike_detections": {
      const limit = (args.limit as number) || 50;
      return apiRequest(`/api/integrations/crowdstrike/alerts/list?limit=${limit}`);
    }

    case "get_email_threats": {
      return apiRequest("/api/integrations/abnormal/threats");
    }

    case "get_microsoft_secure_score": {
      return apiRequest("/api/integrations/microsoft/secure-score");
    }

    case "get_microsoft_summary": {
      return apiRequest("/api/integrations/microsoft/summary");
    }

    case "get_microsoft_alerts": {
      return apiRequest("/api/integrations/microsoft/alerts");
    }

    case "get_microsoft_defender_alerts": {
      return apiRequest("/api/integrations/microsoft/defender/alerts");
    }

    case "get_microsoft_compliance": {
      return apiRequest("/api/integrations/microsoft/compliance");
    }

    case "get_microsoft_recommendations": {
      return apiRequest("/api/integrations/microsoft/recommendations");
    }

    case "get_ngsiem_summary": {
      return apiRequest("/api/integrations/crowdstrike/ngsiem");
    }

    case "get_overwatch_summary": {
      return apiRequest("/api/integrations/crowdstrike/overwatch");
    }

    case "get_historical_trends": {
      const metric = (args.metric as string) || "all";
      const period = (args.period as string) || "7d";
      return apiRequest(`/api/dashboard/trends?metric=${metric}&period=${period}`);
    }

    case "generate_security_report": {
      const body: Record<string, number> = {};
      if (args.year) body.year = args.year as number;
      if (args.month) body.month = args.month as number;
      return apiRequest("/api/reports/generate", {
        method: "POST",
        body: JSON.stringify(body),
      });
    }

    case "list_reports": {
      return apiRequest("/api/reports");
    }

    case "get_executive_summary": {
      const period = (args.period as string) || "7d";
      return apiRequest(`/api/dashboard/executive-summary?period=${period}`);
    }

    case "investigate_alert": {
      const alertId = args.alert_id as string;
      if (!alertId) throw new Error("alert_id is required");
      return apiRequest(`/api/integrations/crowdstrike/alerts/${encodeURIComponent(alertId)}`);
    }

    case "get_crowdscore": {
      return apiRequest("/api/integrations/crowdstrike/crowdscore");
    }

    case "get_vulnerability_summary": {
      return apiRequest("/api/integrations/crowdstrike/vulnerabilities");
    }

    case "get_identity_detections": {
      return apiRequest("/api/integrations/crowdstrike/identity");
    }

    case "get_discover_summary": {
      return apiRequest("/api/integrations/crowdstrike/discover");
    }

    case "get_sensor_usage": {
      return apiRequest("/api/integrations/crowdstrike/sensors");
    }

    case "get_intel_summary": {
      return apiRequest("/api/integrations/crowdstrike/intel");
    }

    case "get_crowdstrike_diagnostic": {
      return apiRequest("/api/integrations/crowdstrike/diagnostic");
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Create and configure MCP server
const server = new Server(
  {
    name: "security-dashboard",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  debug("Listing tools");
  return { tools: TOOLS };
});

// Register tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  debug(`Tool call: ${name}`, args);

  try {
    const result = await handleTool(name, args || {});
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    debug(`Tool error: ${message}`);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  debug("Starting Security Dashboard MCP Server");
  debug(`API URL: ${API_URL}`);
  debug(`API Key configured: ${API_KEY ? "yes" : "no"}`);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  debug("Server connected and ready");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
