import React from 'react';
import { RiskLevel } from '../../domain/enums/index.ts';
import { ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react';

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, className = '' }) => {
  switch (level) {
    case RiskLevel.SAFE:
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 ${className}`}>
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          SAFE
        </span>
      );
    case RiskLevel.CONFIRM:
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-950/60 border border-amber-600/50 text-amber-300 ${className}`}>
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          CONFIRM
        </span>
      );
    case RiskLevel.STRONG_CONFIRM:
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-rose-950/80 border border-rose-600/60 text-rose-200 animate-pulse ${className}`}>
          <ShieldAlert className="w-3 h-3 text-rose-400" />
          STRONG_CONFIRM
        </span>
      );
    default:
      return null;
  }
};
