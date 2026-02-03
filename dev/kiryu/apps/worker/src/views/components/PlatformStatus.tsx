import type { FC } from 'hono/jsx';

interface Platform {
  platform: string;
  status: 'healthy' | 'error' | 'not_configured' | 'unknown';
  last_sync: string | null;
  error_message?: string;
}

interface Props {
  platforms: Platform[];
}

const statusLabels: Record<string, string> = {
  healthy: 'Healthy',
  error: 'Error',
  not_configured: 'Not Configured',
  unknown: 'Unknown',
};

export const PlatformStatus: FC<Props> = ({ platforms }) => {
  return (
    <ul class="platform-list">
      {platforms.map((p) => (
        <li class="platform-item" key={p.platform}>
          <span class="platform-name">{p.platform}</span>
          <span>
            <span class={`status-dot status-${p.status}`} />
            {statusLabels[p.status] || p.status}
          </span>
        </li>
      ))}
    </ul>
  );
};
