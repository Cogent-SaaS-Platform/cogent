'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { MarketingComplianceHub } from './MarketingComplianceHub';
import { SplitScreenMarketingStudio } from './SplitScreenMarketingStudio';
import { UpgradePlanModal } from '@/shared/ui/UpgradePlanModal';
import { PlanTier } from '@/lib/plans';

export function MarketingShieldDashboard() {
  const searchParams = useSearchParams();
  const initialCampaignId = searchParams.get('campaignId');
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(initialCampaignId);
  const [createError, setCreateError] = useState<string | null>(null);
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
    const qId = searchParams.get('campaignId');
    if (qId) {
      setActiveCampaignId(qId);
    }
  }, [searchParams]);

  const handleCreateNewCampaign = async () => {
    try {
      setCreateError(null);
      const res = await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Promotional Campaign',
          productCategory: 'DIGITAL_NANO_LOAN',
          channel: 'SOCIAL_MEDIA_POST',
          canvasContent: '',
        }),
      });

      const data = await res.json();
      if (res.status === 402 || res.status === 403) {
        setUpgradeModalState({
          isOpen: true,
          featureName: 'Marketing Campaign Pre-Vetting',
          requiredPlan: (data.requiredPlan as PlanTier) || 'PRO',
          reason: data.error || 'You have reached your monthly Marketing Campaign allowance.',
          isReadOnly: !!data.isReadOnly,
          currentUsage: data.currentUsage,
          maxAllowed: data.maxAllowed,
        });
        return;
      }

      if (!res.ok || !data.success || !data.campaign?.id) {
        setCreateError(data.error || 'Unable to create campaign. Please retry.');
        return;
      }

      setActiveCampaignId(data.campaign.id);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Network error creating campaign.');
    }
  };

  if (activeCampaignId) {
    return (
      <SplitScreenMarketingStudio
        campaignId={activeCampaignId}
        onBackToHub={() => setActiveCampaignId(null)}
      />
    );
  }

  return (
    <>
      {createError && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-rose-50 text-rose-700 border border-rose-200 px-3 py-2 rounded text-xs font-medium flex items-center justify-between">
            <span>{createError}</span>
            <button
              type="button"
              onClick={handleCreateNewCampaign}
              className="px-2.5 py-1 rounded bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 text-xs font-medium cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      )}
      <MarketingComplianceHub
        onOpenCampaign={(id) => setActiveCampaignId(id)}
        onCreateNewCampaign={handleCreateNewCampaign}
      />
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
    </>
  );
}
