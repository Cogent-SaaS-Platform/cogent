'use client';

import React from 'react';
import {
  X,
  Download,
  Printer,
  ShieldCheck,
  FileText,
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0B0F1A]/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#DDE3EE] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="p-5 border-b border-[#DDE3EE] bg-[#F9FAFC] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#059669]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0B0F1A] tracking-tight flex items-center gap-2">
                Official Bank Examiner Audit Defense Pack
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] font-semibold">
                  CBN Verified Format
                </span>
              </h2>
              <p className="text-xs text-[#4B5565] font-mono mt-0.5">
                Ref: {dossier.dossierReference} &bull; SHA-256: {dossier.sha256VerificationHash.slice(0, 16)}...
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadHtml}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#2A4BFF] bg-[#EEF2FF] hover:bg-[#E0E7FF] rounded-lg border border-[#C7D2FE] transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              Download HTML
            </button>
            <button
              onClick={handleDownloadMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#4B5565] bg-white hover:bg-[#F5F6FA] rounded-lg border border-[#DDE3EE] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download Markdown
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#059669] hover:bg-[#047857] rounded-lg shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#4B5565] hover:text-[#0B0F1A] rounded-lg hover:bg-[#F5F6FA] transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Dossier Content (Printable Area) */}
        <div className="p-8 overflow-y-auto space-y-6 text-[#0B0F1A] bg-[#F5F6FA]" id="printable-dossier">
          {/* Official Letterhead Header */}
          <div className="bg-white p-6 rounded-xl border border-[#DDE3EE] shadow-xs text-center border-b-2 border-b-[#059669]/40">
            <div className="inline-block px-3 py-1 rounded bg-[#EEF2FF] border border-[#C7D2FE] text-[11px] font-mono tracking-widest text-[#2A4BFF] uppercase mb-2 font-bold">
              Confidential Supervisory Audit Defense Pack
            </div>
            <h1 className="text-xl font-extrabold text-[#0B0F1A] tracking-wide uppercase">
              Central Bank of Nigeria &bull; Banking Supervision Department
            </h1>
            <p className="text-xs text-[#4B5565] mt-1 font-medium">
              Clause-by-Clause Statutory Compliance & 5-W Decision Gap Matrix Defense Dossier
            </p>
          </div>

          {/* Institutional Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-white border border-[#DDE3EE] text-xs shadow-xs">
            <div>
              <span className="text-[#4B5565] block mb-0.5 text-[11px]">Regulated Entity</span>
              <span className="font-semibold text-[#0B0F1A]">{dossier.organizationName}</span>
            </div>
            <div>
              <span className="text-[#4B5565] block mb-0.5 text-[11px]">Internal Policy Manual</span>
              <span className="font-semibold text-[#0B0F1A]">{dossier.policyTitle} (v{dossier.policyVersion})</span>
            </div>
            <div>
              <span className="text-[#4B5565] block mb-0.5 text-[11px]">Statutory Benchmark</span>
              <span className="font-semibold text-[#2A4BFF]">{dossier.benchmarkTitle}</span>
            </div>
            <div>
              <span className="text-[#4B5565] block mb-0.5 text-[11px]">Supervisory Body</span>
              <span className="font-semibold text-[#059669]">{dossier.issuingRegulator}</span>
            </div>
          </div>

          {/* Health Summary Box */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="p-4 rounded-xl bg-white border border-[#DDE3EE] text-center shadow-xs">
              <span className="text-[11px] text-[#4B5565] block mb-1 font-medium">Compliance Health</span>
              <span className="text-2xl font-black text-[#059669] font-mono">
                {dossier.overallCompliancePercentage.toFixed(1)}%
              </span>
            </div>
            <div className="p-4 rounded-xl bg-white border border-[#DDE3EE] text-center shadow-xs">
              <span className="text-[11px] text-[#4B5565] block mb-1 font-medium">Clean Findings</span>
              <span className="text-2xl font-black text-[#059669] font-mono">
                {dossier.adequatelyMetCount}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-white border border-[#DDE3EE] text-center shadow-xs">
              <span className="text-[11px] text-[#4B5565] block mb-1 font-medium">Level 2 Findings</span>
              <span className="text-2xl font-black text-[#D97706] font-mono">
                {dossier.partiallyMetCount}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-white border border-[#DDE3EE] text-center shadow-xs">
              <span className="text-[11px] text-[#4B5565] block mb-1 font-medium">Critical Gaps</span>
              <span className="text-2xl font-black text-[#DC2626] font-mono">
                {dossier.criticalGapsCount}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-white border border-[#DDE3EE] text-center shadow-xs">
              <span className="text-[11px] text-[#4B5565] block mb-1 font-medium">Fine Avoidance (₦)</span>
              <span className="text-lg font-black text-[#059669] font-mono truncate block">
                {formattedExposure}
              </span>
            </div>
          </div>

          {/* Formal Transmittal Letter */}
          <div className="p-5 rounded-xl bg-white border border-[#DDE3EE] text-xs space-y-2 shadow-xs">
            <div className="text-[11px] font-bold text-[#2A4BFF] uppercase tracking-wider">
              Formal Supervisory Transmittal Letter
            </div>
            <div className="text-[#0B0F1A]">
              <strong>To:</strong> {dossier.transmittalLetter?.recipientTitle || 'The Director'}, {dossier.transmittalLetter?.recipientDepartment || 'Banking Supervision Department'}, {dossier.transmittalLetter?.regulatorName || 'Central Bank of Nigeria'}
            </div>
            <div className="text-[#0B0F1A]">
              <strong>Subject:</strong> {dossier.transmittalLetter?.subject || 'Statutory Concordance Defense Pack'}
            </div>
            <p className="text-[#4B5565] italic pt-2 border-t border-[#DDE3EE] leading-relaxed">
              &ldquo;{dossier.transmittalLetter?.body || ''}&rdquo;
            </p>
          </div>

          {/* Section 1: Statutory Clause Concordance Matrix Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#4B5565] uppercase tracking-wider">
              Section 1: Statutory Clause Concordance Matrix Table
            </h3>
            <div className="overflow-x-auto rounded-xl border border-[#DDE3EE] bg-white shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F9FAFC] text-[#4B5565] border-b border-[#DDE3EE]">
                    <th className="p-3 font-semibold">#</th>
                    <th className="p-3 font-semibold">Statutory Clause</th>
                    <th className="p-3 font-semibold">Policy Section</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold">Fine Exposure</th>
                    <th className="p-3 font-semibold">Action Owner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EDF5]">
                  {dossier.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#F5F6FA] transition-colors">
                      <td className="p-3 font-mono text-[#4B5565]">{idx + 1}</td>
                      <td className="p-3 font-semibold text-[#0B0F1A]">{item.regulatoryClauseReference}</td>
                      <td className="p-3 font-mono text-[#2A4BFF] font-medium">{item.matchedPolicySection || 'Omitted'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            item.complianceStatus === 'ADEQUATELY_MET'
                              ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
                              : item.complianceStatus === 'PARTIALLY_MET'
                              ? 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]'
                              : 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
                          }`}
                        >
                          {item.complianceStatus.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-[#0B0F1A]">
                        {item.statutoryPenaltyNaira > 0 ? `₦${(item.statutoryPenaltyNaira / 1_000_000).toFixed(1)}M` : '₦0'}
                      </td>
                      <td className="p-3 text-[#4B5565]">{item.responsibleRole || 'Chief Compliance Officer'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Active Board Remediation Plan & Draft Replacement Language */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#4B5565] uppercase tracking-wider">
              Section 2: Active Board Remediation Plan & Draft Replacement Language
            </h3>
            <div className="space-y-3">
              {dossier.items.filter((i) => i.complianceStatus !== 'ADEQUATELY_MET').map((item, idx) => {
                const replacement = item.draftReplacementLanguage || item.draftReplacementPolicyLanguage || item.whatToDo;
                return (
                  <div key={idx} className="p-4 rounded-xl bg-white border border-[#DDE3EE] space-y-2.5 text-xs shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0B0F1A] font-mono text-sm">
                        Remediation #{idx + 1}: {item.regulatoryClauseReference}
                      </span>
                      <span className="text-[#D97706] font-semibold bg-[#FFFBEB] px-2.5 py-0.5 rounded-full border border-[#FDE68A]">
                        Window: {item.statutoryRemediationTimelineDays || 30} Days
                      </span>
                    </div>
                    <div className="text-[#4B5565]">
                      <strong className="text-[#0B0F1A]">Assigned Owner:</strong> {item.responsibleRole || 'Chief Compliance Officer'} &bull; <strong className="text-[#0B0F1A]">Citation:</strong> {item.statutoryLegalCitation || 'BOFIA 2020'}
                    </div>
                    <div className="p-3 rounded-lg bg-[#F9FAFC] border border-[#2A4BFF]/30 text-[#0B0F1A] font-mono text-[11px] leading-relaxed">
                      &ldquo;{replacement}&rdquo;
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Executive Summary */}
          <div className="p-5 rounded-xl bg-white border border-[#DDE3EE] shadow-xs">
            <h3 className="text-xs font-bold text-[#4B5565] uppercase tracking-wider mb-2">
              Executive Briefing for Visiting Bank Examiners
            </h3>
            <p className="text-xs text-[#0B0F1A] leading-relaxed whitespace-pre-line">
              {dossier.executiveSummary}
            </p>
          </div>

          {/* CCO Attestation Block */}
          <div className="p-5 rounded-xl bg-[#F0FDF4] border-2 border-[#A7F3D0] shadow-xs">
            <div className="flex items-center gap-2 text-[#059669] text-xs font-bold uppercase tracking-wider mb-2">
              <Key className="w-4 h-4" />
              Chief Compliance Officer (CCO) Official Legal Attestation Block
            </div>
            <blockquote className="text-xs text-[#0B0F1A] italic leading-relaxed pl-3 border-l-2 border-[#059669] my-3">
              &ldquo;{dossier.ccoAttestation.attestationStatement}&rdquo;
            </blockquote>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-[#4B5565] pt-3 border-t border-[#A7F3D0] font-mono gap-2">
              <span>Signatory: <strong className="text-[#0B0F1A]">{dossier.ccoAttestation.ccoName}</strong></span>
              <span>Digital Seal: <strong className="text-[#059669]">{dossier.ccoAttestation.digitalSealHash.slice(0, 24)}...</strong></span>
              <span>Timestamp: {new Date(dossier.ccoAttestation.timestamp).toUTCString()}</span>
            </div>
          </div>

          {/* Itemized 5-W Schedules */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#4B5565] uppercase tracking-wider">
              Itemized 5-W Operational Decision Matrix & Remediation Schedules ({dossier.items.length})
            </h3>
            {dossier.items.map((item, idx) => (
              <div key={idx} className="p-5 rounded-xl bg-white border border-[#DDE3EE] space-y-3.5 text-xs shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0B0F1A] text-sm font-mono">
                    Schedule {idx + 1}: {item.regulatoryClauseReference}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      item.complianceStatus === 'ADEQUATELY_MET'
                        ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
                        : item.complianceStatus === 'PARTIALLY_MET'
                        ? 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]'
                        : 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
                    }`}
                  >
                    {item.complianceStatus.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[#0B0F1A]">
                  <div className="p-3 rounded-lg bg-[#F9FAFC] border border-[#DDE3EE]">
                    <strong className="text-[#059669] block mb-1">1. What Happened?</strong>
                    <p className="text-[#4B5565] leading-relaxed">{item.whatHappened}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F9FAFC] border border-[#DDE3EE]">
                    <strong className="text-[#2A4BFF] block mb-1">2. What to Know?</strong>
                    <p className="text-[#4B5565] leading-relaxed">{item.whatToKnow}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F9FAFC] border border-[#DDE3EE]">
                    <strong className="text-[#D97706] block mb-1">3. What Has Changed?</strong>
                    <p className="text-[#4B5565] leading-relaxed">{item.whatHasChanged}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F9FAFC] border border-[#DDE3EE]">
                    <strong className="text-[#7C3AED] block mb-1">5. Derived Insight</strong>
                    <p className="text-[#4B5565] leading-relaxed">{item.derivedInsight}</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-[#EEF2FF] border border-[#C7D2FE] text-[#0B0F1A]">
                  <strong className="text-[#2A4BFF] block mb-1 font-semibold">4. What to Do? (Remediation & Proposed Language)</strong>
                  <p className="whitespace-pre-line text-[#4B5565] leading-relaxed">{item.whatToDo}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Cryptographic Seal Footer */}
          <div className="p-4 rounded-xl bg-white border border-[#DDE3EE] text-center text-xs text-[#4B5565] font-mono shadow-xs">
            <div>Cryptographic SHA-256 Master Verification Seal:</div>
            <div className="text-[#059669] font-bold text-[11px] mt-1 break-all">
              {dossier.sha256VerificationHash}
            </div>
            <div className="text-[10px] text-[#4B5565] mt-2">
              Cogent RegTech Sovereign Architecture &bull; Verified Nigerian FinTech Regulatory Defense Platform
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
