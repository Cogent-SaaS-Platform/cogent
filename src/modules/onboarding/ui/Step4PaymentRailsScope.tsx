'use client';

import React from 'react';
import { OnboardingState } from '../types';
import { ChevronRight, ChevronLeft, CreditCard, Layers, Check } from 'lucide-react';

interface Step4Props {
  state: OnboardingState;
  onChange: (updates: Partial<OnboardingState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const PAYMENT_RAILS = [
  { id: 'NIBSS_NIP', name: 'NIBSS Instant Payment (NIP)', provider: 'NIBSS Clearing' },
  { id: 'INTERSWITCH_WEBPAY', name: 'Interswitch Webpay / Quickteller', provider: 'Interswitch' },
  { id: 'PAYSTACK', name: 'Paystack Payment Gateway', provider: 'Stripe / Paystack' },
  { id: 'FLUTTERWAVE', name: 'Flutterwave Rail', provider: 'Flutterwave' },
  { id: 'CARD_ACQUIRING_MASTERCARD_VISA', name: 'Mastercard & Visa Direct Acquiring', provider: 'Card Schemes' },
  { id: 'DIRECT_DEBIT_ACH', name: 'NIBSS Direct Debit / Mandates', provider: 'NIBSS ACH' },
  { id: 'USSD', name: 'Telco USSD Banking Rail', provider: 'Telco Aggregators' },
];

const PRODUCT_CATEGORIES = [
  { id: 'DIGITAL_NANO_LOAN', label: 'Digital Nano-Lending', desc: 'Regulated under FCCPC & CBN Consumer Protection' },
  { id: 'SAVINGS_DEPOSIT', label: 'Savings & Term Deposits', desc: 'NDIC deposit insurance & CBN prudential guidelines' },
  { id: 'REMITTANCE_FX', label: 'Cross-Border Remittances & FX', desc: 'CBN IMTO Guidelines & NFIU AML monitoring' },
  { id: 'WEALTHTECH_INVEST', label: 'WealthTech & Securities', desc: 'SEC Rule 322 & capital market protections' },
  { id: 'CARD_ISSUANCE_WALLET', label: 'Card Issuing & Digital Wallets', desc: 'CBN Contactless & Tokenization circulars' },
];

export function Step4PaymentRailsScope({ state, onChange, onNext, onBack }: Step4Props) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (state.paymentRails.length === 0) {
      alert('Please select at least one connected payment rail.');
      return;
    }
    if (state.productCategories.length === 0) {
      alert('Please select at least one product category.');
      return;
    }
    onNext();
  };

  const toggleRail = (id: string) => {
    const current = state.paymentRails;
    if (current.includes(id)) {
      onChange({ paymentRails: current.filter((x) => x !== id) });
    } else {
      onChange({ paymentRails: [...current, id] });
    }
  };

  const toggleProduct = (id: string) => {
    const current = state.productCategories;
    if (current.includes(id)) {
      onChange({ productCategories: current.filter((x) => x !== id) });
    } else {
      onChange({ productCategories: [...current, id] });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-200">
      {/* Brand Monogram Icon matching onb.webp */}
      <div className="w-12 h-12 rounded-xl bg-[#0B0F1A] text-white flex items-center justify-center shadow-sm">
        <CreditCard className="w-6 h-6 text-white" />
      </div>

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#0B0F1A] tracking-tight">
          Payment rails &amp; operational scope
        </h2>
        <p className="text-sm text-[#4B5565] mt-1.5 leading-relaxed">
          Configure connected transaction infrastructure and active regulated consumer product categories.
        </p>
      </div>

      {/* Payment Rails */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-[#0B0F1A]">
          Connected Transaction Payment Rails <span className="text-[#DC2626]">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PAYMENT_RAILS.map((rail) => {
            const isSelected = state.paymentRails.includes(rail.id);
            return (
              <div
                key={rail.id}
                onClick={() => toggleRail(rail.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'border-[#2A4BFF] bg-[#EEF2FF]/50 ring-1 ring-[#2A4BFF]'
                    : 'border-[#DDE3EE] bg-white hover:border-[#DDE3EE]/80 hover:bg-[#F9FAFC]'
                }`}
              >
                <div>
                  <span className="text-xs font-bold text-[#0B0F1A] block">{rail.name}</span>
                  <span className="text-[10px] text-[#4B5565]">{rail.provider}</span>
                </div>
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                    isSelected
                      ? 'bg-[#2A4BFF] border-[#2A4BFF] text-white'
                      : 'border-[#DDE3EE] bg-white'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Product Categories */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-[#0B0F1A]">
          Regulated Product Categories Offered <span className="text-[#DC2626]">*</span>
        </label>
        <div className="space-y-2.5">
          {PRODUCT_CATEGORIES.map((prod) => {
            const isSelected = state.productCategories.includes(prod.id);
            return (
              <div
                key={prod.id}
                onClick={() => toggleProduct(prod.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs flex items-center justify-between gap-4 ${
                  isSelected
                    ? 'border-[#2A4BFF] bg-[#EEF2FF]/50 ring-1 ring-[#2A4BFF]'
                    : 'border-[#DDE3EE] bg-white hover:border-[#DDE3EE]/80 hover:bg-[#F9FAFC]'
                }`}
              >
                <div>
                  <span className="text-xs font-bold text-[#0B0F1A] block">{prod.label}</span>
                  <span className="text-[11px] text-[#4B5565] mt-0.5 block">{prod.desc}</span>
                </div>
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                    isSelected
                      ? 'bg-[#2A4BFF] border-[#2A4BFF] text-white'
                      : 'border-[#DDE3EE] bg-white'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            );
          })}
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
