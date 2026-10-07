import React, { useEffect, useState } from 'react';
import { useControlCenter } from '../../../context/ControlCenterContext.tsx';
import { DashboardState, Activity, PendingApproval } from '../../../domain/models/index.ts';
import { HealthBadge } from '../../common/HealthBadge.tsx';
import { StatusPill } from '../../common/StatusPill.tsx';
import { RiskBadge } from '../../common/RiskBadge.tsx';
import { ActivityStatus, HealthStatus, RiskLevel } from '../../../domain/enums/index.ts';
import {
  Server,
  Cpu,
  HardDrive,
  Clock,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Play,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Radio,
  ExternalLink,
  DollarSign,
  Layers,
  FolderGit2,
} from 'lucide-react';

export const HomeScreen: React.FC = () => {
  const { services, refreshKey, setCurrentScreen, setSelectedActivityId, requestApproval } = useControlCenter();
  const [dashboard, setDashboard] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    services.dashboardApi
      .getDashboardState()
      .then((res) => {
        if (isMounted) {
          setDashboard(res.data);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Failed to fetch dashboard state');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [services, refreshKey]);

  if (loading && !dashboard) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[50vh] text-slate-400 font-mono text-xs">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 animate-spin text-amber-400" />
          <span>Polling remote control plane telemetry...</span>
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="p-4 max-w-xl mx-auto">
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
          <span className="font-bold block mb-1">Telemetry Fetch Error</span>
          {error || 'Unable to connect to remote control plane.'}
        </div>
      </div>
    );
  }

  const { systemStatus, serverSummary, workSummary, aiSummary, recentActivities, pendingApprovals } = dashboard;

  const handleOpenActivity = (actId: string) => {
    setSelectedActivityId(actId);
    setCurrentScreen('activities');
  };

  return (
    <div className="p-3.5 sm:p-6 space-y-4 max-w-5xl mx-auto pb-24 animate-in fade-in duration-150">
      {/* Thin-client Remote Banner */}
      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
          <div>
            <div className="font-mono font-semibold text-slate-200 flex items-center gap-2">
              <span>Remote Execution Host</span>
              <span className="text-[10px] text-amber-400 font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                NOT_CONFIGURED
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden xs:block">
              Control Plane: HEALTHY • Thin Client • Persistence: IN_MEMORY — PHASE 1
            </p>
          </div>
        </div>
        <button
          onClick={() => setCurrentScreen('monitor')}
          className="text-[11px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
        >
          <span>Monitor</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Pending Approvals Callout (if any) */}
      {pendingApprovals && pendingApprovals.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wider font-mono">
              <ShieldAlert className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Pending Authorization ({pendingApprovals.length})</span>
            </div>
            <span className="text-[10px] font-mono text-amber-400/80">Action Required</span>
          </div>

          <div className="space-y-2">
            {pendingApprovals.map((appr) => (
              <div
                key={appr.id}
                className="p-3 rounded-lg bg-black/40 border border-amber-800/40 flex items-start justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200 truncate">{appr.title}</span>
                    <RiskBadge level={appr.riskLevel} />
                  </div>
                  <p className="text-slate-400 text-[11px] mt-0.5 line-clamp-1">{appr.description}</p>
                </div>
                <button
                  onClick={() => handleOpenActivity(appr.activityId)}
                  className="flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold font-mono flex items-center gap-1 transition-transform active:scale-95 cursor-pointer"
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Status Grid */}
      <section className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
          <span className="uppercase tracking-wider">Subsystem Status</span>
          <span className="text-[10px]">7 Services Monitored</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {Object.entries(systemStatus).map(([name, status]) => (
            <div
              key={name}
              className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-[11px] font-mono uppercase tracking-tight text-slate-400 truncate">
                  {name}
                </span>
                <HealthBadge status={status} showDotOnly />
              </div>
              <HealthBadge status={status} className="w-fit text-[10px]" />
            </div>
          ))}
        </div>
      </section>

      {/* Work Summary Cards */}
      <section className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
          <span className="uppercase tracking-wider">Workload Summary</span>
          <button
            onClick={() => setCurrentScreen('activities')}
            className="text-amber-400 hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
          >
            All Activities <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-mono">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Running</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-100 mt-1">
              {workSummary.runningActivities}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-mono">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Approvals</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-100 mt-1">
              {workSummary.waitingApprovals}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-mono">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Recoverable</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-100 mt-1">
              {workSummary.recoverableActivities}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-blue-400 text-xs font-mono">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Completed</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-100 mt-1">
              {workSummary.completedActivities}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 col-span-2 xs:col-span-1">
            <div className="flex items-center gap-1.5 text-rose-400 text-xs font-mono">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Failed</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-100 mt-1">
              {workSummary.failedActivities}
            </div>
          </div>
        </div>
      </section>

      {/* AI Telemetry & Server Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Server Summary Card */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-300">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-amber-400" />
              <span className="font-semibold uppercase tracking-wider">Oracle Host Resources</span>
            </div>
            <span className="text-[11px] text-slate-400">ARM Ampere 4-Core</span>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span className="flex items-center gap-1">
                  <Cpu className="w-3 h-3" /> CPU Load
                </span>
                <span className="text-slate-200 font-semibold">{serverSummary.cpuPercent}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all"
                  style={{ width: `${serverSummary.cpuPercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>RAM Usage</span>
                <span className="text-slate-200 font-semibold">
                  {serverSummary.memoryUsedGb} / {serverSummary.memoryTotalGb} GB ({serverSummary.memoryPercent}%)
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all"
                  style={{ width: `${serverSummary.memoryPercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span className="flex items-center gap-1">
                  <HardDrive className="w-3 h-3" /> Disk NVMe
                </span>
                <span className="text-slate-200 font-semibold">
                  {serverSummary.diskUsedGb} / {serverSummary.diskTotalGb} GB ({serverSummary.diskPercent}%)
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all"
                  style={{ width: `${serverSummary.diskPercent}%` }}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" /> Uptime:
              </span>
              <span className="text-slate-300 font-semibold">{serverSummary.uptimeFormatted}</span>
            </div>
          </div>
        </div>

        {/* AI Summary Card */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-300">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="font-semibold uppercase tracking-wider">AI Operations</span>
            </div>
            <button
              onClick={() => setCurrentScreen('models')}
              className="text-[11px] text-amber-400 hover:underline cursor-pointer"
            >
              Routing Matrix
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block mb-0.5">Active Provider</span>
              <span className="font-semibold text-slate-200">{aiSummary.currentProvider}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block mb-0.5">Active Model</span>
              <span className="font-semibold text-amber-300 text-[11px] truncate block">
                {aiSummary.currentModel}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block mb-0.5">Today Requests</span>
              <span className="font-semibold text-slate-100">{aiSummary.todayRequests} runs</span>
            </div>
            <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block mb-0.5">Today Cost</span>
              <span className="font-semibold text-emerald-400">
                ${(aiSummary.todayEstimatedCost ?? 0).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Weekly: ${(aiSummary.weeklyCost ?? 0).toFixed(2)}</span>
            <span>Monthly Run-rate: ${(aiSummary.monthlyCost ?? 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Recent Activities List */}
      <section className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
          <span className="uppercase tracking-wider">Recent Activities</span>
          <button
            onClick={() => setCurrentScreen('activities')}
            className="text-amber-400 hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
          >
            View all ({recentActivities.length}) <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2">
          {recentActivities.slice(0, 4).map((activity) => (
            <div
              key={activity.id}
              onClick={() => handleOpenActivity(activity.id)}
              className="p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800/90 transition-all cursor-pointer space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-xs sm:text-sm text-slate-100 truncate">
                      {activity.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 mt-0.5">
                    <span className="text-slate-300 font-medium">{activity.projectId}</span>
                    <span>•</span>
                    <span className="truncate">{activity.gitBranch}</span>
                  </div>
                </div>
                <StatusPill status={activity.status} />
              </div>

              {activity.currentAction && (
                <div className="p-2 rounded-lg bg-black/40 border border-slate-800/60 text-[11px] font-mono text-slate-300 flex items-start gap-1.5">
                  <span className="text-amber-400 flex-shrink-0">›</span>
                  <span className="line-clamp-1">{activity.currentAction}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1">
                <span>Model: {activity.model}</span>
                <span>
                  {new Date(activity.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
