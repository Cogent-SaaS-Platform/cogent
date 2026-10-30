'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ShieldCheck, Scale, FileText } from 'lucide-react';

type InputSource = 'ALL' | 'CBN' | 'NDPC' | 'ARCON';

interface SourceDetail {
  id: InputSource;
  acronym: string;
  subLabel: string;
  sourceColor: string;
  badgeCode: string;
  badgeBg: string;
  statute: string;
  inputDescription: string;
  outputTitle: string;
  outputMetric: string;
  fullStatute: string;
}

const sources: Record<'CBN' | 'NDPC' | 'ARCON', SourceDetail> = {
  CBN: {
    id: 'CBN',
    acronym: 'CBN',
    subLabel: 'BANK',
    sourceColor: '#059669', // Emerald Green
    badgeCode: 'FA',
    badgeBg: '#8B5CF6', // Purple
    statute: 'BOFIA 2020 § 65.2',
    inputDescription: 'Operational Circulars & AML/CFT Sanctions Guideline',
    outputTitle: 'Financial Allocation & Balance-Sheet Protection',
    outputMetric: '₦15,000,000 Daily Penalty Risk Neutralized',
    fullStatute: 'BOFIA 2020 § 65.2 · Capital Reserve Formula Locked',
  },
  NDPC: {
    id: 'NDPC',
    acronym: 'NDPC',
    subLabel: 'DATA',
    sourceColor: '#2563EB', // Vibrant Blue
    badgeCode: 'ID',
    badgeBg: '#2563EB', // Blue
    statute: 'NDPA 2023 § 24',
    inputDescription: 'Cross-Border Consumer Telemetry & Privacy Directives',
    outputTitle: 'Identity & Data Sovereignty Enclave Concordance',
    outputMetric: 'Zero High-Risk Telemetry Leaks · DPIA Verified',
    fullStatute: 'NDPA 2023 § 24 · Sovereign Local Storage Verified',
  },
  ARCON: {
    id: 'ARCON',
    acronym: 'ARCON',
    subLabel: 'MEDIA',
    sourceColor: '#8B5CF6', // Purple
    badgeCode: 'CO',
    badgeBg: '#10B981', // Emerald Green
    statute: 'ARCON Act 2022 § 54',
    inputDescription: 'Advertising Code & Prohibited Terminology Directives',
    outputTitle: 'Compliant Output & Pre-Clearance Vetting Dossier',
    outputMetric: 'Sub-50ms Scans · Pre-Cleared ASP Certificate',
    fullStatute: 'ARCON Act § 54 · ₦10,000,000 Exposure Neutralized',
  },
};

const sequence: InputSource[] = ['CBN', 'NDPC', 'ARCON', 'ALL'];

