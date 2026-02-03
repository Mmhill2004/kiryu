import type { FC } from 'hono/jsx';

interface Props {
  data: {
    endpoint: number;
    email: number;
    web: number;
    cloud: number;
  };
}

export const ThreatChart: FC<Props> = ({ data }) => {
  const max = Math.max(data.endpoint, data.email, data.web, data.cloud, 1);

  const categories = [
    { key: 'endpoint', label: 'Endpoint', value: data.endpoint },
    { key: 'email', label: 'Email', value: data.email },
    { key: 'web', label: 'Web', value: data.web },
    { key: 'cloud', label: 'Cloud', value: data.cloud },
  ];

  return (
    <div>
      {categories.map((cat) => (
        <div class="chart-bar" key={cat.key}>
          <span class="chart-label">{cat.label}</span>
          <div class="chart-track">
            <div
              class={`chart-fill chart-fill-${cat.key}`}
              style={`width: ${(cat.value / max) * 100}%`}
            />
          </div>
          <span class="chart-value">{cat.value}</span>
        </div>
      ))}
    </div>
  );
};
