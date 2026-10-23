'use client';

import React from 'react';
import { OnboardingState } from '../types';
import { RegulatorCode } from '@/shared/types';
import { ChevronRight, ChevronLeft, Shield, Scale, Info } from 'lucide-react';

interface Step3Props {
  state: OnboardingState;
  onChange: (updates: Partial<OnboardingState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const REGULATOR_LIST: { code: RegulatorCode; name: string; tag: string }[] = [
  { code: 'CBN', name: 'Central Bank of Nigeria', tag: 'Banking, Payments, AML' },
  { code: 'SEC', name: 'Securities and Exchange Commission', tag: 'Capital Markets & Investments' },
  { code: 'NDPC', name: 'Nigeria Data Protection Commission', tag: 'Data Privacy & NDPA 2023' },
  { code: 'ARCON', name: 'Advertising Regulatory Council of Nigeria', tag: 'Marketing & Pre-Clearance' },
  { code: 'FCCPC', name: 'Federal Competition & Consumer Protection', tag: 'Digital Lending & Fair Terms' },
  { code: 'NFIU', name: 'Nigerian Financial Intelligence Unit', tag: 'AML/CFT & 72h STRs' },
  { code: 'NDIC', name: 'Nigeria Deposit Insurance Corporation', tag: 'Deposit Insurance Guarantee' },
];

export function Step3RegulatoryScope({ state, onChange, onNext, onBack }: Step3Props) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (state.primaryRegulators.length === 0) {
      alert('Please select at least one primary supervisory regulator.');
      return;
    }
    onNext();
  };

  const toggleRegulator = (code: RegulatorCode) => {
    const current = state.primaryRegulators;
    if (current.includes(code)) {
      onChange({ primaryRegulators: current.filter((c) => c !== code) });
    } else {
      onChange({ primaryRegulators: [...current, code] });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-200">
      {/* Brand Monogram Icon matching onb.webp */}
      <div className="w-12 h-12 rounded-xl bg-[#0B0F1A] text-white flex items-center justify-center shadow-sm">
        <Scale className="w-6 h-6 text-white" />
      </div>

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#0B0F1A] tracking-tight">
          Regulatory licenses & scope
        </h2>
        <p className="text-sm text-[#4B5565] mt-1.5 leading-relaxed">
          Select your primary Nigerian supervisory authorities and institutional license classes.
        </p>
      </div>

      {/* Regulators Selection */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-[#0B0F1A]">
          Primary Regulators <span className="text-[#DC2626]">*</span> (Select all that supervise your entity)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {REGULATOR_LIST.map((reg) => {
            const isSelected = state.primaryRegulators.includes(reg.code);
            return (
              <div
                key={reg.code}
                onClick={() => toggleRegulator(reg.code)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#2A4BFF] bg-[#EEF2FF]/50 ring-1 ring-[#2A4BFF]'
                    : 'border-[#DDE3EE] bg-white hover:border-[#DDE3EE]/80 hover:bg-[#F9FAFC]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold text-[#0B0F1A] font-mono">{reg.code}</span>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="rounded text-[#2A4BFF] focus:ring-[#2A4BFF]"
                  />
                </div>
                <span className="text-[11px] font-semibold text-[#0B0F1A] line-clamp-1">{reg.name}</span>
                <span className="text-[10px] text-[#4B5565] mt-0.5 block truncate">{reg.tag}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* License Category & License Number */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-[#0B0F1A] mb-2">
            Primary Institutional License Category <span className="text-[#DC2626]">*</span>
          </label>
          <div className="relative">
            <select
              value={state.licenseType}
              onChange={(e) => onChange({ licenseType: e.target.value })}
              className="w-full px-4 py-2.5 bg-white border border-[#DDE3EE] rounded-xl text-sm text-[#0B0F1A] focus:outline-none focus:border-[#2A4BFF] focus:ring-2 focus:ring-[#2A4BFF]/10 transition-all shadow-2xs appearance-none pr-10"
            >
              <option value="PAYMENT_SOLUTION_SERVICES_PSSP">Payment Solution Service Provider (PSSP)</option>
              <option value="COMMERCIAL_BANK">Commercial Bank (National/International)</option>
              <option value="PAYMENT_SERVICE_BANK">Payment Service Bank (PSB)</option>
              <option value="MOBILE_MONEY_OPERATOR_MMO">Mobile Money Operator (MMO)</option>
              <option value="DIGITAL_LENDER_FCCPC_REGISTERED">Digital Nano-Lender (FCCPC Registered)</option>
              <option value="MICROFINANCE_BANK_NATIONAL">Microfinance Bank (MFB)</option>
              <option value="SWITCHING_AND_PROCESSING">Switching & Processing License</option>
              <option value="SEC_REGISTERED_ROBO_ADVISOR">Digital Investment & Securities Broker</option>
              <option value="FINANCE_COMPANY">Finance Company License</option>
              <option value="OTHER">Other Regulated FinTech Class</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-[#4B5565]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-[#0B0F1A]">
              License / Approval Reference Number
            </label>
            <span className="text-xs text-slate-400 font-normal">
              Optional
            </span>
          </div>
          <input
            type="text"
            value={state.licenseNumber}
            onChange={(e) => onChange({ licenseNumber: e.target.value })}
            placeholder="e.g. CBN/PSSP/LIC/2024/092"
            className="w-full px-4 py-2.5 bg-white border border-[#DDE3EE] rounded-xl text-sm text-[#0B0F1A] placeholder-[#94A3B8] focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all shadow-2xs font-mono"
          />
        </div>
      </div>

      {/* Operating Environment */}
      <div className="p-4 rounded-xl bg-[#F9FAFC] border border-[#DDE3EE] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-[#0B0F1A] block">
            Workspace Operating Mode
          </span>
          <p className="text-[11px] text-[#4B5565] mt-0.5">
            Choose whether to evaluate live customer promotional assets or staging test mocks.
          </p>
        </div>
        <div className="flex items-center bg-white border border-[#DDE3EE] rounded-xl p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => onChange({ operatingEnvironment: 'LIVE_PRODUCTION' })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              state.operatingEnvironment === 'LIVE_PRODUCTION'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Live Production
          </button>
          <button
            type="button"
            onClick={() => onChange({ operatingEnvironment: 'SANDBOX' })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              state.operatingEnvironment === 'SANDBOX'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sandbox Staging
          </button>
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
