import React, { useState, useEffect } from 'react';
import { useControlCenter, ScreenId } from '../../../context/ControlCenterContext.tsx';
import {
  FolderGit2,
  FileCode,
  Terminal,
  Github,
  Cpu,
  Sparkles,
  Activity,
  HardDrive,
  Shield,
  Settings,
  Search,
  ArrowRight,
} from 'lucide-react';

interface ModuleItem {
  id: ScreenId;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
  badge?: string;
}

export const MoreScreen: React.FC = () => {
  const { setCurrentScreen, services, refreshKey } = useControlCenter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeProjectsCount, setActiveProjectsCount] = useState<number | null>(null);
  const [enabledMcpCount, setEnabledMcpCount] = useState<number | null>(null);
  const [healthStatus, setHealthStatus] = useState<string>('Checking...');
  const [backupVerified, setBackupVerified] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      services.projectsApi.getProjects(),
      services.mcpApi.getServers(),
      services.healthApi.getHealth(),
      services.backupApi.getStatus(),
    ]).then(([pRes, mRes, hRes, bRes]) => {
      if (!isMounted) return;
      setActiveProjectsCount(pRes.data.length);
      setEnabledMcpCount(mRes.data.filter((s) => s.enabled).length);
      setHealthStatus(hRes.data.status);
      setBackupVerified(bRes.data.checksumState === 'VERIFIED');
    }).catch(() => {
      if (isMounted) setHealthStatus('DEGRADED');
    });

    return () => {
      isMounted = false;
    };
  }, [services, refreshKey]);

  const modules: ModuleItem[] = [
    {
      id: 'projects',
      title: 'Projects',
      description: 'Workstation repositories, git branches, and workspace directories',
      icon: FolderGit2,
      tag: 'Core',
      badge: activeProjectsCount !== null ? `${activeProjectsCount} Active` : 'Projects',
    },
    {
      id: 'files',
      title: 'Files',
      description: 'Remote filesystem tree browser, code editor, and file operations',
      icon: FileCode,
      tag: 'Workspace',
      badge: 'Remote Workspace',
    },
    {
      id: 'terminal',
      title: 'Terminal',
      description: 'Interactive remote PTY console connected to simulated sandbox',
      icon: Terminal,
      tag: 'Workspace',
      badge: 'Phase 1 Mock',
    },
    {
      id: 'github',
      title: 'GitHub',
      description: 'Repository sync status, pull requests, issues, and CI test status',
      icon: Github,
      tag: 'Integration',
      badge: 'Mock Proxy',
    },
    {
      id: 'mcp',
      title: 'MCP Servers',
      description: 'Model Context Protocol servers, stdio/sse transports, and tools',
      icon: Cpu,
      tag: 'Protocol',
      badge: enabledMcpCount !== null ? `${enabledMcpCount} Enabled` : 'MCP Servers',
    },
    {
      id: 'models',
      title: 'Model Center',
      description: 'Multi-provider AI routing matrix (Anthropic, LiteLLM, Gemini, OpenRouter)',
      icon: Sparkles,
      tag: 'Routing',
      badge: 'Configurable',
    },
    {
      id: 'monitor',
      title: 'System Monitor',
      description: 'Host CPU, RAM, NVMe metrics and degraded service health diagnostics',
      icon: Activity,
      tag: 'Observability',
      badge: healthStatus,
    },
    {
      id: 'backups',
      title: 'Backups & Snapshots',
      description: 'Differential workspace snapshots and restore verifications',
      icon: HardDrive,
      tag: 'Continuity',
      badge: backupVerified ? 'Verified' : 'Snapshots',
    },
    {
      id: 'admin',
      title: 'Admin & Infrastructure',
      description: 'Host control, process supervisor, security audit, and permissions',
      icon: Shield,
      tag: 'Control',
      badge: 'Phase 1 Preview',
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Theme preferences, service adapter mode, and offline simulation',
      icon: Settings,
      tag: 'Client',
      badge: 'Preferences',
    },
  ];

  const filtered = modules.filter(
    (m) =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-3.5 sm:p-6 space-y-4 max-w-5xl mx-auto pb-28 animate-in fade-in duration-150">
      {/* Header */}
      <div>
        <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
          <span>Control Hub & Modules</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            {modules.length}
          </span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Access all remote workstation tools, protocols, and infrastructure
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
        <input
          type="text"
          placeholder="Filter modules (e.g. 'mcp', 'terminal', 'git', 'backup')..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-400"
        />
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {filtered.map((item) => {
          const Icon = item.icon;
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => setCurrentScreen(item.id)}
              className="p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800/90 transition-all cursor-pointer flex items-start justify-between gap-3 group text-left w-full"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-slate-800 group-hover:bg-amber-500/10 border border-slate-700/60 group-hover:border-amber-500/40 text-slate-300 group-hover:text-amber-400 transition-colors flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-xs sm:text-sm text-slate-100 group-hover:text-amber-300 transition-colors">
                      {item.title}
                    </h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                      {item.tag}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end justify-between self-stretch flex-shrink-0">
                {item.badge && (
                  <span className="text-[10px] font-mono text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    {item.badge}
                  </span>
                )}
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
