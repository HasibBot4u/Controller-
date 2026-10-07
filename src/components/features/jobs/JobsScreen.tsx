import React, { useEffect, useState } from 'react';
import { useControlCenter } from '../../../context/ControlCenterContext.tsx';
import { BackgroundJob } from '../../../domain/models/index.ts';
import {
  Cpu,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Plus,
  Terminal,
  XCircle,
} from 'lucide-react';

export const JobsScreen: React.FC = () => {
  const { services, refreshKey, triggerRefresh } = useControlCenter();
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    services.jobsApi.getJobs().then((res) => {
      if (isMounted) {
        setJobs(res.data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [services, refreshKey]);

  const handleTrigger = async (type: string, title: string) => {
    await services.jobsApi.triggerJob(type, title);
    triggerRefresh();
  };

  const handleCancel = async (id: string) => {
    await services.jobsApi.cancelJob(id);
    triggerRefresh();
  };

  return (
    <div className="p-3.5 sm:p-6 space-y-4 max-w-5xl mx-auto pb-28 animate-in fade-in duration-150">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
            <span>Remote Background Jobs</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {jobs.length}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Asynchronous jobs managed by systemd & cgroup runners on Oracle Linux
          </p>
        </div>

        <button
          onClick={() => handleTrigger('BUILD', 'Manual Full Project Clean & Build')}
          className="h-9 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs font-mono flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow-md shadow-amber-950"
        >
          <Plus className="w-4 h-4" />
          <span>Trigger Job</span>
        </button>
      </div>

      <div className="space-y-2.5 font-mono text-xs">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/90 space-y-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-200 text-xs sm:text-sm">{job.title}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                    {job.type}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{job.id} • Started {new Date(job.startedAt).toLocaleTimeString()}</div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                    job.status === 'RUNNING'
                      ? 'bg-amber-950/60 border-amber-600/50 text-amber-300 animate-pulse'
                      : job.status === 'SUCCESS'
                      ? 'bg-emerald-950/60 border-emerald-600/50 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {job.status}
                </span>

                {job.status === 'RUNNING' && (
                  <button
                    onClick={() => handleCancel(job.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                    title="Cancel Job"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Progress: {job.progressPercent}%</span>
                <span>Duration: {(job.durationMs / 1000).toFixed(1)}s</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    job.status === 'SUCCESS' ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                  style={{ width: `${job.progressPercent}%` }}
                />
              </div>
            </div>

            {/* Command */}
            <div className="p-2 bg-black/40 border border-slate-800 rounded-lg text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
              <Terminal className="w-3 h-3 text-slate-500 flex-shrink-0" />
              <span className="truncate">{job.command}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
