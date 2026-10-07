import React, { useEffect, useState } from 'react';
import { useControlCenter } from '../../../context/ControlCenterContext.tsx';
import { McpServerItem } from '../../../domain/models/index.ts';
import { RiskLevel } from '../../../domain/enums/index.ts';
import { HealthBadge } from '../../common/HealthBadge.tsx';
import {
  Cpu,
  Power,
  RotateCcw,
  Settings,
  Terminal,
  Plus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';

export const McpScreen: React.FC = () => {
  const { services, requestApproval, triggerRefresh, refreshKey } = useControlCenter();
  const [servers, setServers] = useState<McpServerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLogs, setSelectedLogs] = useState<{ name: string; logs: string } | null>(null);

  useEffect(() => {
    services.mcpApi.getServers().then((res) => {
      setServers(res.data);
      setLoading(false);
    });
  }, [services, refreshKey]);

  const handleToggle = async (s: McpServerItem) => {
    const nextState = !s.enabled;
    const approved = await requestApproval({
      activityId: 'act-mcp-toggle',
      projectId: 'proj-01',
      riskLevel: RiskLevel.CONFIRM,
      actionType: 'MCP_SERVER_TOGGLE',
      title: `${nextState ? 'Enable' : 'Disable'} MCP Server: ${s.name}`,
      description: `Toggle daemon process and reload tool capabilities in Claude runtime.`,
      parameters: { serverId: s.id, enabled: nextState },
    });

    if (approved) {
      await services.mcpApi.toggleServer(s.id, nextState);
      triggerRefresh();
    }
  };

  const handleRestart = async (s: McpServerItem) => {
    const approved = await requestApproval({
      activityId: 'act-mcp-restart',
      projectId: 'proj-01',
      riskLevel: RiskLevel.CONFIRM,
      actionType: 'MCP_SERVER_RESTART',
      title: `Restart MCP Server: ${s.name}`,
      description: `Kill active process and reinitialize stdio/sse pipe transport on Oracle Linux host.`,
      parameters: { serverId: s.id },
    });

    if (approved) {
      await services.mcpApi.restartServer(s.id);
      triggerRefresh();
    }
  };

  const showLogs = (s: McpServerItem) => {
    setSelectedLogs({
      name: s.name,
      logs: `[${new Date().toISOString()}] [INFO] [${s.name}] Transport: ${s.transport} connected.\n[${new Date().toISOString()}] [INFO] Registered ${s.toolsCount} tool schema definitions into Claude context.\n[${new Date().toISOString()}] [INFO] Stdio pipe healthcheck: ping latency 2.4ms.\n${s.lastError ? `[WARN] ${s.lastError}\n` : ''}`,
    });
  };

  return (
    <div className="p-3.5 sm:p-6 space-y-4 max-w-5xl mx-auto pb-28 font-mono text-xs animate-in fade-in duration-150">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-amber-400" />
            <span>MCP Protocol Gateway</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {servers.length}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Model Context Protocol daemon multiplexer running on Oracle VM
          </p>
        </div>

        <button
          onClick={() => {
            services.mcpApi.addServer({ name: 'custom-sqlite-mcp', transport: 'stdio' }).then(() => triggerRefresh());
          }}
          className="h-9 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow-md shadow-amber-950"
        >
          <Plus className="w-4 h-4" />
          <span>Add Server</span>
        </button>
      </div>

      <div className="space-y-2.5">
        {servers.map((s) => (
          <div
            key={s.id}
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/90 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200 text-sm">{s.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                    {s.transport.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-slate-500">v{s.version}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{s.description}</p>
              </div>

              <div className="flex items-center gap-2">
                <HealthBadge status={s.status} />
              </div>
            </div>

            {s.lastError && (
              <div className="p-2 rounded bg-amber-950/40 border border-amber-800/40 text-[11px] text-amber-300 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>{s.lastError}</span>
              </div>
            )}

            {s.command && (
              <div className="p-2 bg-black/40 border border-slate-800 rounded-lg text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
                <Terminal className="w-3 h-3 text-slate-500 flex-shrink-0" />
                <span className="truncate">{s.command}</span>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
              <span className="text-slate-400">{s.toolsCount} active tools</span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => showLogs(s)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Logs
                </button>
                <button
                  onClick={() => handleRestart(s)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 text-amber-400" />
                  Restart
                </button>
                <button
                  onClick={() => handleToggle(s)}
                  className={`px-2.5 py-1 rounded font-semibold flex items-center gap-1 cursor-pointer ${
                    s.enabled
                      ? 'bg-rose-950/60 border border-rose-800 text-rose-300 hover:bg-rose-900/60'
                      : 'bg-emerald-950/60 border border-emerald-800 text-emerald-300 hover:bg-emerald-900/60'
                  }`}
                >
                  <Power className="w-3 h-3" />
                  {s.enabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Logs Modal */}
      {selectedLogs && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0e1422] border border-slate-800 rounded-t-2xl sm:rounded-2xl p-5 space-y-3 text-slate-100 font-mono text-xs">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="font-semibold text-slate-200">
                Daemon Logs: {selectedLogs.name}
              </span>
              <button onClick={() => setSelectedLogs(null)} className="text-slate-400">
                Close
              </button>
            </div>
            <pre className="p-3 bg-black/80 border border-slate-800 rounded-lg text-slate-300 max-h-64 overflow-y-auto whitespace-pre-wrap text-[11px]">
              {selectedLogs.logs}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