export function Hero() {
  const [activeSource, setActiveSource] = useState<InputSource>('CBN');
  const [isPaused, setIsPaused] = useState(false);

  // Auto-advance loop every 3600ms unless hovered
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveSource((prev) => {
        const nextIdx = (sequence.indexOf(prev) + 1) % sequence.length;
        return sequence[nextIdx];
      });
    }, 3600);
    return () => clearInterval(timer);
  }, [isPaused]);

  const isAll = activeSource === 'ALL';
  const currentDetail = !isAll ? sources[activeSource] : null;

  return (
    <section className="relative pt-8 pb-16 md:pt-12 md:pb-20 bg-white overflow-hidden border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Announcement Eyebrow */}
        <div className="flex justify-center mb-8">
          <Link
            href="/insights"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-200/90 text-xs text-slate-700 hover:border-slate-300 transition-colors shadow-2xs group"
          >
            <span className="text-[#2A4BFF] font-serif text-sm">✦</span>
            <span className="font-medium text-slate-900">
              Sovereign Supervisory Intelligence:
            </span>
            <span className="text-slate-500 hidden sm:inline">
              Protecting Institutional Balance Sheets under BOFIA 2020 &amp; ARCON 2022.
            </span>
            <span className="text-[#2A4BFF] group-hover:translate-x-0.5 transition-transform font-medium">
              View brief →
            </span>
          </Link>
        </div>

        {/* Unified Two-Column Hero Grid (Parallel layout on Desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* LEFT COLUMN: ~50% width on desktop, containing H1, copy, CTA pair, and trust strip */}
          <div className="lg:col-span-6 space-y-7">
            {/* H1 Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-extrabold text-slate-900 tracking-tight leading-[1.12]">
              Automated Supervisory Compliance &amp; Marketing Defense Built for Nigerian Financial Institutions.
            </h1>

            {/* Subtitle / Body Copy */}
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
              Catch midnight circulars across CBN, NDPC, and ARCON before dawn. Pre-vet promotional ad copy in milliseconds, monitor live pages for copy drift, and keep your internal policies continuously audit-ready for Central Bank routine examinations.
            </p>

            {/* CTA Button Pair & Subtext */}
            <div className="space-y-2 pt-1">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/how-it-works"
                  className="inline-flex items-center justify-center bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 rounded-lg font-semibold text-xs px-5 py-3 transition-colors shadow-2xs"
                >
                  <span>How it works</span>
                </Link>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center gap-1.5 bg-[#2A4BFF] hover:bg-[#1E3AE5] text-white rounded-lg font-semibold text-xs px-5 py-3 shadow-xs transition-colors"
                >
                  <span>Start 7-Day Institutional Pilot</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Instant Workspace Provisioning · Google OAuth Enabled · Zero Procurement Gate</span>
              </div>
            </div>

            {/* Trusted By / Institutional Strip under left column */}
            <div className="pt-8 border-t border-slate-100 space-y-3">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Supervisory Telemetry &amp; Coverage:
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-center text-xs font-mono text-slate-700">
                <div className="p-2 rounded bg-slate-50 border border-slate-200/80 font-bold">
                  CBN
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-200/80 font-bold">
                  ARCON
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-200/80 font-bold">
                  NDPC
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-200/80 font-bold">
                  SEC / NFIU
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Abstract Data Aggregation UI Illustration on Solid Royal-to-Cobalt Blue Canvas (Matching sa.png) */}
          <div
            className="lg:col-span-6 relative flex flex-col items-center justify-center"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* The Canvas Box: High-Vibrancy Solid Royal-to-Cobalt Blue Container */}
            <div className="w-full max-w-[620px] rounded-3xl bg-gradient-to-br from-[#2447F9] via-[#1E3FE5] to-[#122CB2] p-4 sm:p-7 shadow-[0_25px_60px_-15px_rgba(20,40,160,0.45)] border border-blue-400/30 relative overflow-hidden select-none">
              
              {/* Subtle Ambient Background Depth Glows */}
              <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-300/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-indigo-500/25 rounded-full blur-3xl pointer-events-none" />

              {/* Master SVG Multi-Source Input Node Workflow Graphic */}
              <div className="relative w-full aspect-[600/400]">
                <svg
                  viewBox="0 0 600 400"
                  className="w-full h-full overflow-visible"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    {/* Shadow for the central white browser aggregation card */}
                    <filter id="dashCardShadow" x="-10%" y="-10%" width="125%" height="125%">
                      <feDropShadow dx="0" dy="16" stdDeviation="18" floodColor="#0A1654" floodOpacity="0.35" />
                      <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0A1654" floodOpacity="0.15" />
                    </filter>

                    {/* Subtle outer glow for circular nodes */}
                    <filter id="nodeCircleGlow" x="-25%" y="-25%" width="150%" height="150%">
                      <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#081448" floodOpacity="0.25" />
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#081448" floodOpacity="0.12" />
                    </filter>

                    {/* Linear gradient for high-speed packet pulses */}
                    <linearGradient id="packetGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
                    </linearGradient>
                  </defs>

                  {/* 1. AESTHETIC RING DETAIL: Faint concentric geometric wireframe circle passing behind paths */}
                  <circle
                    cx="195"
                    cy="200"
                    r="120"
                    stroke="rgba(255, 255, 255, 0.16)"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                  />
                  <circle
                    cx="195"
                    cy="200"
                    r="155"
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="1"
                  />

                  {/* 2. CENTER: THE CONVERGENCE PATHS (Funnel Vector Lines) */}
                  {/* Top Path: S-Curve from CBN (112, 95) down to Apex (218, 200) */}
                  <path
                    d="M 112 95 C 160 95, 175 200, 218 200"
                    stroke={
                      activeSource === 'CBN' || isAll
                        ? '#34D399'
                        : 'rgba(180, 208, 255, 0.45)'
                    }
                    strokeWidth={activeSource === 'CBN' ? 3.5 : 2.5}
                    strokeLinecap="round"
                    className="transition-colors duration-500"
                  />

                  {/* Middle Path: Straight Line from NDPC (112, 200) to Apex (218, 200) */}
                  <path
                    d="M 112 200 L 218 200"
                    stroke={
                      activeSource === 'NDPC' || isAll
                        ? '#60A5FA'
                        : 'rgba(180, 208, 255, 0.45)'
                    }
                    strokeWidth={activeSource === 'NDPC' ? 3.5 : 2.5}
                    strokeLinecap="round"
                    className="transition-colors duration-500"
                  />

                  {/* Bottom Path: S-Curve from ARCON (112, 305) up to Apex (218, 200) */}
                  <path
                    d="M 112 305 C 160 305, 175 200, 218 200"
                    stroke={
                      activeSource === 'ARCON' || isAll
                        ? '#C084FC'
                        : 'rgba(180, 208, 255, 0.45)'
                    }
                    strokeWidth={activeSource === 'ARCON' ? 3.5 : 2.5}
                    strokeLinecap="round"
                    className="transition-colors duration-500"
                  />

                  {/* The Entry Anchor: From Apex (218, 200) into Dashboard Left Edge (260, 200) */}
                  <path
                    d="M 218 200 L 260 200"
                    stroke={isAll ? '#FFFFFF' : 'rgba(215, 230, 255, 0.75)'}
                    strokeWidth={isAll ? 3.5 : 2.8}
                    strokeLinecap="round"
                    className="transition-colors duration-300"
                  />

                  {/* 3. CONTINUOUS FLOWING ANIMATION: Animated Telemetry Packets Traversing the Funnel */}
                  {/* Top Flowing Dot (CBN) */}
                  <circle r="3.5" fill="#FFFFFF" filter="drop-shadow(0 0 4px #34D399)">
                    <animateMotion
                      dur="2.2s"
                      repeatCount="indefinite"
                      path="M 112 95 C 160 95, 175 200, 218 200"
                    />
                  </circle>

                  {/* Middle Flowing Dot (NDPC) */}
                  <circle r="3.5" fill="#FFFFFF" filter="drop-shadow(0 0 4px #60A5FA)">
                    <animateMotion
                      dur="1.7s"
                      repeatCount="indefinite"
                      path="M 112 200 L 218 200"
                    />
                  </circle>

                  {/* Bottom Flowing Dot (ARCON) */}
                  <circle r="3.5" fill="#FFFFFF" filter="drop-shadow(0 0 4px #C084FC)">
                    <animateMotion
                      dur="2.2s"
                      repeatCount="indefinite"
                      path="M 112 305 C 160 305, 175 200, 218 200"
                    />
                  </circle>

                  {/* Unified Stem Flowing Dot (Apex to Dashboard) */}
                  <circle r="4" fill="#FFFFFF" filter="drop-shadow(0 0 6px #FFFFFF)">
                    <animateMotion
                      dur="0.9s"
                      repeatCount="indefinite"
                      path="M 218 200 L 260 200"
                    />
                  </circle>

                  {/* Convergence Apex Anchor Pulse Dot */}
                  <circle cx="218" cy="200" r="4.5" fill="#FFFFFF" />
                  <circle
                    cx="218"
                    cy="200"
                    r="8"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.7)"
                    strokeWidth="1.5"
                    className="animate-ping"
                    style={{ transformOrigin: '218px 200px' }}
                  />

                  {/* 4. LEFT SIDE: THE INPUT NODES (Vertical Stack of Three Circular Badges) */}
                  
                  {/* NODE 1: CBN (BANK) */}
                  <g
                    className="cursor-pointer group"
                    onClick={() => setActiveSource('CBN')}
                  >
                    {/* Active Halo ring */}
                    {(activeSource === 'CBN' || isAll) && (
                      <circle
                        cx="80"
                        cy="95"
                        r="36"
                        fill="none"
                        stroke="#34D399"
                        strokeWidth="2"
                        className="animate-pulse"
                      />
                    )}
                    {/* Crisp White Fill Circle */}
                    <circle
                      cx="80"
                      cy="95"
                      r="31"
                      fill="#FFFFFF"
                      filter="url(#nodeCircleGlow)"
                      className="transition-transform duration-200 group-hover:scale-105"
                      style={{ transformOrigin: '80px 95px' }}
                    />
                    {/* Primary Acronym: CBN */}
                    <text
                      x="80"
                      y="91"
                      textAnchor="middle"
                      fill="#059669"
                      fontSize="12.5"
                      fontWeight="800"
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      CBN
                    </text>
                    {/* Uppercase Grey Sub-label: BANK */}
                    <text
                      x="80"
                      y="105"
                      textAnchor="middle"
                      fill="#94A3B8"
                      fontSize="8"
                      fontWeight="700"
                      letterSpacing="0.08em"
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      BANK
                    </text>
                  </g>

                  {/* NODE 2: NDPC (DATA) */}
                  <g
                    className="cursor-pointer group"
                    onClick={() => setActiveSource('NDPC')}
                  >
                    {/* Active Halo ring */}
                    {(activeSource === 'NDPC' || isAll) && (
                      <circle
                        cx="80"
                        cy="200"
                        r="36"
                        fill="none"
                        stroke="#60A5FA"
                        strokeWidth="2"
                        className="animate-pulse"
                      />
                    )}
                    {/* Crisp White Fill Circle */}
                    <circle
                      cx="80"
                      cy="200"
                      r="31"
                      fill="#FFFFFF"
                      filter="url(#nodeCircleGlow)"
                      className="transition-transform duration-200 group-hover:scale-105"
                      style={{ transformOrigin: '80px 200px' }}
                    />
                    {/* Primary Acronym: NDPC */}
                    <text
                      x="80"
                      y="196"
                      textAnchor="middle"
                      fill="#2563EB"
                      fontSize="12.5"
                      fontWeight="800"
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      NDPC
                    </text>
                    {/* Uppercase Grey Sub-label: DATA */}
                    <text
                      x="80"
                      y="210"
                      textAnchor="middle"
                      fill="#94A3B8"
                      fontSize="8"
                      fontWeight="700"
                      letterSpacing="0.08em"
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      DATA
                    </text>
                  </g>

                  {/* NODE 3: ARCON (MEDIA) */}
                  <g
                    className="cursor-pointer group"
                    onClick={() => setActiveSource('ARCON')}
                  >
                    {/* Active Halo ring */}
                    {(activeSource === 'ARCON' || isAll) && (
                      <circle
                        cx="80"
                        cy="305"
                        r="36"
                        fill="none"
                        stroke="#C084FC"
                        strokeWidth="2"
                        className="animate-pulse"
                      />
                    )}
                    {/* Crisp White Fill Circle */}
                    <circle
                      cx="80"
                      cy="305"
                      r="31"
                      fill="#FFFFFF"
                      filter="url(#nodeCircleGlow)"
                      className="transition-transform duration-200 group-hover:scale-105"
                      style={{ transformOrigin: '80px 305px' }}
                    />
                    {/* Primary Acronym: ARCON */}
                    <text
                      x="80"
                      y="301"
                      textAnchor="middle"
                      fill="#8B5CF6"
                      fontSize="11.5"
                      fontWeight="800"
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      ARCON
                    </text>
                    {/* Uppercase Grey Sub-label: MEDIA */}
                    <text
                      x="80"
                      y="315"
                      textAnchor="middle"
                      fill="#94A3B8"
                      fontSize="8"
                      fontWeight="700"
                      letterSpacing="0.08em"
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      MEDIA
                    </text>
                  </g>

                  {/* 5. RIGHT SIDE: THE AGGREGATION DASHBOARD (Output Component) */}
                  {/* The Canvas Box: Horizontal Rectangular Container with Crisp White Fill & Rounded Corners */}
                  <g filter="url(#dashCardShadow)">
                    <rect
                      x="260"
                      cy="75"
                      y="75"
                      width="305"
                      height="250"
                      rx="20"
                      ry="20"
                      fill="#FFFFFF"
                    />

                    {/* Browser Chrome Elements */}
                    {/* Top Left Traffic Light Pills: Coral/Orange, Amber, Green */}
                    <circle cx="282" cy="98" r="4.5" fill="#F87171" />
                    <circle cx="296" cy="98" r="4.5" fill="#FBBF24" />
                    <circle cx="310" cy="98" r="4.5" fill="#34D399" />

                    {/* Top Right Header Search/Profile Placeholder */}
                    <rect
                      x="490"
                      y="93"
                      width="58"
                      height="10"
                      rx="5"
                      fill="#E2E8F0"
                    />

                    {/* Hero Row: Wide Rounded Status Pill */}
                    <rect
                      x="282"
                      y="118"
                      width="266"
                      height="17"
                      rx="8.5"
                      fill="#F1F5F9"
                    />
                    <text
                      x="292"
                      y="130"
                      fill="#64748B"
                      fontSize="8"
                      fontWeight="700"
                      letterSpacing="0.06em"
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      {activeSource === 'CBN'
                        ? 'OBLIGATION EXTRACTION · BOFIA § 65.2 ACTIVE'
                        : activeSource === 'NDPC'
                        ? 'SOVEREIGN DATA ENCLAVE · NDPA § 24 CONCORDANT'
                        : activeSource === 'ARCON'
                        ? 'PRE-VETTED ASP DOSSIER · ARCON § 54 VERIFIED'
                        : 'SUPERVISORY CASCADE · MULTI-SOURCE SYNCHRONIZED'}
                    </text>

                    {/* The Row-Item Stack: Three Identical Left-Aligned Horizontal Output Rows */}
                    
                    {/* ROW 1: Purple Circular Badge 'FA' (Financial & AML Shield) */}
                    <g
                      className="cursor-pointer"
                      onClick={() => setActiveSource('CBN')}
                    >
                      {/* Active Row Highlight background */}
                      {(activeSource === 'CBN' || isAll) && (
                        <rect
                          x="276"
                          y="148"
                          width="278"
                          height="44"
                          rx="10"
                          fill="#F8FAFC"
                          stroke="#E2E8F0"
                          strokeWidth="1"
                        />
                      )}
                      {/* Purple Circle Badge with White 'FA' */}
                      <circle cx="298" cy="170" r="13" fill="#8B5CF6" />
                      <text
                        x="298"
                        y="174"
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="9.5"
                        fontWeight="800"
                        fontFamily="system-ui, -apple-system, sans-serif"
                      >
                        FA
                      </text>
                      {/* Top Thick Dark-Charcoal Placeholder Block */}
                      <rect
                        x="320"
                        y="162"
                        width={activeSource === 'CBN' ? 140 : 125}
                        height="8.5"
                        rx="4.25"
                        fill={activeSource === 'CBN' ? '#0F172A' : '#1E293B'}
                        className="transition-all duration-300"
                      />
                      {/* Bottom Shorter Thinner Grey Placeholder Block */}
                      <rect
                        x="320"
                        y="174"
                        width={activeSource === 'CBN' ? 95 : 70}
                        height="6"
                        rx="3"
                        fill={activeSource === 'CBN' ? '#64748B' : '#94A3B8'}
                        className="transition-all duration-300"
                      />
                      {/* Active Status Tag */}
                      {activeSource === 'CBN' && (
                        <text
                          x="542"
                          y="173"
                          textAnchor="end"
                          fill="#059669"
                          fontSize="7.5"
                          fontWeight="700"
                          fontFamily="monospace"
                        >
                          ₦15M INSULATED
                        </text>
                      )}
                    </g>

                    {/* ROW 2: Blue Circular Badge 'ID' (Identity & Privacy Defense) */}
                    <g
                      className="cursor-pointer"
                      onClick={() => setActiveSource('NDPC')}
                    >
                      {/* Active Row Highlight background */}
                      {(activeSource === 'NDPC' || isAll) && (
                        <rect
                          x="276"
                          y="198"
                          width="278"
                          height="44"
                          rx="10"
                          fill="#F8FAFC"
                          stroke="#E2E8F0"
                          strokeWidth="1"
                        />
                      )}
                      {/* Blue Circle Badge with White 'ID' */}
                      <circle cx="298" cy="220" r="13" fill="#2563EB" />
                      <text
                        x="298"
                        y="224"
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="9.5"
                        fontWeight="800"
                        fontFamily="system-ui, -apple-system, sans-serif"
                      >
                        ID
                      </text>
                      {/* Top Thick Dark-Charcoal Placeholder Block */}
                      <rect
                        x="320"
                        y="212"
                        width={activeSource === 'NDPC' ? 130 : 105}
                        height="8.5"
                        rx="4.25"
                        fill={activeSource === 'NDPC' ? '#0F172A' : '#1E293B'}
                        className="transition-all duration-300"
                      />
                      {/* Bottom Shorter Thinner Grey Placeholder Block */}
                      <rect
                        x="320"
                        y="224"
                        width={activeSource === 'NDPC' ? 85 : 55}
                        height="6"
                        rx="3"
                        fill={activeSource === 'NDPC' ? '#64748B' : '#94A3B8'}
                        className="transition-all duration-300"
                      />
                      {/* Active Status Tag */}
                      {activeSource === 'NDPC' && (
                        <text
                          x="542"
                          y="223"
                          textAnchor="end"
                          fill="#2563EB"
                          fontSize="7.5"
                          fontWeight="700"
                          fontFamily="monospace"
                        >
                          DPIA VERIFIED
                        </text>
                      )}
                    </g>

                    {/* ROW 3: Green Circular Badge 'CO' (Compliant Output / ARCON Pre-Clearance) */}
                    <g
                      className="cursor-pointer"
                      onClick={() => setActiveSource('ARCON')}
                    >
                      {/* Active Row Highlight background */}
                      {(activeSource === 'ARCON' || isAll) && (
                        <rect
                          x="276"
                          y="248"
                          width="278"
                          height="44"
                          rx="10"
                          fill="#F8FAFC"
                          stroke="#E2E8F0"
                          strokeWidth="1"
                        />
                      )}
                      {/* Green Circle Badge with White 'CO' */}
                      <circle cx="298" cy="270" r="13" fill="#10B981" />
                      <text
                        x="298"
                        y="274"
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="9.5"
                        fontWeight="800"
                        fontFamily="system-ui, -apple-system, sans-serif"
                      >
                        CO
                      </text>
                      {/* Top Thick Dark-Charcoal Placeholder Block */}
                      <rect
                        x="320"
                        y="262"
                        width={activeSource === 'ARCON' ? 150 : 135}
                        height="8.5"
                        rx="4.25"
                        fill={activeSource === 'ARCON' ? '#0F172A' : '#1E293B'}
                        className="transition-all duration-300"
                      />
                      {/* Bottom Shorter Thinner Grey Placeholder Block */}
                      <rect
                        x="320"
                        y="274"
                        width={activeSource === 'ARCON' ? 100 : 75}
                        height="6"
                        rx="3"
                        fill={activeSource === 'ARCON' ? '#64748B' : '#94A3B8'}
                        className="transition-all duration-300"
                      />
                      {/* Active Status Tag */}
                      {activeSource === 'ARCON' && (
                        <text
                          x="542"
                          y="273"
                          textAnchor="end"
                          fill="#8B5CF6"
                          fontSize="7.5"
                          fontWeight="700"
                          fontFamily="monospace"
                        >
                          PRE-CLEARED
                        </text>
                      )}
                    </g>
                  </g>
                </svg>
              </div>

              {/* Bottom Interactive Workflow Ticker: Explains exactly how inputs funnel into outputs */}
              <div className="mt-4 pt-3.5 border-t border-blue-400/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-white">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-mono tracking-wide text-blue-100">
                    {!isAll && currentDetail ? (
                      <>
                        <span className="font-bold text-white">{currentDetail.acronym}</span>
                        <span className="text-blue-300"> ({currentDetail.subLabel})</span>
                        <span className="text-white/60 mx-1">→</span>
                        <span className="text-white font-medium">{currentDetail.badgeCode} Row</span>
                        <span className="text-white/60 mx-1">:</span>
                        <span className="text-emerald-300 font-semibold">{currentDetail.outputMetric}</span>
                      </>
                    ) : (
                      <>
                        <span className="font-bold text-white">ALL APEX STREAMS</span>
                        <span className="text-white/60 mx-1">→</span>
                        <span className="text-emerald-300 font-semibold">Continuous Multi-Hop Compliance Cascade</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Stream Switcher Pills */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  {(['CBN', 'NDPC', 'ARCON', 'ALL'] as const).map((key) => {
                    const isSelected = activeSource === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActiveSource(key)}
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded transition-all ${
                          isSelected
                            ? 'bg-white text-[#1E3FE5] shadow-xs'
                            : 'bg-white/10 hover:bg-white/20 text-white/90'
                        }`}
                      >
                        {key}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Subtle Statutory Verification Micro-Text below graphic */}
            <div className="mt-3 flex items-center justify-between w-full max-w-[620px] px-1 text-[11px] text-slate-500 font-mono">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2A4BFF]" />
                <span>Deterministic S-Curve Vector Funnel</span>
              </span>
              <span>BOFIA · ARCON · NDPA CONCORDANCE</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

