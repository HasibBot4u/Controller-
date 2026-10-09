import React, { useEffect, useState, useRef } from 'react';
import { useControlCenter } from '../../../context/ControlCenterContext.tsx';
import { TerminalSession, TerminalOutput } from '../../../domain/models/index.ts';
import {
  Terminal as TerminalIcon,
  Play,
  RotateCcw,
  Maximize2,
  Trash2,
  Send,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Server,
  Zap,
} from 'lucide-react';

export const TerminalScreen: React.FC = () => {
  const { services, serviceMode, refreshKey } = useControlCenter();
  const [session, setSession] = useState<TerminalSession | null>(null);
  const [outputs, setOutputs] = useState<TerminalOutput[]>([]);
  const [commandInput, setCommandInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [unconfiguredError, setUnconfiguredError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const initTerminal = async () => {
    setLoading(true);
    setUnconfiguredError(null);
    try {
      const res = await services.terminalApi.createSession({ cols: 80, rows: 24 });
      if (res.data.status === 'NOT_CONFIGURED') {
        setSession(res.data);
        setUnconfiguredError(res.data.message || 'Remote terminal execution is not configured.');
      } else {
        setSession(res.data);
        const outRes = await services.terminalApi.getOutput(res.data.sessionId);
        setOutputs(outRes.data);
      }
    } catch (e: any) {
      setUnconfiguredError(e?.message || 'Remote terminal execution backend is not configured.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initTerminal();
  }, [services, refreshKey]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [outputs]);

  const handleSendCommand = async (cmdToSend?: string) => {
    const cmd = (cmdToSend ?? commandInput).trim();
    if (!cmd || !session || unconfiguredError) return;

    if (!cmdToSend) setCommandInput('');

    try {
      await services.terminalApi.sendInput(session.sessionId, cmd);
      const outRes = await services.terminalApi.getOutput(session.sessionId);
      setOutputs(outRes.data);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleClear = () => {
    if (session && !unconfiguredError) {
      handleSendCommand('clear');
    } else {
      setOutputs([]);
    }
  };

  const handleReconnect = async () => {
    if (session && !unconfiguredError) {
      try {
        const res = await services.terminalApi.reconnect(session.sessionId);
        setSession(res.data);
        const outRes = await services.terminalApi.getOutput(res.data.sessionId);
        setOutputs(outRes.data);
      } catch (_e) {
        initTerminal();
      }
    } else {
      initTerminal();
    }
  };

  const isDemo = serviceMode === 'mock';

  return (
    <div className="p-3 sm:p-6 space-y-3 max-w-5xl mx-auto pb-28 animate-in fade-in duration-150">
      {/* Remote Thin-client Banner */}
      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-300">
          <TerminalIcon className="w-4 h-4 text-amber-400" />
          <span>
            {unconfiguredError
              ? 'Remote PTY: Not Configured'
              : `Remote PTY: ${session?.pty || 'Simulated'} (${session?.cwd || '/workspace'})`}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span
            className={`w-2 h-2 rounded-full ${
              unconfiguredError ? 'bg-slate-500' : isDemo ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
          />
          <span>{unconfiguredError ? 'UNCONFIGURED' : isDemo ? 'DEMO SIMULATION' : 'CONNECTED'}</span>
        </div>
      </div>

      {/* Terminal View Container */}
      <div className="rounded-xl border border-slate-800 bg-[#060911] shadow-2xl overflow-hidden flex flex-col font-mono text-xs">
        {/* Top Terminal Bar */}
        <div className="bg-[#0d121f] px-3.5 py-2 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <span className="text-[11px] text-slate-400 ml-1">
              {unconfiguredError
                ? 'control-plane@unconfigured'
                : isDemo
                ? 'demo-sandbox@simulated-session'
                : 'remote-session'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReconnect}
              className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors"
              title="Reconnect Session"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleClear}
              className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors"
              title="Clear Terminal Output"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Terminal Screen Console */}
        <div
          ref={scrollRef}
          className="p-3.5 min-h-[300px] max-h-[460px] overflow-y-auto space-y-1 bg-black/80 text-slate-200 select-all"
        >
          {unconfiguredError ? (
            <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800 text-slate-400 space-y-2">
              <div className="text-amber-400 font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                Remote Terminal Execution Not Configured
              </div>
              <p className="text-[11px] leading-relaxed">
                The thin-client control plane is running, but no remote Linux execution host daemon or PTY bridge is connected in normal mode.
              </p>
              <p className="text-[11px] text-slate-500">
                To test the terminal interface in simulation, switch service mode to Demo in Settings.
              </p>
            </div>
          ) : (
            outputs.map((out) => (
              <div key={out.sequence} className="leading-relaxed whitespace-pre-wrap font-mono text-xs break-all">
                {out.data}
              </div>
            ))
          )}
          {loading && (
            <div className="text-amber-400 flex items-center gap-2">
              <span className="animate-spin">◒</span> Checking terminal session...
            </div>
          )}
        </div>

        {/* Command Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendCommand();
          }}
          className="p-2.5 bg-[#0a0f1c] border-t border-slate-800 flex gap-2"
        >
          <div className="flex items-center text-emerald-400 font-bold pl-1">$</div>
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            disabled={Boolean(unconfiguredError)}
            placeholder={
              unconfiguredError
                ? 'Terminal execution is not configured in normal mode...'
                : "Type remote command (e.g. 'git status', 'uptime')..."
            }
            className="flex-1 bg-transparent border-0 text-slate-100 placeholder:text-slate-600 focus:outline-none text-xs font-mono disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!commandInput.trim() || Boolean(unconfiguredError)}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-semibold text-xs flex items-center gap-1 cursor-pointer transition-transform active:scale-95 shadow-md shadow-amber-950"
          >
            <Send className="w-3 h-3" />
            <span className="hidden xs:inline">Run</span>
          </button>
        </form>
      </div>

      <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-400">
        <span className="font-semibold text-slate-300">Thin-Client Isolation Note:</span> No shell processes or commands run locally in the browser. Execution occurs exclusively on configured remote hosts.
      </div>
    </div>
  );
};
