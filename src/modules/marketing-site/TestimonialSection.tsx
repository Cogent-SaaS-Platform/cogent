'use client';

import React from 'react';

interface TestimonialItem {
  id: string;
  quote: string;
  author: string;
  role: string;
  institution: string;
  brandTag: string;
  brandColor: string;
  initials: string;
}

const testimonials: TestimonialItem[] = [
  {
    id: 'cco',
    quote:
      'When the CBN dropped the revised operational guidelines late on a Friday night, I used to spend the entire weekend panicking and parsing PDFs. With Cogent, I logged in Monday morning and had tailored action items for our CTO on logging requirements and for our CFO on statutory reserves already waiting. It completely transformed my credibility with the Board.',
    author: 'Adebayo Ogundipe',
    role: 'Chief Compliance Officer',
    institution: 'Licensed National Microfinance Bank (Lagos)',
    brandTag: 'NATIONAL MFB',
    brandColor: '#059669', // Emerald
    initials: 'AO',
  },
  {
    id: 'growth',
    quote:
      'Our performance marketing team used to wait up to two weeks for legal to review SMS campaigns and Meta ads, which was killing our acquisition sprints. Marketing Shield checks our copy in seconds, flags prohibited terms like "zero interest" before we spend a Naira, and gives us alternative wording that still converts. Zero ARCON warning letters since rollout.',
    author: 'Chioma Okonkwo',
    role: 'VP of Growth',
    institution: 'Series-A FinTech Switch (PSSPs / Digital Lending)',
    brandTag: 'FINTECH SWITCH',
    brandColor: '#2A4BFF', // Cobalt Blue
    initials: 'CO',
  },
  {
    id: 'gc',
    quote:
      'Preparing for our routine Central Bank inspection used to mean paying external counsel millions for static memos that were obsolete weeks later. Cogent benchmarked our 180-page AML manual against current statutory law, identified two critical gaps, and gave us pre-drafted clauses to fix them immediately. When examiners arrived, we handed them an unbroken audit defense binder.',
    author: 'Olumide Fashola, SAN',
    role: 'General Counsel & Company Secretary',
    institution: 'Digital Neo-Bank',
    brandTag: 'NEO-BANK',
    brandColor: '#8B5CF6', // Purple
    initials: 'OF',
  },
];

const telemetryMetrics = [
  {
    value: '₦42.5M+',
    title: 'Average Statutory Fine Liability Avoided',
    context: 'Calculated penalties prevented through pre-vetting and closed policy gaps under BOFIA & ARCON.',
  },
  {
    value: '< 30s',
    title: 'Campaign Approval Turnaround',
    context: 'Slashed from a baseline of 5–10 business days for full internal clearance.',
  },
  {
    value: '100%',
    title: 'Deterministic Prohibited Phrase Precision',
    context: 'Zero false negatives on statutory terms that trigger automatic marketing blacklists.',
  },
  {
    value: '15 Mins',
    title: 'Circular-to-ExCo Brief Latency',
    context: 'Reduced from 7–14 days of manual email chains down to immediate executive action cards.',
  },
];

export function TestimonialSection() {
  return (
    <section className="py-20 md:py-28 bg-[#FBFBFC] border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header: Top-Heavy Alignment (Matching sk.JPG) */}
        <div className="max-w-3xl mb-14 md:mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Leaders in financial institutions trust Cogent
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
            Protecting institutional balance sheets and corporate officers across Commercial Banks, 
            National MFBs, and high-velocity FinTechs.
          </p>
        </div>

        {/* 1. UPPER TIER: 3-Column Floating Testimonial Cards (Matching sk.JPG) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {testimonials.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl p-7 sm:p-8 flex flex-col justify-between shadow-[0_15px_30px_rgba(0,0,0,0.02)] border border-slate-200/70 hover:border-slate-300 transition-colors relative"
            >
              {/* Top Element: Stylized Light Grey Double-Quote Vector Icon */}
              <div className="mb-5">
                <svg
                  className="w-8 h-8 text-slate-300 fill-current"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.324 1.2-4.423 3.4-4.423 5.3 0 .7.1 1.2.5 1.5.3.3.8.4 1.3.4 1.6 0 2.7 1.1 2.7 2.7 0 1.6-1.1 2.7-2.7 2.7-.9 0-1.9-.4-2.717-1.479zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.324 1.2-4.423 3.4-4.423 5.3 0 .7.1 1.2.5 1.5.3.3.8.4 1.3.4 1.6 0 2.7 1.1 2.7 2.7 0 1.6-1.1 2.7-2.7 2.7-.9 0-1.9-.4-2.717-1.479z" />
                </svg>
              </div>

              {/* Middle Element: Left-aligned High-Contrast Black Paragraph Text */}
              <p className="text-slate-800 text-sm sm:text-[15px] leading-relaxed font-normal flex-1 mb-8">
                &ldquo;{item.quote}&rdquo;
              </p>

              {/* Bottom Element: Multi-Attribute Author Identity Block */}
              <div className="pt-6 border-t border-slate-100 flex items-center gap-3.5">
                {/* Left: Crisp Greyscale Rounded Square Portrait Box */}
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                  <span className="font-mono text-sm font-bold text-slate-700">
                    {item.initials}
                  </span>
                </div>

                {/* Right: Vertical Text Stack */}
                <div className="space-y-0.5 min-w-0">
                  <div className="text-sm font-bold text-slate-900 tracking-tight truncate">
                    {item.author}
                  </div>
                  <div className="text-xs text-slate-500 font-medium truncate">
                    {item.role}
                  </div>
                  <div className="pt-1 flex items-center gap-1.5">
                    <span
                      className="text-[10px] font-mono font-extrabold tracking-wider uppercase px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: `${item.brandColor}12`,
                        color: item.brandColor,
                      }}
                    >
                      {item.brandTag}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 2. LOWER TIER: 4-Column Flat Statistical Grid (Divided by Ultra-Thin Vertical Dotted Lines) */}
        <div className="mt-16 pt-12 border-t border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0">
            {telemetryMetrics.map((stat, idx) => (
              <div
                key={idx}
                className={`flex flex-col justify-between ${
                  idx < telemetryMetrics.length - 1
                    ? 'lg:border-r lg:border-dashed lg:border-slate-300 lg:pr-8'
                    : ''
                } ${idx > 0 ? 'lg:pl-8' : ''}`}
              >
                {/* Line 1: The Hook (Massive, Bold, Pitch-Black Numerical Stat) */}
                <div>
                  <span className="text-3xl sm:text-4xl font-bold font-mono text-slate-900 tracking-tight block">
                    {stat.value}
                  </span>
                  {/* Title */}
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mt-2">
                    {stat.title}
                  </span>
                </div>

                {/* Line 2: The Context (Low-Contrast Slate-Grey Description) */}
                <p className="mt-2.5 text-xs text-slate-500 leading-relaxed font-normal">
                  {stat.context}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
