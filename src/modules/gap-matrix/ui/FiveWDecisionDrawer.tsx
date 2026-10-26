'use client';

import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Check,
  Building,
  UserCheck,
  Clock,
  Scale,
  FileCheck2,
  FileWarning,
  Radio,
  Shield,
} from 'lucide-react';
import { PlatformPillar, CrossPillarLinkContext } from '@/shared/types';
import { EvaluatedGapItem } from '../types';

interface FiveWDecisionDrawerProps {
  item: EvaluatedGapItem | null;
  onClose: () => void;
  policyTitle?: string;
  benchmarkTitle?: string;
  onSwitchPillar?: (pillar: PlatformPillar, context?: CrossPillarLinkContext) => void;
}

export function FiveWDecisionDrawer({
  item,
  onClose,
  policyTitle = 'Company Operational Policy',
  benchmarkTitle = 'Statutory Benchmark Baseline',
  onSwitchPillar,
}: FiveWDecisionDrawerProps) {
  const [copied, setCopied] = useState(false);

  if (!item) return null;

  const handleCopyProposedWording = () => {
    const draft = item.draftReplacementLanguage || item.draftReplacementPolicyLanguage || item.whatToDo;
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = () => {
    switch (item.complianceStatus) {
      case 'ADEQUATELY_MET':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Adequately Met (Clean Finding)
          </span>
        );
      case 'PARTIALLY_MET':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Partially Met (Level 2 Deficiency)
          </span>
        );
      case 'CRITICAL_GAP':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-800 border border-red-200">
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
            Critical Gap (Level 1 Material Deficiency)
          </span>
        );
      default:
        return null;
    }
  };

  const formattedPenalty = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(item.statutoryPenaltyNaira);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-sm flex justify-end transition-opacity duration-300 font-sans">
      <div className="w-full max-w-3xl bg-white border-l border-[#DDE3EE] h-full overflow-y-auto flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-6 border-b border-[#DDE3EE] bg-[#F9FAFC] sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {getStatusBadge()}
                <span className="text-xs text-[#4B5565] font-mono font-semibold">
                  {item.regulatoryClauseReference}
                </span>
              </div>
              <h2 className="text-xl font-bold text-[#0B0F1A] tracking-tight">
                5-W Operational Decision Matrix
              </h2>
              <p className="text-xs text-[#4B5565] mt-1">
                Comparing <span className="text-emerald-700 font-semibold">{policyTitle}</span> against statutory mandate <span className="text-[#2A4BFF] font-semibold">{benchmarkTitle}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-[#4B5565] hover:text-[#0B0F1A] rounded-lg hover:bg-[#F5F6FA] transition-colors border border-[#DDE3EE] bg-white shadow-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Key Metric Pills */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-[#DDE3EE]">
            <div className="bg-white p-3 rounded-xl border border-[#DDE3EE] shadow-xs">
              <span className="text-[11px] text-[#4B5565] font-semibold block mb-0.5">Statutory Fine Exposure</span>
              <span className={`text-base font-bold font-mono ${item.statutoryPenaltyNaira > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                {formattedPenalty}
              </span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-[#DDE3EE] shadow-xs">
              <span className="text-[11px] text-[#4B5565] font-semibold block mb-0.5">Responsible Role</span>
              <span className="text-sm font-bold text-[#0B0F1A] truncate block">
                {item.responsibleRole || 'Chief Compliance Officer'}
              </span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-[#DDE3EE] shadow-xs">
              <span className="text-[11px] text-[#4B5565] font-semibold block mb-0.5">Remediation Window</span>
              <span className="text-sm font-bold text-amber-800 block">
                {item.statutoryRemediationTimelineDays || 30} Days
              </span>
            </div>
          </div>
        </div>

        {/* Drawer Body - 5-W Framework Cards */}
        <div className="p-6 space-y-5 flex-1">
          {/* Statutory Comparison Strip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#F9FAFC] border border-[#DDE3EE] shadow-xs">
              <div className="flex items-center gap-2 text-[#2A4BFF] text-xs font-bold mb-2 uppercase tracking-wider">
                <Scale className="w-3.5 h-3.5" />
                Statutory Requirement
              </div>
              <p className="text-xs text-[#0B0F1A] leading-relaxed font-mono">
                {item.regulatoryClauseReference}: {item.statutoryLegalCitation || 'Statutory Regulation'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#F9FAFC] border border-[#DDE3EE] shadow-xs">
              <div className="flex items-center gap-2 text-purple-700 text-xs font-bold mb-2 uppercase tracking-wider">
                {item.matchedPolicySection ? <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" /> : <FileWarning className="w-3.5 h-3.5 text-red-600" />}
                Internal Policy Clause
              </div>
              <p className="text-xs text-[#0B0F1A] leading-relaxed">
                {item.matchedPolicySection ? (
                  <>
                    <span className="font-mono text-purple-900 font-bold">{item.matchedPolicySection}: </span>
                    <span className="italic">&ldquo;{item.matchedPolicyText || 'Referenced in policy'}&rdquo;</span>
                  </>
                ) : (
                  <span className="text-red-700 font-semibold italic">No matching clause identified in company policy manual.</span>
                )}
              </p>
            </div>
          </div>

          {/* 1. What Happened? */}
          <div className="p-4 rounded-xl bg-red-50/40 border border-red-200 shadow-xs">
            <div className="flex items-center gap-2 text-red-800 text-xs font-bold uppercase tracking-wider mb-2">
              <span className="w-5 h-5 rounded-full bg-red-100 text-red-800 flex items-center justify-center text-[10px] font-bold border border-red-300">1</span>
              What Happened? (Factual Baseline)
            </div>
            <p className="text-sm text-[#0B0F1A] leading-relaxed">
              {item.whatHappened}
            </p>
          </div>

          {/* 2. What to Know? */}
          <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-200 shadow-xs">
            <div className="flex items-center gap-2 text-blue-800 text-xs font-bold uppercase tracking-wider mb-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[10px] font-bold border border-blue-300">2</span>
              What to Know? (Regulatory Context & Enforcement)
            </div>
            <p className="text-sm text-[#0B0F1A] leading-relaxed">
              {item.whatToKnow}
            </p>
          </div>

          {/* 3. What Has Changed? */}
          <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200 shadow-xs">
            <div className="flex items-center gap-2 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-bold border border-amber-300">3</span>
              What Has Changed? (Operational Delta & Gap)
            </div>
            <p className="text-sm text-[#0B0F1A] leading-relaxed">
              {item.whatHasChanged}
            </p>
          </div>

          {/* 4. What to Do? */}
          <div className="p-4 rounded-xl bg-purple-50/40 border border-purple-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-purple-900 text-xs font-bold uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-900 flex items-center justify-center text-[10px] font-bold border border-purple-300">4</span>
                What to Do? (Role-Based Remediation Playbook)
              </div>
            </div>
            <p className="text-sm text-[#0B0F1A] leading-relaxed whitespace-pre-line">
              {item.whatToDo}
            </p>
          </div>

          {/* DRAFT REPLACEMENT POLICY WORDING (BOARD-READY ADOPTION) */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-emerald-900 text-xs font-bold uppercase tracking-wider">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                Ready-to-Adopt Draft Replacement Policy Language
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                  Board Risk Committee Ready
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyProposedWording}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-all cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-white" />}
                <span>{copied ? 'Copied Wording' : 'Copy Draft Wording'}</span>
              </button>
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-emerald-200 text-xs font-mono text-[#0B0F1A] leading-relaxed whitespace-pre-line shadow-xs">
              &ldquo;{item.draftReplacementLanguage || item.draftReplacementPolicyLanguage || item.whatToDo}&rdquo;
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#4B5565]">
              <span>Sponsor: <strong className="text-[#0B0F1A]">{item.responsibleRole || 'Chief Compliance Officer'}</strong></span>
              <span>Statutory Window: <strong className="text-amber-800 font-bold">{item.statutoryRemediationTimelineDays || 30} Calendar Days</strong></span>
            </div>
          </div>

          {/* 5. Derived Insight */}
          <div className="p-4 rounded-xl bg-[#F9FAFC] border border-[#DDE3EE] shadow-xs">
            <div className="flex items-center gap-2 text-[#0B0F1A] text-xs font-bold uppercase tracking-wider mb-2">
              <span className="w-5 h-5 rounded-full bg-[#E4E9F2] text-[#0B0F1A] flex items-center justify-center text-[10px] font-bold">5</span>
              Derived Insight (Examiner Defense & Balance Sheet Impact)
            </div>
            <p className="text-sm text-[#4B5565] leading-relaxed">
              {item.derivedInsight}
            </p>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-[#DDE3EE] bg-[#F9FAFC] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {onSwitchPillar && (
              <button
                type="button"
                onClick={() => {
                  onSwitchPillar('radar', {
                    targetPillar: 'radar',
                    searchTerm: item.regulatoryClauseReference,
                  });
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F5F6FA] text-[#2A4BFF] border border-[#DDE3EE] text-xs font-semibold transition-all shadow-xs"
              >
                <Radio className="w-3.5 h-3.5 text-[#2A4BFF]" />
                <span>Inspect Source in Insight</span>
              </button>
            )}
            {onSwitchPillar && (
              <button
                type="button"
                onClick={() => {
                  onSwitchPillar('marketing', {
                    targetPillar: 'marketing',
                    searchTerm: item.regulatoryClauseReference,
                  });
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F5F6FA] text-amber-800 border border-[#DDE3EE] text-xs font-semibold transition-all shadow-xs"
              >
                <Shield className="w-3.5 h-3.5 text-amber-600" />
                <span>Pre-Vet Marketing Copy</span>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-white border border-[#DDE3EE] hover:bg-[#F5F6FA] text-[#0B0F1A] rounded-xl transition-colors shadow-xs"
          >
            Close Decision Drawer
          </button>
        </div>
      </div>
    </div>
  );
}
