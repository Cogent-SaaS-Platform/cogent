'use client';

import React, { useState } from 'react';
import { MarketingComplianceHub } from './MarketingComplianceHub';
import { SplitScreenMarketingStudio } from './SplitScreenMarketingStudio';

export function MarketingShieldDashboard() {
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);

  const handleCreateNewCampaign = async () => {
    try {
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
      if (data.success && data.campaign?.id) {
        setActiveCampaignId(data.campaign.id);
      }
    } catch (err) {
      console.error('Failed to create new campaign:', err);
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
    <MarketingComplianceHub
      onOpenCampaign={(id) => setActiveCampaignId(id)}
      onCreateNewCampaign={handleCreateNewCampaign}
    />
  );
}
