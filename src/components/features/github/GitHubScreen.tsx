import React, { useEffect, useState } from 'react';
import { useControlCenter } from '../../../context/ControlCenterContext.tsx';
import { GitHubRepoStatus } from '../../../domain/models/index.ts';
import { RiskLevel } from '../../../domain/enums/index.ts';
import {
  Github,
  GitBranch,
  GitPullRequest,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  GitCommit,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export const GitHubScreen: React.FC = () => {
  const { services, requestApproval } = useControlCenter();
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
    const approved = await requestApproval({
      activityId: 'act-github-sync',
      projectId: 'proj-01',
      riskLevel: RiskLevel.CONFIRM,
      actionType: 'GIT_REMOTE_SYNC',
      title: 'Sync Workstation with GitHub Origin',
      description: 'Fetch latest commits and reconcile branch pointers on remote VM host.',
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

  return (
    <div className="p-3.5 sm:p-6 space-y-4 max-w-5xl mx-auto pb-28 font-mono text-xs animate-in fade-in duration-150">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
            <Github className="w-5 h-5 text-slate-300" />
            <span>GitHub Integration</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cloudflare Zero Trust proxy to repository origin (No tokens in client)
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="h-9 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow-md shadow-amber-950"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          <span>Sync Origin</span>
        </button>
      </div>

      {/* Repo Summary Card */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Repository</span>
            <span className="text-sm font-bold text-slate-200">{status.repository}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 flex items-center gap-1 text-[11px]">
              <GitBranch className="w-3 h-3 text-amber-400" />
              {status.currentBranch}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                status.isClean
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                  : 'bg-amber-950/60 border-amber-800 text-amber-300'
              }`}
            >
              {status.isClean ? 'TREE CLEAN' : 'MODIFIED'}
            </span>
          </div>
        </div>

        {/* CI & Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5">GitHub CI Status</span>
            <span className="font-semibold text-amber-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              {status.ciStatus}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5">Open Pull Requests</span>
            <span className="font-semibold text-slate-200">{status.prsCount} PRs</span>
          </div>
          <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5">Issues Assigned</span>
            <span className="font-semibold text-slate-200">{status.issuesCount} Issues</span>
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
            {status.pullRequests.map((pr) => (
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
            ))}
          </div>
        </div>

        {/* Recent Commits */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Workstation Commit History
          </span>
          <div className="space-y-2">
            {status.recentCommits.map((c) => (
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
