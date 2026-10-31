'use client';

import React, { useState, useEffect } from 'react';
import { TeamMember, FunctionalRole } from '@/modules/organization/types';
import {
  X,
  Star,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Save,
  Check,
  Scale,
  Clock,
  Layers,
  Shield,
  UploadCloud,
} from 'lucide-react';
import {
  DecomposedObligationPresentation,
  RegulatoryInstrumentPresentation,
  FourPhaseObligation,
  ControlEffectivenessStatus,
  EvidenceStatus,
} from '../types';
import { formatStatutoryIdentifier, sanitizeRequirementText } from '../services/obligationMetricsService';

interface ObligationDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  obligation: (DecomposedObligationPresentation & { fourPhase?: FourPhaseObligation }) | FourPhaseObligation | null;
  instrument?: RegulatoryInstrumentPresentation | null;
  onUpdateOverride?: (
    obligationId: string,
    override: {
      status?: 'ADEQUATELY_MET' | 'PARTIALLY_MET' | 'GAP_DETECTED' | 'NOT_APPLICABLE' | 'PENDING_REVIEW';
      assignedOwner?: string;
      internalNotes?: string;
      internalSopCitation?: string;
      verifiedCriteriaIds?: string[];
    }
  ) => Promise<void>;
  onUpdateControlMapping?: (
    obligationId: string,
    mapping: {
      controlId?: string | null;
      controlName?: string | null;
      policyId?: string | null;
      policyName?: string | null;
      custodianRole?: string;
      department?: string;
      effectivenessStatus?: ControlEffectivenessStatus;
      evidenceStatus?: EvidenceStatus;
      evidenceArtifactName?: string | null;
      notes?: string | null;
    }
  ) => Promise<void>;
  onToggleStar?: (obligationId: string) => void;
}

export function ObligationDetailDrawer({
  isOpen,
  onClose,
  obligation,
  instrument,
  onUpdateOverride,
  onUpdateControlMapping,
  onToggleStar,
}: ObligationDetailDrawerProps) {
  if (!isOpen || !obligation) return null;

  return (
    <ObligationDetailDrawerContent
      onClose={onClose}
      obligation={obligation}
      instrument={instrument || null}
      onUpdateOverride={onUpdateOverride}
      onUpdateControlMapping={onUpdateControlMapping}
      onToggleStar={onToggleStar}
    />
  );
}

interface DrawerContentProps {
  onClose: () => void;
  obligation: (DecomposedObligationPresentation & { fourPhase?: FourPhaseObligation }) | FourPhaseObligation;
  instrument: RegulatoryInstrumentPresentation | null;
  onUpdateOverride?: ObligationDetailDrawerProps['onUpdateOverride'];
  onUpdateControlMapping?: ObligationDetailDrawerProps['onUpdateControlMapping'];
  onToggleStar?: (obligationId: string) => void;
}

