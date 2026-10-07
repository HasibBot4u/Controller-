import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useControlCenter } from '../../context/ControlCenterContext.tsx';

export const OfflineBanner: React.FC = () => {
  const { isOnline, triggerRefresh } = useControlCenter();

  if (isOnline) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 bg-amber-500 text-slate-950 px-4 py-2.5 shadow-lg border-b border-amber-600 flex items-start sm:items-center justify-between gap-3 text-xs sm:text-sm animate-in slide-in-from-top duration-200"
    >
      <div className="flex items-start sm:items-center gap-2.5">
        <WifiOff className="w-5 h-5 flex-shrink-0 text-slate-950 mt-0.5 sm:mt-0 animate-pulse" />
        <div>
          <div className="font-bold tracking-wide uppercase flex items-center gap-1.5">
            <span>OFFLINE / DISCONNECTED</span>
            <span className="text-[10px] font-mono bg-slate-950 text-amber-300 px-1.5 py-0.2 rounded font-semibold">
              REMOTE VM STILL EXECUTING
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-900 leading-tight mt-0.5">
            Control connection unavailable. Remote execution state will be checked after reconnection.
          </p>
        </div>
      </div>
      <button
        onClick={triggerRefresh}
        className="flex-shrink-0 bg-slate-950 text-amber-400 hover:bg-slate-900 active:scale-95 px-2.5 py-1.5 rounded text-xs font-mono font-medium flex items-center gap-1 transition-transform cursor-pointer"
        aria-label="Retry connection check"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span className="hidden xs:inline">Check</span>
      </button>
    </div>
  );
};
