import type { DashboardSummary, PlatformStatus, Incident, TicketMetrics, Period } from '../types/api';

const API_BASE = import.meta.env.VITE_API_URL || 'https://security-dashboard-api.rodgersbuilders.workers.dev/api';

async function fetchApi<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'X-API-Key': import.meta.env.VITE_API_KEY || 'dev-key',
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export async function getDashboardSummary(period: Period = '7d'): Promise<DashboardSummary> {
  return fetchApi<DashboardSummary>(`/dashboard/summary?period=${period}`);
}

export async function getPlatformStatus(): Promise<{ platforms: PlatformStatus[]; lastChecked: string }> {
  return fetchApi(`/dashboard/platforms/status`);
}

export async function getRecentIncidents(limit = 20): Promise<{ incidents: Incident[]; total: number }> {
  return fetchApi(`/dashboard/incidents/recent?limit=${limit}`);
}

export async function getTicketMetrics(period: Period = '7d'): Promise<TicketMetrics> {
  return fetchApi<TicketMetrics>(`/dashboard/tickets/metrics?period=${period}`);
}
