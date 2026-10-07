import React, { useState, useEffect } from 'react';
import { useControlCenter } from '../../../context/ControlCenterContext.tsx';
import { Project, Activity, ClaudeSession } from '../../../domain/models/index.ts';
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
  CheckCircle2,
  Cpu,
  Layers,
  Shield,
  Zap,
  Info,
} from 'lucide-react';

export const ClaudeScreen: React.FC = () => {
  const { services, selectedProjectId, setSelectedProjectId, triggerRefresh } = useControlCenter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string>('act-901');
  const [provider, setProvider] = useState<string>('Anthropic');
  const [model, setModel] = useState<string>('claude-3-7-sonnet');
  const [planMode, setPlanMode] = useState<boolean>(true);
  const [approvalMode, setApprovalMode] = useState<'STRICT' | 'STANDARD' | 'PERMISSIVE'>('STANDARD');
  const [promptText, setPromptText] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Transcript entries (remote session simulation)
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'assistant' | 'tool'; text: string; time: string }>>([
    {
      sender: 'user',
      text: 'Add an SSE heartbeat buffer that survives mobile browser pauses and LTE handoffs.',
      time: '03:45:15',
    },
    {
      sender: 'assistant',
      text: 'Analyzing `src/transport/sse-daemon.ts` on the remote Oracle Linux workstation. I will add an adaptive keepalive ping buffer and evaluate test coverage in the isolated sandbox.',
      time: '03:46:00',
    },
    {
      sender: 'tool',
      text: 'Tool Invocation: ReadFile(path="src/transport/sse-daemon.ts") -> 142 lines read',
      time: '03:46:35',
    },
    {
      sender: 'assistant',
      text: 'Patching `sse-daemon.ts` with queuePayload() and flushBuffer() methods. Now running vitest suite in cgroup...',
      time: '03:48:10',
    },
  ]);

  useEffect(() => {
    services.projectsApi.getProjects().then((res) => setProjects(res.data));
    services.activitiesApi.getActivities().then((res) => {
      setActivities(res.data);
      if (res.data.length > 0 && !selectedActivityId) {
        setSelectedActivityId(res.data[0].id);
      }
    });
  }, [services]);

  const handleSendPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) return;

    const userMsg = promptText;
    setMessages((prev) => [
      ...prev,
      { sender: 'user', text: userMsg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
    ]);
    setPromptText('');
    setStatusMessage('Dispatching prompt to remote Claude daemon on Oracle VM...');

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `[Remote Claude session response]: Acknowledged prompt "${userMsg.slice(0, 40)}...". Remote agent scheduled next operation in workstation cgroup.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setStatusMessage(null);
      triggerRefresh();
    }, 700);
  };

  const notifyAction = (actionName: string) => {
    setStatusMessage(`Dispatched contract action: [${actionName}] to remote session`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div className="p-3 sm:p-6 space-y-3 max-w-4xl mx-auto pb-28 animate-in fade-in duration-150">
      {/* Remote Thin-client Banner */}
      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-300">
          <Bot className="w-4 h-4 text-amber-400" />
          <span>Remote Session: sess-alpha-01</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          <span>STREAMING</span>
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

        {/* Provider & Model Selectors */}
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
              <option value="Anthropic">Anthropic</option>
              <option value="LiteLLM">LiteLLM Proxy</option>
              <option value="Gemini">Gemini</option>
              <option value="OpenRouter">OpenRouter</option>
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
              <option value="claude-3-7-sonnet">claude-3-7-sonnet</option>
              <option value="claude-3-5-haiku">claude-3-5-haiku</option>
              <option value="gemini-2.5-flash">gemini-2.5-flash</option>
              <option value="deepseek-r1">deepseek-r1</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              Plan Mode:
            </label>
            <button
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

        {/* Telemetry Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>Context Window: 18.4% (36k / 200k)</span>
            <span>•</span>
            <span className="text-emerald-400">Cost: $0.142</span>
          </div>
          <span className="text-slate-500 text-[10px]">Cgroup Sandbox: claude-dev-01</span>
        </div>

        {/* Contract Controls Button Bar */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <button
            onClick={() => notifyAction('Continue')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <Play className="w-3 h-3 text-amber-400" /> Continue
          </button>
          <button
            onClick={() => notifyAction('Pause')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <Pause className="w-3 h-3 text-slate-400" /> Pause
          </button>
          <button
            onClick={() => notifyAction('Stop')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <Square className="w-3 h-3 text-rose-400" /> Stop
          </button>
          <button
            onClick={() => notifyAction('Compact')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <Minimize2 className="w-3 h-3 text-cyan-400" /> Compact
          </button>
          <button
            onClick={() => notifyAction('Background')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <Cpu className="w-3 h-3 text-indigo-400" /> Background
          </button>
          <button
            onClick={() => notifyAction('Fork')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <GitFork className="w-3 h-3 text-amber-400" /> Fork
          </button>
          <button
            onClick={() => notifyAction('Rewind')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-amber-400" /> Rewind
          </button>
          <button
            onClick={() => notifyAction('Resume')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <Play className="w-3 h-3 text-emerald-400" /> Resume
          </button>
        </div>

        {statusMessage && (
          <div className="p-2 rounded bg-amber-950/60 border border-amber-800 text-[11px] text-amber-300">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Transcript Area */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 min-h-[220px] max-h-[360px] overflow-y-auto space-y-2.5 font-mono text-xs">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-xl ${
              m.sender === 'user'
                ? 'bg-amber-500/10 border border-amber-500/20 text-slate-100 ml-4'
                : m.sender === 'tool'
                ? 'bg-black/60 border border-cyan-800/40 text-cyan-300 text-[11px]'
                : 'bg-black/40 border border-slate-800 text-slate-200 mr-4'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
              <span className="uppercase font-semibold tracking-wider text-amber-400">
                {m.sender}
              </span>
              <span>{m.time}</span>
            </div>
            <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
          </div>
        ))}
      </div>

      {/* Prompt Input Area */}
      <form onSubmit={handleSendPrompt} className="flex gap-2">
        <input
          type="text"
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="Send remote prompt to Claude (e.g. 'Refactor epoll bindings' or 'Run tests')..."
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-mono shadow-inner"
        />
        <button
          type="submit"
          disabled={!promptText.trim()}
          className="h-11 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-xs font-mono flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow-md shadow-amber-950"
          aria-label="Send prompt"
        >
          <Send className="w-4 h-4" />
          <span className="hidden xs:inline">Send</span>
        </button>
      </form>
    </div>
  );
};
