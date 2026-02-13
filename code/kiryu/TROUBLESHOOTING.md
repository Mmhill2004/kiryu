# Troubleshooting Guide

Detailed platform-specific troubleshooting. See [CLAUDE.md](./CLAUDE.md) for common issues and project overview.

## Salesforce

### "request not supported on this domain"
Use your My Domain URL (e.g., `https://yourorg.my.salesforce.com`) not `login.salesforce.com`.

## Microsoft

### Authentication failed / 401 errors
Verify AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET are set correctly. Ensure admin consent was granted for all API permissions in the Azure portal.

### Defender for Endpoint returns empty
Ensure the app registration has `WindowsDefenderATP Alert.Read.All` permission with admin consent. The Defender API uses a separate scope (`api.securitycenter.microsoft.com/.default`).

### Cloud Defender recommendations return empty
Set `AZURE_SUBSCRIPTION_ID` secret to scope the query to a specific subscription. The provider-level endpoint may return empty without subscription context.

### Risky Users / Incidents return empty
Ensure the app registration has `IdentityRiskyUser.Read.All` and `SecurityIncident.Read.All` permissions with admin consent granted in the Azure portal.

### Defender Machines return empty
Ensure the app registration has `WindowsDefenderATP Machine.Read.All` permission with admin consent. Uses the Security Center API scope (`api.securitycenter.microsoft.com/.default`).

### Intune returns 403 / empty
The app registration needs `DeviceManagementManagedDevices.Read.All` and `DeviceManagementConfiguration.Read.All` with admin consent. Grant in Azure Portal -> App Registrations -> API Permissions -> Add Permission -> Microsoft Graph -> Application permissions.

### Intune reboot-needed returns empty
Uses the Graph beta API for `hardwareInformation.lastRebootDateTime`. Windows devices typically report reboot timestamps; iOS/Android may not. Requires `DeviceManagementManagedDevices.Read.All`.

### Intune /intune page shows "Failed to load"
The `/intune` page calls `getIntuneDetailedSummary()` which uses the Graph beta API. Ensure both `DeviceManagementManagedDevices.Read.All` and `DeviceManagementConfiguration.Read.All` are granted with admin consent. Test with `/api/integrations/microsoft/intune/summary` first.

### Entra ID returns 403 or empty data
Required permissions with admin consent: `IdentityRiskyUser.Read.All`, `IdentityRiskEvent.Read.All`, `UserAuthenticationMethod.Read.All`, `Policy.Read.All`, `RoleManagement.Read.Directory`, `User.Read.All`, `AuditLog.Read.All`, `Application.Read.All`. Risk detections require Entra ID P2 license. MFA registration requires at least P1.

## CrowdStrike

### 403 errors
Check API client scopes in Falcon console. Use `/api/integrations/crowdstrike/diagnostic` to see accessible scopes. Required: Alerts, Hosts, Incidents, Spotlight, ZTA, NGSIEM, OverWatch, Identity Protection, Discover, Sensor Usage, Intel Actors/Indicators/Reports.

### Identity Protection returns empty
IDP detections use the alerts API with `product:'idp'` filter (GraphQL `detections` query type was deprecated). Ensure "Alerts (Read)" scope is enabled. May be empty if no IDP alerts in last 30 days.

### Spotlight returns empty
Requires a FQL filter — empty filter returns nothing. The client always passes `status:'open'`. Ensure "Vulnerabilities / Spotlight (Read)" scope is enabled.

### Discover "invalid filter" / "operator not allowed"
Discover FQL doesn't support `id:>'0'`. Use timestamp-based filters (e.g., `last_seen_timestamp:>='...'`). The client handles this.

### Sensor Usage 404
The `/sensor-usage/combined/weekly/v1` endpoint is unavailable. Sensor count is derived from the hosts API.

### NGSIEM / OverWatch 404
Returns 404 if LogScale/OverWatch not provisioned. Diagnostic endpoint reports available modules. Fails gracefully in `getFullSummary()`.

## Meraki

### 429 rate limited
10 req/sec per-org shared across ALL API consumers. `Retry-After` header indicates wait time (1-10 min). The 5-min KV TTL keeps requests under budget.

### 302/307 redirects
Meraki routes to regional shards via redirects. The client uses `redirect: 'follow'`. Ensure the runtime supports automatic redirect following.

### Returns empty device list
Verify `MERAKI_ORG_ID` is correct. Use `/api/integrations/meraki/test` to list all accessible organizations.

## Zscaler

### ZIA/ZPA/ZDX return 401 through OneAPI
The API client in ZIdentity must have ZIA, ZPA, and ZDX scopes explicitly assigned. Token fetch succeeding doesn't mean access to all services. Flush cached token: `npx wrangler kv key delete "zscaler:oneapi:token" --namespace-id=445b6afd3f1044bb9b84c22e32db3f5c --remote`

### ZDX /devices or /alerts returns 400
ZDX API does NOT accept `limit`/`offset` — uses cursor-based pagination via `next_offset`. Only pass `since` (hours, e.g. `?since=2`).

### ZINS Analytics returns no data
ZINS GraphQL uses UPPERCASE root fields (`WEB_TRAFFIC`, `CYBER_SECURITY`, `SHADOW_IT`) and epoch millisecond timestamps. CYBER_SECURITY requires 7 or 14-day intervals with end_time 1+ day before now. IOT returns 403 if not provisioned. Use `POST /api/integrations/zscaler/analytics/query` to test.

### Risk360 / ZRA returns "Permission Denied" or 401
No public API exists (as of Feb 2026). Use manual KV: `POST /api/integrations/zscaler/risk360` to set scores.

### ZIA/ZPA/ZDX/ZINS suddenly return 401 after working
All OneAPI methods auto-retry on 401 (invalidate token, fetch fresh, retry). If still blank after refresh, likely a scope/permission issue in ZIdentity. Use `/api/integrations/zscaler/diagnostic` to verify.

### Cached token doesn't reflect new permissions
OneAPI tokens cached 55 min. Flush after scope changes: `npx wrangler kv key delete "zscaler:oneapi:token" --namespace-id=445b6afd3f1044bb9b84c22e32db3f5c --remote`
