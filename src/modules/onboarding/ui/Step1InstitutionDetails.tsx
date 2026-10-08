'use client';

import React from 'react';
import { OnboardingState, CompanySize } from '../types';
import { ChevronRight, Building, Globe, Hash, Info } from 'lucide-react';

interface Step1Props {
  state: OnboardingState;
  onChange: (updates: Partial<OnboardingState>) => void;
  onNext: () => void;
}

export function Step1InstitutionDetails({ state, onChange, onNext }: Step1Props) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.companyName.trim()) {
      alert('Please enter your company or institution name.');
      return;
    }
    onNext();
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
          <path d="M4 4h7v7H4z" fill="currentColor" />
          <path d="M13 13h7v7h-7z" fill="currentColor" />
          <path d="M4 20l16-16" stroke="white" strokeWidth="2.5" />
        </svg>
      </div>

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#0B0F1A] tracking-tight">
          Company details
        </h2>
        <p className="text-sm text-[#4B5565] mt-1.5 leading-relaxed">
          This information defines your regulated tenant workspace and can be updated later.
        </p>
      </div>

      {/* Grid Inputs matching onb.webp */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Company Name */}
        <div>
          <label className="block text-xs font-bold text-[#0B0F1A] mb-2">
            Company name <span className="text-[#DC2626]">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={state.companyName}
              onChange={(e) => onChange({ companyName: e.target.value })}
              placeholder="e.g. Acme FinTech Ltd"
              className="w-full px-4 py-2.5 bg-white border border-[#DDE3EE] rounded-xl text-sm text-[#0B0F1A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2A4BFF] focus:ring-2 focus:ring-[#2A4BFF]/10 transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* Company Size */}
        <div>
          <label className="block text-xs font-bold text-[#0B0F1A] mb-2">
            Company size <span className="text-[#DC2626]">*</span>
          </label>
          <div className="relative">
            <select
              value={state.companySize}
              onChange={(e) => onChange({ companySize: e.target.value as CompanySize })}
              className="w-full px-4 py-2.5 bg-white border border-[#DDE3EE] rounded-xl text-sm text-[#0B0F1A] focus:outline-none focus:border-[#2A4BFF] focus:ring-2 focus:ring-[#2A4BFF]/10 transition-all shadow-2xs appearance-none pr-10"
            >
              <option value="1-10">1-10 employees</option>
              <option value="11-50">11-50 employees</option>
              <option value="51-200">51-200 employees</option>
              <option value="201-500">201-500 employees</option>
              <option value="500+">500+ enterprise employees</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-[#4B5565]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Industry */}
        <div>
          <label className="block text-xs font-bold text-[#0B0F1A] mb-2">
            Industry <span className="text-[#DC2626]">*</span>
          </label>
          <div className="relative">
            <select
              value={state.industryCategory}
              onChange={(e) => onChange({ industryCategory: e.target.value })}
              className="w-full px-4 py-2.5 bg-white border border-[#DDE3EE] rounded-xl text-sm text-[#0B0F1A] focus:outline-none focus:border-[#2A4BFF] focus:ring-2 focus:ring-[#2A4BFF]/10 transition-all shadow-2xs appearance-none pr-10"
            >
              <option value="Technology">Technology & FinTech</option>
              <option value="Commercial Banking">Commercial Banking & OFIs</option>
              <option value="Payment Services">Payment Services & Switching</option>
              <option value="Digital Lending">Digital Micro-Lending</option>
              <option value="WealthTech">WealthTech & Capital Markets</option>
              <option value="Other">Other Regulated Sector</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-[#4B5565]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Company Website */}
        <div>
          <label className="block text-xs font-bold text-[#0B0F1A] mb-2">
            Company website
          </label>
          <div className="relative">
            <input
              type="text"
              value={state.companyWebsite}
              onChange={(e) => onChange({ companyWebsite: e.target.value })}
              placeholder="e.g. acme.com or acmepay.ng"
              className="w-full px-4 py-2.5 bg-white border border-[#DDE3EE] rounded-xl text-sm text-[#0B0F1A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2A4BFF] focus:ring-2 focus:ring-[#2A4BFF]/10 transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* RC Number (Explicitly Optional for TASK-08) */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-[#0B0F1A]">
              Corporate RC Number
            </label>
            <span className="text-[11px] font-semibold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full border border-[#A7F3D0]">
              Optional
            </span>
          </div>
          <div className="relative">
            <input
              type="text"
              value={state.rcNumber}
              onChange={(e) => onChange({ rcNumber: e.target.value })}
              placeholder="e.g. RC 1849204 (Optional for foreign entities or sandbox test teams)"
              className="w-full px-4 py-2.5 bg-white border border-[#DDE3EE] rounded-xl text-sm text-[#0B0F1A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2A4BFF] focus:ring-2 focus:ring-[#2A4BFF]/10 transition-all shadow-2xs"
            />
          </div>
          <p className="text-[11px] text-[#4B5565] mt-1.5 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#2A4BFF] shrink-0" />
            <span>Not required for sandbox testing, international entities, or pre-incorporation startups.</span>
          </p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-6 border-t border-[#DDE3EE] flex justify-end">
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
