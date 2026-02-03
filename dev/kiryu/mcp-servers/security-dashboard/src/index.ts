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
      const endpoint = platform === "all" ? "/api/sync/all" : `/api/sync/${platform}`;
      return apiRequest(endpoint, { method: "POST" });
    }

    case "get_crowdstrike_detections": {
      const limit = (args.limit as number) || 50;
      return apiRequest(`/api/integrations/crowdstrike/detections?limit=${limit}`);
    }

    case "get_email_threats": {
      return apiRequest("/api/integrations/abnormal/threats");
    }

    case "get_microsoft_secure_score": {
      return apiRequest("/api/integrations/microsoft/secure-score");
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
