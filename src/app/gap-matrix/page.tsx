'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { GapMatrixDashboard } from '@/modules/gap-matrix';

export default function GapMatrixPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#090D16]">
      <GapMatrixDashboard
        onSwitchPillar={(p) => {
          if (p === 'marketing') {
            router.push('/');
          } else if (p === 'radar') {
            router.push('/radar');
          }
        }}
      />
    </main>
  );
}
