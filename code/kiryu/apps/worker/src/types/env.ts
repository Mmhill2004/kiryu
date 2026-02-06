/**
 * Environment bindings and secrets for the Cloudflare Worker
 */
export interface Env {
  // Cloudflare Bindings
  DB: D1Database;
  REPORTS_BUCKET: R2Bucket;
  CACHE: KVNamespace;

  // Environment variables
  ENVIRONMENT: string;
  LOG_LEVEL: string;
  SYNC_INTERVAL_MINUTES: string;
  MAX_RECORDS_PER_SYNC: string;

  // Dashboard authentication
  DASHBOARD_API_KEY: string;

  // CrowdStrike credentials
  CROWDSTRIKE_CLIENT_ID: string;
  CROWDSTRIKE_CLIENT_SECRET: string;
  CROWDSTRIKE_BASE_URL?: string;

  // Abnormal Security credentials
  ABNORMAL_API_TOKEN: string;
  ABNORMAL_BASE_URL?: string;

  // Zscaler credentials
  ZSCALER_API_KEY: string;
  ZSCALER_API_SECRET: string;
  ZSCALER_BASE_URL?: string;

  // Microsoft/Azure credentials
  AZURE_TENANT_ID: string;
  AZURE_CLIENT_ID: string;
  AZURE_CLIENT_SECRET: string;
  AZURE_SUBSCRIPTION_ID?: string;

  // Salesforce credentials
  SALESFORCE_INSTANCE_URL: string;
  SALESFORCE_CLIENT_ID: string;
  SALESFORCE_CLIENT_SECRET: string;
  SALESFORCE_PRIVATE_KEY?: string;

  // Cloudflare API credentials (for Access/Gateway logs)
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_ZONE_ID?: string;
}

/**
 * Context type for Hono handlers
 */
export interface AppContext {
  Bindings: Env;
  Variables: {
    requestId: string;
    userId?: string;
  };
}
