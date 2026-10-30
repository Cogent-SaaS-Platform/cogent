'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BookOpen, GitBranch, CheckCircle2, ShieldCheck, Folder, ArrowRight, Check, Share2, History } from 'lucide-react';

interface MenuFeature {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}

const menuItems: MenuFeature[] = [
  {
    id: 'policy-control-library',
    title: 'Policy & control library',
    desc: 'Centralise AML manuals, credit SOPs, and governance frameworks into structured, searchable obligation chunks.',
    icon: <BookOpen className="w-4 h-4 text-slate-700" />,
  },
  {
    id: 'version-tracking',
    title: 'Version tracking & supersession',
    desc: 'Automated circular lineage tracking (AMENDS, REPLACES, REPEALS) ensuring obsolete clauses are flagged immediately.',
    icon: <GitBranch className="w-4 h-4 text-slate-700" />,
  },
  {
    id: 'review-approvals',
    title: 'Review & CCO approvals',
    desc: 'Structured approval workflows with pre-cleared remediation clauses for instant Chief Compliance Officer sign-off.',
    icon: <CheckCircle2 className="w-4 h-4 text-slate-700" />,
  },
  {
    id: 'audit-trail',
    title: 'Audit-ready evidence trail',
    desc: 'Cryptographic SHA-256 state proofs proving continuous institutional compliance for Central Bank examiners.',
    icon: <ShieldCheck className="w-4 h-4 text-slate-700" />,
  },
];

