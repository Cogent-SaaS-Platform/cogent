'use client';

import React, { useState } from 'react';
import { FindingPresentationCard } from '@/shared/types/presentation';
import { FindingCard } from './FindingCard';
import { AlertCircle, Search } from 'lucide-react';

interface FindingsListProps {
  findings: FindingPresentationCard[];
  selectedFindingId?: string | null;
  onSelectFinding?: (findingId: string) => void;
}

export const FindingsList: React.FC<FindingsListProps> = ({
  findings,
  selectedFindingId,
  onSelectFinding,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredFindings = findings.filter((f) => {
    if (filterSeverity !== 'ALL' && f.severity !== filterSeverity) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchExcerpt = f.flaggedExcerpt.toLowerCase().includes(q);
      const matchRule = f.ruleCode.toLowerCase().includes(q);
      const matchWhy = f.whyItMatters.toLowerCase().includes(q);
      const matchReg = f.regulatorCode.toLowerCase().includes(q);
      return matchExcerpt || matchRule || matchWhy || matchReg;
    }
    return true;
  });

  const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;
  const highCount = findings.filter((f) => f.severity === 'HIGH').length;
  const mediumCount = findings.filter((f) => f.severity === 'MEDIUM').length;

  return (
    <div id="marketing-shield-findings-list" className="space-y-4">
      {/* Title & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B0F1A]">
            Key Findings & Statutory Evidence ({findings.length})
          </h3>
          <p className="text-xs text-[#4B5565]">
            Level 3 & 4 Progressive Disclosure: Verified Statutory Violations
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterSeverity('ALL')}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
              filterSeverity === 'ALL'
                ? 'bg-[#2A4BFF] text-white shadow-xs'
                : 'bg-[#F5F6FA] text-[#4B5565] border border-[#DDE3EE] hover:bg-[#E8EDF5]'
            }`}
          >
            All ({findings.length})
          </button>

          {criticalCount > 0 && (
            <button
              onClick={() => setFilterSeverity('CRITICAL')}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                filterSeverity === 'CRITICAL'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
              }`}
            >
              Critical ({criticalCount})
            </button>
          )}

          {highCount > 0 && (
            <button
              onClick={() => setFilterSeverity('HIGH')}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                filterSeverity === 'HIGH'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100'
              }`}
            >
              High ({highCount})
            </button>
          )}

          {mediumCount > 0 && (
            <button
              onClick={() => setFilterSeverity('MEDIUM')}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                filterSeverity === 'MEDIUM'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              Medium ({mediumCount})
            </button>
          )}
        </div>
      </div>

      {/* Search Input if more than 2 findings */}
      {findings.length > 2 && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8D99AE]" />
          <input
            type="text"
            placeholder="Search findings by excerpt, regulator, or statutory code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-white border border-[#DDE3EE] pl-9 pr-4 py-2 text-xs text-[#0B0F1A] placeholder-[#8D99AE] focus:outline-hidden focus:border-[#2A4BFF] shadow-xs"
          />
        </div>
      )}

      {/* Findings Cards List */}
      {filteredFindings.length === 0 ? (
        <div className="rounded-2xl border border-[#DDE3EE] bg-white p-8 text-center shadow-xs">
          <AlertCircle className="mx-auto h-8 w-8 text-[#8D99AE] mb-2" />
          <p className="text-sm font-semibold text-[#0B0F1A]">No findings match this filter</p>
          <p className="text-xs text-[#4B5565] mt-1">Try resetting the filter or search term</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFindings.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              isSelected={selectedFindingId === finding.id}
              onSelect={() => onSelectFinding?.(finding.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
