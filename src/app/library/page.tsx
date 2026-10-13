'use client';

import React, { useState } from 'react';
import { AppShell } from '@/shared/ui/AppShell';
import { BookOpen, Search, Filter, ShieldCheck, Download, ExternalLink } from 'lucide-react';

interface StatutoryCorpusItem {
  id: string;
  shortTitle: string;
  officialCitation: string;
  regulator: string;
  year: number;
  sectionsCount: number;
  status: 'ACTIVE_LAW' | 'AMENDED';
  description: string;
}

const STATUTORY_ITEMS: StatutoryCorpusItem[] = [
  {
    id: 'bofia-2020',
    shortTitle: 'Banks and Other Financial Institutions Act (BOFIA)',
    officialCitation: 'Act No. 5 of 2020',
    regulator: 'CBN',
    year: 2020,
    sectionsCount: 134,
    status: 'ACTIVE_LAW',
    description: 'Primary legislative framework governing Nigerian commercial banks, merchant banks, PSBs, and other specialized financial institutions.',
  },
  {
    id: 'arcon-2022',
    shortTitle: 'Advertising Regulatory Council of Nigeria Act',
    officialCitation: 'Act No. 23 of 2022',
    regulator: 'ARCON',
    year: 2022,
    sectionsCount: 63,
    status: 'ACTIVE_LAW',
    description: 'Statutory pre-clearance requirements, advertisement standards, and sanction regimes for promotional broadcasts across Nigerian media channels.',
  },
  {
    id: 'ndpa-2023',
    shortTitle: 'Nigeria Data Protection Act (NDPA)',
    officialCitation: 'Act No. 11 of 2023',
    regulator: 'NDPC',
    year: 2023,
    sectionsCount: 65,
    status: 'ACTIVE_LAW',
    description: 'Comprehensive data privacy safeguards, cross-border data transfer limitations, and statutory breach penalties for data controllers and processors.',
  },
  {
    id: 'fccpa-2018',
    shortTitle: 'Federal Competition and Consumer Protection Act',
    officialCitation: 'Act No. 1 of 2019',
    regulator: 'FCCPC',
    year: 2018,
    sectionsCount: 168,
    status: 'ACTIVE_LAW',
    description: 'Prohibits misleading representations, unconscionable debt recovery tactics, and anti-competitive fintech practices.',
  },
  {
    id: 'cama-2020',
    shortTitle: 'Companies and Allied Matters Act (CAMA)',
    officialCitation: 'Act No. 3 of 2020',
    regulator: 'SEC / CAC',
    year: 2020,
    sectionsCount: 870,
    status: 'ACTIVE_LAW',
    description: 'Corporate governance, director fiduciary obligations, and immutable board minutes attestation protocols.',
  },
];

export default function RegulatoryLibraryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegulator, setSelectedRegulator] = useState('ALL');

  const filtered = STATUTORY_ITEMS.filter((item) => {
    const matchesSearch =
      item.shortTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.officialCitation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesReg = selectedRegulator === 'ALL' || item.regulator === selectedRegulator;
    return matchesSearch && matchesReg;
  });

  return (
    <AppShell activePillarOverride="library">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Page Header Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#EEF2FF] text-[#2A4BFF] border border-[#C7D2FE]">
                REGULATORY LIBRARY
              </span>
              <span className="text-xs text-[#8D99AE]">Federal Republic of Nigeria Official Gazettes</span>
            </div>
            <h1 className="text-2xl font-bold text-[#0B0F1A]">Master Regulatory Library</h1>
            <p className="text-xs text-[#4B5565] mt-0.5">
              Authoritative statutory corpus of primary acts, subsidiary regulations, and official circular directives.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="btn-base btn-secondary btn-sm gap-1.5">
              <Download className="w-3.5 h-3.5" />
              <span>Export Gazettes Index</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="cogent-card p-4 flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#8D99AE] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search across 1,300+ statutory clauses, sections, and definitions..."
              className="cogent-input pl-9"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
            {['ALL', 'CBN', 'ARCON', 'NDPC', 'FCCPC', 'SEC'].map((reg) => (
              <button
                key={reg}
                onClick={() => setSelectedRegulator(reg)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                  selectedRegulator === reg
                    ? 'bg-[#2A4BFF] text-white shadow-xs'
                    : 'bg-[#F5F6FA] text-[#4B5565] hover:text-[#0B0F1A] border border-[#DDE3EE]'
                }`}
              >
                {reg}
              </button>
            ))}
          </div>
        </div>

        {/* Dense Tabular Library */}
        <div className="cogent-table-container">
          <table className="cogent-table">
            <thead>
              <tr>
                <th>Statutory Framework</th>
                <th>Citation</th>
                <th>Regulator</th>
                <th>Enacted</th>
                <th>Sections</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="cursor-pointer">
                  <td className="max-w-md">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#2A4BFF] flex items-center justify-center shrink-0 mt-0.5">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-[#0B0F1A] block">{item.shortTitle}</span>
                        <span className="text-[11px] text-[#4B5565] line-clamp-1">{item.description}</span>
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-xs text-[#4B5565]">{item.officialCitation}</td>
                  <td>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#F5F6FA] text-[#0B0F1A] border border-[#DDE3EE]">
                      {item.regulator}
                    </span>
                  </td>
                  <td className="text-xs text-[#4B5565] font-mono">{item.year}</td>
                  <td className="text-xs text-[#4B5565] font-mono">{item.sectionsCount} Sections</td>
                  <td>
                    <span className="pill-status pill-healthy">
                      <span className="pill-dot pill-dot-healthy" />
                      Active Law
                    </span>
                  </td>
                  <td className="text-right">
                    <button className="btn-base btn-ghost btn-xs text-[#2A4BFF]">
                      <span>Inspect Clauses</span>
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
