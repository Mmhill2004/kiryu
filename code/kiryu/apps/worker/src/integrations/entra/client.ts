import type { Env } from '../../types/env';

// ============================================
// Entra ID Types
// ============================================

/** Risky user from Identity Protection */
export interface RiskyUser {
  id: string;
  userDisplayName: string;
  userPrincipalName: string;
  riskLevel: string;
  riskState: string;
  riskDetail: string;
  riskLastUpdatedDateTime: string;
  isDeleted: boolean;
}

/** Risk detection event (risky sign-in) */
export interface RiskDetection {
  id: string;
  riskEventType: string;
  riskLevel: string;
  riskState: string;
  userDisplayName: string;
  userPrincipalName: string;
  ipAddress: string;
  location: {
    city: string;
    state: string;
    countryOrRegion: string;
  } | null;
  detectedDateTime: string;
  lastUpdatedDateTime: string;
  detectionTimingType: string;
  source: string;
  tokenIssuerType: string;
  activityDateTime: string;
}

/** MFA registration detail per user */
export interface UserRegistrationDetail {
  id: string;
  userDisplayName: string;
  userPrincipalName: string;
  isMfaCapable: boolean;
  isMfaRegistered: boolean;
  isPasswordlessCapable: boolean;
  isSsprCapable: boolean;
  isSsprEnabled: boolean;
  isSsprRegistered: boolean;
  isSystemPreferredAuthenticationMethodEnabled: boolean;
  methodsRegistered: string[];
  userPreferredMethodForSecondaryAuthentication: string;
  userType: string;
}

/** Conditional Access policy */
export interface ConditionalAccessPolicy {
  id: string;
  displayName: string;
  state: string;
  createdDateTime: string;
  modifiedDateTime: string;
  conditions: {
    users?: { includeUsers?: string[]; excludeUsers?: string[] };
    applications?: { includeApplications?: string[]; excludeApplications?: string[] };
    locations?: { includeLocations?: string[]; excludeLocations?: string[] };
    platforms?: { includePlatforms?: string[] };
  };
  grantControls?: {
    builtInControls?: string[];
    operator?: string;
  };
  sessionControls?: Record<string, unknown>;
}

/** Directory role with member count */
export interface PrivilegedRole {
  id: string;
  displayName: string;
  description: string;
  memberCount: number;
  members: Array<{
    id: string;
    displayName: string;
    userPrincipalName: string;
  }>;
}

/** User with sign-in activity (beta) */
export interface UserSignInActivity {
  id: string;
  displayName: string;
  userPrincipalName: string;
  userType: string;
  accountEnabled: boolean;
  createdDateTime: string;
  signInActivity?: {
    lastSignInDateTime: string | null;
    lastNonInteractiveSignInDateTime: string | null;
  };
}

/** App registration with credential expiry info */
export interface AppRegistration {
  id: string;
  appId: string;
  displayName: string;
  passwordCredentials: Array<{
    keyId: string;
    displayName: string | null;
    endDateTime: string;
    startDateTime: string;
  }>;
  keyCredentials: Array<{
    keyId: string;
    displayName: string | null;
    endDateTime: string;
    startDateTime: string;
    type: string;
    usage: string;
  }>;
}

/** Expiring credential (app secret or certificate) */
export interface ExpiringCredential {
  appName: string;
  appId: string;
  credentialType: 'secret' | 'certificate';
  credentialName: string | null;
  expiresAt: string;
  daysUntilExpiry: number;
  status: 'expired' | 'critical' | 'warning' | 'ok';
}

/** Sign-in log entry */
export interface SignInEntry {
  id: string;
  userDisplayName: string;
  userPrincipalName: string;
  appDisplayName: string;
  ipAddress: string;
  location: {
    city: string;
    state: string;
    countryOrRegion: string;
  } | null;
  status: {
    errorCode: number;
    failureReason: string;
  };
  createdDateTime: string;
  conditionalAccessStatus: string;
  isInteractive: boolean;
  riskLevelDuringSignIn: string;
}

/** Full Entra summary returned to the dashboard */
export interface EntraSummary {
  riskyUsers: {
    total: number;
    high: number;
    medium: number;
    low: number;
    atRisk: number;
    confirmedCompromised: number;
    users: RiskyUser[];
  };

  riskDetections: {
    total: number;
    high: number;
    medium: number;
    low: number;
    recentDetections: RiskDetection[];
    topRiskTypes: Array<{ type: string; count: number }>;
    topLocations: Array<{ location: string; count: number }>;
  };

