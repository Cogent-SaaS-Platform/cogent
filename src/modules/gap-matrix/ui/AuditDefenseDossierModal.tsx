'use client';

import React from 'react';
import {
  X,
  Download,
  Printer,
  ShieldCheck,
  CheckCircle,
  FileText,
  Building,
  Key,
} from 'lucide-react';
import { AuditDefenseDossier } from '../types';
import { defaultDossierExportService } from '../services/dossierExportService';

interface AuditDefenseDossierModalProps {
  dossier: AuditDefenseDossier | null;
  onClose: () => void;
}

export function AuditDefenseDossierModal({
  dossier,
  onClose,
}: AuditDefenseDossierModalProps) {
  if (!dossier) return null;

  const handleDownloadMarkdown = () => {
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

  const formattedExposure = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(dossier.totalPotentialPenaltyNaira);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0F1422] border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="p-5 border-b border-slate-800 bg-[#141A2B] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Official Bank Examiner Audit Defense Pack
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  CBN Verified Format
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Ref: {dossier.dossierReference} • SHA-256: {dossier.sha256VerificationHash.slice(0, 16)}...
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadHtml}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 rounded-lg border border-cyan-500/30 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              Download HTML
            </button>
            <button
              onClick={handleDownloadMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download Markdown
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg border border-emerald-500/30 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Dossier Content (Printable Area) */}
        <div className="p-8 overflow-y-auto space-y-6 text-slate-200 bg-[#0A0D18]" id="printable-dossier">
          {/* Official Letterhead Header */}
          <div className="border-b-2 border-emerald-500/40 pb-6 text-center">
            <div className="inline-block px-3 py-1 rounded bg-slate-800 text-[11px] font-mono tracking-widest text-slate-300 uppercase mb-2">
              Confidential Supervisory Audit Defense Pack
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-wide uppercase">
              Central Bank of Nigeria • Banking Supervision Department
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Clause-by-Clause Statutory Compliance & 5-W Decision Gap Matrix Defense Dossier
            </p>
          </div>

          {/* Institutional Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-[#141A2B] border border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Regulated Entity</span>
              <span className="font-semibold text-white">{dossier.organizationName}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Internal Policy Manual</span>
              <span className="font-semibold text-white">{dossier.policyTitle} (v{dossier.policyVersion})</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Statutory Benchmark</span>
              <span className="font-semibold text-sky-400">{dossier.benchmarkTitle}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Supervisory Body</span>
              <span className="font-semibold text-emerald-400">{dossier.issuingRegulator}</span>
            </div>
          </div>

          {/* Health Summary Box */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block mb-1">Compliance Health</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                {dossier.overallCompliancePercentage.toFixed(1)}%
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block mb-1">Clean Findings</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                {dossier.adequatelyMetCount}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block mb-1">Level 2 Findings</span>
              <span className="text-2xl font-black text-amber-400 font-mono">
                {dossier.partiallyMetCount}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block mb-1">Critical Gaps</span>
              <span className="text-2xl font-black text-red-400 font-mono">
                {dossier.criticalGapsCount}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block mb-1">Fine Avoidance (₦)</span>
              <span className="text-lg font-black text-emerald-400 font-mono truncate block">
                {formattedExposure}
              </span>
            </div>
          </div>

          {/* Formal Transmittal Letter */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2">
            <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
              Formal Supervisory Transmittal Letter
            </div>
            <div className="text-slate-300">
              <strong>To:</strong> {dossier.transmittalLetter?.recipientTitle || 'The Director'}, {dossier.transmittalLetter?.recipientDepartment || 'Banking Supervision Department'}, {dossier.transmittalLetter?.regulatorName || 'Central Bank of Nigeria'}
            </div>
            <div className="text-slate-300">
              <strong>Subject:</strong> {dossier.transmittalLetter?.subject || 'Statutory Concordance Defense Pack'}
            </div>
            <p className="text-slate-300 italic pt-2 border-t border-slate-800 leading-relaxed">
              "{dossier.transmittalLetter?.body || ''}"
            </p>
          </div>

          {/* Section 1: Statutory Clause Concordance Matrix Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Section 1: Statutory Clause Concordance Matrix Table
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-slate-300 border-b border-slate-800">
                    <th className="p-2.5 font-semibold">#</th>
                    <th className="p-2.5 font-semibold">Statutory Clause</th>
                    <th className="p-2.5 font-semibold">Policy Section</th>
                    <th className="p-2.5 font-semibold">Status</th>
                    <th className="p-2.5 font-semibold">Fine Exposure</th>
                    <th className="p-2.5 font-semibold">Action Owner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                  {dossier.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40">
                      <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-2.5 font-semibold text-white">{item.regulatoryClauseReference}</td>
                      <td className="p-2.5 font-mono text-cyan-300">{item.matchedPolicySection || 'Omitted'}</td>
                      <td className="p-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.complianceStatus === 'ADEQUATELY_MET'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : item.complianceStatus === 'PARTIALLY_MET'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {item.complianceStatus.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono font-bold text-slate-200">
                        {item.statutoryPenaltyNaira > 0 ? `₦${(item.statutoryPenaltyNaira / 1_000_000).toFixed(1)}M` : '₦0'}
                      </td>
                      <td className="p-2.5 text-slate-300">{item.responsibleRole || 'Chief Compliance Officer'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Active Board Remediation Plan & Draft Replacement Language */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Section 2: Active Board Remediation Plan & Draft Replacement Language
            </h3>
            <div className="space-y-3">
              {dossier.items.filter((i) => i.complianceStatus !== 'ADEQUATELY_MET').map((item, idx) => {
                const replacement = item.draftReplacementLanguage || item.draftReplacementPolicyLanguage || item.whatToDo;
                return (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white font-mono">
                        Remediation #{idx + 1}: {item.regulatoryClauseReference}
                      </span>
                      <span className="text-amber-400 font-semibold">
                        Window: {item.statutoryRemediationTimelineDays || 30} Days
                      </span>
                    </div>
                    <div className="text-slate-300">
                      <strong>Assigned Owner:</strong> {item.responsibleRole || 'Chief Compliance Officer'} • <strong>Citation:</strong> {item.statutoryLegalCitation || 'BOFIA 2020'}
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-cyan-500/30 text-cyan-200 font-mono text-[11px] leading-relaxed">
                      "{replacement}"
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Executive Summary */}
          <div className="p-5 rounded-xl bg-[#141A2B] border border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Executive Briefing for Visiting Bank Examiners
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
              {dossier.executiveSummary}
            </p>
          </div>

          {/* CCO Attestation Block */}
          <div className="p-5 rounded-xl bg-[#12192C] border-2 border-emerald-500/30">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Key className="w-4 h-4" />
              Chief Compliance Officer (CCO) Official Legal Attestation Block
            </div>
            <blockquote className="text-xs text-slate-200 italic leading-relaxed pl-3 border-l-2 border-emerald-500 my-3">
              "{dossier.ccoAttestation.attestationStatement}"
            </blockquote>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-800 font-mono gap-2">
              <span>Signatory: <strong className="text-white">{dossier.ccoAttestation.ccoName}</strong></span>
              <span>Digital Seal: <strong className="text-emerald-400">{dossier.ccoAttestation.digitalSealHash.slice(0, 24)}...</strong></span>
              <span>Timestamp: {new Date(dossier.ccoAttestation.timestamp).toUTCString()}</span>
            </div>
          </div>

          {/* Itemized 5-W Schedules */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Itemized 5-W Operational Decision Matrix & Remediation Schedules ({dossier.items.length})
            </h3>
            {dossier.items.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-[#141A2B] border border-slate-800 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm font-mono">
                    Schedule {idx + 1}: {item.regulatoryClauseReference}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      item.complianceStatus === 'ADEQUATELY_MET'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : item.complianceStatus === 'PARTIALLY_MET'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {item.complianceStatus.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300">
                  <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800">
                    <strong className="text-emerald-400 block mb-1">1. What Happened?</strong>
                    <p>{item.whatHappened}</p>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800">
                    <strong className="text-sky-400 block mb-1">2. What to Know?</strong>
                    <p>{item.whatToKnow}</p>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800">
                    <strong className="text-amber-400 block mb-1">3. What Has Changed?</strong>
                    <p>{item.whatHasChanged}</p>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800">
                    <strong className="text-purple-400 block mb-1">5. Derived Insight</strong>
                    <p>{item.derivedInsight}</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/30 text-slate-200">
                  <strong className="text-indigo-300 block mb-1">4. What to Do? (Remediation & Proposed Language)</strong>
                  <p className="whitespace-pre-line">{item.whatToDo}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Cryptographic Seal Footer */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400 font-mono">
            <div>Cryptographic SHA-256 Master Verification Seal:</div>
            <div className="text-emerald-400 font-bold text-[11px] mt-1 break-all">
              {dossier.sha256VerificationHash}
            </div>
            <div className="text-[10px] text-slate-500 mt-2">
              Cogent RegTech Sovereign Architecture • Verified Nigerian FinTech Regulatory Defense Platform
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
