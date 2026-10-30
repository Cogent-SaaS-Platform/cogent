'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar, Footer } from '@/modules/marketing-site';
import { ArrowRight, BookOpen, Clock, Tag, Search, Filter } from 'lucide-react';

interface InsightArticle {
  id: string;
  category: string;
  regulator: string;
  title: string;
  summary: string;
  statute: string;
  readTime: string;
  date: string;
  keyTakeaway: string;
}

const articles: InsightArticle[] = [
  {
    id: 'bofia-section-65',
    category: 'Banking Governance',
    regulator: 'CBN',
    title: 'BOFIA 2020 Section 65: Analysis of Daily Penalty Formulas & Officer Criminal Liability',
    summary:
      'A granular examination of how recent Central Bank enforcement actions interpret Section 65. Explains the shift from corporate-only fines to direct personal liability for Chief Compliance Officers, Managing Directors, and board members.',
    statute: 'BOFIA 2020 § 65.2',
    readTime: '6 min read',
    date: 'October 2026',
    keyTakeaway:
      'Failure to rectify circular non-compliance within 30 days triggers cumulative daily penalty multipliers and potential statutory disqualification.',
  },
  {
    id: 'arcon-ad-sanctions',
    category: 'Advertising Vetting',
    regulator: 'ARCON',
    title: 'The ARCON 2022 Advertising Code: The 7 Claims That Trigger Mandatory ASP Sanctions',
    summary:
      'Why using unqualified superlatives (e.g., "fastest loan in Nigeria"), omitted fee disclosures, or unvetted social media influencer posts exposes fintech balance sheets to ₦500k to ₦10M statutory fines.',
    statute: 'ARCON Act 2022 § 54',
    readTime: '5 min read',
    date: 'October 2026',
    keyTakeaway:
      'Pre-exposure clearance by the Advertising Standards Panel (ASP) is legally mandatory for all digital fintech promotions prior to public broadcast.',
  },
  {
    id: 'ndpa-data-localization',
    category: 'Data Protection',
    regulator: 'NDPC',
    title: 'NDPA 2023 Cross-Border Data Transfers: Sovereign Localization Rules for FinTechs',
    summary:
      'What engineering and compliance teams must verify when hosting customer KYC data on foreign hyperscalers (AWS/GCP). Outlines the legal requirements for Data Protection Impact Assessments (DPIAs) and adequate cross-border adequacy frameworks.',
    statute: 'NDPA 2023 Sections 24–39',
    readTime: '8 min read',
    date: 'October 2026',
    keyTakeaway:
      'Storing financial KYC without demonstrable sovereign encryption controls creates statutory breach liabilities up to ₦10,000,000 or 2% of annual turnover.',
  },
  {
    id: 'cbn-consumer-protection',
    category: 'Consumer Protection',
    regulator: 'CBN & FCCPC',
    title: 'CBN Consumer Protection Framework: Mandatory Truth in Lending & Fee Transparency',
    summary:
      'Detailed breakdown of disclosure requirements for digital lenders and microfinance banks. Covers mandatory Key Facts Statements (KFS), annualized percentage rate (APR) calculations, and prohibitions against aggressive debt recovery.',
    statute: 'CBN CPF 2019 / FCCPA 2018',
    readTime: '7 min read',
    date: 'October 2026',
    keyTakeaway:
      'Every loan offer must present total cost of credit in prominent bold type prior to customer disbursement.',
  },
  {
    id: 'nfiu-aml-telemetry',
    category: 'Financial Crime & AML',
    regulator: 'NFIU',
    title: 'NFIU AML/CFT Regulations: Suspicious Activity Telemetry & Real-Time PEP Protocols',
    summary:
      'Guidelines on electronic transaction monitoring thresholds, automated Politically Exposed Persons (PEP) watchlist screening, and mandatory 24-hour Suspicious Transaction Report (STR) filings.',
    statute: 'NFIU AML/CFT Regulations 2022',
    readTime: '9 min read',
    date: 'October 2026',
    keyTakeaway:
      'Financial institutions must maintain an unbroken 7-year audit trail of all transactions flagged by automated AML rule engines.',
  },
];

export default function InsightsPage() {
  const [selectedRegulator, setSelectedRegulator] = useState<string>('ALL');

  const filteredArticles =
    selectedRegulator === 'ALL'
      ? articles
      : articles.filter((a) => a.regulator.includes(selectedRegulator));

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
                  REGULATORY INTELLIGENCE · STATUTORY BRIEFS &amp; ENFORCEMENT
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                Authoritative Regulatory Analysis for Nigerian Compliance &amp; Legal Leaders
              </h1>

              <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                Granular statutory briefings, penalty calculations, and operational implications across 
                CBN, ARCON, NDPC, SEC, and NFIU supervisory frameworks.
              </p>
            </div>
          </div>
        </section>

        {/* Filter Bar & Articles Section */}
        <section className="py-16 bg-slate-50/50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-8 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Filter by Apex Regulator:
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {['ALL', 'CBN', 'ARCON', 'NDPC', 'NFIU'].map((reg) => (
                  <button
                    key={reg}
                    type="button"
                    onClick={() => setSelectedRegulator(reg)}
                    className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-colors ${
                      selectedRegulator === reg
                        ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {reg === 'ALL' ? 'All Authorities' : reg}
                  </button>
                ))}
              </div>
            </div>

            {/* Articles Grid */}
            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredArticles.map((article) => (
                <div
                  key={article.id}
                  className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-6 hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-xs font-semibold text-slate-500">
                        {article.regulator} · {article.category}
                      </span>
                      <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{article.readTime}</span>
                      </div>
                    </div>

                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-snug">
                      {article.title}
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {article.summary}
                    </p>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Core Statutory Takeaway:
                      </span>
                      <p className="font-medium text-slate-800 leading-relaxed">
                        {article.keyTakeaway}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-500 text-[11px]">
                      {article.statute}
                    </span>
                    <Link
                      href="/sign-up"
                      className="font-semibold text-slate-900 hover:text-slate-700 inline-flex items-center gap-1.5"
                    >
                      <span>Apply in Pilot</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <span className="font-mono text-xs text-emerald-400 uppercase tracking-widest block">
              CONTINUOUS SUPERVISORY COVERAGE
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Turn Statutory Intelligence into Automated Defense
            </h2>
            <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
              Don&apos;t just read about regulations. Deploy continuous deterministic evaluation and 5-W policy 
              concordance in your institution today.
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
