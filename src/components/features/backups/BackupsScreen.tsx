import React, { useEffect, useState } from 'react';
import { useControlCenter } from '../../../context/ControlCenterContext.tsx';
import { BackupStatus } from '../../../domain/models/index.ts';
import { RiskLevel } from '../../../domain/enums/index.ts';
import {
  HardDrive,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  Clock,
  Play,
  FileCheck,
  History,
  AlertCircle,
} from 'lucide-react';

export const BackupsScreen: React.FC = () => {
  const { services, requestApproval, triggerRefresh, refreshKey } = useControlCenter();
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    services.backupApi.getStatus().then((res) => {
      setBackupStatus(res.data);
      setLoading(false);
    });
  }, [services, refreshKey]);

  const handleBackupNow = async () => {
    const approved = await requestApproval({
      activityId: 'act-bk-trigger',
      projectId: 'proj-01',
      riskLevel: RiskLevel.CONFIRM,
      actionType: 'BACKUP_CREATE',
      title: 'Trigger Immediate Differential Backup',
      description: 'Stream workspace snapshot to Oracle Object Storage container.',
      parameters: { destination: backupStatus?.destination },
    });

    if (approved) {
      const res = await services.backupApi.triggerBackup();
      setActionMessage(`Backup snapshot triggered (Job: ${res.data.jobId})`);
      setTimeout(() => setActionMessage(null), 4000);
      triggerRefresh();
    }
  };

  const handleVerify = async () => {
    const res = await services.backupApi.verifyBackup();
    setActionMessage(res.data.message);
    setTimeout(() => setActionMessage(null), 5000);
  };

  const handleRestoreTest = async () => {
    const approved = await requestApproval({
      activityId: 'act-bk-restore-test',
      projectId: 'proj-01',
      riskLevel: RiskLevel.STRONG_CONFIRM,
      actionType: 'BACKUP_RESTORE_TEST',
      title: 'Run Synthetic Sandbox Restore Test',
      description: 'Spins up isolated temp container, unpacks latest snapshot, and audits SHA-256 integrity.',
      parameters: { testContainer: 'sandbox-verify-tmp' },
    });

    if (approved) {
      const res = await services.backupApi.testRestore();
      setActionMessage(res.data.message);
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  if (loading || !backupStatus) {
    return <div className="p-8 text-center text-slate-400 font-mono text-xs">Loading backup status...</div>;
  }

  return (
    <div className="p-3.5 sm:p-6 space-y-4 max-w-5xl mx-auto pb-28 font-mono text-xs animate-in fade-in duration-150">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-amber-400" />
            <span>Backups & Checkpoints</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Durable disaster recovery to Oracle Object Storage
          </p>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Backup Status Overview */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Last Successful Snapshot</span>
            <span className="text-sm font-bold text-slate-200">
              {new Date(backupStatus.lastSuccessfulBackup).toLocaleString()} ({backupStatus.backupAge})
            </span>
          </div>

          <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800 flex items-center gap-1 font-semibold text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5" />
            CHECKSUMS {backupStatus.checksumState}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5">Backup Size</span>
            <span className="font-semibold text-slate-100">{backupStatus.backupSize}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-0.5">Next Schedule</span>
            <span className="font-semibold text-slate-100">{new Date(backupStatus.nextScheduledBackup).toLocaleTimeString()}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800 col-span-2">
            <span className="text-[10px] text-slate-400 block mb-0.5">Last Restore Verification</span>
            <span className="font-semibold text-emerald-400">{backupStatus.lastRestoreTest}</span>
          </div>
        </div>

        <div className="p-2.5 bg-black/40 border border-slate-800 rounded-lg text-[11px] text-slate-400 truncate">
          Destination: {backupStatus.destination}
        </div>

        {/* Buttons Bar */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={handleBackupNow}
            className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-950 transition-transform active:scale-95"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Backup Now</span>
          </button>
          <button
            onClick={handleVerify}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Verify Checksums</span>
          </button>
          <button
            onClick={handleRestoreTest}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Restore Test</span>
          </button>
        </div>
      </div>

      {/* Snapshot History Table */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
          Snapshot Archive History
        </span>

        <div className="space-y-2">
          {backupStatus.history.map((h) => (
            <div
              key={h.id}
              className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80 flex items-center justify-between gap-2"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-200">{h.id}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-300">{h.size}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 truncate">{h.checksum}</div>
              </div>

              <div className="text-right">
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {h.status}
                </span>
                <div className="text-[10px] text-slate-500 mt-1">
                  {new Date(h.timestamp).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
