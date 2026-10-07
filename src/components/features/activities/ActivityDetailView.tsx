import React, { useEffect, useState } from 'react';
import { useControlCenter } from '../../../context/ControlCenterContext.tsx';
import { Activity, ActivityEvent, Checkpoint } from '../../../domain/models/index.ts';
import { StatusPill } from '../../common/StatusPill.tsx';
import { ActivityStatus, EventType, ApprovalStatus, RiskLevel } from '../../../domain/enums/index.ts';
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  RotateCcw,
  GitFork,
  History,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  GitBranch,
  ShieldAlert,
  Send,
  Terminal,
  Layers,
  Database,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileDiff,
  Wifi,
  CloudCheck,
} from 'lucide-react';

interface ActivityDetailViewProps {
  activityId: string;
  onBack: () => void;
}

export const ActivityDetailView: React.FC<ActivityDetailViewProps> = ({ activityId, onBack }) => {
  const { services, refreshKey, triggerRefresh, requestApproval, setSelectedActivityId } = useControlCenter();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionPrompt, setActionPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<'continuity' | 'events' | 'checkpoints' | 'diff'>('continuity');
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [modalDiffVisible, setModalDiffVisible] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      services.activitiesApi.getActivity(activityId),
      services.eventsApi.getActivityEvents(activityId),
      services.eventsApi.getCheckpoints(activityId),
    ])
      .then(([actRes, eventsRes, checkRes]) => {
        if (isMounted) {
          setActivity(actRes.data);
          setEvents(eventsRes.data);
          setCheckpoints(checkRes.data);
        }
      })
      .catch((err) => {
        console.error('Error fetching activity details:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activityId, services, refreshKey]);

  if (loading && !activity) {
    return (
      <div className="p-6 text-center text-slate-400 font-mono text-xs">
        <Clock className="w-5 h-5 mx-auto mb-2 animate-spin text-amber-400" />
        Syncing activity continuity state from remote daemon...
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="p-6 text-center text-slate-400 font-mono text-xs">
        Activity not found.
        <button onClick={onBack} className="block mx-auto mt-2 text-amber-400 underline">
          Return to list
        </button>
      </div>
    );
  }

  const handleContinue = async () => {
    setIsExecutingAction(true);
    try {
      await services.activitiesApi.continueActivity(activity.id, actionPrompt || undefined);
      setActionPrompt('');
      setShowPromptInput(false);
      triggerRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsExecutingAction(false);
    }
  };

  const handlePause = async () => {
    setIsExecutingAction(true);
    try {
      await services.activitiesApi.pauseActivity(activity.id);
      triggerRefresh();
    } finally {
      setIsExecutingAction(false);
    }
  };

  const handleStop = async () => {
    const approved = await requestApproval({
      activityId: activity.id,
      projectId: activity.projectId,
      riskLevel: RiskLevel.CONFIRM,
      actionType: 'ACTIVITY_STOP',
      title: `Terminate Activity ${activity.id}`,
      description: 'Stop the remote agent cgroup and release active workspace locks.',
      parameters: { activityId: activity.id },
    });
    if (approved) {
      await services.activitiesApi.stopActivity(activity.id);
      triggerRefresh();
    }
  };

  const handleRetry = async () => {
    setIsExecutingAction(true);
    try {
      await services.activitiesApi.retryActivity(activity.id);
      triggerRefresh();
    } finally {
      setIsExecutingAction(false);
    }
  };

  const handleResume = async () => {
    setIsExecutingAction(true);
    try {
      await services.activitiesApi.resumeActivity(activity.id);
      triggerRefresh();
    } finally {
      setIsExecutingAction(false);
    }
  };

  const handleFork = async () => {
    setIsExecutingAction(true);
    try {
      const res = await services.activitiesApi.forkActivity(activity.id);
      setSelectedActivityId(res.data.id);
      triggerRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsExecutingAction(false);
    }
  };

  const handleRewind = async (chkId: string) => {
    const targetChk = checkpoints.find((c) => c.id === chkId);
    const approved = await requestApproval({
      activityId: activity.id,
      projectId: activity.projectId,
      riskLevel: RiskLevel.STRONG_CONFIRM,
      actionType: 'ACTIVITY_REWIND',
      title: `Rewind to Checkpoint ${chkId}`,
      description: targetChk?.description || 'Reset workspace state to checkpoint snapshot',
      commandOrDiff: `Operation: RESTORE_CHECKPOINT\nCheckpoint ID: ${chkId}\nTarget: Project workspace (${activity.projectId})\nGit Base Commit: ${activity.gitBaseCommit}`,
      parameters: { checkpointId: chkId, gitBase: activity.gitBaseCommit },
    });
    if (approved) {
      await services.activitiesApi.rewindActivity(activity.id, chkId);
      triggerRefresh();
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-28 animate-in fade-in duration-150">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={onBack}
          className="h-9 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-mono text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Activities</span>
        </button>

        <div className="flex items-center gap-2">
          <StatusPill status={activity.status} size="md" />
        </div>
      </div>

      {/* Continuity Resilience Card - Phase 1 Preview (Item 12) */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono font-semibold text-cyan-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            <span>CONTINUITY MODEL — PHASE 1 PREVIEW</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Schema v{activity.schemaVersion}</span>
        </div>
        <p className="text-slate-300 text-[11px] leading-relaxed">
          State is persisted within the server memory journal and periodic checkpoints.
          In Phase 1, closing the mobile browser or reconnecting re-synchronizes the activity timeline from the server-side event journal.
        </p>
      </div>

      {/* Activity Header & Goal */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 mb-1">
            <span className="text-amber-400 font-semibold">{activity.id}</span>
            <span>•</span>
            <span>Project: {activity.projectId}</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-300">
              <GitBranch className="w-3 h-3 text-slate-500" />
              {activity.gitBranch}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-100">{activity.title}</h2>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">{activity.description}</p>
        </div>

        {/* Quick Action Control Bar */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2">
          <button
            onClick={() => setShowPromptInput(!showPromptInput)}
            className="h-9 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs font-mono flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow-md shadow-amber-950"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Continue</span>
          </button>

          {activity.status === ActivityStatus.RUNNING && (
            <button
              onClick={handlePause}
              disabled={isExecutingAction}
              className="h-9 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          )}

          {(activity.status === ActivityStatus.PAUSED || activity.status === ActivityStatus.RECOVERABLE) && (
            <button
              onClick={handleResume}
              disabled={isExecutingAction}
              className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs font-mono flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Resume</span>
            </button>
          )}

          {activity.status === ActivityStatus.FAILED && (
            <button
              onClick={handleRetry}
              disabled={isExecutingAction}
              className="h-9 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs font-mono flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          )}

          <button
            onClick={handleFork}
            disabled={isExecutingAction}
            className="h-9 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>Fork</span>
          </button>

          <button
            onClick={handleStop}
            disabled={isExecutingAction}
            className="h-9 px-3 rounded-lg bg-slate-800 hover:bg-rose-950/80 hover:text-rose-300 text-slate-400 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
          >
            <Square className="w-3.5 h-3.5" />
            <span>Stop</span>
          </button>
        </div>

        {/* Continue Instruction Input Field */}
        {showPromptInput && (
          <div className="p-3 bg-black/60 border border-amber-500/40 rounded-xl space-y-2 animate-in fade-in duration-100">
            <span className="text-[11px] font-mono text-amber-300 block">
              Send Instruction to Remote Claude Session:
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={actionPrompt}
                onChange={(e) => setActionPrompt(e.target.value)}
                placeholder="e.g. Add unit test for mobile timeout or fix lint error..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
                onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
              />
              <button
                onClick={handleContinue}
                disabled={isExecutingAction}
                className="px-3 rounded-lg bg-amber-500 text-slate-950 font-semibold text-xs font-mono flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-3 h-3" />
                Dispatch
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-800 gap-2 text-xs font-mono select-none overflow-x-auto">
        <button
          onClick={() => setActiveTab('continuity')}
          className={`pb-2.5 px-3 border-b-2 font-medium transition-colors cursor-pointer ${
            activeTab === 'continuity'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Continuity State
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`pb-2.5 px-3 border-b-2 font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'events'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Event Timeline</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
            {events.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('checkpoints')}
          className={`pb-2.5 px-3 border-b-2 font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'checkpoints'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Checkpoints</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
            {checkpoints.length}
          </span>
        </button>
      </div>

      {/* TAB 1: CONTINUITY STATE DETAILS */}
      {activeTab === 'continuity' && (
        <div className="space-y-3">
          {/* Executive Progress Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Current State & Action */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5 text-xs font-mono">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Execution Snapshot
              </span>

              <div className="space-y-1.5">
                <div className="text-[11px] text-slate-400">Current State:</div>
                <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80 text-slate-200 text-xs leading-relaxed">
                  {activity.lastKnownState}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] text-slate-400">Current Action:</div>
                <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80 text-amber-300 text-xs flex items-start gap-1.5">
                  <span className="text-amber-400 font-bold">›</span>
                  <span>{activity.currentAction}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] text-slate-400">Next Action:</div>
                <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80 text-slate-300 text-xs">
                  {activity.nextAction}
                </div>
              </div>

              {activity.blocker && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Blocker:</span>
                    <span>{activity.blocker}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Test, Files & Git Summary */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 text-xs font-mono">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Workstation Telemetry
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Files Changed</span>
                  <span className="font-bold text-slate-200 text-sm">
                    {activity.filesChangedCount} files
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Tests Passed / Failed</span>
                  <span className="font-bold text-slate-200 text-sm">
                    <span className="text-emerald-400">{activity.testsPassed}</span> /{' '}
                    <span className="text-rose-400">{activity.testsFailed}</span>
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Estimated Cost</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    ${(activity.estimatedCost ?? 0).toFixed(3)}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Duration</span>
                  <span className="font-bold text-slate-200 text-sm">
                    {Math.round(activity.durationMs / 60000)} mins
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>Claude Session:</span>
                  <span className="text-slate-200 font-semibold">{activity.claudeSessionId}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Provider / Model:</span>
                  <span className="text-amber-300">
                    {activity.provider} • {activity.model}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Base Commit:</span>
                  <span className="text-slate-200">{activity.gitBaseCommit}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Last Event Seq:</span>
                  <span className="text-slate-200 font-mono">#{activity.lastEventSequence}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EVENT REPLAY TIMELINE */}
      {activeTab === 'events' && (
        <div className="space-y-2">
          <div className="text-[11px] font-mono text-slate-400 px-1">
            Replay stream received from remote daemon (sequence-ordered):
          </div>

          <div className="space-y-2">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5 text-xs font-mono"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                      #{evt.sequence}
                    </span>
                    <span className="text-amber-300 font-semibold text-[11px]">{evt.type}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <pre className="p-2 bg-black/40 border border-slate-800/80 rounded-lg text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(evt.payload, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CHECKPOINTS & SNAPSHOTS */}
      {activeTab === 'checkpoints' && (
        <div className="space-y-2">
          <div className="text-[11px] font-mono text-slate-400 px-1">
            Durable snapshots captured on Oracle Linux storage:
          </div>

          <div className="space-y-2">
            {checkpoints.map((chk) => (
              <div
                key={chk.id}
                className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start justify-between gap-3 text-xs font-mono"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">{chk.id}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                      {chk.trigger}
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs mt-1">{chk.description}</p>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1.5">
                    <span>Commit: {chk.gitCommitSha}</span>
                    <span>•</span>
                    <span>Files: {chk.filesSnapshotCount}</span>
                    <span>•</span>
                    <span>Size: {(chk.sizeBytes / 1024).toFixed(1)} KB</span>
                  </div>
                </div>

                <button
                  onClick={() => handleRewind(chk.id)}
                  className="flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Rewind</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
