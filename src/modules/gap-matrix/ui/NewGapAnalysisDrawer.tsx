'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  FileText,
  BookOpen,
  Check,
  ChevronDown,
  Loader2,
  AlertCircle,
  Upload,
} from 'lucide-react';
import { StatutoryBenchmarkFramework } from '../types';

interface NewGapAnalysisDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  availableBenchmarks: StatutoryBenchmarkFramework[];
  tenantPolicies: Array<{ id: string; title: string; department: string; versionTag: string }>;
  onAnalysisCreated: (newAnalysisId: string) => void;
  onOpenUploadPolicy: () => void;
}

export function NewGapAnalysisDrawer({
  isOpen,
  onClose,
  availableBenchmarks,
  tenantPolicies,
  onAnalysisCreated,
  onOpenUploadPolicy,
}: NewGapAnalysisDrawerProps) {
  const [analysisName, setAnalysisName] = useState('');
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string>('');
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('');
  const [scope, setScope] = useState<'COMPLETE_REGULATORY_REVIEW' | 'POLICY_REGULATORY_REVIEW'>(
    'COMPLETE_REGULATORY_REVIEW'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Default selection when opened
  useEffect(() => {
    if (isOpen) {
      if (availableBenchmarks.length > 0 && !selectedBenchmarkId) {
        setSelectedBenchmarkId(availableBenchmarks[0].documentVersionId);
      }
      if (tenantPolicies.length > 0 && !selectedPolicyId) {
        setSelectedPolicyId(tenantPolicies[0].id);
      }
      setErrorMessage(null);
    }
  }, [isOpen, availableBenchmarks, tenantPolicies, selectedBenchmarkId, selectedPolicyId]);

  if (!isOpen) return null;

  const selectedBenchmark = availableBenchmarks.find(
    (b) => b.documentVersionId === selectedBenchmarkId
  );
  const selectedPolicy = tenantPolicies.find((p) => p.id === selectedPolicyId);

  const handleStartAnalysis = async () => {
    if (!selectedBenchmarkId) {
      setErrorMessage('Please select a statutory regulation to benchmark against.');
      return;
    }
    if (!selectedPolicyId) {
      setErrorMessage('Please select an internal policy manual to assess.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const generatedName =
      analysisName.trim() ||
      `${selectedBenchmark?.shortName || 'Regulation'} vs ${selectedPolicy?.title || 'Policy'}`;

    try {
      const res = await fetch('/api/gap-matrix/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisName: generatedName,
          benchmarkDocumentVersionId: selectedBenchmarkId,
          policyId: selectedPolicyId,
          scope,
          policyTitle: selectedPolicy?.title || 'Internal Policy',
          department: selectedPolicy?.department || 'COMPLIANCE_LEGAL',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
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
        <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Start a new gap analysis
          </h2>
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
            <label className="text-xs font-semibold text-slate-700">
              Analysis name
            </label>
            <input
              type="text"
              value={analysisName}
              onChange={(e) => setAnalysisName(e.target.value)}
              placeholder={
                selectedBenchmark && selectedPolicy
                  ? `${selectedBenchmark.shortName} vs ${selectedPolicy.title}`
                  : 'Enter analysis name'
              }
              className="w-full px-3.5 py-2 text-xs text-slate-900 bg-white border border-slate-200 rounded-lg outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 placeholder-slate-400"
            />
          </div>

          {/* 2. Regulations Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Regulations
              </label>
              <span className="text-[11px] text-slate-400">Target benchmark</span>
            </div>

            <div className="relative">
              <select
                value={selectedBenchmarkId}
                onChange={(e) => setSelectedBenchmarkId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg appearance-none outline-none focus:border-slate-900 focus:bg-white transition-all cursor-pointer pr-10"
              >
                {availableBenchmarks.map((b) => (
                  <option key={b.documentVersionId} value={b.documentVersionId}>
                    [{b.regulatorCode}] {b.shortName} — {b.referenceCode} ({b.clausesCount} clauses)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {selectedBenchmark && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2.5 text-xs text-slate-700">
                <BookOpen className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 truncate">
                    {selectedBenchmark.instrumentTitle}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Citation: {selectedBenchmark.referenceCode} • Regulator: {selectedBenchmark.regulatorCode}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Policies to Assess Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Policies to assess
              </label>
              <button
                type="button"
                onClick={onOpenUploadPolicy}
                className="text-xs font-medium text-slate-900 hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Upload New Manual</span>
              </button>
            </div>

            {tenantPolicies.length > 0 ? (
              <div className="relative">
                <select
                  value={selectedPolicyId}
                  onChange={(e) => setSelectedPolicyId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg appearance-none outline-none focus:border-slate-900 focus:bg-white transition-all cursor-pointer pr-10"
                >
                  {tenantPolicies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} (v{p.versionTag}) — {p.department.replace('_', ' ')}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            ) : (
              <div className="p-4 border border-dashed border-slate-300 rounded-lg text-center space-y-2 bg-slate-50/50">
                <p className="text-xs text-slate-600">
                  No internal policy manuals in vault yet.
                </p>
                <button
                  type="button"
                  onClick={onOpenUploadPolicy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Policy Manual</span>
                </button>
              </div>
            )}

            {selectedPolicy && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2.5 text-xs text-slate-700">
                <FileText className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 truncate">
                    {selectedPolicy.title}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Version: v{selectedPolicy.versionTag} • Dept: {selectedPolicy.department}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Scope of Analysis Radio Cards (Zango Layout temp (12).png) */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-semibold text-slate-700 block">
              Scope of analysis
            </label>

            {/* Radio Option 1: Complete Regulatory Review */}
            <div
              onClick={() => setScope('COMPLETE_REGULATORY_REVIEW')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                scope === 'COMPLETE_REGULATORY_REVIEW'
                  ? 'border-slate-900 bg-slate-50/60 ring-1 ring-slate-900'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      scope === 'COMPLETE_REGULATORY_REVIEW'
                        ? 'border-slate-900 bg-slate-900'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {scope === 'COMPLETE_REGULATORY_REVIEW' && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-900">
                    Complete Regulatory Review
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Assess all obligations across the selected regulations for comprehensive coverage.
                  </p>
                </div>
              </div>
            </div>

            {/* Radio Option 2: Policy Regulatory Review */}
            <div
              onClick={() => setScope('POLICY_REGULATORY_REVIEW')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                scope === 'POLICY_REGULATORY_REVIEW'
                  ? 'border-slate-900 bg-slate-50/60 ring-1 ring-slate-900'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      scope === 'POLICY_REGULATORY_REVIEW'
                        ? 'border-slate-900 bg-slate-900'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {scope === 'POLICY_REGULATORY_REVIEW' && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-900">
                    Policy Regulatory Review
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Focus analysis on obligations that are directly relevant to the selected policies.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer CTAs */}
        <div className="p-4 px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStartAnalysis}
            disabled={isSubmitting || !selectedBenchmarkId || !selectedPolicyId}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Running Concordance Engine...</span>
              </>
            ) : (
              <span>Start Analysis</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
