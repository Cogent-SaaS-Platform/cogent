import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Scale, FileText } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden bg-slate-50/50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          {/* Eyebrow badge with status dot */}
          <div className="inline-flex items-center gap-2 mb-6 px-2.5 py-1 rounded bg-white border border-slate-200 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-mono text-xs text-slate-700 tracking-tight">
              Sovereign RegTech Operating System
            </span>
            <span className="text-slate-300">|</span>
            <span className="font-mono text-xs text-slate-500">Nigeria Jurisdiction</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            Autonomous Regulatory Intelligence & Statutory Supervisory Concordance
          </h1>

          {/* Value proposition */}
          <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
            Engineered for Nigerian Commercial Banks, MFBs, FinTechs, and Payment Switches.
            Continuous deterministic rule evaluation, automated circular impact synthesis, and 
            statutory concordance across CBN, NDPC, ARCON, and SEC directives.
          </p>

          {/* Action Row */}
          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg font-medium text-xs px-5 py-3 shadow-xs transition-colors"
            >
              <span>Start 7-Day Institutional Pilot</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#frameworks"
              className="inline-flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg font-medium text-xs px-5 py-3 transition-colors"
            >
              <span>Explore Statutory Frameworks</span>
            </a>
          </div>

          {/* Trust Metadata */}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 font-normal">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Instant Workspace Provisioning
            </span>
            <span>·</span>
            <span>Google OAuth Enabled (@gmail.com allowed)</span>
            <span>·</span>
            <span>Zero Procurement Gate</span>
          </div>
        </div>

        {/* Real-time Supervisory Inspection Preview Console */}
        <div className="mt-12 lg:mt-16 bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
          {/* Console Header Bar */}
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono text-slate-600">COGENT://SUPERVISORY-RADAR/LIVE-INSPECTION</span>
              <span className="text-slate-300">|</span>
              <span className="inline-flex items-center gap-1 text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active Feed
              </span>
            </div>
            <div className="font-mono text-slate-500 hidden sm:block">
              SHA-256: 8f2c01d4...e39a
            </div>
          </div>

          {/* Console Grid Body */}
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-white">
            {/* Column 1: Marketing Shield Event */}
            <div className="border border-slate-200 rounded p-4 bg-slate-50/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  Marketing Shield
                </span>
                <span className="font-mono text-xs text-slate-600">ARCON Code § 14.1</span>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-900">
                  Pre-Vetting Scan: Digital Lending Campaign
                </p>
                <p className="text-xs text-slate-500 line-clamp-2">
                  Target copy screened against mandatory disclosure standards and penalty schedules.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Pre-Cleared
                </span>
                <span className="font-mono text-slate-600">₦0 Fine Exposure</span>
              </div>
            </div>

            {/* Column 2: Regulatory Radar Event */}
            <div className="border border-slate-200 rounded p-4 bg-slate-50/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  Regulatory Radar
                </span>
                <span className="font-mono text-xs text-slate-600">CBN/BSD/DIR/2026/04</span>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-900">
                  Circular Ingestion & Role Synthesis
                </p>
                <p className="text-xs text-slate-500 line-clamp-2">
                  Lineage graph generated. ExCo brief dispatched to CCO, COO, CTO, and CFO.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Supersession Mapped
                </span>
                <span className="font-mono text-slate-600">4 ExCo Briefs</span>
              </div>
            </div>

            {/* Column 3: 5-W Policy Gap Matrix Event */}
            <div className="border border-slate-200 rounded p-4 bg-slate-50/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  Policy Gap Matrix
                </span>
                <span className="font-mono text-xs text-slate-600">BOFIA 2020 § 5.2</span>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-900">
                  Statutory Concordance Evaluation
                </p>
                <p className="text-xs text-slate-500 line-clamp-2">
                  Credit Risk Governance manual aligned against statutory obligations register.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Adequately Met
                </span>
                <span className="font-mono text-slate-600">100% Citations</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
