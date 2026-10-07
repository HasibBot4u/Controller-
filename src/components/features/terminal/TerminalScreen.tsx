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
  Server,
  Zap,
} from 'lucide-react';

export const TerminalScreen: React.FC = () => {
  const { services } = useControlCenter();
  const [session, setSession] = useState<TerminalSession | null>(null);
  const [outputs, setOutputs] = useState<TerminalOutput[]>([]);
  const [commandInput, setCommandInput] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const initTerminal = async () => {
    setLoading(true);
    try {
      const res = await services.terminalApi.createSession({ cols: 80, rows: 24 });
      setSession(res.data);
      const outRes = await services.terminalApi.getOutput(res.data.sessionId);
      setOutputs(outRes.data);
    } catch (e) {
      console.error('Error connecting remote terminal:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initTerminal();
  }, [services]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [outputs]);

  const handleSendCommand = async (cmdToSend?: string) => {
    const cmd = (cmdToSend ?? commandInput).trim();
    if (!cmd || !session) return;

    if (!cmdToSend) setCommandInput('');

    try {
      await services.terminalApi.sendInput(session.sessionId, cmd);
      const outRes = await services.terminalApi.getOutput(session.sessionId);
      setOutputs(outRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClear = () => {
    if (session) {
      handleSendCommand('clear');
    }
  };

  const handleReconnect = async () => {
    if (session) {
      const res = await services.terminalApi.reconnect(session.sessionId);
      setSession(res.data);
      const outRes = await services.terminalApi.getOutput(res.data.sessionId);
      setOutputs(outRes.data);
    }
  };

  const quickCommands = [
    { label: 'git status', cmd: 'git status' },
    { label: 'pnpm test', cmd: 'pnpm test' },
    { label: 'uptime', cmd: 'uptime' },
    { label: 'free -m', cmd: 'free -m' },
    { label: 'ls -la', cmd: 'ls -la' },
    { label: 'whoami', cmd: 'whoami' },
  ];

  return (
    <div className="p-3 sm:p-6 space-y-3 max-w-5xl mx-auto pb-28 animate-in fade-in duration-150">
      {/* Remote Thin-client Banner */}
      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-300">
          <TerminalIcon className="w-4 h-4 text-amber-400" />
          <span>Remote PTY: {session?.pty || '/dev/pts/3'} ({session?.cwd || '/home/oracle/workspace'})</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          <span>ORACLE VM</span>
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
            <span className="text-[11px] text-slate-400 ml-1">oracle@cloud-vm-ampere-01</span>
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
          {outputs.map((out) => (
            <div key={out.sequence} className="leading-relaxed whitespace-pre-wrap font-mono text-xs break-all">
              {out.data}
            </div>
          ))}
          {loading && (
            <div className="text-amber-400 flex items-center gap-2">
              <span className="animate-spin">◒</span> Connecting remote PTY socket...
            </div>
          )}
        </div>

        {/* Quick Command Action Pills */}
        <div className="p-2 bg-[#090d16] border-t border-slate-800 flex gap-1.5 overflow-x-auto select-none">
          {quickCommands.map((qc) => (
            <button
              key={qc.cmd}
              onClick={() => handleSendCommand(qc.cmd)}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 whitespace-nowrap cursor-pointer transition-colors"
            >
              $ {qc.label}
            </button>
          ))}
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
            placeholder="Type remote command (e.g. 'git status', 'uname -a', 'uptime')..."
            className="flex-1 bg-transparent border-0 text-slate-100 placeholder:text-slate-600 focus:outline-none text-xs font-mono"
          />
          <button
            type="submit"
            disabled={!commandInput.trim()}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-semibold text-xs flex items-center gap-1 cursor-pointer transition-transform active:scale-95 shadow-md shadow-amber-950"
          >
            <Send className="w-3 h-3" />
            <span className="hidden xs:inline">Run</span>
          </button>
        </form>
      </div>

      <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-400">
        <span className="font-semibold text-slate-300">Remote Sandbox Note:</span> Commands execute within the isolated cgroup container on Oracle Linux. No shell commands are executed inside the browser or client phone.
      </div>
    </div>
  );
};
