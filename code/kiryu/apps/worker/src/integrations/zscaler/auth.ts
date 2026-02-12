import type { Env } from '../../types/env';

const ZIA_CLOUD_URLS: Record<string, string> = {
  zscaler: 'https://zsapi.zscaler.net',
  zscalerone: 'https://zsapi.zscalerone.net',
  zscalertwo: 'https://zsapi.zscalertwo.net',
  zscalerthree: 'https://zsapi.zscalerthree.net',
  zscloud: 'https://zsapi.zscloud.net',
  zscalerbeta: 'https://zsapi.zscalerbeta.net',
  zscalergov: 'https://zsapi.zscalergov.net',
};

const ZPA_CLOUD_URLS: Record<string, string> = {
  PRODUCTION: 'https://config.private.zscaler.com',
  BETA: 'https://config.zpabeta.net',
  GOV: 'https://config.zpagov.net',
  GOVUS: 'https://config.zpagov.us',
  PREVIEW: 'https://config.zpapreview.net',
  ZPATWO: 'https://config.zpatwo.net',
};

const OAUTH_TIMEOUT = 10_000;
const KV_KEY_ONEAPI = 'zscaler:oneapi:token';
const KV_KEY_ZIA_SESSION = 'zscaler:zia:session';
const KV_KEY_ZPA_TOKEN = 'zscaler:zpa:token';

export class ZscalerAuth {
  private env: Env;
  private kv: KVNamespace;
  private pendingOneApi: Promise<string> | null = null;
  private pendingZiaSession: Promise<string> | null = null;
  private pendingZpaToken: Promise<string> | null = null;

  constructor(env: Env) {
    this.env = env;
    this.kv = env.CACHE;
  }

  isOneApiConfigured(): boolean {
    return !!(this.env.ZSCALER_CLIENT_ID && this.env.ZSCALER_CLIENT_SECRET && this.env.ZSCALER_VANITY_DOMAIN);
  }

  isLegacyZiaConfigured(): boolean {
    return !!(this.env.ZSCALER_ZIA_USERNAME && this.env.ZSCALER_ZIA_PASSWORD && this.env.ZSCALER_ZIA_API_KEY);
  }

  isLegacyZpaConfigured(): boolean {
    return !!(this.env.ZSCALER_ZPA_CLIENT_ID && this.env.ZSCALER_ZPA_CLIENT_SECRET);
  }

  isZiaConfigured(): boolean {
    return this.isOneApiConfigured() || this.isLegacyZiaConfigured();
  }

  isZpaConfigured(): boolean {
    return (this.isOneApiConfigured() || this.isLegacyZpaConfigured()) && !!this.env.ZSCALER_ZPA_CUSTOMER_ID;
  }

  isConfigured(): boolean {
    return this.isZiaConfigured() || this.isZpaConfigured();
  }

  // --- OneAPI OAuth2 ---

