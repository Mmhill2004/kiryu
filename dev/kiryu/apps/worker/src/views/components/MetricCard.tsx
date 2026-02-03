import type { FC } from 'hono/jsx';

interface Props {
  label: string;
  value: number | string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
}

export const MetricCard: FC<Props> = ({ label, value, severity }) => {
  const severityClass = severity ? `severity-${severity}` : '';

  return (
    <div class={`metric-card ${severityClass}`}>
      <div class={`metric-value ${severityClass}`}>{value}</div>
      <div class="metric-label">{label}</div>
    </div>
  );
};
