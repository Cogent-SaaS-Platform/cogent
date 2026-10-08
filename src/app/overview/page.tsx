'use client';

import React from 'react';
import { AppShell } from '@/shared/ui/AppShell';
import { ExecutiveDashboard } from '@/modules/executive';

export default function OverviewPage() {
  return (
    <AppShell activePillarOverride="overview">
      <ExecutiveDashboard />
    </AppShell>
  );
}
