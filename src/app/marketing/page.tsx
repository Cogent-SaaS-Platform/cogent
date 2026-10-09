'use client';

import React, { Suspense } from 'react';
import { AppShell } from '@/shared/ui/AppShell';
import { MarketingShieldDashboard } from '@/modules/marketing-shield/ui';

export default function MarketingPage() {
  return (
    <AppShell activePillarOverride="marketing">
      <Suspense fallback={<div className="p-8 text-[#4B5565] text-xs">Loading Marketing Shield...</div>}>
        <MarketingShieldDashboard />
      </Suspense>
    </AppShell>
  );
}

