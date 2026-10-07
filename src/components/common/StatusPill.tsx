import React from 'react';
import { ActivityStatus } from '../../domain/enums/index.ts';
import {
  Play,
  Clock,
  AlertCircle,
  Pause,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Radio,
  FileCode,
  ShieldAlert,
} from 'lucide-react';

interface StatusPillProps {
  status: ActivityStatus;
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, className = '', size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  switch (status) {
    case ActivityStatus.RUNNING:
      return (
        <span className={`inline-flex items-center gap-1 rounded font-mono font-medium bg-emerald-950/70 border border-emerald-500/60 text-emerald-300 ${sizeClasses} ${className}`}>
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
          RUNNING
        </span>
      );
    case ActivityStatus.WAITING_APPROVAL:
      return (
        <span className={`inline-flex items-center gap-1 rounded font-mono font-medium bg-amber-950/80 border border-amber-500/70 text-amber-300 animate-pulse ${sizeClasses} ${className}`}>
          <ShieldAlert className="w-3 h-3 text-amber-400" />
          WAITING APPROVAL
        </span>
      );
    case ActivityStatus.RECOVERABLE:
      return (
        <span className={`inline-flex items-center gap-1 rounded font-mono font-medium bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 ${sizeClasses} ${className}`}>
          <RotateCcw className="w-3 h-3 text-cyan-400" />
          RECOVERABLE
        </span>
      );
    case ActivityStatus.PAUSED:
      return (
        <span className={`inline-flex items-center gap-1 rounded font-mono font-medium bg-slate-800 border border-slate-600 text-slate-300 ${sizeClasses} ${className}`}>
          <Pause className="w-3 h-3 text-slate-400" />
          PAUSED
        </span>
      );
    case ActivityStatus.COMPLETED:
      return (
        <span className={`inline-flex items-center gap-1 rounded font-mono font-medium bg-blue-950/70 border border-blue-500/50 text-blue-300 ${sizeClasses} ${className}`}>
          <CheckCircle2 className="w-3 h-3 text-blue-400" />
          COMPLETED
        </span>
      );
    case ActivityStatus.FAILED:
      return (
        <span className={`inline-flex items-center gap-1 rounded font-mono font-medium bg-rose-950/80 border border-rose-500/60 text-rose-300 ${sizeClasses} ${className}`}>
          <XCircle className="w-3 h-3 text-rose-400" />
          FAILED
        </span>
      );
    case ActivityStatus.QUEUED:
      return (
        <span className={`inline-flex items-center gap-1 rounded font-mono font-medium bg-purple-950/70 border border-purple-500/50 text-purple-300 ${sizeClasses} ${className}`}>
          <Clock className="w-3 h-3 text-purple-400" />
          QUEUED
        </span>
      );
    case ActivityStatus.STARTING:
      return (
        <span className={`inline-flex items-center gap-1 rounded font-mono font-medium bg-indigo-950/70 border border-indigo-500/50 text-indigo-300 ${sizeClasses} ${className}`}>
          <Play className="w-3 h-3 text-indigo-400 animate-spin" />
          STARTING
        </span>
      );
    case ActivityStatus.INTERRUPTED:
    case ActivityStatus.DETACHED:
      return (
        <span className={`inline-flex items-center gap-1 rounded font-mono font-medium bg-orange-950/70 border border-orange-500/50 text-orange-300 ${sizeClasses} ${className}`}>
          <AlertCircle className="w-3 h-3 text-orange-400" />
          {status}
        </span>
      );
    case ActivityStatus.DRAFT:
    default:
      return (
        <span className={`inline-flex items-center gap-1 rounded font-mono font-medium bg-slate-900 border border-slate-700 text-slate-400 ${sizeClasses} ${className}`}>
          <FileCode className="w-3 h-3" />
          {status}
        </span>
      );
  }
};
