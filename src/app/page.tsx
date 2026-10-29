import React from 'react';
import type { Metadata } from 'next';
import {
  Navbar,
  Hero,
  MetricStrip,
  PillarsSection,
  RegulatoryFrameworks,
  ArchitectureSecurity,
  InstitutionalPilot,
  Footer,
} from '@/modules/marketing-site';

export const metadata: Metadata = {
  title: 'Cogent | Sovereign RegTech & Supervisory Intelligence',
  description:
    'Autonomous regulatory intelligence and statutory supervisory concordance for Nigerian Commercial Banks, MFBs, FinTechs, and Payment Switches. Continuous compliance across CBN, NDPC, ARCON, SEC, and NFIU directives.',
  openGraph: {
    title: 'Cogent | Sovereign RegTech Operating System',
    description:
      'Deterministic rule evaluation, circular impact synthesis, and 5-W policy concordance across Nigerian financial regulations.',
    url: 'https://stem-cogent.com',
    siteName: 'Cogent Regulatory Systems',
    type: 'website',
  },
  alternates: {
    canonical: 'https://stem-cogent.com',
  },
};

export default function MarketingLandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col antialiased selection:bg-slate-900 selection:text-white">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <MetricStrip />
        <PillarsSection />
        <RegulatoryFrameworks />
        <ArchitectureSecurity />
        <InstitutionalPilot />
      </main>
      <Footer />
    </div>
  );
}
