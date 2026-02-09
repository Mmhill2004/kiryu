export interface CacheEntry<T> {
  data: T;
  cachedAt: string;
  expiresAt: string;
}

export class CacheService {
  constructor(private kv: KVNamespace) {}

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const raw = await this.kv.get(key, 'text');
      if (!raw) return null;
      return JSON.parse(raw) as CacheEntry<T>;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, data: T, ttlSeconds: number = CACHE_TTL.DASHBOARD_DATA): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

      const entry: CacheEntry<T> = {
        data,
        cachedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      await this.kv.put(key, JSON.stringify(entry), {
        expirationTtl: ttlSeconds,
      });
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  async invalidate(key: string): Promise<void> {
    try {
      await this.kv.delete(key);
    } catch (error) {
      console.error(`Cache invalidate error for key ${key}:`, error);
    }
  }

  async invalidatePrefix(prefix: string): Promise<void> {
    try {
      let cursor: string | undefined;
      do {
        const list = await this.kv.list({ prefix, cursor });
        await Promise.all(list.keys.map((k: { name: string }) => this.kv.delete(k.name)));
        cursor = list.list_complete ? undefined : list.cursor;
      } while (cursor);
    } catch (error) {
      console.error(`Cache invalidate prefix error for ${prefix}:`, error);
    }
  }
}

export const CACHE_KEYS = {
  CROWDSTRIKE_SUMMARY: 'cs:summary',
  SALESFORCE_METRICS: 'sf:metrics',
  MICROSOFT_SUMMARY: 'ms:summary',
  ZSCALER_SUMMARY: 'zs:summary',
  MERAKI_SUMMARY: 'mk:summary',
  CROWDSTRIKE_TOKEN: 'auth:cs:token',
  SALESFORCE_TOKEN: 'auth:sf:token',
  REPORT_GENERATED: 'report:generated',
} as const;

export const CACHE_TTL = {
  DASHBOARD_DATA: 300,      // 5 minutes
  OAUTH_TOKEN_CS: 1740,     // 29 minutes (CS tokens last 30 min)
  OAUTH_TOKEN_SF: 7080,     // 118 minutes (SF tokens last ~2 hours)
  OAUTH_TOKEN_MS: 3480,     // 58 minutes (MS tokens last ~60 min, per-scope)
} as const;
