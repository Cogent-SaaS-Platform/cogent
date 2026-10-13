'use client';

import React, { useState } from 'react';
import {
  FileText,
  Clock,
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
      className="rounded-2xl border border-[#DDE3EE] bg-white p-6 shadow-xs transition-all"
    >
      <div className="flex flex-col gap-4">
        {/* Header with Title and ARCON Pre-Clearance Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DDE3EE] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2A4BFF]/10 border border-[#2A4BFF]/20 text-[#2A4BFF]">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0B0F1A]">Executive Compliance Briefing</h3>
              <p className="text-xs text-[#4B5565]">
                Level 2 Operational Assessment & Provenance Traceability
              </p>
            </div>
          </div>

          {/* ARCON Pre-Clearance Notice */}
          {arconPreclearanceRequired ? (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3.5 py-1 text-xs font-semibold text-amber-800">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
              <span>ARCON ASP Pre-Clearance Mandatory (Code Art. 24(1))</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3.5 py-1 text-xs font-semibold text-emerald-700">
              <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Standard Regulatory Pre-Clearance Standard</span>
            </div>
          )}
        </div>

        {/* Operational Summary Body */}
        <div className="py-2">
          <p className="text-sm leading-relaxed text-[#0B0F1A]">{summary}</p>
        </div>

        {/* Active Licenses Strip if present */}
        {activeLicenses.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#DDE3EE] text-xs">
            <span className="text-[#4B5565] font-semibold">Tenant License Profiles:</span>
            {activeLicenses.map((lic) => (
              <span
                key={lic}
                className="rounded-md bg-[#F5F6FA] border border-[#DDE3EE] px-2 py-0.5 text-[11px] font-mono font-bold text-[#2A4BFF]"
              >
                {lic}
              </span>
            ))}
          </div>
        )}

        {/* Cryptographic Audit Verification Seal */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F9FAFC] border border-[#DDE3EE] px-4 py-2.5 text-xs text-[#4B5565]">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[#8D99AE]" />
            <span className="text-[11px] text-[#4B5565]">Verified {new Date(telemetry.verifiedAt).toLocaleTimeString()} WAT</span>
          </div>

          {/* Cryptographic SHA-256 Audit Hash */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-[#8D99AE]">SHA-256 Seal:</span>
            <span className="font-mono text-[11px] text-[#0B0F1A] font-semibold">{truncatedHash}</span>
            <button
              onClick={handleCopyHash}
              title="Copy cryptographic audit hash"
              className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-[#E8EDF5] text-[#4B5565] hover:text-[#0B0F1A] transition-colors"
            >
              {copiedHash ? (
                <Check className="h-3 w-3 text-emerald-600" />
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
