import React from 'react';
import { ShieldCheck, Layers, Scale, ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';

export function PillarsSection() {
  return (
    <section id="capabilities" className="py-20 bg-slate-50/50 border-b border-slate-200 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <span className="font-mono text-xs text-slate-500 uppercase tracking-widest block mb-2">
            SUPERVISORY COCKPITS
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Three Continuous Pillars of Statutory Governance
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed">
            Cogent consolidates marketing vetting, circular intelligence, and internal policy concordance 
            into an interconnected deterministic execution engine.
          </p>
        </div>

        {/* Pillars Grid */}
        <div className="mt-14 space-y-12">
          {/* Pillar 01: Marketing Shield */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 shadow-xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Description & Capabilities */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-slate-100 text-slate-900 border border-slate-200">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-mono text-xs text-slate-500 block">PILLAR 01</span>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                      Marketing Shield · Ad Pre-Vetting & Claims Drift Monitoring
                    </h3>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Eliminates regulatory exposure prior to campaign launch. Screens digital copy, SMS blasts, 
                  billboards, and app store metadata against ARCON Code of Advertising Practice, CBN Consumer 
                  Protection guidelines, and FCCPC digital lending directives.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" />
                    <span>Deterministic rule matching & prohibited terms scanning</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" />
                    <span>Statutory penalty calculation & fine exposure ranges</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" />
                    <span>Post-publish claims drift detection with hash comparison</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" />
                    <span>1-Click signed ARCON ASP vetting submission dossier export</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 hover:text-slate-700"
                  >
                    <span>Test Marketing Shield in 7-Day Pilot</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Right Column: Institutional Spec Card */}
              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs">
                  <span className="font-mono text-slate-500">SPEC_AUDIT: AD_PRE_VET</span>
                  <span className="inline-flex items-center gap-1.5 text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Deterministic Rule Evaluation
                  </span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Target Instrument
                    </span>
                    <span className="text-slate-800">ARCON Code 2022 § 14.1 / CBN CPF 2019</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Sanction Bracket
                    </span>
                    <span className="text-slate-800">₦500,000 – ₦10,000,000 + Revocation Order</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Audit Hash Seal
                    </span>
                    <span className="text-slate-600 break-all">
                      SHA-256: 4e91b5c2a8f...d019f
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pillar 02: Regulatory Radar */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 shadow-xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Description & Capabilities */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-slate-100 text-slate-900 border border-slate-200">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-mono text-xs text-slate-500 block">PILLAR 02</span>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                      Regulatory Radar · Circular Ingestion & Executive Role Synthesis
                    </h3>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Monitors and parses regulatory issuances from CBN, SEC, NDPC, and NFIU in real time. 
                  Automatically extracts circular reference codes, maps supersession chains, and computes 
                  actionable ExCo briefs segmented by operational accountability.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" />
                    <span>Real-time circular ingestion & PDF boundary decomposition</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" />
                    <span>Supersession lineage mapping (repealed vs. amended directives)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" />
                    <span>Structured ExCo briefs for CCO, COO, CTO, and CFO</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" />
                    <span>Cross-pillar compliance cascade triggers across systems</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 hover:text-slate-700"
                  >
                    <span>Inspect Live Radar Feed in 7-Day Pilot</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Right Column: Institutional Spec Card */}
              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs">
                  <span className="font-mono text-slate-500">EXCO_ROLE_SYNTHESIS</span>
                  <span className="inline-flex items-center gap-1.5 text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Statutory Concordance Active
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="p-2.5 bg-white border border-slate-200 rounded">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
                      CHIEF COMPLIANCE OFFICER (CCO)
                    </span>
                    <p className="text-xs text-slate-600 mt-1">
                      Legal exposure assessment, statutory fine exposure, and mandatory disclosures.
                    </p>
                  </div>

                  <div className="p-2.5 bg-white border border-slate-200 rounded">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
                      CHIEF TECHNOLOGY OFFICER (CTO)
                    </span>
                    <p className="text-xs text-slate-600 mt-1">
                      API architecture updates, transaction logging, and NDPA 2023 data isolation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pillar 03: 5-W Policy Gap Matrix */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 shadow-xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Description & Capabilities */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-slate-100 text-slate-900 border border-slate-200">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-mono text-xs text-slate-500 block">PILLAR 03</span>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                      5-W Policy Gap Matrix · Concordance & Audit Synthesis
                    </h3>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Upload internal Standard Operating Procedures (SOPs), manuals, and charters. 
                  Cogent performs multi-stage concordance against statutory obligation registers, 
                  synthesizing actionable 5-W decision cards and pre-cleared redline policy amendments.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" />
                    <span>Policy chunking & semantic concordance benchmarking</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" />
                    <span>Classification into Adequately Met, Partially Met, or Critical Gap</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" />
                    <span>Structured 5-W cards: What Happened, Know, Changed, Do, Insight</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" />
                    <span>Pre-cleared redline policy language ready for board adoption</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 hover:text-slate-700"
                  >
                    <span>Run Policy Concordance in 7-Day Pilot</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Right Column: Institutional Spec Card */}
              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs">
                  <span className="font-mono text-slate-500">5-W_DECISION_CARD</span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Adequately Met
                  </span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
                      WHAT TO KNOW
                    </span>
                    <span className="text-slate-800">
                      Mandatory retention of customer KYC telemetry for 5 years post-relationship.
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
                      WHAT TO DO
                    </span>
                    <span className="text-slate-800">
                      Update Section 4.2 of AML Policy with pre-cleared redline language.
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      STATUTORY CITATION
                    </span>
                    <span className="font-mono text-xs text-slate-600">
                      CBN AML/CFT/CPF Regs 2022 § 23(1)(b)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
