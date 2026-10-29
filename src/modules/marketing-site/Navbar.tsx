import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-6">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <Image
              src="/icon.png"
              alt="Cogent RegTech"
              width={28}
              height={28}
              className="w-7 h-7 rounded-md object-contain group-hover:scale-105 transition-transform"
              priority
            />
            <span className="font-bold text-lg tracking-tight text-slate-900">COGENT</span>
          </Link>

          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-600 border-l border-slate-200 pl-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Sovereign RegTech Platform
          </span>
        </div>

        {/* Section Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-600">
          <a href="#capabilities" className="hover:text-slate-900 transition-colors">
            Capabilities
          </a>
          <a href="#frameworks" className="hover:text-slate-900 transition-colors">
            Regulatory Coverage
          </a>
          <a href="#architecture" className="hover:text-slate-900 transition-colors">
            Architecture & Audit
          </a>
          <a href="#pilot" className="hover:text-slate-900 transition-colors">
            Institutional Pilot
          </a>
        </nav>

        {/* Authentication & Onboarding CTAs */}
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="text-xs font-medium text-slate-700 hover:text-slate-900 px-3 py-1.5 transition-colors"
          >
            Client Sign In
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg font-medium text-xs px-3.5 py-2 shadow-xs transition-colors"
          >
            <span>Start 7-Day Pilot</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
