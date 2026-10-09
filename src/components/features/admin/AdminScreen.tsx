import React, { useState } from 'react';
import { useControlCenter } from '../../../context/ControlCenterContext.tsx';
import { RiskLevel } from '../../../domain/enums/index.ts';
import {
  ShieldAlert,
  Server,
  Power,
  RotateCcw,
  CheckCircle2,
  Lock,
  Cpu,
  Layers,
  FileCheck,
  AlertTriangle,
} from 'lucide-react';

export const AdminScreen: React.FC = () => {
  const { services, requestApproval, serviceMode } = useControlCenter();
  const [adminNotice, setAdminNotice] = useState<string | null>(null);

  const handleReboot = async () => {
    const approved = await requestApproval({
      activityId: 'act-admin-reboot',
      projectId: 'host-system',
      riskLevel: RiskLevel.STRONG_CONFIRM,
      actionType: 'HOST_SYSTEM_REBOOT',
      title: 'Reboot Oracle Linux Host VM',
      description: 'Trigger full ACPI reboot of remote virtual machine instance. Daemon and cgroup containers will gracefully suspend.',
      commandOrDiff: 'sudo systemctl reboot',
      parameters: { instance: 'cloud-vm-ampere-01', gracePeriodSeconds: 15 },
    });

    if (approved) {
      const res = await services.adminApi.rebootServer(RiskLevel.STRONG_CONFIRM);
      setAdminNotice(res.data.message);
    }
  };

  const handleRestartDaemon = async () => {
    const approved = await requestApproval({
      activityId: 'act-admin-daemon-restart',
      projectId: 'host-system',
      riskLevel: RiskLevel.CONFIRM,
      actionType: 'SERVICE_RESTART',
      title: 'Restart claude-daemon.service',
      description: 'Restart systemd background daemon supervising Claude and MCP sub-processes.',
      commandOrDiff: 'sudo systemctl restart claude-daemon',
      parameters: { unit: 'claude-daemon.service' },
    });

    if (approved) {
      await services.adminApi.restartService('claude-daemon');
      setAdminNotice('Successfully restarted claude-daemon service on host.');
    }
  };

  const handleDiagnostic = async () => {
    const res = await services.adminApi.runDiagnostic();
    setAdminNotice(`Diagnostic result: ${res.data.status}\n${res.data.reports.join('\n')}`);
  };

  return (
    <div className="p-3.5 sm:p-6 space-y-4 max-w-5xl mx-auto pb-28 font-mono text-xs animate-in fade-in duration-150">
      <div>
        <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
          <Lock className="w-5 h-5 text-amber-400" />
          <span>Workstation Infrastructure & Admin</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Privileged operations executed via secure broker with explicit approval
        </p>
      </div>

      {adminNotice && (
        <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-300 whitespace-pre-wrap">
          {adminNotice}
        </div>
      )}

      {/* Grid of Admin Subsystems */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Server & Process Supervisor */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs sm:text-sm">
            <Server className="w-4 h-4 text-amber-400" />
            <span>Host Server & Daemon</span>
          </div>
          <p className="text-slate-400 text-xs">
            Manage systemd units, process cgroups, and VM power cycles.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleRestartDaemon}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Restart Daemon</span>
            </button>
            <button
              onClick={handleReboot}
              className="px-3 py-2 rounded-lg bg-rose-950/80 hover:bg-rose-900/80 border border-rose-700 text-rose-200 text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Reboot VM (Privileged)</span>
            </button>
          </div>
        </div>

        {/* Security & Audit */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs sm:text-sm">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <span>Security & Permissions</span>
          </div>
          <p className="text-slate-400 text-xs">
            Token isolation, audit trails, and 3-tier risk boundary verification.
          </p>

          <div className="p-2.5 bg-black/40 border border-slate-800 rounded-lg text-[11px] text-slate-400 space-y-1">
            <div>Auth: Client Session Certificate</div>
            <div>Risk Tiers: SAFE, CONFIRM, STRONG_CONFIRM</div>
            <div>Audit Log: /var/log/claude-audit.jsonl (Tamper-evident)</div>
          </div>
        </div>

        {/* Diagnostics & Self-Healing */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs sm:text-sm">
            <FileCheck className="w-4 h-4 text-cyan-400" />
            <span>Self-Healing & Diagnostics</span>
          </div>
          <p className="text-slate-400 text-xs">
            Inspect socket health, IPC channels, and memory leak telemetry.
          </p>

          <button
            onClick={handleDiagnostic}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 cursor-pointer"
          >
            Run Host Diagnostics
          </button>
        </div>

        {/* Infrastructure Topology */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs sm:text-sm">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Cloud Infrastructure Stack</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-slate-700 bg-slate-800 text-slate-400">
              {serviceMode === 'mock' ? 'DEMO SIMULATION' : 'PLANNED / NOT_CONFIGURED'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 space-y-1">
            <div>Compute: {serviceMode === 'mock' ? 'Oracle Cloud Infrastructure Ampere A1 (ARM64) [DEMO]' : 'Workstation Execution Host [NOT_CONFIGURED]'}</div>
            <div>Gateway: {serviceMode === 'mock' ? 'Cloudflare Zero Trust Tunnel [DEMO]' : 'Control Plane Gateway [NOT_CONFIGURED]'}</div>
            <div>Proxy: {serviceMode === 'mock' ? 'LiteLLM v1.42 (Local IPC) [DEMO]' : 'LiteLLM Proxy Router [NOT_CONFIGURED]'}</div>
            <div>Backup Target: {serviceMode === 'mock' ? 'Oracle Object Storage (Ashburn) [DEMO]' : 'Object Storage Target [NOT_CONFIGURED]'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
