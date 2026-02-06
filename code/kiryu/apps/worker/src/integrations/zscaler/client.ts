import type { Env } from '../../types/env';

interface ZscalerSession {
  cookie: string;
  expires_at: number;
}

interface SecurityEvent {
  id: string;
  datetime: string;
  category: string;
  severity: string;
  url: string;
  user: string;
  action: string;
  threatName?: string;
}

interface WebActivity {
  totalTransactions: number;
  blockedTransactions: number;
  allowedTransactions: number;
  bandwidth: number;
}

export class ZscalerClient {
  private baseUrl: string;
  private session: ZscalerSession | null = null;

  constructor(private env: Env) {
    this.baseUrl = env.ZSCALER_BASE_URL || 'https://zsapi.zscaler.net/api/v1';
  }

  /**
   * Authenticate and get session
   */
  private async authenticate(): Promise<string> {
    if (this.session && this.session.expires_at > Date.now()) {
      return this.session.cookie;
    }

    const timestamp = Date.now().toString();
    const apiKey = this.env.ZSCALER_API_KEY;
    
    // Zscaler uses a unique obfuscation for the API key
    // This is a simplified version - check Zscaler docs for actual implementation
    const obfuscatedKey = this.obfuscateApiKey(apiKey, timestamp);

    const response = await fetch(`${this.baseUrl}/authenticatedSession`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: obfuscatedKey,
        username: this.env.ZSCALER_API_KEY,
        password: this.env.ZSCALER_API_SECRET,
        timestamp,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Zscaler authentication failed: ${error}`);
    }

    // Get session cookie from response
    const cookie = response.headers.get('set-cookie') || '';
    
    this.session = {
      cookie,
      expires_at: Date.now() + (30 * 60 * 1000), // 30 minute session
    };

    return this.session.cookie;
  }

  /**
   * Obfuscate API key (Zscaler-specific)
   */
  private obfuscateApiKey(apiKey: string, timestamp: string): string {
    // Note: This is a placeholder. Zscaler has specific obfuscation requirements.
    // Refer to Zscaler API documentation for the actual implementation.
    return apiKey;
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const cookie = await this.authenticate();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Zscaler API error: ${response.status} ${error}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get security events
   */
  async getSecurityEvents(hours = 24): Promise<SecurityEvent[]> {
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const endTime = new Date().toISOString();

    try {
      // This endpoint may vary based on Zscaler product (ZIA, ZPA, etc.)
      const response = await this.request<{ logs: SecurityEvent[] }>(
        `/webApplicationRules/security?startTime=${startTime}&endTime=${endTime}`
      );
      return response.logs || [];
    } catch (error) {
      console.warn('Failed to get Zscaler security events:', error);
      return [];
    }
  }

  /**
   * Get web activity summary
   */
  async getWebActivity(): Promise<WebActivity> {
    try {
      const response = await this.request<WebActivity>('/webActivity/summary');
      return response;
    } catch (error) {
      console.warn('Failed to get web activity:', error);
      return {
        totalTransactions: 0,
        blockedTransactions: 0,
        allowedTransactions: 0,
        bandwidth: 0,
      };
    }
  }

  /**
   * Get blocked URL categories
   */
  async getBlockedCategories(): Promise<Array<{ category: string; count: number }>> {
    try {
      const response = await this.request<{ categories: Array<{ category: string; count: number }> }>(
        '/urlCategories/blocked'
      );
      return response.categories || [];
    } catch (error) {
      console.warn('Failed to get blocked categories:', error);
      return [];
    }
  }

  /**
   * End session (logout)
   */
  async logout(): Promise<void> {
    if (this.session) {
      try {
        await fetch(`${this.baseUrl}/authenticatedSession`, {
          method: 'DELETE',
          headers: {
            'Cookie': this.session.cookie,
          },
        });
      } catch (error) {
        console.warn('Failed to logout from Zscaler:', error);
      }
      this.session = null;
    }
  }
}
