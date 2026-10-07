import React from 'react';
import { HealthStatus } from '../../domain/enums/index.ts';

interface HealthBadgeProps {
  status: HealthStatus;
  label?: string;
  showDotOnly?: boolean;
  className?: string;
}

export const HealthBadge: React.FC<HealthBadgeProps> = ({
  status,
  label,
  showDotOnly = false,
  className = '',
}) => {
  let dotColor = 'bg-slate-400';
  let badgeColor = 'bg-slate-800/80 border-slate-700 text-slate-300';
  let defaultLabel = 'Unknown';

  switch (status) {
    case HealthStatus.HEALTHY:
      dotColor = 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]';
      badgeColor = 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300';
      defaultLabel = 'Healthy';
      break;
    case HealthStatus.DEGRADED:
      dotColor = 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse';
      badgeColor = 'bg-amber-950/40 border-amber-800/50 text-amber-300';
      defaultLabel = 'Degraded';
      break;
    case HealthStatus.UNAVAILABLE:
      dotColor = 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse';
      badgeColor = 'bg-rose-950/40 border-rose-800/50 text-rose-300';
      defaultLabel = 'Unavailable';
      break;
    case HealthStatus.UNKNOWN:
    default:
      dotColor = 'bg-blue-400';
      badgeColor = 'bg-blue-950/40 border-blue-800/50 text-blue-300';
      defaultLabel = 'Unknown';
      break;
  }

  if (showDotOnly) {
    return (
      <span className={`inline-block w-2.5 h-2.5 rounded-full ${dotColor} ${className}`} title={label || defaultLabel} />
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono border ${badgeColor} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{label || defaultLabel}</span>
    </span>
  );
};
