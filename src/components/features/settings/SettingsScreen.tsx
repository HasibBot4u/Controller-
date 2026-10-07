import React from 'react';
import { useControlCenter } from '../../../context/ControlCenterContext.tsx';
import {
  Settings,
  Sun,
  Moon,
  WifiOff,
  Wifi,
  Smartphone,
  Shield,
  Layers,
  RotateCcw,
  Info,
  CheckCircle2,
} from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const {
    theme,
    toggleTheme,
    simulateOffline,
    setSimulateOffline,
    selectedProjectId,
    setSelectedProjectId,
    triggerRefresh,
  } = useControlCenter();

  return (
    <div className="p-3.5 sm:p-6 space-y-4 max-w-4xl mx-auto pb-28 font-mono text-xs animate-in fade-in duration-150">
      <div>
        <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-amber-400" />
          <span>Client & Control Settings</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Thin-client configuration and test harness controls
        </p>
      </div>

      {/* Thin-Client Architectural Principle Card */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs sm:text-sm">
          <Smartphone className="w-4 h-4 text-amber-400" />
          <span>Architectural Rule: Thin-Client Only</span>
        </div>
        <p className="text-slate-300 text-xs leading-relaxed">
          Your browser is purely a remote display and command dispatch surface.
          No LLM runtimes, MCP servers, builds, tests, or bash environments run on this device.
          All execution occurs securely on the cloud-hosted Oracle Linux VM instance.
        </p>
      </div>

      {/* Settings Options */}
      <div className="space-y-3">
        {/* Appearance Mode */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-slate-200 block text-xs sm:text-sm">Appearance Theme</span>
            <span className="text-slate-400 text-xs">Switch between dark technical console and light UI</span>
          </div>
          <button
            onClick={toggleTheme}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
          >
            {theme === 'dark' ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
            <span className="capitalize">{theme} Mode</span>
          </button>
        </div>

        {/* Offline Simulation Toggle */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-slate-200 block text-xs sm:text-sm">
              Simulate Network Dropout (LTE / Flight)
            </span>
            <span className="text-slate-400 text-xs">
              Test continuity banner and thin-client reconnection behavior
            </span>
          </div>
          <button
            onClick={() => setSimulateOffline(!simulateOffline)}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition-colors font-medium ${
              simulateOffline
                ? 'bg-rose-950/80 border border-rose-700 text-rose-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            {simulateOffline ? <WifiOff className="w-4 h-4 text-rose-400" /> : <Wifi className="w-4 h-4 text-emerald-400" />}
            <span>{simulateOffline ? 'Disconnected (Simulated)' : 'Connected'}</span>
          </button>
        </div>

        {/* Default Workspace Project */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-slate-200 block text-xs sm:text-sm">Default Project Context</span>
            <span className="text-slate-400 text-xs">Scope client navigation to specific workstation repo</span>
          </div>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-black/50 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 font-mono"
          >
            <option value="proj-01">claude-workstation-core (proj-01)</option>
            <option value="proj-02">mcp-agent-gateway (proj-02)</option>
            <option value="proj-03">mobile-control-ui (proj-03)</option>
          </select>
        </div>

        {/* Cache & State Reset */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-slate-200 block text-xs sm:text-sm">Transient Client State</span>
            <span className="text-slate-400 text-xs">Re-sync view caches with remote mock adapter repositories</span>
          </div>
          <button
            onClick={triggerRefresh}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Re-sync Views</span>
          </button>
        </div>
      </div>
    </div>
  );
};
