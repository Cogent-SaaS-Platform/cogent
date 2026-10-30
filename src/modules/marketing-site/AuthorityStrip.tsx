'use client';

import React from 'react';

const authorities = [
  { acronym: 'CBN', name: 'Central Bank of Nigeria', role: 'Banking & Payments Oversight' },
  { acronym: 'ARCON', name: 'Advertising Regulatory Council', role: 'Vetting & Claims Enforcement' },
  { acronym: 'NDPC', name: 'Nigeria Data Protection Commission', role: 'Data Localization & NDPA' },
  { acronym: 'SEC', name: 'Securities & Exchange Commission', role: 'Capital Markets & Assets' },
  { acronym: 'NFIU', name: 'Nigerian Financial Intelligence Unit', role: 'AML / CFT / PEP Monitoring' },
  { acronym: 'FCCPC', name: 'Consumer Protection Commission', role: 'Digital Lending Regulations' },
];

const institutions = [
  'Commercial Banks',
  'National Microfinance Banks',
  'Tier-1 FinTechs',
  'Payment Service Solution Providers (PSSPs)',
  'Digital Consumer Lenders',
];

export function AuthorityStrip() {
  return (
    <section className="py-12 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Strip Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
              APEX STATUTORY OVERSIGHT & JURISDICTIONAL COVERAGE
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            NIGERIA FINANCIAL SECTOR
          </span>
        </div>

        {/* Regulatory Authorities Logos / Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-6">
          {authorities.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition-colors flex flex-col justify-between space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm tracking-tight text-slate-900 font-mono">
                  {item.acronym}
                </span>
                <span className="w-1 h-1 rounded-full bg-emerald-500" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate-700 leading-tight">
                  {item.name}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                  {item.role}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Regulated Institutional Entities */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-y-3 text-xs text-slate-600">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Supervised Entity Classes:
          </span>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono text-[11px] text-slate-700">
            {institutions.map((inst, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-slate-400" />
                <span>{inst}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
