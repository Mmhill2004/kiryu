import type { FC } from 'hono/jsx';

interface TrendInfo {
  direction: 'up' | 'down' | 'flat';
  changePercent: number;
  invertColor?: boolean;
}

interface Props {
  label: string;
  value: number | string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  trend?: TrendInfo;
  source?: 'CS' | 'SF' | 'MS' | 'ZS' | 'MK';
  compact?: boolean;
}

export const MetricCard: FC<Props> = ({ label, value, severity, trend, source, compact }) => {
  const severityClass = severity ? `severity-${severity}` : '';

  const trendArrow = trend && trend.direction !== 'flat'
    ? trend.direction === 'up' ? '\u2191' : '\u2193'
    : null;

  const trendColorClass = trend && trend.direction !== 'flat'
    ? (trend.direction === 'up' && !trend.invertColor) || (trend.direction === 'down' && trend.invertColor)
      ? 'trend-bad'
      : 'trend-good'
    : '';

  return (
    <div class={`metric-card ${severityClass} ${compact ? 'metric-card-sm' : ''}`}>
      <div class={`metric-value ${severityClass}`}>{value}</div>
      <div class="metric-label">{label}</div>
      {trend && trend.direction !== 'flat' && (
        <div class={`metric-trend ${trendColorClass}`}>
          {trendArrow} {Math.abs(trend.changePercent).toFixed(1)}%
        </div>
      )}
      {source && <div class="metric-source">{source}</div>}
    </div>
  );
};
