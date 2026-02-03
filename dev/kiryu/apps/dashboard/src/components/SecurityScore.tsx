import { clsx } from 'clsx';

interface SecurityScoreProps {
  score: number;
}

export function SecurityScore({ score }: SecurityScoreProps) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-low';
    if (s >= 60) return 'text-medium';
    if (s >= 40) return 'text-high';
    return 'text-critical';
  };

  const getScoreLabel = (s: number) => {
    if (s >= 80) return 'Good';
    if (s >= 60) return 'Fair';
    if (s >= 40) return 'Poor';
    return 'Critical';
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-slate-700"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={clsx('transition-all duration-1000', getScoreColor(score))}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={clsx('text-3xl font-bold', getScoreColor(score))}>
            {score}
          </span>
        </div>
      </div>
      <span className={clsx('mt-2 text-sm font-medium', getScoreColor(score))}>
        {getScoreLabel(score)}
      </span>
    </div>
  );
}
