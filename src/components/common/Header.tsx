import React from 'react';
import { useControlCenter, ScreenId } from '../../context/ControlCenterContext.tsx';
import {
  Server,
  RefreshCw,
  Sun,
  Moon,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react';

interface HeaderProps {
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const {
    currentScreen,
    setCurrentScreen,
    theme,
    toggleTheme,
    triggerRefresh,
    selectedProjectId,
    connectionState,
  } = useControlCenter();

  const getScreenDisplayName = (screen: ScreenId): string => {
    switch (screen) {
      case 'home':
        return 'Overview';
      case 'claude':
        return 'Claude Workspace';
      case 'activities':
        return 'Activities & Continuity';
      case 'jobs':
        return 'Remote Jobs';
      case 'projects':
        return 'Projects';
      case 'files':
        return 'Remote Files';
      case 'terminal':
        return 'Remote Terminal';
      case 'github':
        return 'GitHub Repo';
      case 'mcp':
        return 'MCP Servers';
      case 'models':
        return 'Model Center';
      case 'monitor':
        return 'System Monitor';
      case 'backups':
        return 'Backups & Snapshots';
      case 'admin':
        return 'Admin & Infrastructure';
      case 'settings':
        return 'Settings';
      case 'more':
        return 'Control Hub';
      default:
        return 'Control Center';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#090d16]/95 backdrop-blur border-b border-slate-800/80 px-3.5 sm:px-6 py-2.5 transition-colors">
      <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto">
        {/* Brand & Remote Status */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => setCurrentScreen('home')}
            className="flex items-center gap-2 text-left group cursor-pointer focus:outline-none"
            aria-label="Return to Home dashboard"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:border-amber-400 transition-colors">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-bold tracking-tight text-xs sm:text-sm text-slate-100 font-mono">
                  CLAUDE
                </span>
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  CONTROL
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-mono text-slate-400">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    connectionState === 'ONLINE' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-rose-500'
                  }`}
                />
                <span className="truncate max-w-[140px] xs:max-w-[180px]">
                  {connectionState === 'ONLINE' ? 'PHASE 1 (HTTP)' : connectionState}
                </span>
              </div>
            </div>
          </button>

          {/* Breadcrumb Section */}
          <div className="hidden md:flex items-center gap-1 text-xs text-slate-500 font-mono pl-3 border-l border-slate-800">
            <span>control</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-300 font-medium">
              {title || getScreenDisplayName(currentScreen)}
            </span>
          </div>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Active Project Pill */}
          <button
            onClick={() => setCurrentScreen('projects')}
            className="h-8 px-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-[11px] font-mono text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Active project context"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span className="max-w-[70px] xs:max-w-[110px] truncate">{selectedProjectId}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={triggerRefresh}
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Refresh telemetry data"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Toggle dark/light theme"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </header>
  );
};
