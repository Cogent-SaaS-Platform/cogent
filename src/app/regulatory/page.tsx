'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/shared/ui/AppShell';
import { ObligationsRegisterView } from '@/modules/regulatory/ui/ObligationsRegisterView';

function RegulatoryRegisterContent() {
  const searchParams = useSearchParams();
  const circularId = searchParams.get('circularId') || undefined;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <ObligationsRegisterView circularId={circularId} />
    </div>
  );
}

export default function RegulatoryObligationsPage() {
  return (
    <AppShell activePillarOverride="library">
      <Suspense
        fallback={
          <div className="p-8 max-w-7xl mx-auto">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-slate-200 rounded w-48" />
              <div className="h-24 bg-slate-100 rounded-lg" />
              <div className="h-96 bg-slate-50 rounded-lg" />
            </div>
          </div>
        }
      >
        <RegulatoryRegisterContent />
      </Suspense>
    </AppShell>
  );
}
