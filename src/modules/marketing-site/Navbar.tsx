'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ChevronDown, BookOpen, Layers, Menu, X } from 'lucide-react';

export function Navbar() {
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setResourcesOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand identity: lowercase 'cogent' as requested */}
        <div className="flex items-center gap-6">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <Image
              src="/icon.png"
              alt="Cogent RegTech"
              width={26}
              height={26}
              className="w-6 h-6 rounded-md object-contain group-hover:scale-105 transition-transform"
              priority
            />
            <span className="font-extrabold text-xl tracking-tight text-slate-900 lowercase">
              cogent
            </span>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-600">
          <Link href="/" className="hover:text-slate-900 transition-colors">
            Home
          </Link>

          {/* Resources Dropdown with indicator dot */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setResourcesOpen((prev) => !prev)}
              onMouseEnter={() => setResourcesOpen(true)}
              className={`inline-flex items-center gap-1.5 py-1 hover:text-slate-900 transition-colors ${
                resourcesOpen ? 'text-slate-900 font-semibold' : ''
              }`}
            >
              <span>Resources</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
            </button>

            {/* Dropdown Menu */}
            {resourcesOpen && (
              <div
                onMouseLeave={() => setResourcesOpen(false)}
                className="absolute left-0 top-full mt-2 w-72 bg-white rounded-lg border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
              >
                <div className="p-1 space-y-1">
                  <Link
                    href="/how-it-works"
                    onClick={() => setResourcesOpen(false)}
                    className="flex items-start gap-3 p-2.5 rounded-md hover:bg-slate-50 transition-colors group"
                  >
                    <div className="p-1.5 rounded bg-slate-100 text-slate-800 border border-slate-200 shrink-0 group-hover:bg-[#2A4BFF] group-hover:text-white transition-colors">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900 group-hover:text-slate-950">
                        How It Works
                      </div>
                      <div className="text-[11px] text-slate-500 leading-snug mt-0.5">
                        Step-by-step breakdown of continuous supervisory governance
                      </div>
                    </div>
                  </Link>

                  <Link
                    href="/insights"
                    onClick={() => setResourcesOpen(false)}
                    className="flex items-start gap-3 p-2.5 rounded-md hover:bg-slate-50 transition-colors group"
                  >
                    <div className="p-1.5 rounded bg-slate-100 text-slate-800 border border-slate-200 shrink-0 group-hover:bg-[#2A4BFF] group-hover:text-white transition-colors">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900 group-hover:text-slate-950">
                        Regulatory Insights
                      </div>
                      <div className="text-[11px] text-slate-500 leading-snug mt-0.5">
                        Statutory briefings, circular analyses &amp; enforcement trends
                      </div>
                    </div>
                  </Link>
                </div>

                <div className="pt-2 mt-1 border-t border-slate-100 px-3 py-1.5 bg-slate-50/60 rounded-b flex items-center justify-between text-[10px] text-slate-500">
                  <span className="font-mono">JURISDICTION: NIGERIA</span>
                  <span className="inline-flex items-center gap-1 text-slate-700">
                    <span className="w-1 h-1 rounded-full bg-emerald-500" />
                    Continuous Feed
                  </span>
                </div>
              </div>
            )}
          </div>

          <Link href="/about" className="hover:text-slate-900 transition-colors">
            About
          </Link>

          <Link href="/contact" className="hover:text-slate-900 transition-colors">
            Contact
          </Link>
        </nav>

        {/* Authentication & Onboarding CTAs */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/sign-in"
            className="text-xs font-medium text-slate-700 hover:text-slate-900 px-3 py-1.5 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-1.5 bg-[#2A4BFF] hover:bg-[#1E3AE5] text-white rounded-lg font-medium text-xs px-4 py-2 shadow-xs transition-colors"
          >
            <span>Start 7-Day Pilot</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="md:hidden flex items-center gap-2">
          <Link
            href="/sign-up"
            className="inline-flex items-center bg-[#2A4BFF] text-white rounded-lg font-medium text-[11px] px-2.5 py-1.5"
          >
            7-Day Pilot
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="p-1.5 text-slate-700 hover:text-slate-900 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-4 shadow-xl">
          <nav className="flex flex-col space-y-2.5 text-sm font-medium text-slate-700">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-slate-900 border-b border-slate-100"
            >
              Home
            </Link>

            <div className="py-1.5 border-b border-slate-100 space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Resources
              </span>
              <div className="pl-2 space-y-2">
                <Link
                  href="/how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-xs text-slate-700 hover:text-slate-950"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>How It Works</span>
                </Link>
                <Link
                  href="/insights"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-xs text-slate-700 hover:text-slate-950"
                >
                  <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                  <span>Regulatory Insights</span>
                </Link>
              </div>
            </div>

            <Link
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-slate-900 border-b border-slate-100"
            >
              About
            </Link>

            <Link
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-slate-900 border-b border-slate-100"
            >
              Contact
            </Link>
          </nav>

          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              href="/sign-in"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center text-xs font-medium text-slate-700 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center inline-flex items-center justify-center gap-1.5 bg-[#2A4BFF] hover:bg-[#1E3AE5] text-white py-2 rounded-lg text-xs font-medium"
            >
              <span>Start 7-Day Pilot</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
