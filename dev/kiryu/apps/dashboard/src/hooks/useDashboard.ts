import { useState, useEffect, useCallback } from 'react';
import type { DashboardSummary, PlatformStatus, Incident, TicketMetrics, Period } from '../types/api';
import * as api from '../lib/api';

interface DashboardState {
  summary: DashboardSummary | null;
  platforms: PlatformStatus[];
  incidents: Incident[];
  tickets: TicketMetrics | null;
  loading: boolean;
  error: string | null;
}

export function useDashboard(period: Period = '7d') {
  const [state, setState] = useState<DashboardState>({
    summary: null,
    platforms: [],
    incidents: [],
    tickets: null,
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [summaryRes, platformsRes, incidentsRes, ticketsRes] = await Promise.all([
        api.getDashboardSummary(period),
        api.getPlatformStatus(),
        api.getRecentIncidents(10),
        api.getTicketMetrics(period),
      ]);

      setState({
        summary: summaryRes,
        platforms: platformsRes.platforms,
        incidents: incidentsRes.incidents,
        tickets: ticketsRes,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load dashboard',
      }));
    }
  }, [period]);

  useEffect(() => {
    fetchData();

    // Refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { ...state, refresh: fetchData };
}
