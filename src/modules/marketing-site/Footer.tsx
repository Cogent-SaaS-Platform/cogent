import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-slate-200">
          {/* Brand & Mission Column */}
          <div className="md:col-span-2 space-y-4 max-w-md">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <Image
                src="/icon.png"
                alt="Cogent RegTech"
                width={24}
                height={24}
                className="w-6 h-6 rounded object-contain"
              />
              <span className="font-bold text-base tracking-tight text-slate-900">COGENT</span>
            </Link>

            <p className="text-xs text-slate-500 leading-relaxed">
              Autonomous regulatory intelligence and supervisory concordance operating system for Nigerian 
              Commercial Banks, MFBs, FinTechs, and Payment Switches. Engineered in compliance with 
              CAMA 2020, BOFIA 2020 Section 5.2, and NDPA 2023.
            </p>

            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Sovereign Enclave Operational · Multi-Regulator Telemetry Active
              </span>
            </div>
          </div>

          {/* Supervisory Cockpits Links */}
          <div className="space-y-3">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Supervisory Cockpits
            </span>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <a href="#capabilities" className="hover:text-slate-900 transition-colors">
                  Marketing Shield (Ad Pre-Vetting)
                </a>
              </li>
              <li>
                <a href="#capabilities" className="hover:text-slate-900 transition-colors">
                  Regulatory Radar (Circular Ingestion)
                </a>
              </li>
              <li>
                <a href="#capabilities" className="hover:text-slate-900 transition-colors">
                  5-W Policy Gap Matrix (Concordance)
                </a>
              </li>
              <li>
                <a href="#frameworks" className="hover:text-slate-900 transition-colors">
                  Statutory Obligations Register
                </a>
              </li>
            </ul>
          </div>

          {/* Platform & Account Links */}
          <div className="space-y-3">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Institutional Access
            </span>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <Link href="/sign-up" className="hover:text-slate-900 transition-colors font-medium">
                  Start 7-Day Pilot
                </Link>
              </li>
              <li>
                <Link href="/sign-in" className="hover:text-slate-900 transition-colors">
                  Client Portal Sign In
                </Link>
              </li>
              <li>
                <a href="#architecture" className="hover:text-slate-900 transition-colors">
                  Sovereign Enclave Security
                </a>
              </li>
              <li>
                <span className="font-mono text-xs text-slate-400 block pt-1">
                  DOMAIN: stem-cogent.com
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Micro-footer */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 Cogent Regulatory Systems. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="font-mono text-xs text-slate-500">
              BOFIA 2020 § 5.2 / NDPA 2023 / ARCON 2022
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