  mfaStatus: {
    totalUsers: number;
    mfaRegistered: number;
    mfaCapable: number;
    mfaRate: number;
    passwordlessCapable: number;
    passwordlessRate: number;
    ssprRegistered: number;
    ssprRate: number;
    methodBreakdown: Array<{ method: string; count: number }>;
    usersWithoutMfa: UserRegistrationDetail[];
  };

  conditionalAccess: {
    totalPolicies: number;
    enabled: number;
    reportOnly: number;
    disabled: number;
    policies: ConditionalAccessPolicy[];
  };

  privilegedRoles: {
    totalAssignments: number;
    globalAdminCount: number;
    roles: PrivilegedRole[];
  };

  userHygiene: {
    totalUsers: number;
    guestUsers: number;
    disabledUsers: number;
    staleUsers: UserSignInActivity[];
    staleUserCount: number;
    staleGuests: UserSignInActivity[];
    staleGuestCount: number;
  };

  appHygiene: {
    totalApps: number;
    expiringCredentials: ExpiringCredential[];
    expiredCount: number;
    expiringIn30Days: number;
    expiringIn90Days: number;
  };

  signInActivity: {
    totalSignIns: number;
    successfulSignIns: number;
    failedSignIns: number;
    failureRate: number;
    topFailureReasons: Array<{ reason: string; count: number }>;
    riskySignIns: number;
  };

  fetchedAt: string;
  errors: string[];
}

// ============================================
// Auth Types (reuse pattern from MicrosoftClient)
// ============================================

interface CachedToken {
  access_token: string;
  expires_at: number;
}

// ============================================
// Entra Client
// ============================================

export class EntraClient {
  private graphUrl = 'https://graph.microsoft.com/v1.0';
  private betaUrl = 'https://graph.microsoft.com/beta';
  private token: CachedToken | null = null;
  private pendingAuth: Promise<string> | null = null;
  private kv: KVNamespace | null;

  constructor(private env: Env) {
    this.kv = env.CACHE || null;
  }

  isConfigured(): boolean {
    return !!(this.env.AZURE_CLIENT_ID && this.env.AZURE_CLIENT_SECRET && this.env.AZURE_TENANT_ID);
  }

  // ──────────────────────────────────────────
  // Auth (KV-cached, AbortController timeout, in-flight dedup)
  // ──────────────────────────────────────────

  private async authenticate(): Promise<string> {
    // In-memory cache
    if (this.token && this.token.expires_at > Date.now()) {
      return this.token.access_token;
    }

    // Deduplicate concurrent calls
    if (this.pendingAuth) return this.pendingAuth;

    this.pendingAuth = this.authenticateInner();
    try {
      return await this.pendingAuth;
    } finally {
      this.pendingAuth = null;
    }
  }

