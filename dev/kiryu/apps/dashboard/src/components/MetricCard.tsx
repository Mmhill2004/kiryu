import { clsx } from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: number | string;
  change?: string;
  icon?: ReactNode;
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
}

export function MetricCard({ label, value, change, icon, severity }: MetricCardProps) {
  const changeNum = change ? parseFloat(change) : 0;

  const TrendIcon = changeNum > 0 ? TrendingUp : changeNum < 0 ? TrendingDown : Minus;
  const trendColor = changeNum > 0 ? 'text-critical' : changeNum < 0 ? 'text-low' : 'text-slate-500';

  return (
    <div className="bg-card-bg border border-card-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-400">{label}</span>
        {icon && <span className="text-slate-500">{icon}</span>}
      </div>
      <div className="flex items-end justify-between">
        <span
          className={clsx('text-3xl font-bold', {
            'text-critical': severity === 'critical',
            'text-high': severity === 'high',
            'text-medium': severity === 'medium',
            'text-low': severity === 'low',
            'text-info': severity === 'info',
            'text-slate-100': !severity,
          })}
        >
          {value}
        </span>
        {change !== undefined && (
          <div className={clsx('flex items-center gap-1 text-sm', trendColor)}>
            <TrendIcon className="w-4 h-4" />
            <span>{Math.abs(changeNum)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
