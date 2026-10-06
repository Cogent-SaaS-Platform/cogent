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
  Sparkles,
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
    // Extract proposed wording from whatToDo or use the full whatToDo text
    navigator.clipboard.writeText(item.whatToDo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = () => {
    switch (item.complianceStatus) {
      case 'ADEQUATELY_MET':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            Adequately Met (Clean Finding)
          </span>
        );
      case 'PARTIALLY_MET':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            Partially Met (Level 2 Deficiency)
          </span>
        );
      case 'CRITICAL_GAP':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <ShieldAlert className="w-3.5 h-3.5" />
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end transition-opacity duration-300">
      <div className="w-full max-w-3xl bg-[#0F1422] border-l border-slate-800 h-full overflow-y-auto flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-800/80 bg-[#141A2B]/80 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {getStatusBadge()}
                <span className="text-xs text-slate-400 font-mono">
                  {item.regulatoryClauseReference}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                5-W Operational Decision Matrix
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Comparing <span className="text-emerald-400 font-medium">{policyTitle}</span> against statutory mandate <span className="text-sky-400 font-medium">{benchmarkTitle}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Key Metric Pills */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800/60">
            <div className="bg-[#0A0D18] p-3 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-0.5">Statutory Fine Exposure</span>
              <span className={`text-base font-bold font-mono ${item.statutoryPenaltyNaira > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {formattedPenalty}
              </span>
            </div>
            <div className="bg-[#0A0D18] p-3 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-0.5">Responsible Role</span>
              <span className="text-sm font-semibold text-slate-200 truncate block">
                {item.responsibleRole || 'Chief Compliance Officer'}
              </span>
            </div>
            <div className="bg-[#0A0D18] p-3 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-0.5">Remediation Window</span>
              <span className="text-sm font-semibold text-amber-400 block">
                {item.statutoryRemediationTimelineDays || 30} Days
              </span>
            </div>
          </div>
        </div>

        {/* Drawer Body - 5-W Framework Cards */}
        <div className="p-6 space-y-5 flex-1">
          {/* Statutory Comparison Strip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold mb-2 uppercase tracking-wider">
                <Scale className="w-3.5 h-3.5" />
                Statutory Requirement
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-mono">
                {item.regulatoryClauseReference}: {item.statutoryLegalCitation || 'Statutory Regulation'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-2 uppercase tracking-wider">
                {item.matchedPolicySection ? <FileCheck2 className="w-3.5 h-3.5" /> : <FileWarning className="w-3.5 h-3.5" />}
                Internal Policy Clause
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {item.matchedPolicySection ? (
                  <>
                    <span className="font-mono text-indigo-300">{item.matchedPolicySection}: </span>
                    <span className="italic">"{item.matchedPolicyText || 'Referenced in policy'}"</span>
                  </>
                ) : (
                  <span className="text-red-400 italic">No matching clause identified in company policy manual.</span>
                )}
              </p>
            </div>
          </div>

          {/* 1. What Happened? */}
          <div className="p-4 rounded-xl bg-[#141A2B] border border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">1</span>
              What Happened? (Factual Baseline)
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">
              {item.whatHappened}
            </p>
          </div>

          {/* 2. What to Know? */}
          <div className="p-4 rounded-xl bg-[#141A2B] border border-slate-800">
            <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px] font-bold">2</span>
              What to Know? (Regulatory Context & Enforcement)
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">
              {item.whatToKnow}
            </p>
          </div>

          {/* 3. What Has Changed? */}
          <div className="p-4 rounded-xl bg-[#141A2B] border border-slate-800">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-bold">3</span>
              What Has Changed? (Operational Delta & Gap)
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">
              {item.whatHasChanged}
            </p>
          </div>

          {/* 4. What to Do? (Role-Based Remediation Action Checklist) */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold">4</span>
                What to Do? (Role-Based Remediation Playbook)
              </div>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
              {item.whatToDo}
            </p>
          </div>

          {/* DRAFT REPLACEMENT POLICY WORDING (BOARD-READY ADOPTION) */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#121c2e] to-[#0d1627] border border-cyan-500/40 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Ready-to-Adopt Draft Replacement Policy Language
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Board Risk Committee Ready
                </span>
              </div>
              <button
                onClick={() => {
                  const draft = item.draftReplacementLanguage || item.draftReplacementPolicyLanguage || item.whatToDo;
                  navigator.clipboard.writeText(draft);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-md shadow-cyan-600/30 transition-all cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied Wording' : 'Copy Draft Wording'}
              </button>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs font-mono text-cyan-100 leading-relaxed whitespace-pre-line">
              "{item.draftReplacementLanguage || item.draftReplacementPolicyLanguage || item.whatToDo}"
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
              <span>Sponsor: <strong>{item.responsibleRole || 'Chief Compliance Officer'}</strong></span>
              <span>Statutory Window: <strong className="text-amber-400">{item.statutoryRemediationTimelineDays || 30} Calendar Days</strong></span>
            </div>
          </div>

          {/* 5. Derived Insight */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-bold">5</span>
              Derived Insight (Examiner Defense & Balance Sheet Impact)
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">
              {item.derivedInsight}
            </p>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#141A2B] flex flex-wrap items-center justify-between gap-3">
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 text-xs font-semibold transition-all shadow-sm"
              >
                <Radio className="w-3.5 h-3.5 text-sky-400" />
                <span>Inspect Source in Radar</span>
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-semibold transition-all shadow-sm"
              >
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Pre-Vet Marketing Copy</span>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
          >
            Close Decision Drawer
          </button>
        </div>
      </div>
    </div>
  );
}
