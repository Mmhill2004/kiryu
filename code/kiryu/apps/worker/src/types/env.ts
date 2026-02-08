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

  // Zscaler — OneAPI (ZIdentity) credentials
  ZSCALER_CLIENT_ID?: string;
  ZSCALER_CLIENT_SECRET?: string;
  ZSCALER_VANITY_DOMAIN?: string;
  ZSCALER_CLOUD?: string;
  ZSCALER_ZPA_CUSTOMER_ID?: string;

  // Zscaler — Legacy ZIA credentials (fallback)
  ZSCALER_ZIA_USERNAME?: string;
  ZSCALER_ZIA_PASSWORD?: string;
  ZSCALER_ZIA_API_KEY?: string;
  ZSCALER_ZIA_CLOUD?: string;

  // Zscaler — Legacy ZPA credentials (fallback)
  ZSCALER_ZPA_CLIENT_ID?: string;
  ZSCALER_ZPA_CLIENT_SECRET?: string;
  ZSCALER_ZPA_CLOUD?: string;

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
