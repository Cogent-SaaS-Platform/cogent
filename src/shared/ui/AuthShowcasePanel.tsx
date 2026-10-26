'use client';

import React from 'react';
import { ShieldCheck, Building2, Eye, FileText, CheckCircle2 } from 'lucide-react';

export interface AuthShowcasePanelProps {
  title?: string;
  subtitle?: string;
  activeDotIndex?: number;
}

/**
 * Faithfully reproduces the right-hand panel of ui_ref/sign.JPG:
 * - Electric Cobalt background (#2A4BFF)
 * - Orbital glow backdrop
 * - 3 circular integration nodes (CBN, NDPC, ARCON)
 * - Branching SVG connector lines into a floating white application dashboard preview card
 * - Institutional headline & subtitle
 * - Bottom pagination indicator dots
 */
export function AuthShowcasePanel({
  title = 'Connect with every regulator.',
  subtitle = 'Everything you need in an easily customizable regulatory intelligence dashboard.',
  activeDotIndex = 0,
}: AuthShowcasePanelProps) {
  return (
    <div className="relative w-full h-full min-h-[640px] bg-gradient-to-br from-[#2A4BFF] via-[#1E3AE5] to-[#1228B0] flex flex-col justify-between p-8 lg:p-14 text-white overflow-hidden select-none">
      {/* Background ambient radial gradients matching sign.JPG */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-white/10 blur-[90px] pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-[#6C47FF]/30 blur-[80px] pointer-events-none" />

      {/* Top right subtle badge */}
      <div className="relative z-10 flex justify-end">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-white/90">
          <ShieldCheck className="w-3.5 h-3.5 text-white" />
          <span>Sovereign Enclave v1.2</span>
        </div>
      </div>

      {/* Central Visual Graphic matching sign.JPG */}
      <div className="relative z-10 flex items-center justify-center my-auto py-8">
        <div className="relative w-full max-w-[460px] flex items-center justify-between">
          {/* Subtle large circular background ring behind nodes */}
          <div className="absolute left-6 top-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-white/15 pointer-events-none" />
          <div className="absolute left-16 top-1/2 -translate-y-1/2 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />

          {/* 1. Left Column: 3 Circular Nodes (CBN, NDPC, ARCON) */}
          <div className="flex flex-col gap-6 relative z-10 pl-2">
            {/* Top Node: CBN */}
            <div className="w-14 h-14 rounded-full bg-white shadow-xl flex items-center justify-center p-2.5 transition-transform hover:scale-105 border-2 border-white/80">
              <div className="w-full h-full rounded-full bg-[#008751]/10 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-black tracking-tight text-[#008751] leading-none">
                  CBN
                </span>
                <span className="text-[7px] font-bold text-[#008751]/80">BANK</span>
              </div>
            </div>

            {/* Middle Node: NDPC */}
            <div className="w-14 h-14 rounded-full bg-white shadow-xl flex items-center justify-center p-2.5 transition-transform hover:scale-105 border-2 border-white/80 -ml-2">
              <div className="w-full h-full rounded-full bg-[#2A4BFF]/10 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-black tracking-tight text-[#2A4BFF] leading-none">
                  NDPC
                </span>
                <span className="text-[7px] font-bold text-[#2A4BFF]/80">DATA</span>
              </div>
            </div>

            {/* Bottom Node: ARCON */}
            <div className="w-14 h-14 rounded-full bg-white shadow-xl flex items-center justify-center p-2.5 transition-transform hover:scale-105 border-2 border-white/80">
              <div className="w-full h-full rounded-full bg-[#7C3AED]/10 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-black tracking-tight text-[#7C3AED] leading-none">
                  ARCON
                </span>
                <span className="text-[7px] font-bold text-[#7C3AED]/80">MEDIA</span>
              </div>
            </div>
          </div>

          {/* 2. SVG Branching Connector Curves linking nodes into the dashboard card */}
          <svg
            className="absolute left-[54px] top-1/2 -translate-y-1/2 w-[140px] h-[190px] pointer-events-none z-0"
            viewBox="0 0 140 190"
            fill="none"
          >
            {/* Top node curve */}
            <path
              d="M 12 35 C 70 35, 80 95, 138 95"
              stroke="rgba(255, 255, 255, 0.45)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Middle node horizontal line */}
            <path
              d="M 2 95 L 138 95"
              stroke="rgba(255, 255, 255, 0.65)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Bottom node curve */}
            <path
              d="M 12 155 C 70 155, 80 95, 138 95"
              stroke="rgba(255, 255, 255, 0.45)"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>

          {/* 3. Right Mockup: Floating Dashboard Application Card matching sign.JPG */}
          <div className="relative z-10 w-56 rounded-2xl bg-white shadow-2xl border border-white/80 p-4 text-[#0B0F1A] space-y-3 ml-auto animate-in fade-in zoom-in-95 duration-200">
            {/* macOS traffic light window controls */}
            <div className="flex items-center justify-between pb-1 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
              </div>
              <div className="w-12 h-1.5 rounded-full bg-[#E2E8F0]" />
            </div>

            {/* Header search bar pill */}
            <div className="w-full h-4 rounded-md bg-[#F1F5F9] flex items-center px-2">
              <div className="w-16 h-1.5 rounded-full bg-[#CBD5E1]" />
            </div>

            {/* List Rows with User Avatars & Text bars matching sign.JPG card */}
            <div className="space-y-2.5 pt-1">
              {/* Row 1 */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#6C47FF] text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                  FA
                </div>
                <div className="flex-1 space-y-1">
                  <div className="w-20 h-2 rounded-full bg-[#0B0F1A]/80" />
                  <div className="w-12 h-1.5 rounded-full bg-[#94A3B8]" />
                </div>
              </div>

              {/* Row 2 */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#2A4BFF] text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                  ID
                </div>
                <div className="flex-1 space-y-1">
                  <div className="w-16 h-2 rounded-full bg-[#0B0F1A]/80" />
                  <div className="w-10 h-1.5 rounded-full bg-[#94A3B8]" />
                </div>
              </div>

              {/* Row 3 */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#10B981] text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                  CO
                </div>
                <div className="flex-1 space-y-1">
                  <div className="w-22 h-2 rounded-full bg-[#0B0F1A]/80" />
                  <div className="w-14 h-1.5 rounded-full bg-[#94A3B8]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Text & Pagination Indicators matching sign.JPG */}
      <div className="relative z-10 text-center max-w-md mx-auto space-y-4">
        <h3 className="text-2xl font-bold tracking-tight text-white">{title}</h3>
        <p className="text-xs text-white/80 leading-relaxed max-w-sm mx-auto">{subtitle}</p>

        {/* 3 Pagination Dots */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <div
            className={`w-2 h-2 rounded-full transition-all ${
              activeDotIndex === 0 ? 'w-5 bg-white' : 'bg-white/40'
            }`}
          />
          <div
            className={`w-2 h-2 rounded-full transition-all ${
              activeDotIndex === 1 ? 'w-5 bg-white' : 'bg-white/40'
            }`}
          />
          <div
            className={`w-2 h-2 rounded-full transition-all ${
              activeDotIndex === 2 ? 'w-5 bg-white' : 'bg-white/40'
            }`}
          />
        </div>
      </div>
    </div>
  );
}
