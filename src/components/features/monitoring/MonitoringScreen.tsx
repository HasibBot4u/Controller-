import React, { useEffect, useState } from 'react';
import { useControlCenter } from '../../../context/ControlCenterContext.tsx';
import { ServerResourceSummary, SystemServiceStatus } from '../../../domain/models/index.ts';
import { HealthBadge } from '../../common/HealthBadge.tsx';
import {
  Activity,
  Cpu,
  HardDrive,
  AlertTriangle,
  Server,
} from 'lucide-react';

export const MonitoringScreen: React.FC = () => {
  const { services, refreshKey, serviceMode } = useControlCenter();
  const [resources, setResources] = useState<ServerResourceSummary | null>(null);
  const [serviceList, setServiceList] = useState<SystemServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    services.monitoringApi.getMetrics().then((res) => {
      setResources(res.data.resources);
      setServiceList(res.data.services);
      setLoading(false);
    });
  }, [services, refreshKey]);

  if (loading || !resources) {
    return (
      <div className="p-8 text-center text-slate-400 font-mono text-xs">
        Connecting to workstation telemetry service...
      </div>
    );
  }

  const isDemo = serviceMode === 'mock' || resources.origin === 'DEMO';
  const isUnavailable = resources.origin === 'UNAVAILABLE' || resources.cpuPercent === null;

  return (
    <div className="p-3.5 sm:p-6 space-y-4 max-w-5xl mx-auto pb-28 font-mono text-xs animate-in fade-in duration-150">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-400" />
            <span>Workstation Telemetry & Health</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isDemo
              ? 'Simulated workstation telemetry metrics [DEMO]'
              : isUnavailable
              ? 'Workstation execution backend is not configured'
              : 'Real-time metrics from workstation host'}
          </p>
        </div>

        <span className="text-[11px] px-2 py-0.5 rounded border border-slate-700 bg-slate-800 text-slate-400">
          {isDemo ? 'DEMO SIMULATION' : isUnavailable ? 'NOT_CONFIGURED' : 'LIVE'}
        </span>
      </div>

      {isUnavailable && (
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2.5 text-slate-400 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>Execution backend is not configured. Hardware resource telemetry is currently unavailable.</span>
        </div>
      )}

      {/* Hardware Utilization Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* CPU */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-[11px]">
            <span className="flex items-center gap-1.5 font-semibold text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              {isDemo ? 'CPU ARM Ampere (Demo)' : 'CPU Execution Engine'}
            </span>
            <span className="text-slate-100 font-bold">
              {resources.cpuPercent !== null ? `${resources.cpuPercent}%` : '—'}
            </span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all"
              style={{ width: `${resources.cpuPercent ?? 0}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>
              {resources.cpuCores !== null ? `${resources.cpuCores} Cores vCPU` : '—'}
            </span>
            <span>
              Load: {resources.cpuLoadAvg && resources.cpuLoadAvg.length > 0 ? resources.cpuLoadAvg.join(', ') : '—'}
            </span>
          </div>
        </div>

        {/* RAM */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-[11px]">
            <span className="font-semibold text-slate-300">RAM Memory</span>
            <span className="text-slate-100 font-bold">
              {resources.memoryPercent !== null ? `${resources.memoryPercent}%` : '—'}
            </span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all"
              style={{ width: `${resources.memoryPercent ?? 0}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Used: {resources.memoryUsedGb !== null ? `${resources.memoryUsedGb} GB` : '—'}</span>
            <span>Total: {resources.memoryTotalGb !== null ? `${resources.memoryTotalGb} GB` : '—'}</span>
          </div>
        </div>

        {/* Disk */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-[11px]">
            <span className="flex items-center gap-1.5 font-semibold text-slate-300">
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" /> Host Storage
            </span>
            <span className="text-slate-100 font-bold">
              {resources.diskPercent !== null ? `${resources.diskPercent}%` : '—'}
            </span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all"
              style={{ width: `${resources.diskPercent ?? 0}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Used: {resources.diskUsedGb !== null ? `${resources.diskUsedGb} GB` : '—'}</span>
            <span>Total: {resources.diskTotalGb !== null ? `${resources.diskTotalGb} GB` : '—'}</span>
          </div>
        </div>
      </div>

      {/* Host Specs Banner */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap justify-between items-center gap-2 text-[11px] text-slate-400">
        <div>OS: {resources.osName || '—'}</div>
        <div>Kernel: {resources.kernelVersion || '—'}</div>
        <div>Uptime: {resources.uptimeFormatted || '—'}</div>
      </div>

      {/* Degraded State Diagnostics (Service Matrix) */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
            Subsystem Health Diagnostics
          </span>
          <div className="flex gap-2 text-[10px]">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Healthy
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Degraded
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Unavailable
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {serviceList.map((svc) => (
            <div
              key={svc.name}
              className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2.5">
                <HealthBadge status={svc.status} showDotOnly />
                <div>
                  <div className="font-semibold text-slate-200 text-xs">{svc.name}</div>
                  <div className="text-[10px] text-slate-500">
                    {svc.latencyMs !== null ? `Latency: ${svc.latencyMs}ms` : 'Latency: —'} • Checked: {svc.lastChecked || '—'}
                  </div>
                </div>
              </div>

              <HealthBadge status={svc.status} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
