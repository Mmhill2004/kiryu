import { clsx } from 'clsx';
import { CheckCircle, XCircle, AlertCircle, HelpCircle } from 'lucide-react';
import type { PlatformStatus as PlatformStatusType } from '../types/api';

interface PlatformStatusProps {
  platforms: PlatformStatusType[];
}

const platformLabels: Record<string, string> = {
  crowdstrike: 'CrowdStrike',
  abnormal: 'Abnormal Security',
  zscaler: 'Zscaler',
  microsoft: 'Microsoft Defender',
  salesforce: 'Salesforce',
};

const StatusIcon = ({ status }: { status: PlatformStatusType['status'] }) => {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="w-5 h-5 text-low" />;
    case 'error':
      return <XCircle className="w-5 h-5 text-critical" />;
    case 'not_configured':
      return <AlertCircle className="w-5 h-5 text-medium" />;
    default:
      return <HelpCircle className="w-5 h-5 text-slate-500" />;
  }
};

const statusLabels: Record<PlatformStatusType['status'], string> = {
  healthy: 'Connected',
  error: 'Error',
  not_configured: 'Not Configured',
  unknown: 'Unknown',
};

export function PlatformStatus({ platforms }: PlatformStatusProps) {
  return (
    <div className="space-y-3">
      {platforms.map((platform) => (
        <div
          key={platform.platform}
          className={clsx(
            'flex items-center justify-between p-3 rounded-lg',
            'bg-slate-800/50 border border-slate-700/50'
          )}
        >
          <div className="flex items-center gap-3">
            <StatusIcon status={platform.status} />
            <span className="text-sm font-medium text-slate-200">
              {platformLabels[platform.platform] || platform.platform}
            </span>
          </div>
          <span
            className={clsx('text-xs', {
              'text-low': platform.status === 'healthy',
              'text-critical': platform.status === 'error',
              'text-medium': platform.status === 'not_configured',
              'text-slate-500': platform.status === 'unknown',
            })}
          >
            {statusLabels[platform.status]}
          </span>
        </div>
      ))}
    </div>
  );
}
