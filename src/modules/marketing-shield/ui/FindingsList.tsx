'use client';

import React, { useState } from 'react';
import { FindingPresentationCard } from '@/shared/types/presentation';
import { FindingCard } from './FindingCard';
import { AlertCircle, Filter, Search, SlidersHorizontal } from 'lucide-react';

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
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Key Findings & Statutory Evidence ({findings.length})
          </h3>
          <p className="text-xs text-slate-400">
            Level 3 & 4 Progressive Disclosure: Verified Statutory Violations
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterSeverity('ALL')}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
              filterSeverity === 'ALL'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800'
            }`}
          >
            All ({findings.length})
          </button>

          {criticalCount > 0 && (
            <button
              onClick={() => setFilterSeverity('CRITICAL')}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                filterSeverity === 'CRITICAL'
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'bg-red-950/40 text-red-400 border border-red-800/40 hover:bg-red-900/40'
              }`}
            >
              Critical ({criticalCount})
            </button>
          )}

          {highCount > 0 && (
            <button
              onClick={() => setFilterSeverity('HIGH')}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                filterSeverity === 'HIGH'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-orange-950/40 text-orange-400 border border-orange-800/40 hover:bg-orange-900/40'
              }`}
            >
              High ({highCount})
            </button>
          )}

          {mediumCount > 0 && (
            <button
              onClick={() => setFilterSeverity('MEDIUM')}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                filterSeverity === 'MEDIUM'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-amber-950/40 text-amber-400 border border-amber-800/40 hover:bg-amber-900/40'
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
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search findings by excerpt, regulator, or statutory code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-slate-900/70 border border-slate-800 pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      )}

      {/* Findings Cards List */}
      {filteredFindings.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-slate-500 mb-2" />
          <p className="text-sm font-medium text-slate-300">No findings match this filter</p>
          <p className="text-xs text-slate-500 mt-1">Try resetting the filter or search term</p>
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
