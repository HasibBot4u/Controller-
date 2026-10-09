import React, { useEffect, useState } from 'react';
import { useControlCenter } from '../../../context/ControlCenterContext.tsx';
import { GitHubRepoStatus } from '../../../domain/models/index.ts';
import { RiskLevel } from '../../../domain/enums/index.ts';
import {
  Github,
  GitBranch,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

export const GitHubScreen: React.FC = () => {
  const { services, requestApproval, serviceMode } = useControlCenter();
  const [status, setStatus] = useState<GitHubRepoStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    services.gitHubApi.getStatus().then((res) => {
      setStatus(res.data);
      setLoading(false);
    });
  }, [services]);

  const handleSync = async () => {
    if (!status?.isConnected) return;
    const approved = await requestApproval({
      activityId: 'act-github-sync',
      projectId: 'proj-01',
      riskLevel: RiskLevel.CONFIRM,
      actionType: 'GIT_REMOTE_SYNC',
      title: 'Sync Workstation with GitHub Origin',
      description: 'Fetch latest commits and reconcile branch pointers on workstation.',
      commandOrDiff: 'git fetch origin && git log HEAD..origin/main --oneline',
      parameters: { remote: 'origin', branch: status?.currentBranch || 'main' },
    });

    if (approved) {
      setSyncing(true);
      await services.gitHubApi.syncRepository();
      setSyncing(false);
    }
  };

  if (loading || !status) {
    return (
      <div className="p-8 text-center text-slate-400 font-mono text-xs">
        Connecting to GitHub remote integration proxy...
      </div>
    );
  }

  const isDemo = serviceMode === 'mock' || status.origin === 'DEMO';
  const isConfigured = status.isConnected && status.origin !== 'UNAVAILABLE';

  return (
    <div className="p-3.5 sm:p-6 space-y-4 max-w-5xl mx-auto pb-28 font-mono text-xs animate-in fade-in duration-150">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
            <Github className="w-5 h-5 text-slate-300" />
            <span>GitHub Integration</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isDemo
              ? 'Simulated GitHub synchronization [DEMO]'
              : isConfigured
              ? 'Remote workstation git repository origin'
              : 'GitHub remote integration is not configured'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2 py-0.5 rounded border border-slate-700 bg-slate-800 text-slate-400">
            {isDemo ? 'DEMO SIMULATION' : isConfigured ? 'CONNECTED' : 'NOT_CONFIGURED'}
          </span>
          {isConfigured && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="h-9 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow-md shadow-amber-950"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>Sync Origin</span>
            </button>
          )}
        </div>
      </div>

      {!isConfigured && !isDemo && (
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2.5 text-slate-400 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>No GitHub repository is linked to this control plane. Git sync and PR telemetry are unavailable.</span>
        </div>
      )}

      {/* Repo Summary Card */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Repository</span>
            <span className="text-sm font-bold text-slate-200">
              {status.repository || 'NOT_CONFIGURED'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 flex items-center gap-1 text-[11px]">
              <GitBranch className="w-3 h-3 text-amber-400" />
              {status.currentBranch || '—'}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                status.isClean === true
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                  : status.isClean === false
                  ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {status.isClean === true ? 'TREE CLEAN' : status.isClean === false ? 'MODIFIED' : 'STATUS UNKNOWN'}
            </span>
          </div>
        </div>

        {/* CI & Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5">GitHub CI Status</span>
            <span className="font-semibold text-slate-200 flex items-center gap-1">
              {status.ciStatus || 'NOT_CONFIGURED'}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5">Open Pull Requests</span>
            <span className="font-semibold text-slate-200">
              {status.prsCount !== null ? `${status.prsCount} PRs` : '—'}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5">Issues Assigned</span>
            <span className="font-semibold text-slate-200">
              {status.issuesCount !== null ? `${status.issuesCount} Issues` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Pull Requests & Commits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Pull Requests */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Recent Pull Requests
          </span>
          <div className="space-y-2">
            {status.pullRequests.length === 0 ? (
              <div className="text-slate-500 text-xs py-3 text-center">No pull requests found.</div>
            ) : (
              status.pullRequests.map((pr) => (
                <div
                  key={pr.id}
                  className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 text-xs">
                      #{pr.id} {pr.title}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                      {pr.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Branch: {pr.branch}</span>
                    <span>Author: {pr.author}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Commits */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Workstation Commit History
          </span>
          <div className="space-y-2">
            {status.recentCommits.length === 0 ? (
              <div className="text-slate-500 text-xs py-3 text-center">No commit history found.</div>
            ) : (
              status.recentCommits.map((c) => (
                <div
                  key={c.sha}
                  className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400 font-semibold">{c.sha}</span>
                    <span className="text-[10px] text-slate-500">{c.timestamp}</span>
                  </div>
                  <div className="text-xs text-slate-300 truncate">{c.message}</div>
                  <div className="text-[10px] text-slate-500">Committer: {c.author}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
