'use client';

import React from 'react';
import { AppShell } from '@/shared/ui/AppShell';
import { RadarCockpit } from '@/modules/radar';

export default function RadarPage() {
  return (
    <AppShell activePillarOverride="insight">
      <RadarCockpit />
    </AppShell>
  );
}
