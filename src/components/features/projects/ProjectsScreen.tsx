import React, { useEffect, useState } from 'react';
import { useControlCenter } from '../../../context/ControlCenterContext.tsx';
import { Project, Activity } from '../../../domain/models/index.ts';
import {
  FolderGit2,
  GitBranch,
  Layers,
  ArrowRight,
  Plus,
  Clock,
  CheckCircle2,
  FileCode,
  Bot,
  Cpu,
  ExternalLink,
  X,
} from 'lucide-react';

export const ProjectsScreen: React.FC = () => {
  const { services, selectedProjectId, setSelectedProjectId, setSelectedActivityId, setCurrentScreen, refreshKey } =
    useControlCenter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectActivities, setProjectActivities] = useState<Activity[]>([]);
  const [projectSessions, setProjectSessions] = useState<any[]>([]);
  const [mcpServers, setMcpServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newRepo, setNewRepo] = useState('');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    Promise.all([
      services.projectsApi.getProjects(),
      services.sessionsApi.getSessions(),
      services.mcpApi.getServers(),
    ])
      .then(([pRes, sRes, mRes]) => {
        if (isMounted) {
          setProjects(pRes.data);
          setProjectSessions(sRes.data);
          setMcpServers(mRes.data);
          const current = pRes.data.find((p) => p.id === selectedProjectId) || pRes.data[0];
          setSelectedProject(current || null);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [services, selectedProjectId, refreshKey]);

  useEffect(() => {
    if (selectedProject) {
      services.activitiesApi.getActivities(selectedProject.id).then((res) => {
        setProjectActivities(res.data);
      });
    }
  }, [selectedProject, services]);

  const handleSelectProject = (p: Project) => {
    setSelectedProject(p);
    setSelectedProjectId(p.id);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const res = await services.projectsApi.createProject({
        name: newName,
        description: newDesc,
        repository: newRepo || `github.com/org/${newName.toLowerCase().replace(/\s+/g, '-')}`,
      });
      setShowCreateModal(false);
      setNewName('');
      setNewDesc('');
      setNewRepo('');
      setSelectedProjectId(res.data.id);
      setSelectedProject(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-3.5 sm:p-6 space-y-4 max-w-5xl mx-auto pb-24 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
            <span>Remote Projects</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {projects.length}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Repositories hosted on Oracle Linux workstation filesystem
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="h-9 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs font-mono flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow-md shadow-amber-950"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {projects.map((proj) => {
          const isSelected = selectedProject?.id === proj.id;
          return (
            <div
              key={proj.id}
              onClick={() => handleSelectProject(proj)}
              className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                isSelected
                  ? 'bg-slate-900 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                  : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FolderGit2 className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span className="font-semibold text-xs sm:text-sm text-slate-100 font-mono truncate">
                    {proj.name}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    proj.isGitClean
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                      : 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                  }`}
                >
                  {proj.isGitClean ? 'CLEAN' : 'DIRTY'}
                </span>
              </div>

              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {proj.description}
              </p>

              <div className="space-y-1 text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5 text-slate-300 truncate">
                  <GitBranch className="w-3 h-3 text-slate-500" />
                  <span>{proj.branch}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>{proj.activityCount} activities</span>
                  <span>{proj.filesCount} files</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Project Full Details Drawer / Panel */}
      {selectedProject && (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-100">{selectedProject.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {selectedProject.id}
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">{selectedProject.description}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentScreen('files')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5 text-amber-400" />
                Files
              </button>
              <button
                onClick={() => setCurrentScreen('terminal')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 cursor-pointer"
              >
                Terminal
              </button>
            </div>
          </div>

          {/* Tri-Fold Summary: Git, Claude, MCP */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Git Summary */}
            <div className="p-3 rounded-lg bg-black/40 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <FolderGit2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Git Summary</span>
              </div>
              <div className="text-[11px] text-slate-400 space-y-1">
                <div>Repo: {selectedProject.repository}</div>
                <div>Branch: {selectedProject.branch}</div>
                <div>Working Tree: {selectedProject.isGitClean ? 'Clean' : 'Modified (2 uncommitted)'}</div>
                <div className="truncate">Path: {selectedProject.rootPath}</div>
              </div>
            </div>

            {/* Claude Summary */}
            <div className="p-3 rounded-lg bg-black/40 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <Bot className="w-4 h-4 text-amber-400" />
                <span>Claude Summary</span>
              </div>
              <div className="text-[11px] text-slate-400 space-y-1">
                <div>
                  Active Sessions: {projectSessions.filter((s) => s.projectId === selectedProject.id).length}
                </div>
                <div>
                  Default Model: {projectSessions.find((s) => s.projectId === selectedProject.id)?.model || '—'}
                </div>
                <div>Sandbox: Phase 1 Local Control Plane</div>
                <div>
                  Tokens: {projectSessions.filter((s) => s.projectId === selectedProject.id).reduce((sum, s) => sum + (s.tokensIn ?? 0) + (s.tokensOut ?? 0), 0).toLocaleString()}
                </div>
              </div>
            </div>

            {/* MCP Summary */}
            <div className="p-3 rounded-lg bg-black/40 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <Cpu className="w-4 h-4 text-amber-400" />
                <span>MCP Summary</span>
              </div>
              <div className="text-[11px] text-slate-400 space-y-1">
                <div>Servers Enabled: {mcpServers.filter((s) => s.enabled).length} of {mcpServers.length}</div>
                <div>Tools Available: {mcpServers.filter((s) => s.enabled).reduce((sum, s) => sum + s.toolsCount, 0)}</div>
                <div className="truncate">Filesystem Jail: {selectedProject.rootPath}</div>
                <div>Transport: stdio / sse multiplex</div>
              </div>
            </div>
          </div>

          {/* Recent Activity for this project */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
              Recent Activities in {selectedProject.name}
            </span>

            <div className="space-y-2">
              {projectActivities.length === 0 ? (
                <div className="p-3 text-slate-500 text-xs">No activities recorded yet.</div>
              ) : (
                projectActivities.map((act) => (
                  <div
                    key={act.id}
                    onClick={() => {
                      setSelectedActivityId(act.id);
                      setCurrentScreen('activities');
                    }}
                    className="p-3 rounded-lg bg-black/40 hover:bg-black/60 border border-slate-800 flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">{act.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {act.id} • {act.gitBranch} • ${(act.estimatedCost ?? 0).toFixed(2)}
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0e1422] border border-slate-800 rounded-t-2xl sm:rounded-2xl p-5 space-y-4 text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-amber-400" />
                Initialize Remote Project
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xs font-mono"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Project Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. data-pipeline-daemon"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description:</label>
                <input
                  type="text"
                  placeholder="Summary of project workspace..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Remote Git Repository:</label>
                <input
                  type="text"
                  placeholder="github.com/org/repo-name"
                  value={newRepo}
                  onChange={(e) => setNewRepo(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 rounded-lg bg-slate-900 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
                >
                  Create on Workstation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
