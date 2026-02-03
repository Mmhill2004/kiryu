import { clsx } from 'clsx';

interface SeverityBadgeProps {
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        {
          'bg-critical/20 text-critical': severity === 'critical',
          'bg-high/20 text-high': severity === 'high',
          'bg-medium/20 text-medium': severity === 'medium',
          'bg-low/20 text-low': severity === 'low',
        }
      )}
    >
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );
}
