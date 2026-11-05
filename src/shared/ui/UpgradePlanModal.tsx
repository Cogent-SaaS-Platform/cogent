'use client';

import React, { useState } from 'react';
import { X, Check, ShieldCheck, ArrowRight, Loader2, Scale } from 'lucide-react';
import { PlanTier, PLAN_CONFIG } from '@/lib/plans';

export interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
  requiredPlan?: PlanTier;
  reason?: string;
  currentUsage?: number;
  maxAllowed?: number;
  isReadOnly?: boolean;
}

export function UpgradePlanModal({
  isOpen,
  onClose,
  featureName = 'Pro Capability',
  requiredPlan = 'PRO',
  reason,
  currentUsage,
  maxAllowed,
  isReadOnly = false,
}: UpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const targetPlan = PLAN_CONFIG[requiredPlan] || PLAN_CONFIG.PRO;

  if (!isOpen) return null;

  const handleDirectUpgrade = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/billing/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: requiredPlan === 'TRIAL' ? 'STARTER' : requiredPlan,
          billingInterval: 'monthly',
          callbackUrl: `${window.location.origin}/settings?tab=plan&payment=success`,
        }),
      });

      const data = await res.json();
      if (data?.data?.authorizationUrl) {
        window.location.assign(data.data.authorizationUrl);
      } else {
        window.location.assign('/settings?tab=plan');
      }
    } catch {
      window.location.assign('/settings?tab=plan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {targetPlan.name} Required
              </span>
            </div>
            <h2 id="upgrade-modal-title" className="text-lg font-bold text-slate-900 tracking-tight">
              {isReadOnly
                ? 'Evaluation Pilot Concluded'
                : `${featureName} is a ${targetPlan.name} Capability`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Reason Box */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 space-y-1">
            <p className="leading-relaxed">
              {reason ||
                (isReadOnly
                  ? 'Your organization’s 7-day institutional evaluation trial has concluded. Existing marketing audits, gap analyses, and circular briefs remain preserved in read-only mode.'
                  : currentUsage !== undefined && maxAllowed !== undefined
                  ? `You have reached your quota limit of ${maxAllowed} on your current plan (${currentUsage}/${maxAllowed} used). Upgrade to unlock unlimited volume.`
                  : `${featureName} requires the ${targetPlan.name} to activate full supervisory automation and unmetered capacity.`)}
            </p>
          </div>

          {/* Value Highlights */}
          <div className="space-y-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Included in {targetPlan.name}:
            </span>
            <ul className="space-y-2 text-xs text-slate-800">
              {targetPlan.features.slice(0, 5).map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span className="leading-tight">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pricing callout */}
          <div className="p-3.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                Billing Rate (Paystack)
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-bold font-mono text-slate-900">
                  {targetPlan.pricing.ngnMonthlyFormatted}
                </span>
                <span className="text-xs text-slate-500">/month</span>
                <span className="text-xs font-mono text-slate-400 ml-1">
                  (${targetPlan.pricing.usdMonthly}/mo)
                </span>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Immediate Activation
            </span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-6 pt-3 bg-slate-50/50 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
          <a
            href="/settings?tab=plan"
            className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-center transition-colors cursor-pointer"
          >
            Compare All Plans
          </a>
          <button
            type="button"
            disabled={isLoading}
            onClick={handleDirectUpgrade}
            className="w-full sm:w-auto px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Connecting to Paystack...</span>
              </>
            ) : (
              <>
                <span>
                  Upgrade to {targetPlan.name} ({targetPlan.pricing.ngnMonthlyFormatted})
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
