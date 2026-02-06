import type { FC } from 'hono/jsx';

interface Props {
  data: {
    endpoint: number;
    email: number;
    web: number;
    cloud: number;
  };
  labels?: {
    endpoint?: string;
    email?: string;
    web?: string;
    cloud?: string;
  };
}

export const ThreatChart: FC<Props> = ({ data, labels }) => {
  const max = Math.max(data.endpoint, data.email, data.web, data.cloud, 1);

  const defaultLabels = {
    endpoint: 'Endpoint',
    email: 'Email',
    web: 'Web',
    cloud: 'Cloud',
  };

  const finalLabels = { ...defaultLabels, ...labels };

  const categories = [
    { key: 'endpoint', label: finalLabels.endpoint, value: data.endpoint },
    { key: 'email', label: finalLabels.email, value: data.email },
    { key: 'web', label: finalLabels.web, value: data.web },
    { key: 'cloud', label: finalLabels.cloud, value: data.cloud },
  ].filter(cat => cat.value > 0 || !labels); // Hide zero values if custom labels provided

  if (categories.length === 0) {
    return <p class="no-data">No data</p>;
  }

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
