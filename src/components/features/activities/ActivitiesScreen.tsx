import React, { useEffect, useState } from 'react';
import { useControlCenter } from '../../../context/ControlCenterContext.tsx';
import { Activity } from '../../../domain/models/index.ts';
import { ActivityStatus } from '../../../domain/enums/index.ts';
import { StatusPill } from '../../common/StatusPill.tsx';
import { ActivityDetailView } from './ActivityDetailView.tsx';
import {
  Plus,
  Search,
  Filter,
  ArrowRight,
  GitBranch,
  Radio,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';

import { formatCurrency } from '../../../utils/format.ts';

export const ActivitiesScreen: React.FC = () => {
  const {
    services,
    selectedActivityId,
    setSelectedActivityId,
    refreshKey,
    triggerRefresh,
    selectedProjectId,
  } = useControlCenter();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    services.activitiesApi
      .getActivities()
      .then((res) => {
        if (isMounted) setActivities(res.data);
      })
      .catch((err) => {
        console.error('Error fetching activities:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [services, refreshKey]);

  if (selectedActivityId) {
    return (
      <div className="p-3.5 sm:p-6">
        <ActivityDetailView
          activityId={selectedActivityId}
          onBack={() => setSelectedActivityId(null)}
        />
      </div>
    );
  }

  const filteredActivities = activities.filter((act) => {
    const matchesFilter = filterStatus === 'ALL' || act.status === filterStatus;
    const matchesSearch =
      act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await services.activitiesApi.createActivity({
        projectId: selectedProjectId || 'proj-01',
        title: newTitle,
        description: newDesc,
        model: 'claude-sonnet-5-5',
        provider: 'Anthropic',
      });
      setNewTitle('');
      setNewDesc('');
      setShowCreateModal(false);
      setSelectedActivityId(res.data.id);
      triggerRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-3.5 sm:p-6 space-y-4 max-w-5xl mx-auto pb-24 animate-in fade-in duration-150">
      {/* Header & New Activity Button */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
            <span>Remote Activities</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {activities.length}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Durable work-items running in cloud cgroups
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="h-9 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs font-mono flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow-md shadow-amber-950"
        >
          <Plus className="w-4 h-4" />
          <span>New Activity</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search activities, IDs, or git branches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 select-none">
          {['ALL', 'RUNNING', 'WAITING_APPROVAL', 'RECOVERABLE', 'COMPLETED', 'PAUSED'].map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono whitespace-nowrap transition-colors cursor-pointer ${
                  filterStatus === status
                    ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 font-medium'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            )
          )}
        </div>
      </div>

      {/* Activities Feed */}
      <div className="space-y-2.5">
        {filteredActivities.length === 0 ? (
          <div className="p-8 text-center text-slate-400 font-mono text-xs border border-dashed border-slate-800 rounded-2xl">
            No activities matching criteria.
          </div>
        ) : (
          filteredActivities.map((act) => (
            <div
              key={act.id}
              onClick={() => setSelectedActivityId(act.id)}
              className="p-4 rounded-xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800/90 transition-all cursor-pointer space-y-2.5 group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono text-amber-400/90 font-semibold">
                      {act.id}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-[11px] font-mono text-slate-400">{act.projectId}</span>
                  </div>
                  <h3 className="font-semibold text-sm text-slate-100 group-hover:text-amber-300 transition-colors line-clamp-1">
                    {act.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                    {act.description}
                  </p>
                </div>
                <StatusPill status={act.status} />
              </div>

              {/* Action Banner */}
              {act.currentAction && (
                <div className="p-2 rounded-lg bg-black/40 border border-slate-800/80 text-[11px] font-mono text-slate-300 flex items-start gap-1.5">
                  <span className="text-amber-400 flex-shrink-0">›</span>
                  <span className="truncate">{act.currentAction}</span>
                </div>
              )}

              {/* Telemetry Chips */}
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center gap-1 text-slate-300">
                    <GitBranch className="w-3 h-3 text-slate-500" />
                    {act.gitBranch}
                  </span>
                  <span>•</span>
                  <span>{act.filesChangedCount} files changed</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span>{formatCurrency(act.estimatedCost)}</span>
                  <span>•</span>
                  <span>
                    {new Date(act.updatedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Activity Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0e1422] border border-slate-800 rounded-t-2xl sm:rounded-2xl p-5 space-y-4 text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Dispatch Remote Activity
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xs font-mono"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateActivity} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Title / Work Objective:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement resilient SSE keep-alive buffer"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Detailed Description:</label>
                <textarea
                  rows={3}
                  placeholder="Specific requirements, constraints, or test targets..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="p-3 bg-black/40 border border-slate-800 rounded-lg text-[11px] text-slate-400 leading-relaxed">
                Execution target: Oracle Linux VM sandbox cgroup. Initial Claude Code session will be initialized on the cloud host.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
                >
                  Schedule Remote Execution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
