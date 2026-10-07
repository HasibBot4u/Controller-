import React, { useState, useEffect, useRef } from 'react';
import { useControlCenter } from '../../../context/ControlCenterContext.tsx';
import { Project, Activity, ClaudeSession, ModelProfile, ActivityEvent } from '../../../domain/models/index.ts';
import { EventType } from '../../../domain/enums/index.ts';
import {
  Send,
  Bot,
  Play,
  Pause,
  Square,
  Sparkles,
  GitFork,
  RotateCcw,
  Minimize2,
  Cpu,
  Layers,
  Shield,
  Clock,
  Terminal,
  FileCode,
} from 'lucide-react';

export const ClaudeScreen: React.FC = () => {
  const { services, selectedProjectId, setSelectedProjectId, triggerRefresh, refreshKey } = useControlCenter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string>('act-901');
  const [session, setSession] = useState<ClaudeSession | null>(null);
  const [modelProfiles, setModelProfiles] = useState<ModelProfile[]>([]);
  const [provider, setProvider] = useState<string>('Anthropic');
  const [model, setModel] = useState<string>('claude-3-7-sonnet');
  const [planMode, setPlanMode] = useState<boolean>(true);
  const [approvalMode, setApprovalMode] = useState<'STRICT' | 'STANDARD' | 'PERMISSIVE'>('STANDARD');
  const [promptText, setPromptText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const latestSeqRef = useRef<number>(0);

  // 1. Load Projects, Activities, Model Profiles
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      services.projectsApi.getProjects(),
      services.activitiesApi.getActivities(),
      services.modelsApi.getProfiles(),
    ]).then(([pRes, aRes, mRes]) => {
      if (!isMounted) return;
      setProjects(pRes.data);
      setActivities(aRes.data);
      setModelProfiles(mRes.data);
      if (aRes.data.length > 0 && !selectedActivityId) {
        setSelectedActivityId(aRes.data[0].id);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [services, refreshKey]);

  // 2. Load Session and Events for selected Activity
  useEffect(() => {
    let isMounted = true;
    latestSeqRef.current = 0;

    services.sessionsApi.getSessions().then((res) => {
      if (!isMounted) return;
      const found = res.data.find((s) => s.activityId === selectedActivityId) || res.data[0];
      if (found) {
        setSession(found);
        setProvider(found.provider);
        setModel(found.model);
        setPlanMode(found.planMode);
        setApprovalMode(found.approvalMode);
      }
    });

    services.eventsApi.getActivityEvents(selectedActivityId, 0).then((res) => {
      if (!isMounted) return;
      setEvents(res.data);
      if (res.data.length > 0) {
        latestSeqRef.current = Math.max(...res.data.map((e) => e.sequence));
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedActivityId, services, refreshKey]);

  // 3. Periodic Poll for Event Updates (Item 10)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!selectedActivityId) return;
      try {
        const res = await services.eventsApi.getActivityEvents(selectedActivityId, latestSeqRef.current);
        if (res.data && res.data.length > 0) {
          setEvents((prev) => {
            const existingIds = new Set(prev.map((e) => e.id));
            const newEvents = res.data.filter((e) => !existingIds.has(e.id));
            return [...prev, ...newEvents];
          });
          latestSeqRef.current = Math.max(latestSeqRef.current, ...res.data.map((e) => e.sequence));

          // Also refresh session tokens/status
          if (session) {
            services.sessionsApi.getSession(session.id).then((sRes) => {
              if (sRes.data) setSession(sRes.data);
            });
          }
        }
      } catch (e) {
        // Silent poll error
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [selectedActivityId, session, services]);

  // 4. Send Prompt through server API (Item 10)
  const handleSendPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim() || !session) return;

    const textToSend = promptText.trim();
    setPromptText('');
    setIsSubmitting(true);
    setStatusMessage('Dispatching prompt to server execution pipeline...');

    try {
      await services.sessionsApi.sendPrompt(session.id, textToSend, { planMode });
      setStatusMessage('Prompt accepted by remote session. Replaying execution stream...');

      // Immediately poll for new events
      const res = await services.eventsApi.getActivityEvents(selectedActivityId, latestSeqRef.current);
      if (res.data.length > 0) {
        setEvents((prev) => {
          const existingIds = new Set(prev.map((ev) => ev.id));
          const newEvents = res.data.filter((ev) => !existingIds.has(ev.id));
          return [...prev, ...newEvents];
        });
        latestSeqRef.current = Math.max(latestSeqRef.current, ...res.data.map((ev) => ev.sequence));
      }
    } catch (err: any) {
      setStatusMessage(`Error dispatching prompt: ${err?.message || 'Server error'}`);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setStatusMessage(null), 4000);
      triggerRefresh();
    }
  };

  const handleContractAction = async (action: string) => {
    setStatusMessage(`Dispatched action [${action}] to session on server`);
    try {
      if (action === 'Pause') await services.activitiesApi.pauseActivity(selectedActivityId);
      if (action === 'Resume') await services.activitiesApi.resumeActivity(selectedActivityId);
      if (action === 'Stop') await services.activitiesApi.stopActivity(selectedActivityId);
      triggerRefresh();
    } catch (e: any) {
      setStatusMessage(`Action failed: ${e?.message}`);
    }
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div className="p-3 sm:p-6 space-y-3 max-w-4xl mx-auto pb-28 animate-in fade-in duration-150">
      {/* Remote Thin-client Banner */}
      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-300">
          <Bot className="w-4 h-4 text-amber-400" />
          <span>Session: {session ? session.id : 'No active session'}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          <span>{session?.status || 'IDLE'}</span>
        </div>
      </div>

      {/* Selectors & Control Panel */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 text-xs font-mono">
        {/* Project & Activity Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              Active Project:
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full bg-black/50 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              Active Activity:
            </label>
            <select
              value={selectedActivityId}
              onChange={(e) => setSelectedActivityId(e.target.value)}
              className="w-full bg-black/50 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
            >
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.id} - {a.title.slice(0, 30)}...
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic Model & Provider Selectors from ModelsApi (Item 31) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              Provider:
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full bg-black/50 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
            >
              {Array.from(new Set(modelProfiles.map((m) => m.provider))).map((prov) => (
                <option key={prov} value={prov}>
                  {prov}
                </option>
              ))}
              {modelProfiles.length === 0 && <option value="Anthropic">Anthropic</option>}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              Model:
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-black/50 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
            >
              {modelProfiles
                .filter((p) => p.provider === provider || !provider)
                .map((m) => (
                  <option key={m.id} value={m.model}>
                    {m.model}
                  </option>
                ))}
              {modelProfiles.length === 0 && <option value="claude-3-7-sonnet">claude-3-7-sonnet</option>}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              Plan Mode:
            </label>
            <button
              type="button"
              onClick={() => setPlanMode(!planMode)}
              className={`w-full py-1.5 px-2 rounded-lg border text-xs font-semibold text-center transition-colors cursor-pointer ${
                planMode
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-black/50 border-slate-700 text-slate-400'
              }`}
            >
              {planMode ? 'PLAN ENABLED' : 'DIRECT ACT'}
            </button>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              Approval Mode:
            </label>
            <select
              value={approvalMode}
              onChange={(e) => setApprovalMode(e.target.value as any)}
              className="w-full bg-black/50 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
            >
              <option value="STRICT">Strict</option>
              <option value="STANDARD">Standard</option>
              <option value="PERMISSIVE">Permissive</option>
            </select>
          </div>
        </div>

        {/* Telemetry Bar (Derives from Session Model, Item 11) */}
        {session && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
            <div className="flex items-center gap-3">
              <span>Context Usage: {session.contextUsagePercent}%</span>
              <span>•</span>
              <span>Tokens: {session.tokensIn.toLocaleString()} in / {session.tokensOut.toLocaleString()} out</span>
              <span>•</span>
              <span className="text-emerald-400">Cost: ${session.cost.toFixed(3)}</span>
            </div>
            <span className="text-slate-500 text-[10px]">Phase 1 Mock Execution</span>
          </div>
        )}

        {/* Action Button Bar */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => handleContractAction('Continue')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <Play className="w-3 h-3 text-amber-400" /> Continue
          </button>
          <button
            type="button"
            onClick={() => handleContractAction('Pause')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <Pause className="w-3 h-3 text-slate-400" /> Pause
          </button>
          <button
            type="button"
            onClick={() => handleContractAction('Resume')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <Play className="w-3 h-3 text-emerald-400" /> Resume
          </button>
          <button
            type="button"
            onClick={() => handleContractAction('Stop')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <Square className="w-3 h-3 text-rose-400" /> Stop
          </button>
        </div>

        {statusMessage && (
          <div className="p-2 rounded bg-amber-950/60 border border-amber-800 text-[11px] text-amber-300">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Transcript Area Reconstructed from Event Journal (Item 10) */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 min-h-[240px] max-h-[380px] overflow-y-auto space-y-2.5 font-mono text-xs">
        {events.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-mono text-xs">
            No events recorded yet for activity {selectedActivityId}. Submit an instruction below.
          </div>
        ) : (
          events.map((evt) => {
            const isUserPrompt = evt.type === EventType.PROMPT_RECEIVED;
            const isTool = evt.type === EventType.TOOL_STARTED || evt.type === EventType.TOOL_COMPLETED;
            const isAssistant = evt.type === EventType.ASSISTANT_MESSAGE;

            let contentDisplay = '';
            if (isUserPrompt) {
              contentDisplay = (evt.payload.prompt as string) || '';
            } else if (isAssistant) {
              contentDisplay = (evt.payload.content as string) || '';
            } else if (isTool) {
              contentDisplay = `Tool: ${evt.payload.tool || 'generic'} (${JSON.stringify(evt.payload)})`;
            } else {
              contentDisplay = `${evt.type}: ${JSON.stringify(evt.payload)}`;
            }

            return (
              <div
                key={evt.id}
                className={`p-3 rounded-xl ${
                  isUserPrompt
                    ? 'bg-amber-500/10 border border-amber-500/20 text-slate-100 ml-4'
                    : isTool
                    ? 'bg-black/60 border border-cyan-800/40 text-cyan-300 text-[11px]'
                    : isAssistant
                    ? 'bg-black/40 border border-slate-800 text-slate-200 mr-4'
                    : 'bg-black/30 border border-slate-800/60 text-slate-400 text-[11px]'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                  <span className="uppercase font-semibold tracking-wider text-amber-400">
                    {isUserPrompt ? 'USER' : isAssistant ? 'ASSISTANT' : evt.type} (#{evt.sequence})
                  </span>
                  <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="leading-relaxed whitespace-pre-wrap">{contentDisplay}</p>
              </div>
            );
          })
        )}
      </div>

      {/* Prompt Input Form (Item 10) */}
      <form onSubmit={handleSendPrompt} className="flex gap-2">
        <input
          type="text"
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="Send remote prompt to Claude session (persisted on server)..."
          disabled={isSubmitting}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-mono shadow-inner"
        />
        <button
          type="submit"
          disabled={!promptText.trim() || isSubmitting}
          className="h-11 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-xs font-mono flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow-md shadow-amber-950"
          aria-label="Send prompt"
        >
          <Send className="w-4 h-4" />
          <span className="hidden xs:inline">{isSubmitting ? 'Dispatching...' : 'Send'}</span>
        </button>
      </form>
    </div>
  );
};
