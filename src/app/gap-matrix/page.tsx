'use client';

import React, { Suspense } from 'react';
import { AppShell } from '@/shared/ui/AppShell';
import { GapMatrixDashboard } from '@/modules/gap-matrix';

export default function GapMatrixPage() {
  return (
    <AppShell activePillarOverride="gap">
      <Suspense fallback={<div className="p-8 text-[#4B5565] text-xs">Loading 5-W Policy Gap Matrix...</div>}>
        <GapMatrixDashboard />
      </Suspense>
    </AppShell>
  );
}
