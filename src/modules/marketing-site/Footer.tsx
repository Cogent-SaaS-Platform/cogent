'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Lock, Award } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-[#000000] text-white pt-24 pb-12 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Component: The Closing CTA Slogan (Matching dfj.JPG) */}
        <div className="text-center pb-20 border-b border-[#1A1F2C]">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-tight">
            Transforming compliance with sovereign intelligence
          </h2>
        </div>

        {/* Middle Component: Multi-Column Footer Grid (Matching dfj.JPG) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 py-16 border-b border-[#1A1F2C]">
          {/* Column 1: Brand Info (Left-aligned, ~35% width) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Horizontal row of 3 small circular compliance badges (Matching dfj.JPG) */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full border border-slate-800 bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-[9px] font-bold shadow-xs">
                NDPA
              </div>
              <div className="w-8 h-8 rounded-full border border-slate-800 bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-[9px] font-bold shadow-xs">
                BOFIA
              </div>
              <div className="w-8 h-8 rounded-full border border-slate-800 bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-[9px] font-bold shadow-xs">
                ARCON
              </div>
            </div>

            {/* Crisp White Bold Logo: lowercase 'cogent' */}
            <Link href="/" className="inline-block">
              <span className="font-extrabold text-2xl tracking-tight text-white lowercase">
                cogent
              </span>
            </Link>

            {/* Short Low-Contrast Grey Descriptor */}
            <p className="text-xs text-[#9CA3AF] leading-relaxed max-w-xs">
              The sovereign compliance operating system for Nigerian Commercial Banks, MFBs, and FinTechs.
            </p>

            <div className="pt-2 font-mono text-[11px] text-slate-500">
              <span className="text-slate-300">Statutory Jurisdictions:</span> BOFIA 2020 §65 · ARCON 2022 §54 · NDPA 2023
            </div>
          </div>

          {/* Column 2: Company */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Company
            </h4>
            <ul className="space-y-3 text-xs text-[#9CA3AF]">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/insights" className="hover:text-white transition-colors">
                  Regulatory Insights
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Legal &amp; Governance
            </h4>
            <ul className="space-y-3 text-xs text-[#9CA3AF]">
              <li>
                <Link href="/about#privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/about#terms" className="hover:text-white transition-colors">
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link href="/about#cookie" className="hover:text-white transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="/about#dpa" className="hover:text-white transition-colors">
                  Data Protection Agreement (DPA)
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Locations */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Locations
            </h4>
            <ul className="space-y-3 text-xs text-[#9CA3AF]">
              <li>
                <span className="font-semibold text-white block">Lagos, Nigeria</span>
                <span className="text-[11px] text-slate-500">Victoria Island, Lagos State</span>
              </li>
              <li>
                <span className="font-semibold text-white block">Abuja, Nigeria</span>
                <span className="text-[11px] text-slate-500">Central Business District (CBD)</span>
              </li>
              <li>
                <span className="font-semibold text-white block">London, UK</span>
                <span className="text-[11px] text-slate-500">Advisory Bureau</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Component: Legal Sub-Footer Bar (Matching dfj.JPG) */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B7280]">
          <p>© Copyright 2026 | Cogent Regulatory Systems Inc. All rights reserved.</p>

          {/* Right: Minimalist Social Icons */}
          <div className="flex items-center gap-5">
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#9CA3AF] hover:text-white transition-colors font-mono text-xs font-semibold"
            >
              in
            </a>
            <a
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#9CA3AF] hover:text-white transition-colors font-mono text-xs font-semibold"
            >
              𝕏
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
