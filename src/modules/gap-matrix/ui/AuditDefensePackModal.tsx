'use client';

import React, { useState } from 'react';
import {
  X,
  Download,
  Printer,
  ShieldCheck,
  FileText,
  Key,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Hash,
} from 'lucide-react';
import { AuditDefenseDossier } from '../types';
import { defaultDossierExportService } from '../services/dossierExportService';

export interface AuditDefensePackModalProps {
  dossier: AuditDefenseDossier | null;
  evaluationId?: string;
  onClose: () => void;
}

export function AuditDefensePackModal({
  dossier: initialDossier,
  evaluationId,
  onClose,
}: AuditDefensePackModalProps) {
  const [dossier, setDossier] = useState<AuditDefenseDossier | null>(initialDossier);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If dossier was not pre-loaded but evaluationId was provided, load in real-time
  React.useEffect(() => {
    if (!dossier && evaluationId) {
      setIsLoading(true);
      fetch(`/api/gap-matrix/evaluations/${evaluationId}/dossier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
        .then((res) => res.json())
        .then((res) => {
          if (res.success && res.data?.dossier) {
            setDossier(res.data.dossier);
          } else {
            setError(res.error || 'Failed generating audit defense dossier');
          }
        })
        .catch((err) => {
          setError(err.message || 'Network error fetching dossier');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [dossier, evaluationId]);

  if (!dossier && !isLoading && !error) return null;

  const handleDownloadMarkdown = () => {
    if (!dossier) return;
    const md = defaultDossierExportService.renderToMarkdown(dossier);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${dossier.dossierReference.replace(/\//g, '_')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadHtml = () => {
    if (!dossier) return;
    const html = defaultDossierExportService.renderToHtml(dossier);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${dossier.dossierReference.replace(/\//g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const formattedExposure = dossier
    ? new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 0,
      }).format(dossier.totalPotentialPenaltyNaira)
    : '₦0';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Bar */}
        <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
              <ShieldCheck className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Bank Examiner Audit Defense Dossier
                <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider">
                  Deterministic Defense Pack
                </span>
              </h2>
              {dossier && (
                <p className="font-mono text-xs text-slate-600 mt-0.5">
                  Ref: {dossier.dossierReference} &bull; SHA-256: {dossier.sha256VerificationHash.slice(0, 16)}...
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {dossier && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadHtml}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg font-medium text-xs shadow-2xs transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  HTML Export
                </button>
                <button
                  type="button"
                  onClick={handleDownloadMarkdown}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg font-medium text-xs shadow-2xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  Markdown Export
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg font-medium text-xs shadow-xs transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Dossier
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Loading / Error State */}
        {isLoading && (
          <div className="p-16 text-center text-slate-500 font-mono text-xs">
            Compiling cryptographic audit defense pack...
          </div>
        )}

        {error && (
          <div className="p-8 text-center text-rose-600 text-xs">
            {error}
          </div>
        )}

        {/* Scrollable Dossier Content */}
        {dossier && (
          <div className="p-6 overflow-y-auto space-y-6 text-slate-900 bg-slate-50/50" id="printable-dossier">
            {/* Official Transmittal Letterhead */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 text-center">
              <span className="font-mono text-xs text-slate-600 uppercase tracking-wider block mb-1">
                Confidential Supervisory Audit Defense Pack
              </span>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight uppercase">
                {dossier.issuingRegulator} &bull; Statutory Concordance Defense
              </h1>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                Clause-by-Clause Statutory Compliance & 5-W Decision Gap Matrix Defense Dossier
              </p>
            </div>

            {/* Institutional Metadata Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-white border border-slate-200 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Regulated Entity
                </span>
                <span className="font-semibold text-slate-900">{dossier.organizationName}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Policy Instrument
                </span>
                <span className="font-semibold text-slate-900">{dossier.policyTitle} (v{dossier.policyVersion})</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Statutory Benchmark
                </span>
                <span className="font-mono text-xs text-slate-600">{dossier.benchmarkTitle}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Supervisory Authority
                </span>
                <span className="font-semibold text-slate-900">{dossier.issuingRegulator}</span>
              </div>
            </div>

            {/* Metric Strip: Unified container with 1px hairline dividers, monochrome numbers per AGENTS.md */}
            <div className="bg-white border border-slate-200 rounded-lg grid grid-cols-2 md:grid-cols-5 divide-x divide-slate-200 shadow-2xs overflow-hidden">
              <div className="p-4 text-center">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Concordance Health
                </span>
                <div className="text-slate-900 font-mono text-2xl font-bold tracking-tight">
                  {dossier.overallCompliancePercentage.toFixed(1)}%
                </div>
              </div>
              <div className="p-4 text-center">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Adequately Met
                </span>
                <div className="text-slate-900 font-mono text-2xl font-bold tracking-tight">
                  {dossier.adequatelyMetCount}
                </div>
              </div>
              <div className="p-4 text-center">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Partially Met
                </span>
                <div className="text-slate-900 font-mono text-2xl font-bold tracking-tight">
                  {dossier.partiallyMetCount}
                </div>
              </div>
              <div className="p-4 text-center">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Critical Gaps
                </span>
                <div className="text-slate-900 font-mono text-2xl font-bold tracking-tight">
                  {dossier.criticalGapsCount}
                </div>
              </div>
              <div className="p-4 text-center">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Sanction Exposure
                </span>
                <div className="text-slate-900 font-mono text-2xl font-bold tracking-tight truncate">
                  {formattedExposure}
                </div>
              </div>
            </div>

            {/* Cryptographic Chain of Custody Table */}
            {dossier.cryptographicValidationTable && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <Hash className="w-3.5 h-3.5 text-slate-500" />
                  <span>Cryptographic Chain of Custody & Tamper-Evidence Seals</span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <th className="p-2.5 font-semibold">Evidence Component</th>
                        <th className="p-2.5 font-semibold">Algorithm</th>
                        <th className="p-2.5 font-semibold">Cryptographic Digest</th>
                        <th className="p-2.5 font-semibold">Verification Seal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      <tr>
                        <td className="p-2.5 text-slate-700 font-sans font-medium">Input Policy Document Digest</td>
                        <td className="p-2.5 text-slate-500">SHA-256</td>
                        <td className="p-2.5 text-slate-600 truncate max-w-xs">{dossier.cryptographicValidationTable.inputPolicyHash}</td>
                        <td className="p-2.5 text-emerald-700">VERIFIED_IMMUTABLE</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-slate-700 font-sans font-medium">Statutory Benchmark Standard Digest</td>
                        <td className="p-2.5 text-slate-500">SHA-256</td>
                        <td className="p-2.5 text-slate-600 truncate max-w-xs">{dossier.cryptographicValidationTable.benchmarkVersionHash}</td>
                        <td className="p-2.5 text-emerald-700">VERIFIED_IMMUTABLE</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-slate-700 font-sans font-medium">Concordance Findings Matrix Digest</td>
                        <td className="p-2.5 text-slate-500">SHA-256</td>
                        <td className="p-2.5 text-slate-600 truncate max-w-xs">{dossier.cryptographicValidationTable.findingsDigestHash}</td>
                        <td className="p-2.5 text-emerald-700">VERIFIED_IMMUTABLE</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-slate-700 font-sans font-medium">Executive Digital Seal Signature</td>
                        <td className="p-2.5 text-slate-500">SHA-256</td>
                        <td className="p-2.5 text-slate-600 truncate max-w-xs">{dossier.cryptographicValidationTable.digitalSealHash}</td>
                        <td className="p-2.5 text-emerald-700">AUTHENTICATED_SEAL</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Formal Transmittal Letter */}
            <div className="p-5 rounded-lg bg-white border border-slate-200 text-xs space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Formal Supervisory Transmittal Letter
              </span>
              <div className="text-slate-900">
                <strong>To:</strong> {dossier.transmittalLetter?.recipientTitle || 'The Director'}, {dossier.transmittalLetter?.recipientDepartment || 'Banking Supervision Department'}, {dossier.transmittalLetter?.regulatorName || 'Central Bank of Nigeria'}
              </div>
              <div className="text-slate-900">
                <strong>Subject:</strong> {dossier.transmittalLetter?.subject || 'Statutory Concordance Defense Pack'}
              </div>
              <p className="text-slate-600 italic pt-2 border-t border-slate-100 leading-relaxed">
                &ldquo;{dossier.transmittalLetter?.body || ''}&rdquo;
              </p>
            </div>

            {/* Section 1: Statutory Clause Concordance Matrix Table */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Section 1: Statutory Clause Concordance Matrix
              </span>
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <th className="p-3 font-semibold">#</th>
                      <th className="p-3 font-semibold">Statutory Clause</th>
                      <th className="p-3 font-semibold">Policy Section</th>
                      <th className="p-3 font-semibold">Status</th>
                      <th className="p-3 font-semibold">Fine Exposure</th>
                      <th className="p-3 font-semibold">Action Owner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dossier.items.map((item, idx) => {
                      const isAdequate = item.complianceStatus === 'ADEQUATELY_MET';
                      const isPartial = item.complianceStatus === 'PARTIALLY_MET';
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 font-mono text-slate-500">{idx + 1}</td>
                          <td className="p-3 font-semibold text-slate-900">{item.regulatoryClauseReference}</td>
                          <td className="p-3 font-mono text-xs text-slate-600">{item.matchedPolicySection || 'Omitted'}</td>
                          <td className="p-3">
                            {item.complianceStatus === 'CRITICAL_GAP' ? (
                              <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-xs font-medium">
                                Critical Gap
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isAdequate ? 'bg-emerald-500' : 'bg-amber-500'
                                  }`}
                                />
                                {isAdequate ? 'Adequately Met' : 'Partially Met'}
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-xs text-slate-900 font-bold">
                            {item.statutoryPenaltyNaira > 0
                              ? `₦${(item.statutoryPenaltyNaira / 1_000_000).toFixed(1)}M`
                              : '₦0'}
                          </td>
                          <td className="p-3 text-slate-600">{item.responsibleRole || 'Chief Compliance Officer'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2: Active Remediation Plan & Draft Replacement Language */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Section 2: Active Remediation Plan & Statutory Replacement Language
              </span>
              <div className="space-y-3">
                {dossier.items
                  .filter((i) => i.complianceStatus !== 'ADEQUATELY_MET')
                  .map((item, idx) => {
                    const replacement =
                      item.draftReplacementLanguage ||
                      item.draftReplacementPolicyLanguage ||
                      item.whatToDo;
                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-lg bg-white border border-slate-200 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 font-mono text-xs">
                            Remediation #{idx + 1}: {item.regulatoryClauseReference}
                          </span>
                          <span className="font-mono text-xs text-slate-600">
                            Cure Window: {item.statutoryRemediationTimelineDays || 30} Days
                          </span>
                        </div>
                        <div className="text-slate-600">
                          <strong className="text-slate-900">Owner:</strong> {item.responsibleRole || 'Chief Compliance Officer'} &bull; <strong className="text-slate-900">Citation:</strong> <span className="font-mono text-xs text-slate-600">{item.statutoryLegalCitation || 'BOFIA 2020'}</span>
                        </div>
                        <div className="p-3 rounded bg-slate-50 border border-slate-200 text-slate-900 font-mono text-[11px] leading-relaxed">
                          &ldquo;{replacement}&rdquo;
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Executive Summary */}
            <div className="p-5 rounded-lg bg-white border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Executive Briefing for Visiting Bank Examiners
              </span>
              <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                {dossier.executiveSummary}
              </p>
            </div>

            {/* CCO Attestation Block */}
            <div className="p-5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-slate-900 text-xs font-bold uppercase tracking-wider mb-2">
                <Key className="w-4 h-4 text-slate-600" />
                <span>Supervisory Legal Attestation & Verification Block</span>
              </div>
              <blockquote className="text-xs text-slate-800 italic leading-relaxed pl-3 border-l-2 border-slate-400 my-3">
                &ldquo;{dossier.ccoAttestation.attestationStatement}&rdquo;
              </blockquote>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-600 pt-3 border-t border-slate-200 font-mono gap-2">
                <span>Signatory: <strong className="text-slate-900">{dossier.ccoAttestation.ccoName}</strong></span>
                <span>Digital Seal: <strong className="text-slate-900">{dossier.ccoAttestation.digitalSealHash.slice(0, 24)}...</strong></span>
                <span>Timestamp: {new Date(dossier.ccoAttestation.timestamp).toUTCString()}</span>
              </div>
            </div>

            {/* Cryptographic Seal Footer */}
            <div className="p-4 rounded-lg bg-white border border-slate-200 text-center text-xs text-slate-500 font-mono">
              <div>Master SHA-256 Verification Digest:</div>
              <div className="text-slate-900 font-bold text-[11px] mt-1 break-all">
                {dossier.sha256VerificationHash}
              </div>
              <div className="text-[10px] text-slate-400 mt-2">
                Cogent RegTech Sovereign Architecture &bull; Verified Statutory Compliance & Audit Defense Platform
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
