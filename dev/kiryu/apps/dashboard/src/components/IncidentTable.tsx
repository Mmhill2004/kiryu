import type { Incident } from '../types/api';
import { SeverityBadge } from './SeverityBadge';
import { formatDistanceToNow } from 'date-fns';

interface IncidentTableProps {
  incidents: Incident[];
}

const sourceLabels: Record<string, string> = {
  crowdstrike: 'CrowdStrike',
  abnormal: 'Abnormal',
  zscaler: 'Zscaler',
  microsoft: 'Microsoft',
  salesforce: 'Salesforce',
};

export function IncidentTable({ incidents }: IncidentTableProps) {
  if (incidents.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No recent incidents
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-slate-400 text-sm border-b border-card-border">
            <th className="pb-3 font-medium">Severity</th>
            <th className="pb-3 font-medium">Title</th>
            <th className="pb-3 font-medium">Source</th>
            <th className="pb-3 font-medium">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-card-border">
          {incidents.map((incident) => (
            <tr key={incident.id} className="text-sm">
              <td className="py-3">
                <SeverityBadge severity={incident.severity} />
              </td>
              <td className="py-3 text-slate-200 max-w-xs truncate">
                {incident.title}
              </td>
              <td className="py-3 text-slate-400">
                {sourceLabels[incident.source] || incident.source}
              </td>
              <td className="py-3 text-slate-400">
                {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
