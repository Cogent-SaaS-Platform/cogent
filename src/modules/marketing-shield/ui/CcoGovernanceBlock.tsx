'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { HumanApprovalStatus, ProductCategoryCode, RegulatorCode } from '@/shared/types';
import {
  ShieldCheck,
  FileCheck,
  CheckCircle,
  XCircle,
  Clock,
  Lock,
  Stamp,
  UserCheck,
  Download,
  AlertTriangle,
  RotateCcw,
  UserPlus,
  Edit3,
  Printer,
  FileText,
  ChevronDown,
  BookOpen,
  Check,
} from 'lucide-react';

export interface SignatoryProfile {
  id: string;
  name: string;
  title: string;
  regulatoryId: string;
  notes: string;
}

export interface CcoSignoffRecord {
  status: HumanApprovalStatus;
  reviewedBy: string;
  reviewerTitle: string;
  reviewerRegulatoryId?: string;
  reviewedAt: string;
  attestationHash: string;
  attestationNotes?: string;
  savedClaimId?: string;
}

export const DEFAULT_SIGNATORIES: SignatoryProfile[] = [
  {
    id: 'sig_cco',
    name: 'Designated Compliance Officer',
    title: 'Chief Compliance Officer',
    regulatoryId: 'INSTITUTIONAL-CCO',
    notes:
      'Reviewed against ARCON Code 2022 and CBN Consumer Protection Framework 2019. Pre-clearance conditions attested.',
  },
];

const STORAGE_KEY_SIGNATORIES = 'cogent_signatory_registry';
const STORAGE_KEY_LAST_SIGNATORY = 'cogent_last_signatory';

interface CcoGovernanceBlockProps {
  campaignKey: string;
  campaignName: string;
  auditHash: string;
  scanId?: string;
  productCategory?: ProductCategoryCode;
  originalCopy?: string;
  compliantRewrite?: string;
  dominantRegulator?: RegulatorCode;
  dominantCitation?: string;
  primaryFlaggedExcerpt?: string;
  initialSignoff?: CcoSignoffRecord | null;
  onSignoffComplete?: (
    campaignKey: string,
    signoffData: CcoSignoffRecord,
    signatory: SignatoryProfile
  ) => void;
  onExportDossier?: (format: 'pdf' | 'markdown' | 'html') => void;
  isExporting?: boolean;
}

