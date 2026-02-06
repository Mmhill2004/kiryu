import type { FC } from 'hono/jsx';

interface Incident {
  id: string;
  source: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  created_at: string;
}

interface Props {
  incidents: Incident[];
}

export const IncidentTable: FC<Props> = ({ incidents }) => {
  if (incidents.length === 0) {
    return (
      <p style="color: var(--text-muted); text-align: center; padding: 2rem;">
        No incidents to display
      </p>
    );
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Source</th>
          <th>Title</th>
          <th>Severity</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {incidents.map((incident) => (
          <tr key={incident.id}>
            <td style="text-transform: capitalize;">{incident.source}</td>
            <td>{incident.title}</td>
            <td>
              <span class={`badge badge-${incident.severity}`}>
                {incident.severity}
              </span>
            </td>
            <td style="text-transform: capitalize;">{incident.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
