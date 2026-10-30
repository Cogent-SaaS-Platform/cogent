'use client';

import React from 'react';
import { Scale, Check, AlertCircle, Layers, ShieldCheck, Radar, FileCheck, ArrowUpRight } from 'lucide-react';

export function ThreeColumnFeatureGrid() {
  return (
    <section className="py-20 md:py-28 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Headline: Centered at top, bold geometric sans-serif (Matching se.JPG) */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <span className="font-mono text-xs text-[#2A4BFF] font-semibold uppercase tracking-widest block">
            HOW IT WORKS · THE 3 PILLAR BLOCKS
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Autonomous Supervisory Intelligence Engineered for Compliance
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Turn regulatory ambiguity into structured, plain-English executive directives, pre-clear marketing 
            campaigns in milliseconds, and maintain unbroken audit readiness before bank examiners arrive.
          </p>
        </div>

        {/* 3-Column Feature Grid (Matching se.JPG horizontal layout with uniform gaps) */}
        <div className="mt-16 md:mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
          
          {/* BLOCK 1: Horizon Radar */}
          <div className="flex flex-col h-full">
            {/* Top: Isolated Light Cream Canvas Container (#F7F7F9) with smooth rounded corners */}
            <div className="bg-[#F7F7F9] rounded-2xl p-6 sm:p-8 flex items-center justify-center min-h-[300px] sm:min-h-[320px] relative overflow-hidden">
              <div className="w-full max-w-[270px] flex flex-col items-center relative font-mono text-[10px]">
                {/* Floating Black Pill at Top */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-900 text-white font-bold tracking-wider text-[10px] shadow-sm mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>7 APEX REGULATORS INGESTED</span>
                </div>

                {/* Central Vertical Timeline Connecting Line */}
                <div className="relative w-full space-y-2.5">
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300 -translate-x-1/2 -z-0" />

                  {/* Branch Row 1: Lineage Tree */}
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="w-[45%] bg-white border border-slate-200 rounded-md py-1 px-2 flex items-center justify-between shadow-2xs font-sans">
                      <span className="text-slate-700 font-semibold text-[10px]">REPEALS § 14</span>
                      <span className="w-3.5 h-3.5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[8px] font-bold">
                        ✕
                      </span>
                    </div>
                    <div className="w-[45%] bg-white border border-slate-200 rounded-md py-1 px-2 flex items-center justify-between shadow-2xs font-sans">
                      <span className="text-slate-700 font-semibold text-[10px]">AMENDS § 5.2</span>
                      <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>

                  {/* Branch Row 2: ExCo Briefs */}
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="w-[45%] h-5 bg-white border border-slate-200 rounded-md flex items-center px-2 shadow-2xs">
                      <div className="h-1 w-full bg-slate-200 rounded-full" />
                    </div>
                    <div className="w-[45%] bg-white border border-slate-200 rounded-md py-1 px-2 flex items-center justify-between shadow-2xs font-sans">
                      <span className="text-slate-700 font-semibold text-[10px]">CTO Action</span>
                      <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>

                  {/* Branch Row 3: Latency */}
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="w-[45%] bg-white border border-slate-200 rounded-md py-1 px-2 flex items-center justify-between shadow-2xs font-sans">
                      <span className="text-slate-700 font-semibold text-[10px]">CFO Reserves</span>
                      <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    </div>
                    <div className="w-[45%] h-5 bg-white border border-slate-200 rounded-md flex items-center px-2 shadow-2xs">
                      <div className="h-1 w-3/4 bg-slate-200 rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Bottom Node */}
                <div className="mt-3 relative z-10 w-7 h-7 rounded-full bg-white border border-slate-300 shadow-xs flex items-center justify-center text-slate-800">
                  <Radar className="w-3.5 h-3.5 text-[#2A4BFF]" />
                </div>
              </div>
            </div>

            {/* Middle: Bold, High-Contrast Title & Value Proposition */}
            <div className="mt-6 space-y-3 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#2A4BFF] bg-blue-50 px-2 py-0.5 rounded">
                    PILLAR 01
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    Horizon Radar
                  </h3>
                </div>

                {/* Value Proposition */}
                <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
                  Wake up with structured, plain-English action briefs already mapped across your executive committee.
                </p>

                {/* Customer Pain Point */}
                <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-600 leading-relaxed">
                  <span className="font-semibold text-slate-800 block text-[11px] mb-0.5">THE PROBLEM:</span>
                  Tired of discovering Friday midnight CBN circulars on WhatsApp and wasting days deciphering repealed clauses while executive leadership waits?
                </div>

                {/* Features */}
                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <span className="font-semibold text-slate-800 block text-[11px] uppercase tracking-wider font-mono">
                    STATUTORY CAPABILITIES:
                  </span>
                  <div className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Scheduled ingestion across 7 apex regulators</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Automatic circular supersession lineage trees (Amends, Replaces, Repeals)</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Character-span obligation extraction</span>
                  </div>
                </div>
              </div>

              {/* Benefit / Outcome Box */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  MEASURED OUTCOME:
                </span>
                <p className="text-xs text-slate-800 font-medium leading-relaxed bg-emerald-50/60 p-2.5 rounded border border-emerald-100">
                  Deliver tailored operational action items to your CEO, COO, CTO, and CFO within 15 minutes of gazetting—long before statutory deadlines hit.
                </p>
              </div>
            </div>
          </div>

          {/* BLOCK 2: Marketing Shield */}
          <div className="flex flex-col h-full">
            {/* Top: Isolated Light Cream Canvas Container (#F7F7F9) */}
            <div className="bg-[#F7F7F9] rounded-2xl p-6 sm:p-8 flex items-center justify-center min-h-[300px] sm:min-h-[320px] relative overflow-hidden">
              <div className="w-full max-w-[270px] space-y-3 font-sans">
                {/* Stakeholder Badges at Top (Matching Legal, Marketing, Compliance in se.JPG) */}
                <div className="flex items-center justify-center gap-2 text-[10px] text-slate-600">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-slate-200/90 shadow-2xs font-semibold text-slate-900">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2A4BFF]" />
                    Marketing
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-slate-200/90 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    Legal
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-slate-200/90 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    ARCON Pre-Vetted
                  </span>
                </div>

                {/* White Chat/Review Box (Matching se.JPG Column 3) */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm space-y-2">
                  <p className="text-[11px] text-slate-800 font-medium leading-snug">
                    Can we run "Zero Interest on First Loan"? Need ad campaign live today.
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500 font-mono">
                    <span>ARCON § 54 DETECTED</span>
                    <span className="text-rose-600 font-semibold">FLAGGED (₦10M FINE)</span>
                  </div>
                </div>

                {/* Status Bar: Pre-Cleared Rewrite */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-sm space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-800 font-bold text-[11px]">Compliant Alternative</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                      100% PRE-CLEARED
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 font-mono italic">
                    "Introductory 0% Annual Fee with standard CBN-vetted APR."
                  </p>
                </div>
              </div>
            </div>

            {/* Middle: Bold, High-Contrast Title & Value Proposition */}
            <div className="mt-6 space-y-3 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#2A4BFF] bg-blue-50 px-2 py-0.5 rounded">
                    PILLAR 02
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    Marketing Shield
                  </h3>
                </div>

                {/* Value Proposition */}
                <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
                  Clear promotional campaigns instantly without sacrificing conversion hooks, backed by 24/7 web monitoring and 1-click ARCON filing packets.
                </p>

                {/* Customer Pain Point */}
                <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-600 leading-relaxed">
                  <span className="font-semibold text-slate-800 block text-[11px] mb-0.5">THE PROBLEM:</span>
                  Tired of marketing treating legal like the "Department of No," launching unvetted ads, or tweaking live landing pages that trigger ₦500k–₦10M+ ARCON and CBN penalties?
                </div>

                {/* Features */}
                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <span className="font-semibold text-slate-800 block text-[11px] uppercase tracking-wider font-mono">
                    STATUTORY CAPABILITIES:
                  </span>
                  <div className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Sub-50ms deterministic regex scanner</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Conversion-preserving compliant rewrites</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>24/7 live URL copy drift watcher and pre-packaged ARCON ASP clearance dossiers</span>
                  </div>
                </div>
              </div>

              {/* Benefit / Outcome Box */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  MEASURED OUTCOME:
                </span>
                <p className="text-xs text-slate-800 font-medium leading-relaxed bg-emerald-50/60 p-2.5 rounded border border-emerald-100">
                  Slash advertising review latency by 90% and push growth campaigns live in minutes with zero balance-sheet penalty exposure.
                </p>
              </div>
            </div>
          </div>

          {/* BLOCK 3: 5-W Policy Gap Matrix */}
          <div className="flex flex-col h-full">
            {/* Top: Isolated Light Cream Canvas Container (#F7F7F9) with smooth rounded corners */}
            <div className="bg-[#F7F7F9] rounded-2xl p-6 sm:p-8 flex items-center justify-center min-h-[300px] sm:min-h-[320px] relative overflow-hidden">
              {/* Stacked Sheet effect behind card (matching se.JPG Column 1) */}
              <div className="absolute w-[82%] h-12 bg-white/70 border border-slate-200/60 rounded-xl top-6 shadow-2xs -z-0" />
              <div className="absolute w-[86%] h-12 bg-white/85 border border-slate-200/70 rounded-xl top-8 shadow-2xs -z-0" />

              {/* Crisp White Foreground Card */}
              <div className="relative z-10 w-full max-w-[270px] bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4 font-mono">
                {/* Header: Scale icon + CBN & BOFIA Framework */}
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <div className="p-1 rounded bg-slate-100 text-slate-800">
                    <Scale className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 tracking-tight font-sans">
                    BOFIA 2020 &amp; CBN Concordance
                  </span>
                </div>

                {/* Sub row: Gaps identified + tiny red high-contrast circle pill */}
                <div className="flex items-center justify-between text-xs font-sans">
                  <span className="text-slate-600 font-medium">Policy Gaps Identified</span>
                  <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold inline-flex items-center justify-center shadow-2xs">
                    2
                  </span>
                </div>

                {/* 3 Columns: Manual, Statute, Remediation */}
                <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-[9px] text-slate-400 uppercase font-semibold text-center">
                  <span>MANUAL</span>
                  <span className="text-slate-700 font-bold">STATUTE</span>
                  <span>PRE-CLEARED</span>
                </div>

                {/* Abstract Wireframe Placeholder Lines */}
                <div className="space-y-1.5 pt-1">
                  <div className="h-1.5 w-full bg-slate-200 rounded-full" />
                  <div className="h-1.5 w-4/5 bg-slate-200 rounded-full" />
                  <div className="h-2 w-full bg-slate-800 rounded-full shadow-2xs" />
                  <div className="flex justify-center pt-1">
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2.5 py-0.5 rounded bg-slate-900 text-white tracking-wider">
                      CLOSE GAP
                    </span>
                  </div>
                  <div className="h-1.5 w-3/4 bg-slate-200 rounded-full mx-auto" />
                </div>
              </div>
            </div>

            {/* Middle: Bold, High-Contrast Title & Value Proposition */}
            <div className="mt-6 space-y-3 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#2A4BFF] bg-blue-50 px-2 py-0.5 rounded">
                    PILLAR 03
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    5-W Policy Gap Matrix
                  </h3>
                </div>

                {/* Value Proposition */}
                <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
                  Maintain continuous clause-by-clause audit readiness with pre-drafted remediation language to close policy gaps before inspectors walk in.
                </p>

                {/* Customer Pain Point */}
                <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-600 leading-relaxed">
                  <span className="font-semibold text-slate-800 block text-[11px] mb-0.5">THE PROBLEM:</span>
                  Tired of your corporate manuals sitting as static Word docs in Google Drive, dreading the hidden compliance omissions bank examiners will uncover?
                </div>

                {/* Features */}
                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <span className="font-semibold text-slate-800 block text-[11px] uppercase tracking-wider font-mono">
                    STATUTORY CAPABILITIES:
                  </span>
                  <div className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Automated policy document chunking</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>3-tier statutory concordance evaluation against BOFIA 2020 and CBN regulations</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Ready-to-paste draft clauses</span>
                  </div>
                </div>
              </div>

              {/* Benefit / Outcome Box */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  MEASURED OUTCOME:
                </span>
                <p className="text-xs text-slate-800 font-medium leading-relaxed bg-emerald-50/60 p-2.5 rounded border border-emerald-100">
                  Replace expensive, multi-month law firm gap reviews with on-demand concordance, exporting tamper-evident audit defense binders for routine CBN examinations.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

