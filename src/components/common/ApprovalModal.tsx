import React from 'react';
import { useControlCenter } from '../../context/ControlCenterContext.tsx';
import { RiskBadge } from './RiskBadge.tsx';
import { ApprovalStatus, RiskLevel } from '../../domain/enums/index.ts';
import { ShieldAlert, X, Check, Terminal, FileDiff } from 'lucide-react';

export const ApprovalModal: React.FC = () => {
  const { activeApproval, approvalErrorMessage, resolveApproval, closeApprovalModal } = useControlCenter();

  if (!activeApproval && !approvalErrorMessage) return null;

  if (!activeApproval && approvalErrorMessage) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="w-full max-w-md bg-[#0e1422] border border-rose-600 rounded-2xl p-5 text-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-rose-400 text-sm">Action Blocked</span>
            <button onClick={closeApprovalModal} className="text-slate-400 hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-rose-300">{approvalErrorMessage}</p>
        </div>
      </div>
    );
  }

  if (!activeApproval) return null;

  const isStrong = activeApproval.riskLevel === RiskLevel.STRONG_CONFIRM;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg bg-[#0e1422] border ${
          isStrong ? 'border-rose-600/80 shadow-[0_0_30px_rgba(225,29,72,0.3)]' : 'border-amber-500/60'
        } rounded-t-2xl sm:rounded-2xl p-5 flex flex-col gap-4 text-slate-100 max-h-[90vh] overflow-y-auto`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg ${
                isStrong ? 'bg-rose-950 text-rose-400' : 'bg-amber-950 text-amber-400'
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm sm:text-base text-slate-100">
                  Execution Authorization
                </h3>
                <RiskBadge level={activeApproval.riskLevel} />
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                ID: {activeApproval.id} • Action: {activeApproval.actionType}
              </p>
            </div>
          </div>
          <button
            onClick={closeApprovalModal}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm text-slate-200">{activeApproval.title}</h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {activeApproval.description}
            </p>
          </div>

          {activeApproval.commandOrDiff && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                <Terminal className="w-3.5 h-3.5" />
                <span>Command / Operation Payload:</span>
              </div>
              <pre className="p-3 bg-black/60 border border-slate-800 rounded-lg text-xs font-mono text-amber-300/90 overflow-x-auto whitespace-pre-wrap select-all">
                {activeApproval.commandOrDiff}
              </pre>
            </div>
          )}

          {activeApproval.parameters && Object.keys(activeApproval.parameters).length > 0 && (
            <div className="space-y-1">
              <span className="text-[11px] font-mono text-slate-400">Target Parameters:</span>
              <pre className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-300 overflow-x-auto">
                {JSON.stringify(activeApproval.parameters, null, 2)}
              </pre>
            </div>
          )}

          {isStrong && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/50 rounded-lg text-xs text-rose-300">
              <span className="font-semibold block mb-0.5">⚠️ Strong Confirmation Required</span>
              This action affects core remote infrastructure or kernel state on Oracle Linux. It will be recorded in the security audit log.
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
          <button
            onClick={() => resolveApproval(activeApproval.id, ApprovalStatus.REJECTED)}
            className="h-11 px-4 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 active:scale-98 text-slate-300 font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <X className="w-4 h-4 text-rose-400" />
            Reject & Abort
          </button>
          <button
            onClick={() => resolveApproval(activeApproval.id, ApprovalStatus.APPROVED)}
            className={`h-11 px-4 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-98 ${
              isStrong
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/50'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold shadow-amber-900/50'
            }`}
          >
            <Check className="w-4 h-4" />
            Authorize Execution
          </button>
        </div>
      </div>
    </div>
  );
};
