import React, { useEffect, useState } from 'react';
import { useControlCenter } from '../../../context/ControlCenterContext.tsx';
import { ServerResourceSummary, SystemServiceStatus } from '../../../domain/models/index.ts';
import { HealthBadge } from '../../common/HealthBadge.tsx';
import { HealthStatus } from '../../../domain/enums/index.ts';
import {
  Activity,
  Cpu,
  HardDrive,
  Clock,
  Server,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';

export const MonitoringScreen: React.FC = () => {
  const { services, refreshKey } = useControlCenter();
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
        Polling hardware telemetry from Oracle Linux daemon...
      </div>
    );
  }

  return (
    <div className="p-3.5 sm:p-6 space-y-4 max-w-5xl mx-auto pb-28 font-mono text-xs animate-in fade-in duration-150">
      <div>
        <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-amber-400" />
          <span>Workstation Telemetry & Health</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Real-time metrics from Oracle Linux Cloud VM kernel sensors
        </p>
      </div>

      {/* Hardware Utilization Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* CPU */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-[11px]">
            <span className="flex items-center gap-1.5 font-semibold text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-amber-400" /> CPU ARM Ampere
            </span>
            <span className="text-slate-100 font-bold">{resources.cpuPercent}%</span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400" style={{ width: `${resources.cpuPercent}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>{resources.cpuCores ?? 0} Cores vCPU</span>
            <span>Load: {resources.cpuLoadAvg ? resources.cpuLoadAvg.join(', ') : 'N/A'}</span>
          </div>
        </div>

        {/* RAM */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-[11px]">
            <span className="font-semibold text-slate-300">RAM Memory</span>
            <span className="text-slate-100 font-bold">{resources.memoryPercent}%</span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400" style={{ width: `${resources.memoryPercent}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Used: {resources.memoryUsedGb} GB</span>
            <span>Total: {resources.memoryTotalGb} GB</span>
          </div>
        </div>

        {/* Disk */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-[11px]">
            <span className="flex items-center gap-1.5 font-semibold text-slate-300">
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" /> NVMe Storage
            </span>
            <span className="text-slate-100 font-bold">{resources.diskPercent}%</span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-400" style={{ width: `${resources.diskPercent}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Used: {resources.diskUsedGb} GB</span>
            <span>Total: {resources.diskTotalGb} GB</span>
          </div>
        </div>
      </div>

      {/* Host Specs Banner */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap justify-between items-center gap-2 text-[11px] text-slate-400">
        <div>OS: {resources.osName}</div>
        <div>Kernel: {resources.kernelVersion}</div>
        <div>Uptime: {resources.uptimeFormatted}</div>
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
                  <div className="text-[10px] text-slate-500">Latency: {svc.latencyMs}ms • Checked: {svc.lastChecked}</div>
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
