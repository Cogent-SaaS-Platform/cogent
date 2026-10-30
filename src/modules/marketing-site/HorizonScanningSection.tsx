'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BookOpen, FileText, Eye, AlertTriangle, ArrowRight, Globe, Layers, Zap } from 'lucide-react';

interface MenuFeature {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}

const menuItems: MenuFeature[] = [
  {
    id: 'source-coverage',
    title: 'Source coverage',
    desc: 'Continuous real-time scrapers across CBN, NDPC, ARCON, SEC, NFIU, and FCCPC official gazettes.',
    icon: <BookOpen className="w-4 h-4 text-slate-700" />,
  },
  {
    id: 'full-text-analysis',
    title: 'Full-text analysis',
    desc: 'Atomic character-span decomposition of dense circular legalese into structured, actionable obligations.',
    icon: <FileText className="w-4 h-4 text-slate-700" />,
  },
  {
    id: 'relevance-filtering',
    title: 'Relevance filtering',
    desc: 'Noise elimination isolating only the statutory requirements binding on your specific institutional license class.',
    icon: <Eye className="w-4 h-4 text-slate-700" />,
  },
  {
    id: 'risk-scoring',
    title: 'Risk scoring',
    desc: 'Automated calculation of potential fine exposure brackets under BOFIA 2020 §65 and ARCON 2022 §54.',
    icon: <AlertTriangle className="w-4 h-4 text-slate-700" />,
  },
];

const activeCirculars = [
  {
    code: 'CBN/BSD/DIR/2026/04',
    title: 'Consolidated AML-CFT & Due Diligence Directives',
    authority: 'CBN · Statutory Regulation',
    highlight: true,
  },
  {
    code: 'ARCON Code 2022 § 14.1',
    title: 'Mandatory Pre-Exposure ASP Advertising Vetting',
    authority: 'ARCON · Enforcement Order',
    highlight: true,
  },
  {
    code: 'NDPA 2023 § 24-39',
    title: 'Cross-Border Data Localization & DPIA Standards',
    authority: 'NDPC · Sovereign Mandate',
    highlight: true,
  },
  {
    code: 'BOFIA 2020 § 65.2',
    title: 'Officer Personal Liability & Daily Penalty Formula',
    authority: 'CBN · Sanctions Framework',
    highlight: true,
  },
  {
    code: 'NFIU Regulations 2022',
    title: 'Real-Time PEP Watchlist & High-Value Transfer Rules',
    authority: 'NFIU · Supervisory Telemetry',
    highlight: true,
  },
];

const ghostCirculars = [
  { title: 'CBN · Electronic Payment Service Guidelines', code: 'CBN / PSSP 2023' },
  { title: 'FCCPC · Digital Lending Regulatory Framework', code: 'FCCPA 2018 § 114' },
  { title: 'SEC · Rules on Digital Assets Custody & Offerings', code: 'ISA 2007 DIV4' },
  { title: 'CBN · Operational CyberSecurity Standards', code: 'CBN / BSD / 2022' },
  { title: 'NDPC · Guidance Notice on Breach Notifications', code: 'NDPA 2023 § 40' },
  { title: 'ARCON · Digital Media & Social Influencer Protocol', code: 'ARCON § 54.3' },
  { title: 'CBN · Consumer Protection Framework Disclosures', code: 'CBN / CPF / 2019' },
  { title: 'NFIU · Suspicious Transaction Reporting Rules', code: 'AML / STR / 2024' },
];

