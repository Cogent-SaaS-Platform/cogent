'use client';

import React, { useState, useEffect } from 'react';
import {
  Scale,
  Search,
  Plus,
  BookOpen,
  Filter,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { MarketingKnowledgeRule } from '../types';

interface MarketingKnowledgeBaseViewProps {
  onAddRuleClick: () => void;
}

export const MarketingKnowledgeBaseView: React.FC<MarketingKnowledgeBaseViewProps> = ({
  onAddRuleClick,
}) => {
  const [rules, setRules] = useState<MarketingKnowledgeRule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRegulator, setSelectedRegulator] = useState<string>('ALL');

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/marketing/rules');
      const data = await res.json();
      if (data.success) {
        setRules(data.rules || []);
      }
    } catch (err) {
      console.error('Failed to load rules:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRules = rules.filter((r) => {
    if (selectedRegulator !== 'ALL' && r.regulatorCode !== selectedRegulator) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.statutoryCitation.toLowerCase().includes(q) ||
        r.verbatimClause.toLowerCase().includes(q) ||
        r.ruleCode.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const regulators = ['ALL', 'ARCON', 'CBN', 'FCCPC', 'SEC', 'NDIC'];

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-slate-700" />
            <span>Marketing Knowledge Base & Statutory Rules</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Binding advertising codes, prohibited phrases, and mandatory disclosures connected to the Regulation Library.
          </p>
        </div>

        <button
          onClick={onAddRuleClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Playbook Rule</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Regulator Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {regulators.map((reg) => (
            <button
              key={reg}
              onClick={() => setSelectedRegulator(reg)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                selectedRegulator === reg
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {reg === 'ALL' ? 'All Regulators' : reg}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rules, codes, citations..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* Rules List Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-500">Loading statutory knowledge rules...</div>
      ) : filteredRules.length === 0 ? (
        <div className="p-8 text-center rounded-lg border border-dashed border-slate-200 bg-slate-50">
          <p className="text-xs font-semibold text-slate-700">No matching statutory rules found</p>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or regulator filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRules.map((rule) => {
            const sourceLink =
              rule.sourceUrlOrPdfPath ||
              (rule.regulationId ? `/library/${rule.regulationId}` : '/library');

            return (
              <div
                key={rule.id}
                className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-600 font-semibold">
                        {rule.ruleCode}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {rule.regulatorCode}
                      </span>
                    </div>
                    {rule.isCustom ? (
                      <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                        Internal Policy / Playbook Rule
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded inline-flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-emerald-600" />
                        Statutory Source (Regulation Library)
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-900 leading-snug">{rule.title}</h3>
                    {rule.instrumentTitle && (
                      <div className="text-[11px] font-semibold text-slate-700 mt-0.5">
                        {rule.instrumentTitle}
                      </div>
                    )}
                    <div className="font-mono text-xs text-slate-600">
                      {rule.sectionOrClauseRef || rule.statutoryCitation}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <span>Verbatim Statutory Quote</span>
                      {!rule.isCustom && (
                        <span className="text-emerald-700 font-mono text-[10px]">
                          100% Extracted Source Proof
                        </span>
                      )}
                    </div>
                    <blockquote className="bg-slate-50 border-l-4 border-emerald-600 rounded-r p-3 text-xs text-slate-800 italic font-serif leading-relaxed">
                      &ldquo;{rule.verbatimStatutoryText || rule.verbatimClause}&rdquo;
                    </blockquote>
                  </div>

                  {rule.prohibitedTerms.length > 0 && (
                    <div>
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Prohibited Phrases
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {rule.prohibitedTerms.map((term, i) => (
                          <span
                            key={i}
                            className="font-mono text-[11px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded"
                          >
                            &ldquo;{term}&rdquo;
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {rule.mandatoryDisclosures.length > 0 && (
                    <div>
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Mandatory Disclosures
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {rule.mandatoryDisclosures.map((disc, i) => (
                          <span
                            key={i}
                            className="text-[11px] bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded"
                          >
                            {disc}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active Enforcement
                  </span>

                  <a
                    href={sourceLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
                  >
                    <span>View Source Document</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
