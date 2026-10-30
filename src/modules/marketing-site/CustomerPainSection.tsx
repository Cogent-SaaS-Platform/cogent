'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Check, AlertTriangle, Clock, ShieldAlert } from 'lucide-react';

interface PainCard {
  tag: string;
  title: string;
  problem: string;
  outcome: string;
  statute: string;
  visual: React.ReactNode;
}

export function CustomerPainSection() {
  const cards: PainCard[] = [
    {
      tag: 'POLICY CONCORDANCE',
      title: 'Gap Analysis',
      problem:
        'Internal operational manuals and risk policies are 150+ pages long. Manual audits take months of billable legal hours, and hidden omissions are discovered by Central Bank examiners during routine inspections.',
      outcome:
        'Automated clause-by-clause manual auditing against official gazettes, identifying critical non-compliance in seconds and drafting pre-cleared remediation clauses.',
      statute: 'BOFIA 2020 § 5.2 / CAMA 2020',
      visual: (
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3 font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
            <span className="font-bold text-slate-800">EU / CBN AML Act</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              3 Gaps Identified
            </span>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded border border-slate-100">
              <span className="text-slate-600">Customer Due Diligence §4</span>
              <span className="text-emerald-600 font-semibold">Adequately Met</span>
            </div>
            <div className="flex items-center justify-between p-1.5 bg-rose-50/50 rounded border border-rose-100">
              <span className="text-slate-700">PEP Beneficial Ownership §12</span>
              <span className="text-rose-600 font-bold">Critical Gap</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Remediation Draft: Ready</span>
            <span className="text-slate-900 font-bold">FIX GAP →</span>
          </div>
        </div>
      ),
    },
    {
      tag: 'HORIZON SURVEILLANCE',
      title: 'Continuous Monitoring',
      problem:
        'Apex regulators issue circulars late at night via unindexed PDFs with immediate 30-day deadlines. Compliance officers rely on informal WhatsApp rumors, risking board embarrassment and executive penalties.',
      outcome:
        'Continuous automated ingestion of official gazettes within minutes of publication, generating 4-way ExCo impact briefs for CCO, COO, CTO, and CFO before the morning standup.',
      statute: 'CBN/BSD/DIR / NDPA 2023',
      visual: (
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3 font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
            <span className="font-bold text-slate-800">Circular Lineage Radar</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              91% Passed
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="p-1.5 bg-slate-50 rounded border border-slate-100 flex items-center justify-between">
              <span className="text-slate-500">Credit Risk</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="p-1.5 bg-slate-50 rounded border border-slate-100 flex items-center justify-between">
              <span className="text-slate-500">KYC / AML</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="p-1.5 bg-slate-50 rounded border border-slate-100 flex items-center justify-between">
              <span className="text-slate-500">Payments</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="p-1.5 bg-slate-50 rounded border border-slate-100 flex items-center justify-between">
              <span className="text-slate-500">Treasury</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Alerts: Real-time</span>
            <span className="text-slate-900 font-bold">ACTIVE SCAN</span>
          </div>
        </div>
      ),
    },
    {
      tag: 'ADVERTISING PRE-VETTING',
      title: 'Marketing Compliance',
      problem:
        'Growth and marketing teams wait 5 to 15 business days for manual legal review. Frustrated teams bypass counsel, inadvertently publishing claims that trigger ₦500k to ₦10M ARCON and CBN penalties.',
      outcome:
        'Sub-50ms deterministic pre-vetting scanning ad copy, SMS blasts, and app store listings, with instant conversion-preserving rewrites and signed ARCON submission dossiers.',
      statute: 'ARCON Act 2022 § 54 / CBN CPF 2019',
      visual: (
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3 font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
            <span className="font-bold text-slate-800">Pre-Vetting Scanner</span>
            <span className="text-[10px] text-slate-500">PROMO CAMPAIGN</span>
          </div>
          <div className="p-2 bg-slate-50 rounded border border-slate-100 text-[11px] text-slate-700 italic">
            &ldquo;Can you approve the payday loan creatives? Need ASAP!&rdquo;
          </div>
          <div className="pt-1 flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              1 Issue Found
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700">REWRITE</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-white font-semibold">APPROVE</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section className="py-20 bg-slate-50/60 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header (00:41 in video: Built for compliance teams) */}
        <div className="max-w-3xl">
          <span className="font-mono text-xs text-slate-500 uppercase tracking-widest block mb-2">
            BUILT FOR COMPLIANCE TEAMS
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Engineered for Leaders Who Cannot Afford Statutory Surprises
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed">
            Trained on Nigerian financial services regulations, with full transparency, auditability, 
            and continuous supervisory oversight at every operational step.
          </p>
        </div>

        {/* 3 Customer Pain Cards Grid (Directly mirroring video layout) */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          {cards.map((card, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-xl p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-6 hover:border-slate-300 transition-colors"
            >
              {/* Card Top Visual Mockup */}
              <div className="p-4 rounded-lg bg-slate-50/70 border border-slate-200/80">
                {card.visual}
              </div>

              {/* Card Body */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
                    {card.tag}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    {card.title}
                  </h3>
                </div>

                {/* The Customer Pain */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span>The Status Quo Bottleneck:</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {card.problem}
                  </p>
                </div>

                {/* The Cogent Outcome */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>The Cogent Outcome:</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {card.outcome}
                  </p>
                </div>
              </div>

              {/* Card Footer with plain monospace citation */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-mono text-[11px] text-slate-500">
                  {card.statute}
                </span>
                <Link
                  href="/how-it-works"
                  className="font-semibold text-xs text-slate-900 hover:text-slate-700 inline-flex items-center gap-1"
                >
                  <span>Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