export function HorizonScanningSection() {
  const [selectedItem, setSelectedItem] = useState('source-coverage');

  return (
    <section className="py-20 md:py-28 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main 2-Column Split: 40% Left Column, 60% Right Column (Matching jora.JPG) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* LEFT COLUMN: ~40% width */}
          <div className="lg:col-span-5 space-y-6">
            {/* Subtle Eyebrow */}
            <div className="inline-flex items-center gap-1.5 text-xs text-[#2A4BFF] font-semibold tracking-wide">
              <span>✦</span>
              <span>Autonomous Horizon Surveillance</span>
            </div>

            {/* Feature Title */}
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Horizon scanning
            </h2>

            {/* Descriptive Paragraph */}
            <p className="text-sm text-slate-600 leading-relaxed max-w-lg">
              Monitor every regulator, circular, and gazette across the Nigerian financial ecosystem. 
              Cogent reads each official instrument in full, filters for statutory relevance, and surfaces 
              actionable obligations with complete traceability back to gazetted source.
            </p>

            {/* Vertical Menu Stack with fine dotted horizontal dividers (Matching jora.JPG) */}
            <div className="pt-2 space-y-0">
              {menuItems.map((item) => {
                const isActive = item.id === selectedItem;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedItem(item.id)}
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

            {/* Bottom Element: Isolated Primary CTA Link */}
            <div className="pt-4">
              <Link
                href="/how-it-works#regulatory-radar"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-900 shadow-2xs transition-colors"
              >
                <span>Explore horizon scanning</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </Link>
            </div>
          </div>

          {/* RIGHT COLUMN: ~60% width - Infinite Grid Effect Graphics Canvas (Matching jora.JPG) */}
          <div className="lg:col-span-7 bg-[#F7F7F9] border border-slate-200/90 rounded-2xl p-6 sm:p-8 relative overflow-hidden min-h-[500px]">
            {/* Subtle technical diagonal mesh pattern background */}
            <div
              className="absolute inset-0 opacity-40 pointer-events-none"
              style={{
                backgroundImage: `repeating-linear-gradient(45deg, #E5E7EB 0, #E5E7EB 1px, transparent 0, transparent 16px)`,
              }}
            />

            {/* Staggered 3-Column Floating Regulatory Grid */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {/* Column 1 */}
              <div className="space-y-3.5">
                {/* Ghost Card 1 */}
                <div className="p-3 rounded-lg border border-dashed border-slate-300/60 bg-white/30 text-slate-400 opacity-30 text-[10px] font-mono">
                  <div className="truncate font-semibold">{ghostCirculars[0].title}</div>
                  <div className="text-slate-400 mt-1">{ghostCirculars[0].code}</div>
                </div>

                {/* ACTIVE CARD 1: Crisp White with drop shadow */}
                <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-md space-y-1.5 transition-transform hover:-translate-y-0.5 font-mono">
                  <div className="text-[9px] uppercase tracking-wider text-[#2A4BFF] font-bold">
                    {activeCirculars[0].authority}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug font-sans">
                    {activeCirculars[0].title}
                  </h4>
                  <div className="text-[10px] text-slate-500">
                    {activeCirculars[0].code}
                  </div>
                </div>

                {/* Ghost Card 2 */}
                <div className="p-3 rounded-lg border border-dashed border-slate-300/60 bg-white/30 text-slate-400 opacity-25 text-[10px] font-mono">
                  <div className="truncate font-semibold">{ghostCirculars[1].title}</div>
                  <div className="text-slate-400 mt-1">{ghostCirculars[1].code}</div>
                </div>

                {/* ACTIVE CARD 2 */}
                <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-md space-y-1.5 transition-transform hover:-translate-y-0.5 font-mono">
                  <div className="text-[9px] uppercase tracking-wider text-rose-600 font-bold">
                    {activeCirculars[1].authority}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug font-sans">
                    {activeCirculars[1].title}
                  </h4>
                  <div className="text-[10px] text-slate-500">
                    {activeCirculars[1].code}
                  </div>
                </div>
              </div>

              {/* Column 2 */}
              <div className="space-y-3.5 pt-4 sm:pt-6">
                {/* ACTIVE CARD 3 */}
                <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-md space-y-1.5 transition-transform hover:-translate-y-0.5 font-mono">
                  <div className="text-[9px] uppercase tracking-wider text-emerald-600 font-bold">
                    {activeCirculars[2].authority}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug font-sans">
                    {activeCirculars[2].title}
                  </h4>
                  <div className="text-[10px] text-slate-500">
                    {activeCirculars[2].code}
                  </div>
                </div>

                {/* Ghost Card 3 */}
                <div className="p-3 rounded-lg border border-dashed border-slate-300/60 bg-white/30 text-slate-400 opacity-25 text-[10px] font-mono">
                  <div className="truncate font-semibold">{ghostCirculars[2].title}</div>
                  <div className="text-slate-400 mt-1">{ghostCirculars[2].code}</div>
                </div>

                {/* ACTIVE CARD 4 */}
                <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-md space-y-1.5 transition-transform hover:-translate-y-0.5 font-mono">
                  <div className="text-[9px] uppercase tracking-wider text-slate-900 font-bold">
                    {activeCirculars[3].authority}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug font-sans">
                    {activeCirculars[3].title}
                  </h4>
                  <div className="text-[10px] text-slate-500">
                    {activeCirculars[3].code}
                  </div>
                </div>

                {/* Ghost Card 4 */}
                <div className="p-3 rounded-lg border border-dashed border-slate-300/60 bg-white/30 text-slate-400 opacity-20 text-[10px] font-mono">
                  <div className="truncate font-semibold">{ghostCirculars[3].title}</div>
                  <div className="text-slate-400 mt-1">{ghostCirculars[3].code}</div>
                </div>
              </div>

              {/* Column 3 (Visible on desktop) */}
              <div className="space-y-3.5 hidden md:block">
                {/* Ghost Card 5 */}
                <div className="p-3 rounded-lg border border-dashed border-slate-300/60 bg-white/30 text-slate-400 opacity-25 text-[10px] font-mono">
                  <div className="truncate font-semibold">{ghostCirculars[4].title}</div>
                  <div className="text-slate-400 mt-1">{ghostCirculars[4].code}</div>
                </div>

                {/* ACTIVE CARD 5 */}
                <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-md space-y-1.5 transition-transform hover:-translate-y-0.5 font-mono">
                  <div className="text-[9px] uppercase tracking-wider text-indigo-600 font-bold">
                    {activeCirculars[4].authority}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug font-sans">
                    {activeCirculars[4].title}
                  </h4>
                  <div className="text-[10px] text-slate-500">
                    {activeCirculars[4].code}
                  </div>
                </div>

                {/* Ghost Card 6 */}
                <div className="p-3 rounded-lg border border-dashed border-slate-300/60 bg-white/30 text-slate-400 opacity-20 text-[10px] font-mono">
                  <div className="truncate font-semibold">{ghostCirculars[5].title}</div>
                  <div className="text-slate-400 mt-1">{ghostCirculars[5].code}</div>
                </div>

                {/* Ghost Card 7 */}
                <div className="p-3 rounded-lg border border-dashed border-slate-300/60 bg-white/30 text-slate-400 opacity-15 text-[10px] font-mono">
                  <div className="truncate font-semibold">{ghostCirculars[6].title}</div>
                  <div className="text-slate-400 mt-1">{ghostCirculars[6].code}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3-Column Sub-Grid Separated by Dotted Vertical Lines (Matching fs.JPG) */}
        <div className="mt-16 pt-12 border-t border-dotted border-slate-200 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-dotted divide-slate-200">
          <div className="pb-6 md:pb-0 md:pr-8 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Globe className="w-4 h-4 text-slate-700" />
              <span>Expanding into a new market</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              See the full statutory obligation landscape of a new regulatory category before you commit, 
              with every apex regulator and rulebook monitored from day one.
            </p>
          </div>

          <div className="py-6 md:py-0 md:px-8 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Layers className="w-4 h-4 text-slate-700" />
              <span>Multiple jurisdictions, one seat</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Track regulatory change across banking, consumer lending, data protection, and advertising 
              from a single cockpit, so one team can oversee complex obligations.
            </p>
          </div>

          <div className="pt-6 md:pt-0 md:pl-8 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Zap className="w-4 h-4 text-slate-700" />
              <span>Launching products in new markets</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Surface the statutory rules that apply to a new digital product line before public launch, 
              so compliance accelerates growth rather than delaying it.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
