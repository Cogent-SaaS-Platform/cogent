'use client';

import React from 'react';
import { OnboardingState, DepartmentMandate } from '../types';
import { ChevronRight, ChevronLeft, ShieldCheck, AlertCircle } from 'lucide-react';

interface Step2Props {
  state: OnboardingState;
  onChange: (updates: Partial<OnboardingState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const OBJECTIVE_OPTIONS = [
  {
    id: 'PRE_VET_MARKETING',
    title: 'Pre-Vet Promotional Campaigns',
    description: 'Enforce ARCON Art. 24, FCCPC consumer protection, and mandatory CBN APR disclosures.',
  },
  {
    id: 'MONITOR_CIRCULARS',
    title: 'Monitor Directives & Circulars',
    description: 'Autonomous tracking of CBN, SEC, and NFIU circulars with 14-day statutory urgency countdowns.',
  },
  {
    id: 'GAP_MATRIX',
    title: 'Clause-by-Clause Policy Gap Matrix',
    description: 'Map internal manuals against statutory benchmarks with 5-W board remediation clauses.',
  },
  {
    id: 'AUDIT_DEFENSE',
    title: 'Bank Examiner Defense Dossiers',
    description: 'Generate SHA-256 sealed supervisory defense packs for annual on-site inspections.',
  },
];

export function Step2RoleAndMandate({ state, onChange, onNext, onBack }: Step2Props) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.jobTitle.trim()) {
      alert('Please enter your institutional job title.');
      return;
    }
    if (state.department === 'OTHER' && !state.customDepartment.trim()) {
      alert('Please specify your custom department name.');
      return;
    }
    onNext();
  };

  const toggleObjective = (id: string) => {
    const current = state.complianceObjectives;
    if (current.includes(id)) {
      onChange({ complianceObjectives: current.filter((x) => x !== id) });
    } else {
      onChange({ complianceObjectives: [...current, id] });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-200">
      {/* Brand Monogram Icon matching onb.webp */}
      <div className="w-12 h-12 rounded-xl bg-[#0B0F1A] text-white flex items-center justify-center shadow-sm">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-6 h-6"
        >
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </div>

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#0B0F1A] tracking-tight">
          Your role
        </h2>
        <p className="text-sm text-[#4B5565] mt-1.5 leading-relaxed">
          How you&apos;ll manage compliance, audit trails, and departmental responsibilities.
        </p>
      </div>

      {/* Form Fields */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Department Mandate */}
          <div>
            <label className="block text-xs font-bold text-[#0B0F1A] mb-2">
              Department Mandate <span className="text-[#DC2626]">*</span>
            </label>
            <div className="relative">
              <select
                value={state.department}
                onChange={(e) => onChange({ department: e.target.value as DepartmentMandate })}
                className="w-full px-4 py-2.5 bg-white border border-[#DDE3EE] rounded-xl text-sm text-[#0B0F1A] focus:outline-none focus:border-[#2A4BFF] focus:ring-2 focus:ring-[#2A4BFF]/10 transition-all shadow-2xs appearance-none pr-10"
              >
                <option value="COMPLIANCE_LEGAL">Compliance & Legal</option>
                <option value="EXECUTIVE_LEADERSHIP">Executive Leadership / Board</option>
                <option value="OPERATIONS">Operations & Risk</option>
                <option value="TREASURY_FINANCE">Treasury & Finance</option>
                <option value="PRODUCT_MANAGEMENT">Product Management</option>
                <option value="GROWTH_MARKETING">Growth & Marketing</option>
                <option value="ENGINEERING_TECH">Engineering & Technology</option>
                <option value="OTHER">Other (Custom Department)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-[#4B5565]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Job Title */}
          <div>
            <label className="block text-xs font-bold text-[#0B0F1A] mb-2">
              Institutional Job Title <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              required
              value={state.jobTitle}
              onChange={(e) => onChange({ jobTitle: e.target.value })}
              placeholder="e.g. Chief Compliance Officer, MLRO, General Counsel"
              className="w-full px-4 py-2.5 bg-white border border-[#DDE3EE] rounded-xl text-sm text-[#0B0F1A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2A4BFF] focus:ring-2 focus:ring-[#2A4BFF]/10 transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* Custom Department Write-in (If 'OTHER' is chosen) */}
        {state.department === 'OTHER' && (
          <div className="p-4 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] animate-in fade-in slide-in-from-top-2 duration-200">
            <label className="block text-xs font-bold text-[#2A4BFF] mb-1.5">
              Specify Custom Department / Business Unit <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              required
              value={state.customDepartment}
              onChange={(e) => onChange({ customDepartment: e.target.value })}
              placeholder="e.g. Internal Audit, ESG Governance, Regulatory Sandbox Unit"
              className="w-full px-4 py-2 bg-white border border-[#C7D2FE] rounded-lg text-sm text-[#0B0F1A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2A4BFF]"
            />
            <p className="text-[11px] text-[#4B5565] mt-1">
              Custom department name will be used across multi-role impact briefings and sign-off trackers.
            </p>
          </div>
        )}

        {/* Primary Compliance Objectives */}
        <div>
          <label className="block text-xs font-bold text-[#0B0F1A] mb-2">
            Primary Platform Objectives (Select all that apply)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {OBJECTIVE_OPTIONS.map((obj) => {
              const isSelected = state.complianceObjectives.includes(obj.id);
              return (
                <div
                  key={obj.id}
                  onClick={() => toggleObjective(obj.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer shadow-2xs flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#2A4BFF] bg-[#EEF2FF]/40 ring-1 ring-[#2A4BFF]'
                      : 'border-[#DDE3EE] bg-white hover:border-[#DDE3EE]/80 hover:bg-[#F9FAFC]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-[#0B0F1A]">{obj.title}</span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded text-[#2A4BFF] focus:ring-[#2A4BFF] mt-0.5"
                    />
                  </div>
                  <p className="text-[11px] text-[#4B5565] leading-relaxed">
                    {obj.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-6 border-t border-[#DDE3EE] flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-[#4B5565] hover:text-[#0B0F1A] bg-white border border-[#DDE3EE] hover:bg-[#F9FAFC] rounded-xl transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <button
          type="submit"
          className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-[#2A4BFF] hover:bg-[#1E3BD9] rounded-xl shadow-sm transition-all"
        >
          <span>Continue</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
}
