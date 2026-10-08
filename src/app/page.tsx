'use client';

import React, { useState, useEffect } from 'react';
import { PlatformPillar, CrossPillarLinkContext } from '@/shared/types';
import { AppShell } from '@/shared/ui/AppShell';
import { ExecutiveDashboard } from '@/modules/executive';
import { MarketingShieldDashboard } from '@/modules/marketing-shield';
import { RadarCockpit } from '@/modules/radar';
import { GapMatrixDashboard } from '@/modules/gap-matrix';

export default function Home() {
  const [activePillar, setActivePillar] = useState<PlatformPillar>('executive');
  const [crossPillarContext, setCrossPillarContext] = useState<CrossPillarLinkContext | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const pillarParam = params.get('pillar') as PlatformPillar | null;
      if (pillarParam && ['executive', 'marketing', 'radar', 'gap-matrix'].includes(pillarParam)) {
        setActivePillar(pillarParam);
      }
    }
  }, []);

  const handleSwitchPillar = (pillar: PlatformPillar, context?: CrossPillarLinkContext) => {
    setActivePillar(pillar);
    if (context) {
      setCrossPillarContext(context);
    }
  };

  const handleNavigateOverride = (href: string) => {
    if (href === '/overview' || href === '/') {
      setActivePillar('executive');
    } else if (href === '/insight' || href === '/radar') {
      setActivePillar('radar');
    } else if (href === '/marketing') {
      setActivePillar('marketing');
    } else if (href === '/gap' || href === '/gap-matrix') {
      setActivePillar('gap-matrix');
    }
  };

  return (
    <AppShell
      activePillarOverride={activePillar}
      onNavigateOverride={handleNavigateOverride}
    >
      {activePillar === 'executive' && (
        <ExecutiveDashboard onSwitchPillar={handleSwitchPillar} />
      )}
      {activePillar === 'marketing' && (
        <MarketingShieldDashboard
          onSwitchPillar={handleSwitchPillar}
          initialContext={crossPillarContext}
        />
      )}
      {activePillar === 'radar' && (
        <RadarCockpit
          onSwitchPillar={handleSwitchPillar}
          initialContext={crossPillarContext}
        />
      )}
      {activePillar === 'gap-matrix' && (
        <GapMatrixDashboard
          onSwitchPillar={handleSwitchPillar}
          initialContext={crossPillarContext}
        />
      )}
    </AppShell>
  );
}
