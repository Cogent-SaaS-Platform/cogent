'use client';

import React, { useState } from 'react';
import {
  FileText,
  Zap,
  Cpu,
  Clock,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

interface ExecutiveSummaryCardProps {
  summary: string;
  arconPreclearanceRequired: boolean;
  activeLicenses?: string[];
  telemetry: {
    latencyMs: number;
    modelIdentifier: string;
    verifiedAt: string;
    auditHash: string;
  };
}

export const ExecutiveSummaryCard: React.FC<ExecutiveSummaryCardProps> = ({
  summary,
  arconPreclearanceRequired,
  activeLicenses = [],
  telemetry,
}) => {
  const [copiedHash, setCopiedHash] = useState(false);

  const handleCopyHash = () => {
    if (telemetry.auditHash) {
      navigator.clipboard.writeText(telemetry.auditHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const truncatedHash = telemetry.auditHash
    ? `${telemetry.auditHash.substring(0, 10)}...${telemetry.auditHash.substring(telemetry.auditHash.length - 8)}`
    : 'N/A';

  return (
    <div
      id="marketing-shield-executive-summary"
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-lg transition-all"
    >
      <div className="flex flex-col gap-4">
        {/* Header with Title and ARCON Pre-Clearance Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Executive Compliance Briefing</h3>
              <p className="text-xs text-slate-400">
                Level 2 Operational Assessment & Provenance Traceability
              </p>
            </div>
          </div>

          {/* ARCON Pre-Clearance Notice */}
          {arconPreclearanceRequired ? (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3.5 py-1 text-xs font-medium text-amber-300">
              <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
              <span>ARCON ASP Pre-Clearance Mandatory (Code Art. 24(1))</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1 text-xs font-medium text-emerald-400">
              <FileCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Standard Regulatory Pre-Clearance Standard</span>
            </div>
          )}
        </div>

        {/* Operational Summary Body */}
        <div className="py-2">
          <p className="text-sm leading-relaxed text-slate-200">{summary}</p>
        </div>

        {/* Active Licenses Strip if present */}
        {activeLicenses.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60 text-xs">
            <span className="text-slate-400 font-medium">Tenant License Profiles:</span>
            {activeLicenses.map((lic) => (
              <span
                key={lic}
                className="rounded-md bg-slate-800 border border-slate-700 px-2 py-0.5 text-[11px] font-mono text-cyan-300"
              >
                {lic}
              </span>
            ))}
          </div>
        )}

        {/* Telemetry & Audit Verification Strip */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-950/70 border border-slate-800/80 px-4 py-2.5 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span>{telemetry.latencyMs}ms Latency</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-cyan-400" />
              <span className="font-mono text-slate-300">{telemetry.modelIdentifier}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>{new Date(telemetry.verifiedAt).toLocaleTimeString()} WAT</span>
            </div>
          </div>

          {/* Cryptographic SHA-256 Audit Hash */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-500">SHA-256:</span>
            <span className="font-mono text-[11px] text-slate-300">{truncatedHash}</span>
            <button
              onClick={handleCopyHash}
              title="Copy cryptographic audit hash"
              className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              {copiedHash ? (
                <Check className="h-3 w-3 text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
