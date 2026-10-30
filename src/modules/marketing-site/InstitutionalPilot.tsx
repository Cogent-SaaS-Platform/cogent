import React from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';

export function InstitutionalPilot() {
  return (
    <section id="pilot" className="py-20 md:py-28 bg-white border-b border-slate-200 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 rounded-2xl p-8 sm:p-12 lg:p-16 text-white relative overflow-hidden shadow-xl border border-slate-800">
          <div className="max-w-2xl relative z-10 space-y-6">
            {/* Closing Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-slate-800 border border-slate-700 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="font-mono text-slate-300">
                Zero Procurement Wall · Instant 7-Day Institutional Evaluation Pilot
              </span>
            </div>

            {/* Closing Headline */}
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Run Institutional Compliance at FinTech Velocity.
            </h2>

            {/* Closing Subtext */}
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
              Test your active marketing campaigns or audit your internal policies against gazetted Nigerian regulations today.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Instant workspace provisioning</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Google OAuth enabled (@gmail.com supported)</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero procurement hurdles or waitlists</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Full access to all 3 supervisory cockpits</span>
              </div>
            </div>

            {/* CTA Button Pair & Subtext */}
            <div className="pt-4 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center gap-2 bg-[#2A4BFF] hover:bg-[#1E3AE5] text-white rounded-lg font-semibold text-xs px-6 py-3.5 shadow-sm transition-colors"
                >
                  <span>Start 7-Day Institutional Pilot</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </Link>
                <Link
                  href="/sign-in"
                  className="inline-flex items-center justify-center gap-2 bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 rounded-lg font-semibold text-xs px-6 py-3.5 transition-colors"
                >
                  <span>Sign in</span>
                </Link>
              </div>

              {/* Subtext */}
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Instant Workspace Provisioning · Google OAuth Enabled · Zero Procurement Gate</span>
              </div>
            </div>
          </div>

          {/* Hairline subtle background grid graphic */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none hidden lg:block bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        </div>
      </div>
    </section>
  );
}

