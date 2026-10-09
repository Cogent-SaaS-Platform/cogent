'use client';

import React, { Suspense } from 'react';
import { AppShell } from '@/shared/ui/AppShell';
import { ExecutiveDashboard } from '@/modules/executive/ui';

export default function OverviewPage() {
  return (
    <AppShell activePillarOverride="overview">
      <Suspense fallback={<div className="p-8 text-[#4B5565] text-xs">Loading Executive Cockpit...</div>}>
        <ExecutiveDashboard />
      </Suspense>
    </AppShell>
  );
}
