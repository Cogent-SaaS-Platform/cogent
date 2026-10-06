'use client';

import React, { useState } from 'react';
import { PlatformPillar, CrossPillarLinkContext } from '@/shared/types';
import { EnterpriseHeader } from '@/shared/ui/EnterpriseHeader';
import { ExecutiveDashboard } from '@/modules/executive';
import { MarketingShieldDashboard } from '@/modules/marketing-shield';
import { RadarCockpit } from '@/modules/radar';
import { GapMatrixDashboard } from '@/modules/gap-matrix';

export default function Home() {
  const [activePillar, setActivePillar] = useState<PlatformPillar>('executive');
  const [crossPillarContext, setCrossPillarContext] = useState<CrossPillarLinkContext | null>(null);

  React.useEffect(() => {
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

  return (
    <div className="min-h-screen bg-[#090D16] flex flex-col">
      <EnterpriseHeader activePillar={activePillar} onSwitchPillar={handleSwitchPillar} />
      <main className="flex-1">
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
      </main>
    </div>
  );
}
