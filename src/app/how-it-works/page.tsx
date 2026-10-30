import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar, Footer } from '@/modules/marketing-site';
import { ArrowRight, CheckCircle2, XCircle, ShieldCheck, FileText, Layers, Scale, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'How It Works | Cogent RegTech Operating System',
  description:
    'Discover how Cogent automates regulatory circular ingestion, campaign pre-vetting, and policy gap concordance for Nigerian financial institutions.',
  openGraph: {
    title: 'How It Works | Cogent RegTech Operating System',
    description:
      'Continuous supervisory intelligence: from midnight circulars to sealed bank examiner defense packs.',
    url: 'https://stem-cogent.com/how-it-works',
  },
};

export default function HowItWorksPage() {
  const steps = [
    {
      num: '01',
      tag: 'CIRCULAR SURVEILLANCE',
      title: 'Official Gazette Ingestion & Atomic Decomposition',
      problem:
        'Regulators publish circulars late at night as unindexed PDFs with immediate deadlines. Teams miss amendments and repeals, relying on informal WhatsApp chats.',
      howItWorks:
        'Cogent continuously monitors apex regulatory portals (CBN, NDPC, ARCON, SEC, NFIU). The moment a circular drops, the engine extracts character-span obligations and categorizes them by statutory severity.',
      statute: 'CBN/BSD/DIR · BOFIA 2020 § 65',
    },
    {
      num: '02',
      tag: 'EXCO ALIGNMENT',
      title: 'Automated 4-Way Departmental Directives',
      problem:
        'Dense regulatory circulars are dumped entirely on compliance. Engineering, operations, and finance teams never read them, creating operational non-compliance.',
      howItWorks:
        'Cogent synthesizes tailored, role-specific action briefs for the Chief Compliance Officer, Chief Operating Officer, Chief Technology Officer, and Chief Financial Officer—delivered within 15 minutes of gazetting.',
      statute: 'Cross-Functional Execution Matrix',
    },
    {
      num: '03',
      tag: 'POLICY AUDITING',
      title: '5-W Policy Concordance & Gap Matrix',
      problem:
        'Internal AML manuals and credit policies are 150+ pages long. Cross-referencing them against new laws takes months of manual law firm billable hours, and gaps are discovered during CBN bank examinations.',
      howItWorks:
        'The Gap Matrix compares internal operational manuals clause-by-clause against statutory requirements, classifies items into Adequately Met, Partially Met, or Critical Gap, and drafts pre-cleared replacement language.',
      statute: 'BOFIA 2020 § 5.2 / CAMA 2020',
    },
    {
      num: '04',
      tag: 'PROMOTIONAL PRE-CLEARANCE',
      title: 'Sub-50ms Marketing Pre-Vetting & Live Drift Watcher',
      problem:
        'Marketers wait 14 days for legal sign-off or launch unvetted campaigns that trigger ₦500k to ₦10M ARCON/CBN fines. Product teams later alter live landing page copy without legal knowledge.',
      howItWorks:
        'Growth teams paste copy into Marketing Shield for instant deterministic checks against statutory penalty schedules. The 24/7 Drift Watcher monitors live URLs to alert legal if public copy diverges from sign-off.',
      statute: 'ARCON Act 2022 § 54 / CBN CPF 2019',
    },
    {
      num: '05',
      tag: 'SUPERVISORY DEFENSE',
      title: 'Cryptographic Bank Examiner Audit Defense Packs',
      problem:
        'When Central Bank examiners arrive, institutions scramble to produce messy email chains and ad-hoc spreadsheets, failing to prove institutional compliance diligence.',
      howItWorks:
        'Cogent seals every input, rule evaluation, and executive sign-off in an unbroken SHA-256 cryptographic chain of custody, exporting a tamper-evident defense dossier engineered for regulatory inspection.',
      statute: '7-Year BOFIA Statutory Audit Retention',
    },
  ];

  const comparisons = [
    {
      dimension: 'Midnight Circular Response',
      statusQuo: 'WhatsApp leaks & 7–14 days manual legal analysis',
      cogent: '< 15 minutes automated 4-way ExCo impact synthesis',
    },
    {
      dimension: 'Marketing Campaign Turnaround',
      statusQuo: '5 to 15 business days stuck in legal email backlog',
      cogent: 'Sub-50ms deterministic pre-vetting with compliant rewrites',
    },
    {
      dimension: 'Policy Gap Auditing',
      statusQuo: '₦5M–₦15M law firm retainer; 6-8 weeks delivery',
      cogent: 'Continuous clause-by-clause concordance in seconds',
    },
    {
      dimension: 'Live Public Copy Drift',
      statusQuo: 'Undetected until regulatory penalty letter arrives',
      cogent: '24/7 automated HTML fetch & SHA-256 hash drift alerts',
    },
    {
      dimension: 'Bank Examiner Audit Defense',
      statusQuo: 'Scattered email threads and unverified spreadsheets',
      cogent: 'Cryptographic SHA-256 sealed defense dossiers',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col antialiased selection:bg-slate-900 selection:text-white">
      <Navbar />

      <main className="flex-1">
        {/* Page Hero */}
        <section className="pt-16 pb-20 md:pt-24 md:pb-28 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded bg-slate-50 border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="font-mono text-xs text-slate-700 tracking-tight">
                  SUPERVISORY ARCHITECTURE · WORKFLOW SPECIFICATION
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                How Cogent Replaces Weeks of Legal Review with Continuous Supervisory Defense
              </h1>

              <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                A step-by-step breakdown of how Nigerian financial institutions ingest apex circulars, 
                pre-vet marketing campaigns, audit internal manuals, and seal examiner defense packs.
              </p>

              <div className="mt-8">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg font-medium text-xs px-5 py-3 shadow-xs transition-colors"
                >
                  <span>Start 7-Day Pilot</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* The 5-Step Process */}
        <section className="py-20 bg-slate-50/50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-14">
              <span className="font-mono text-xs text-slate-500 uppercase tracking-widest block mb-2">
                THE 5-STEP SUPERVISORY CYCLE
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                From Circular Gazette to Examiner Defense
              </h2>
            </div>

            <div className="space-y-8">
              {steps.map((step) => (
                <div
                  key={step.num}
                  className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
                >
                  <div className="lg:col-span-1">
                    <span className="font-mono text-2xl font-bold text-slate-300">
                      {step.num}
                    </span>
                  </div>

                  <div className="lg:col-span-6 space-y-3">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
                      {step.tag}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                      {step.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {step.howItWorks}
                    </p>
                    <span className="font-mono text-xs text-slate-500 block pt-1">
                      CITING: {step.statute}
                    </span>
                  </div>

                  <div className="lg:col-span-5 bg-slate-50 p-4 sm:p-5 rounded-lg border border-slate-200 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                      The Risk It Eliminates:
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {step.problem}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Status Quo vs. Cogent Table */}
        <section className="py-20 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-12">
              <span className="font-mono text-xs text-slate-500 uppercase tracking-widest block mb-2">
                OPERATIONAL COMPARISON
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                The Status Quo vs. The Cogent Engine
              </h2>
              <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed">
                Why relying on manual emails and periodic law firm retainers leaves institutions defenseless.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                      <th className="p-4 sm:p-5 font-bold uppercase tracking-wider text-[11px]">Compliance Operational Area</th>
                      <th className="p-4 sm:p-5 font-bold uppercase tracking-wider text-[11px] text-rose-800">Status Quo Workaround</th>
                      <th className="p-4 sm:p-5 font-bold uppercase tracking-wider text-[11px] text-emerald-800">Cogent Autonomous Engine</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {comparisons.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 sm:p-5 font-medium text-slate-900">
                          {item.dimension}
                        </td>
                        <td className="p-4 sm:p-5 text-slate-500">
                          <div className="flex items-start gap-2">
                            <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            <span>{item.statusQuo}</span>
                          </div>
                        </td>
                        <td className="p-4 sm:p-5 text-slate-900 font-medium">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{item.cogent}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <span className="font-mono text-xs text-emerald-400 uppercase tracking-widest block">
              INSTITUTIONAL EVALUATION
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Test Cogent in Your Real Workflow
            </h2>
            <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
              Start your 7-day institutional pilot today. Ingest your actual policies, pre-vet active copy, 
              and experience continuous supervisory defense.
            </p>
            <div className="pt-2">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-100 rounded-lg font-medium text-xs px-6 py-3 transition-colors shadow-xs"
              >
                <span>Start 7-Day Pilot</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