  private async authenticateInner(): Promise<string> {
    const kvKey = 'auth:entra:token:graph';

    // Check KV cache
    if (this.kv) {
      try {
        const kvRaw = await this.kv.get(kvKey, 'text');
        if (kvRaw) {
          const cached = JSON.parse(kvRaw) as CachedToken;
          if (cached.expires_at > Date.now()) {
            this.token = cached;
            return cached.access_token;
          }
        }
      } catch { /* KV miss, continue */ }
    }

    // Fetch fresh token with 10s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let response: Response;
    try {
      response = await fetch(
        `https://login.microsoftonline.com/${this.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: this.env.AZURE_CLIENT_ID,
            client_secret: this.env.AZURE_CLIENT_SECRET,
            scope: 'https://graph.microsoft.com/.default',
            grant_type: 'client_credentials',
          }),
        }
      );
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Entra authentication timeout (10s)');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(`Entra auth failed: ${response.status}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    const tokenObj: CachedToken = {
      access_token: data.access_token,
      expires_at: Date.now() + (data.expires_in * 1000) - 60000,
    };

    this.token = tokenObj;

    // Cache in KV (TTL = token lifetime minus 2 min buffer)
    if (this.kv) {
      const kvTtl = Math.max(60, data.expires_in - 120);
      try {
        await this.kv.put(kvKey, JSON.stringify(tokenObj), { expirationTtl: kvTtl });
      } catch { /* non-fatal */ }
    }

    return tokenObj.access_token;
  }

  // ──────────────────────────────────────────
  // HTTP helpers (with AbortController timeouts)
  // ──────────────────────────────────────────

  private async graphRequest<T>(endpoint: string): Promise<T> {
    const token = await this.authenticate();
    const url = endpoint.startsWith('http') ? endpoint : `${this.graphUrl}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Graph API ${response.status} (${endpoint.split('?')[0]}): ${err.slice(0, 200)}`);
      }
      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Graph API timeout (12s): ${endpoint.split('?')[0]}`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async betaRequest<T>(endpoint: string): Promise<T> {
    const token = await this.authenticate();
    const url = endpoint.startsWith('http') ? endpoint : `${this.betaUrl}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Graph Beta API ${response.status} (${endpoint.split('?')[0]}): ${err.slice(0, 200)}`);
      }
      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Graph Beta API timeout (12s): ${endpoint.split('?')[0]}`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async paginate<T>(
    firstUrl: string,
    requester: (url: string) => Promise<{ value: T[]; '@odata.nextLink'?: string }>,
    maxPages = 10
  ): Promise<T[]> {
    const items: T[] = [];
    let url: string | undefined = firstUrl;

    for (let page = 0; page < maxPages; page++) {
      if (!url) break;
      const response = await requester(url);
      items.push(...(response.value || []));
      const nextLink = response['@odata.nextLink'];
      url = nextLink && nextLink.startsWith('http') ? nextLink : undefined;
    }

    return items;
  }

  // ──────────────────────────────────────────
  // Identity Protection
  // ──────────────────────────────────────────

  async getRiskyUsers(): Promise<RiskyUser[]> {
    try {
      return await this.paginate<RiskyUser>(
        '/identityProtection/riskyUsers?$top=500&$orderby=riskLastUpdatedDateTime desc',
        (url) => this.graphRequest(url),
        5
      );
    } catch (error) {
      console.warn('Failed to get risky users:', error);
      return [];
    }
  }

  async getRiskDetections(days = 30): Promise<RiskDetection[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    try {
      return await this.paginate<RiskDetection>(
        `/identityProtection/riskDetections?$filter=detectedDateTime ge ${since}&$top=500&$orderby=detectedDateTime desc`,
        (url) => this.graphRequest(url),
        5
      );
    } catch (error) {
      console.warn('Failed to get risk detections:', error);
      return [];
    }
  }

  // ──────────────────────────────────────────
  // MFA & Authentication Methods
  // ──────────────────────────────────────────

  async getUserRegistrationDetails(): Promise<UserRegistrationDetail[]> {
    try {
      return await this.paginate<UserRegistrationDetail>(
        '/reports/authenticationMethods/userRegistrationDetails?$top=999',
        (url) => this.graphRequest(url),
        5
      );
    } catch (error) {
      console.warn('Failed to get MFA registration details:', error);
      return [];
    }
  }

  // ──────────────────────────────────────────
  // Conditional Access
  // ──────────────────────────────────────────

  async getConditionalAccessPolicies(): Promise<ConditionalAccessPolicy[]> {
    try {
      const response = await this.graphRequest<{ value: ConditionalAccessPolicy[] }>(
        '/identity/conditionalAccess/policies'
      );
      return response.value || [];
    } catch (error) {
      console.warn('Failed to get CA policies:', error);
      return [];
    }
  }

  // ──────────────────────────────────────────
  // Privileged Roles
  // ──────────────────────────────────────────

  async getPrivilegedRoles(): Promise<PrivilegedRole[]> {
    try {
      const rolesResponse = await this.graphRequest<{ value: Array<{
        id: string; displayName: string; description: string;
      }> }>('/directoryRoles');

      const roles = rolesResponse.value || [];

      const roleDetails = await Promise.all(
        roles.slice(0, 10).map(async (role) => {
          try {
            const membersResponse = await this.graphRequest<{ value: Array<{
              id: string; displayName: string; userPrincipalName: string;
              '@odata.type'?: string;
            }> }>(`/directoryRoles/${role.id}/members?$select=id,displayName,userPrincipalName`);

            const members = (membersResponse.value || [])
              .filter(m => m['@odata.type'] === '#microsoft.graph.user' || m.userPrincipalName)
              .map(m => ({
                id: m.id,
                displayName: m.displayName || '',
                userPrincipalName: m.userPrincipalName || '',
              }));

            return {
              id: role.id,
              displayName: role.displayName,
              description: role.description || '',
              memberCount: members.length,
              members,
            };
          } catch {
            return {
              id: role.id,
              displayName: role.displayName,
              description: role.description || '',
              memberCount: 0,
              members: [],
            };
          }
        })
      );

      return roleDetails
        .filter(r => r.memberCount > 0)
        .sort((a, b) => b.memberCount - a.memberCount);
    } catch (error) {
      console.warn('Failed to get privileged roles:', error);
      return [];
    }
  }

  // ──────────────────────────────────────────
  // User Hygiene (stale users, guests)
  // ──────────────────────────────────────────

  async getUsersWithSignInActivity(): Promise<UserSignInActivity[]> {
    try {
      return await this.paginate<UserSignInActivity>(
        '/users?$select=id,displayName,userPrincipalName,userType,accountEnabled,createdDateTime,signInActivity&$top=999',
        (url) => this.betaRequest(url),
        5
      );
    } catch (error) {
      console.warn('Failed to get user sign-in activity:', error);
      return [];
    }
  }

  // ──────────────────────────────────────────
  // App Registration Hygiene
  // ──────────────────────────────────────────

  async getAppRegistrations(): Promise<AppRegistration[]> {
    try {
      return await this.paginate<AppRegistration>(
        '/applications?$select=id,appId,displayName,passwordCredentials,keyCredentials&$top=999',
        (url) => this.graphRequest(url),
        10
      );
    } catch (error) {
      console.warn('Failed to get app registrations:', error);
      return [];
    }
  }

  // ──────────────────────────────────────────
  // Sign-in Logs
  // ──────────────────────────────────────────

  async getRecentSignIns(): Promise<SignInEntry[]> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    try {
      return await this.paginate<SignInEntry>(
        `/auditLogs/signIns?$filter=createdDateTime ge ${since}&$top=1000&$orderby=createdDateTime desc`,
        (url) => this.graphRequest(url),
        5
      );
    } catch (error) {
      console.warn('Failed to get sign-in logs:', error);
      return [];
    }
  }