export const CcoGovernanceBlock: React.FC<CcoGovernanceBlockProps> = ({
  campaignKey,
  campaignName,
  auditHash,
  scanId,
  productCategory = 'SAVINGS_DEPOSIT',
  originalCopy = '',
  compliantRewrite = '',
  dominantRegulator = 'CBN',
  dominantCitation = 'CBN Consumer Protection Framework 2019 s.4.2',
  primaryFlaggedExcerpt = '',
  initialSignoff,
  onSignoffComplete,
  onExportDossier,
  isExporting = false,
}) => {
  // Signatory registry stored in localStorage so new additions persist
  const [signatories, setSignatories] = useState<SignatoryProfile[]>(DEFAULT_SIGNATORIES);
  const { user } = useUser();
  const [lastSignatory, setLastSignatory] = useState<SignatoryProfile | null>(null);

  // Form input fields for the active campaign - dynamically defaulted to active officer
  const [selectedOption, setSelectedOption] = useState<string>('sig_cco');
  const [reviewerName, setReviewerName] = useState<string>('Designated Officer');
  const [reviewerTitle, setReviewerTitle] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cogent_user_role') || 'CSO';
    }
    return 'CSO';
  });
  const [reviewerRegulatoryId, setReviewerRegulatoryId] = useState<string>('');
  const [attestationNotes, setAttestationNotes] = useState<string>(
    'Reviewed against ARCON Code 2022 and CBN Consumer Protection Framework 2019. Pre-clearance conditions attested.'
  );

  useEffect(() => {
    if (user?.fullName) {
      setReviewerName(user.fullName);
    }
    const storedRole = typeof window !== 'undefined' ? localStorage.getItem('cogent_user_role') : null;
    if (storedRole) {
      setReviewerTitle(storedRole);
    }
  }, [user]);

  // Institutional Claims Ledger persistence state (Task 1.2 / 1.6)
  const [saveToLedger, setSaveToLedger] = useState<boolean>(false);
  const [ledgerApprovedText, setLedgerApprovedText] = useState<string>(compliantRewrite || '');
  const [ledgerProhibitedText, setLedgerProhibitedText] = useState<string>(primaryFlaggedExcerpt || '');
  const [ledgerCategory, setLedgerCategory] = useState<ProductCategoryCode>(productCategory);
  const [ledgerRegulator, setLedgerRegulator] = useState<RegulatorCode>(dominantRegulator);
  const [ledgerCitation, setLedgerCitation] = useState<string>(dominantCitation);
  const [ledgerRationale, setLedgerRationale] = useState<string>(
    'Pre-cleared and attested by CCO as compliant promotional phrasing.'
  );
  const [ledgerSavedConfirmation, setLedgerSavedConfirmation] = useState<boolean>(false);

  // Sync state when inputs change
  useEffect(() => {
    if (compliantRewrite) setLedgerApprovedText(compliantRewrite);
    if (primaryFlaggedExcerpt) setLedgerProhibitedText(primaryFlaggedExcerpt);
    if (productCategory) setLedgerCategory(productCategory);
    if (dominantRegulator) setLedgerRegulator(dominantRegulator);
    if (dominantCitation) setLedgerCitation(dominantCitation);
  }, [compliantRewrite, primaryFlaggedExcerpt, productCategory, dominantRegulator, dominantCitation]);

  // Sign-off state for this specific campaign
  const [status, setStatus] = useState<HumanApprovalStatus>(
    initialSignoff?.status || 'PENDING_REVIEW'
  );
  const [signedDetails, setSignedDetails] = useState<CcoSignoffRecord | null>(
    initialSignoff || null
  );
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState<boolean>(false);

  // Load saved signatories & last signatory from localStorage on client mount
  useEffect(() => {
    try {
      const storedPool = localStorage.getItem(STORAGE_KEY_SIGNATORIES);
      if (storedPool) {
        const parsed = JSON.parse(storedPool);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSignatories(parsed);
        }
      }
      const storedLast = localStorage.getItem(STORAGE_KEY_LAST_SIGNATORY);
      if (storedLast) {
        const parsedLast = JSON.parse(storedLast);
        if (parsedLast && parsedLast.name) {
          setLastSignatory(parsedLast);
        }
      }
    } catch (e) {
      // safe fallback if storage is disabled or unavailable
    }
  }, []);

  // When initialSignoff changes (e.g. campaign switch), reset or sync state
  useEffect(() => {
    if (initialSignoff) {
      setStatus(initialSignoff.status);
      setSignedDetails(initialSignoff);
      setIsEditing(false);
    } else {
      setStatus('PENDING_REVIEW');
      setSignedDetails(null);
      setIsEditing(false);
    }
  }, [campaignKey, initialSignoff]);

  // Handle signatory dropdown selection
  const handleSignatorySelect = (optionValue: string) => {
    setSelectedOption(optionValue);

    if (optionValue === '__LAST__' && lastSignatory) {
      setReviewerName(lastSignatory.name);
      setReviewerTitle(lastSignatory.title);
      setReviewerRegulatoryId(lastSignatory.regulatoryId || '');
      setAttestationNotes(lastSignatory.notes || '');
      return;
    }

    if (optionValue === '__NEW__') {
      // Clear fields so user can write a brand-new signatory cleanly
      setReviewerName('');
      setReviewerTitle('');
      setReviewerRegulatoryId('');
      setAttestationNotes('');
      return;
    }

    const found = signatories.find((s) => s.id === optionValue);
    if (found) {
      setReviewerName(found.name);
      setReviewerTitle(found.title);
      setReviewerRegulatoryId(found.regulatoryId);
      setAttestationNotes(found.notes);
    }
  };

  // Clear all form fields
  const handleClearFields = () => {
    setSelectedOption('__NEW__');
    setReviewerName('');
    setReviewerTitle('');
    setReviewerRegulatoryId('');
    setAttestationNotes('');
  };

  // Submit signoff (Approve, Reject, or Re-attest)
  const handleSignoff = async (newStatus: HumanApprovalStatus) => {
    if (!reviewerName.trim() || !reviewerTitle.trim()) {
      alert('Please specify the reviewer name and designation.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        scanId,
        campaignName,
        status: newStatus,
        reviewerName: reviewerName.trim(),
        reviewerTitle: reviewerTitle.trim(),
        attestationNotes: attestationNotes.trim(),
        auditHash,
      };

      if (saveToLedger && (newStatus === 'APPROVED_BY_CCO' || newStatus === 'MODIFIED_AND_APPROVED')) {
        payload.saveToClaimsLedger = true;
        payload.claimData = {
          productCategory: ledgerCategory,
          approvedText: ledgerApprovedText.trim() || compliantRewrite?.trim() || reviewerName,
          prohibitedCounterpart: ledgerProhibitedText.trim() || undefined,
          governingRegulator: ledgerRegulator,
          statutoryCitation: ledgerCitation.trim(),
          ccoRationale: ledgerRationale.trim(),
        };
      }

      const res = await fetch('/api/marketing/signoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data: any;
      try {
        data = await res.json();
      } catch {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Server returned error (${res.status})`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data?.error || `Attestation submission failed (${res.status})`);
      }

      if (data.success) {
        if (data.data?.savedClaim) {
          setLedgerSavedConfirmation(true);
        }

        const currentProfile: SignatoryProfile = {
          id: `sig_${Date.now()}`,
          name: reviewerName.trim(),
          title: reviewerTitle.trim(),
          regulatoryId: reviewerRegulatoryId.trim() || 'ACCREDITED-OFFICER',
          notes: attestationNotes.trim(),
        };

        const record: CcoSignoffRecord = {
          status: newStatus,
          reviewedBy: data.data.reviewedBy || `${reviewerName.trim()} (${reviewerTitle.trim()})`,
          reviewerTitle: reviewerTitle.trim(),
          reviewerRegulatoryId: reviewerRegulatoryId.trim(),
          reviewedAt: data.data.reviewedAt,
          attestationHash: data.data.attestationHash,
          attestationNotes: attestationNotes.trim(),
          savedClaimId: data.data?.savedClaim?.id,
        };

        setStatus(newStatus);
        setSignedDetails(record);
        setIsEditing(false);

        // Update last signatory
        setLastSignatory(currentProfile);

        // Update pool if not existing
        setSignatories((prev) => {
          const existing = prev.find(
            (p) => p.name.toLowerCase() === currentProfile.name.toLowerCase()
          );
          if (existing) {
            return prev.map((p) =>
              p.name.toLowerCase() === currentProfile.name.toLowerCase() ? currentProfile : p
            );
          }
          const updated = [...prev, currentProfile];
          try {
            localStorage.setItem(STORAGE_KEY_SIGNATORIES, JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });

        try {
          localStorage.setItem(STORAGE_KEY_LAST_SIGNATORY, JSON.stringify(currentProfile));
        } catch (e) {}

        if (onSignoffComplete) {
          onSignoffComplete(campaignKey, record, currentProfile);
        }
      } else {
        throw new Error(data.error || 'Failed to submit attestation');
      }
    } catch (err: unknown) {
      console.error('Sign-off error:', err);
      alert('Attestation failed: ' + (err instanceof Error ? err.message : 'Network error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isApproved = status === 'APPROVED_BY_CCO' || status === 'MODIFIED_AND_APPROVED';

  return (
    <div
      id="marketing-shield-cco-governance"
      className="rounded-2xl border border-[#DDE3EE] bg-white p-6 shadow-xs transition-all"
    >
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DDE3EE] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2A4BFF]/10 border border-[#2A4BFF]/20 text-[#2A4BFF]">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0B0F1A]">
                Human Legal Governance & CCO Attestation
              </h3>
              <p className="text-xs text-[#4B5565]">
                Level 6 Progressive Disclosure: Designated Signatory Authority & Audit Ledger Sealing
              </p>
            </div>
          </div>

          {/* Current State Pill */}
          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
              isApproved
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : status === 'REJECTED'
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {isApproved ? (
              <CheckCircle className="h-3.5 w-3.5" />
            ) : status === 'REJECTED' ? (
              <XCircle className="h-3.5 w-3.5" />
            ) : (
              <Clock className="h-3.5 w-3.5" />
            )}
            <span>{status.replace(/_/g, ' ')}</span>
          </div>
        </div>

        {/* If Already Approved and Not in Edit Mode: Display Immutable Official Seal */}
        {isApproved && signedDetails && !isEditing ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800">
                  <Stamp className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-900">
                    Formally Approved & Attested by CCO
                  </h4>
                  <p className="text-xs text-[#4B5565]">
                    Certified compliant with Nigerian advertising standards (ARCON 2022) and consumer regulations.
                  </p>
                </div>
              </div>

              {/* Action to change or edit signatory */}
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#DDE3EE] bg-white px-3 py-1.5 text-xs font-semibold text-[#0B0F1A] hover:bg-[#F9FAFC] transition-all shadow-xs"
              >
                <Edit3 className="h-3.5 w-3.5 text-[#2A4BFF]" />
                <span>Change Signatory / Edit</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white rounded-xl p-3.5 border border-emerald-200">
              <div>
                <span className="text-[#4B5565] block font-semibold">Attested By:</span>
                <span className="text-[#0B0F1A] font-bold">{signedDetails.reviewedBy}</span>
              </div>
              <div>
                <span className="text-[#4B5565] block font-semibold">Sign-off Timestamp:</span>
                <span className="text-[#0B0F1A] font-mono">
                  {new Date(signedDetails.reviewedAt).toLocaleString()} WAT
                </span>
              </div>
              {signedDetails.reviewerRegulatoryId && (
                <div>
                  <span className="text-[#4B5565] block font-semibold">Accreditation / Bar ID:</span>
                  <span className="text-[#0B0F1A] font-mono text-[11px]">
                    {signedDetails.reviewerRegulatoryId}
                  </span>
                </div>
              )}
              {signedDetails.attestationNotes && (
                <div className="sm:col-span-2">
                  <span className="text-[#4B5565] block font-semibold">Legal Attestation Notes:</span>
                  <span className="text-[#0B0F1A] italic">{signedDetails.attestationNotes}</span>
                </div>
              )}
              <div className="sm:col-span-2 pt-1 border-t border-[#DDE3EE]">
                <span className="text-[#4B5565] block font-semibold">Cryptographic Attestation Hash:</span>
                <span className="text-[#2A4BFF] font-mono text-[11px] break-all">
                  {signedDetails.attestationHash}
                </span>
              </div>
              {(signedDetails.savedClaimId || ledgerSavedConfirmation) && (
                <div className="sm:col-span-2 flex items-center gap-2.5 text-xs bg-purple-50 border border-purple-200 rounded-xl p-3 text-purple-900">
                  <BookOpen className="h-4 w-4 text-purple-600 shrink-0" />
                  <div>
                    <span className="font-bold text-purple-950">Indexed in Institutional Claims Ledger</span>
                    <span className="block text-[11px] text-purple-800">
                      Approved phrasing saved under <strong>{productCategory}</strong>. Subsequent campaign pre-vetting will automatically recognize and offer this compliant phrasing.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Export Dossier Options */}
            {onExportDossier && (
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#DDE3EE]">
                <span className="text-xs text-[#4B5565] flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Statutory ARCON ASP Form ARCON-PV1 Clearance Pack</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => onExportDossier('pdf')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white px-3.5 py-2 text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
                    title="Open official vector Form ARCON-PV1 with direct print / Save as PDF"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Export PDF (ARCON-PV1)</span>
                  </button>

                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => onExportDossier('markdown')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#DDE3EE] bg-white hover:bg-[#F9FAFC] text-[#0B0F1A] px-3.5 py-2 text-xs font-semibold transition-all shadow-xs disabled:opacity-50"
                    title="Download developer & auditor markdown dossier"
                  >
                    <FileText className="h-3.5 w-3.5 text-[#2A4BFF]" />
                    <span>Export Markdown (.md)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Form for Signing Off or Changing Signatory */
          <div className="space-y-4">
            {/* Top Signatory Selector & Reset Bar */}
            <div className="rounded-xl border border-[#DDE3EE] bg-[#F9FAFC] p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold text-[#0B0F1A] flex items-center gap-1.5">
                  <UserPlus className="h-3.5 w-3.5 text-[#2A4BFF]" />
                  <span>Select Signatory / Officer for this Campaign:</span>
                </label>

                <button
                  type="button"
                  onClick={handleClearFields}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:text-amber-800 hover:underline transition-all"
                  title="Wipe form fields to write new signatory from scratch"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Clear Information & Rewrite</span>
                </button>
              </div>

              <select
                value={selectedOption}
                onChange={(e) => handleSignatorySelect(e.target.value)}
                className="w-full rounded-xl bg-white border border-[#DDE3EE] px-3 py-2 text-xs text-[#0B0F1A] focus:outline-none focus:ring-2 focus:ring-[#2A4BFF] font-medium cursor-pointer shadow-xs"
              >
                {lastSignatory && (
                  <option value="__LAST__">
                    ⚡ Use Last Signatory: {lastSignatory.name} ({lastSignatory.title})
                  </option>
                )}
                <optgroup label="Recognized Legal & Compliance Officers">
                  {signatories.map((sig) => (
                    <option key={sig.id} value={sig.id}>
                      {sig.name} — {sig.title}
                    </option>
                  ))}
                </optgroup>
                <option value="__NEW__">➕ Add New Person / Custom Signatory</option>
              </select>
            </div>

            {/* Editable Signatory Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#4B5565] mb-1">
                  CCO / Legal Counsel Full Name *
                </label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="e.g. Authorized Compliance Officer"
                  className="w-full rounded-xl bg-white border border-[#DDE3EE] px-3 py-2 text-xs text-[#0B0F1A] focus:outline-none focus:ring-2 focus:ring-[#2A4BFF] shadow-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4B5565] mb-1">
                  Designation / Statutory Role *
                </label>
                <input
                  type="text"
                  value={reviewerTitle}
                  onChange={(e) => setReviewerTitle(e.target.value)}
                  placeholder="e.g. Chief Compliance Officer / General Counsel"
                  className="w-full rounded-xl bg-white border border-[#DDE3EE] px-3 py-2 text-xs text-[#0B0F1A] focus:outline-none focus:ring-2 focus:ring-[#2A4BFF] shadow-xs"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#4B5565] mb-1">
                Accreditation / Bar ID (Optional)
              </label>
              <input
                type="text"
                value={reviewerRegulatoryId}
                onChange={(e) => setReviewerRegulatoryId(e.target.value)}
                placeholder="e.g. NBA/BL: 48291 • CCO-FINTECH-09"
                className="w-full rounded-xl bg-white border border-[#DDE3EE] px-3 py-2 text-xs text-[#0B0F1A] focus:outline-none focus:ring-2 focus:ring-[#2A4BFF] shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#4B5565] mb-1">
                Statutory Attestation & Sign-Off Opinion
              </label>
              <textarea
                rows={2}
                value={attestationNotes}
                onChange={(e) => setAttestationNotes(e.target.value)}
                placeholder="Enter regulatory attestation notes..."
                className="w-full rounded-xl bg-white border border-[#DDE3EE] px-3 py-2 text-xs text-[#0B0F1A] focus:outline-none focus:ring-2 focus:ring-[#2A4BFF] shadow-xs"
              />
            </div>

            {/* Save to Institutional Claims Ledger Card (Task 1.2 & 1.6) */}
            <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="chk-save-to-claims-ledger"
                  checked={saveToLedger}
                  onChange={(e) => setSaveToLedger(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[#DDE3EE] bg-white text-[#2A4BFF] focus:ring-[#2A4BFF] cursor-pointer"
                />
                <label htmlFor="chk-save-to-claims-ledger" className="cursor-pointer">
                  <div className="text-xs font-semibold text-purple-900 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-purple-600" />
                    <span>Save to Institutional Claims Ledger (Institutional Memory Engine)</span>
                  </div>
                  <p className="text-[11px] text-[#4B5565] mt-0.5">
                    Index this CCO-approved wording so future scans within this product category automatically suggest this phrasing.
                  </p>
                </label>
              </div>

              {saveToLedger && (
                <div className="pt-2 border-t border-purple-200 space-y-3 pl-7">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#4B5565] mb-1">
                        Product Category
                      </label>
                      <select
                        value={ledgerCategory}
                        onChange={(e) => setLedgerCategory(e.target.value as ProductCategoryCode)}
                        className="w-full rounded-lg bg-white border border-[#DDE3EE] px-2.5 py-1.5 text-xs text-[#0B0F1A] focus:outline-none focus:ring-2 focus:ring-[#2A4BFF]"
                      >
                        <option value="SAVINGS_DEPOSIT">SAVINGS_DEPOSIT (CBN / NDIC)</option>
                        <option value="DIGITAL_NANO_LOAN">DIGITAL_NANO_LOAN (FCCPC / CBN)</option>
                        <option value="PAYMENTS_WALLET">PAYMENTS_WALLET (CBN PSMD)</option>
                        <option value="REMITTANCE_FX">REMITTANCE_FX (CBN IMTO)</option>
                        <option value="WEALTHTECH_INVEST">WEALTHTECH_INVEST (SEC Nigeria)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-[#4B5565] mb-1">
                        Governing Regulator
                      </label>
                      <select
                        value={ledgerRegulator}
                        onChange={(e) => setLedgerRegulator(e.target.value as RegulatorCode)}
                        className="w-full rounded-lg bg-white border border-[#DDE3EE] px-2.5 py-1.5 text-xs text-[#0B0F1A] focus:outline-none focus:ring-2 focus:ring-[#2A4BFF]"
                      >
                        <option value="CBN">CBN</option>
                        <option value="ARCON">ARCON</option>
                        <option value="FCCPC">FCCPC</option>
                        <option value="SEC">SEC</option>
                        <option value="NDPC">NDPC</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#4B5565] mb-1">
                      Approved Substitute Copy *
                    </label>
                    <textarea
                      rows={2}
                      value={ledgerApprovedText}
                      onChange={(e) => setLedgerApprovedText(e.target.value)}
                      placeholder="Approved compliant text to suggest in future scans..."
                      className="w-full rounded-lg bg-white border border-[#DDE3EE] p-2 text-xs text-[#0B0F1A] focus:outline-none focus:ring-2 focus:ring-[#2A4BFF]"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#4B5565] mb-1">
                        Prohibited Counterpart (Phrase being replaced)
                      </label>
                      <input
                        type="text"
                        value={ledgerProhibitedText}
                        onChange={(e) => setLedgerProhibitedText(e.target.value)}
                        placeholder="e.g. Zero interest, Guaranteed returns"
                        className="w-full rounded-lg bg-white border border-[#DDE3EE] px-2.5 py-1.5 text-xs text-[#0B0F1A] focus:outline-none focus:ring-2 focus:ring-[#2A4BFF]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-[#4B5565] mb-1">
                        Statutory Citation
                      </label>
                      <input
                        type="text"
                        value={ledgerCitation}
                        onChange={(e) => setLedgerCitation(e.target.value)}
                        placeholder="e.g. ARCON Code 2022 Art. 24"
                        className="w-full rounded-lg bg-white border border-[#DDE3EE] px-2.5 py-1.5 text-xs text-[#0B0F1A] focus:outline-none focus:ring-2 focus:ring-[#2A4BFF]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#4B5565] mb-1">
                      CCO Legal Rationale *
                    </label>
                    <input
                      type="text"
                      value={ledgerRationale}
                      onChange={(e) => setLedgerRationale(e.target.value)}
                      placeholder="Why this wording cures the regulatory risk..."
                      className="w-full rounded-lg bg-white border border-[#DDE3EE] px-2.5 py-1.5 text-xs text-[#0B0F1A] focus:outline-none focus:ring-2 focus:ring-[#2A4BFF]"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-[11px] text-[#4B5565] flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-[#4B5565]" />
                <span>Attestation seals scan state into tamper-evident audit ledger</span>
              </div>

              <div className="flex items-center gap-3">
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="rounded-xl border border-[#DDE3EE] bg-white px-3.5 py-2 text-xs font-semibold text-[#4B5565] hover:text-[#0B0F1A] hover:bg-[#F9FAFC] transition-all"
                  >
                    Cancel Edit
                  </button>
                )}

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSignoff('REJECTED')}
                  className="rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 px-4 py-2 text-xs font-semibold text-red-700 transition-all disabled:opacity-50"
                >
                  Reject & Return for Revision
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSignoff('APPROVED_BY_CCO')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>
                    {isSubmitting
                      ? 'Attesting...'
                      : isEditing
                      ? 'Update & Re-Attest'
                      : 'Authorize & Clear Campaign'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
