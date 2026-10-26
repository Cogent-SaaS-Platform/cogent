'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowRight, Clock } from 'lucide-react';

interface SubscriptionData {
  tier: string;
  status: string;
  isActive: boolean;
  isInGracePeriod: boolean;
  isReadOnly: boolean;
  trialEndsAt: string | null;
  gracePeriodEndsAt: string | null;
  marketingScanQuota: number;
  policyDocumentQuota: number;
}

export function TenantSubscriptionBanner() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchSubscription() {
      try {
        const res = await fetch('/api/billing/subscription');
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          const json = await res.json();
          if (json.success && json.data?.subscription && isMounted) {
            setSubscription(json.data.subscription);
          }
        }
      } catch {
        // Silently handle offline/decoupled scenarios
      }
    }
    fetchSubscription();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!subscription) {
    return null;
  }

  // 1. Expired Trial / Read-Only Mode Banner (Strategic Non-Intrusive Preservation)
  if (subscription.isReadOnly) {
    return (
      <div
        id="cogent-readonly-banner"
        className="w-full bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between gap-4 text-xs select-none backdrop-blur-sm"
      >
        <div className="flex items-center gap-2.5 text-amber-900 min-w-0">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="truncate">
            <strong className="font-semibold">Workspace in Read-Only Mode:</strong> Your 7-day evaluation trial has concluded. All historical marketing scans, circular impact briefs, and audit logs remain preserved.
          </span>
        </div>
        <Link
          href="/settings?tab=plan"
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition-colors shadow-xs"
        >
          <span>Upgrade to Starter or Pro</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    );
  }

  // 2. Past Due / Grace Period Banner
  if (subscription.isInGracePeriod) {
    return (
      <div
        id="cogent-grace-banner"
        className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between gap-4 text-xs text-amber-800 select-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="truncate">
            <strong>Payment Renewal Notice:</strong> Your subscription renewal is past due. Full scanning and AI features remain active during your 7-day grace period.
          </span>
        </div>
        <Link
          href="/settings?tab=billings"
          className="shrink-0 font-bold underline hover:text-amber-950 text-[11px]"
        >
          Update Payment Method
        </Link>
      </div>
    );
  }

  // 3. Active 7-Day Trial Discreet Reminder (Only if trialing with < 7 days remaining)
  if (subscription.status === 'trialing' && subscription.trialEndsAt) {
    const trialEnds = new Date(subscription.trialEndsAt);
    const msLeft = trialEnds.getTime() - Date.now();
    const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

    if (daysLeft <= 7) {
      return (
        <div
          id="cogent-trial-banner"
          className="w-full bg-[#EEF2FF] border-b border-[#C7D2FE] px-4 py-1.5 flex items-center justify-between gap-4 text-[11px] text-[#3730A3] select-none"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="w-3.5 h-3.5 text-[#4F46E5] shrink-0" />
            <span className="truncate">
              Operating on <strong>7-Day Institutional Evaluation Trial</strong> ({daysLeft} {daysLeft === 1 ? 'day' : 'days'} remaining).
            </span>
          </div>
          <Link
            href="/settings?tab=plan"
            className="shrink-0 font-bold text-[#4338CA] hover:text-[#312E81] hover:underline flex items-center gap-1"
          >
            <span>View Subscription Plans</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      );
    }
  }

  return null;
}
