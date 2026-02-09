import type { FC } from 'hono/jsx';

interface Props {
  value: number;
  max?: number;
  label: string;
  sublabel?: string;
  color?: string;
  size?: 'sm' | 'md';
}

export const GaugeChart: FC<Props> = ({ value, max = 100, label, sublabel, color, size = 'md' }) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  const autoColor = pct >= 80 ? 'var(--healthy)' : pct >= 50 ? 'var(--medium)' : 'var(--critical)';
  const strokeColor = color ?? autoColor;
  const displayValue = max === 100 ? `${Math.round(value)}` : `${Math.round(value)}`;
  const displaySuffix = max === 100 ? '%' : '';

  return (
    <div class={`gauge ${size === 'sm' ? 'gauge-sm' : ''}`}>
      <div class="gauge-ring">
        <svg viewBox="0 0 100 100">
          <circle class="gauge-track" cx="50" cy="50" r={r} />
          <circle
            class="gauge-fill"
            cx="50" cy="50" r={r}
            stroke={strokeColor}
            stroke-dasharray={circumference}
            stroke-dashoffset={offset}
          />
        </svg>
        <div class="gauge-center">
          <span class="gauge-value" style={`color: ${strokeColor}`}>{displayValue}{displaySuffix}</span>
          {sublabel && <span class="gauge-sub">{sublabel}</span>}
        </div>
      </div>
      <div class="gauge-label">{label}</div>
    </div>
  );
};