  async getOneApiToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh) {
      const cached = await this.kv.get(KV_KEY_ONEAPI);
      if (cached) return cached;
    }

    if (this.pendingOneApi) return this.pendingOneApi;
    this.pendingOneApi = this.fetchOneApiToken();
    try {
      return await this.pendingOneApi;
    } finally {
      this.pendingOneApi = null;
    }
  }

  /** Delete cached OneAPI token so next call fetches fresh */
  async invalidateOneApiToken(): Promise<void> {
    await this.kv.delete(KV_KEY_ONEAPI);
  }

  getOneApiTokenUrl(): string {
    return `https://${this.sanitizeVanityDomain()}.zslogin.net/oauth2/v1/token`;
  }

  /** Strip common suffixes if user set the full domain instead of just the vanity part */
  private sanitizeVanityDomain(): string {
    let vanity = (this.env.ZSCALER_VANITY_DOMAIN || '').trim();
    // Strip protocol if present
    vanity = vanity.replace(/^https?:\/\//, '');
    // Strip known suffixes
    for (const suffix of ['.zslogin.net', '.zscaler.net', '.zscloud.net']) {
      if (vanity.endsWith(suffix)) {
        vanity = vanity.slice(0, -suffix.length);
      }
    }
    // Strip trailing slashes or paths
    vanity = vanity.split('/')[0] ?? vanity;
    return vanity;
  }

  private async fetchOneApiToken(): Promise<string> {
    const url = this.getOneApiTokenUrl();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OAUTH_TIMEOUT);

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.env.ZSCALER_CLIENT_ID!,
          client_secret: this.env.ZSCALER_CLIENT_SECRET!,
          audience: 'https://api.zscaler.com',
        }).toString(),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`OneAPI OAuth failed (${resp.status}): ${text}`);
      }

      const data = await resp.json() as { access_token: string; expires_in: number };
      // Cache for 55 min (token lasts 60 min)
      await this.kv.put(KV_KEY_ONEAPI, data.access_token, { expirationTtl: 3300 });
      return data.access_token;
    } finally {
      clearTimeout(timeout);
    }
  }

  // --- Legacy ZIA Session ---

  async getZiaSession(): Promise<string> {
    const cached = await this.kv.get(KV_KEY_ZIA_SESSION);
    if (cached) return cached;

    if (this.pendingZiaSession) return this.pendingZiaSession;
    this.pendingZiaSession = this.fetchZiaSession();
    try {
      return await this.pendingZiaSession;
    } finally {
      this.pendingZiaSession = null;
    }
  }

  private async fetchZiaSession(): Promise<string> {
    const baseUrl = this.getZiaBaseUrl();
    const timestamp = Date.now();
    const obfuscatedKey = obfuscateApiKey(this.env.ZSCALER_ZIA_API_KEY!, timestamp);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OAUTH_TIMEOUT);

    try {
      const resp = await fetch(`${baseUrl}/api/v1/authenticatedSession`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: obfuscatedKey,
          username: this.env.ZSCALER_ZIA_USERNAME!,
          password: this.env.ZSCALER_ZIA_PASSWORD!,
          timestamp: String(timestamp),
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Legacy ZIA auth failed (${resp.status}): ${text}`);
      }

      const cookie = resp.headers.get('set-cookie') || '';
      // Cache for 25 min (session lasts 30 min)
      await this.kv.put(KV_KEY_ZIA_SESSION, cookie, { expirationTtl: 1500 });
      return cookie;
    } finally {
      clearTimeout(timeout);
    }
  }

  async releaseZiaSession(): Promise<void> {
    if (!this.isLegacyZiaConfigured()) return;
    const cookie = await this.kv.get(KV_KEY_ZIA_SESSION);
    if (!cookie) return;
    try {
      await fetch(`${this.getZiaBaseUrl()}/api/v1/authenticatedSession`, {
        method: 'DELETE',
        headers: { Cookie: cookie },
      });
    } catch { /* best effort */ }
    await this.kv.delete(KV_KEY_ZIA_SESSION);
  }

  // --- Legacy ZPA Token ---

  async getZpaToken(): Promise<string> {
    const cached = await this.kv.get(KV_KEY_ZPA_TOKEN);
    if (cached) return cached;

    if (this.pendingZpaToken) return this.pendingZpaToken;
    this.pendingZpaToken = this.fetchZpaToken();
    try {
      return await this.pendingZpaToken;
    } finally {
      this.pendingZpaToken = null;
    }
  }

  private async fetchZpaToken(): Promise<string> {
    const baseUrl = this.getZpaBaseUrl();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OAUTH_TIMEOUT);

    try {
      const resp = await fetch(`${baseUrl}/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.env.ZSCALER_ZPA_CLIENT_ID!,
          client_secret: this.env.ZSCALER_ZPA_CLIENT_SECRET!,
        }).toString(),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Legacy ZPA auth failed (${resp.status}): ${text}`);
      }

      const data = await resp.json() as { access_token: string };
      // Cache for 55 min
      await this.kv.put(KV_KEY_ZPA_TOKEN, data.access_token, { expirationTtl: 3300 });
      return data.access_token;
    } finally {
      clearTimeout(timeout);
    }
  }

  // --- Base URLs ---

  /** OneAPI unified gateway: all services routed via /zia, /zpa, /zdx prefixes */
  getOneApiBaseUrl(): string {
    // All clouds route through the single global gateway.
    // Cloud routing is determined by the OAuth2 token.
    return 'https://api.zsapi.net';
  }

  /** Legacy ZIA base URL (session-based auth) */
  getZiaBaseUrl(): string {
    const cloud = this.env.ZSCALER_CLOUD || this.env.ZSCALER_ZIA_CLOUD || 'zscaler';
    return ZIA_CLOUD_URLS[cloud] ?? `https://zsapi.${cloud}.net`;
  }

  /** Legacy ZPA base URL (dedicated ZPA token auth) */
  getZpaBaseUrl(): string {
    const cloud = this.env.ZSCALER_ZPA_CLOUD || 'PRODUCTION';
    return ZPA_CLOUD_URLS[cloud] ?? 'https://config.private.zscaler.com';
  }

  // --- Authenticated fetch helpers ---

  async ziaFetch<T>(endpoint: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    try {
      let resp: Response;
      if (this.isOneApiConfigured()) {
        const gatewayUrl = this.getOneApiBaseUrl();
        const token = await this.getOneApiToken();
        resp = await fetch(`${gatewayUrl}/zia${endpoint}`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          signal: controller.signal,
        });

        // Auto-retry once on 401 with a fresh token
        if (resp.status === 401) {
          console.warn(`ZIA ${endpoint} got 401 — refreshing OneAPI token and retrying`);
          await this.invalidateOneApiToken();
          const freshToken = await this.getOneApiToken(true);
          resp = await fetch(`${gatewayUrl}/zia${endpoint}`, {
            headers: { Authorization: `Bearer ${freshToken}`, 'Content-Type': 'application/json' },
            signal: controller.signal,
          });
        }
      } else {
        const baseUrl = this.getZiaBaseUrl();
        const cookie = await this.getZiaSession();
        resp = await fetch(`${baseUrl}${endpoint}`, {
          headers: { Cookie: cookie, 'Content-Type': 'application/json' },
          signal: controller.signal,
        });
      }

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`ZIA ${endpoint} failed (${resp.status}): ${text.slice(0, 200)}`);
      }

      return resp.json() as Promise<T>;
    } finally {
      clearTimeout(timeout);
    }
  }

  async zpaFetch<T>(endpoint: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    try {
      let resp: Response;
      if (this.isOneApiConfigured()) {
        const gatewayUrl = this.getOneApiBaseUrl();
        const token = await this.getOneApiToken();
        resp = await fetch(`${gatewayUrl}/zpa${endpoint}`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          signal: controller.signal,
        });

        // Auto-retry once on 401 with a fresh token
        if (resp.status === 401) {
          console.warn(`ZPA ${endpoint} got 401 — refreshing OneAPI token and retrying`);
          await this.invalidateOneApiToken();
          const freshToken = await this.getOneApiToken(true);
          resp = await fetch(`${gatewayUrl}/zpa${endpoint}`, {
            headers: { Authorization: `Bearer ${freshToken}`, 'Content-Type': 'application/json' },
            signal: controller.signal,
          });
        }
      } else {
        const baseUrl = this.getZpaBaseUrl();
        const token = await this.getZpaToken();
        resp = await fetch(`${baseUrl}${endpoint}`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          signal: controller.signal,
        });
      }

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`ZPA ${endpoint} failed (${resp.status}): ${text.slice(0, 200)}`);
      }

      return resp.json() as Promise<T>;
    } finally {
      clearTimeout(timeout);
    }
  }

  isZdxConfigured(): boolean {
    return this.isOneApiConfigured() || !!(this.env.ZDX_API_KEY_ID && this.env.ZDX_API_SECRET);
  }

  getZdxBaseUrl(): string {
    const cloud = this.env.ZDX_CLOUD || 'zdxcloud';
    return `https://api.${cloud}.net/v1`;
  }

  async zdxFetch<T>(endpoint: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    try {
      let resp: Response;
      if (this.isOneApiConfigured()) {
        const gatewayUrl = this.getOneApiBaseUrl();
        const token = await this.getOneApiToken();
        resp = await fetch(`${gatewayUrl}/zdx/v1${endpoint}`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          signal: controller.signal,
        });

        // Auto-retry once on 401 with a fresh token
        if (resp.status === 401) {
          console.warn(`ZDX ${endpoint} got 401 — refreshing OneAPI token and retrying`);
          await this.invalidateOneApiToken();
          const freshToken = await this.getOneApiToken(true);
          resp = await fetch(`${gatewayUrl}/zdx/v1${endpoint}`, {
            headers: { Authorization: `Bearer ${freshToken}`, 'Content-Type': 'application/json' },
            signal: controller.signal,
          });
        }
      } else {
        const baseUrl = this.getZdxBaseUrl();
        const token = await this.getZdxToken();
        resp = await fetch(`${baseUrl}${endpoint}`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          signal: controller.signal,
        });
      }

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`ZDX ${endpoint} failed (${resp.status}): ${text.slice(0, 200)}`);
      }

      return resp.json() as Promise<T>;
    } finally {
      clearTimeout(timeout);
    }
  }

  // --- Dedicated ZDX Token (fallback when OneAPI unavailable) ---

  async getZdxToken(): Promise<string> {
    const cached = await this.kv.get('zdx:oauth:token');
    if (cached) return cached;

    if (this.pendingZdxToken) return this.pendingZdxToken;
    this.pendingZdxToken = this.fetchZdxToken();
    try {
      return await this.pendingZdxToken;
    } finally {
      this.pendingZdxToken = null;
    }
  }

  private pendingZdxToken: Promise<string> | null = null;

  private async fetchZdxToken(): Promise<string> {
    const baseUrl = this.getZdxBaseUrl();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OAUTH_TIMEOUT);

    try {
      const resp = await fetch(`${baseUrl}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key_id: this.env.ZDX_API_KEY_ID!,
          key_secret: this.env.ZDX_API_SECRET!,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`ZDX OAuth failed (${resp.status}): ${text}`);
      }

      const data = await resp.json() as { token: string; expiresIn?: number };
      await this.kv.put('zdx:oauth:token', data.token, { expirationTtl: 3300 });
      return data.token;
    } finally {
      clearTimeout(timeout);
    }
  }

  getAnalyticsBaseUrl(): string {
    return `${this.getOneApiBaseUrl()}/zins/graphql`;
  }
}

function obfuscateApiKey(apiKey: string, timestamp: number): string {
  const now = String(timestamp);
  const n = now.slice(-6);
  const r = String(parseInt(n, 10) >> 1).padStart(6, '0');

  let key = '';
  for (let i = 0; i < n.length; i++) {
    key += apiKey[parseInt(n[i]!, 10)] ?? '';
  }
  for (let j = 0; j < r.length; j++) {
    key += apiKey[(parseInt(r[j]!, 10)) + 2] ?? '';
  }
  return key;
}
