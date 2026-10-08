'use client';

import React, { Suspense } from 'react';
import { OnboardingWizard } from '@/modules/onboarding';

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center text-xs text-[#4B5565]">Loading Workspace Setup...</div>}>
      <OnboardingWizard />
    </Suspense>
  );
}
