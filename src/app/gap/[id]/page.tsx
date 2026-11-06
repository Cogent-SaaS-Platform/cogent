import React, { Suspense } from 'react';
import { AppShell } from '@/shared/ui/AppShell';
import { GapMatrixDashboard } from '@/modules/gap-matrix/ui';

export default async function GapAnalysisByIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AppShell activePillarOverride="gap">
      <Suspense fallback={<div className="p-8 text-slate-500 text-xs">Loading 5-W Policy Gap Matrix...</div>}>
        <GapMatrixDashboard initialAnalysisId={id} />
      </Suspense>
    </AppShell>
  );
}