export function PolicyGovernanceSection() {
  const [activeTab, setActiveTab] = useState('policy-control-library');

  return (
    <section className="py-20 md:py-28 bg-white border-t border-dotted border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Balanced 2-Column Split: 40% Left Column, 60% Right Column (Matching adfs.JPG) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* LEFT COLUMN: ~40% width */}
          <div className="lg:col-span-5 space-y-6">
            {/* Subtle Eyebrow */}
            <div className="inline-flex items-center gap-1.5 text-xs text-[#2A4BFF] font-semibold tracking-wide">
              <span>✦</span>
              <span>Deterministic Policy Concordance</span>
            </div>

            {/* Header */}
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Policy governance
            </h2>

            {/* Description */}
            <p className="text-sm text-slate-600 leading-relaxed max-w-lg">
              Transform compliance policies with an autonomous system that centralises policy libraries, 
              maps regulatory obligations to internal controls, manages versions, automates reviews and approvals, 
              and delivers full audit-ready traceability across the policy lifecycle.
            </p>

            {/* Vertical Menu Stack with fine dotted dividers (Matching adfs.JPG) */}
            <div className="pt-2 space-y-0">
              {menuItems.map((item) => {
                const isActive = item.id === activeTab;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className="w-full text-left py-4 border-b border-dotted border-slate-200 transition-colors group flex items-start gap-3.5"
                  >
                    <div className="mt-0.5 p-1 rounded group-hover:bg-slate-100 transition-colors">
                      {item.icon}
                    </div>
                    <div className="space-y-1">
                      <div
                        className={`text-sm font-bold tracking-tight transition-colors ${
                          isActive ? 'text-slate-900 font-extrabold' : 'text-slate-700 group-hover:text-slate-900'
                        }`}
                      >
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-500 leading-relaxed">
                        {item.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Link */}
            <div className="pt-4">
              <Link
                href="/how-it-works#gap-matrix"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-900 shadow-2xs transition-colors"
              >
                <span>Explore policy concordance</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>
            </div>
          </div>

          {/* RIGHT COLUMN: ~60% width - Node-Based Process Flow Diagram (Matching adfs.JPG) */}
          <div className="lg:col-span-7 bg-[#F9F9FB] border border-slate-200/90 rounded-2xl p-6 sm:p-10 relative overflow-hidden min-h-[460px] flex items-center justify-center">
            {/* Subtle technical diagonal mesh pattern background */}
            <div
              className="absolute inset-0 opacity-40 pointer-events-none"
              style={{
                backgroundImage: `repeating-linear-gradient(45deg, #E5E7EB 0, #E5E7EB 1px, transparent 0, transparent 16px)`,
              }}
            />

            {/* Diagram Composition: Input Card (Left) -> Central Hub Node -> Output Pills (Right) */}
            <div className="relative z-10 w-full max-w-xl flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-4">
              {/* 1. INPUT NODE (Left): Crisp White Floating Document Card */}
              <div className="w-full sm:w-[220px] bg-white border border-slate-200 rounded-xl p-4 shadow-md space-y-3 font-sans shrink-0">
                <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100">
                  <span className="text-[#2A4BFF] font-serif">✦</span>
                  <span>EVALUATE POLICY</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                  Internal AML &amp; Risk Policy
                </h4>

                {/* Abstract wireframe lines */}
                <div className="space-y-1.5 pt-1">
                  <div className="h-1.5 w-full bg-slate-200 rounded-full" />
                  <div className="h-1.5 w-5/6 bg-slate-200 rounded-full" />
                  <div className="h-1.5 w-4/5 bg-slate-200 rounded-full" />
                  <div className="h-2 w-full bg-slate-800 rounded-full shadow-2xs" />
                </div>

                <div className="pt-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 text-white font-mono text-[9px] font-bold tracking-wider shadow-2xs">
                    <span>✦</span>
                    <span>+ REMEDIATION</span>
                  </span>
                </div>
              </div>

              {/* 2. CENTRAL HUB NODE (Center): Floating Black Folder in White Circular Badge */}
              <div className="relative flex items-center justify-center shrink-0">
                {/* Curved SVG Anchor Lines branching to right pills */}
                <svg
                  className="hidden sm:block absolute left-8 top-1/2 -translate-y-1/2 w-28 h-40 pointer-events-none text-slate-300"
                  fill="none"
                  viewBox="0 0 112 160"
                >
                  {/* Top branch to Pill 1 */}
                  <path d="M 10 80 C 40 80, 50 25, 110 25" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                  {/* Middle branch to Pill 2 */}
                  <path d="M 10 80 C 50 80, 60 80, 110 80" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                  {/* Bottom branch to Pill 3 */}
                  <path d="M 10 80 C 40 80, 50 135, 110 135" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                </svg>

                <div className="w-14 h-14 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center relative z-20">
                  <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white shadow-2xs">
                    <Folder className="w-4 h-4 fill-white" />
                  </div>
                </div>
              </div>

              {/* 3. OUTPUT NODES (Right): Vertical Stack of 3 Pill-Shaped White Cards */}
              <div className="w-full sm:w-[190px] space-y-3 shrink-0">
                {/* Pill 1 */}
                <div className="bg-white border border-slate-200 rounded-full px-3.5 py-2.5 shadow-sm flex items-center gap-2.5 text-xs font-semibold text-slate-800 transition-transform hover:translate-x-1">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span className="text-[11px] font-sans truncate">Manage CCO approvals</span>
                </div>

                {/* Pill 2 */}
                <div className="bg-white border border-slate-200 rounded-full px-3.5 py-2.5 shadow-sm flex items-center gap-2.5 text-xs font-semibold text-slate-800 transition-transform hover:translate-x-1">
                  <div className="w-4 h-4 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0">
                    <Share2 className="w-2.5 h-2.5" />
                  </div>
                  <span className="text-[11px] font-sans truncate">Sync with repository</span>
                </div>

                {/* Pill 3 */}
                <div className="bg-white border border-slate-200 rounded-full px-3.5 py-2.5 shadow-sm flex items-center gap-2.5 text-xs font-semibold text-slate-800 transition-transform hover:translate-x-1">
                  <div className="w-4 h-4 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0">
                    <History className="w-2.5 h-2.5" />
                  </div>
                  <span className="text-[11px] font-sans truncate">Version lineage control</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