function ObligationDetailDrawerContent({
  onClose,
  obligation,
  instrument,
  onUpdateOverride,
  onUpdateControlMapping,
  onToggleStar,
}: DrawerContentProps) {
  // Normalize between FourPhaseObligation and DecomposedObligationPresentation
  const isFourPhase = 'phase1Source' in obligation;
  const fourPhase = isFourPhase ? (obligation as FourPhaseObligation) : (obligation as any).fourPhase;

  const rawId = isFourPhase ? (obligation as FourPhaseObligation).internalId : (obligation as DecomposedObligationPresentation).id;
  const regulatorCode = fourPhase?.phase1Source.regulator || instrument?.regulator || 'CBN';
  const humanId = fourPhase?.phase2Obligation.humanId || formatStatutoryIdentifier(regulatorCode, instrument?.year || 2024, rawId);
  const citation = fourPhase?.phase1Source.statutoryCitation || (instrument ? `${instrument.shortTitle} ${(obligation as any).sectionReference || ''}` : 'Statutory Directive');
  const sectionHeading = fourPhase?.phase1Source.sectionHeading || (obligation as any).sectionHeading || 'Operational Obligation';
  const statutoryText = fourPhase?.phase2Obligation.statutoryText || (obligation as any).statutoryText || (obligation as any).summary || '';
  const atomicReq = fourPhase?.phase2Obligation.atomicRequirement || sanitizeRequirementText((obligation as any).summary || '');
  const penalties = fourPhase?.phase2Obligation.penalties || (obligation as any).penalties || [];

  // Tab State
  const [activeTab, setActiveTab] = useState<'safeguards' | 'text' | 'evidence' | 'concordance'>('safeguards');

  // Control Safeguard Form State
  const [controlId, setControlId] = useState<string>(fourPhase?.phase3Safeguards.controlId || '');
  const [controlName, setControlName] = useState<string>(fourPhase?.phase3Safeguards.controlName || '');
  const [policyId, setPolicyId] = useState<string>(fourPhase?.phase3Safeguards.policyId || '');
  const [policyName, setPolicyName] = useState<string>(fourPhase?.phase3Safeguards.policyName || '');
  const [custodianRole, setCustodianRole] = useState<string>(fourPhase?.phase3Safeguards.custodianRole || 'Chief Compliance Officer');
  const [department, setDepartment] = useState<string>(fourPhase?.phase3Safeguards.department || 'COMPLIANCE_LEGAL');
  const [effectivenessStatus, setEffectivenessStatus] = useState<ControlEffectivenessStatus>(
    fourPhase?.phase4Health.effectivenessStatus || 'NEEDS_REVIEW'
  );
  const [evidenceStatus, setEvidenceStatus] = useState<EvidenceStatus>(
    fourPhase?.phase4Health.evidenceStatus || 'PENDING_AUDIT'
  );
  const [evidenceArtifactName, setEvidenceArtifactName] = useState<string>(
    fourPhase?.phase4Health.evidenceArtifactName || ''
  );

  // Dynamic organization members & statutory roles
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [functionalRoles, setFunctionalRoles] = useState<FunctionalRole[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadMembers() {
      try {
        const res = await fetch('/api/organization/members');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success) {
            setMembers(data.members || []);
            setFunctionalRoles(data.functionalRoles || []);
          }
        }
      } catch (err) {
        console.error('Failed fetching members in ObligationDetailDrawer', err);
      }
    }
    loadMembers();
    return () => {
      isMounted = false;
    };
  }, []);

  // Concordance Review State
  const [currentStatus, setCurrentStatus] = useState(
    (obligation as any).status || (effectivenessStatus === 'EFFECTIVE' ? 'ADEQUATELY_MET' : 'PENDING_REVIEW')
  );
  const [internalNotes, setInternalNotes] = useState((obligation as any).userOverride?.internalNotes || '');
  const [internalSopCitation, setInternalSopCitation] = useState((obligation as any).userOverride?.internalSopCitation || '');
  const [isStarred, setIsStarred] = useState(Boolean((obligation as any).isStarred));
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Assessment criteria
  const assessmentCriteria = (obligation as any).assessmentCriteria || [
    {
      id: `crit-1`,
      criterionText: `Internal operational manual contains unambiguous rules implementing ${citation}`,
      evidenceRequired: 'Approved institutional policy document or SOP',
      isMandatory: true,
      defaultChecked: true,
    },
    {
      id: `crit-2`,
      criterionText: 'Audit logging and supervisory inspection controls are actively operational',
      evidenceRequired: 'Cryptographic system audit log export',
      isMandatory: false,
      defaultChecked: false,
    },
  ];

  const [verifiedCriteriaIds, setVerifiedCriteriaIds] = useState<string[]>(
    (obligation as any).userOverride?.verifiedCriteriaIds || assessmentCriteria.filter((c: any) => c.defaultChecked).map((c: any) => c.id)
  );

  const handleSaveControlMapping = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      if (onUpdateControlMapping) {
        await onUpdateControlMapping(rawId, {
          controlId: controlId.trim() || null,
          controlName: controlName.trim() || null,
          policyId: policyId.trim() || null,
          policyName: policyName.trim() || null,
          custodianRole,
          department,
          effectivenessStatus,
          evidenceStatus,
          evidenceArtifactName: evidenceArtifactName.trim() || null,
          notes: internalNotes,
        });
      } else {
        // Direct API call
        await fetch(`/api/regulatory/obligations/${rawId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            controlId: controlId.trim() || null,
            controlName: controlName.trim() || null,
            policyId: policyId.trim() || null,
            policyName: policyName.trim() || null,
            custodianRole,
            department,
            effectivenessStatus,
            evidenceStatus,
            evidenceArtifactName: evidenceArtifactName.trim() || null,
            notes: internalNotes,
          }),
        });
      }

      if (onUpdateOverride) {
        await onUpdateOverride(rawId, {
          status: currentStatus,
          assignedOwner: custodianRole,
          internalNotes,
          internalSopCitation,
          verifiedCriteriaIds,
        });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed saving control mapping', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleCriterion = (criterionId: string) => {
    const next = verifiedCriteriaIds.includes(criterionId)
      ? verifiedCriteriaIds.filter((id) => id !== criterionId)
      : [...verifiedCriteriaIds, criterionId];
    setVerifiedCriteriaIds(next);

    if (next.length === assessmentCriteria.length) {
      setCurrentStatus('ADEQUATELY_MET');
      setEffectivenessStatus('EFFECTIVE');
    } else if (next.length > 0) {
      setCurrentStatus('PARTIALLY_MET');
      setEffectivenessStatus('NEEDS_REVIEW');
    } else {
      setCurrentStatus('GAP_DETECTED');
      setEffectivenessStatus('CRITICAL_GAP');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const isOrphan = !controlId.trim();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-900/30 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden">
        {/* ────────────────────────────────────────────────────────────────────
            1. DRAWER HEADER (Rule #2: Zero Raw UUIDs!)
            ──────────────────────────────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/75 flex items-center justify-between gap-3 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-900">
                {humanId}
              </span>
              <span className="text-slate-400">·</span>
              <span className="font-mono text-xs text-slate-600">
                {citation}
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-900 line-clamp-1">
              {sectionHeading}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const next = !isStarred;
                setIsStarred(next);
                if (onToggleStar) onToggleStar(rawId);
              }}
              className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:text-amber-500 hover:bg-slate-50 transition-colors"
              title="Star Obligation"
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  isStarred ? 'text-amber-500 fill-amber-500' : ''
                }`}
              />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              title="Close Drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────────────
            2. FOUR-PHASE TAB NAVIGATION
            ──────────────────────────────────────────────────────────────────── */}
        <div className="flex items-center border-b border-slate-200 bg-white px-4 shrink-0 overflow-x-auto text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('safeguards')}
            className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'safeguards'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Phase 3: Internal Safeguards</span>
            {isOrphan && (
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Orphan gap" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'text'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Phase 1 & 2: Statutory Text</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('evidence')}
            className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'evidence'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Phase 4: Audit Evidence</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('concordance')}
            className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'concordance'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Statutory Concordance</span>
          </button>
        </div>

        {/* ────────────────────────────────────────────────────────────────────
            3. TAB CONTENT
            ──────────────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* TAB 1: PHASE 3 — INTERNAL SAFEGUARDS (Control Mapping Form) */}
          {activeTab === 'safeguards' && (
            <div className="space-y-5">
              {/* Orphan Alert if unmapped */}
              {isOrphan && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-rose-900">
                      Orphan Obligation Detected (BOFIA 2020 §65 Exposure)
                    </div>
                    <div className="text-[11px] text-rose-700 mt-0.5">
                      This statutory mandate has no mapped internal control safeguard. Assign an internal control ID below to eliminate institutional exposure.
                    </div>
                  </div>
                </div>
              )}

              {/* Control Safeguard Inputs */}
              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4 shadow-2xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Internal Control Mapping
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Internal Control ID
                    </label>
                    <input
                      type="text"
                      value={controlId}
                      onChange={(e) => setControlId(e.target.value)}
                      placeholder="e.g. CTRL-IT-884 or CTRL-COMP-012"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Control Name / Safeguard Description
                    </label>
                    <input
                      type="text"
                      value={controlName}
                      onChange={(e) => setControlName(e.target.value)}
                      placeholder="e.g. Automated Sanctions List Batch Screener"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Linked Internal Policy Document
                    </label>
                    <input
                      type="text"
                      value={policyId}
                      onChange={(e) => setPolicyId(e.target.value)}
                      placeholder="e.g. POL-AML-2024 or SOP-KYC-v2"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Policy Document Title
                    </label>
                    <input
                      type="text"
                      value={policyName}
                      onChange={(e) => setPolicyName(e.target.value)}
                      placeholder="e.g. Enterprise Anti-Money Laundering Framework"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Custodian / Responsible Role
                    </label>
                    <select
                      value={custodianRole}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustodianRole(val);
                        const roleMatch = functionalRoles.find((r) => r.roleTitle === val || r.roleId === val);
                        if (roleMatch && roleMatch.department) {
                          setDepartment(roleMatch.department);
                        } else {
                          const memberMatch = members.find((m) => m.fullName === val || m.userId === val);
                          if (memberMatch && memberMatch.department) {
                            setDepartment(memberMatch.department);
                          }
                        }
                      }}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      <option value="Unassigned">Unassigned</option>
                      {members.length > 0 && (
                        <optgroup label="Organization Members">
                          {members.map((m) => (
                            <option key={m.userId} value={m.fullName}>
                              {m.fullName} ({m.jobTitle || m.department.replace(/_/g, ' ')})
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {functionalRoles.length > 0 ? (
                        <optgroup label="Statutory Functional Roles">
                          {functionalRoles.map((r) => (
                            <option key={r.roleId} value={r.roleTitle}>
                              {r.roleTitle}
                            </option>
                          ))}
                        </optgroup>
                      ) : (
                        <optgroup label="Statutory Functional Roles">
                          <option value="Chief Compliance Officer">Chief Compliance Officer</option>
                          <option value="General Counsel">General Counsel</option>
                          <option value="Chief Risk Officer">Chief Risk Officer</option>
                          <option value="Head of IT Infrastructure">Head of IT Infrastructure</option>
                          <option value="Chief Operating Officer">Chief Operating Officer</option>
                          <option value="Chief Financial Officer">Chief Financial Officer</option>
                        </optgroup>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Operating Department
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      <option value="COMPLIANCE_LEGAL">Compliance & Legal</option>
                      <option value="OPERATIONS">Operations</option>
                      <option value="ENGINEERING_TECH">Engineering & Tech</option>
                      <option value="TREASURY_FINANCE">Treasury & Finance</option>
                      <option value="RISK_INTERNAL_AUDIT">Risk & Internal Audit</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Operational Health Status */}
              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Control Health & Audit Effectiveness
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Control Effectiveness
                    </label>
                    <select
                      value={effectivenessStatus}
                      onChange={(e) => setEffectivenessStatus(e.target.value as ControlEffectivenessStatus)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      <option value="EFFECTIVE">Effective (Adequately Met)</option>
                      <option value="NEEDS_REVIEW">Needs Review (Partially Met)</option>
                      <option value="CRITICAL_GAP">Critical Gap (Breach Risk)</option>
                      <option value="UNMAPPED">Unmapped (Orphan)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Evidence Status
                    </label>
                    <select
                      value={evidenceStatus}
                      onChange={(e) => setEvidenceStatus(e.target.value as EvidenceStatus)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      <option value="VERIFIED">Verified (Audit Artifact On File)</option>
                      <option value="PENDING_AUDIT">Pending Audit Verification</option>
                      <option value="MISSING_EVIDENCE">Missing Evidence Artifact</option>
                      <option value="NOT_APPLICABLE">Not Applicable</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PHASE 1 & 2 — STATUTORY TEXT & PROVENANCE */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Verbatim Statutory Requirement
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {statutoryText || atomicReq}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Enabling Instrument: {citation}
                </div>
              </div>

              {/* Statutory Penalties & Liabilities */}
              {penalties.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Statutory Penalty & Balance Sheet Exposure
                  </div>
                  {penalties.map((pen: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-2">
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-slate-500">Fine Scale:</span>
                        <span className="font-bold text-slate-900">
                          {formatCurrency(pen.penaltyMinNaira)} &ndash; {formatCurrency(pen.penaltyMaxNaira)}
                        </span>
                      </div>
                      {pen.dailyFineNaira > 0 && (
                        <div className="flex items-center justify-between font-mono">
                          <span className="text-slate-500">Daily Continuing Fine:</span>
                          <span className="font-bold text-slate-900">{formatCurrency(pen.dailyFineNaira)} / day</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 pt-1 border-t border-slate-200 text-[11px]">
                        {pen.carriesPersonalCriminalLiability && (
                          <span className="text-rose-700 font-medium">Carries Personal Officer Criminal Liability</span>
                        )}
                        {pen.carriesLicenseSuspensionRisk && (
                          <span className="text-rose-700 font-medium">License Suspension Risk</span>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">
                        Citation: {pen.penaltyLegalCitation}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PHASE 4 — AUDIT EVIDENCE */}
          {activeTab === 'evidence' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4 shadow-2xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Supervisory Audit Evidence Artifact
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Evidence File / Dossier Reference
                  </label>
                  <input
                    type="text"
                    value={evidenceArtifactName}
                    onChange={(e) => setEvidenceArtifactName(e.target.value)}
                    placeholder="e.g. SOP-KYC-v2.1.pdf or SANCTIONS_LOG_Q3_2024.csv"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-all"
                  />
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Verification Status:</span>
                    <span className="font-medium text-slate-800">{evidenceStatus}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Audit Dossier Pack:</span>
                    <span className="font-mono text-[11px] text-slate-700">
                      {evidenceArtifactName ? 'Linked to Bank Examiner Defense Pack' : 'No artifact linked'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: STATUTORY CONCORDANCE & CRITERIA */}
          {activeTab === 'concordance' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Concordance Assessment Criteria
                </div>
                <div className="space-y-2">
                  {assessmentCriteria.map((crit: any) => {
                    const isChecked = verifiedCriteriaIds.includes(crit.id);
                    return (
                      <div
                        key={crit.id}
                        onClick={() => handleToggleCriterion(crit.id)}
                        className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors flex items-start gap-2.5 ${
                          isChecked
                            ? 'bg-slate-50/80 border-slate-300'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                        />
                        <div className="space-y-0.5 flex-1">
                          <div className={`font-medium ${isChecked ? 'text-slate-900' : 'text-slate-700'}`}>
                            {crit.criterionText}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Evidence Required: {crit.evidenceRequired}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Internal Notes & SOP Citation */}
              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Compliance Officer Rationale & Notes
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Internal SOP Section / Clause Citation
                  </label>
                  <input
                    type="text"
                    value={internalSopCitation}
                    onChange={(e) => setInternalSopCitation(e.target.value)}
                    placeholder="e.g. Enterprise Ops Manual §4.2.1"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Audit Notes
                  </label>
                  <textarea
                    rows={3}
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Record deterministic rationale for bank examiners..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white resize-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ────────────────────────────────────────────────────────────────────
            4. DRAWER FOOTER (Actions)
            ──────────────────────────────────────────────────────────────────── */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  effectivenessStatus === 'EFFECTIVE'
                    ? 'bg-emerald-500'
                    : effectivenessStatus === 'NEEDS_REVIEW'
                    ? 'bg-amber-500'
                    : effectivenessStatus === 'CRITICAL_GAP'
                    ? 'bg-rose-500'
                    : 'bg-slate-400'
                }`}
              />
              <span>{effectivenessStatus}</span>
            </span>
            {saveSuccess && (
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Saved to Register</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveControlMapping}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Mapping'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
