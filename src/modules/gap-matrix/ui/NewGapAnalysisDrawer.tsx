'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  BookOpen,
  FileText,
  Search,
  Check,
  ChevronDown,
  Loader2,
  AlertCircle,
  Upload,
  Layers,
  Scale,
} from 'lucide-react';
import { RegulatorCode } from '@/shared/types';
import { UpgradePlanModal } from '@/shared/ui/UpgradePlanModal';
import { PlanTier } from '@/lib/plans';

export interface RegulatoryOption {
  id: string;
  title: string;
  shortName: string;
  regulatorCode: RegulatorCode;
  totalObligationsCount: number;
}

export interface PolicyOption {
  id: string;
  title: string;
  department: string;
  versionTag: string;
  clausesCount?: number;
}

interface NewGapAnalysisDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  availableRegulations?: RegulatoryOption[];
  availableBenchmarks?: any[];
  tenantPolicies: PolicyOption[];
  onAnalysisCreated: (newAnalysisId: string) => void;
  onOpenUploadPolicy: () => void;
}

export function NewGapAnalysisDrawer({
  isOpen,
  onClose,
  availableRegulations,
  availableBenchmarks,
  tenantPolicies,
  onAnalysisCreated,
  onOpenUploadPolicy,
}: NewGapAnalysisDrawerProps) {
  const regulationsList: RegulatoryOption[] = availableRegulations || (availableBenchmarks || []).map((b) => ({
    id: b.documentVersionId || b.id,
    title: b.instrumentTitle || b.title,
    shortName: b.shortName || b.shortTitle || b.title,
    regulatorCode: b.regulatorCode || b.regulator || 'CBN',
    totalObligationsCount: b.clausesCount || b.totalObligationsCount || 5,
  }));
  const [analysisName, setAnalysisName] = useState('');
  const [selectedRegIds, setSelectedRegIds] = useState<string[]>([]);
  const [selectedPolIds, setSelectedPolIds] = useState<string[]>([]);
  const [scope, setScope] = useState<'COMPLETE_REGULATORY_REVIEW' | 'POLICY_REGULATORY_REVIEW'>(
    'COMPLETE_REGULATORY_REVIEW'
  );

  // Dropdown states
  const [isRegDropdownOpen, setIsRegDropdownOpen] = useState(false);
  const [regSearchQuery, setRegSearchQuery] = useState('');
  const [isPolDropdownOpen, setIsPolDropdownOpen] = useState(false);
  const [polSearchQuery, setPolSearchQuery] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Subscription entitlement & upgrade modal state
  const [subscriptionPlan, setSubscriptionPlan] = useState<{
    tier: PlanTier;
    canRunMultiRegGap: boolean;
  } | null>(null);

  const [upgradeModalState, setUpgradeModalState] = useState<{
    isOpen: boolean;
    featureName?: string;
    requiredPlan?: PlanTier;
    reason?: string;
    isReadOnly?: boolean;
    currentUsage?: number;
    maxAllowed?: number;
  }>({ isOpen: false });

  useEffect(() => {
    fetch('/api/billing/subscription')
      .then((res) => res.json())
      .then((data) => {
        if (data?.tier) {
          const tier = data.tier as PlanTier;
          setSubscriptionPlan({
            tier,
            canRunMultiRegGap: tier === 'PRO' || tier === 'ENTERPRISE',
          });
        }
      })
      .catch(() => {});
  }, []);

  const regDropdownRef = useRef<HTMLDivElement>(null);
  const polDropdownRef = useRef<HTMLDivElement>(null);

  // Default selections when opened
  useEffect(() => {
    if (isOpen) {
      if (regulationsList.length > 0 && selectedRegIds.length === 0) {
        setSelectedRegIds([regulationsList[0].id]);
      }
      if (tenantPolicies.length > 0 && selectedPolIds.length === 0) {
        setSelectedPolIds([tenantPolicies[0].id]);
      }
      setErrorMessage(null);
    }
  }, [isOpen, regulationsList, tenantPolicies, selectedRegIds.length, selectedPolIds.length]);

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (regDropdownRef.current && !regDropdownRef.current.contains(event.target as Node)) {
        setIsRegDropdownOpen(false);
      }
      if (polDropdownRef.current && !polDropdownRef.current.contains(event.target as Node)) {
        setIsPolDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const filteredRegulations = regulationsList.filter((reg) => {
    const q = regSearchQuery.toLowerCase().trim();
    return !q || reg.title.toLowerCase().includes(q) || reg.shortName.toLowerCase().includes(q) || reg.regulatorCode.toLowerCase().includes(q);
  });

  const filteredPolicies = tenantPolicies.filter((pol) => {
    const q = polSearchQuery.toLowerCase().trim();
    return !q || pol.title.toLowerCase().includes(q) || pol.department.toLowerCase().includes(q);
  });

  const selectedRegulations = regulationsList.filter((r) => selectedRegIds.includes(r.id));
  const selectedPolicies = tenantPolicies.filter((p) => selectedPolIds.includes(p.id));

  const handleToggleRegulation = (id: string) => {
    if (selectedRegIds.includes(id)) {
      if (selectedRegIds.length > 1) {
        setSelectedRegIds(selectedRegIds.filter((rId) => rId !== id));
      }
    } else {
      if (subscriptionPlan && !subscriptionPlan.canRunMultiRegGap && selectedRegIds.length >= 1) {
        setUpgradeModalState({
          isOpen: true,
          featureName: 'Multi-Regulation Gap Analysis',
          requiredPlan: 'PRO',
          reason:
            'Multi-Regulation vs. Multi-Policy Gap Analysis is a Pro Tier capability. Starter and 7-Day Trial plans allow Single Regulation vs. Single Policy analysis. Upgrade to Pro for multi-statutory matrix benchmarking.',
        });
        return;
      }
      setSelectedRegIds([...selectedRegIds, id]);
    }
  };

  const handleRemoveRegulation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedRegIds.length > 1) {
      setSelectedRegIds(selectedRegIds.filter((rId) => rId !== id));
    }
  };

  const handleTogglePolicy = (id: string) => {
    if (selectedPolIds.includes(id)) {
      if (selectedPolIds.length > 1) {
        setSelectedPolIds(selectedPolIds.filter((pId) => pId !== id));
      }
    } else {
      if (subscriptionPlan && !subscriptionPlan.canRunMultiRegGap && selectedPolIds.length >= 1) {
        setUpgradeModalState({
          isOpen: true,
          featureName: 'Multi-Policy Gap Analysis',
          requiredPlan: 'PRO',
          reason:
            'Multi-Regulation vs. Multi-Policy Gap Analysis is a Pro Tier capability. Starter and 7-Day Trial plans allow Single Regulation vs. Single Policy analysis. Upgrade to Pro for multi-policy matrix benchmarking.',
        });
        return;
      }
      setSelectedPolIds([...selectedPolIds, id]);
    }
  };

  const handleRemovePolicy = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedPolIds.length > 1) {
      setSelectedPolIds(selectedPolIds.filter((pId) => pId !== id));
    }
  };

  const handleStartAnalysis = async () => {
    if (selectedRegIds.length === 0) {
      setErrorMessage('Please select at least one statutory regulation to assess.');
      return;
    }
    if (selectedPolIds.length === 0) {
      setErrorMessage('Please select at least one internal policy document.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const firstReg = selectedRegulations[0];
    const firstPol = selectedPolicies[0];
    const defaultName = selectedRegIds.length === 1 && selectedPolIds.length === 1
      ? `${firstReg?.shortName || 'Regulation'} vs ${firstPol?.title || 'Policy'}`
      : `${selectedRegIds.length} Regulations vs ${selectedPolIds.length} Policies Review`;

    const generatedName = analysisName.trim() || defaultName;

    try {
      const res = await fetch('/api/gap-matrix/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisName: generatedName,
          regulationIds: selectedRegIds,
          policyIds: selectedPolIds,
          scope,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        if (res.status === 402 || res.status === 403 || json.code === 'PLAN_LIMIT_REACHED' || json.code === 'TRIAL_EXPIRED') {
          setUpgradeModalState({
            isOpen: true,
            featureName: json.featureName || (selectedRegIds.length > 1 || selectedPolIds.length > 1 ? 'Multi-Regulation Gap Analysis' : 'Policy Gap Analysis Quota'),
            requiredPlan: (json.requiredPlan as PlanTier) || 'PRO',
            reason: json.error || 'Your current plan does not permit this gap analysis operation. Upgrade to Pro for unlimited multi-statutory evaluations.',
            isReadOnly: json.code === 'TRIAL_EXPIRED',
            currentUsage: json.currentUsage,
            maxAllowed: json.maxAllowed,
          });
          return;
        }
        throw new Error(json.error || 'Failed to start gap analysis');
      }

      const createdId = json.data?.evaluationId || json.data?.id;
      onAnalysisCreated(createdId);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Evaluation could not be completed';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div
        className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-modal="true"
        aria-label="Start a new gap analysis"
      >
        {/* Header */}
        <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Start a new gap analysis
            </h2>
            <p className="text-[11px] text-slate-500">
              Evaluate multi-regulation compliance against internal policies
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Analysis Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Analysis name
            </label>
            <input
              type="text"
              value={analysisName}
              onChange={(e) => setAnalysisName(e.target.value)}
              placeholder="e.g. Consumer Protection & Credit Policy Concordance Review"
              className="w-full text-xs p-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-slate-900 transition-all placeholder-slate-400"
            />
          </div>

          {/* 2. Regulations Multi-Select (Ref Video 02:41 - 02:50) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Regulations (Multi-Select)
              </label>
              <span className="text-[11px] text-slate-400">
                {selectedRegIds.length} selected
              </span>
            </div>

            {/* Selected Regulations Chips */}
            <div className="space-y-2">
              {selectedRegulations.map((reg) => (
                <div
                  key={reg.id}
                  className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-[10px] font-bold text-slate-700 uppercase bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                      {reg.regulatorCode}
                    </span>
                    <span className="font-medium text-slate-900 truncate">
                      {reg.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono text-slate-500">
                      {reg.totalObligationsCount} obligations
                    </span>
                    {selectedRegIds.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleRemoveRegulation(reg.id, e)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Remove regulation"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* + Add Regulation Dropdown Trigger */}
            <div className="relative" ref={regDropdownRef}>
              <button
                type="button"
                onClick={() => setIsRegDropdownOpen(!isRegDropdownOpen)}
                className="w-full flex items-center justify-between p-2 text-xs font-medium text-slate-700 bg-white border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-slate-500" />
                  <span>+ Add Regulation from Library</span>
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isRegDropdownOpen && (
                <div className="absolute left-0 right-0 top-10 z-30 bg-white border border-slate-200 rounded-xl shadow-xl p-2 space-y-2 max-h-60 overflow-y-auto animate-in fade-in duration-150">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={regSearchQuery}
                      onChange={(e) => setRegSearchQuery(e.target.value)}
                      placeholder="Search regulations..."
                      className="w-full pl-8 pr-2 py-1 text-xs border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto">
                    {filteredRegulations.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        No regulations found in library
                      </div>
                    ) : (
                      filteredRegulations.map((reg) => {
                        const isSelected = selectedRegIds.includes(reg.id);
                        return (
                          <div
                            key={reg.id}
                            onClick={() => handleToggleRegulation(reg.id)}
                            className="p-2 flex items-center justify-between cursor-pointer hover:bg-slate-50 rounded-md text-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-mono text-[9px] font-bold text-slate-600 uppercase mr-1.5">
                                [{reg.regulatorCode}]
                              </span>
                              <span className="font-medium text-slate-900 truncate">
                                {reg.title}
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                {reg.totalObligationsCount} extracted obligations
                              </span>
                            </div>
                            <div className="shrink-0">
                              {isSelected ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <span className="w-4 h-4 rounded border border-slate-300 block" />
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Policies to Assess (Multi-Select) (Ref Video 02:51 - 02:59) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Policies to assess (Multi-Select)
              </label>
              <span className="text-[11px] text-slate-400">
                {selectedPolIds.length} selected
              </span>
            </div>

            {/* Selected Policies Chips */}
            <div className="space-y-2">
              {selectedPolicies.map((pol) => (
                <div
                  key={pol.id}
                  className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <div>
                      <span className="font-medium text-slate-900 truncate block">
                        {pol.title}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        Policy • {pol.department} • v{pol.versionTag}
                      </span>
                    </div>
                  </div>
                  {selectedPolIds.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => handleRemovePolicy(pol.id, e)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded shrink-0"
                      title="Remove policy"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* + Add Policy Dropdown Trigger & Inline Upload */}
            <div className="space-y-2" ref={polDropdownRef}>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsPolDropdownOpen(!isPolDropdownOpen)}
                  className="w-full flex items-center justify-between p-2 text-xs font-medium text-slate-700 bg-white border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-slate-500" />
                    <span>+ Add Internal Policy Document</span>
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {isPolDropdownOpen && (
                  <div className="absolute left-0 right-0 top-10 z-30 bg-white border border-slate-200 rounded-xl shadow-xl p-2 space-y-2 max-h-60 overflow-y-auto animate-in fade-in duration-150">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={polSearchQuery}
                        onChange={(e) => setPolSearchQuery(e.target.value)}
                        placeholder="Search internal policies..."
                        className="w-full pl-8 pr-2 py-1 text-xs border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto">
                      {filteredPolicies.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-400">
                          No internal policies found
                        </div>
                      ) : (
                        filteredPolicies.map((pol) => {
                          const isSelected = selectedPolIds.includes(pol.id);
                          return (
                            <div
                              key={pol.id}
                              onClick={() => handleTogglePolicy(pol.id)}
                              className="p-2 flex items-center justify-between cursor-pointer hover:bg-slate-50 rounded-md text-xs"
                            >
                              <div className="min-w-0 pr-2">
                                <span className="font-medium text-slate-900 truncate block">
                                  {pol.title}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {pol.department} • v{pol.versionTag}
                                </span>
                              </div>
                              <div className="shrink-0">
                                {isSelected ? (
                                  <Check className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <span className="w-4 h-4 rounded border border-slate-300 block" />
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Inline Upload Policy Button */}
              <button
                type="button"
                onClick={onOpenUploadPolicy}
                className="w-full flex items-center justify-center gap-1.5 p-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200/70 rounded-lg transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Upload New Policy Manual (PDF / DOCX)</span>
              </button>
            </div>
          </div>

          {/* 4. Scope of Analysis Radio Cards (Ref Video 02:55) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">
              Scope of analysis
            </label>
            <div className="grid grid-cols-1 gap-2.5">
              {/* Option 1: Complete Regulatory Review */}
              <label
                className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  scope === 'COMPLETE_REGULATORY_REVIEW'
                    ? 'border-slate-900 bg-slate-50/70 ring-1 ring-slate-900'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="scope"
                  value="COMPLETE_REGULATORY_REVIEW"
                  checked={scope === 'COMPLETE_REGULATORY_REVIEW'}
                  onChange={() => setScope('COMPLETE_REGULATORY_REVIEW')}
                  className="mt-0.5 text-slate-900 focus:ring-0 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-900 block">
                    Complete Regulatory Review
                  </span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Assess all obligations across the selected regulations for comprehensive supervisory coverage.
                  </p>
                </div>
              </label>

              {/* Option 2: Policy Regulatory Review */}
              <label
                className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                  scope === 'POLICY_REGULATORY_REVIEW'
                    ? 'border-slate-900 bg-slate-50/70 ring-1 ring-slate-900'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="scope"
                  value="POLICY_REGULATORY_REVIEW"
                  checked={scope === 'POLICY_REGULATORY_REVIEW'}
                  onChange={() => setScope('POLICY_REGULATORY_REVIEW')}
                  className="mt-0.5 text-slate-900 focus:ring-0 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-900 block">
                    Policy Regulatory Review
                  </span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Focus analysis strictly on obligations that are directly relevant to the selected policies.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="h-16 px-6 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStartAnalysis}
            disabled={isSubmitting || selectedRegIds.length === 0 || selectedPolIds.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Evaluating Concordance...</span>
              </>
            ) : (
              <span>Start Analysis</span>
            )}
          </button>
        </div>
      </div>

      <UpgradePlanModal
        isOpen={upgradeModalState.isOpen}
        onClose={() => setUpgradeModalState({ isOpen: false })}
        featureName={upgradeModalState.featureName}
        requiredPlan={upgradeModalState.requiredPlan}
        reason={upgradeModalState.reason}
        isReadOnly={upgradeModalState.isReadOnly}
        currentUsage={upgradeModalState.currentUsage}
        maxAllowed={upgradeModalState.maxAllowed}
      />
    </div>
  );
}
