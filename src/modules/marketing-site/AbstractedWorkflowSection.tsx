'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Eye, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';

interface TabItem {
  id: string;
  title: string;
  subtitle: string;
  code: string;
}

const tabs: TabItem[] = [
  {
    id: 'alerts',
    title: 'Horizon scanning alerts',
    subtitle: 'Monitor regulatory sources continuously and receive structured compliance alerts in real time.',
    code: 'STAGE_1_INGESTION',
  },
  {
    id: 'mapping',
    title: 'Impact & obligation mapping',
    subtitle: 'Assess regulatory impact and convert updates into structured obligations linked to policies, teams, and products.',
    code: 'STAGE_2_SYNTHESIS',
  },
  {
    id: 'controls',
    title: 'Policy & control management',
    subtitle: 'Update internal policies, map controls, manage owners, run approvals, and maintain an audit-ready trail.',
    code: 'STAGE_3_CONCORDANCE',
  },
];

export function AbstractedWorkflowSection() {
  const [activeTab, setActiveTab] = useState('alerts');

  return (
    <section className="py-20 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header (00:51 in video) */}
        <div className="max-w-3xl">
          <span className="font-mono text-xs text-slate-500 uppercase tracking-widest block mb-2">
            SUPERVISORY GOVERNANCE
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Centralise Regulatory Change Management
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed">
            Turn regulatory updates into structured actions — mapped to policies, owners, controls, approvals, 
            and evidence trails in one unified system.
          </p>
        </div>

        {/* 3 Interactive Highlight Strips (00:51 in video) */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`text-left p-6 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-slate-50/80 border-slate-900 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    {tab.code}
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isActive ? 'bg-slate-900' : 'bg-slate-200'
                    }`}
                  />
                </div>
                <h3 className="mt-4 text-sm font-bold text-slate-900 tracking-tight">
                  {tab.title}
                </h3>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  {tab.subtitle}
                </p>
              </button>
            );
          })}
        </div>

        {/* Abstracted Mock UI Workflow Console (01:02 - 01:25 in video) */}
        <div className="mt-10 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          {/* Top Bar */}
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-900 tracking-tight">
                COGENT
              </span>
              <span className="text-slate-300">/</span>
              <span className="font-mono text-slate-600 text-xs">
                Alerts &amp; Supervisory Obligations
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Actionable
              </span>
            </div>
            <div className="font-mono text-slate-500 hidden sm:block text-xs">
              Last ingested 2 mins ago
            </div>
          </div>

          {/* Console Content Area */}
          <div className="p-6 sm:p-8 space-y-6">
            {activeTab === 'alerts' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 pb-6 border-b border-slate-100">
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-slate-500">CBN/BSD/DIR/2026/04</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-[11px] text-slate-600 font-medium">Guidance Note</span>
                    </div>
                    <h4 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                      Consolidated Anti-Money Laundering &amp; Terrorism Prevention Regulatory Guidelines 2026
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Statutory standard issued by the Central Bank of Nigeria updating customer due diligence, beneficial 
                      ownership thresholds, and mandatory electronic transaction reporting timelines for commercial and microfinance banks.
                    </p>
                  </div>

                  <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="space-y-1 text-right sm:pr-4 sm:border-r border-slate-200 text-xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned CCO</span>
                      <span className="font-medium text-slate-800">Sarah O. (Head of Compliance)</span>
                    </div>
                    <Link
                      href="/sign-up"
                      className="inline-flex items-center justify-center gap-1.5 bg-[#2A4BFF] hover:bg-[#1E3AE5] text-white rounded-lg font-medium text-xs px-4 py-2.5 transition-colors shadow-xs"
                    >
                      <span>Extract Obligations</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Structured Obligations List */}
                <div className="space-y-3 font-mono text-xs">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Character-Span Decomposed Statutory Directives:
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50/70 border border-slate-200 rounded flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-900 block text-[11px]">
                          Section 4.1 · Beneficial Ownership Registry
                        </span>
                        <span className="text-slate-500 text-[10px] block mt-0.5 leading-snug">
                          Mandatory identification of all individual owners holding &gt; 5% equity or voting control.
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50/70 border border-slate-200 rounded flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-900 block text-[11px]">
                          Section 8.3 · Real-Time PEP Screening
                        </span>
                        <span className="text-slate-500 text-[10px] block mt-0.5 leading-snug">
                          Automated API sanctions check before account tier escalation above ₦5,000,000 balance.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'mapping' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <span className="font-mono text-xs text-slate-500">OBLIGATIONS LIBRARY · GAP MAPPING</span>
                    <h4 className="text-base font-bold text-slate-900">
                      Cross-Functional Impact &amp; Departmental Directives
                    </h4>
                  </div>
                  <span className="font-mono text-xs text-slate-600">4 ExCo Briefs Dispatched</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
                      Chief Compliance Officer
                    </span>
                    <p className="text-xs text-slate-600 leading-snug">
                      Update internal AML manual with beneficial ownership registry definitions within 14 days.
                    </p>
                    <span className="font-mono text-[10px] text-slate-500 block pt-1">DEADLINE: 14 DAYS</span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
                      Chief Operating Officer
                    </span>
                    <p className="text-xs text-slate-600 leading-snug">
                      Adjust frontline branch teller onboarding flows to collect tier-3 proof of residence.
                    </p>
                    <span className="font-mono text-[10px] text-slate-500 block pt-1">DEADLINE: 21 DAYS</span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
                      Chief Technology Officer
                    </span>
                    <p className="text-xs text-slate-600 leading-snug">
                      Implement webhook telemetry logging for all transactions flagged by NFIU rule engine.
                    </p>
                    <span className="font-mono text-[10px] text-slate-500 block pt-1">DEADLINE: 7 DAYS</span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
                      Chief Financial Officer
                    </span>
                    <p className="text-xs text-slate-600 leading-snug">
                      Reserve statutory capital allocation for potential cross-border liquidity reporting buffers.
                    </p>
                    <span className="font-mono text-[10px] text-slate-500 block pt-1">DEADLINE: 30 DAYS</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'controls' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <span className="font-mono text-xs text-slate-500">INTERNAL POLICIES · ACTIVE VERSION 3.2</span>
                    <h4 className="text-base font-bold text-slate-900">
                      Institutional AML &amp; Anti-Fraud Governance Policy
                    </h4>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 text-slate-800 text-xs font-mono font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Sent for CCO Approval</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between text-[11px] pb-2 border-b border-slate-200">
                    <span className="text-slate-600">Clause 14.2 · Pre-Cleared Remediation Insert</span>
                    <span className="text-slate-500">AUDIT ANCHOR: BOFIA_2020_SEC_5.2</span>
                  </div>
                  <p className="text-slate-800 text-[11px] leading-relaxed italic bg-white p-3 rounded border border-slate-200">
                    &ldquo;The institution shall maintain an unbroken, real-time cryptographic audit trail of all high-value 
                    transfers exceeding ₦10,000,000, validating recipient identity against the Central Bank of Nigeria 
                    and NFIU designated watchlists prior to settlement execution.&rdquo;
                  </p>
                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
                    <span>Approver: Sarah O. (CCO)</span>
                    <span className="text-emerald-700 font-bold">100% STATUTORY CONCORDANCE ACHIEVED</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
