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
          enum: ["all", "crowdstrike", "abnormal", "zscaler", "microsoft", "salesforce", "meraki", "cloudflare"],
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
    name: "get_intune_summary",
    description:
      "Get Microsoft Intune full summary including managed device analytics, compliance policy pass rates, and top detected applications.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_intune_devices",
    description:
      "Get Microsoft Intune managed device analytics: total devices, compliance state breakdown, OS distribution, stale/encrypted counts, and recent enrollments.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_intune_policies",
    description:
      "Get Microsoft Intune compliance policy analytics: policy list with pass rates, success/failed/error counts per policy.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_intune_detected_apps",
    description:
      "Get Microsoft Intune detected applications: top apps by device count, with publisher and platform info.",
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
  {
    name: "get_zscaler_summary",
    description:
      "Get the full Zscaler security summary including ZIA policy posture, ZPA connector health, ZDX digital experience scores, Analytics traffic data, and Risk360 scores — all in one call.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_zscaler_zia",
    description:
      "Get Zscaler Internet Access (ZIA) policy posture including ATP protections, SSL inspection, URL filtering rules, firewall rules, DLP rules, sandbox status, custom URL categories, and bandwidth control rules.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_zscaler_zpa",
    description:
      "Get Zscaler Private Access (ZPA) summary including connector health, connector groups, applications (with double encryption count), server groups, segment groups, and access policies.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_zscaler_zdx",
    description:
      "Get Zscaler Digital Experience (ZDX) summary including average performance score, score category, monitored apps with individual scores, device count, and active/critical alerts.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_zscaler_analytics",
    description:
      "Get Zscaler Analytics traffic summary from the GraphQL API. Returns traffic action counts (allowed/blocked/cautioned), protocol breakdown, and threat category data.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_zscaler_risk360",
    description:
      "Get Zscaler Risk360 scores including overall score and sub-scores for external attack surface, compromise, lateral propagation, and data loss. Scores are manually submitted via the dashboard.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_zscaler_diagnostic",
    description:
      "Test all Zscaler API modules and report which are configured and accessible. Returns auth status for OneAPI, legacy ZIA, legacy ZPA, ZDX, and Analytics. Use this to troubleshoot connectivity.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  // --- Zscaler Advanced ---
  {
    name: "get_zscaler_connectors",
    description:
      "Get detailed Zscaler Private Access (ZPA) connector list including name, status, version, last connection time, and connector group membership. Use this for troubleshooting unhealthy connectors.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "query_zscaler_analytics",
    description:
      "Execute a raw Z-Insights (ZINS) GraphQL query. Root fields are UPPERCASE: WEB_TRAFFIC, CYBER_SECURITY, SHADOW_IT. Times are epoch milliseconds. Use this for custom analytics queries beyond the pre-built summaries.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "The GraphQL query string to execute against the ZINS API",
        },
      },
      required: ["query"],
    },
  },
  // --- Meraki ---
  {
    name: "get_meraki_summary",
    description:
      "Get full Meraki network infrastructure summary including device overview, connector statuses, networks, VPN tunnels, uplinks, and licensing information — all in one call.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_meraki_devices",
    description:
      "Get Meraki device inventory with status details. Returns device overview (total, online, alerting, offline counts) and individual device records with model, serial, status, and network assignment.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_meraki_networks",
    description:
      "Get all Meraki networks in the organization. Returns network names, types, tags, and configuration details.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_meraki_vpn_status",
    description:
      "Get Meraki site-to-site VPN tunnel statuses. Returns tunnel peers with connectivity status (online/offline), uptime, and network assignments. Use this to identify VPN connectivity issues.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_meraki_uplink_status",
    description:
      "Get Meraki WAN uplink statuses for all appliances. Returns uplink interface, IP, gateway, DNS, status (active/ready/not connected), and signal strength for cellular uplinks.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  // --- Cloudflare ---
  {
    name: "get_cloudflare_access_logs",
    description:
      "Get Cloudflare Access audit logs showing who accessed protected applications, when, and from where. Useful for investigating unauthorized access attempts.",
    inputSchema: {
      type: "object" as const,
      properties: {
        since: {
          type: "string",
          description: "ISO date to filter logs from (e.g. '2026-02-01'). Defaults to last 24 hours.",
        },
      },
    },
  },
  {
    name: "get_cloudflare_gateway_logs",
    description:
      "Get Cloudflare Gateway DNS and HTTP logs. Shows DNS queries, HTTP requests through Gateway, and policy decisions (allow/block). Useful for investigating policy violations or threat detections.",
    inputSchema: {
      type: "object" as const,
      properties: {
        since: {
          type: "string",
          description: "ISO date to filter logs from (e.g. '2026-02-01'). Defaults to last 24 hours.",
        },
      },
    },
  },
  {
    name: "get_cloudflare_security_events",
    description:
      "Get Cloudflare security events including WAF blocks, rate limiting, bot management, and DDoS mitigation events for the configured zone.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_cloudflare_stats",
    description:
      "Get aggregated Cloudflare security statistics including Access login counts, Gateway query counts, security event totals, and protected application inventory.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_cloudflare_access_apps",
    description:
      "Get the list of Cloudflare Access protected applications including app name, domain, type, and session duration settings.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  // --- Salesforce ---
  {
    name: "get_salesforce_tickets",
    description:
      "Get recent Salesforce service desk tickets with details including subject, priority, status, assignee, and creation date. Useful for investigating specific incidents or reviewing recent activity.",
    inputSchema: {
      type: "object" as const,
      properties: {
        days: {
          type: "number",
          description: "Number of days to look back (1-90)",
          default: 30,
        },
        limit: {
          type: "number",
          description: "Maximum tickets to return (1-500)",
          default: 100,
        },
      },
    },
  },
  {
    name: "get_salesforce_open_tickets",
    description:
      "Get all currently open Salesforce tickets with aging analysis. Returns tickets grouped by age bucket (0-7d, 7-14d, 14-30d, 30d+) and individual ticket details. Use this to identify stale or aging tickets.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_salesforce_mttr",
    description:
      "Get mean time to resolution (MTTR) metrics from Salesforce. Returns overall MTTR, MTTR by priority level, and closed ticket count for the period.",
    inputSchema: {
      type: "object" as const,
      properties: {
        days: {
          type: "number",
          description: "Number of days to analyze (1-90)",
          default: 30,
        },
      },
    },
  },
  {
    name: "get_salesforce_agent_workload",
    description:
      "Get Salesforce agent workload distribution. Returns each agent's name and open ticket count, sorted by workload. Use this to identify overloaded agents or unbalanced ticket distribution.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  // --- Abnormal ---
  {
    name: "get_abnormal_cases",
    description:
      "Get Abnormal Security cases (investigations). Returns case details including severity, status, affected users, and threat type. Cases represent grouped related threats that warrant investigation.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_abnormal_stats",
    description:
      "Get aggregated Abnormal Security statistics including total threats detected, threats by category (phishing, BEC, malware, etc.), and detection trend data.",
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

    case "get_intune_summary": {
      return apiRequest("/api/integrations/microsoft/intune/summary");
    }

    case "get_intune_devices": {
      return apiRequest("/api/integrations/microsoft/intune/devices");
    }

    case "get_intune_policies": {
      return apiRequest("/api/integrations/microsoft/intune/policies");
    }

    case "get_intune_detected_apps": {
      return apiRequest("/api/integrations/microsoft/intune/apps");
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

    case "get_zscaler_summary": {
      return apiRequest("/api/integrations/zscaler/summary");
    }

    case "get_zscaler_zia": {
      return apiRequest("/api/integrations/zscaler/zia");
    }

    case "get_zscaler_zpa": {
      return apiRequest("/api/integrations/zscaler/zpa");
    }

    case "get_zscaler_zdx": {
      return apiRequest("/api/integrations/zscaler/zdx");
    }

    case "get_zscaler_analytics": {
      return apiRequest("/api/integrations/zscaler/analytics");
    }

    case "get_zscaler_risk360": {
      return apiRequest("/api/integrations/zscaler/risk360");
    }

    case "get_zscaler_diagnostic": {
      return apiRequest("/api/integrations/zscaler/diagnostic");
    }

    // Zscaler Advanced
    case "get_zscaler_connectors": {
      return apiRequest("/api/integrations/zscaler/zpa/connectors");
    }

    case "query_zscaler_analytics": {
      const query = args.query as string;
      if (!query) throw new Error("query is required");
      return apiRequest("/api/integrations/zscaler/analytics/query", {
        method: "POST",
        body: JSON.stringify({ query }),
      });
    }

    // Meraki
    case "get_meraki_summary": {
      return apiRequest("/api/integrations/meraki/summary");
    }

    case "get_meraki_devices": {
      return apiRequest("/api/integrations/meraki/devices");
    }

    case "get_meraki_networks": {
      return apiRequest("/api/integrations/meraki/networks");
    }

    case "get_meraki_vpn_status": {
      return apiRequest("/api/integrations/meraki/vpn");
    }

    case "get_meraki_uplink_status": {
      return apiRequest("/api/integrations/meraki/uplinks");
    }

    // Cloudflare
    case "get_cloudflare_access_logs": {
      const since = args.since as string | undefined;
      const params = since ? `?since=${encodeURIComponent(since)}` : "";
      return apiRequest(`/api/integrations/cloudflare/access/logs${params}`);
    }

    case "get_cloudflare_gateway_logs": {
      const since = args.since as string | undefined;
      const params = since ? `?since=${encodeURIComponent(since)}` : "";
      return apiRequest(`/api/integrations/cloudflare/gateway/logs${params}`);
    }

    case "get_cloudflare_security_events": {
      return apiRequest("/api/integrations/cloudflare/security/events");
    }

    case "get_cloudflare_stats": {
      return apiRequest("/api/integrations/cloudflare/stats");
    }

    case "get_cloudflare_access_apps": {
      return apiRequest("/api/integrations/cloudflare/access/apps");
    }

    // Salesforce
    case "get_salesforce_tickets": {
      const days = (args.days as number) || 30;
      const limit = (args.limit as number) || 100;
      return apiRequest(`/api/integrations/salesforce/tickets?days=${days}&limit=${limit}`);
    }

    case "get_salesforce_open_tickets": {
      return apiRequest("/api/integrations/salesforce/open");
    }

    case "get_salesforce_mttr": {
      const days = (args.days as number) || 30;
      return apiRequest(`/api/integrations/salesforce/mttr?days=${days}`);
    }

    case "get_salesforce_agent_workload": {
      return apiRequest("/api/integrations/salesforce/workload");
    }

    // Abnormal
    case "get_abnormal_cases": {
      return apiRequest("/api/integrations/abnormal/cases");
    }

    case "get_abnormal_stats": {
      return apiRequest("/api/integrations/abnormal/stats");
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
