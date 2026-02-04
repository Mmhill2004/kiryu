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
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <span class="platform-name">{p.platform}</span>
            <span>
              <span class={`status-dot status-${p.status}`} />
              {statusLabels[p.status] || p.status}
            </span>
          </div>
          {p.error_message && (
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem; word-break: break-word;">
              {p.error_message.slice(0, 100)}{p.error_message.length > 100 ? '...' : ''}
            </div>
          )}
          {p.last_sync && (
            <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.15rem;">
              Last sync: {new Date(p.last_sync).toLocaleString()}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
};
