import type { FC } from 'hono/jsx';

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface Props {
  segments: Segment[];
  centerLabel?: string;
}

export const DonutChart: FC<Props> = ({ segments, centerLabel }) => {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) {
    return <p class="no-data">No data</p>;
  }

  const r = 40;
  const circumference = 2 * Math.PI * r;
  let cumulativeOffset = 0;

  const arcs = segments.filter(s => s.value > 0).map((seg) => {
    const pct = seg.value / total;
    const dashLen = pct * circumference;
    const gap = circumference - dashLen;
    const offset = -cumulativeOffset;
    cumulativeOffset += dashLen;
    return { ...seg, dashLen, gap, offset };
  });

  return (
    <div class="donut">
      <div class="donut-ring">
        <svg viewBox="0 0 100 100">
          <circle fill="none" stroke="var(--border-dim)" stroke-width="14" cx="50" cy="50" r={r} />
          {arcs.map((arc) => (
            <circle
              key={arc.label}
              class="donut-segment"
              cx="50" cy="50" r={r}
              stroke={arc.color}
              stroke-dasharray={`${arc.dashLen} ${arc.gap}`}
              stroke-dashoffset={arc.offset}
            />
          ))}
        </svg>
        <div class="donut-center">
          <span class="donut-total">{total}</span>
          {centerLabel && <span class="donut-total-label">{centerLabel}</span>}
        </div>
      </div>
      <div class="donut-legend">
        {segments.filter(s => s.value > 0).map((seg) => (
          <span class="donut-legend-item" key={seg.label}>
            <span class="donut-legend-dot" style={`background: ${seg.color}`} />
            {seg.label}: <span class="donut-legend-value">{seg.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
};