  // ──────────────────────────────────────────
  // Full Summary (orchestrator)
  // ──────────────────────────────────────────

  async getEntraSummary(): Promise<EntraSummary> {
    const errors: string[] = [];
    const fetchedAt = new Date().toISOString();
    const now = Date.now();
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;

    const [
      riskyUsersRaw,
      riskDetectionsRaw,
      mfaDetails,
      caPolicies,
      privilegedRoles,
      usersWithActivity,
      appRegistrations,
      signInLogs,
    ] = await Promise.all([
      this.getRiskyUsers().catch(err => { errors.push(`Risky users: ${err instanceof Error ? err.message : err}`); return [] as RiskyUser[]; }),
      this.getRiskDetections(30).catch(err => { errors.push(`Risk detections: ${err instanceof Error ? err.message : err}`); return [] as RiskDetection[]; }),
      this.getUserRegistrationDetails().catch(err => { errors.push(`MFA details: ${err instanceof Error ? err.message : err}`); return [] as UserRegistrationDetail[]; }),
      this.getConditionalAccessPolicies().catch(err => { errors.push(`CA policies: ${err instanceof Error ? err.message : err}`); return [] as ConditionalAccessPolicy[]; }),
      this.getPrivilegedRoles().catch(err => { errors.push(`Privileged roles: ${err instanceof Error ? err.message : err}`); return [] as PrivilegedRole[]; }),
      this.getUsersWithSignInActivity().catch(err => { errors.push(`User activity: ${err instanceof Error ? err.message : err}`); return [] as UserSignInActivity[]; }),
      this.getAppRegistrations().catch(err => { errors.push(`App registrations: ${err instanceof Error ? err.message : err}`); return [] as AppRegistration[]; }),
      this.getRecentSignIns().catch(err => { errors.push(`Sign-in logs: ${err instanceof Error ? err.message : err}`); return [] as SignInEntry[]; }),
    ]);

    // ── Risky Users ──
    const activeRisky = riskyUsersRaw.filter(u => !u.isDeleted);
    const riskyUsers = {
      total: activeRisky.length,
      high: activeRisky.filter(u => u.riskLevel === 'high').length,
      medium: activeRisky.filter(u => u.riskLevel === 'medium').length,
      low: activeRisky.filter(u => u.riskLevel === 'low').length,
      atRisk: activeRisky.filter(u => u.riskState === 'atRisk').length,
      confirmedCompromised: activeRisky.filter(u => u.riskState === 'confirmedCompromised').length,
      users: activeRisky
        .filter(u => ['atRisk', 'confirmedCompromised'].includes(u.riskState))
        .sort((a, b) => {
          const riskOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
          return (riskOrder[a.riskLevel] ?? 3) - (riskOrder[b.riskLevel] ?? 3);
        }),
    };

    // ── Risk Detections ──
    const riskTypeCounts = new Map<string, number>();
    const locationCounts = new Map<string, number>();
    for (const d of riskDetectionsRaw) {
      riskTypeCounts.set(d.riskEventType, (riskTypeCounts.get(d.riskEventType) || 0) + 1);
      const loc = d.location?.countryOrRegion || 'Unknown';
      locationCounts.set(loc, (locationCounts.get(loc) || 0) + 1);
    }

    const riskDetections = {
      total: riskDetectionsRaw.length,
      high: riskDetectionsRaw.filter(d => d.riskLevel === 'high').length,
      medium: riskDetectionsRaw.filter(d => d.riskLevel === 'medium').length,
      low: riskDetectionsRaw.filter(d => d.riskLevel === 'low').length,
      recentDetections: riskDetectionsRaw.slice(0, 20),
      topRiskTypes: Array.from(riskTypeCounts.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topLocations: Array.from(locationCounts.entries())
        .map(([location, count]) => ({ location, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };

    // ── MFA Status ──
    const totalMfaUsers = mfaDetails.length;
    const mfaRegistered = mfaDetails.filter(u => u.isMfaRegistered).length;
    const mfaCapable = mfaDetails.filter(u => u.isMfaCapable).length;
    const passwordlessCapable = mfaDetails.filter(u => u.isPasswordlessCapable).length;
    const ssprRegistered = mfaDetails.filter(u => u.isSsprRegistered).length;

    const methodCounts = new Map<string, number>();
    for (const u of mfaDetails) {
      for (const method of u.methodsRegistered || []) {
        methodCounts.set(method, (methodCounts.get(method) || 0) + 1);
      }
    }

    const usersWithoutMfa = mfaDetails
      .filter(u => !u.isMfaRegistered && u.userType !== 'Guest')
      .sort((a, b) => a.userDisplayName.localeCompare(b.userDisplayName))
      .slice(0, 50);

    const mfaStatus = {
      totalUsers: totalMfaUsers,
      mfaRegistered,
      mfaCapable,
      mfaRate: totalMfaUsers > 0 ? Math.round((mfaRegistered / totalMfaUsers) * 100) : 0,
      passwordlessCapable,
      passwordlessRate: totalMfaUsers > 0 ? Math.round((passwordlessCapable / totalMfaUsers) * 100) : 0,
      ssprRegistered,
      ssprRate: totalMfaUsers > 0 ? Math.round((ssprRegistered / totalMfaUsers) * 100) : 0,
      methodBreakdown: Array.from(methodCounts.entries())
        .map(([method, count]) => ({ method, count }))
        .sort((a, b) => b.count - a.count),
      usersWithoutMfa,
    };

    // ── Conditional Access ──
    const conditionalAccess = {
      totalPolicies: caPolicies.length,
      enabled: caPolicies.filter(p => p.state === 'enabled').length,
      reportOnly: caPolicies.filter(p => p.state === 'enabledForReportingButNotEnforced').length,
      disabled: caPolicies.filter(p => p.state === 'disabled').length,
      policies: caPolicies.sort((a, b) => {
        const stateOrder: Record<string, number> = { enabled: 0, enabledForReportingButNotEnforced: 1, disabled: 2 };
        return (stateOrder[a.state] ?? 3) - (stateOrder[b.state] ?? 3);
      }),
    };

    // ── Privileged Roles ──
    const totalAssignments = privilegedRoles.reduce((sum, r) => sum + r.memberCount, 0);
    const globalAdminRole = privilegedRoles.find(r =>
      r.displayName === 'Global Administrator' || r.displayName === 'Company Administrator'
    );

    const privilegedAccess = {
      totalAssignments,
      globalAdminCount: globalAdminRole?.memberCount ?? 0,
      roles: privilegedRoles,
    };

    // ── User Hygiene ──
    const guestUsers = usersWithActivity.filter(u => u.userType === 'Guest');
    const disabledUsers = usersWithActivity.filter(u => !u.accountEnabled);

    const staleUsers = usersWithActivity
      .filter(u => {
        if (!u.accountEnabled) return false;
        if (u.userType === 'Guest') return false;
        const lastSignIn = u.signInActivity?.lastSignInDateTime;
        if (!lastSignIn) return true;
        return new Date(lastSignIn).getTime() < ninetyDaysAgo;
      })
      .sort((a, b) => {
        const aDate = a.signInActivity?.lastSignInDateTime;
        const bDate = b.signInActivity?.lastSignInDateTime;
        if (!aDate) return -1;
        if (!bDate) return 1;
        return new Date(aDate).getTime() - new Date(bDate).getTime();
      });

    const staleGuests = guestUsers
      .filter(u => {
        const lastSignIn = u.signInActivity?.lastSignInDateTime;
        if (!lastSignIn) return true;
        return new Date(lastSignIn).getTime() < ninetyDaysAgo;
      })
      .sort((a, b) => {
        const aDate = a.signInActivity?.lastSignInDateTime;
        const bDate = b.signInActivity?.lastSignInDateTime;
        if (!aDate) return -1;
        if (!bDate) return 1;
        return new Date(aDate).getTime() - new Date(bDate).getTime();
      });

    const userHygiene = {
      totalUsers: usersWithActivity.length,
      guestUsers: guestUsers.length,
      disabledUsers: disabledUsers.length,
      staleUsers: staleUsers.slice(0, 50),
      staleUserCount: staleUsers.length,
      staleGuests: staleGuests.slice(0, 50),
      staleGuestCount: staleGuests.length,
    };

    // ── App Registration Hygiene ──
    const expiringCredentials: ExpiringCredential[] = [];
    for (const app of appRegistrations) {
      for (const cred of app.passwordCredentials || []) {
        const daysUntil = Math.floor((new Date(cred.endDateTime).getTime() - now) / (1000 * 60 * 60 * 24));
        expiringCredentials.push({
          appName: app.displayName,
          appId: app.appId,
          credentialType: 'secret',
          credentialName: cred.displayName,
          expiresAt: cred.endDateTime,
          daysUntilExpiry: daysUntil,
          status: daysUntil < 0 ? 'expired' : daysUntil <= 30 ? 'critical' : daysUntil <= 90 ? 'warning' : 'ok',
        });
      }
      for (const cred of app.keyCredentials || []) {
        const daysUntil = Math.floor((new Date(cred.endDateTime).getTime() - now) / (1000 * 60 * 60 * 24));
        expiringCredentials.push({
          appName: app.displayName,
          appId: app.appId,
          credentialType: 'certificate',
          credentialName: cred.displayName,
          expiresAt: cred.endDateTime,
          daysUntilExpiry: daysUntil,
          status: daysUntil < 0 ? 'expired' : daysUntil <= 30 ? 'critical' : daysUntil <= 90 ? 'warning' : 'ok',
        });
      }
    }

    expiringCredentials.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

    const appHygiene = {
      totalApps: appRegistrations.length,
      expiringCredentials: expiringCredentials.filter(c => c.status !== 'ok'),
      expiredCount: expiringCredentials.filter(c => c.status === 'expired').length,
      expiringIn30Days: expiringCredentials.filter(c => c.status === 'critical').length,
      expiringIn90Days: expiringCredentials.filter(c => c.status === 'warning').length,
    };

    // ── Sign-in Activity ──
    const successfulSignIns = signInLogs.filter(s => s.status.errorCode === 0).length;
    const failedSignIns = signInLogs.filter(s => s.status.errorCode !== 0).length;
    const riskySignIns = signInLogs.filter(s => s.riskLevelDuringSignIn && s.riskLevelDuringSignIn !== 'none').length;

    const failureReasons = new Map<string, number>();
    for (const s of signInLogs) {
      if (s.status.errorCode !== 0 && s.status.failureReason) {
        const reason = s.status.failureReason;
        failureReasons.set(reason, (failureReasons.get(reason) || 0) + 1);
      }
    }

    const signInActivity = {
      totalSignIns: signInLogs.length,
      successfulSignIns,
      failedSignIns,
      failureRate: signInLogs.length > 0 ? Math.round((failedSignIns / signInLogs.length) * 100) : 0,
      topFailureReasons: Array.from(failureReasons.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      riskySignIns,
    };

    return {
      riskyUsers,
      riskDetections,
      mfaStatus,
      conditionalAccess,
      privilegedRoles: privilegedAccess,
      userHygiene,
      appHygiene,
      signInActivity,
      fetchedAt,
      errors,
    };
  }
}
