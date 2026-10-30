import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar, Footer } from '@/modules/marketing-site';
import { ArrowRight, ShieldCheck, Scale, FileText, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Cogent | Sovereign RegTech Operating System',
  description:
    'Learn why Cogent was built: to protect Nigerian financial balance sheets from aggressive statutory penalties and eliminate marketing-to-legal gridlock across CBN, ARCON, NDPC, and SEC jurisdictions.',
  openGraph: {
    title: 'About Cogent | Sovereign RegTech Operating System',
    description:
      'Continuous regulatory intelligence and statutory supervisory concordance for Nigerian financial institutions.',
    url: 'https://stem-cogent.com/about',
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col antialiased selection:bg-slate-900 selection:text-white">
      <Navbar />

      <main className="flex-1">
        {/* About Hero */}
        <section className="pt-16 pb-20 md:pt-24 md:pb-28 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded bg-slate-50 border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="font-mono text-xs text-slate-700 tracking-tight">
                  ABOUT COGENT · SOVEREIGN AFRICAN REGTECH
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                Engineering Sovereign Balance-Sheet Defense for African Financial Institutions
              </h1>

              <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                We founded Cogent because the cost of regulatory non-compliance in Africa has transformed 
                from a routine operational friction into an existential financial liability.
              </p>
            </div>
          </div>
        </section>

        {/* The Macro Problem We Solve */}
        <section className="py-20 bg-slate-50/50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              <div className="lg:col-span-5 space-y-4">
                <span className="font-mono text-xs text-slate-500 uppercase tracking-widest block">
                  THE REALITY OF THE MARKET
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  The Statutory Enforcement Shift
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Across Nigeria and greater sub-Saharan Africa, apex authorities including the Central Bank of Nigeria (CBN), 
                  the Advertising Regulatory Council of Nigeria (ARCON), the Nigeria Data Protection Commission (NDPC), 
                  and the SEC have enacted aggressive, punitive compliance mandates.
                </p>
                <div className="pt-2 font-mono text-xs text-slate-500 space-y-1">
                  <div>· BOFIA 2020 § 65: Mandatory daily penalty formulas</div>
                  <div>· ARCON Act 2022 § 54: ₦500k – ₦10M advertising fines</div>
                  <div>· NDPA 2023: Sovereign data localization rules</div>
                </div>
              </div>

              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs space-y-6">
                <h3 className="text-base font-bold text-slate-900">
                  Why Existing Workarounds Are Failing
                </h3>

                <div className="space-y-4 text-xs sm:text-sm text-slate-600">
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>The WhatsApp &amp; Peer Rumor Channel</span>
                      <span className="font-mono text-xs text-rose-600">HIGH RISK</span>
                    </div>
                    <p className="text-slate-500 leading-relaxed text-xs">
                      Compliance teams learn about sweeping circulars late through unindexed PDFs shared in peer WhatsApp chats. 
                      Amendments and repeals are missed, leading to critical policy non-conformances.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>The 14-Day Legal Review Deadlock</span>
                      <span className="font-mono text-xs text-rose-600">HIGH RISK</span>
                    </div>
                    <p className="text-slate-500 leading-relaxed text-xs">
                      Growth teams need to launch customer acquisition campaigns immediately. Overburdened internal lawyers take 
                      two weeks to respond. Marketers bypass review, publishing claims that trigger immediate public sanctions.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>The Static Law Firm Retainer</span>
                      <span className="font-mono text-xs text-rose-600">HIGH COST</span>
                    </div>
                    <p className="text-slate-500 leading-relaxed text-xs">
                      Banks pay tens of millions annually for advisory memos and manual policy audits that take 6 weeks 
                      to deliver and become obsolete the moment the next circular is gazetted.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Our Engineering Principles */}
        <section className="py-20 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <span className="font-mono text-xs text-slate-500 uppercase tracking-widest block mb-2">
                FOUNDATIONAL PRINCIPLES
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                How Cogent Operates
              </h2>
              <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed">
                We believe regulatory intelligence must be deterministic, transparent, and built specifically 
                for the sovereignty of African financial institutions.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                <span className="font-mono text-xs text-slate-500 block">PRINCIPLE 01</span>
                <h3 className="text-base font-bold text-slate-900">
                  Deterministic Precedence
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Exact statutory matches, prohibited phrase lists, and regulatory penalty formulas always supersede 
                  probabilistic generation. We never leave statutory interpretation to unverified AI hallucinations.
                </p>
              </div>

              <div className="p-6 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                <span className="font-mono text-xs text-slate-500 block">PRINCIPLE 02</span>
                <h3 className="text-base font-bold text-slate-900">
                  Epistemic Modesty
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  We never claim &ldquo;100% compliant&rdquo; or guarantee regulatory immunity. All verdicts are 
                  strictly evidence-bounded: No Issue Detected, Review Recommended, Issue Detected, or Blocking Issue.
                </p>
              </div>

              <div className="p-6 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                <span className="font-mono text-xs text-slate-500 block">PRINCIPLE 03</span>
                <h3 className="text-base font-bold text-slate-900">
                  Cryptographic Audit Defense
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Every scan, circular analysis, and policy sign-off is anchored in a SHA-256 cryptographic ledger, 
                  giving General Counsels verifiable proof of institutional diligence for bank examiners.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Institutional Pilot CTA Block */}
        <section className="py-20 bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <span className="font-mono text-xs text-emerald-400 uppercase tracking-widest block">
              EXPERIENCE THE PLATFORM
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Protect Your Institution in 7 Days
            </h2>
            <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
              Test your live campaign copy, run concordance against your internal manuals, and ingest 
              official gazettes with zero procurement gates.
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
