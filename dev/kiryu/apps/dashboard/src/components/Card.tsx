import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Card({ title, children, className }: CardProps) {
  return (
    <div className={clsx(
      'bg-card-bg border border-card-border rounded-xl p-6',
      className
    )}>
      {title && (
        <h3 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wide">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
