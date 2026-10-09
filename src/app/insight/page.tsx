'use client';

import React, { Suspense } from 'react';
import { AppShell } from '@/shared/ui/AppShell';
import { RadarCockpit } from '@/modules/radar/ui';

export default function InsightPage() {
  return (
    <AppShell activePillarOverride="insight">
      <Suspense fallback={<div className="p-8 text-[#4B5565] text-xs">Loading Regulatory Horizon Scanning...</div>}>
        <RadarCockpit />
      </Suspense>
    </AppShell>
  );
}

