import React, { useEffect, useState } from 'react';
import { useControlCenter } from '../../../context/ControlCenterContext.tsx';
import { ModelProfile, TaskRoutingPolicy } from '../../../domain/models/index.ts';
import { HealthBadge } from '../../common/HealthBadge.tsx';
import {
  Sparkles,
  Zap,
  ShieldAlert,
  Check,
  CheckCircle2,
  Sliders,
  DollarSign,
  Cpu,
} from 'lucide-react';

export const ModelsScreen: React.FC = () => {
  const { services, triggerRefresh } = useControlCenter();
  const [profiles, setProfiles] = useState<ModelProfile[]>([]);
  const [policies, setPolicies] = useState<TaskRoutingPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([services.modelsApi.getProfiles(), services.modelsApi.getRoutingPolicies()]).then(
      ([pRes, rRes]) => {
        setProfiles(pRes.data);
        setPolicies(rRes.data);
        setLoading(false);
      }
    );
  }, [services]);

  const handleUpdatePolicy = async (id: string, updates: Partial<TaskRoutingPolicy>) => {
    await services.modelsApi.updateRoutingPolicy(id, updates);
    triggerRefresh();
  };

  return (
    <div className="p-3.5 sm:p-6 space-y-5 max-w-5xl mx-auto pb-28 font-mono text-xs animate-in fade-in duration-150">
      <div>
        <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span>Model Routing Center</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Dynamic cost-optimized model proxy configuration on Oracle Linux host
        </p>
      </div>

      {/* Task Routing Matrix */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
            Task Routing Policy Matrix
          </span>
          <span className="text-[10px] text-slate-500">Auto-routes incoming tasks by complexity</span>
        </div>

        <div className="space-y-2">
          {policies.map((pol) => (
            <div
              key={pol.id}
              className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      pol.taskComplexity === 'CRITICAL'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : pol.taskComplexity === 'COMPLEX'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : pol.taskComplexity === 'NORMAL'
                        ? 'bg-blue-950 text-blue-300 border border-blue-800'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {pol.taskComplexity}
                  </span>
                  <span className="text-xs text-slate-300 font-sans">{pol.description}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  value={pol.targetModel}
                  onChange={(e) => handleUpdatePolicy(pol.id, { targetModel: e.target.value })}
                  className="bg-black/50 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.model}>
                      {p.provider}: {p.model}
                    </option>
                  ))}
                </select>

                {pol.requiresApproval && (
                  <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-700 text-amber-300 text-[10px] flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-amber-400" />
                    REQUIRES APPROVAL
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Model Profiles List */}
      <section className="space-y-3">
        <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] block">
          Configured Provider Profiles
        </span>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {profiles.map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200 text-xs sm:text-sm">{p.model}</span>
                  </div>
                  <span className="text-[11px] text-amber-400 mt-0.5 block">{p.provider}</span>
                </div>
                <HealthBadge status={p.availability} />
              </div>

              <div className="text-[11px] text-slate-400 truncate">Endpoint: {p.baseUrl}</div>

              {/* Capabilities Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {p.toolCalling && (
                  <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px]">
                    Tool Calling
                  </span>
                )}
                {p.streaming && (
                  <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px]">
                    Streaming
                  </span>
                )}
                {p.thinkingSupport && (
                  <span className="px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 text-[10px]">
                    Thinking Mode
                  </span>
                )}
                {p.tokenAccounting && (
                  <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
                    Token Accounting
                  </span>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between text-[11px] text-slate-400">
                <span>
                  Est. Cost: ${p.estimatedCostPer1M.input} / ${p.estimatedCostPer1M.output} per 1M tokens
                </span>
                <span>Priority: #{p.priority}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
